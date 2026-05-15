"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles, RefreshCw, ChevronDown, Upload,
  FileText, X, Plus, ChevronUp, BookOpen, Copy, Check, Printer,
  ChevronLeft, ChevronRight, CheckCircle2, Circle, Filter,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DiagramBlock from "@/components/shared/DiagramBlock";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
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

interface PaperSlot {
  slotId:        string;
  file:          File | null;
  year:          string;
  examType:      string;
  paperId:       string | null;
  status:        PaperStatus;
  questionCount: number;
}

let _slotCounter = 0;
function makePaperSlot(): PaperSlot {
  return {
    slotId:        String(++_slotCounter),
    file:          null,
    year:          String(new Date().getFullYear()),
    examType:      "winter",
    paperId:       null,
    status:        "idle",
    questionCount: 0,
  };
}

const EXAM_TYPES = [
  { value: "winter", label: "Winter" },
  { value: "summer", label: "Summer" },
  { value: "mid",    label: "Mid Semester" },
  { value: "internal", label: "Internal" },
];
const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

// Confidence tier styling
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
const CONF_BAR = {
  HIGH:   "bg-emerald-500",
  MEDIUM: "bg-amber-500",
  LOW:    "bg-red-500/70",
};
// Human-readable tier labels and fire emojis
const CONF_LABEL = {
  HIGH:   "Almost Certain",
  MEDIUM: "Likely",
  LOW:    "Possible",
};
const CONF_FIRE = {
  HIGH:   "🔥🔥🔥",
  MEDIUM: "🔥🔥",
  LOW:    "🔥",
};

interface AnswerPayload {
  text: string;
  sources: string[];
  expectedQuestionFormat?: string | null;
  howToWrite?: string | null;
  readyToWriteAnswer?: string | null;
  codeExample?: string | null;
}

interface DiagramData {
  engine:       "mermaid" | "graphviz" | "ascii";
  dsl:          string;
  fallbackAscii?: string;
  svgData?:     string | null;
  diagramType?: string;
}

