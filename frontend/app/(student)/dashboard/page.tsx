"use client";

import { useEffect, useState, useMemo } from "react";
import {
  // Swords,         // Brahmastra disabled — to be rebuilt
  ArrowRight, Upload, MessageSquare,
  BookOpen, FileQuestion, Sparkles, Star, PenLine, CheckCircle,
  Newspaper, ExternalLink, RefreshCw,
  // Flame, Trophy,  // coins/streak disabled
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
// import { DailyChallenge } from "@/components/ui/DailyChallenge";          // coins disabled
// import { notifyCoinsEarned, notifyStreakUpdated } from "@/lib/coinEvents"; // coins disabled

function fadeUp(delay = 0) {
  return {
    initial:    { opacity: 0, y: 14 },
    animate:    { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35, ease: "easeOut" },
  } as const;
}

interface UserProfile {
  full_name: string;
  branch: string;
  semester: number;
  enrollment_no: string;
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
  if (hour >= 22 || hour < 4) return `Raat ko bhi padh rahe ho, ${name}? 🌙`;
  if (hour < 9)  return `Subah subah ready ho, ${name}? ☀️`;
  if (hour < 14) return `${name}, aaj kya padha? 📚`;
  if (hour < 18) return `Exam ki taiyari kahan tak, ${name}? 🎯`;
  return `Sham ho gayi, ${name}. Time kam hai. ⚔️`;
}

const FEATURE_CARDS = [
  {
    href: "/predict",
    icon: Sparkles,
    label: "Andaza Laga",
    desc: "AI exam predictions from 8 years of GTU papers",
    color: "text-violet-400",
    border: "hover:border-violet-500/30",
    bg: "group-hover:bg-violet-500/5",
  },
  {
    href: "/chat",
    icon: MessageSquare,
    label: "Pooch Lo",
    desc: "Ask anything about GTU syllabus — instant answers",
    color: "text-sky-400",
    border: "hover:border-sky-500/30",
    bg: "group-hover:bg-sky-500/5",
  },
  {
    href: "/materials",
    icon: BookOpen,
    label: "Notes & Books",
    desc: "Student-uploaded notes, textbooks, slides",
    color: "text-emerald-400",
    border: "hover:border-emerald-500/30",
    bg: "group-hover:bg-emerald-500/5",
  },
  {
    href: "/question-bank",
    icon: FileQuestion,
    label: "PYQ Bank",
    desc: "Previous year GTU questions, all branches",
    color: "text-amber-400",
    border: "hover:border-amber-500/30",
    bg: "group-hover:bg-amber-500/5",
  },
  {
    href: "/my-uploads",
    icon: Upload,
    label: "Meri Files",
    desc: "Papers and materials you've uploaded",
    color: "text-pink-400",
    border: "hover:border-pink-500/30",
    bg: "group-hover:bg-pink-500/5",
  },
];

/* coins disabled
interface StreakData { current_streak: number; longest_streak: number; streak_freeze_count: number; }
interface CoinData   { balance: number; lifetime_earned: number; }
*/

export default function StudentDashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hour, setHour]       = useState(new Date().getHours());
  // const [streak, setStreak]   = useState<StreakData | null>(null);  // coins disabled
  // const [coins, setCoins]     = useState<CoinData | null>(null);    // coins disabled

  // Last-visited subject (populated by predict page via localStorage)
  const [lastSubject, setLastSubject] = useState<{ id: string; name: string } | null>(null);

  // GTU News
  interface NewsItem {
    id: string;
    title: string;
    date: string;
    source: string;
    url: string | null;
    preview: string | null;
    tag: string;
  }
  const [news,        setNews]        = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError,   setNewsError]   = useState(false);

  // Review state
  const [showReview,      setShowReview]      = useState(false);
  const [reviewStars,     setReviewStars]     = useState(5);
  const [reviewQuote,     setReviewQuote]     = useState("");
  const [reviewCollege,   setReviewCollege]   = useState("");
  const [reviewSubmitting,setReviewSubmitting]= useState(false);
  const [reviewSent,      setReviewSent]      = useState(false);
  const [reviewError,     setReviewError]     = useState("");

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

      // Restore last-used subject from predict page
      const lsId   = localStorage.getItem("gtu_last_subject_id");
      const lsName = localStorage.getItem("gtu_last_subject_name");
      if (lsId && lsName) setLastSubject({ id: lsId, name: lsName });

      // Fetch GTU news
      api.get("/news/gtu?limit=12")
        .then((d: { items: NewsItem[] }) => setNews(d.items || []))
        .catch(() => setNewsError(true))
        .finally(() => setNewsLoading(false));

      /* coins disabled — login reward + streak/coin fetch removed
      const [loginRes, streakRes, coinRes] = await Promise.allSettled([
        api.post("/coins/login-reward", {}),
        api.get("/streaks/me"),
        api.get("/coins/me"),
      ]);
      if (loginRes.status === "fulfilled" && !loginRes.value.already_claimed && loginRes.value.awarded > 0) {
        const bonus = loginRes.value.streak_bonus > 0 ? ` + ${loginRes.value.streak_bonus} streak bonus!` : "";
        toast.success(`+${loginRes.value.awarded - loginRes.value.streak_bonus} coins for logging in${bonus} 🪙`);
        notifyCoinsEarned(loginRes.value.balance);
        notifyStreakUpdated(loginRes.value.streak);
      }
      if (streakRes.status === "fulfilled") setStreak(streakRes.value);
      if (coinRes.status === "fulfilled")   setCoins(coinRes.value);
      */
    })();
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] || "Student";
  const greeting  = useMemo(() => getGreeting(firstName, hour), [firstName, hour]);
  const quote     = useMemo(() => getDailyQuote(), []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewQuote.trim().length < 20) {
      setReviewError("20 se zyada characters likhna zaroori hai.");
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
      toast.success("Review submit ho gaya! 🎉");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submit fail ho gaya";
      setReviewError(msg);
      toast.error(msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const TAG_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    timetable: { label: "Timetable", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    result:    { label: "Result",    color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20"    },
    form:      { label: "Form",      color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20"  },
    circular:  { label: "Circular",  color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20"},
    notice:    { label: "Notice",    color: "text-text-muted",  bg: "bg-bg-elevated border-border"         },
    holiday:   { label: "Holiday",   color: "text-pink-400",    bg: "bg-pink-500/10 border-pink-500/20"   },
  };

  const refreshNews = () => {
    setNewsLoading(true);
    setNewsError(false);
    api.get("/news/gtu?limit=12&force=true")
      .then((d: { items: typeof news }) => setNews(d.items || []))
      .catch(() => setNewsError(true))
      .finally(() => setNewsLoading(false));
  };

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Daily quote banner ── */}
      <motion.div {...fadeUp(0)} className="pt-4 mb-6">
        <div className="rounded-2xl border border-border bg-bg-card px-5 py-4 flex items-start gap-4">
          <span className="text-2xl shrink-0 mt-0.5">💡</span>
          <div>
            <p className="text-base font-medium text-text-primary leading-snug">
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className="text-xs text-text-muted mt-1.5">— {quote.author}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Greeting ── */}
      <motion.div {...fadeUp(0.05)} className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary leading-snug mb-3">
          {greeting}
        </h1>
        {profile && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-3 py-1 rounded-full border border-border text-text-muted bg-bg-card">
              {profile.branch}
            </span>
            <span className="text-xs px-3 py-1 rounded-full border border-border text-text-muted bg-bg-card">
              Sem {profile.semester}
            </span>
            {profile.enrollment_no && (
              <span className="text-xs text-text-muted font-mono">{profile.enrollment_no}</span>
            )}
          </div>
        )}
      </motion.div>

      {/* coins disabled — streak + coins bar removed
      {(streak || coins) && (
        <motion.div {...fadeUp(0.07)} className="mb-6 flex flex-wrap gap-3">
          {streak !== null && (
            <Link href="/leaderboard" className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/35 transition-colors">
              <Flame size={16} className={streak.current_streak >= 7 ? "text-orange-400" : "text-amber-400"} />
              <div>
                <p className="text-xs text-text-muted leading-none">Streak</p>
                <p className="text-sm font-bold text-text-primary leading-tight">{streak.current_streak} days</p>
              </div>
            </Link>
          )}
          {coins !== null && (
            <Link href="/coins" className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/35 transition-colors">
              <span className="text-base">🪙</span>
              <div>
                <p className="text-xs text-text-muted leading-none">Coins</p>
                <p className="text-sm font-bold text-amber-400 leading-tight">{coins.balance.toLocaleString()}</p>
              </div>
            </Link>
          )}
          {streak !== null && streak.current_streak > 0 && (
            <Link href="/leaderboard" className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-bg-card hover:border-accent/30 transition-colors">
              <Trophy size={16} className="text-violet-400" />
              <div>
                <p className="text-xs text-text-muted leading-none">Best streak</p>
                <p className="text-sm font-bold text-text-primary leading-tight">{streak.longest_streak} days</p>
              </div>
            </Link>
          )}
        </motion.div>
      )}
      */}

      {/* ── Main content — single column ── */}
      <div className="space-y-6">

          {/* Brahmastra hero card — disabled until Brahmastra is rebuilt
          <motion.div {...fadeUp(0.1)}>
          <Link href="/brahmastra" className="block">
            <div
              className="rounded-2xl border border-blue-500/25 p-6 relative overflow-hidden
                hover:border-blue-500/45 transition-all duration-200 group
                shadow-[0_0_40px_rgba(88,101,242,0.05)] hover:shadow-[0_0_50px_rgba(88,101,242,0.10)]"
              style={{ background: "linear-gradient(135deg, rgba(88,101,242,0.09) 0%, rgba(88,101,242,0.02) 100%)" }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 10% 90%, rgba(88,101,242,0.12) 0%, transparent 55%)" }}
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/25">
                      <Swords size={22} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-text-primary">Brahmastra</p>
                      <p className="text-sm text-blue-400/80 italic">Sirf wahi jo aayega.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 group-hover:bg-blue-400 transition-colors text-white text-sm font-semibold shadow-[0_0_20px_rgba(88,101,242,0.25)]">
                    Activate <ArrowRight size={14} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { fire: "🔥🔥🔥", label: "Almost Certain", pct: "90%+", color: "text-blue-400", bg: "bg-blue-500/8 border-blue-500/20" },
                    { fire: "🔥🔥",   label: "Highly Likely",  pct: "70%+", color: "text-sky-400",    bg: "bg-sky-500/8 border-sky-500/20"       },
                    { fire: "🔥",    label: "Watch Out",       pct: "50%+", color: "text-violet-400", bg: "bg-violet-500/8 border-violet-500/20" },
                  ].map((row) => (
                    <div key={row.label} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${row.bg}`}>
                      <span className="text-xl shrink-0">{row.fire}</span>
                      <div className="min-w-0">
                        <p className="text-xs text-text-muted leading-tight">{row.label}</p>
                        <p className={`text-sm font-bold ${row.color}`}>{row.pct}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Link>
          </motion.div>
          */}

          {/* Daily challenge — coins disabled
          <DailyChallenge onCoinsEarned={(n) => setCoins(prev => prev ? { ...prev, balance: prev.balance + n } : prev)} />
          */}

          {/* Continue where you left off */}
          {lastSubject && (
            <motion.div {...fadeUp(0.12)}>
              <Link
                href={`/predict?subject=${lastSubject.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-accent/25 bg-accent/5 hover:border-accent/45 hover:bg-accent/8 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center shrink-0">
                    <Sparkles size={17} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-text-muted font-medium">Continue where you left off</p>
                    <p className="text-sm font-semibold text-text-primary mt-0.5">{lastSubject.name}</p>
                  </div>
                </div>
                <ArrowRight size={15} className="text-text-muted group-hover:text-accent transition-colors shrink-0" />
              </Link>
            </motion.div>
          )}

          {/* Feature cards */}
          <motion.div {...fadeUp(0.17)}>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">
              Features
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {FEATURE_CARDS.map(({ href, icon: Icon, label, desc, color, border, bg }) => (
                <motion.div
                  key={href}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Link
                    href={href}
                    className={`group flex flex-col gap-3 p-5 rounded-2xl bg-bg-card border border-border h-full
                      ${border} transition-colors duration-150`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center shrink-0 ${bg} transition-colors`}>
                      <Icon size={18} className={color} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{label}</p>
                      <p className="text-xs text-text-muted mt-1 leading-snug">{desc}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── GTU Latest News ── */}
          <motion.div {...fadeUp(0.21)}>
            <div className="rounded-2xl border border-border bg-bg-card overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center shrink-0">
                    <Newspaper size={15} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">GTU Latest Updates</p>
                    <p className="text-xs text-text-muted">Circulars, timetables, results</p>
                  </div>
                </div>
                <button
                  onClick={refreshNews}
                  disabled={newsLoading}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-40"
                  title="Refresh news"
                >
                  <RefreshCw size={13} className={newsLoading ? "animate-spin" : ""} />
                </button>
              </div>

              {/* News list */}
              <div className="divide-y divide-border/40">
                {newsLoading && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                      <div className="w-16 h-4 rounded bg-bg-elevated animate-pulse shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-3/4 rounded bg-bg-elevated animate-pulse" />
                        <div className="h-3 w-1/3 rounded bg-bg-elevated animate-pulse" />
                      </div>
                    </div>
                  ))
                )}

                {newsError && !newsLoading && (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm text-text-muted">Could not load news.</p>
                    <button onClick={refreshNews} className="mt-2 text-xs text-accent hover:underline">
                      Try again
                    </button>
                  </div>
                )}

                {!newsLoading && !newsError && news.map((item) => {
                  const tag = TAG_CONFIG[item.tag] || TAG_CONFIG.notice;
                  const dateStr = item.date
                    ? new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "";
                  return (
                    <div key={item.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-bg-elevated/50 transition-colors group">
                      {/* Tag badge */}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap shrink-0 mt-0.5 ${tag.bg} ${tag.color}`}>
                        {tag.label}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary leading-snug line-clamp-2">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {dateStr && (
                            <span className="text-[11px] text-text-muted">{dateStr}</span>
                          )}
                          <span className="text-[11px] text-text-muted/50">·</span>
                          <span className="text-[11px] text-text-muted/60">{item.source}</span>
                        </div>
                      </div>

                      {/* Link */}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="shrink-0 p-1.5 rounded-lg text-text-muted/40 group-hover:text-accent transition-colors"
                          title="Open"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  );
                })}

                {!newsLoading && !newsError && news.length === 0 && (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm text-text-muted">No news available right now.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {!newsLoading && news.length > 0 && (
                <div className="px-5 py-3 border-t border-border/40 flex items-center justify-between">
                  <p className="text-xs text-text-muted/50">Updates from GTU official site + Telegram</p>
                  <a
                    href="https://t.me/gtu_announcement"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline flex items-center gap-1"
                  >
                    Follow channel <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>
          </motion.div>

          {/* Review card — bottom of page */}
          <motion.div {...fadeUp(0.24)}>
          <div className="rounded-2xl border border-border bg-bg-card overflow-hidden">
        {reviewSent ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle size={32} className="text-emerald-400" />
            <div>
              <p className="text-base font-semibold text-text-primary">Review submit ho gaya! 🎉</p>
              <p className="text-sm text-text-muted mt-1">Landing page pe dikhega.</p>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowReview(v => !v)}
              className="w-full flex items-center gap-3.5 px-5 py-4 hover:bg-bg-elevated transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center shrink-0">
                <PenLine size={16} className="text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">Apna experience share karo</p>
                <p className="text-xs text-text-muted mt-0.5">Review likhne se dusre students ko help hoti hai</p>
              </div>
              <ArrowRight size={14} className={`text-text-muted transition-transform duration-200 ${showReview ? "rotate-90" : ""}`} />
            </button>

            {showReview && (
              <form onSubmit={handleReviewSubmit} className="px-5 pb-5 space-y-4 border-t border-border/60">
                {/* Stars */}
                <div className="pt-4">
                  <p className="text-xs text-text-muted mb-2">Rating</p>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewStars(n)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          size={24}
                          className={n <= reviewStars ? "text-amber-400 fill-amber-400" : "text-text-muted"}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Review text */}
                <div>
                  <p className="text-xs text-text-muted mb-1.5">Review *</p>
                  <textarea
                    rows={3}
                    placeholder="Andaza ne kaise help kiya exam mein..."
                    value={reviewQuote}
                    onChange={e => setReviewQuote(e.target.value)}
                    className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary
                      placeholder:text-text-muted focus:outline-none focus:border-accent/50 resize-none transition-colors"
                    required
                  />
                  <p className="text-xs text-text-muted mt-1">{reviewQuote.length} chars (min 20)</p>
                </div>

                {/* College */}
                <div>
                  <p className="text-xs text-text-muted mb-1.5">College (optional)</p>
                  <input
                    type="text"
                    placeholder="LDRP Institute of Technology"
                    value={reviewCollege}
                    onChange={e => setReviewCollege(e.target.value)}
                    className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary
                      placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>

                {reviewError && (
                  <p className="text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-2.5">
                    {reviewError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {reviewSubmitting
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <PenLine size={14} />}
                  {reviewSubmitting ? "Submitting..." : "Review Submit Karo"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
          </motion.div>

      </div>{/* end main content */}
    </div>
  );
}
