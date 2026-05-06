"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  streak_freeze_count: number;
}

export function StreakBadge() {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    api.get("/streaks/me")
      .then(setStreak)
      .catch(() => {});

    const handler = (e: CustomEvent<{ streak: number }>) => {
      setStreak(prev => prev ? { ...prev, current_streak: e.detail.streak } : prev);
    };
    window.addEventListener("streak:updated", handler as EventListener);
    return () => window.removeEventListener("streak:updated", handler as EventListener);
  }, []);

  if (!streak) return null;

  const s = streak.current_streak;
  const flame = s >= 30 ? "🔥🔥🔥" : s >= 7 ? "🔥🔥" : "🔥";
  const color = s >= 30
    ? "text-orange-400 border-orange-500/30 bg-orange-500/8"
    : s >= 7
    ? "text-amber-400 border-amber-500/30 bg-amber-500/8"
    : "text-text-muted border-border bg-bg-elevated";

  return (
    <div className="relative">
      <button
        onClick={() => setShowTip(v => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${color}`}
      >
        <span>{flame}</span>
        <span>{s}d</span>
      </button>
      <AnimatePresence>
        {showTip && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowTip(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-bg-card shadow-modal z-50 p-4"
            >
              <p className="text-sm font-semibold text-text-primary mb-1">Login Streak</p>
              <div className="space-y-1.5 text-xs text-text-muted">
                <div className="flex justify-between">
                  <span>Current</span>
                  <span className="font-semibold text-text-primary">{s} days</span>
                </div>
                <div className="flex justify-between">
                  <span>Best</span>
                  <span className="font-semibold text-text-primary">{streak.longest_streak} days</span>
                </div>
                {streak.streak_freeze_count > 0 && (
                  <div className="flex justify-between">
                    <span>Freezes</span>
                    <span className="font-semibold text-blue-400">{streak.streak_freeze_count} left</span>
                  </div>
                )}
              </div>
              {s > 0 && s % 7 !== 0 && (
                <p className="text-[11px] text-amber-400/80 mt-2">
                  {7 - (s % 7)} days to next bonus!
                </p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
