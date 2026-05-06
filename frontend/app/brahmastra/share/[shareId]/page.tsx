"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Flame, Zap, Eye, Swords, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { getBrahmastraByShareId } from "@/lib/api";

interface BrahmastraQuestion {
  text: string;
  confidence: number;
  tier: "certain" | "likely" | "watch";
  marks: number;
  unit: number | null;
  question_type: string;
  last_asked: number | null;
  years_gap: number;
  is_due: boolean;
  reasoning: string;
}

interface BrahmastraBrief {
  subject_name: string;
  subject_code: string | null;
  branch: string | null;
  semester: number | null;
  paper_count: number;
  summary: string;
  certain: BrahmastraQuestion[];
  likely: BrahmastraQuestion[];
  watch: BrahmastraQuestion[];
  due_count: number;
}

function DueBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider
      bg-red-500/15 text-red-400 border border-red-500/30 uppercase">
      DUE
    </span>
  );
}

function ReadonlyQuestionCard({ q }: { q: BrahmastraQuestion }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = q.text.length > 120;

  return (
    <div className="rounded-xl bg-bg-card border border-border p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm text-text-primary leading-relaxed flex-1 ${!expanded && isLong ? "line-clamp-2" : ""}`}>
          {q.text}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          {q.is_due && <DueBadge />}
          <span className="text-xs font-semibold text-text-muted">{q.confidence}%</span>
        </div>
      </div>
      {isLong && (
        <button onClick={() => setExpanded(v => !v)}
          className="text-[11px] text-text-muted flex items-center gap-0.5">
          {expanded ? <><ChevronUp size={11} /> Less</> : <><ChevronDown size={11} /> More</>}
        </button>
      )}
      <div className="flex flex-wrap gap-x-3 text-[11px] text-text-muted">
        {q.unit != null && <span>Unit {q.unit}</span>}
        <span>{q.marks}M</span>
        {q.last_asked && <span>Last {q.last_asked}</span>}
        {q.is_due && q.last_asked && <span className="text-red-400/80">{q.years_gap}yr gap</span>}
      </div>
    </div>
  );
}

function TierBlock({ tier, questions }: { tier: "certain" | "likely" | "watch"; questions: BrahmastraQuestion[] }) {
  const [open, setOpen] = useState(true);
  if (!questions.length) return null;

  const cfg = {
    certain: { icon: <Flame size={14} className="text-orange-400" />, label: "Almost Certain", border: "border-orange-500/20", bg: "bg-orange-500/5" },
    likely:  { icon: <Zap size={14}  className="text-sky-400"    />, label: "Highly Likely",  border: "border-sky-500/20",    bg: "bg-sky-500/5"    },
    watch:   { icon: <Eye size={14}  className="text-violet-400" />, label: "Watch Out",       border: "border-violet-500/20", bg: "bg-violet-500/5" },
  } as const;

  const c = cfg[tier];
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden`}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2">
          {c.icon}
          <span className="text-sm font-semibold text-text-primary">{c.label}</span>
          <span className="text-[11px] text-text-muted">({questions.length})</span>
        </div>
        {open ? <ChevronUp size={13} className="text-text-muted" /> : <ChevronDown size={13} className="text-text-muted" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2.5">
          {questions.map((q, i) => <ReadonlyQuestionCard key={i} q={q} />)}
        </div>
      )}
    </div>
  );
}

export default function SharePage() {
  const params = useParams();
  const shareId = params.shareId as string;

  const [brief, setBrief] = useState<BrahmastraBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getBrahmastraByShareId(shareId)
      .then(setBrief)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="animate-pulse space-y-3 w-full max-w-md px-6">
          <div className="h-8 bg-bg-elevated rounded w-1/2" />
          <div className="h-24 bg-bg-elevated rounded-xl" />
          <div className="h-40 bg-bg-elevated rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <div className="text-4xl">⚔️</div>
          <p className="text-text-primary font-medium">This brief has expired or doesn&apos;t exist.</p>
          <Link href="/" className="text-sm text-accent hover:underline">
            Go to GTU ExamAI →
          </Link>
        </div>
      </div>
    );
  }

  const total = brief.certain.length + brief.likely.length + brief.watch.length;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Signup CTA banner */}
      <div className="sticky top-0 z-10 bg-orange-500/10 border-b border-orange-500/20 px-4 py-2.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <p className="text-xs text-orange-300/90 font-medium">
            ⚔️ Get Brahmastra for your own subject
          </p>
          <Link
            href="/register"
            className="flex items-center gap-1 text-xs font-semibold text-orange-400
              hover:text-orange-300 transition-colors whitespace-nowrap"
          >
            Sign Up Free <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Swords size={18} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Brahmastra</h1>
            <p className="text-sm text-text-muted">{brief.subject_name}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-text-muted">
          {brief.branch && <span>{brief.branch}</span>}
          {brief.semester && <span>Sem {brief.semester}</span>}
          <span>{brief.paper_count} papers</span>
          <span>{total} predictions</span>
          {brief.due_count > 0 && <span className="text-red-400">{brief.due_count} overdue</span>}
          <span className="text-amber-400/70">Shared • Read-only</span>
        </div>

        {/* Professor note */}
        {brief.summary && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4 space-y-1">
            <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider">
              Professor&apos;s Note
            </p>
            <p className="text-sm text-text-secondary leading-relaxed">{brief.summary}</p>
          </div>
        )}

        {/* Tiers */}
        <div className="space-y-3">
          <TierBlock tier="certain" questions={brief.certain} />
          <TierBlock tier="likely"  questions={brief.likely}  />
          <TierBlock tier="watch"   questions={brief.watch}   />
        </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 text-center space-y-3">
          <div className="text-2xl">⚔️</div>
          <p className="font-semibold text-text-primary">Get Brahmastra for your subject</p>
          <p className="text-sm text-text-muted">
            AI-powered exam predictions from 8+ years of GTU past papers.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400
              text-white text-sm font-semibold transition-colors"
          >
            Sign Up Free <ArrowRight size={14} />
          </Link>
        </div>

        <p className="text-center text-[11px] text-text-muted pb-4">
          Brahmastra analyzes historical GTU patterns — always study the full syllabus.
        </p>
      </div>
    </div>
  );
}
