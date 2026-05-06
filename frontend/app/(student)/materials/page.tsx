"use client";

import { useState, useEffect, useRef } from "react";
import { BookOpen, Upload, FileText, X, ChevronDown, ChevronUp, Plus, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
  branch: string;
}

interface Material {
  id: string;
  title: string;
  description: string;
  material_type: string;
  file_name: string;
  file_url: string;
  file_size_kb: number;
  approval_status: string;
  processing_status: string | null;
  chunk_count: number | null;
  created_at: string;
  uploaded_by: string;
  subjects?: { name: string; code: string };
}

const MATERIAL_TYPES = [
  { value: "notes", label: "Notes" },
  { value: "textbook", label: "Textbook" },
  { value: "handwritten", label: "Handwritten" },
  { value: "summary", label: "Summary" },
  { value: "slides", label: "Slides" },
];

const approvalVariant = (s: string) =>
  s === "approved" ? "approved" : s === "rejected" ? "rejected" : "pending";

const processingLabel = (m: Material) => {
  if (m.approval_status !== "approved") return null;
  if (m.processing_status === "processed") return `${m.chunk_count ?? 0} chunks`;
  if (m.processing_status === "queued") return "Queuing...";
  if (m.processing_status === "failed") return "Processing failed";
  return "Processing...";
};

