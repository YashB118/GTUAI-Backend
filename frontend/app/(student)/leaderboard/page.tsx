"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame } from "lucide-react";
import { api } from "@/lib/api";

function fadeUp(delay = 0) {
  return {
    initial:    { opacity: 0, y: 14 },
    animate:    { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35, ease: "easeOut" },
  } as const;
}

interface LeaderRow {
  rank: number;
  user_id: string;
  full_name: string;
  branch?: string;
  semester?: number;
  lifetime_earned?: number;
  weekly_earned?: number;
  balance?: number;
}

export default function LeaderboardPage() {
  const [period, setPeriod]       = useState<"all" | "weekly">("weekly");
  const [rows, setRows]           = useState<LeaderRow[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/coins/leaderboard?period=${period}&limit=20`)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [period]);

  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <motion.div {...fadeUp(0)}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <Trophy size={24} className="text-amber-400" />
          Leaderboard
        </h1>
        <p className="text-sm text-text-muted mt-1">Top students by coins earned</p>
      </motion.div>

      {/* Period toggle */}
      <motion.div {...fadeUp(0.05)} className="flex gap-2">
        {(["weekly", "all"] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
              period === p
                ? "bg-accent border-accent/40 text-white"
                : "border-border text-text-muted hover:text-text-primary hover:border-border/80 bg-bg-card"
            }`}
          >
            {p === "weekly" ? "This Week" : "All Time"}
          </button>
        ))}
      </motion.div>

      {/* Table */}
      <motion.div {...fadeUp(0.1)} className="rounded-2xl border border-border bg-bg-card overflow-hidden">
        {loading ? (
          <div className="space-y-0 divide-y divide-border/50">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-bg-elevated/30" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-text-muted text-sm">
            <Trophy size={28} className="mx-auto mb-3 opacity-20" />
            No data yet. Keep earning coins!
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {rows.map((row, idx) => (
              <motion.div
                key={row.user_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx, duration: 0.25 }}
                className={`flex items-center gap-4 px-5 py-3.5 ${idx < 3 ? "bg-amber-500/3" : ""}`}
              >
                {/* Rank */}
                <div className="w-8 text-center shrink-0">
                  {idx < 3
                    ? <span className="text-xl">{MEDALS[idx]}</span>
                    : <span className="text-sm font-bold text-text-muted">{row.rank}</span>
                  }
                </div>

                {/* Avatar placeholder */}
                <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-xs font-bold text-text-muted shrink-0">
                  {row.full_name?.[0]?.toUpperCase() || "?"}
                </div>

                {/* Name + branch */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{row.full_name}</p>
                  {row.branch && (
                    <p className="text-xs text-text-muted">{row.branch} · Sem {row.semester}</p>
                  )}
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-amber-400 flex items-center gap-1 justify-end">
                    {period === "weekly"
                      ? row.weekly_earned?.toLocaleString()
                      : row.lifetime_earned?.toLocaleString()
                    }
                    <span>🪙</span>
                  </p>
                  {period === "all" && row.balance !== undefined && (
                    <p className="text-xs text-text-muted">Balance: {row.balance.toLocaleString()}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div {...fadeUp(0.15)} className="text-center">
        <p className="text-xs text-text-muted flex items-center justify-center gap-2">
          <Flame size={12} className="text-amber-400" />
          Login daily and complete challenges to climb the leaderboard
        </p>
      </motion.div>
    </div>
  );
}
