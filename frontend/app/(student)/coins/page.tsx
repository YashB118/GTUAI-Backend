"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, ShoppingBag, History, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

function fadeUp(delay = 0) {
  return {
    initial:    { opacity: 0, y: 14 },
    animate:    { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35, ease: "easeOut" },
  } as const;
}

interface Tx {
  id: string;
  amount: number;
  type: string;
  note: string;
  created_at: string;
}

const TX_LABELS: Record<string, { label: string; emoji: string }> = {
  login:             { label: "Daily login",         emoji: "📅" },
  streak_bonus:      { label: "Streak milestone",    emoji: "🔥" },
  challenge_correct: { label: "Challenge correct",   emoji: "✅" },
  challenge_attempt: { label: "Challenge attempt",   emoji: "🎯" },
  brahmastra:        { label: "Brahmastra used",     emoji: "⚔️" },
  admin_grant:       { label: "Admin reward",        emoji: "🎁" },
  coupon:            { label: "Coupon redeemed",     emoji: "🎟️" },
  spend_ai:          { label: "Extra AI query",      emoji: "🤖" },
  spend_freeze:      { label: "Streak freeze",       emoji: "🧊" },
};

const SHOP_ITEMS = [
  {
    id: "streak_freeze",
    name: "Streak Freeze",
    desc: "Miss a day without losing your streak",
    cost: 50,
    emoji: "🧊",
    color: "border-blue-500/25 hover:border-blue-500/40",
    badge: "bg-blue-500/10 text-blue-400",
  },
  {
    id: "ai_query",
    name: "Extra AI Query",
    desc: "One extra Brahmastra / chat query (beyond 5 free/day)",
    cost: 10,
    emoji: "🤖",
    color: "border-violet-500/25 hover:border-violet-500/40",
    badge: "bg-violet-500/10 text-violet-400",
  },
];

export default function CoinsPage() {
  const [balance, setBalance]       = useState<number | null>(null);
  const [lifetime, setLifetime]     = useState(0);
  const [transactions, setTxs]      = useState<Tx[]>([]);
  const [loading, setLoading]       = useState(true);
  const [spending, setSpending]     = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [redeeming, setRedeeming]   = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.get("/coins/me"),
      api.get("/coins/transactions"),
    ]).then(([coinRes, txRes]) => {
      if (coinRes.status === "fulfilled") {
        setBalance(coinRes.value.balance);
        setLifetime(coinRes.value.lifetime_earned);
      }
      if (txRes.status === "fulfilled") setTxs(txRes.value);
    }).finally(() => setLoading(false));
  }, []);

  const handleSpend = async (item: string) => {
    setSpending(item);
    try {
      const res = await api.post("/coins/spend", { item });
      setBalance(res.balance);
      if (res.spent > 0) {
        toast.success(`Bought! -${res.spent} coins`);
        // Refresh transactions
        const txRes = await api.get("/coins/transactions");
        setTxs(txRes);
      } else {
        toast.info("Used free quota — no coins spent");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Purchase failed";
      toast.error(msg);
    } finally {
      setSpending(null);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setRedeeming(true);
    try {
      const res = await api.post("/coupons/redeem", { code: couponCode.trim() });
      setBalance(res.balance);
      toast.success(res.message);
      setCouponCode("");
      const txRes = await api.get("/coins/transactions");
      setTxs(txRes);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Redeem failed";
      toast.error(msg);
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Balance hero */}
      <motion.div {...fadeUp(0)} className="rounded-2xl border border-amber-500/20 bg-bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="text-5xl">🪙</div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-widest font-semibold">Coin Balance</p>
            {loading
              ? <div className="h-9 w-28 bg-bg-elevated rounded-lg animate-pulse mt-1" />
              : <p className="text-4xl font-bold text-amber-400">{(balance ?? 0).toLocaleString()}</p>
            }
            <p className="text-xs text-text-muted mt-1">Lifetime earned: {lifetime.toLocaleString()}</p>
          </div>
        </div>
      </motion.div>

      {/* Coupon redeem */}
      <motion.div {...fadeUp(0.05)} className="rounded-2xl border border-border bg-bg-card p-5">
        <p className="text-sm font-semibold text-text-primary mb-3">🎟️ Redeem Coupon</p>
        <form onSubmit={handleRedeem} className="flex gap-2">
          <input
            type="text"
            placeholder="Enter coupon code (e.g. DIWALI100)"
            value={couponCode}
            onChange={e => setCouponCode(e.target.value.toUpperCase())}
            className="flex-1 bg-bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors font-mono"
          />
          <button
            type="submit"
            disabled={redeeming || !couponCode.trim()}
            className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {redeeming
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <CheckCircle size={14} />}
            Redeem
          </button>
        </form>
      </motion.div>

      {/* Coin shop */}
      <motion.div {...fadeUp(0.1)}>
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
          <ShoppingBag size={12} /> Coin Shop
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SHOP_ITEMS.map(item => (
            <div key={item.id} className={`rounded-2xl border bg-bg-card p-4 transition-colors ${item.color}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="text-2xl">{item.emoji}</div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${item.badge}`}>
                  {item.cost} 🪙
                </span>
              </div>
              <p className="text-sm font-semibold text-text-primary">{item.name}</p>
              <p className="text-xs text-text-muted mt-1 mb-3">{item.desc}</p>
              <button
                onClick={() => handleSpend(item.id)}
                disabled={spending === item.id || (balance ?? 0) < item.cost}
                className="w-full py-2 rounded-xl bg-bg-elevated border border-border hover:border-accent/30 hover:text-accent text-text-secondary text-sm font-medium transition-colors disabled:opacity-40"
              >
                {spending === item.id
                  ? <span className="flex justify-center"><span className="w-4 h-4 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" /></span>
                  : "Buy"}
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Transaction history */}
      <motion.div {...fadeUp(0.15)}>
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
          <History size={12} /> Transaction History
        </p>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-bg-card animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10 text-text-muted text-sm">
            <Zap size={24} className="mx-auto mb-3 opacity-30" />
            No transactions yet. Login daily to earn coins!
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-bg-card overflow-hidden divide-y divide-border/50">
            {transactions.map(tx => {
              const meta = TX_LABELS[tx.type] || { label: tx.type, emoji: "🪙" };
              const isEarn = tx.amount > 0;
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-lg shrink-0">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary font-medium">{meta.label}</p>
                    {tx.note && <p className="text-xs text-text-muted truncate">{tx.note}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${isEarn ? "text-emerald-400" : "text-red-400"}`}>
                      {isEarn ? "+" : ""}{tx.amount} 🪙
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
