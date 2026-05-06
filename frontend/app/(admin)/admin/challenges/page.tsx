"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap, Plus, Trash2, Edit2, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

function fadeUp(delay = 0) {
  return {
    initial:    { opacity: 0, y: 14 },
    animate:    { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35, ease: "easeOut" },
  } as const;
}

interface Challenge {
  id: string;
  question_text: string;
  options: string[];
  correct_option: number;
  explanation?: string;
  coin_reward: number;
  active_date: string;
  subjects?: { name: string; code: string };
}

interface Subject { id: string; name: string; code: string; }

const BLANK_FORM = {
  question_text: "",
  options: ["", "", "", ""],
  correct_option: 0,
  explanation: "",
  coin_reward: "15",
  active_date: new Date().toISOString().split("T")[0],
  subject_id: "",
};

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [subjects, setSubjects]     = useState<Subject[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState(BLANK_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    const [chRes, subRes] = await Promise.allSettled([
      api.get("/admin/challenges?limit=30"),
      api.get("/subjects?limit=200"),
    ]);
    if (chRes.status === "fulfilled") setChallenges(chRes.value);
    if (subRes.status === "fulfilled") setSubjects(subRes.value);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.options.some(o => !o.trim())) {
      toast.error("Fill all 4 options");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        question_text: form.question_text,
        options: form.options,
        correct_option: form.correct_option,
        explanation: form.explanation || undefined,
        coin_reward: parseInt(form.coin_reward),
        active_date: form.active_date,
        subject_id: form.subject_id || undefined,
      };
      if (editId) {
        await api.patch(`/admin/challenges/${editId}`, payload);
        toast.success("Challenge updated!");
      } else {
        await api.post("/admin/challenges", payload);
        toast.success("Challenge created!");
      }
      setForm(BLANK_FORM);
      setShowForm(false);
      setEditId(null);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c: Challenge) => {
    setForm({
      question_text: c.question_text,
      options: c.options,
      correct_option: c.correct_option,
      explanation: c.explanation || "",
      coin_reward: String(c.coin_reward),
      active_date: c.active_date,
      subject_id: "",
    });
    setEditId(c.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this challenge?")) return;
    try {
      await api.delete(`/admin/challenges/${id}`);
      toast.success("Deleted");
      load();
    } catch {}
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Zap size={22} className="text-amber-400" /> Daily Challenges
          </h1>
          <p className="text-sm text-text-muted mt-1">Schedule MCQ challenges for students</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setEditId(null); setForm(BLANK_FORM); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
        >
          <Plus size={14} /> New Challenge
        </button>
      </motion.div>

      {/* Form */}
      {showForm && (
        <motion.div {...fadeUp(0)} className="rounded-2xl border border-accent/20 bg-bg-card p-5 space-y-4">
          <p className="text-sm font-semibold text-text-primary">{editId ? "Edit Challenge" : "New Challenge"}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date + subject */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-text-muted mb-1.5">Active Date *</p>
                <input
                  type="date"
                  required
                  value={form.active_date}
                  onChange={e => setForm(p => ({ ...p, active_date: e.target.value }))}
                  className="w-full bg-bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1.5">Subject (optional)</p>
                <select
                  value={form.subject_id}
                  onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}
                  className="w-full bg-bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
                >
                  <option value="">General</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Question */}
            <div>
              <p className="text-xs text-text-muted mb-1.5">Question *</p>
              <textarea
                required
                rows={3}
                placeholder="What is the time complexity of binary search?"
                value={form.question_text}
                onChange={e => setForm(p => ({ ...p, question_text: e.target.value }))}
                className="w-full bg-bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 resize-none transition-colors"
              />
            </div>

            {/* Options */}
            <div>
              <p className="text-xs text-text-muted mb-1.5">Options (mark correct with radio) *</p>
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="correct"
                      checked={form.correct_option === i}
                      onChange={() => setForm(p => ({ ...p, correct_option: i }))}
                      className="accent-emerald-500 shrink-0"
                    />
                    <input
                      required
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      value={opt}
                      onChange={e => {
                        const opts = [...form.options];
                        opts[i] = e.target.value;
                        setForm(p => ({ ...p, options: opts }));
                      }}
                      className="flex-1 bg-bg-elevated border border-border rounded-xl px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                    />
                    {form.correct_option === i && (
                      <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation + reward */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-text-muted mb-1.5">Explanation (shown after attempt)</p>
                <textarea
                  rows={2}
                  placeholder="Why is this the correct answer..."
                  value={form.explanation}
                  onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))}
                  className="w-full bg-bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 resize-none transition-colors"
                />
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1.5">Coin Reward</p>
                <input
                  type="number"
                  min={1}
                  value={form.coin_reward}
                  onChange={e => setForm(p => ({ ...p, coin_reward: e.target.value }))}
                  className="w-full bg-bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Zap size={14} />}
                {editId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditId(null); setForm(BLANK_FORM); }}
                className="px-5 py-2.5 rounded-xl border border-border text-text-muted hover:text-text-primary text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Challenge list */}
      <motion.div {...fadeUp(0.1)} className="rounded-2xl border border-border bg-bg-card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border/50">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse bg-bg-elevated/20" />)}
          </div>
        ) : challenges.length === 0 ? (
          <div className="py-16 text-center text-text-muted text-sm">
            <Zap size={24} className="mx-auto mb-3 opacity-20" />
            No challenges yet. Create one for tomorrow!
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {challenges.map(c => {
              const isToday = c.active_date === today;
              const isPast  = c.active_date < today;
              return (
                <div key={c.id} className={`px-5 py-4 ${isToday ? "bg-amber-500/3" : ""}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isToday ? "bg-amber-500/15 text-amber-400" : isPast ? "bg-bg-elevated text-text-muted" : "bg-blue-500/10 text-blue-400"}`}>
                          {isToday ? "Today" : c.active_date}
                        </span>
                        {c.subjects && (
                          <span className="text-xs text-text-muted">{c.subjects.code}</span>
                        )}
                        <span className="text-xs text-amber-400">+{c.coin_reward} 🪙</span>
                      </div>
                      <p className="text-sm font-medium text-text-primary truncate">{c.question_text}</p>
                      <div className="flex gap-2 mt-1">
                        {c.options.map((o, i) => (
                          <span key={i} className={`text-xs px-2 py-0.5 rounded-md ${i === c.correct_option ? "bg-emerald-500/10 text-emerald-400 font-semibold" : "text-text-muted"}`}>
                            {String.fromCharCode(65 + i)}: {o}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isPast && (
                        <button onClick={() => handleEdit(c)} className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors">
                          <Edit2 size={13} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
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
