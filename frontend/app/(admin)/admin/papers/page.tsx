"use client";

import { useState, useEffect, useMemo } from "react";
import { FileText, RefreshCw, Upload, ShieldCheck, RotateCcw, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Paper {
  id: string;
  file_name: string;
  year: number;
  exam_type: string;
  processing_status: string;
  question_count: number;
  verified?: boolean;
  created_at: string;
  uploaded_by: string;
  subjects?: { name: string; code: string };
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
}

const EXAM_TYPES = ["summer", "winter", "mid", "internal"];
const statusVariant = (s: string) =>
  s === "done" ? "approved" : s === "failed" ? "rejected" : "pending";

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [papersData, subjectsData] = await Promise.all([
      api.get("/papers/").catch(() => []),
      api.get("/subjects").catch(() => []),
    ]);
    setPapers(Array.isArray(papersData) ? papersData : []);
    setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return papers.filter(p => {
      if (filterSubject) {
        const subj = subjects.find(s => s.id === filterSubject);
        if (!subj || p.subjects?.name !== subj.name) return false;
      }
      if (filterStatus && p.processing_status !== filterStatus) return false;
      return true;
    });
  }, [papers, filterSubject, filterStatus, subjects]);

  const statusCounts = {
    done: papers.filter(p => p.processing_status === "done").length,
    pending: papers.filter(p => p.processing_status === "pending").length,
    failed: papers.filter(p => p.processing_status === "failed").length,
    verified: papers.filter(p => p.verified).length,
  };

  const handleVerify = async (paper: Paper) => {
    setActionId(paper.id);
    try {
      await api.patch(`/admin/papers/${paper.id}/verify?verified=${!paper.verified}`);
      setPapers(prev => prev.map(p => p.id === paper.id ? { ...p, verified: !paper.verified } : p));
      toast.success(paper.verified ? "Verification removed." : "Paper marked as verified.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Verify failed");
    }
    setActionId(null);
  };

  const handleReprocess = async (id: string) => {
    setActionId(id);
    try {
      await api.post(`/admin/papers/${id}/reprocess`, {});
      toast.success("Reprocessing queued — questions will re-extract in background.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Reprocess failed");
    }
    setActionId(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    setActionId(id);
    try {
      await api.delete(`/admin/papers/${id}`);
      setPapers(prev => prev.filter(p => p.id !== id));
      toast.success("Paper deleted.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
    setActionId(null);
    setConfirmDelete(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="section-title">Papers</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary mt-2">Question Papers</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setUploadOpen(true)} className="btn-primary">
            <Upload size={13} />
            Upload official
          </button>
          <button onClick={load} className="btn-ghost">
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total"           value={papers.length} />
        <Stat label="Processed"       value={statusCounts.done} color="text-emerald-600" />
        <Stat label="Failed/Pending"  value={statusCounts.failed + statusCounts.pending} color="text-amber-600" />
        <Stat label="Verified"        value={statusCounts.verified} color="text-accent" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterSubject}
          onChange={e => setFilterSubject(e.target.value)}
          className="input h-10 w-auto pr-8"
        >
          <option value="">All subjects</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="input h-10 w-auto pr-8"
        >
          <option value="">All statuses</option>
          {["pending", "processing", "done", "failed"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <LoadingSkeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={28} className="mx-auto text-text-muted mb-3" />
          <p className="text-[14px] text-text-secondary">No papers found</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border bg-bg-elevated">
            <div className="col-span-3 text-xs font-medium text-text-muted uppercase tracking-wide">File</div>
            <div className="col-span-3 text-xs font-medium text-text-muted uppercase tracking-wide">Subject</div>
            <div className="col-span-1 text-xs font-medium text-text-muted uppercase tracking-wide">Year</div>
            <div className="col-span-1 text-xs font-medium text-text-muted uppercase tracking-wide">Type</div>
            <div className="col-span-2 text-xs font-medium text-text-muted uppercase tracking-wide">Status</div>
            <div className="col-span-2 text-xs font-medium text-text-muted uppercase tracking-wide text-right">Actions</div>
          </div>
          {filtered.map((p, idx) => (
            <div
              key={p.id}
              className={`grid grid-cols-12 gap-2 px-4 py-3 items-center ${
                idx !== filtered.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              <div className="col-span-3 min-w-0">
                <p className="text-sm text-text-primary truncate flex items-center gap-1.5">
                  {p.verified && <ShieldCheck size={11} className="text-accent shrink-0" />}
                  {p.file_name}
                </p>
                {p.question_count > 0 && (
                  <p className="text-xs text-text-muted">{p.question_count} questions</p>
                )}
              </div>
              <div className="col-span-3 text-sm text-text-secondary truncate">
                {p.subjects?.name || "—"}
              </div>
              <div className="col-span-1 text-sm text-text-secondary">{p.year}</div>
              <div className="col-span-1 text-sm text-text-secondary capitalize">{p.exam_type}</div>
              <div className="col-span-2">
                <Badge variant={statusVariant(p.processing_status)}>
                  {p.processing_status}
                </Badge>
              </div>
              <div className="col-span-2 flex items-center justify-end gap-1">
                <button
                  onClick={() => handleVerify(p)}
                  disabled={actionId === p.id}
                  title={p.verified ? "Unverify" : "Mark verified"}
                  className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${
                    p.verified ? "text-accent hover:bg-accent/10" : "text-text-muted hover:text-accent hover:bg-bg-elevated"
                  }`}
                >
                  <ShieldCheck size={13} />
                </button>
                <button
                  onClick={() => handleReprocess(p.id)}
                  disabled={actionId === p.id}
                  title="Reprocess"
                  className="p-1.5 rounded-md text-text-muted hover:text-amber-400 hover:bg-bg-elevated transition-colors disabled:opacity-40"
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  onClick={() => setConfirmDelete(p.id)}
                  disabled={actionId === p.id}
                  title="Delete"
                  className="p-1.5 rounded-md text-text-muted hover:text-red-400 hover:bg-bg-elevated transition-colors disabled:opacity-40"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete paper?"
          message="This permanently deletes the PDF, all extracted questions, and clears prediction cache for the subject."
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          confirmText="Delete"
        />
      )}

      {uploadOpen && (
        <UploadModal
          subjects={subjects}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => { setUploadOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[11.5px] text-text-muted font-medium">{label}</p>
      <p className={`text-3xl font-bold tracking-tight mt-1 ${color || "text-text-primary"}`}>{value}</p>
    </div>
  );
}

function ConfirmModal({
  title, message, onConfirm, onCancel, confirmText,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText: string;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-bg-card border border-border rounded-xl p-5 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
        <p className="text-xs text-text-secondary mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="text-xs text-text-muted px-3 py-1.5">Cancel</button>
          <button
            onClick={onConfirm}
            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadModal({
  subjects, onClose, onUploaded,
}: {
  subjects: Subject[];
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [examType, setExamType] = useState("summer");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !subjectId) { setError("Subject and file required"); return; }
    setError("");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("subject_id", subjectId);
    fd.append("year", String(year));
    fd.append("exam_type", examType);
    try {
      await api.upload("/admin/papers/upload", fd);
      toast.success("Paper uploaded and queued for processing.");
      onUploaded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center" onClick={onClose}>
      <div className="bg-bg-card border border-border rounded-xl p-5 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Upload Official GTU Paper</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-text-muted block mb-1">Subject *</label>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              required
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary appearance-none focus:outline-none focus:border-accent"
            >
              <option value="">Choose subject…</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted block mb-1">Year *</label>
              <input
                type="number"
                value={year}
                min={2000}
                max={new Date().getFullYear() + 1}
                onChange={e => setYear(Number(e.target.value))}
                required
                className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Exam type *</label>
              <select
                value={examType}
                onChange={e => setExamType(e.target.value)}
                className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary appearance-none focus:outline-none focus:border-accent"
              >
                {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">PDF *</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              required
              className="w-full text-xs text-text-secondary file:mr-3 file:bg-bg-elevated file:border file:border-border file:rounded-md file:px-3 file:py-1.5 file:text-xs file:text-text-primary file:cursor-pointer"
            />
            <p className="text-xs text-text-muted mt-1">Max 10 MB. Marked verified automatically.</p>
          </div>
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={uploading}
            className="btn-primary w-full h-11"
          >
            {uploading ? "Uploading…" : "Upload paper"}
          </button>
        </form>
      </div>
    </div>
  );
}
