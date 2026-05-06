"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Challenge {
  id: string;
  question_text: string;
  options: string[];
  coin_reward: number;
  subject?: string;
}

interface ChallengeState {
  challenge: Challenge | null;
  attempted: boolean;
  attempt?: { selected_option: number; is_correct: boolean; coins_earned: number };
  correct_option?: number;
  explanation?: string;
}

export function DailyChallenge({ onCoinsEarned }: { onCoinsEarned?: (n: number) => void }) {
  const [state, setState] = useState<ChallengeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    api.get("/challenges/today")
      .then((data: ChallengeState) => setState(data))
      .catch(() => setState(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (selected === null || !state?.challenge) return;
    setSubmitting(true);
    try {
      const res = await api.post("/challenges/today/attempt", {
        challenge_id: state.challenge.id,
        selected_option: selected,
      });
      setState(prev => prev ? {
        ...prev,
        attempted: true,
        attempt: { selected_option: selected, is_correct: res.is_correct, coins_earned: res.coins_earned },
        correct_option: res.correct_option,
        explanation: res.explanation,
      } : prev);
      if (res.is_correct) {
        toast.success(`Sahi jawab! +${res.coins_earned} coins 🎉`);
      } else {
        toast.error(`Galat! +${res.coins_earned} coins (attempt reward)`);
      }
      onCoinsEarned?.(res.coins_earned);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submit failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="rounded-2xl border border-border bg-bg-card p-5 animate-pulse h-32" />
  );
  if (!state?.challenge) return null;

  const { challenge, attempted, attempt, correct_option, explanation } = state;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-amber-500/20 bg-bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Zap size={14} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Aaj ka sawaal</p>
            {challenge.subject && (
              <p className="text-xs text-text-muted">{challenge.subject}</p>
            )}
          </div>
        </div>
        <span className="text-xs font-semibold text-amber-400 bg-amber-500/8 border border-amber-500/20 px-2.5 py-1 rounded-full">
          +{challenge.coin_reward} 🪙
        </span>
      </div>

      {/* Question */}
      <div className="px-5 py-4">
        <p className="text-sm font-medium text-text-primary leading-snug mb-4">
          {challenge.question_text}
        </p>

        {/* Options */}
        <div className="space-y-2">
          {challenge.options.map((opt, i) => {
            let style = "border-border bg-bg-elevated text-text-secondary hover:border-accent/40 hover:text-text-primary";
            if (attempted) {
              if (i === correct_option) style = "border-emerald-500/50 bg-emerald-500/8 text-emerald-300";
              else if (i === attempt?.selected_option && !attempt.is_correct) style = "border-red-500/40 bg-red-500/6 text-red-400";
              else style = "border-border/40 bg-bg-elevated text-text-muted opacity-50";
            } else if (selected === i) {
              style = "border-accent/60 bg-accent/10 text-accent";
            }
            return (
              <button
                key={i}
                onClick={() => !attempted && setSelected(i)}
                disabled={attempted}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all duration-100 flex items-center gap-3 ${style}`}
              >
                <span className="w-6 h-6 rounded-md bg-bg-card border border-current/20 flex items-center justify-center text-xs font-bold shrink-0 opacity-70">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {attempted && i === correct_option && <CheckCircle size={14} className="text-emerald-400 shrink-0" />}
                {attempted && i === attempt?.selected_option && !attempt.is_correct && i !== correct_option && (
                  <XCircle size={14} className="text-red-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {attempted && explanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 text-xs text-text-muted bg-bg-elevated border border-border/50 rounded-xl px-4 py-3"
            >
              <span className="font-semibold text-text-secondary">Explanation: </span>{explanation}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        {!attempted && (
          <button
            onClick={handleSubmit}
            disabled={selected === null || submitting}
            className="mt-4 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting
              ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              : <Zap size={14} />}
            {submitting ? "Submitting..." : "Jawab Submit Karo"}
          </button>
        )}

        {attempted && (
          <div className={`mt-4 flex items-center gap-2 text-sm font-semibold ${attempt?.is_correct ? "text-emerald-400" : "text-text-muted"}`}>
            {attempt?.is_correct
              ? <><CheckCircle size={16} /> Bilkul sahi! +{attempt.coins_earned} coins earned</>
              : <><XCircle size={16} /> Galat tha, but +{attempt?.coins_earned} coins for trying</>
            }
          </div>
        )}
      </div>
    </motion.div>
  );
}
