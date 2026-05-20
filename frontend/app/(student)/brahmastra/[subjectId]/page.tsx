"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Swords, RefreshCw, ArrowLeft, BookOpen,
  Copy, Check, X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";
import { toast } from "sonner";
// import { notifyCoinsEarned } from "@/lib/coinEvents";  // coins disabled
import DiagramBlock from "@/components/shared/DiagramBlock";
import { captureEvent } from "@/lib/posthog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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
  pattern_id: string | null;
}

interface BrahmastraBrief {
  subject_id: string;
  subject_name: string;
  subject_code: string | null;
  branch: string | null;
  semester: number | null;
  share_id: string;
  paper_count: number;
  summary: string;
  certain: BrahmastraQuestion[];
  likely: BrahmastraQuestion[];
  watch: BrahmastraQuestion[];
  due_count: number;
  from_cache: boolean;
}

interface AnswerData {
  text: string;
  sources: string[];
  expectedQuestionFormat?: string | null;
  howToWrite?: string | null;
  readyToWriteAnswer?: string | null;
}

interface DiagramData {
  engine: "mermaid" | "graphviz" | "ascii";
  dsl: string;
  fallback_ascii: string;
  svg?: string | null;
  diagram_type: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getFireEmoji(confidence: number): string {
  if (confidence >= 78) return "🔥🔥🔥";
  if (confidence >= 55) return "🔥🔥";
  return "🔥";
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 78) return "text-orange-400";
  if (confidence >= 55) return "text-sky-400";
  return "text-violet-400";
}

