"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, FileText, X, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

interface Subject {
  id: string;
  name: string;
  code: string | null;
  semester: number;
}

interface Paper {
  id: string;
  file_name: string;
  year: number;
  exam_type: string;
  processing_status: string;
  created_at: string;
  subjects?: { name: string; code: string };
}

interface FileEntry {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

const EXAM_TYPES = [
  { value: "summer", label: "Summer" },
  { value: "winter", label: "Winter" },
  { value: "mid", label: "Mid Semester" },
  { value: "internal", label: "Internal" },
];

const YEARS = Array.from({ length: 10 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: y, label: String(y) };
});

export default function MyUploadsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [examType, setExamType] = useState("winter");
  const [userId, setUserId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("users")
        .select("semester, branch")
        .eq("id", user.id)
        .maybeSingle();

      let subUrl = "/subjects";
      if (profile?.branch) subUrl += `?branch=${encodeURIComponent(profile.branch)}`;
      const subs = await api.get(subUrl).catch(() => []);
      setSubjects(Array.isArray(subs) ? subs : []);

      const p = await api.get(`/papers/?uploaded_by=${user.id}`).catch(() => []);
      setPapers(Array.isArray(p) ? p : []);
    }
    load();
  }, []);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const valid: FileEntry[] = [];
    for (const f of Array.from(incoming)) {
      if (f.type !== "application/pdf") continue;
      if (f.size > 10 * 1024 * 1024) continue;
      if (files.some(e => e.file.name === f.name && e.file.size === f.size)) continue;
      valid.push({ file: f, status: "pending" });
    }
    setFiles(prev => [...prev, ...valid]);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadOne = async (entry: FileEntry, index: number): Promise<void> => {
    setFiles(prev => prev.map((e, i) => i === index ? { ...e, status: "uploading" } : e));
    const form = new FormData();
    form.append("file", entry.file);
    form.append("subject_id", subjectId);
    form.append("year", year);
    form.append("exam_type", examType);
    try {
      await api.upload("/papers/upload", form);
      setFiles(prev => prev.map((e, i) => i === index ? { ...e, status: "done" } : e));
    } catch (err) {
      setFiles(prev => prev.map((e, i) =>
        i === index ? { ...e, status: "error", error: err instanceof Error ? err.message : "Upload failed" } : e
      ));
    }
  };

  const handleUploadAll = async () => {
    if (!subjectId) return;
    const pending = files.map((e, i) => ({ entry: e, index: i })).filter(x => x.entry.status === "pending");
    if (!pending.length) return;
    setUploading(true);
    await Promise.all(pending.map(({ entry, index }) => uploadOne(entry, index)));
    setUploading(false);
    // Refresh papers list
    if (userId) {
      const p = await api.get(`/papers/?uploaded_by=${userId}`).catch(() => []);
      setPapers(Array.isArray(p) ? p : []);
    }
  };

  const statusVariant = (s: string) =>
    s === "done" ? "approved" : s === "failed" ? "rejected" : "pending";

  const pendingCount = files.filter(e => e.status === "pending").length;
  const allDone = files.length > 0 && files.every(e => e.status === "done" || e.status === "error");

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Upload size={20} className="text-accent" />
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">My Uploads</h1>
      </div>

      {/* Upload form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Question Papers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Subject"
              placeholder="Select subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              options={subjects.map((s) => ({ value: s.id, label: s.code ? `${s.name} (${s.code})` : s.name }))}
            />
            <Select
              label="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              options={YEARS}
            />
            <Select
              label="Exam Type"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              options={EXAM_TYPES}
            />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-accent/50 rounded-xl p-6 text-center cursor-pointer transition-colors hover:bg-bg-elevated/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <Plus size={20} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-secondary">Click or drag PDFs here</p>
            <p className="text-xs text-text-muted mt-1">Multiple files supported · Max 10 MB each</p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-bg-elevated border border-border rounded-lg px-3 py-2.5">
                  <FileText size={14} className="text-accent shrink-0" />
                  <span className="text-sm text-text-primary truncate flex-1">{entry.file.name}</span>
                  <span className="text-xs text-text-muted shrink-0">
                    {(entry.file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  {entry.status === "uploading" && (
                    <span className="text-xs text-accent shrink-0 animate-pulse">Uploading...</span>
                  )}
                  {entry.status === "done" && (
                    <span className="text-xs text-emerald-400 shrink-0">Done</span>
                  )}
                  {entry.status === "error" && (
                    <span className="text-xs text-red-400 shrink-0" title={entry.error}>Failed</span>
                  )}
                  {entry.status === "pending" && (
                    <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="text-text-muted hover:text-red-400 transition-colors shrink-0">
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!subjectId && files.length > 0 && (
            <p className="text-xs text-amber-400">Select a subject before uploading.</p>
          )}

          {files.length > 0 && !allDone && (
            <button
              onClick={handleUploadAll}
              disabled={uploading || !subjectId || pendingCount === 0}
              className="w-full bg-accent hover:bg-accent-hover text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading
                ? `Uploading ${files.filter(e => e.status === "uploading").length} file(s)...`
                : `Upload ${pendingCount} PDF${pendingCount !== 1 ? "s" : ""} in Parallel`}
            </button>
          )}

          {allDone && (
            <button
              onClick={() => setFiles([])}
              className="w-full border border-border hover:border-accent/40 text-text-secondary hover:text-text-primary rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
            >
              Upload more files
            </button>
          )}
        </CardContent>
      </Card>

      {/* Papers list */}
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wide text-text-muted mb-3">
          Uploaded Papers
        </h2>
        {papers.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
            <FileText size={32} className="mx-auto text-text-muted mb-3" />
            <p className="text-sm text-text-secondary">No papers uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {papers.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-bg-card border border-border rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={16} className="text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{p.file_name}</p>
                    <p className="text-xs text-text-muted">
                      {p.subjects?.name} · {p.year} · {p.exam_type}
                    </p>
                  </div>
                </div>
                <Badge variant={statusVariant(p.processing_status)}>
                  {p.processing_status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
