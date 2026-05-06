"use client";

import { useState, useEffect, useRef } from "react";
import { FileQuestion, ChevronDown, Search, X, Sparkles, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

interface Subject {
  id: string;
  name: string;
  code: string;
  branch: string;
  semester: number;
}

interface Question {
  id: string;
  text: string;
  marks: number | null;
  unit_number: number | null;
  question_type: string | null;
  question_papers: { year: number; exam_type: string } | null;
}

interface AnswerPayload {
  text: string;
  sources: string[];
}

export default function QuestionBankPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [yearFilter, setYearFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [search, setSearch] = useState("");

  // Modal state
  const [modalQuestion, setModalQuestion] = useState<Question | null>(null);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<AnswerPayload | null>(null);
  const [copied, setCopied] = useState(false);
  const answersCache = useRef<Record<string, AnswerPayload>>({});

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("branch, semester")
        .eq("id", user.id)
        .maybeSingle();
      let url = "/subjects";
      if (profile?.branch) url += `?branch=${encodeURIComponent(profile.branch)}`;
      const data = await api.get(url).catch(() => []);
      setSubjects(Array.isArray(data) ? data : []);
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedSubjectId) { setQuestions([]); return; }
    setLoading(true);
    const params = new URLSearchParams();
    if (yearFilter) params.set("year", yearFilter);
    if (unitFilter) params.set("unit", unitFilter);
    const qs = params.toString();
    api.get(`/questions/${selectedSubjectId}${qs ? `?${qs}` : ""}`)
      .then((data) => setQuestions(Array.isArray(data) ? data : []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [selectedSubjectId, yearFilter, unitFilter]);

  const handleQuestionClick = async (q: Question) => {
    setModalQuestion(q);
    setCopied(false);
    if (answersCache.current[q.id]) {
      setCurrentAnswer(answersCache.current[q.id]);
      return;
    }
    setCurrentAnswer(null);
    setAnswerLoading(true);
    try {
      const data = await api.post("/answers/ask", {
        question: q.text,
        subject_id: selectedSubjectId,
        marks: q.marks ?? 7,
      });
      const payload: AnswerPayload = {
        text: data.answer || "No answer available.",
        sources: data.sources || [],
      };
      answersCache.current[q.id] = payload;
      setCurrentAnswer(payload);
    } catch {
      setCurrentAnswer({ text: "Failed to generate answer. Please try again.", sources: [] });
    } finally {
      setAnswerLoading(false);
    }
  };

  const closeModal = () => {
    setModalQuestion(null);
    setCurrentAnswer(null);
    setAnswerLoading(false);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!currentAnswer) return;
    await navigator.clipboard.writeText(currentAnswer.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = search
    ? questions.filter((q) => q.text.toLowerCase().includes(search.toLowerCase()))
    : questions;

  const years = Array.from(
    new Set(
      questions
        .map((q) => q.question_papers?.year)
        .filter((y): y is number => y != null)
    )
  ).sort((a, b) => b - a);

  const units = Array.from(
    new Set(
      questions
        .map((q) => q.unit_number)
        .filter((u): u is number => u != null)
    )
  ).sort((a, b) => a - b);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FileQuestion size={20} className="text-accent" />
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Question Bank</h1>
      </div>

      {/* Subject selector */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
          Select Subject
        </label>
        <div className="relative">
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              setYearFilter("");
              setUnitFilter("");
              setSearch("");
              answersCache.current = {};
            }}
            className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary appearance-none pr-8 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          >
            <option value="">Choose a subject to browse questions...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.code ? ` (${s.code})` : ""}{s.semester ? ` · Sem ${s.semester}` : ""}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
        {subjects.length === 0 && (
          <p className="text-xs text-text-muted mt-2">No subjects found for your branch.</p>
        )}
      </div>

      {selectedSubjectId && (
        <>
          {/* Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="relative col-span-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-bg-card border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div className="relative">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary appearance-none pr-6 focus:outline-none focus:border-accent"
              >
                <option value="">All Years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary appearance-none pr-6 focus:outline-none focus:border-accent"
              >
                <option value="">All Units</option>
                {units.map((u) => <option key={u} value={u}>Unit {u}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              {filtered.length} question{filtered.length !== 1 ? "s" : ""}
              {questions.length !== filtered.length && ` (filtered from ${questions.length})`}
              <span className="ml-2 text-text-muted/60">· click any question for AI answer</span>
            </p>
            {(yearFilter || unitFilter || search) && (
              <button
                onClick={() => { setYearFilter(""); setUnitFilter(""); setSearch(""); }}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Questions list */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <LoadingSkeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
              <FileQuestion size={32} className="mx-auto text-text-muted mb-3" />
              <p className="text-sm font-medium text-text-secondary">No questions found</p>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                Upload question papers for this subject to populate the bank.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((q) => (
                <button
                  key={q.id}
                  onClick={() => handleQuestionClick(q)}
                  className="w-full text-left bg-bg-card border border-border rounded-xl p-4 hover:border-accent/40 hover:bg-bg-elevated transition-all duration-150 cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {q.question_papers?.year && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-bg-elevated border border-border rounded text-xs text-text-secondary font-mono">
                          {q.question_papers.year}
                        </span>
                      )}
                      {q.question_papers?.exam_type && (
                        <span className="text-xs text-text-muted capitalize">
                          {q.question_papers.exam_type}
                        </span>
                      )}
                      {q.unit_number != null && (
                        <Badge variant="accent">Unit {q.unit_number}</Badge>
                      )}
                      {q.question_type && (
                        <span className="text-xs text-text-muted capitalize">{q.question_type}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {q.marks != null && (
                        <span className="text-xs text-text-muted">{q.marks} marks</span>
                      )}
                      <Sparkles size={12} className="text-text-muted group-hover:text-accent transition-colors" />
                    </div>
                  </div>
                  <p className="text-sm text-text-primary leading-relaxed">{q.text}</p>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {!selectedSubjectId && (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent/10 border border-accent/20 mb-4">
            <FileQuestion size={24} className="text-accent" />
          </div>
          <h2 className="text-base font-semibold text-text-primary mb-1">Browse Previous Year Questions</h2>
          <p className="text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">
            Select a subject above to browse questions. Click any question to get an AI-generated model answer.
          </p>
        </div>
      )}

      {/* Answer Modal */}
      {modalQuestion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={closeModal}
        >
          <div
            className="bg-bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-accent" />
                <span className="text-sm font-semibold text-text-primary">AI Model Answer</span>
              </div>
              <div className="flex items-center gap-2">
                {currentAnswer && !answerLoading && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="text-text-muted hover:text-text-primary transition-colors rounded-lg p-1 hover:bg-bg-elevated"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Meta */}
              <div className="flex items-center gap-2 flex-wrap">
                {modalQuestion.question_papers?.year && (
                  <span className="inline-flex items-center px-2 py-0.5 bg-bg-elevated border border-border rounded text-xs text-text-secondary font-mono">
                    {modalQuestion.question_papers.year}
                  </span>
                )}
                {modalQuestion.unit_number != null && (
                  <Badge variant="accent">Unit {modalQuestion.unit_number}</Badge>
                )}
                {modalQuestion.question_type && (
                  <span className="text-xs text-text-muted capitalize">{modalQuestion.question_type}</span>
                )}
                {modalQuestion.marks != null && (
                  <span className="text-xs text-text-muted">{modalQuestion.marks} marks</span>
                )}
              </div>

              {/* Question */}
              <div className="bg-bg-elevated border border-border rounded-xl px-4 py-3">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Question</p>
                <p className="text-sm text-text-primary leading-relaxed">{modalQuestion.text}</p>
              </div>

              {/* Answer */}
              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">Model Answer</p>
                {answerLoading ? (
                  <div className="flex items-center gap-3 py-6 text-text-secondary">
                    <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="text-sm">Generating GTU-style answer...</span>
                  </div>
                ) : currentAnswer ? (
                  <>
                    <div className="prose prose-sm prose-invert max-w-none text-text-secondary leading-relaxed
                      [&_strong]:text-text-primary [&_h1]:text-text-primary [&_h2]:text-text-primary
                      [&_h3]:text-text-primary [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:my-0.5
                      [&_p]:my-1.5 [&_code]:bg-bg-elevated [&_code]:px-1 [&_code]:rounded
                      [&_pre]:bg-bg-elevated [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {currentAnswer.text}
                      </ReactMarkdown>
                    </div>
                    {currentAnswer.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Sources</p>
                        <div className="flex flex-wrap gap-1.5">
                          {currentAnswer.sources.map((src, i) => (
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
