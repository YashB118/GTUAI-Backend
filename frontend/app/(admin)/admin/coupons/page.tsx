"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Ticket, Plus, ToggleLeft, ToggleRight, Trash2, Users, Copy } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

function fadeUp(delay = 0) {
  return {
    initial:    { opacity: 0, y: 14 },
    animate:    { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35, ease: "easeOut" },
  } as const;
}

interface Coupon {
  id: string;
  code: string;
  coin_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  note: string | null;
  created_at: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons]           = useState<Coupon[]>([]);
  const [loading, setLoading]           = useState(true);
  const [creating, setCreating]         = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [viewRedemptions, setViewRedemptions] = useState<string | null>(null);
  const [redemptions, setRedemptions]   = useState<unknown[]>([]);

  const [form, setForm] = useState({
    code: "",
    coin_value: "50",
    max_uses: "",
    expires_at: "",
    note: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/admin/coupons?limit=100");
      setCoupons(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/admin/coupons", {
        code: form.code || undefined,
        coin_value: parseInt(form.coin_value),
        max_uses: form.max_uses ? parseInt(form.max_uses) : undefined,
        expires_at: form.expires_at || undefined,
        note: form.note || undefined,
      });
      toast.success("Coupon created!");
      setForm({ code: "", coin_value: "50", max_uses: "", expires_at: "", note: "" });
      setShowForm(false);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Create failed";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      await api.patch(`/admin/coupons/${coupon.id}`, { is_active: !coupon.is_active });
      toast.success(coupon.is_active ? "Coupon deactivated" : "Coupon activated");
      load();
    } catch {}
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("Delete this coupon? This cannot be undone.")) return;
    try {
      await api.delete(`/admin/coupons/${id}`);
      toast.success("Deleted");
      load();
    } catch {}
  };

  const loadRedemptions = async (id: string) => {
    setViewRedemptions(id);
    try {
      const data = await api.get(`/admin/coupons/${id}/redemptions`);
      setRedemptions(data);
    } catch {}
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Ticket size={22} className="text-violet-400" /> Coupons
          </h1>
          <p className="text-sm text-text-muted mt-1">Generate and manage coin reward coupons</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
        >
          <Plus size={14} /> Create Coupon
        </button>
      </motion.div>

      {/* Create form */}
      {showForm && (
        <motion.div {...fadeUp(0)} className="rounded-2xl border border-accent/20 bg-bg-card p-5">
          <p className="text-sm font-semibold text-text-primary mb-4">New Coupon</p>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-muted mb-1.5">Code (optional — auto-generated if blank)</p>
              <input
                type="text"
                placeholder="e.g. DIWALI100"
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="w-full bg-bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1.5">Coin Value *</p>
              <input
                type="number"
                min={1}
                required
                value={form.coin_value}
                onChange={e => setForm(p => ({ ...p, coin_value: e.target.value }))}
                className="w-full bg-bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1.5">Max Uses (blank = unlimited)</p>
              <input
                type="number"
                min={1}
                placeholder="e.g. 100"
                value={form.max_uses}
                onChange={e => setForm(p => ({ ...p, max_uses: e.target.value }))}
                className="w-full bg-bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1.5">Expires At (blank = never)</p>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
                className="w-full bg-bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-text-muted mb-1.5">Internal Note</p>
              <input
                type="text"
                placeholder="e.g. Diwali promo, Oct 2025"
                value={form.note}
                onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                className="w-full bg-bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {creating
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Ticket size={14} />}
                Create
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-border text-text-muted hover:text-text-primary text-sm transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Coupon list */}
      <motion.div {...fadeUp(0.1)} className="rounded-2xl border border-border bg-bg-card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border/50">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse bg-bg-elevated/20" />)}
          </div>
        ) : coupons.length === 0 ? (
          <div className="py-16 text-center text-text-muted text-sm">
            <Ticket size={24} className="mx-auto mb-3 opacity-20" />
            No coupons yet. Create one above.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {coupons.map(c => (
              <div key={c.id} className="px-5 py-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <code className="text-sm font-bold text-accent font-mono">{c.code}</code>
                      <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                        +{c.coin_value} 🪙
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                      <span>Used: {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</span>
                      {c.expires_at && <span>Expires: {new Date(c.expires_at).toLocaleDateString("en-IN")}</span>}
                      {c.note && <span>{c.note}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      title="Copy code"
                      onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Code copied!"); }}
                      className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      title="View redemptions"
                      onClick={() => loadRedemptions(c.id)}
                      className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
                    >
                      <Users size={13} />
                    </button>
                    <button
                      onClick={() => toggleActive(c)}
                      className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
                    >
                      {c.is_active ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
                    </button>
                    <button
                      onClick={() => deleteCoupon(c.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Redemptions modal */}
      {viewRedemptions && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setViewRedemptions(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-2xl border border-border bg-bg-card shadow-modal overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                <p className="font-semibold text-text-primary">Redemptions</p>
                <button onClick={() => setViewRedemptions(null)} className="text-text-muted hover:text-text-primary">✕</button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
                {(redemptions as Array<{id: string; users?: {full_name?: string; email?: string; enrollment_no?: string}; coins_awarded: number; redeemed_at: string}>).length === 0 ? (
                  <div className="py-10 text-center text-text-muted text-sm">No redemptions yet</div>
                ) : (
                  (redemptions as Array<{id: string; users?: {full_name?: string; email?: string; enrollment_no?: string}; coins_awarded: number; redeemed_at: string}>).map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary">{(r.users as {full_name?: string})?.full_name || "Unknown"}</p>
                        <p className="text-xs text-text-muted">{(r.users as {email?: string})?.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-amber-400">+{r.coins_awarded} 🪙</p>
                        <p className="text-xs text-text-muted">{new Date(r.redeemed_at).toLocaleDateString("en-IN")}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
