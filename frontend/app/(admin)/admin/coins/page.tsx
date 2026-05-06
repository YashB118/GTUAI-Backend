"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Wallet, Search, Gift, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

function fadeUp(delay = 0) {
  return {
    initial:    { opacity: 0, y: 14 },
    animate:    { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35, ease: "easeOut" },
  } as const;
}

interface UserCoinRow {
  id: string;
  full_name: string;
  email: string;
  enrollment_no: string;
  branch?: string;
  semester?: number;
  balance: number;
  lifetime_earned: number;
  current_streak: number;
}

interface CoinAnalytics {
  total_coins_in_circulation: number;
  total_coins_ever_earned: number;
  active_streaks: number;
  avg_streak_length: number;
  total_coupons: number;
  total_redemptions: number;
  total_challenge_attempts: number;
}

export default function AdminCoinsPage() {
  const [users, setUsers]         = useState<UserCoinRow[]>([]);
  const [analytics, setAnalytics] = useState<CoinAnalytics | null>(null);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [grantUserId, setGrantUserId]   = useState("");
  const [grantAmount, setGrantAmount]   = useState("");
  const [grantNote, setGrantNote]       = useState("Admin reward");
  const [granting, setGranting]         = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserCoinRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [usersRes, analyticsRes] = await Promise.allSettled([
      api.get(`/admin/coins/users?search=${encodeURIComponent(search)}&limit=50`),
      api.get("/admin/analytics/coins"),
    ]);
    if (usersRes.status === "fulfilled") setUsers(usersRes.value);
    if (analyticsRes.status === "fulfilled") setAnalytics(analyticsRes.value);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantUserId || !grantAmount) return;
    setGranting(true);
    try {
      const res = await api.post("/admin/coins/grant", {
        user_id: grantUserId,
        amount: parseInt(grantAmount),
        note: grantNote || "Admin reward",
      });
      toast.success(`Granted ${res.granted} coins! New balance: ${res.balance}`);
      setGrantUserId("");
      setGrantAmount("");
      setGrantNote("Admin reward");
      setSelectedUser(null);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Grant failed";
      toast.error(msg);
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Wallet size={22} className="text-amber-400" /> Coin Management
          </h1>
          <p className="text-sm text-text-muted mt-1">Grant coins, view balances, track activity</p>
        </div>
      </motion.div>

      {/* Analytics cards */}
      {analytics && (
        <motion.div {...fadeUp(0.05)} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "In Circulation", value: analytics.total_coins_in_circulation.toLocaleString(), emoji: "🪙" },
            { label: "Ever Earned", value: analytics.total_coins_ever_earned.toLocaleString(), emoji: "📈" },
            { label: "Active Streaks", value: analytics.active_streaks.toString(), emoji: "🔥" },
            { label: "Avg Streak", value: `${analytics.avg_streak_length}d`, emoji: "📅" },
          ].map(card => (
            <div key={card.label} className="rounded-xl border border-border bg-bg-card p-4">
              <p className="text-xs text-text-muted">{card.label}</p>
              <p className="text-xl font-bold text-text-primary mt-1">{card.emoji} {card.value}</p>
            </div>
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* User list */}
        <motion.div {...fadeUp(0.1)} className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search by name, email, enrollment..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-bg-card border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <div className="rounded-2xl border border-border bg-bg-card overflow-hidden">
            {loading ? (
              <div className="divide-y divide-border/50">
                {[...Array(6)].map((_, i) => <div key={i} className="h-16 animate-pulse bg-bg-elevated/20" />)}
              </div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-sm">No students found</div>
            ) : (
              <div className="divide-y divide-border/50">
                {users.map(u => (
                  <div
                    key={u.id}
                    onClick={() => { setSelectedUser(u); setGrantUserId(u.id); }}
                    className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-bg-elevated transition-colors ${selectedUser?.id === u.id ? "bg-accent/5 border-l-2 border-accent" : ""}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-xs font-bold text-text-muted shrink-0">
                      {u.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{u.full_name}</p>
                      <p className="text-xs text-text-muted">{u.enrollment_no} · {u.branch} S{u.semester}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-sm font-bold text-amber-400">{u.balance.toLocaleString()} 🪙</p>
                      <p className="text-xs text-text-muted">🔥 {u.current_streak}d</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Grant panel */}
        <motion.div {...fadeUp(0.12)} className="space-y-4">
          <div className="rounded-2xl border border-border bg-bg-card p-5">
            <p className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Gift size={14} className="text-emerald-400" /> Grant Coins
            </p>
            {selectedUser && (
              <div className="mb-4 px-3.5 py-3 rounded-xl bg-bg-elevated border border-border text-sm">
                <p className="font-semibold text-text-primary">{selectedUser.full_name}</p>
                <p className="text-xs text-text-muted mt-0.5">Balance: {selectedUser.balance.toLocaleString()} 🪙</p>
              </div>
            )}
            <form onSubmit={handleGrant} className="space-y-3">
              {!selectedUser && (
                <div>
                  <p className="text-xs text-text-muted mb-1.5">User ID</p>
                  <input
                    type="text"
                    placeholder="Paste user ID or click user in list"
                    value={grantUserId}
                    onChange={e => setGrantUserId(e.target.value)}
                    className="w-full bg-bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>
              )}
              <div>
                <p className="text-xs text-text-muted mb-1.5">Amount *</p>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  min={1}
                  value={grantAmount}
                  onChange={e => setGrantAmount(e.target.value)}
                  className="w-full bg-bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                  required
                />
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1.5">Note</p>
                <input
                  type="text"
                  value={grantNote}
                  onChange={e => setGrantNote(e.target.value)}
                  className="w-full bg-bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
              {selectedUser && (
                <button
                  type="button"
                  onClick={() => { setSelectedUser(null); setGrantUserId(""); }}
                  className="text-xs text-text-muted hover:text-text-primary"
                >
                  × Clear selection
                </button>
              )}
              <button
                type="submit"
                disabled={granting || !grantUserId || !grantAmount}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {granting
                  ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  : <Gift size={14} />}
                Grant Coins
              </button>
            </form>
          </div>

          {analytics && (
            <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-2.5">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={12} /> Activity
              </p>
              {[
                { label: "Coupon redemptions", value: analytics.total_redemptions },
                { label: "Challenge attempts", value: analytics.total_challenge_attempts },
                { label: "Active coupons", value: analytics.total_coupons },
              ].map(s => (
                <div key={s.label} className="flex justify-between text-sm">
                  <span className="text-text-muted">{s.label}</span>
                  <span className="font-semibold text-text-primary">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
