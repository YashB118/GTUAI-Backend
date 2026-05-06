"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { api } from "@/lib/api";

interface CoinData {
  balance: number;
  lifetime_earned: number;
}

export function CoinBalance() {
  const [coins, setCoins] = useState<CoinData | null>(null);
  const [showTip, setShowTip] = useState(false);
  const [prev, setPrev] = useState<number | null>(null);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    api.get("/coins/me")
      .then((data: CoinData) => {
        setCoins(data);
      })
      .catch(() => {});

    const handler = (e: CustomEvent<{ balance: number }>) => {
      setCoins(prev => prev ? { ...prev, balance: e.detail.balance } : prev);
    };
    window.addEventListener("coins:updated", handler as EventListener);
    return () => window.removeEventListener("coins:updated", handler as EventListener);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate on balance change
  useEffect(() => {
    if (coins === null) return;
    if (prev !== null && coins.balance !== prev) {
      setPop(true);
      setTimeout(() => setPop(false), 600);
    }
    setPrev(coins.balance);
  }, [coins?.balance]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!coins) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowTip(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/25 bg-amber-500/8 text-xs font-semibold text-amber-400 transition-colors hover:border-amber-500/40"
      >
        <motion.span
          animate={pop ? { scale: [1, 1.4, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          🪙
        </motion.span>
        <span>{coins.balance.toLocaleString()}</span>
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
              <p className="text-sm font-semibold text-text-primary mb-2">Your Coins</p>
              <div className="space-y-1.5 text-xs text-text-muted">
                <div className="flex justify-between">
                  <span>Balance</span>
                  <span className="font-semibold text-amber-400">{coins.balance.toLocaleString()} 🪙</span>
                </div>
                <div className="flex justify-between">
                  <span>All-time earned</span>
                  <span className="font-semibold text-text-primary">{coins.lifetime_earned.toLocaleString()}</span>
                </div>
              </div>
              <Link
                href="/coins"
                onClick={() => setShowTip(false)}
                className="mt-3 block text-center text-xs text-accent hover:underline"
              >
                View history & shop →
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
