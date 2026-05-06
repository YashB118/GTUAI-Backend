"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles, RefreshCw, ChevronDown, Upload,
  FileText, X, Plus, ChevronUp, BookOpen, Copy, Check, Printer,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { notifyCoinsEarned } from "@/lib/coinEvents";
import { ProcessingStatus } from "@/components/shared/ProcessingStatus";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  code: string;
  branch: string;
  semester: number;
}

interface Prediction {
  pattern_id: string;
  question: string;
  prediction_score: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  times_asked: number;
  years_asked: number[];
  last_asked: number | null;
  expected_marks: number | null;
  unit: number | null;
  question_type: string | null;
  answer: string | null;
}

type PaperStatus = "idle" | "queued" | "processing" | "done" | "failed";

const EXAM_TYPES = [
  { value: "winter", label: "Winter" },
  { value: "summer", label: "Summer" },
  { value: "mid", label: "Mid Semester" },
  { value: "internal", label: "Internal" },
];
const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

const CONF_BORDER = {
  HIGH:   "border-l-[3px] border-l-emerald-500",
  MEDIUM: "border-l-[3px] border-l-amber-500",
  LOW:    "border-l-[3px] border-l-red-500/70",
};
const CONF_DOT = {
  HIGH:   "bg-emerald-500",
  MEDIUM: "bg-amber-500",
  LOW:    "bg-red-500/70",
};
const CONF_TEXT = {
  HIGH:   "text-emerald-400",
  MEDIUM: "text-amber-400",
  LOW:    "text-red-400",
};
const CONF_BAR_COLOR = {
  HIGH:   "bg-emerald-500",
  MEDIUM: "bg-amber-500",
  LOW:    "bg-red-500/70",
};

interface AnswerPayload {
  text: string;
  sources: string[];
  expectedQuestionFormat?: string | null;
  howToWrite?: string | null;
  readyToWriteAnswer?: string | null;
  codeExample?: string | null;
}

