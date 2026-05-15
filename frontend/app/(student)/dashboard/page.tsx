"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ArrowRight, Upload, MessageSquare, BookOpen, FileQuestion, Sparkles,
  Star, PenLine, CheckCircle, Newspaper, ExternalLink, RefreshCw, Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";

function fadeUp(delay = 0) {
  return {
    initial:    { opacity: 0, y: 10 },
    animate:    { opacity: 1, y: 0 },
    transition: { delay, duration: 0.32, ease: "easeOut" },
  } as const;
}

interface UserProfile {
  full_name: string;
  branch: string;
  semester: number;
  enrollment_no: string;
}

interface NewsItem {
  id: string;
  title: string;
  date: string;
  source: string;
  url: string | null;
  preview: string | null;
  tag: string;
}

const EXAM_QUOTES = [
  { text: "Padhoge nahi toh rote rahoge. Padh lo ek baar.", author: "Every GTU topper ever" },
  { text: "Syllabus bohot bada hai. Andaza chota. Trust the pattern.", author: "8 years of GTU data" },
  { text: "Exam mein luck nahi — pattern kaam aata hai.", author: "Prediction engine" },
  { text: "Jo aayega woh padh lo. Baaki ko maafi do.", author: "Smart student strategy" },
  { text: "Ek raat mein sab padh lena — yeh plan nahi, yeh hope hai.", author: "Reality check" },
  { text: "Result sheet se zyada mehnat sheet powerful hoti hai.", author: "Andaza wisdom" },
  { text: "9 baje se 11 baje — yeh waqt sirf tumhara hai.", author: "Peak focus window" },
  { text: "Paper mein woh aata hai jo professor baar baar poochta hai.", author: "GTU pattern, 2016–2024" },
];

function getDailyQuote() {
  const day = new Date().getDay();
  return EXAM_QUOTES[day % EXAM_QUOTES.length];
}

function getGreeting(name: string, hour: number): string {
  if (hour >= 22 || hour < 4) return `Up late, ${name}?`;
  if (hour < 9)  return `Good morning, ${name}.`;
  if (hour < 14) return `Hey ${name},`;
  if (hour < 18) return `Afternoon, ${name}.`;
  return `Evening, ${name}.`;
}

const FEATURE_CARDS = [
  { href: "/predict",       icon: Sparkles,      label: "Andaza Laga",  desc: "AI exam predictions" },
  { href: "/chat",          icon: MessageSquare, label: "Pooch Lo",     desc: "Ask GTU GPT" },
  { href: "/materials",     icon: BookOpen,      label: "Notes",        desc: "Books & PDFs" },
  { href: "/question-bank", icon: FileQuestion,  label: "PYQ Bank",     desc: "Past questions" },
  { href: "/my-uploads",    icon: Upload,        label: "Uploads",      desc: "Your files" },
  { href: "/community",     icon: Users,         label: "Community",    desc: "Study groups" },
];