// ---------------------------------------------------------------------------
// Full-screen Answer Sheet
// ---------------------------------------------------------------------------
function AnswerSheet({
  question,
  subjectId,
  onClose,
}: {
  question: BrahmastraQuestion;
  subjectId: string;
  onClose: () => void;
}) {
  const [answer, setAnswer]             = useState<AnswerData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [copied, setCopied]             = useState(false);
  const [diagram, setDiagram]           = useState<DiagramData | null>(null);
  const [diagramLoading, setDiagramLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Run answer generation + diagram type detection in parallel
      const [answerResult, detectResult] = await Promise.allSettled([
        api.post("/answers/generate", {
          question_text: question.text,
          subject_id:    subjectId,
          marks:         question.marks || 7,
          pattern_id:    question.pattern_id || null,
        }),
        api.get(`/diagrams/detect-type?question=${encodeURIComponent(question.text)}`),
      ]);

      if (cancelled) return;

      if (answerResult.status === "rejected") {
        const e = answerResult.reason;
        toast.error(e instanceof Error ? e.message : "Answer generate nahi hua");
        onClose();
        return;
      }

      const data = answerResult.value;
      setAnswer({
        text:                   data.answer || data.text || "",
        sources:                data.source_titles || data.sources || [],
        expectedQuestionFormat: data.expected_question_format,
        howToWrite:             data.how_to_write,
        readyToWriteAnswer:     data.ready_to_write_answer,
      });
      setLoading(false);
      captureEvent("answer_generated", {
        source: "brahmastra",
        subject_id: subjectId,
        marks: question.marks || 7,
        tier: question.tier,
        confidence: question.confidence,
        pattern_id: question.pattern_id,
        is_fallback: Boolean(data.is_fallback),
      });

      // Always generate diagram — use detected type if available, else "block"
      const diagramType =
        detectResult.status === "fulfilled"
          ? detectResult.value.diagram_type || "block"
          : "block";
      setDiagramLoading(true);
      try {
        const diagramData = await api.post("/diagrams/generate", {
          question_text: question.text,
          subject_id:    subjectId,
          diagram_type:  diagramType,
          render_server: false,
        });
        if (!cancelled) setDiagram(diagramData);
      } catch {
        // silent — diagram is supplementary, not critical
      } finally {
        if (!cancelled) setDiagramLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [question, subjectId, onClose]);

  const handleCopy = async () => {
    if (!answer) return;
    const text = [
      `Question: ${question.text}`,
      answer.expectedQuestionFormat ? `\nExpected Format:\n${answer.expectedQuestionFormat}` : "",
      answer.howToWrite ? `\nHow to Write:\n${answer.howToWrite}` : "",
      `\nAnswer:\n${answer.readyToWriteAnswer || answer.text}`,
    ].join("").trim();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Answer copied!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg-primary flex flex-col animate-slide-up">

      {/* ── Sticky header ── */}
      <div className="shrink-0 border-b border-border bg-bg-card px-4 py-4">
        <div className="flex items-start gap-3 max-w-3xl mx-auto">
          <div className="flex-1 min-w-0">
            {/* Meta row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-lg">{getFireEmoji(question.confidence)}</span>
              <span className={`text-sm font-bold ${getConfidenceColor(question.confidence)}`}>
                {question.confidence}%
              </span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">{question.marks} Marks</span>
              {question.unit != null && (
                <>
                  <span className="text-xs text-text-muted">·</span>
                  <span className="text-xs text-text-muted">Unit {question.unit}</span>
                </>
              )}
              {question.is_due && (
                <span className="text-[11px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/25">
                  Baasi Hai
                </span>
              )}
            </div>
            {/* Question text */}
            <p className="text-base font-semibold text-text-primary leading-snug">
              {question.text}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 rounded-xl hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Scrollable answer body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {/* Skeleton */}
              <div className="space-y-2">
                <div className="h-3 bg-bg-elevated rounded w-1/3" />
                <div className="h-4 bg-bg-elevated rounded w-full" />
                <div className="h-4 bg-bg-elevated rounded w-4/5" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-bg-elevated rounded w-1/4" />
                <div className="h-4 bg-bg-elevated rounded w-full" />
                <div className="h-4 bg-bg-elevated rounded w-3/4" />
                <div className="h-4 bg-bg-elevated rounded w-full" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-bg-elevated rounded w-1/4" />
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 bg-bg-elevated rounded" style={{ width: `${90 - i * 5}%` }} />
                ))}
              </div>
              <p className="text-center text-sm text-text-muted pt-4">
                AI answer generate ho raha hai... 🔄
              </p>
            </div>
          ) : answer ? (
            <>
              {/* Section: Expected Format */}
              {answer.expectedQuestionFormat && (
                <div className="rounded-2xl border border-border bg-bg-card p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2.5">
                    📋 Expected Format
                  </p>
                  <p className="text-base text-text-secondary leading-relaxed">
                    {answer.expectedQuestionFormat}
                  </p>
                </div>
              )}

              {/* Section: How to Write */}
              {answer.howToWrite && (
                <div className="rounded-2xl border border-border bg-bg-card p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2.5">
                    ✍️ Kaise Likhna Hai
                  </p>
                  <p className="text-base text-text-secondary leading-relaxed">
                    {answer.howToWrite}
                  </p>
                </div>
              )}

              {/* Section: Full Answer */}
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/4 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-400/80 mb-4">
                  ⚔️ Full Answer — Copy karo, yaad karo
                </p>
                <div className="prose prose-invert max-w-none text-text-primary leading-relaxed text-base
                  [&_strong]:text-text-primary [&_strong]:font-semibold
                  [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-text-primary [&_h1]:mt-4 [&_h1]:mb-2
                  [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-text-primary [&_h2]:mt-3 [&_h2]:mb-1.5
                  [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-text-primary [&_h3]:mt-2 [&_h3]:mb-1
                  [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-1 [&_li]:text-text-secondary
                  [&_p]:my-2 [&_p]:text-text-secondary
                  [&_code]:bg-bg-elevated [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
                  [&_pre]:bg-bg-elevated [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:text-sm
                  [&_blockquote]:border-l-2 [&_blockquote]:border-blue-500/40 [&_blockquote]:pl-4 [&_blockquote]:text-text-muted
                  [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:text-left">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {answer.readyToWriteAnswer || answer.text}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Section: Diagram */}
              {diagramLoading && (
                <div className="rounded-2xl border border-purple-500/20 bg-purple-500/4 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-purple-400/80 mb-4">
                    📐 Diagram
                  </p>
                  <div className="animate-pulse space-y-2">
                    <div className="h-32 bg-bg-elevated rounded-lg" />
                    <p className="text-xs text-text-muted text-center pt-1">Diagram generate ho raha hai...</p>
                  </div>
                </div>
              )}
              {diagram && !diagramLoading && (
                <div className="rounded-2xl border border-purple-500/20 bg-purple-500/4 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-purple-400/80 mb-4">
                    📐 Diagram Reference
                  </p>
                  <DiagramBlock
                    engine={diagram.engine}
                    dsl={diagram.dsl}
                    fallbackAscii={diagram.fallback_ascii}
                    svgData={diagram.svg}
                    diagramType={diagram.diagram_type}
                    title={question.text.length > 60 ? question.text.slice(0, 60) + "…" : question.text}
                  />
                </div>
              )}

              {/* Sources */}
              {answer.sources.length > 0 && (
                <div className="rounded-xl border border-border bg-bg-card p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2.5">
                    📚 Sources Used
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {answer.sources.map((src, i) => (
                      <span key={i} className="text-xs text-text-muted bg-bg-elevated border border-border rounded-lg px-2.5 py-1.5">
                        📄 {src}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* ── Sticky footer ── */}
      <div className="shrink-0 border-t border-border bg-bg-card px-4 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors px-3 py-2"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex-1" />
          {!loading && answer && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 transition-colors text-white text-sm font-semibold"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Answer Copy Karo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function BrahmastraPage() {
  const params    = useParams();
  const router    = useRouter();
  const subjectId = params.subjectId as string;

  const [brief, setBrief]     = useState<BrahmastraBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [studyQ, setStudyQ]   = useState<BrahmastraQuestion | null>(null);
  // const [gateBlocked, setGateBlocked] = useState(false);  // coins disabled
  // const [gateMsg, setGateMsg]         = useState("");      // coins disabled

  // Done tracking via localStorage
  const [done, setDone] = useState<Set<number>>(new Set());
  useEffect(() => {
    const saved = localStorage.getItem(`brahmastra_done_${subjectId}`);
    if (saved) setDone(new Set(JSON.parse(saved)));
  }, [subjectId]);

  const toggleDone = (i: number) => {
    setDone(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      localStorage.setItem(`brahmastra_done_${subjectId}`, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const load = useCallback(async (forceRefresh = false) => {
    try {
      /* coins disabled — gate check removed
      const gate = await api.post("/coins/gate", { feature: "brahmastra" });
      if (!gate.allowed) {
        setGateBlocked(true);
        setGateMsg(gate.reason || "Aaj ke 3 Brahmastra uses khatam ho gaye");
        return;
      }
      notifyCoinsEarned(gate.balance);
      toast.info(`-${gate.coins_spent} coins · ${gate.remaining} uses remaining today`);
      */

      const data = await api.getBrahmastraBrief(subjectId, forceRefresh);
      setBrief(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Brief load nahi hua");
    }
  }, [subjectId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
    toast.success("Brahmastra refresh ho gaya");
  };

  const top7 = useMemo(() => {
    if (!brief) return [];
    return [
      ...brief.certain,
      ...brief.likely,
      ...brief.watch,
    ]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 7);
  }, [brief]);

  const doneCount  = Array.from(done).filter(i => i < top7.length).length;
  const totalCount = top7.length;

  const handleWhatsAppShare = async () => {
    if (!brief) return;
    const lines = [
      `⚔️ Brahmastra — ${brief.subject_name}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      ...top7.map(q => `${getFireEmoji(q.confidence)} ${q.text.slice(0, 65)}${q.text.length > 65 ? "..." : ""}`),
      ``,
      `Andaza — Sirf wahi jo aayega.`,
      `${window.location.origin}/brahmastra/share/${brief.share_id}`,
    ].join("\n");
    await navigator.clipboard.writeText(lines);
    toast.success("WhatsApp message copy ho gaya 🔥");
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 animate-pulse">
        <div className="h-7 bg-bg-elevated rounded w-2/5" />
        <div className="h-5 bg-bg-elevated rounded w-3/5" />
        <div className="h-24 bg-bg-elevated rounded-2xl" />
        <div className="h-[420px] bg-bg-elevated rounded-2xl" />
      </div>
    );
  }

  /* coins disabled — gate blocked UI removed
  if (gateBlocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center max-w-sm space-y-4">
          <div className="text-5xl">🔒</div>
          <p className="text-lg font-semibold text-text-primary">Daily limit reached</p>
          <p className="text-sm text-text-muted">{gateMsg}</p>
          <p className="text-xs text-text-muted">Kal subah reset ho jayega · Coins earn karo daily challenge se</p>
          <button onClick={() => router.push("/dashboard")} className="text-sm text-blue-400 hover:underline">
            Dashboard pe wapas jao →
          </button>
        </div>
      </div>
    );
  }
  */

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center max-w-sm space-y-4">
          <div className="text-5xl">⚔️</div>
          <p className="text-lg font-semibold text-text-primary">Brahmastra activate nahi hua</p>
          <p className="text-sm text-text-muted">{error}</p>
          <button onClick={() => router.push("/predict")} className="text-sm text-blue-400 hover:underline">
            Pehle past papers upload karo →
          </button>
        </div>
      </div>
    );
  }

  if (!brief) return null;

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-4 pb-10">

        {/* ── Back ── */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Swords size={20} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Brahmastra</h1>
              <p className="text-base text-text-muted">{brief.subject_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-border hover:bg-bg-elevated text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366]/15 border border-[#25D366]/25 text-[#25D366] text-sm font-semibold hover:bg-[#25D366]/20 transition-colors"
            >
              📲 Share
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
          {brief.branch && <span>{brief.branch}</span>}
          {brief.semester && <span>Sem {brief.semester}</span>}
          <span>{brief.paper_count} papers analyzed</span>
          {brief.due_count > 0 && <span className="text-red-400">{brief.due_count} overdue ⚠️</span>}
          {brief.from_cache && <span className="opacity-60 text-xs">cached</span>}
        </div>

        {/* ── Professor's Note ── */}
        {brief.summary && (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/6 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400/80 mb-2">
              Professor ki note 📝
            </p>
            <p className="text-base text-text-secondary leading-relaxed">{brief.summary}</p>
          </div>
        )}

        {/* ── Progress bar ── */}
        {totalCount > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / totalCount) * 100}%` }}
              />
            </div>
            <span className="text-sm text-text-muted shrink-0">
              {doneCount}/{totalCount} padha {doneCount === totalCount && totalCount > 0 ? "✅" : ""}
            </span>
          </div>
        )}

        {/* ── Question cards ── */}
        {totalCount === 0 ? (
          <div className="rounded-2xl border border-border bg-bg-card p-10 text-center space-y-2">
            <p className="text-base text-text-muted">Predictions abhi tak nahi mili.</p>
            <p className="text-sm text-text-muted">Zyada past papers upload karo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {top7.map((q, i) => {
              const isDone = done.has(i);
              return (
                <div
                  key={i}
                  className={`rounded-2xl border px-5 py-4 transition-all ${
                    isDone
                      ? "border-border/40 bg-bg-elevated/50 opacity-55"
                      : i === 0
                        ? "border-blue-500/30 bg-blue-500/5"
                        : "border-border bg-bg-card"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Done checkbox */}
                    <button
                      onClick={() => toggleDone(i)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isDone
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-border hover:border-blue-500/60"
                      }`}
                    >
                      {isDone && <span className="text-[10px] font-bold">✓</span>}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Question + fire */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className={`text-base leading-snug ${isDone ? "line-through text-text-muted" : "text-text-primary font-medium"}`}>
                          {q.text}
                        </p>
                        <span className="text-xl shrink-0">{getFireEmoji(q.confidence)}</span>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
                        {q.unit != null && <span>Unit {q.unit}</span>}
                        <span>{q.marks}M</span>
                        <span className="capitalize">{q.question_type}</span>
                        {q.last_asked ? <span>Last {q.last_asked}</span> : <span>First time</span>}
                        <span className={`font-bold ${getConfidenceColor(q.confidence)}`}>{q.confidence}%</span>
                        {q.is_due && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-bold uppercase bg-red-500/15 text-red-400 border border-red-500/25">
                            Baasi Hai
                          </span>
                        )}
                      </div>

                      {/* Reasoning */}
                      {q.reasoning && (
                        <p className="text-sm text-text-muted/70 italic mt-1.5 border-l-2 border-border pl-2.5">
                          {q.reasoning}
                        </p>
                      )}

                      {/* Study button */}
                      {!isDone && (
                        <button
                          onClick={() => setStudyQ(q)}
                          className="flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/15 transition-colors"
                        >
                          <BookOpen size={14} />
                          Iska Answer Dekho →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-sm text-text-muted italic pt-2">
          Sirf wahi jo aayega. Pura syllabus bhi padho.
        </p>
      </div>

      {/* Full-screen answer sheet */}
      {studyQ && (
        <AnswerSheet
          question={studyQ}
          subjectId={subjectId}
          onClose={() => setStudyQ(null)}
        />
      )}
    </>
  );
}
