"use client";

import { useState, useEffect, useMemo } from "react";
import { CheckCircle, X, FileText, Clock, RefreshCw, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Material {
  id: string;
  title: string;
  description: string;
  material_type: string;
  file_name: string;
  file_size_kb: number;
  approval_status: string;
  processing_status: string | null;
  chunk_count: number | null;
  rejection_reason: string | null;
  created_at: string;
  uploaded_by: string;
  subjects?: { name: string; code: string };
  users?: { full_name: string; email: string; enrollment_no: string };
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
}

type TabType = "pending" | "approved" | "rejected";

export default function ApprovalsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("pending");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterType, setFilterType] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    const [mats, subs] = await Promise.all([
      api.get(`/admin/materials?status=${tab}&limit=200`).catch(() => []),
      api.get("/subjects").catch(() => []),
    ]);
    setMaterials(Array.isArray(mats) ? mats : []);
    setSubjects(Array.isArray(subs) ? subs : []);
    setSelectedIds(new Set());
    setLoading(false);
  };

  useEffect(() => {
    load();
    setPreviewId(null);
    setPreviewUrl(null);
  }, [tab]);

  const filtered = useMemo(() => {
    return materials.filter(m => {
      if (filterSubject && m.subjects?.name) {
        const subj = subjects.find(s => s.id === filterSubject);
        if (subj && m.subjects.name !== subj.name) return false;
      }
      if (filterType && m.material_type !== filterType) return false;
      return true;
    });
  }, [materials, filterSubject, filterType, subjects]);

  const selected = filtered.find(m => m.id === previewId);

  const loadPreview = async (id: string) => {
    setPreviewId(id);
    setPreviewUrl(null);
    setPreviewLoading(true);
    try {
      const res = await api.get(`/admin/materials/${id}/preview`);
      setPreviewUrl(res?.url ?? null);
    } catch {
      setPreviewUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post("/admin/materials/bulk-approve", { material_ids: [id] });
      toast.success("Material approved and queued for AI indexing.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    }
    setActionLoading(null);
    if (previewId === id) { setPreviewId(null); setPreviewUrl(null); }
    await load();
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post("/admin/materials/bulk-reject", {
        material_ids: [id],
        reason: rejectReason.trim() || undefined,
      });
      toast.success("Material rejected.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    }
    setRejectTarget(null);
    setRejectReason("");
    setActionLoading(null);
    if (previewId === id) { setPreviewId(null); setPreviewUrl(null); }
    await load();
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      await api.post("/admin/materials/bulk-approve", {
        material_ids: Array.from(selectedIds),
      });
      toast.success(`${selectedIds.size} material${selectedIds.size !== 1 ? "s" : ""} approved.`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bulk approve failed");
    }
    setBulkLoading(false);
    await load();
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      await api.post("/admin/materials/bulk-reject", {
        material_ids: Array.from(selectedIds),
        reason: bulkRejectReason.trim() || undefined,
      });
      toast.success(`${selectedIds.size} material${selectedIds.size !== 1 ? "s" : ""} rejected.`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bulk reject failed");
    }
    setBulkLoading(false);
    setBulkRejectOpen(false);
    setBulkRejectReason("");
    await load();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(m => m.id)));
  };

  const pendingCount = materials.filter(m => m.approval_status === "pending").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="section-title">Moderation</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary mt-2">Approvals</h1>
        </div>
        <button onClick={load} className="btn-ghost">
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Tabs + filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-bg-elevated p-1 rounded-lg w-fit">
          {(["pending", "approved", "rejected"] as TabType[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === t
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === "pending" && pendingCount > 0 && (
                <span className="ml-2 bg-amber-400/20 text-amber-400 text-xs px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="bg-bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary appearance-none focus:outline-none focus:border-accent"
          >
            <option value="">All subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary appearance-none focus:outline-none focus:border-accent"
          >
            <option value="">All types</option>
            {["notes", "textbook", "handwritten", "summary", "slides"].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk actions bar */}
      {tab === "pending" && selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-accent/10 border border-accent/20 rounded-lg px-4 py-2">
          <span className="text-sm text-text-primary font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkApprove}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
            >
              <CheckCircle size={11} />
              Approve all
            </button>
            <button
              onClick={() => setBulkRejectOpen(true)}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
            >
              <X size={11} />
              Reject all
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-text-muted hover:text-text-primary text-xs transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Bulk reject modal */}
      {bulkRejectOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center" onClick={() => setBulkRejectOpen(false)}>
          <div className="bg-bg-card border border-border rounded-xl p-5 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Reject {selectedIds.size} materials</h3>
            <textarea
              value={bulkRejectReason}
              onChange={e => setBulkRejectReason(e.target.value)}
              placeholder="Reason (optional, sent to uploaders)"
              rows={3}
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-red-400/50 resize-none"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setBulkRejectOpen(false)} className="text-xs text-text-muted px-3 py-1.5">Cancel</button>
              <button
                onClick={handleBulkReject}
                disabled={bulkLoading}
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
              >
                {bulkLoading ? "Rejecting..." : "Confirm reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <LoadingSkeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <Clock size={28} className="mx-auto text-text-muted mb-3" />
          <p className="text-sm text-text-secondary">No {tab} materials</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* List pane */}
          <div className="lg:col-span-2 space-y-2">
            {tab === "pending" && (
              <div className="flex items-center gap-2 px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  className="accent-accent"
                />
                <span className="text-xs text-text-muted">Select all ({filtered.length})</span>
              </div>
            )}
            {filtered.map(m => {
              const isPreviewing = previewId === m.id;
              const isSelected = selectedIds.has(m.id);
              return (
                <div
                  key={m.id}
                  className={`bg-bg-card border rounded-xl p-3 cursor-pointer transition-all ${
                    isPreviewing ? "border-accent/60" : "border-border hover:border-border/60"
                  }`}
                  onClick={() => loadPreview(m.id)}
                >
                  <div className="flex items-start gap-2">
                    {tab === "pending" && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(m.id)}
                        onClick={e => e.stopPropagation()}
                        className="mt-1 accent-accent"
                      />
                    )}
                    <FileText size={14} className="text-accent shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">{m.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {m.subjects?.name && (
                          <span className="text-xs text-text-muted truncate max-w-[140px]">{m.subjects.name}</span>
                        )}
                        <span className="text-text-muted/40 text-xs">·</span>
                        <span className="text-xs text-text-muted capitalize">{m.material_type}</span>
                        <span className="text-text-muted/40 text-xs">·</span>
                        <span className="text-xs text-text-muted">{(m.file_size_kb / 1024).toFixed(1)} MB</span>
                      </div>
                      {m.users?.full_name && (
                        <p className="text-xs text-text-muted mt-1 truncate">
                          by {m.users.full_name}
                          {m.users.enrollment_no && ` · ${m.users.enrollment_no}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Preview pane */}
          <div className="lg:col-span-3">
            <div className="bg-bg-card border border-border rounded-xl overflow-hidden flex flex-col h-[calc(100vh-220px)] sticky top-2">
              {!selected ? (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div>
                    <Eye size={28} className="mx-auto text-text-muted mb-3" />
                    <p className="text-sm text-text-secondary">Select a material to preview</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 border-b border-border space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{selected.title}</p>
                        {selected.description && (
                          <p className="text-xs text-text-secondary mt-1 line-clamp-2">{selected.description}</p>
                        )}
                      </div>
                      <Badge variant={selected.approval_status as "pending" | "approved" | "rejected"}>
                        {selected.approval_status}
                      </Badge>
                    </div>
                    {selected.users && (
                      <p className="text-xs text-text-muted">
                        Uploaded by {selected.users.full_name}
                        {selected.users.email && ` · ${selected.users.email}`}
                        {selected.users.enrollment_no && ` · ${selected.users.enrollment_no}`}
                      </p>
                    )}
                    {tab === "rejected" && selected.rejection_reason && (
                      <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
                        Reason: {selected.rejection_reason}
                      </p>
                    )}
                  </div>

                  {/* PDF preview */}
                  <div className="flex-1 bg-black/40">
                    {previewLoading ? (
                      <div className="h-full flex items-center justify-center text-text-muted text-xs">Loading PDF…</div>
                    ) : previewUrl ? (
                      <iframe src={previewUrl} className="w-full h-full" title="Preview" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-text-muted text-xs">Preview unavailable</div>
                    )}
                  </div>

                  {/* Actions */}
                  {tab === "pending" && (
                    <div className="p-3 border-t border-border flex items-center justify-end gap-2">
                      {rejectTarget === selected.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Reason (optional)"
                            className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-red-400/50"
                          />
                          <button
                            onClick={() => handleReject(selected.id)}
                            disabled={actionLoading === selected.id}
                            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                            className="text-text-muted hover:text-text-primary text-xs transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleApprove(selected.id)}
                            disabled={actionLoading === selected.id}
                            className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
                          >
                            <CheckCircle size={11} />
                            Approve
                          </button>
                          <button
                            onClick={() => { setRejectTarget(selected.id); setRejectReason(""); }}
                            disabled={actionLoading === selected.id}
                            className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
                          >
                            <X size={11} />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {tab === "approved" && selected.processing_status && (
                    <div className="p-3 border-t border-border">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selected.processing_status === "processed"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : selected.processing_status === "failed"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {selected.processing_status === "processed"
                          ? `AI indexed · ${selected.chunk_count ?? 0} chunks`
                          : selected.processing_status === "failed"
                          ? "Processing failed"
                          : selected.processing_status === "queued"
                          ? "Queued for processing"
                          : "Processing..."}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
