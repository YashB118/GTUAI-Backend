"use client";

import { useState, useEffect } from "react";
import { Users, RefreshCw, Search, Download, Ban, ShieldCheck, X, FileText, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface User {
  id: string;
  full_name: string;
  email: string;
  branch: string | null;
  semester: number | null;
  enrollment_no: string | null;
  role: string;
  suspended?: boolean;
  created_at: string;
}

interface Upload {
  id: string;
  title?: string;
  file_name?: string;
  year?: number;
  exam_type?: string;
  material_type?: string;
  approval_status?: string;
  processing_status?: string;
  created_at: string;
  subjects?: { name: string; code: string };
}

interface UserUploads {
  papers: Upload[];
  materials: Upload[];
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<User | null>(null);
  const [uploads, setUploads] = useState<UserUploads | null>(null);
  const [confirmPromote, setConfirmPromote] = useState<User | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/admin/users?limit=200${search ? `&search=${encodeURIComponent(search)}` : ""}`);
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  // Re-fetch on search after a tiny debounce
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSuspendToggle = async (u: User) => {
    setActionId(u.id);
    try {
      const path = u.suspended ? `/admin/users/${u.id}/activate` : `/admin/users/${u.id}/suspend`;
      await api.patch(path);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, suspended: !u.suspended } : x));
      toast.success(u.suspended ? `${u.full_name} re-activated.` : `${u.full_name} suspended.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
    setActionId(null);
  };

  const handlePromote = async () => {
    if (!confirmPromote) return;
    setActionId(confirmPromote.id);
    try {
      await api.patch(`/admin/users/${confirmPromote.id}/promote`);
      setUsers(prev => prev.map(x => x.id === confirmPromote.id ? { ...x, role: "admin" } : x));
      toast.success("User promoted to admin!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Promote failed");
    }
    setActionId(null);
    setConfirmPromote(null);
  };

  const handleViewUploads = async (u: User) => {
    setViewing(u);
    setUploads(null);
    try {
      const data = await api.get(`/admin/users/${u.id}/uploads`);
      setUploads(data);
    } catch {
      setUploads({ papers: [], materials: [] });
    }
  };

  const handleExport = async () => {
    try {
      // Use a direct fetch (NOT api.get) so we get the raw blob with auth header
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch(`${BACKEND_URL}/admin/users/export-csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gtu-users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="section-title">User management</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary mt-2">Users</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary">
            <Download size={13} />
            Export CSV
          </button>
          <button onClick={load} className="btn-ghost">
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-3 flex-wrap">
          <Stat label="Total"     value={users.length} />
          <Stat label="Students"  value={users.filter(u => u.role === "student").length} />
          <Stat label="Admins"    value={users.filter(u => u.role === "admin").length} color="text-accent" />
          <Stat label="Suspended" value={users.filter(u => u.suspended).length} color="text-status-error" />
        </div>

        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, enrollment…"
            className="input pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <LoadingSkeleton key={i} className="h-14 rounded-2xl" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={28} className="mx-auto text-text-muted mb-3" />
          <p className="text-[14px] text-text-secondary">{search ? "No users match search" : "No users yet"}</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-border bg-bg-elevated">
            <div className="col-span-3 text-xs font-medium text-text-muted uppercase tracking-wide">Name</div>
            <div className="col-span-3 text-xs font-medium text-text-muted uppercase tracking-wide">Email</div>
            <div className="col-span-2 text-xs font-medium text-text-muted uppercase tracking-wide">Enrollment</div>
            <div className="col-span-1 text-xs font-medium text-text-muted uppercase tracking-wide">Branch</div>
            <div className="col-span-1 text-xs font-medium text-text-muted uppercase tracking-wide">Role</div>
            <div className="col-span-2 text-xs font-medium text-text-muted uppercase tracking-wide text-right">Actions</div>
          </div>
          {users.map((u, idx) => (
            <div
              key={u.id}
              className={`grid grid-cols-12 gap-2 px-4 py-3 items-center ${
                idx !== users.length - 1 ? "border-b border-border/50" : ""
              } ${u.suspended ? "opacity-50" : ""}`}
            >
              <div className="col-span-3 text-sm font-medium text-text-primary truncate">
                {u.full_name || "—"}
                {u.suspended && <span className="ml-2 text-xs text-red-400">[suspended]</span>}
              </div>
              <div className="col-span-3 text-sm text-text-secondary truncate">{u.email}</div>
              <div className="col-span-2 text-sm text-text-secondary font-mono truncate">{u.enrollment_no || "—"}</div>
              <div className="col-span-1 text-sm text-text-secondary">{u.branch || "—"}</div>
              <div className="col-span-1">
                <Badge variant={u.role === "admin" ? "accent" : "default"}>{u.role}</Badge>
              </div>
              <div className="col-span-2 flex items-center justify-end gap-1">
                <button
                  onClick={() => handleViewUploads(u)}
                  className="p-1.5 text-text-muted hover:text-accent hover:bg-bg-elevated rounded-md transition-colors"
                  title="View uploads"
                >
                  <FileText size={12} />
                </button>
                <button
                  onClick={() => handleSuspendToggle(u)}
                  disabled={actionId === u.id}
                  title={u.suspended ? "Activate" : "Suspend"}
                  className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${
                    u.suspended
                      ? "text-emerald-400 hover:bg-bg-elevated"
                      : "text-text-muted hover:text-red-400 hover:bg-bg-elevated"
                  }`}
                >
                  <Ban size={12} />
                </button>
                {u.role !== "admin" && (
                  <button
                    onClick={() => setConfirmPromote(u)}
                    disabled={actionId === u.id}
                    title="Promote to admin"
                    className="p-1.5 text-text-muted hover:text-accent hover:bg-bg-elevated rounded-md transition-colors disabled:opacity-40"
                  >
                    <ShieldCheck size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && (
        <UploadsModal
          user={viewing}
          uploads={uploads}
          onClose={() => { setViewing(null); setUploads(null); }}
        />
      )}

      {confirmPromote && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center" onClick={() => setConfirmPromote(null)}>
          <div className="bg-bg-card border border-border rounded-xl p-5 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Promote to admin?</h3>
            <p className="text-xs text-text-secondary mb-4">
              <span className="text-text-primary font-medium">{confirmPromote.full_name}</span> will gain
              full admin access — approvals, paper management, user management, prediction settings.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmPromote(null)} className="text-xs text-text-muted px-3 py-1.5">Cancel</button>
              <button
                onClick={handlePromote}
                disabled={actionId === confirmPromote.id}
                className="btn-primary h-9 px-3.5 text-[12.5px]"
              >
                Promote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card p-4 min-w-[110px]">
      <p className="text-[11.5px] text-text-muted font-medium">{label}</p>
      <p className={`text-2xl font-bold tracking-tight mt-0.5 ${color || "text-text-primary"}`}>{value}</p>
    </div>
  );
}

function UploadsModal({
  user, uploads, onClose,
}: {
  user: User;
  uploads: UserUploads | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center" onClick={onClose}>
      <div className="bg-bg-card border border-border rounded-xl p-5 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{user.full_name}</h3>
            <p className="text-xs text-text-muted">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>

        {!uploads ? (
          <p className="text-xs text-text-muted">Loading…</p>
        ) : (
          <div className="space-y-5">
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
                <FileText size={12} className="text-accent" /> Papers ({uploads.papers.length})
              </h4>
              {uploads.papers.length === 0 ? (
                <p className="text-xs text-text-muted">No papers uploaded.</p>
              ) : (
                <div className="space-y-1.5">
                  {uploads.papers.map(p => (
                    <div key={p.id} className="bg-bg-elevated rounded-lg px-3 py-2 text-xs text-text-secondary flex items-center justify-between">
                      <span className="truncate">{p.file_name} · {p.year} · {p.exam_type}</span>
                      <Badge variant={p.processing_status === "done" ? "approved" : p.processing_status === "failed" ? "rejected" : "pending"}>
                        {p.processing_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
                <BookOpen size={12} className="text-blue-400" /> Materials ({uploads.materials.length})
              </h4>
              {uploads.materials.length === 0 ? (
                <p className="text-xs text-text-muted">No materials uploaded.</p>
              ) : (
                <div className="space-y-1.5">
                  {uploads.materials.map(m => (
                    <div key={m.id} className="bg-bg-elevated rounded-lg px-3 py-2 text-xs text-text-secondary flex items-center justify-between">
                      <span className="truncate">{m.title} · {m.material_type}</span>
                      <Badge variant={(m.approval_status || "pending") as "approved" | "rejected" | "pending"}>
                        {m.approval_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