export default function MaterialsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [myUploads, setMyUploads] = useState<Material[]>([]);
  const [subjectMaterials, setSubjectMaterials] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Upload form state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSubjectId, setUploadSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materialType, setMaterialType] = useState("notes");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("users")
        .select("branch, semester")
        .eq("id", user.id)
        .maybeSingle();

      let url = "/subjects";
      if (profile?.branch) url += `?branch=${encodeURIComponent(profile.branch)}`;
      const subs = await api.get(url).catch(() => []);
      setSubjects(Array.isArray(subs) ? subs : []);

      const mine = await api.get(`/materials/?approved_only=false&uploaded_by=${user.id}`).catch(() => []);
      setMyUploads(Array.isArray(mine) ? mine : []);
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedSubjectId) { setSubjectMaterials([]); return; }
    setLoadingMaterials(true);
    api.get(`/materials/?subject_id=${selectedSubjectId}&approved_only=true`)
      .then(data => setSubjectMaterials(Array.isArray(data) ? data : []))
      .catch(() => setSubjectMaterials([]))
      .finally(() => setLoadingMaterials(false));
  }, [selectedSubjectId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") { setUploadError("Only PDF files allowed."); return; }
    if (f.size > 10 * 1024 * 1024) { setUploadError("Max file size is 10 MB."); return; }
    setUploadError("");
    setFile(f);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !uploadSubjectId || !title.trim()) {
      setUploadError("Subject, title, and file are required.");
      return;
    }
    setUploading(true);
    setUploadError("");
    const form = new FormData();
    form.append("file", file);
    form.append("subject_id", uploadSubjectId);
    form.append("title", title.trim());
    form.append("description", description.trim());
    form.append("material_type", materialType);
    try {
      await api.upload("/materials/upload", form);
      // Refresh my uploads
      if (userId) {
        const mine = await api.get(`/materials/?approved_only=false&uploaded_by=${userId}`).catch(() => []);
        setMyUploads(Array.isArray(mine) ? mine : []);
      }
      // Reset form
      setTitle("");
      setDescription("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadOpen(false);
      toast.success("Material submitted for admin review!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (m: Material) => {
    setDownloading(m.id);
    try {
      const res = await api.get(`/materials/${m.id}/download`);
      if (!res?.url) throw new Error("No URL");
      window.open(res.url, "_blank");
    } catch {
      toast.error("Failed to get download link. Try again.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <BookOpen size={20} className="text-accent" />
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Study Materials</h1>
      </div>

      {/* Upload panel */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setUploadOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-bg-elevated transition-colors"
        >
          <div className="flex items-center gap-2">
            <Upload size={14} className="text-text-muted" />
            <span className="text-sm font-medium text-text-primary">Upload Study Material</span>
          </div>
          {uploadOpen ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
        </button>

        {uploadOpen && (
          <form onSubmit={handleUpload} className="px-5 pb-5 border-t border-border pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-muted block mb-1">Subject *</label>
                <div className="relative">
                  <select
                    value={uploadSubjectId}
                    onChange={e => setUploadSubjectId(e.target.value)}
                    required
                    className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary appearance-none pr-7 focus:outline-none focus:border-accent"
                  >
                    <option value="">Select subject...</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.code ? ` (${s.code})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-text-muted block mb-1">Type *</label>
                <div className="relative">
                  <select
                    value={materialType}
                    onChange={e => setMaterialType(e.target.value)}
                    className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary appearance-none pr-7 focus:outline-none focus:border-accent"
                  >
                    {MATERIAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-text-muted block mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Unit 3 — TCP/IP Notes"
                required
                className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-xs text-text-muted block mb-1">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of what this covers"
                className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                file ? "border-accent/50 bg-accent/5" : "border-border hover:border-accent/40 hover:bg-bg-elevated"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText size={14} className="text-accent" />
                  <span className="text-sm text-text-primary">{file.name}</span>
                  <span className="text-xs text-text-muted">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="ml-1 text-text-muted hover:text-text-primary"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={18} className="mx-auto text-text-muted mb-1.5" />
                  <p className="text-sm text-text-secondary">Click to select PDF</p>
                  <p className="text-xs text-text-muted mt-0.5">Max 10 MB</p>
                </div>
              )}
            </div>

            {uploadError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {uploadError}
              </p>
            )}

            <p className="text-xs text-text-muted">
              Uploads are reviewed by admin before being available to others.
            </p>

            <button
              type="submit"
              disabled={uploading || !file || !uploadSubjectId || !title.trim()}
              className="w-full bg-accent hover:bg-accent-hover text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "Uploading..." : "Submit for Review"}
            </button>
          </form>
        )}
      </div>

      {/* My Uploads */}
      {myUploads.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">My Uploads</h2>
          <div className="space-y-2">
            {myUploads.map(m => (
              <div key={m.id} className="flex items-center justify-between gap-3 bg-bg-card border border-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={15} className="text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{m.title}</p>
                    <p className="text-xs text-text-muted">
                      {m.subjects?.name} · {m.material_type} · {m.file_size_kb} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {processingLabel(m) && (
                    <span className="text-[11px] text-text-muted">{processingLabel(m)}</span>
                  )}
                  <Badge variant={approvalVariant(m.approval_status)}>
                    {m.approval_status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browse approved materials by subject */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">Browse Materials</h2>

        <div className="relative mb-4">
          <select
            value={selectedSubjectId}
            onChange={e => setSelectedSubjectId(e.target.value)}
            className="w-full bg-bg-card border border-border rounded-xl px-4 py-3 text-sm text-text-primary appearance-none pr-8 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          >
            <option value="">Select a subject to browse materials...</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}{s.code ? ` · ${s.code}` : ""}{s.semester ? ` · Sem ${s.semester}` : ""}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>

        {selectedSubjectId && (
          <>
            {loadingMaterials ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <LoadingSkeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : subjectMaterials.length === 0 ? (
              <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
                <BookOpen size={28} className="mx-auto text-text-muted mb-3" />
                <p className="text-sm font-medium text-text-secondary">No approved materials yet</p>
                <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
                  Upload materials above and wait for admin approval.
                </p>
                <button
                  onClick={() => setUploadOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                >
                  <Plus size={13} /> Upload material
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {subjectMaterials.map(m => (
                  <div key={m.id} className="bg-bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText size={14} className="text-accent shrink-0" />
                          <p className="text-sm font-medium text-text-primary">{m.title}</p>
                        </div>
                        {m.description && (
                          <p className="text-xs text-text-secondary ml-5 mb-1">{m.description}</p>
                        )}
                        <div className="flex items-center gap-2 ml-5">
                          <span className="text-xs text-text-muted capitalize">{m.material_type}</span>
                          <span className="text-text-muted/40 text-xs">·</span>
                          <span className="text-xs text-text-muted">{m.file_size_kb} KB</span>
                          {m.chunk_count != null && m.chunk_count > 0 && (
                            <>
                              <span className="text-text-muted/40 text-xs">·</span>
                              <span className="text-xs text-emerald-400">{m.chunk_count} sections indexed</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleDownload(m)}
                          disabled={downloading === m.id}
                          className="flex items-center gap-1.5 bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
                        >
                          <Download size={11} />
                          {downloading === m.id ? "..." : "View"}
                        </button>
                        <Badge variant="approved">approved</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!selectedSubjectId && myUploads.length === 0 && (
          <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent/10 border border-accent/20 mb-4">
              <BookOpen size={24} className="text-accent" />
            </div>
            <h2 className="text-base font-semibold text-text-primary mb-1">Browse & Upload Study Materials</h2>
            <p className="text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">
              Select a subject to browse approved notes, textbooks, and summaries.
              Upload your own materials to help the AI generate better answers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
