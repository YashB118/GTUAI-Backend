"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Trash2, RotateCw, Sliders } from "lucide-react";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  code: string | null;
}

interface Weights {
  frequency: number;
  recency: number;
  consecutive: number;
  marks: number;
}

const DEFAULT_WEIGHTS: Weights = {
  frequency: 40,
  recency: 30,
  consecutive: 20,
  marks: 10,
};

export default function SettingsPage() {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [original, setOriginal] = useState<Weights>(DEFAULT_WEIGHTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [cacheSubject, setCacheSubject] = useState("");
  const [rescoreSubject, setRescoreSubject] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [w, subs] = await Promise.all([
      api.get("/admin/predictions/weights").catch(() => DEFAULT_WEIGHTS),
      api.get("/subjects").catch(() => []),
    ]);
    setWeights(w);
    setOriginal(w);
    setSubjects(Array.isArray(subs) ? subs : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const dirty = JSON.stringify(weights) !== JSON.stringify(original);
  const sum = weights.frequency + weights.recency + weights.consecutive + weights.marks;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.put("/admin/predictions/weights", weights);
      setOriginal(updated);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
      toast.success("Prediction weights saved!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  };

  const handleClearCache = async () => {
    setBusy("cache");
    try {
      const path = cacheSubject ? `/admin/predictions/clear-cache?subject_id=${cacheSubject}` : "/admin/predictions/clear-cache";
      const res = await api.post(path, {});
      toast.success(`Cleared ${res?.cleared ?? 0} prediction cache entries.`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Clear cache failed");
    }
    setBusy(null);
  };

  const handleRescore = async () => {
    if (!rescoreSubject) return;
    setBusy("rescore");
    try {
      const res = await api.post(`/admin/predictions/rescore/${rescoreSubject}`, {});
      toast.success(`Re-scored ${res?.updated ?? 0} patterns.`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Re-score failed");
    }
    setBusy(null);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <p className="section-title">Config</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary mt-2">Settings</h1>
        </div>
        <LoadingSkeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <p className="section-title">Config</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary mt-2">Settings</h1>
        <p className="text-[13.5px] text-text-secondary mt-1">Tune AI prediction weights and platform behavior.</p>
      </div>

      {/* Prediction weights */}
      <div className="card overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Sliders size={14} className="text-accent" />
            </div>
            <h2 className="text-[14px] font-semibold text-text-primary">Prediction Scoring Weights</h2>
          </div>
          <span className={`text-xs ${Math.abs(sum - 100) < 0.1 ? "text-text-muted" : "text-amber-400"}`}>
            Sum: {sum.toFixed(1)} {Math.abs(sum - 100) < 0.1 ? "(balanced)" : "(non-100)"}
          </span>
        </div>
        <div className="px-5 py-5 space-y-5">
          <p className="text-xs text-text-secondary">
            Adjust how each factor contributes to a question pattern&apos;s prediction score (max 100).
            Saved changes apply to future re-scores; existing cached predictions need a manual cache clear.
          </p>

          <Slider
            label="Frequency"
            description="How often the question recurs across past papers"
            value={weights.frequency}
            onChange={v => setWeights(w => ({ ...w, frequency: v }))}
          />
          <Slider
            label="Recency / Gap"
            description="Time since last appearance — long gaps boost likelihood"
            value={weights.recency}
            onChange={v => setWeights(w => ({ ...w, recency: v }))}
          />
          <Slider
            label="Consecutive streak"
            description="Bonus for back-to-back appearance years"
            value={weights.consecutive}
            onChange={v => setWeights(w => ({ ...w, consecutive: v }))}
          />
          <Slider
            label="Marks weight"
            description="Higher-mark questions weighted more heavily"
            value={weights.marks}
            onChange={v => setWeights(w => ({ ...w, marks: v }))}
          />

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setWeights(DEFAULT_WEIGHTS)}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Reset to defaults
            </button>
            <div className="flex items-center gap-3">
              {savedFlash && <span className="text-xs text-emerald-400">Saved</span>}
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="btn-primary"
              >
                <Save size={13} />
                {saving ? "Saving…" : "Save weights"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cache controls */}
      <div className="bg-bg-card border border-border rounded-xl">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <RotateCw size={14} className="text-amber-400" />
          <h2 className="text-sm font-semibold text-text-primary">Prediction Cache</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs text-text-muted block mb-1">Clear cache for…</label>
              <select
                value={cacheSubject}
                onChange={e => setCacheSubject(e.target.value)}
                className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary appearance-none focus:outline-none focus:border-accent"
              >
                <option value="">All subjects</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleClearCache}
              disabled={busy === "cache"}
              className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg px-3 py-2 text-xs font-medium transition-all disabled:opacity-50"
            >
              <Trash2 size={11} />
              Clear cache
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-border/50">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs text-text-muted block mb-1">Re-score patterns for subject</label>
              <select
                value={rescoreSubject}
                onChange={e => setRescoreSubject(e.target.value)}
                className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary appearance-none focus:outline-none focus:border-accent"
              >
                <option value="">Choose subject…</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleRescore}
              disabled={!rescoreSubject || busy === "rescore"}
              className="flex items-center gap-1.5 bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent rounded-lg px-3 py-2 text-xs font-medium transition-all disabled:opacity-50"
            >
              <RotateCw size={11} />
              Re-score
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function Slider({
  label, description, value, onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <span className="text-sm text-text-primary font-medium">{label}</span>
          <p className="text-xs text-text-muted">{description}</p>
        </div>
        <span className="text-sm font-mono text-accent font-semibold tabular-nums">{value.toFixed(0)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}

