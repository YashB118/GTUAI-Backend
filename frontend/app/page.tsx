import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight, Star, Mail, MapPin, Clock,
  Swords, Flame, Zap, BookOpen, MessageSquare, FileText, BarChart3,
} from "lucide-react";
import ContactForm from "@/components/landing/ContactForm";

interface TestimonialData {
  id: string;
  name: string;
  branch: string | null;
  semester: number | null;
  college: string | null;
  quote: string;
  stars: number;
}

const AVATAR_COLORS = [
  "bg-orange-500/20 text-orange-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-amber-500/20 text-amber-400",
  "bg-blue-500/20 text-blue-400",
  "bg-violet-500/20 text-violet-400",
  "bg-pink-500/20 text-pink-400",
];

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
}

const FEATURES = [
  {
    icon: Swords,
    title: "Brahmastra Mode",
    desc: "AI reads 8 years of GTU patterns. Top 7 questions with fire-confidence scores. Study wahi jo aayega.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    icon: Flame,
    title: "Pattern Intelligence",
    desc: "Bayesian scoring across frequency, cycle gaps, streaks — not random. Every question ranked by real probability.",
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  {
    icon: FileText,
    title: "8-Year Question Bank",
    desc: "GTU papers, all branches, parsed and searchable. Unit-wise, marks-wise, type-wise — sab kuch.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Zap,
    title: "Instant AI Answers",
    desc: "Any GTU question → marks-aware structured answer. GTU examiner style, keywords included.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    icon: MessageSquare,
    title: "GTU Chat Assistant",
    desc: "AI jo samajhta hai GTU syllabus. Explanation, summary, exam tips — subject-aware.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: BookOpen,
    title: "Study Materials",
    desc: "Student-uploaded notes, textbooks, slides — peer reviewed. Share karo, use karo.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: BarChart3,
    title: "Unit Analytics",
    desc: "Kaunsa unit sabse zyada aata hai. Kaunsa 3 saal se nahi aaya. Data se padho.",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
];

const STEPS = [
  {
    step: "01",
    emoji: "🎯",
    title: "Branch & semester set karo",
    desc: "30 second setup. CE, IT, ME, Civil, EE, EC, Diploma — sab hai. Sirf ek baar.",
  },
  {
    step: "02",
    emoji: "⚔️",
    title: "Brahmastra activate karo",
    desc: "AI 8 saal ke patterns analyze karta hai. Bayesian scoring, cycle analysis, unit gaps — sab.",
  },
  {
    step: "03",
    emoji: "🔥",
    title: "Sirf 7 questions padho",
    desc: "Top questions with confidence %. 'Baasi Hai' badge for overdue topics. Study karo, pass ho jao.",
  },
];

const CHAT_BUBBLES = [
  { side: "right" as const, text: "Bhai Andaza ne 5 questions predict kiye the 🔥", time: "10:42 PM" },
  { side: "left"  as const, text: "Seriously? Kitne aaye?", time: "10:43 PM" },
  { side: "right" as const, text: "4 aaye bhai! OSI model, TCP/IP, subnetting — sab 🔥🔥", time: "10:43 PM" },
  { side: "left"  as const, text: "Link de bhai sabko share karna hai", time: "10:44 PM" },
  { side: "right" as const, text: "Ek sec, share karta hun 📲", time: "10:44 PM" },
];

const STATS = [
  { value: "8+",   label: "Saal ke Papers" },
  { value: "78%",  label: "Prediction Accuracy" },
  { value: "9",    label: "Branches" },
  { value: "Free", label: "Students ke liye" },
];

const BRAHMASTRA_PREVIEW = [
  { fires: "🔥🔥🔥", q: "OSI Reference Model (7 layers explain karo)", pct: 92, badge: "Baasi Hai", unit: 4 },
  { fires: "🔥🔥🔥", q: "TCP/IP vs OSI — comparison with diagram",      pct: 88, badge: null,       unit: 4 },
  { fires: "🔥🔥",   q: "Subnetting with VLSM — numerical",              pct: 74, badge: null,       unit: 5 },
  { fires: "🔥🔥",   q: "Congestion Control mechanisms",                  pct: 68, badge: "Baasi Hai",unit: 6 },
  { fires: "🔥",    q: "CSMA/CD working with example",                   pct: 51, badge: null,       unit: 3 },
];

export default async function RootPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    const role = session.user.user_metadata?.role || "student";
    redirect(role === "admin" ? "/admin/dashboard" : "/dashboard");
  }

  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  let testimonials: TestimonialData[] = [];
  try {
    const res = await fetch(`${BACKEND}/testimonials`, { cache: "no-store" });
    if (res.ok) testimonials = await res.json();
  } catch {}

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary overflow-x-hidden">

      {/* ─── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-bg-primary/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <Swords size={14} className="text-orange-400" />
            </div>
            <span className="text-[15px] font-bold tracking-tight">Andaza</span>
            <span className="hidden sm:inline text-[11px] text-text-muted ml-1">by GTU ExamAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5">
              Sign In
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors"
            >
              Start Free <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,92,26,0.12) 0%, transparent 65%)" }} />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/25 bg-orange-500/8 mb-6">
            <Swords size={12} className="text-orange-400" />
            <span className="text-xs font-semibold text-orange-400">GTU Students ka Secret Weapon ⚔️</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
            Kya aayega{" "}
            <span style={{ background: "linear-gradient(135deg, #FF5C1A 0%, #FF9A3C 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              exam mein?
            </span>
            <br />Hum bata denge.
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed mb-8 max-w-xl mx-auto">
            8 saal ke GTU past papers ka AI analysis.<br />
            <span className="text-text-primary font-medium">Sirf wahi jo aayega — kuch nahi.</span>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Link
              href="/register"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold text-[15px] transition-all shadow-[0_0_30px_rgba(255,92,26,0.3)] hover:shadow-[0_0_40px_rgba(255,92,26,0.4)]"
            >
              <Swords size={16} /> Brahmastra Activate Karo
            </Link>
            <a href="#how-it-works" className="px-6 py-3.5 rounded-xl border border-border text-text-secondary hover:text-text-primary text-[15px] transition-colors">
              Kaise kaam karta hai? ↓
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-text-muted mb-6">
            {STATS.map(({ value, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="font-bold text-text-primary text-base">{value}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {["CE", "IT", "ME", "Civil", "EE", "EC", "Diploma", "+more"].map(b => (
              <span key={b} className="px-2.5 py-1 rounded-full text-[11px] border border-border text-text-muted bg-bg-card">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WhatsApp Social Proof ───────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Students ki baatein</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">&ldquo;Bhai, share kar isko sab ko&rdquo;</h2>
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-border shadow-lg">
              <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">CE</div>
                <div>
                  <p className="text-white font-semibold text-sm">CE 5th Sem 🔥</p>
                  <p className="text-white/70 text-[11px]">47 members</p>
                </div>
              </div>
              <div className="bg-[#ECE5DD] px-3 py-3 space-y-2">
                {CHAT_BUBBLES.map((b, i) => (
                  <div key={i} className={`flex ${b.side === "right" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] px-3 py-2 rounded-xl text-[13px] shadow-sm leading-snug ${b.side === "right" ? "bg-[#DCF8C6] text-[#1a1a1a] rounded-br-none" : "bg-white text-[#1a1a1a] rounded-bl-none"}`}>
                      {b.text}
                      <p className="text-[10px] text-[#999] text-right mt-0.5">{b.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Process</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Teen steps. Bas.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map(({ step, emoji, title, desc }) => (
              <div key={step} className="rounded-2xl border border-border bg-bg-card p-6 relative">
                <div className="text-3xl mb-4">{emoji}</div>
                <div className="absolute top-4 right-4 text-[11px] font-mono text-text-muted">{step}</div>
                <h3 className="font-semibold text-[15px] mb-2 text-text-primary">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Brahmastra Preview ──────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-400/80 mb-2">Live Preview</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Aisa dikhta hai <span className="text-orange-400">Brahmastra</span>
            </h2>
            <p className="text-text-secondary text-sm mt-2">Computer Networks · 5th Sem · CE Branch</p>
          </div>
          <div className="rounded-2xl border border-orange-500/20 bg-bg-card overflow-hidden shadow-[0_0_40px_rgba(255,92,26,0.08)]">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <Swords size={14} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Brahmastra</p>
                  <p className="text-[11px] text-text-muted">47 papers analyzed · 7 questions</p>
                </div>
              </div>
              <div className="text-xs text-orange-400 font-medium">3/7 padha ✅</div>
            </div>
            <div className="mx-4 mt-4 rounded-xl border border-amber-500/20 bg-amber-500/6 px-4 py-3">
              <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider mb-1">Professor ki note</p>
              <p className="text-xs text-text-secondary leading-relaxed">Unit 4 OSI model 3 saal se nahi aaya — pakka aayega. TCP/IP har saal hai, skip mat karna.</p>
            </div>
            <div className="p-4 space-y-2.5">
              {BRAHMASTRA_PREVIEW.map((item, i) => (
                <div key={i} className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${i >= 3 ? "opacity-50" : ""} ${i === 0 ? "border-orange-500/30 bg-orange-500/5" : "border-border bg-bg-elevated"}`}>
                  <span className="text-base shrink-0 mt-0.5">{item.fires}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary leading-snug">{item.q}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-text-muted">Unit {item.unit}</span>
                      {item.badge && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/25">{item.badge}</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${item.pct >= 78 ? "text-orange-400" : item.pct >= 55 ? "text-sky-400" : "text-violet-400"}`}>{item.pct}%</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center justify-between">
              <p className="text-xs text-text-muted italic">Sirf wahi jo aayega.</p>
              <span className="text-[11px] text-emerald-400 font-medium">Share karo 📲</span>
            </div>
          </div>
          <div className="text-center mt-6">
            <Link href="/register" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors">
              Apna Brahmastra banao →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Andar kya hai</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Sirf exam survival ke liye bana hai</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="rounded-2xl border border-border bg-bg-card p-6 hover:border-border/80 transition-colors">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                  <Icon size={18} className={color} />
                </div>
                <h3 className="font-semibold text-[15px] mb-2 text-text-primary">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ───────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Student Reviews</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">GTU students ka experience</h2>
          </div>
          {testimonials.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
              <div className="text-4xl">📝</div>
              <div>
                <p className="text-text-primary font-semibold mb-1">Abhi koi review nahi hai</p>
                <p className="text-sm text-text-secondary">Pehle GTU student bano jo review likhe.</p>
              </div>
              <Link href="/register" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-400 transition-colors">
                Sign up & review likho <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {testimonials.map((t, idx) => {
                const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const roleLabel = [t.branch, t.semester ? `Sem ${t.semester}` : null].filter(Boolean).join(" · ");
                return (
                  <div key={t.id} className="rounded-2xl border border-border bg-bg-card p-6 flex flex-col gap-4 hover:border-orange-500/20 transition-all">
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.stars }).map((_, i) => <Star key={i} size={13} className="text-amber-400 fill-amber-400" />)}
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                    <div className="flex items-center gap-3 pt-2 border-t border-border/60">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>{getInitials(t.name)}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{t.name}</p>
                        {roleLabel && <p className="text-xs text-text-muted truncate">{roleLabel}</p>}
                        {t.college && <p className="text-[10px] text-text-muted/70 truncate">{t.college}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── Contact ─────────────────────────────────────────────────────────── */}
      <section id="contact" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Baat karo</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Koi sawaal? Bolo.</h2>
          </div>
          <div className="grid md:grid-cols-5 gap-10">
            <div className="md:col-span-2 space-y-5">
              <div className="rounded-2xl border border-border bg-bg-card p-6 space-y-5">
                {[
                  { icon: Mail,   label: "Email",      value: "yashbonde21@gmail.com", href: "mailto:yashbonde21@gmail.com" },
                  { icon: MapPin, label: "Banaya hai", value: "GTU students ke liye\nBE & Diploma — sab", href: null },
                  { icon: Clock,  label: "Reply time", value: "24 ghante mein",         href: null },
                ].map(({ icon: Icon, label, value, href }) => (
                  <div key={label} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary mb-0.5">{label}</p>
                      {href ? (
                        <a href={href} className="text-sm text-text-secondary hover:text-orange-400 transition-colors">{value}</a>
                      ) : (
                        <p className="text-sm text-text-secondary whitespace-pre-line">{value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-3 rounded-2xl border border-border bg-bg-card p-7">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <div
            className="rounded-3xl border border-orange-500/20 p-12 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(255,92,26,0.08) 0%, rgba(255,92,26,0.02) 100%)" }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,92,26,0.15) 0%, transparent 60%)" }} />
            <div className="relative">
              <div className="text-5xl mb-5">⚔️</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                Agle exam mein<br />bachna hai?
              </h2>
              <p className="text-text-secondary mb-8">Free hai. No credit card.<br />GTU ke sabhi branches ke liye.</p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-400 transition-all text-base shadow-[0_0_30px_rgba(255,92,26,0.3)]"
              >
                Abhi Sign Up Karo — Free Hai <ArrowRight size={18} />
              </Link>
              <p className="text-xs text-text-muted mt-4 italic">Sirf wahi jo aayega.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-bold text-[15px] tracking-tight">
            <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center">
              <Swords className="text-orange-400" size={14} />
            </div>
            Andaza
            <span className="text-text-muted font-normal text-xs ml-1">by GTU ExamAI</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-sm text-text-muted">
            <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-text-primary transition-colors">Kaise kaam karta hai</a>
            <a href="#testimonials" className="hover:text-text-primary transition-colors">Reviews</a>
            <a href="#contact" className="hover:text-text-primary transition-colors">Contact</a>
            <Link href="/login" className="hover:text-text-primary transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-text-primary transition-colors">Register</Link>
          </nav>
          <p className="text-xs text-text-muted">© {new Date().getFullYear()} Andaza · GTU students ke liye</p>
        </div>
      </footer>

    </div>
  );
}