function predKey(p: Prediction) {
  return p.pattern_id ?? p.question;
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

// ---------------------------------------------------------------------------
// PaperSlotRow
// ---------------------------------------------------------------------------
const STATUS_ICON: Record<PaperStatus, React.ReactNode> = {
  idle:       null,
  queued:     <span className="text-xs text-amber-400">Queued</span>,
  processing: <span className="text-xs text-blue-400 animate-pulse">Analyzing…</span>,
  done:       <span className="text-xs text-emerald-400">Done</span>,
  failed:     <span className="text-xs text-red-400">Failed</span>,
};

function PaperSlotRow({
  slot, index, total, onFileSelect, onYearChange, onExamTypeChange, onRemove,
}: {
  slot: PaperSlot;
  index: number;
  total: number;
  onFileSelect: (slotId: string, files: FileList | null) => void;
  onYearChange: (y: string) => void;
  onExamTypeChange: (t: string) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isActive = slot.status === "queued" || slot.status === "processing";

  return (
    <div className={`rounded-xl border transition-colors ${
      slot.status === "done"   ? "border-emerald-500/30 bg-emerald-500/5" :
      slot.status === "failed" ? "border-red-500/30 bg-red-500/5" :
      isActive                 ? "border-amber-500/30 bg-amber-500/5" :
                                 "border-border bg-bg-elevated"
    } p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-text-muted font-medium">Paper {index + 1}</span>
        {STATUS_ICON[slot.status]}
        {slot.status === "done" && slot.questionCount > 0 && (
          <span className="text-xs text-emerald-400">· {slot.questionCount} questions</span>
        )}
        {total > 1 && slot.status === "idle" && (
          <button onClick={onRemove} className="ml-auto text-text-muted hover:text-red-400 transition-colors">
            <X size={13} />
          </button>
        )}
      </div>

      <div
        onClick={() => !isActive && slot.status !== "done" && inputRef.current?.click()}
        className={`border border-dashed rounded-lg px-3 py-2.5 text-center mb-2 transition-colors ${
          slot.file                               ? "border-accent/40 bg-accent/5 cursor-default" :
          isActive || slot.status === "done"      ? "border-border opacity-60 cursor-not-allowed" :
                                                   "border-border hover:border-accent/40 hover:bg-bg-card cursor-pointer"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={e => onFileSelect(slot.slotId, e.target.files)}
          disabled={isActive || slot.status === "done"}
        />
        {slot.file ? (
          <div className="flex items-center justify-center gap-2">
            <FileText size={13} className="text-accent shrink-0" />
            <span className="text-xs text-text-primary truncate max-w-[180px]">{slot.file.name}</span>
            <span className="text-xs text-text-muted shrink-0">({(slot.file.size / 1024 / 1024).toFixed(1)} MB)</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5">
            <Upload size={13} className="text-text-muted" />
            <span className="text-xs text-text-secondary">Click to select PDF (max 10 MB)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={slot.year}
          onChange={e => onYearChange(e.target.value)}
          disabled={isActive || slot.status === "done"}
          style={{ colorScheme: "inherit" }}
          className="bg-bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent/60 appearance-none disabled:opacity-50"
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={slot.examType}
          onChange={e => onExamTypeChange(e.target.value)}
          disabled={isActive || slot.status === "done"}
          style={{ colorScheme: "inherit" }}
          className="bg-bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent/60 appearance-none disabled:opacity-50"
        >
          {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PredictInner
// ---------------------------------------------------------------------------
function PredictInner() {
  const searchParams = useSearchParams();

  const [subjects,           setSubjects]           = useState<Subject[]>([]);
  const [selectedSubjectId,  setSelectedSubjectId]  = useState("");
  const [selectedSubject,    setSelectedSubject]     = useState<Subject | null>(null);
  const [predictions,        setPredictions]        = useState<Prediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [paperCount,         setPaperCount]         = useState(0);
  const [sources,            setSources]            = useState<string[]>([]);

  // Upload panel
  const [uploadOpen,  setUploadOpen]  = useState(false);
  const [paperSlots,  setPaperSlots]  = useState<PaperSlot[]>([makePaperSlot()]);
  const [uploading,   setUploading]   = useState(false);
  const pollRef                       = useRef<NodeJS.Timeout | null>(null);
  const selectedSubjectIdRef          = useRef<string | null>(null);

  // Studied set — persisted per subject
  const [studied,       setStudied]       = useState<Set<string>>(new Set());
  const [filterStudied, setFilterStudied] = useState<"all" | "unstudied">("all");

  // Answer modal
  const [modalIndex,   setModalIndex]   = useState<number | null>(null);
  const [answerLoading,setAnswerLoading] = useState(false);
  const [modalAnswer,  setModalAnswer]  = useState<AnswerPayload | null>(null);
  const [copied,       setCopied]       = useState(false);
  const answersCache                    = useRef<Record<string, AnswerPayload>>({});
  const activeLoadRef                   = useRef<string>("");

  // Diagram state
  const [diagramData,    setDiagramData]    = useState<DiagramData | null>(null);
  const [diagramLoading, setDiagramLoading] = useState(false);
  const diagramCache                        = useRef<Record<string, DiagramData | null>>({});

  // Filtered predictions → unit groups → flat ordered list (for prev/next)
  const filteredPredictions = useMemo(() => {
    if (filterStudied === "unstudied") {
      return predictions.filter(p => !studied.has(predKey(p)));
    }
    return predictions;
  }, [predictions, filterStudied, studied]);

  const units = useMemo(() => groupByUnit(filteredPredictions), [filteredPredictions]);

  const flatPredictions = useMemo(
    () => units.flatMap(([, qs]) => qs),
    [units]
  );

  const modalPrediction = modalIndex !== null ? flatPredictions[modalIndex] ?? null : null;

  // Close modal when filter changes (index would become stale)
  useEffect(() => {
    if (modalIndex !== null) closeModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStudied]);

  // ── Load subjects ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("users").select("branch, semester").eq("id", user.id).maybeSingle();
      let url = "/subjects";
      if (profile?.branch)   url += `?branch=${encodeURIComponent(profile.branch)}`;
      if (profile?.semester) url += `${profile?.branch ? "&" : "?"}semester=${encodeURIComponent(profile.semester)}`;
      const data = await api.get(url).catch(() => []);
      const subs: Subject[] = Array.isArray(data) ? data : [];
      setSubjects(subs);

      // Restore last-selected subject (URL param > localStorage > none)
      const fromUrl = searchParams.get("subject");
      const fromLS  = localStorage.getItem("gtu_last_subject_id");
      const pick    = [fromUrl, fromLS].find(id => id && subs.some(s => s.id === id));
      if (pick) setSelectedSubjectId(pick);
    }
    load();
  }, [searchParams]);

  // ── Save last-selected subject ─────────────────────────────────────────────
  useEffect(() => {
    if (selectedSubjectId) {
      localStorage.setItem("gtu_last_subject_id", selectedSubjectId);
      const name = subjects.find(s => s.id === selectedSubjectId)?.name ?? "";
      if (name) localStorage.setItem("gtu_last_subject_name", name);
    }
  }, [selectedSubjectId, subjects]);

  // ── Load studied set from localStorage ────────────────────────────────────
  useEffect(() => {
    if (!selectedSubjectId) { setStudied(new Set()); return; }
    const raw = localStorage.getItem(`gtu_studied_${selectedSubjectId}`);
    setStudied(raw ? new Set(JSON.parse(raw)) : new Set());
  }, [selectedSubjectId]);

  // ── Load predictions ───────────────────────────────────────────────────────
  const loadPredictions = useCallback(async (subjectId: string, forceRefresh = false) => {
    if (!subjectId) return;
    setLoadingPredictions(true);
    if (forceRefresh) {
      setPredictions([]);
      answersCache.current = {};
      diagramCache.current = {};
    }
    try {
      const data = await api.get(`/predictions/${subjectId}${forceRefresh ? "?force_refresh=true" : ""}`);
      setPredictions(data.predictions || []);
      setPaperCount(data.paper_count || 0);
      setSources(data.sources || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401") || msg.includes("403")) {
        setPredictions([]);
        toast.error("Session expired — please log in again.");
      } else {
        toast.error(`Failed to load predictions: ${msg}`);
      }
    } finally {
      setLoadingPredictions(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSubjectId) {
      setSelectedSubject(subjects.find(s => s.id === selectedSubjectId) || null);
      loadPredictions(selectedSubjectId);
      setFilterStudied("all");
    } else {
      setPredictions([]);
      setSelectedSubject(null);
    }
  }, [selectedSubjectId, subjects, loadPredictions]);

  useEffect(() => {
    selectedSubjectIdRef.current = selectedSubjectId ?? null;
  }, [selectedSubjectId]);

  // Auto-open upload panel when there are no predictions
  useEffect(() => {
    if (!loadingPredictions && predictions.length === 0 && selectedSubjectId) {
      setUploadOpen(true);
    }
  }, [loadingPredictions, predictions.length, selectedSubjectId]);

  // ── Poll active papers ─────────────────────────────────────────────────────
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    const activePaperIds = paperSlots
      .filter(s => s.paperId && (s.status === "queued" || s.status === "processing"))
      .map(s => s.paperId as string);

    if (!activePaperIds.length) return;

    pollRef.current = setInterval(async () => {
      try {
        const results: Array<{id: string; processing_status: string; question_count: number}> =
          await api.get(`/papers/batch-status?paper_ids=${activePaperIds.join(",")}`);

        let anyDone = false;
        setPaperSlots(prev => prev.map(slot => {
          if (!slot.paperId) return slot;
          const r = results.find(x => x.id === slot.paperId);
          if (!r) return slot;
          const status: PaperStatus = r.processing_status === "pending" ? "queued" : r.processing_status as PaperStatus;
          if (r.processing_status === "done" && slot.status !== "done") {
            toast.success(`${slot.file?.name ?? "Paper"} processed — ${r.question_count} questions extracted!`);
            anyDone = true;
          }
          if (r.processing_status === "failed" && slot.status !== "failed") {
            toast.error(`${slot.file?.name ?? "Paper"} processing failed.`);
          }
          return { ...slot, status, questionCount: r.question_count || 0 };
        }));

        if (anyDone) {
          const sid = selectedSubjectIdRef.current;
          if (sid) setTimeout(() => loadPredictions(sid, true), 1500);
        }

        const stillActive = activePaperIds.filter(id => {
          const r = results.find(x => x.id === id);
          return r && (r.processing_status === "queued" || r.processing_status === "processing" || r.processing_status === "pending");
        });
        if (!stillActive.length && pollRef.current) clearInterval(pollRef.current);
      } catch { /* silent */ }
    }, 3000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperSlots.map(s => s.paperId).join(","), loadPredictions]);

  // ── Studied toggle ─────────────────────────────────────────────────────────
  const toggleStudied = useCallback((p: Prediction, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = predKey(p);
    setStudied(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      localStorage.setItem(
        `gtu_studied_${selectedSubjectIdRef.current}`,
        JSON.stringify([...next])
      );
      return next;
    });
  }, []);

  // ── Answer loading ─────────────────────────────────────────────────────────
  const fetchAnswer = useCallback(async (p: Prediction, loadId: string) => {
    const cacheKey = predKey(p);
    if (p.pattern_id && answersCache.current[p.pattern_id]) {
      if (activeLoadRef.current !== loadId) return;
      setModalAnswer(answersCache.current[p.pattern_id]);
      setAnswerLoading(false);
      return;
    }
    try {
      const data = await api.post("/answers/generate", {
        question_text: p.question,
        subject_id:    selectedSubjectIdRef.current,
        marks:         p.expected_marks ?? 7,
        pattern_id:    p.pattern_id,
      });
      if (activeLoadRef.current !== loadId) return;
      if (data.is_fallback) {
        toast.warning("AI is busy — answer template shown. Try again in a moment.");
      }
      const payload: AnswerPayload = {
        text:                   data.answer || "No answer available.",
        sources:                data.sources || [],
        expectedQuestionFormat: data.expected_question_format || null,
        howToWrite:             data.how_to_write || null,
        readyToWriteAnswer:     data.ready_to_write_answer || null,
        codeExample:            data.code_example || null,
      };
      if (p.pattern_id && !data.is_fallback) answersCache.current[cacheKey] = payload;
      setModalAnswer(payload);
    } catch {
      if (activeLoadRef.current !== loadId) return;
      setModalAnswer({ text: "Failed to generate answer. Please try again.", sources: [] });
    } finally {
      if (activeLoadRef.current === loadId) setAnswerLoading(false);
    }
  }, []);

  // ── Diagram loading ────────────────────────────────────────────────────────
  const loadDiagram = useCallback(async (question: string, cacheKey: string, loadId: string) => {
    try {
      const detect = await api.get(`/diagrams/detect-type?question=${encodeURIComponent(question)}`);
      if (!detect.requires_diagram) {
        diagramCache.current[cacheKey] = null;
        if (activeLoadRef.current === loadId) setDiagramLoading(false);
        return;
      }
      const data = await api.post("/diagrams/generate", {
        question_text: question,
        subject_id:    selectedSubjectIdRef.current,
        diagram_type:  detect.diagram_type,
        render_server: false,
      });
      if (activeLoadRef.current !== loadId) return;
      const diagram: DiagramData = {
        engine:       data.engine,
        dsl:          data.dsl,
        fallbackAscii:data.fallback_ascii,
        svgData:      data.svg || null,
        diagramType:  data.diagram_type,
      };
      diagramCache.current[cacheKey] = diagram;
      setDiagramData(diagram);
    } catch {
      diagramCache.current[cacheKey] = null;
    } finally {
      if (activeLoadRef.current === loadId) setDiagramLoading(false);
    }
  }, []);

  // ── Modal open/close/nav ───────────────────────────────────────────────────
  const openModal = useCallback((index: number) => {
    const p = flatPredictions[index];
    if (!p) return;

    const loadId = `${index}-${predKey(p)}`;
    activeLoadRef.current = loadId;

    setModalIndex(index);
    setCopied(false);
    setModalAnswer(null);
    setAnswerLoading(true);
    setDiagramData(null);
    setDiagramLoading(false);

    fetchAnswer(p, loadId);

    const diagKey = predKey(p);
    if (diagramCache.current[diagKey] !== undefined) {
      setDiagramData(diagramCache.current[diagKey]);
    } else {
      setDiagramLoading(true);
      loadDiagram(p.question, diagKey, loadId);
    }
  }, [flatPredictions, fetchAnswer, loadDiagram]);

  const closeModal = () => {
    activeLoadRef.current = "";
    setModalIndex(null);
    setModalAnswer(null);
    setAnswerLoading(false);
    setCopied(false);
    setDiagramData(null);
    setDiagramLoading(false);
  };

  const goPrev = () => {
    if (modalIndex === null || modalIndex <= 0) return;
    openModal(modalIndex - 1);
  };
  const goNext = () => {
    if (modalIndex === null || modalIndex >= flatPredictions.length - 1) return;
    openModal(modalIndex + 1);
  };

  // Keyboard navigation inside modal
  useEffect(() => {
    if (modalIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape")     closeModal();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalIndex, flatPredictions.length]);

  const handleCopy = async () => {
    if (!modalAnswer) return;
    await navigator.clipboard.writeText(modalAnswer.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── PDF print — questions only ─────────────────────────────────────────────
  const handleDownloadPDF = () => {
    if (!selectedSubject || predictions.length === 0) return;
    const allUnits = groupByUnit(predictions);
    let qNum = 0;
    const rows = allUnits.flatMap(([unitLabel, qs]) => [
      `<tr><td colspan="4" style="background:#f5f5f5;font-weight:600;padding:6px 10px;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;">${unitLabel}</td></tr>`,
      ...qs.map(q => {
        qNum++;
        return `<tr style="border-bottom:1px solid #eee;">
          <td style="padding:6px 10px;font-size:11px;color:#555;white-space:nowrap;">Q${qNum}</td>
          <td style="padding:6px 10px;font-size:12px;">${q.question}</td>
          <td style="padding:6px 10px;font-size:11px;color:#555;white-space:nowrap;">${CONF_LABEL[q.confidence]} · ${Math.round(q.prediction_score)}%</td>
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

  // ── PDF print — questions + cached answers ─────────────────────────────────
  const handlePrintWithAnswers = () => {
    if (!selectedSubject || predictions.length === 0) return;
    const allUnits = groupByUnit(predictions);
    let qNum = 0;
    const sections = allUnits.flatMap(([unitLabel, qs]) => [
      `<h3 style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#444;margin:20px 0 8px;border-bottom:1px solid #eee;padding-bottom:4px;">${unitLabel}</h3>`,
      ...qs.map(q => {
        qNum++;
        const key     = predKey(q);
        const cached  = answersCache.current[key];
        const answer  = cached ? (cached.readyToWriteAnswer || cached.text) : null;
        return `<div style="margin-bottom:16px;">
          <p style="font-size:12px;font-weight:600;margin:0 0 4px;"><span style="color:#888">Q${qNum}</span> ${q.question}${q.expected_marks != null ? ` <span style="color:#aaa">[${q.expected_marks}m]</span>` : ""}</p>
          ${answer
            ? `<div style="font-size:11px;color:#333;line-height:1.5;padding:6px 10px;background:#f9f9f9;border-left:3px solid #6C63FF;border-radius:4px;white-space:pre-wrap;">${answer}</div>`
            : `<p style="font-size:11px;color:#aaa;font-style:italic;">Answer not loaded — open this question to generate it.</p>`}
        </div>`;
      }),
    ]);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${selectedSubject.name} — Questions + Answers</title>
      <style>body{font-family:sans-serif;margin:30px}h1{font-size:18px;margin-bottom:4px}p.sub{font-size:12px;color:#666;margin:0 0 16px}@media print{button{display:none}}</style>
    </head><body>
      <h1>${selectedSubject.name}${selectedSubject.code ? ` (${selectedSubject.code})` : ""} — Questions + AI Answers</h1>
      <p class="sub">Generated ${new Date().toLocaleDateString()} · ${predictions.length} questions · only loaded answers shown</p>
      ${sections.join("")}
      <script>window.onload=()=>window.print()</script>
    </body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };

  // ── Upload handlers ────────────────────────────────────────────────────────
  const updateSlot = (slotId: string, patch: Partial<PaperSlot>) =>
    setPaperSlots(prev => prev.map(s => s.slotId === slotId ? { ...s, ...patch } : s));

  const handleFileSelect = (slotId: string, files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") { toast.error("Only PDF files allowed."); return; }
    if (f.size > 10 * 1024 * 1024)   { toast.error("File must be under 10 MB."); return; }
    updateSlot(slotId, { file: f });
  };

  const handleUploadAll = async () => {
    if (!selectedSubjectId) return;
    const toUpload = paperSlots.filter(s => s.file && s.status === "idle");
    if (!toUpload.length) { toast.error("Add at least one PDF first."); return; }

    setUploading(true);
    let uploadedCount = 0;

    for (const slot of toUpload) {
      updateSlot(slot.slotId, { status: "queued" });
      const form = new FormData();
      form.append("file",       slot.file as File);
      form.append("subject_id", selectedSubjectId);
      form.append("year",       slot.year);
      form.append("exam_type",  slot.examType);
      try {
        const res = await api.upload("/papers/upload", form);
        updateSlot(slot.slotId, { paperId: res.paper_id, status: "queued" });
        uploadedCount++;
      } catch (e: unknown) {
        updateSlot(slot.slotId, { status: "failed" });
        toast.error(`${slot.file?.name}: ${e instanceof Error ? e.message : "Upload failed"}`);
      }
    }

    setUploading(false);
    if (uploadedCount > 0) toast.success(`${uploadedCount} paper${uploadedCount > 1 ? "s" : ""} uploaded — analyzing...`);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const high   = predictions.filter(p => p.confidence === "HIGH").length;
  const medium = predictions.filter(p => p.confidence === "MEDIUM").length;
  const low    = predictions.filter(p => p.confidence === "LOW").length;
  const studiedCount = studied.size;

  // ── Render ─────────────────────────────────────────────────────────────────
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
            title="Refresh predictions"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>

      {/* Empty subject state */}
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

          {/* Predictions list */}
          {!loadingPredictions && predictions.length > 0 && (
            <div className="rounded-2xl overflow-hidden card-depth">
              {/* Paper header */}
              <div className="px-6 py-4 border-b border-border"
                style={{ background: "linear-gradient(145deg, rgba(108,99,255,0.06), transparent)" }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
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

                  <div className="shrink-0 text-right space-y-2">
                    {/* Source badges */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
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

                    {/* Stats row */}
                    <div className="flex items-center gap-3 justify-end">
                      <span className="text-xs text-text-muted">{paperCount} paper{paperCount !== 1 ? "s" : ""} analyzed</span>
                      {high   > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /><span className="text-xs text-text-secondary">{high}</span></span>}
                      {medium > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /><span className="text-xs text-text-secondary">{medium}</span></span>}
                      {low    > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/70 inline-block" /><span className="text-xs text-text-secondary">{low}</span></span>}
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center gap-3 justify-end">
                      {/* Filter toggle */}
                      <button
                        onClick={() => setFilterStudied(v => v === "all" ? "unstudied" : "all")}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${
                          filterStudied === "unstudied"
                            ? "text-accent font-medium"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                        title={filterStudied === "all" ? "Show unstudied only" : "Show all questions"}
                      >
                        <Filter size={11} />
                        {filterStudied === "unstudied"
                          ? `Unstudied (${filteredPredictions.length})`
                          : `All · ${studiedCount > 0 ? `${studiedCount} studied` : "none studied"}`}
                      </button>

                      {/* Print buttons */}
                      <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors">
                        <Printer size={12} />
                        Questions
                      </button>
                      <button onClick={handlePrintWithAnswers} className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors">
                        <Printer size={12} />
                        + Answers
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* No results after filter */}
              {units.length === 0 && (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-text-muted">All questions marked as studied.</p>
                  <button onClick={() => setFilterStudied("all")} className="mt-2 text-xs text-accent hover:underline">
                    Show all questions
                  </button>
                </div>
              )}

              {/* Questions grouped by unit */}
              {units.map(([unitLabel, qs], ui) => {
                // Find starting flat index for this unit
                const unitStartIdx = flatPredictions.indexOf(qs[0]);
                return (
                  <div key={unitLabel}>
                    <div className={`px-6 py-2 flex items-center gap-3 ${ui > 0 ? "border-t border-border" : ""}`}>
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                        {unitLabel}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[11px] text-text-muted">{qs.length} question{qs.length !== 1 ? "s" : ""}</span>
                    </div>

                    {qs.map((p, qi) => {
                      const flatIdx   = unitStartIdx + qi;
                      const isStudied = studied.has(predKey(p));
                      return (
                        <button
                          key={p.pattern_id}
                          onClick={() => openModal(flatIdx)}
                          className={`w-full text-left flex gap-0 border-t border-border/50 hover:bg-bg-elevated transition-colors duration-100 group ${CONF_BORDER[p.confidence]} ${isStudied ? "opacity-50" : ""}`}
                        >
                          {/* Q number */}
                          <div className="shrink-0 w-12 flex items-start justify-center pt-4">
                            <span className="text-xs font-mono text-text-muted">Q{flatIdx + 1}</span>
                          </div>

                          {/* Main content */}
                          <div className="flex-1 py-3.5 min-w-0">
                            <p className="text-sm text-text-primary leading-relaxed mb-2 pr-4">{p.question}</p>
                            <div className="flex items-center gap-3 flex-wrap">
                              {/* Fire emoji + label */}
                              <span className={`text-[11px] font-semibold ${CONF_TEXT[p.confidence]} flex items-center gap-1.5`}>
                                <span>{CONF_FIRE[p.confidence]}</span>
                                <span>{CONF_LABEL[p.confidence]}</span>
                              </span>
                              {/* Score bar — fixed 72px track, % fill */}
                              <div className="flex items-center gap-1.5">
                                <div className="w-[72px] h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${CONF_BAR[p.confidence]}`}
                                    style={{ width: `${Math.round(p.prediction_score)}%` }}
                                  />
                                </div>
                                <span className={`text-[11px] font-mono ${CONF_TEXT[p.confidence]}`}>
                                  {Math.round(p.prediction_score)}%
                                </span>
                              </div>
                              {p.years_asked.length > 0 && (
                                <span className="text-[11px] text-text-muted">
                                  Asked: {p.years_asked.sort().join(", ")}
                                </span>
                              )}
                              {p.question_type && (
                                <span className="text-[11px] text-text-muted capitalize">{p.question_type}</span>
                              )}
                              {(p as unknown as {source?: string}).source === "llm_professor" && (
                                <span className="text-[10px] text-violet-400">🧠 AI</span>
                              )}
                              {(p as unknown as {source?: string}).source === "web" && (
                                <span className="text-[10px] text-blue-400">🌐 Web</span>
                              )}
                            </div>
                            {(p as unknown as {reasoning?: string}).reasoning && (
                              <p className="text-[11px] text-text-muted/60 mt-1 italic">
                                {(p as unknown as {reasoning?: string}).reasoning}
                              </p>
                            )}
                          </div>

                          {/* Right side — marks + studied + view answer */}
                          <div className="shrink-0 flex flex-col items-end justify-between py-3.5 pr-4 gap-2">
                            {p.expected_marks != null && (
                              <span className="text-xs font-mono text-text-muted border border-border rounded px-1.5 py-0.5">
                                [{p.expected_marks}]
                              </span>
                            )}
                            <div className="flex items-center gap-2">
                              {/* Studied toggle button */}
                              <button
                                onClick={e => toggleStudied(p, e)}
                                title={isStudied ? "Mark as unstudied" : "Mark as studied"}
                                className={`transition-colors ${isStudied ? "text-emerald-400" : "text-text-muted/40 hover:text-text-muted"}`}
                              >
                                {isStudied
                                  ? <CheckCircle2 size={14} />
                                  : <Circle size={14} />
                                }
                              </button>
                              <span className="text-[11px] text-accent opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                View →
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* No predictions yet */}
          {!loadingPredictions && predictions.length === 0 && (
            <div className="rounded-2xl p-12 text-center card-depth">
              <Sparkles size={28} className="mx-auto text-text-muted mb-3" />
              <p className="text-sm font-medium text-text-secondary">No predictions yet for this subject</p>
              <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
                Upload at least 2 past question papers — the AI will analyze patterns and generate predictions.
              </p>
            </div>
          )}

          {/* Upload panel */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setUploadOpen(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-bg-elevated transition-colors"
            >
              <div className="flex items-center gap-2">
                <Upload size={14} className="text-text-muted" />
                <span className="text-sm font-medium text-text-primary">Upload Papers to Improve Predictions</span>
                {paperSlots.some(s => s.status === "queued" || s.status === "processing") && (
                  <span className="text-xs text-amber-400 font-medium">· Processing...</span>
                )}
                {paperSlots.some(s => s.status === "done") && (
                  <span className="text-xs text-emerald-400 font-medium">
                    · {paperSlots.filter(s => s.status === "done").reduce((a, s) => a + s.questionCount, 0)} questions extracted
                  </span>
                )}
              </div>
              {uploadOpen ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
            </button>

            {uploadOpen && (
              <div className="px-5 pb-5 border-t border-border pt-4 space-y-3">
                <p className="text-xs text-text-muted">
                  Add all past papers at once — more papers = better predictions.
                </p>

                {paperSlots.map((slot, idx) => (
                  <PaperSlotRow
                    key={slot.slotId}
                    slot={slot}
                    index={idx}
                    total={paperSlots.length}
                    onFileSelect={handleFileSelect}
                    onYearChange={y => updateSlot(slot.slotId, { year: y })}
                    onExamTypeChange={t => updateSlot(slot.slotId, { examType: t })}
                    onRemove={() => setPaperSlots(prev => prev.filter(s => s.slotId !== slot.slotId))}
                  />
                ))}

                <button
                  onClick={() => setPaperSlots(prev => [...prev, makePaperSlot()])}
                  className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors py-1"
                >
                  <Plus size={13} /> Add another paper
                </button>

                <button
                  onClick={handleUploadAll}
                  disabled={uploading || !paperSlots.some(s => s.file && s.status === "idle")}
                  className="w-full bg-accent hover:bg-accent-hover text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                >
                  {uploading
                    ? "Uploading..."
                    : `Upload & Analyze${paperSlots.filter(s => s.file && s.status === "idle").length > 0
                        ? ` (${paperSlots.filter(s => s.file && s.status === "idle").length} paper${paperSlots.filter(s => s.file && s.status === "idle").length > 1 ? "s" : ""})`
                        : ""}`}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Answer Modal ──────────────────────────────────────────────────────── */}
      {modalPrediction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}
          onClick={closeModal}
        >
          <div
            className="rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto animate-scale-in bg-bg-card border border-border shadow-modal"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border">
              {/* Prev / Next nav */}
              <div className="flex items-center gap-1">
                <button
                  onClick={goPrev}
                  disabled={modalIndex === 0}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-30 transition-colors"
                  title="Previous question (←)"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-text-muted tabular-nums px-1">
                  {(modalIndex ?? 0) + 1} / {flatPredictions.length}
                </span>
                <button
                  onClick={goNext}
                  disabled={modalIndex === flatPredictions.length - 1}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-30 transition-colors"
                  title="Next question (→)"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Confidence info */}
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-center">
                <div className={`w-2 h-2 rounded-full ${CONF_DOT[modalPrediction.confidence]}`} />
                <span className={`text-xs font-semibold ${CONF_TEXT[modalPrediction.confidence]}`}>
                  {CONF_FIRE[modalPrediction.confidence]} {CONF_LABEL[modalPrediction.confidence]} · {Math.round(modalPrediction.prediction_score)}%
                </span>
                {modalPrediction.unit != null && (
                  <span className="text-xs text-text-muted hidden sm:inline">· Unit {modalPrediction.unit}</span>
                )}
                {modalPrediction.expected_marks != null && (
                  <span className="text-xs font-mono text-text-muted border border-border rounded px-1.5 py-0.5 hidden sm:inline">
                    [{modalPrediction.expected_marks}m]
                  </span>
                )}
              </div>

              {/* Studied + close */}
              <div className="flex items-center gap-1">
                <button
                  onClick={e => toggleStudied(modalPrediction, e)}
                  title={studied.has(predKey(modalPrediction)) ? "Unmark studied" : "Mark as studied"}
                  className={`p-1.5 rounded-lg transition-colors ${
                    studied.has(predKey(modalPrediction))
                      ? "text-emerald-400 hover:bg-emerald-500/10"
                      : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                  }`}
                >
                  {studied.has(predKey(modalPrediction))
                    ? <CheckCircle2 size={15} />
                    : <Circle size={15} />
                  }
                </button>
                <button
                  onClick={closeModal}
                  className="text-text-muted hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-bg-elevated"
                >
                  <X size={15} />
                </button>
              </div>
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
                    <div className="prose prose-sm prose-invert max-w-none text-text-secondary leading-relaxed
                      [&_strong]:text-text-primary [&_h1]:text-text-primary [&_h2]:text-text-primary
                      [&_h3]:text-text-primary [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:my-0.5
                      [&_p]:my-1.5 [&_code]:bg-bg-elevated [&_code]:px-1 [&_code]:rounded
                      [&_pre]:bg-bg-elevated [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {modalAnswer.readyToWriteAnswer || modalAnswer.text}
                      </ReactMarkdown>
                    </div>

                    {modalAnswer.codeExample && (
                      <div className="mt-3">
                        <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Code Example</p>
                        <pre className="bg-bg-elevated p-3 rounded-lg overflow-x-auto text-xs text-text-secondary">
                          <code>{modalAnswer.codeExample}</code>
                        </pre>
                      </div>
                    )}

                    {/* Diagram */}
                    {diagramLoading && (
                      <div className="flex items-center gap-2 mt-3 text-text-secondary">
                        <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
                        <span className="text-xs">Generating diagram...</span>
                      </div>
                    )}
                    {diagramData && !diagramLoading && (
                      <DiagramBlock
                        engine={diagramData.engine}
                        dsl={diagramData.dsl}
                        fallbackAscii={diagramData.fallbackAscii}
                        svgData={diagramData.svgData}
                        diagramType={diagramData.diagramType}
                      />
                    )}

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

            {/* Modal footer — prev/next quick nav */}
            <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between">
              <button
                onClick={goPrev}
                disabled={modalIndex === 0}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span className="text-xs text-text-muted/50">← → to navigate</span>
              <button
                onClick={goNext}
                disabled={modalIndex === flatPredictions.length - 1}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
              >
                Next <ChevronRight size={13} />
              </button>
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
