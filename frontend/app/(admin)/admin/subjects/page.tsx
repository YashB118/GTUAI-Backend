"use client";

import { useState, useEffect } from "react";
import { GraduationCap, Plus, Trash2, RefreshCw, Edit2, X, FileText, BookOpen, Sparkles } from "lucide-react";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface SubjectStats {
  id: string;
  name: string;
  code: string | null;
  branch: string | null;
  semester: number | null;
  credits?: number | null;
  paper_count: number;
  material_count: number;
  question_count: number;
}

const BRANCHES = ["CE", "IT", "EC", "EE", "ME", "Civil", "CSE", "AI", "DS"];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editing, setEditing] = useState<SubjectStats | null>(null);
  const [filterBranch, setFilterBranch] = useState("");
  const [filterSemester, setFilterSemester] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [credits, setCredits] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get("/admin/subjects/stats");
      setSubjects(Array.isArray(data) ? data : []);
    } catch {
      setSubjects([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = subjects.filter(s =>
    (!filterBranch || s.branch === filterBranch) &&
    (!filterSemester || String(s.semester) === filterSemester)
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setFormError("Name is required."); return; }
    setCreating(true);
    setFormError("");
    try {
      await api.post("/subjects/", {
        name: name.trim(),
        code: code.trim() || null,
        branch: branch || null,
        semester: semester ? Number(semester) : null,
        credits: credits ? Number(credits) : null,
      });
      setName(""); setCode(""); setBranch(""); setSemester(""); setCredits("");
      await load();
      toast.success("Subject added!");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create subject");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    setConfirmDelete(null);
    try {
      await api.delete(`/subjects/${id}`);
      setSubjects(prev => prev.filter(s => s.id !== id));
      toast.success("Subject deleted.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
    setDeleting(null);
  };

  const handleEditSave = async (updated: Partial<SubjectStats>) => {
    if (!editing) return;
    try {
      await api.patch(`/admin/subjects/${editing.id}`, updated);
      setEditing(null);
      await load();
      toast.success("Subject updated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap size={20} className="text-accent" />
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Subjects</h1>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Add subject form */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Plus size={14} className="text-text-muted" />
            <span className="text-sm font-medium text-text-primary">Add Subject</span>
          </div>
        </div>
        <form onSubmit={handleCreate} className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-text-muted block mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Computer Networks"
                required
                className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Code</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="3150710"
                className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Branch</label>
              <select
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary appearance-none focus:outline-none focus:border-accent"
              >
                <option value="">Any</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Semester</label>
              <select
                value={semester}
                onChange={e => setSemester(e.target.value)}
                className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary appearance-none focus:outline-none focus:border-accent"
              >
                <option value="">Any</option>
                {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Credits</label>
              <input
                type="number"
                value={credits}
                min={1}
                max={6}
                onChange={e => setCredits(e.target.value)}
                placeholder="4"
                className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus size={13} />
            {creating ? "Adding..." : "Add Subject"}
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <select
          value={filterBranch}
          onChange={e => setFilterBranch(e.target.value)}
          className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary appearance-none focus:outline-none focus:border-accent"
        >
          <option value="">All branches</option>
          {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select
          value={filterSemester}
          onChange={e => setFilterSemester(e.target.value)}
          className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary appearance-none focus:outline-none focus:border-accent"
        >
          <option value="">All semesters</option>
          {SEMESTERS.map(s => <option key={s} value={String(s)}>Sem {s}</option>)}
        </select>
        <span className="text-xs text-text-muted ml-2">{filtered.length} of {subjects.length}</span>
      </div>

      {/* Subjects table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <LoadingSkeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <GraduationCap size={28} className="mx-auto text-text-muted mb-3" />
          <p className="text-sm text-text-secondary">No subjects match.</p>
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border bg-bg-elevated">
            <div className="col-span-3 text-xs font-medium text-text-muted uppercase tracking-wide">Name</div>
            <div className="col-span-1 text-xs font-medium text-text-muted uppercase tracking-wide">Code</div>
            <div className="col-span-1 text-xs font-medium text-text-muted uppercase tracking-wide">Branch</div>
            <div className="col-span-1 text-xs font-medium text-text-muted uppercase tracking-wide">Sem</div>
            <div className="col-span-1 text-xs font-medium text-text-muted uppercase tracking-wide">Cr</div>
            <div className="col-span-4 text-xs font-medium text-text-muted uppercase tracking-wide">Counts</div>
            <div className="col-span-1" />
          </div>
          {filtered.map((s, idx) => (
            <div
              key={s.id}
              className={`grid grid-cols-12 gap-2 px-4 py-3 items-center ${
                idx !== filtered.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              <div className="col-span-3 text-sm font-medium text-text-primary truncate">{s.name}</div>
              <div className="col-span-1 text-sm text-text-secondary font-mono truncate">{s.code || "—"}</div>
              <div className="col-span-1 text-sm text-text-secondary">{s.branch || "—"}</div>
              <div className="col-span-1 text-sm text-text-secondary">{s.semester ? `S${s.semester}` : "—"}</div>
              <div className="col-span-1 text-sm text-text-secondary">{s.credits ?? "—"}</div>
              <div className="col-span-4 flex items-center gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-1"><FileText size={11} className="text-accent" /> {s.paper_count} papers</span>
                <span className="flex items-center gap-1"><BookOpen size={11} className="text-blue-400" /> {s.material_count} materials</span>
                <span className="flex items-center gap-1"><Sparkles size={11} className="text-violet-400" /> {s.question_count} Qs</span>
              </div>
              <div className="col-span-1 flex justify-end gap-1">
                <button
                  onClick={() => setEditing(s)}
                  className="p-1.5 text-text-muted hover:text-accent hover:bg-bg-elevated rounded-md transition-colors"
                  title="Edit"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={() => setConfirmDelete(s.id)}
                  disabled={deleting === s.id}
                  className="p-1.5 text-text-muted hover:text-red-400 hover:bg-bg-elevated rounded-md transition-colors disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditModal subject={editing} onClose={() => setEditing(null)} onSave={handleEditSave} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center" onClick={() => setConfirmDelete(null)}>
          <div className="bg-bg-card border border-border rounded-xl p-5 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Delete subject?</h3>
            <p className="text-xs text-text-secondary mb-4">
              This deletes the subject and all linked papers, questions, and patterns. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="text-xs text-text-muted px-3 py-1.5">Cancel</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={!!deleting}
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditModal({
  subject, onClose, onSave,
}: {
  subject: SubjectStats;
  onClose: () => void;
  onSave: (data: Partial<SubjectStats>) => void;
}) {
  const [name, setName] = useState(subject.name);
  const [code, setCode] = useState(subject.code || "");
  const [branch, setBranch] = useState(subject.branch || "");
  const [semester, setSemester] = useState(subject.semester ? String(subject.semester) : "");
  const [credits, setCredits] = useState(subject.credits != null ? String(subject.credits) : "");

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center" onClick={onClose}>
      <div className="bg-bg-card border border-border rounded-xl p-5 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Edit Subject</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <Field label="Name"><input value={name} onChange={e => setName(e.target.value)} className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" /></Field>
          <Field label="Code"><input value={code} onChange={e => setCode(e.target.value)} className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Branch">
              <select value={branch} onChange={e => setBranch(e.target.value)} className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary appearance-none focus:outline-none focus:border-accent">
                <option value="">—</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Sem">
              <select value={semester} onChange={e => setSemester(e.target.value)} className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary appearance-none focus:outline-none focus:border-accent">
                <option value="">—</option>
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Credits">
              <input type="number" value={credits} min={1} max={6} onChange={e => setCredits(e.target.value)} className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-xs text-text-muted px-3 py-1.5">Cancel</button>
          <button
            onClick={() => onSave({
              name: name.trim(),
              code: code.trim() || null,
              branch: branch || null,
              semester: semester ? Number(semester) : null,
              credits: credits ? Number(credits) : null,
            })}
            className="bg-accent hover:bg-accent-hover text-white rounded-lg px-3 py-1.5 text-xs font-medium"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-text-muted block mb-1">{label}</label>
      {children}
    </div>
  );
}