export default function StudentDashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hour, setHour] = useState(new Date().getHours());
  const [lastSubject, setLastSubject] = useState<{ id: string; name: string } | null>(null);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState(false);

  const [showReview, setShowReview] = useState(false);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewQuote, setReviewQuote] = useState("");
  const [reviewCollege, setReviewCollege] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    setHour(new Date().getHours());
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("full_name, branch, semester, enrollment_no")
        .eq("id", user.id)
        .maybeSingle();
      if (data) setProfile(data);

      const lsId   = localStorage.getItem("gtu_last_subject_id");
      const lsName = localStorage.getItem("gtu_last_subject_name");
      if (lsId && lsName) setLastSubject({ id: lsId, name: lsName });

      api.get("/news/gtu?limit=8")
        .then((d: { items: NewsItem[] }) => setNews(d.items || []))
        .catch(() => setNewsError(true))
        .finally(() => setNewsLoading(false));
    })();
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] || "Student";
  const greeting = useMemo(() => getGreeting(firstName, hour), [firstName, hour]);
  const quote = useMemo(() => getDailyQuote(), []);

  const refreshNews = () => {
    setNewsLoading(true);
    setNewsError(false);
    api.get("/news/gtu?limit=8&force=true")
      .then((d: { items: NewsItem[] }) => setNews(d.items || []))
      .catch(() => setNewsError(true))
      .finally(() => setNewsLoading(false));
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewQuote.trim().length < 20) {
      setReviewError("Need 20+ characters.");
      return;
    }
    setReviewSubmitting(true);
    setReviewError("");
    try {
      await api.post("/testimonials", {
        quote:   reviewQuote.trim(),
        stars:   reviewStars,
        college: reviewCollege.trim(),
      });
      setReviewSent(true);
      toast.success("Review submitted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit";
      setReviewError(msg);
      toast.error(msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const TAG_COLORS: Record<string, string> = {
    timetable: "bg-emerald-100 text-emerald-700",
    result:    "bg-blue-100 text-blue-700",
    form:      "bg-amber-100 text-amber-700",
    circular:  "bg-violet-100 text-violet-700",
    notice:    "bg-bg-muted text-text-secondary",
    holiday:   "bg-pink-100 text-pink-700",
  };

  return (
    <div className="max-w-7xl mx-auto">

      {/* Greeting row */}
      <motion.div {...fadeUp(0)} className="mb-7">
        <h1 className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight">
          {greeting}
        </h1>
        {profile && (
          <div className="flex items-center gap-2 flex-wrap mt-4">
            <span className="chip">{profile.branch}</span>
            <span className="chip">Sem {profile.semester}</span>
            {profile.enrollment_no && (
              <span className="text-[12.5px] text-text-muted font-mono">{profile.enrollment_no}</span>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Bento Grid ── */}
      <div className="grid grid-cols-12 gap-5 auto-rows-min">

        {/* HERO — Continue / first action — spans 8 cols */}
        <motion.div {...fadeUp(0.06)} className="col-span-12 lg:col-span-8">
          {lastSubject ? (
            <Link href={`/predict?subject=${lastSubject.id}`} className="block group">
              <div className="card card-hover p-7 lg:p-8 relative overflow-hidden">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="section-title">Continue studying</p>
                    <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mt-3 tracking-tight">
                      {lastSubject.name}
                    </h2>
                    <p className="text-text-secondary mt-2 text-[14px]">
                      Pick up where you left off — predictions and AI answers ready.
                    </p>
                  </div>
                  <button className="btn-primary shrink-0 group-hover:opacity-100">
                    Resume <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/predict" className="block group">
              <div className="card card-hover p-7 lg:p-8">
                <p className="section-title">Get started</p>
                <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mt-3 tracking-tight">
                  Predict your exam.
                </h2>
                <p className="text-text-secondary mt-2 text-[14px] max-w-md">
                  Upload past papers, get AI predictions, study only what matters.
                </p>
                <button className="btn-primary mt-6">
                  Start with Andaza Laga <ArrowRight size={15} />
                </button>
              </div>
            </Link>
          )}
        </motion.div>

        {/* Quote card — 4 cols */}
        <motion.div {...fadeUp(0.10)} className="col-span-12 lg:col-span-4">
          <div className="card p-6 h-full bg-gradient-to-br from-bg-card to-bg-elevated">
            <span className="text-2xl">💡</span>
            <p className="text-[15px] font-medium text-text-primary leading-snug mt-3 text-balance">
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className="text-[12px] text-text-muted mt-3">— {quote.author}</p>
          </div>
        </motion.div>

        {/* Feature cards — 3-col grid inside 8-col span */}
        <motion.div {...fadeUp(0.14)} className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURE_CARDS.map(({ href, icon: Icon, label, desc }) => (
              <Link key={href} href={href} className="block">
                <div className="card card-hover p-5 h-full group">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
                      <Icon size={18} strokeWidth={1.9} />
                    </div>
                    <ArrowRight size={15} className="text-text-muted/40 group-hover:text-text-primary transition-colors" />
                  </div>
                  <p className="text-[15px] font-semibold text-text-primary mt-4">{label}</p>
                  <p className="text-[12.5px] text-text-muted mt-0.5">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* News card — tall, 4 cols */}
        <motion.div {...fadeUp(0.18)} className="col-span-12 lg:col-span-4 lg:row-span-2">
          <div className="card p-0 overflow-hidden h-full flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-bg-muted flex items-center justify-center">
                  <Newspaper size={14} />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-text-primary">GTU Updates</p>
                  <p className="text-[11px] text-text-muted">Circulars · Timetables</p>
                </div>
              </div>
              <button
                onClick={refreshNews}
                disabled={newsLoading}
                className="text-text-muted hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-bg-elevated disabled:opacity-40"
                title="Refresh"
              >
                <RefreshCw size={13} className={newsLoading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {newsLoading && Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                  <div className="skeleton w-14 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-4/5" />
                    <div className="skeleton h-3 w-1/3" />
                  </div>
                </div>
              ))}

              {newsError && !newsLoading && (
                <div className="px-5 py-8 text-center">
                  <p className="text-[13px] text-text-muted">Could not load updates.</p>
                  <button onClick={refreshNews} className="mt-2 text-[12px] text-accent hover:underline">Try again</button>
                </div>
              )}

              {!newsLoading && !newsError && news.map((item) => {
                const tagClass = TAG_COLORS[item.tag] || TAG_COLORS.notice;
                const dateStr = item.date
                  ? new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                  : "";
                return (
                  <a
                    key={item.id}
                    href={item.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => !item.url && e.preventDefault()}
                    className="px-5 py-3.5 flex items-start gap-3 hover:bg-bg-elevated/60 transition-colors group"
                  >
                    <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 mt-0.5 ${tagClass}`}>
                      {item.tag}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-text-primary leading-snug line-clamp-2">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-text-muted">{dateStr}</span>
                        <span className="text-[11px] text-text-muted/50">·</span>
                        <span className="text-[11px] text-text-muted">{item.source}</span>
                      </div>
                    </div>
                    {item.url && (
                      <ExternalLink size={12} className="text-text-muted/40 group-hover:text-text-primary transition-colors shrink-0 mt-1" />
                    )}
                  </a>
                );
              })}

              {!newsLoading && !newsError && news.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <p className="text-[13px] text-text-muted">No updates right now.</p>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-border flex items-center justify-between">
              <p className="text-[11px] text-text-muted">From gtu.ac.in + Telegram</p>
              <a
                href="https://t.me/gtu_announcement"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11.5px] text-text-primary font-medium hover:text-accent transition-colors flex items-center gap-1"
              >
                Follow <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </motion.div>

        {/* Review card — full width bottom */}
        <motion.div {...fadeUp(0.22)} className="col-span-12 lg:col-span-8">
          <div className="card overflow-hidden">
            {reviewSent ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <CheckCircle size={32} className="text-emerald-500" />
                <div>
                  <p className="text-[16px] font-semibold text-text-primary">Review submitted!</p>
                  <p className="text-[13px] text-text-muted mt-1">It will appear on the landing page.</p>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowReview(v => !v)}
                  className="w-full flex items-center gap-3 p-5 hover:bg-bg-elevated/50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-bg-muted flex items-center justify-center shrink-0">
                    <PenLine size={15} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-text-primary">Share your experience</p>
                    <p className="text-[12.5px] text-text-muted mt-0.5">Help other GTU students discover the app</p>
                  </div>
                  <ArrowRight size={15} className={`text-text-muted transition-transform ${showReview ? "rotate-90" : ""}`} />
                </button>

                {showReview && (
                  <form onSubmit={handleReviewSubmit} className="p-5 pt-2 space-y-4 border-t border-border">
                    <div>
                      <p className="text-[13px] font-medium text-text-primary mb-2">Rating</p>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setReviewStars(n)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              size={22}
                              className={n <= reviewStars ? "text-amber-400 fill-amber-400" : "text-text-muted/30"}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[13px] font-medium text-text-primary mb-2">Review</p>
                      <textarea
                        rows={3}
                        placeholder="How did Andaza help you in your exam..."
                        value={reviewQuote}
                        onChange={e => setReviewQuote(e.target.value)}
                        className="input min-h-[90px] py-3 resize-none"
                        required
                      />
                      <p className="text-[11px] text-text-muted mt-1">{reviewQuote.length} characters (min 20)</p>
                    </div>

                    <div>
                      <p className="text-[13px] font-medium text-text-primary mb-2">College <span className="text-text-muted font-normal">(optional)</span></p>
                      <input
                        type="text"
                        placeholder="LDRP Institute of Technology"
                        value={reviewCollege}
                        onChange={e => setReviewCollege(e.target.value)}
                        className="input"
                      />
                    </div>

                    {reviewError && (
                      <p className="text-[12.5px] text-status-error">{reviewError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={reviewSubmitting}
                      className="btn-primary"
                    >
                      {reviewSubmitting
                        ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        : <PenLine size={14} />}
                      {reviewSubmitting ? "Submitting..." : "Submit review"}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