function groupByUnit(predictions: Prediction[]): [string, Prediction[]][] {
  const map: Record<string, Prediction[]> = {};
  for (const p of predictions) {
    const key = p.unit != null ? `Unit ${p.unit}` : "General";
    if (!map[key]) map[key] = [];
    map[key].push(p);
  }
  return Object.entries(map).sort(([a], [b]) => {
    if (a === "General") return 1;
    if (b === "General") return -1;
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

function PredictInner() {
  const searchParams = useSearchParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [paperCount, setPaperCount] = useState(0);
  const [sources, setSources] = useState<string[]>([]);

  // Upload panel
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [examType, setExamType] = useState("winter");
  const [uploading, setUploading] = useState(false);
  const [paperId, setPaperId] = useState<string | null>(null);
  const [paperStatus, setPaperStatus] = useState<PaperStatus>("idle");
  const [questionCount, setQuestionCount] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const paperStatusRef = useRef<PaperStatus>("idle");
  const selectedSubjectIdRef = useRef<string | null>(null);

  // Answer modal
  const [modalPrediction, setModalPrediction] = useState<Prediction | null>(null);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [modalAnswer, setModalAnswer] = useState<AnswerPayload | null>(null);
  const [copied, setCopied] = useState(false);
  const answersCache = useRef<Record<string, AnswerPayload>>({});

  const openModal = async (p: Prediction) => {
    setModalPrediction(p);
    setCopied(false);

    // Only use cache for questions with a real pattern_id.
    // LLM-generated predictions have pattern_id=null — they all map to the
    // same JS key ("null") and would collide, showing the first answer for all.
    if (p.pattern_id && answersCache.current[p.pattern_id]) {
      setModalAnswer(answersCache.current[p.pattern_id]);
      return;
    }

    setModalAnswer(null);
    setAnswerLoading(true);
    // Capture which question this load is for so a stale response from a
    // previous click can't overwrite the answer for the currently open question.
    const loadKey = p.pattern_id ?? p.question;
    try {
      const data = await api.post("/answers/generate", {
        question_text: p.question,
        subject_id: selectedSubjectId,
        marks: p.expected_marks ?? 7,
        pattern_id: p.pattern_id,
      });
      const payload: AnswerPayload = {
        text: data.answer || "No answer available.",
        sources: data.sources || [],
        expectedQuestionFormat: data.expected_question_format || null,
        howToWrite: data.how_to_write || null,
        readyToWriteAnswer: data.ready_to_write_answer || null,
        codeExample: data.code_example || null,
      };
      if (p.pattern_id) answersCache.current[p.pattern_id] = payload;
      // Only update state if the modal is still showing this question
      setModalPrediction(cur => {
        if (!cur) return cur;
        const curKey = cur.pattern_id ?? cur.question;
        if (curKey === loadKey) setModalAnswer(payload);
        return cur;
      });
    } catch {
      setModalPrediction(cur => {
        if (!cur) return cur;
        const curKey = cur.pattern_id ?? cur.question;
        if (curKey === loadKey) setModalAnswer({ text: "Failed to generate answer. Please try again.", sources: [] });
        return cur;
      });
    } finally {
      setModalPrediction(cur => {
        if (!cur) return cur;
        const curKey = cur.pattern_id ?? cur.question;
        if (curKey === loadKey) setAnswerLoading(false);
        return cur;
      });
    }
  };

  const closeModal = () => {
    setModalPrediction(null);
    setModalAnswer(null);
    setAnswerLoading(false);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!modalAnswer) return;
    await navigator.clipboard.writeText(modalAnswer.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // PDF download — uses browser print with a dedicated print view
  const handleDownloadPDF = () => {
    if (!selectedSubject || predictions.length === 0) return;
    const units = groupByUnit(predictions);
    let qNum = 0;
    const rows = units.flatMap(([unitLabel, qs]) => [
      `<tr><td colspan="4" style="background:#f5f5f5;font-weight:600;padding:6px 10px;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;">${unitLabel}</td></tr>`,
      ...qs.map(q => {
        qNum++;
        return `<tr style="border-bottom:1px solid #eee;">
          <td style="padding:6px 10px;font-size:11px;color:#555;white-space:nowrap;">Q${qNum}</td>
          <td style="padding:6px 10px;font-size:12px;">${q.question}</td>
          <td style="padding:6px 10px;font-size:11px;color:#555;white-space:nowrap;">${q.confidence} · ${Math.round(q.prediction_score)}%</td>
          <td style="padding:6px 10px;font-size:11px;color:#555;white-space:nowrap;">${q.expected_marks != null ? `[${q.expected_marks}]` : ""}</td>
        </tr>`;
      }),
    ]);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${selectedSubject.name} — Predicted Questions</title>
      <style>body{font-family:sans-serif;margin:30px}h1{font-size:18px;margin-bottom:4px}p{font-size:12px;color:#666;margin:0 0 16px}table{width:100%;border-collapse:collapse}td{vertical-align:top}@media print{button{display:none}}</style>
    </head><body>
      <h1>${selectedSubject.name}${selectedSubject.code ? ` (${selectedSubject.code})` : ""} — AI Predicted Exam Questions</h1>
      <p>Generated ${new Date().toLocaleDateString()} · ${paperCount} paper${paperCount !== 1 ? "s" : ""} analyzed · ${predictions.length} questions</p>
      <table>${rows.join("")}</table>
      <script>window.onload=()=>window.print()</script>
    </body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("users").select("branch, semester").eq("id", user.id).maybeSingle();
      let url = "/subjects";
      if (profile?.branch) url += `?branch=${encodeURIComponent(profile.branch)}`;
      if (profile?.semester) url += `${profile?.branch ? "&" : "?"}semester=${encodeURIComponent(profile.semester)}`;
      const data = await api.get(url).catch(() => []);
      const subs = Array.isArray(data) ? data : [];
      setSubjects(subs);
      // If URL has ?subject=ID, auto-select it
      const fromUrl = searchParams.get("subject");
      if (fromUrl && subs.some((s: Subject) => s.id === fromUrl)) {
        setSelectedSubjectId(fromUrl);
      }
    }
    load();
  }, [searchParams]);

  const loadPredictions = useCallback(async (subjectId: string, forceRefresh = false) => {
    if (!subjectId) return;
    setLoadingPredictions(true);
    setPredictions([]);
    answersCache.current = {};
    try {
      // Gate check — deduct coins, enforce 10/day limit
      const gate = await api.post("/coins/gate", { feature: "predict" });
      if (!gate.allowed) {
        toast.error(gate.reason || "Aaj ke 10 Andaza uses khatam ho gaye");
        return;
      }
      notifyCoinsEarned(gate.balance);
      toast.info(`-${gate.coins_spent} coins · ${gate.remaining} uses remaining today`);

      const data = await api.get(`/predictions/${subjectId}${forceRefresh ? "?force_refresh=true" : ""}`);
      setPredictions(data.predictions || []);
      setPaperCount(data.paper_count || 0);
      setSources(data.sources || []);
    } catch { setPredictions([]); }
    finally { setLoadingPredictions(false); }
  }, []);

  useEffect(() => {
    if (selectedSubjectId) {
      setSelectedSubject(subjects.find(s => s.id === selectedSubjectId) || null);
      loadPredictions(selectedSubjectId);
    } else {
      setPredictions([]);
      setSelectedSubject(null);
    }
  }, [selectedSubjectId, subjects, loadPredictions]);

  // Keep refs in sync so the interval can read latest values without re-creating
  useEffect(() => { paperStatusRef.current = paperStatus; }, [paperStatus]);
  useEffect(() => { selectedSubjectIdRef.current = selectedSubjectId ?? null; }, [selectedSubjectId]);

  useEffect(() => {
    if (!paperId) return;
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      if (!["queued", "processing"].includes(paperStatusRef.current)) {
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      try {
        const status = await api.get(`/papers/${paperId}/status`);
        const mapped: PaperStatus = status.processing_status === "pending" ? "queued" : status.processing_status;
        setPaperStatus(mapped);
        paperStatusRef.current = mapped;
        if (status.processing_status === "done") {
          setQuestionCount(status.question_count || 0);
          toast.success(`Paper processed — ${status.question_count || 0} questions extracted!`);
          const sid = selectedSubjectIdRef.current;
          if (sid) setTimeout(() => loadPredictions(sid, true), 2000);
        }
        if (status.processing_status === "failed") {
          toast.error("Paper processing failed. Try uploading again.");
        }
        if (["done", "failed"].includes(status.processing_status)) {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [paperId, loadPredictions]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") { toast.error("Only PDF files are allowed."); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error("File must be under 10 MB."); return; }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file || !selectedSubjectId) return;
    setUploading(true);
    setUploadedFileName(file.name);
    const form = new FormData();
    form.append("file", file);
    form.append("subject_id", selectedSubjectId);
    form.append("year", year);
    form.append("exam_type", examType);
    try {
      const res = await api.upload("/papers/upload", form);
      setPaperId(res.paper_id);
      setPaperStatus("queued");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadOpen(false);
      toast.success("Paper uploaded — analyzing questions...");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const high   = predictions.filter(p => p.confidence === "HIGH").length;
  const medium = predictions.filter(p => p.confidence === "MEDIUM").length;
  const low    = predictions.filter(p => p.confidence === "LOW").length;
  const units  = groupByUnit(predictions);

  let qCounter = 0;

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Subject selector */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <select
            value={selectedSubjectId}
            onChange={e => setSelectedSubjectId(e.target.value)}
            style={{ colorScheme: "inherit" }}
            className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary appearance-none pr-8 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 focus:bg-bg-card font-medium transition-all duration-200"
          >
            <option value="">Select a subject to view predictions...</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}{s.code ? ` · ${s.code}` : ""}{s.semester ? ` · Sem ${s.semester}` : ""}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
        {selectedSubjectId && (
          <button
            onClick={() => loadPredictions(selectedSubjectId, true)}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors px-3 py-2.5 rounded-xl card-depth hover:card-depth-hover"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>

      {!selectedSubjectId && (
        <div className="rounded-2xl p-16 text-center card-depth">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 mb-5">
            <BookOpen size={28} className="text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">AI Exam Prediction</h2>
          <p className="text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">
            Select a subject to see questions likely to appear in your next exam, ranked by AI confidence score.
          </p>
        </div>
      )}

      {selectedSubjectId && (
        <>
          {/* Predicted paper */}
          {!loadingPredictions && predictions.length > 0 && (
            <div className="rounded-2xl overflow-hidden card-depth">
              {/* Paper header */}
              <div className="px-6 py-4 border-b border-border"
                style={{ background: "linear-gradient(145deg, rgba(108,99,255,0.06), transparent)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={14} className="text-accent" />
                      <span className="text-xs font-medium text-accent uppercase tracking-wider">AI Predicted Exam Paper</span>
                    </div>
                    <h2 className="text-lg font-semibold text-text-primary">
                      {selectedSubject?.name || "Subject"}
                      {selectedSubject?.code && (
                        <span className="text-text-muted font-normal"> · {selectedSubject.code}</span>
                      )}
                    </h2>
                    {selectedSubject?.semester && (
                      <p className="text-xs text-text-muted mt-0.5">Semester {selectedSubject.semester}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap justify-end">
                      {sources.includes("web") && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">🌐 Web</span>
                      )}
                      {sources.includes("llm_professor") && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">🧠 AI Professor</span>
                      )}
                      {sources.includes("db_patterns") && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent">📊 Patterns</span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mb-2">{paperCount} paper{paperCount !== 1 ? "s" : ""} analyzed</p>
                    <div className="flex items-center gap-3 mb-2">
                      {high > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          <span className="text-xs text-text-secondary">{high} High</span>
                        </div>
                      )}
                      {medium > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                          <span className="text-xs text-text-secondary">{medium} Med</span>
                        </div>
                      )}
                      {low > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500/70 inline-block" />
                          <span className="text-xs text-text-secondary">{low} Low</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleDownloadPDF}
                      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors ml-auto"
                    >
                      <Printer size={12} />
                      <span>Print / Save PDF</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Questions grouped by unit */}
              {units.map(([unitLabel, qs], ui) => (
                <div key={unitLabel}>
                  <div className={`px-6 py-2 flex items-center gap-3 ${ui > 0 ? "border-t border-border" : ""}`}>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                      {unitLabel}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] text-text-muted">{qs.length} question{qs.length !== 1 ? "s" : ""}</span>
                  </div>

                  {qs.map((p) => {
                    qCounter++;
                    const n = qCounter;
                    return (
                      <button
                        key={p.pattern_id}
                        onClick={() => openModal(p)}
                        className={`w-full text-left flex gap-0 border-t border-border/50 hover:bg-bg-elevated transition-colors duration-100 group ${CONF_BORDER[p.confidence]}`}
                      >
                        <div className="shrink-0 w-12 flex items-start justify-center pt-4">
                          <span className="text-xs font-mono text-text-muted">Q{n}</span>
                        </div>
                        <div className="flex-1 py-3.5 pr-5 min-w-0">
                          <p className="text-sm text-text-primary leading-relaxed mb-2">{p.question}</p>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`text-[11px] font-semibold ${CONF_TEXT[p.confidence]} flex items-center gap-1.5`}>
                              <span className="flex items-center gap-1">
                                <span className={`inline-block h-1.5 rounded-full ${CONF_BAR_COLOR[p.confidence]}`} style={{ width: `${Math.max(16, Math.round(p.prediction_score) * 0.4)}px` }} />
                              </span>
                              {p.confidence} · {Math.round(p.prediction_score)}%
                            </span>
                            {p.years_asked.length > 0 && (
                              <span className="text-[11px] text-text-muted">
                                Asked: {p.years_asked.sort().join(", ")}
                              </span>
                            )}
                            {p.question_type && (
                              <span className="text-[11px] text-text-muted capitalize">{p.question_type}</span>
                            )}
                            {(p as unknown as {source?: string; reasoning?: string}).source === "llm_professor" && (
                              <span className="text-[10px] text-violet-400">🧠 AI</span>
                            )}
                            {(p as unknown as {source?: string; reasoning?: string}).source === "web" && (
                              <span className="text-[10px] text-blue-400">🌐 Web</span>
                            )}
                          </div>
                          {(p as unknown as {reasoning?: string}).reasoning && (
                            <p className="text-[11px] text-text-muted/60 mt-1 italic">
                              {(p as unknown as {reasoning?: string}).reasoning}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end justify-between py-3.5 pr-4 gap-2">
                          {p.expected_marks != null && (
                            <span className="text-xs font-mono text-text-muted border border-border rounded px-1.5 py-0.5">
                              [{p.expected_marks}]
                            </span>
                          )}
                          <span className="text-[11px] text-accent opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            View Answer →
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Loading skeleton */}
          {loadingPredictions && (
            <div className="rounded-2xl overflow-hidden card-depth">
              <div className="px-6 py-4 border-b border-border">
                <LoadingSkeleton className="h-5 w-48 rounded" />
                <LoadingSkeleton className="h-3 w-32 rounded mt-2" />
              </div>
              {[1,2,3,4,5].map(i => (
                <div key={i} className="border-t border-border/50 flex gap-0 px-0">
                  <div className="w-12 pt-4 flex justify-center">
                    <LoadingSkeleton className="h-3 w-6 rounded" />
                  </div>
                  <div className="flex-1 py-4 pr-5 space-y-2">
                    <LoadingSkeleton className="h-4 w-full rounded" />
                    <LoadingSkeleton className="h-3 w-48 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No predictions */}
          {!loadingPredictions && predictions.length === 0 && (
            <div className="rounded-2xl p-12 text-center card-depth">
              <Sparkles size={28} className="mx-auto text-text-muted mb-3" />
              <p className="text-sm font-medium text-text-secondary">No predictions yet</p>
              <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
                Upload at least 2 question papers for this subject to generate predictions.
              </p>
              <button
                onClick={() => setUploadOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
              >
                <Plus size={13} /> Upload a paper
              </button>
            </div>
          )}

          {/* Processing status */}
          {paperStatus !== "idle" && (
            <ProcessingStatus
              status={paperStatus}
              questionCount={questionCount}
              fileName={uploadedFileName}
            />
          )}

          {/* Upload panel */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setUploadOpen(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-bg-elevated transition-colors"
            >
              <div className="flex items-center gap-2">
                <Upload size={14} className="text-text-muted" />
                <span className="text-sm font-medium text-text-primary">Upload Paper to Improve Predictions</span>
              </div>
              {uploadOpen ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
            </button>

            {uploadOpen && (
              <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Year</label>
                    <select
                      value={year}
                      onChange={e => setYear(e.target.value)}
                      style={{ colorScheme: "inherit" }}
                      className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 appearance-none"
                    >
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Exam Type</label>
                    <select
                      value={examType}
                      onChange={e => setExamType(e.target.value)}
                      style={{ colorScheme: "inherit" }}
                      className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 appearance-none"
                    >
                      {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                    file ? "border-accent/50 bg-accent/5" : "border-border hover:border-accent/40 hover:bg-bg-elevated"
                  }`}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileSelect} className="hidden" />
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText size={14} className="text-accent" />
                      <span className="text-sm text-text-primary">{file.name}</span>
                      <span className="text-xs text-text-muted">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                    </div>
                  ) : (
                    <div>
                      <Upload size={18} className="mx-auto text-text-muted mb-1.5" />
                      <p className="text-sm text-text-secondary">Click to select PDF</p>
                      <p className="text-xs text-text-muted mt-0.5">Max 10 MB</p>
                    </div>
                  )}
                </div>

                {file && (
                  <button
                    onClick={handleUpload}
                    disabled={uploading || loadingPredictions || paperStatus === "queued" || paperStatus === "processing"}
                    className="w-full bg-accent hover:bg-accent-hover text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? "Uploading..."
                      : paperStatus === "queued" || paperStatus === "processing" ? "Processing paper..."
                      : loadingPredictions ? "Loading predictions..."
                      : "Upload & Analyze"}
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Answer Modal */}
      {modalPrediction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}
          onClick={closeModal}
        >
          <div
            className="rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-scale-in bg-bg-card border border-border shadow-modal"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${CONF_DOT[modalPrediction.confidence]}`} />
                <span className={`text-xs font-semibold uppercase tracking-wide ${CONF_TEXT[modalPrediction.confidence]}`}>
                  {modalPrediction.confidence} · {Math.round(modalPrediction.prediction_score)}% likely
                </span>
                {modalPrediction.unit != null && (
                  <span className="text-xs text-text-muted">· Unit {modalPrediction.unit}</span>
                )}
                {modalPrediction.expected_marks != null && (
                  <span className="text-xs font-mono text-text-muted border border-border rounded px-1.5 py-0.5 ml-1">
                    [{modalPrediction.expected_marks} marks]
                  </span>
                )}
              </div>
              <button onClick={closeModal} className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-bg-elevated">
                <X size={15} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Question */}
              <div>
                <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-2">Question</p>
                <p className="text-base text-text-primary leading-relaxed font-medium">{modalPrediction.question}</p>
                {modalPrediction.years_asked.length > 0 && (
                  <p className="text-xs text-text-muted mt-2">
                    Asked in: {modalPrediction.years_asked.sort().join(", ")}
                  </p>
                )}
              </div>

              <div className="border-t border-border" />

              {/* Answer */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-accent" />
                    <p className="text-[11px] font-medium text-accent uppercase tracking-wider">Model Answer</p>
                  </div>
                  {modalAnswer && !answerLoading && (
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                  )}
                </div>

                {answerLoading ? (
                  <div className="flex items-center gap-3 py-6 text-text-secondary">
                    <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="text-sm">Generating GTU-style answer...</span>
                  </div>
                ) : modalAnswer ? (
                  <>
                    {(modalAnswer.expectedQuestionFormat || modalAnswer.howToWrite || modalAnswer.readyToWriteAnswer) && (
                      <div className="space-y-4 mb-4">
                        {modalAnswer.expectedQuestionFormat && (
                          <div>
                            <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Expected Question Format</p>
                            <div className="prose prose-sm prose-invert max-w-none text-text-secondary leading-relaxed">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {modalAnswer.expectedQuestionFormat}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                        {modalAnswer.howToWrite && (
                          <div>
                            <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">How to Write</p>
                            <div className="prose prose-sm prose-invert max-w-none text-text-secondary leading-relaxed">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {modalAnswer.howToWrite}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                        {modalAnswer.readyToWriteAnswer && (
                          <div>
                            <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Ready-to-Write Answer</p>
                            <div className="prose prose-sm prose-invert max-w-none text-text-secondary leading-relaxed">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {modalAnswer.readyToWriteAnswer}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                        {modalAnswer.codeExample && (
                          <div>
                            <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Code Example</p>
                            <pre className="bg-bg-elevated p-3 rounded-lg overflow-x-auto text-xs text-text-secondary">
                              <code>{modalAnswer.codeExample}</code>
                            </pre>
                          </div>
                        )}
                        <div className="border-t border-border/50" />
                      </div>
                    )}
                    <div className="prose prose-sm prose-invert max-w-none text-text-secondary leading-relaxed
                      [&_strong]:text-text-primary [&_h1]:text-text-primary [&_h2]:text-text-primary
                      [&_h3]:text-text-primary [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:my-0.5
                      [&_p]:my-1.5 [&_code]:bg-bg-elevated [&_code]:px-1 [&_code]:rounded
                      [&_pre]:bg-bg-elevated [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {modalAnswer.text}
                      </ReactMarkdown>
                    </div>
                    {modalAnswer.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Sources</p>
                        <div className="flex flex-wrap gap-1.5">
                          {modalAnswer.sources.map((src, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[11px] text-text-muted bg-bg-elevated border border-border rounded px-2 py-0.5">
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
          </div>
        </div>
      )}
    </div>
  );
}

export default function PredictPage() {
  return (
    <Suspense fallback={null}>
      <PredictInner />
    </Suspense>
  );
}
