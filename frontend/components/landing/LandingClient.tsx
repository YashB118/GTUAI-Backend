"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Star, Mail, MapPin, Clock,
  Swords, Flame, Zap, BookOpen, MessageSquare, FileText, BarChart3,
} from "lucide-react";
import ContactForm from "@/components/landing/ContactForm";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { GlowCard } from "@/components/ui/GlowCard";
import { AndazeSeLogo } from "@/components/ui/AndazeSeLogo";
import { t, type Lang } from "@/lib/translations";

const BLUE = "#5865F2";

const FEATURE_ICONS = [Swords, Flame, FileText, Zap, MessageSquare, BookOpen, BarChart3];
const FEATURE_COLORS = ["text-blue-400","text-pink-400","text-green-400","text-yellow-400","text-violet-400","text-sky-400","text-emerald-400"];
const FEATURE_GLOWS  = ["rgba(88,101,242,0.18)","rgba(235,69,158,0.15)","rgba(87,242,135,0.13)","rgba(254,231,92,0.13)","rgba(139,92,246,0.15)","rgba(56,189,248,0.13)","rgba(52,211,153,0.13)"];

const AVATAR_COLORS = ["bg-blue-500/20 text-blue-400","bg-violet-500/20 text-violet-400","bg-emerald-500/20 text-emerald-400","bg-pink-500/20 text-pink-400","bg-amber-500/20 text-amber-400","bg-sky-500/20 text-sky-400"];
const STATS_VALUES = ["8+", "78%", "9", "Free"];
const PREVIEW_QUESTIONS = [
  { fires: "🔥🔥🔥", q: "OSI Reference Model explain karo",     pct: 92, unit: 4, badge: "Baasi Hai" },
  { fires: "🔥🔥🔥", q: "TCP/IP vs OSI — comparison + diagram", pct: 88, unit: 4, badge: null },
  { fires: "🔥🔥",   q: "Subnetting with VLSM numerical",        pct: 74, unit: 5, badge: null },
];
const CHAT_BUBBLES = [
  { side: "right" as const, text: "Bhai Andaze Se ne 5 questions predict kiye 🔥", time: "10:42 PM" },
  { side: "left"  as const, text: "Seriously? Kitne aaye?",                          time: "10:43 PM" },
  { side: "right" as const, text: "4 aaye! OSI model, TCP/IP, subnetting ✨",       time: "10:43 PM" },
  { side: "left"  as const, text: "Link de bhai, sabko share karna hai",              time: "10:44 PM" },
  { side: "right" as const, text: "Ek sec, share karta hun 📲",                       time: "10:44 PM" },
];

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
}

interface TestimonialData {
  id: string; name: string; branch: string | null;
  semester: number | null; college: string | null;
  quote: string; stars: number;
}

export default function LandingClient({ testimonials }: { testimonials: TestimonialData[] }) {
  const [lang, setLang] = useState<Lang>("en");
  const tr = t[lang];

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#07070F" }}>
      <div className="grain-overlay" aria-hidden="true" />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06]"
        style={{ background: "rgba(7,7,15,0.85)", backdropFilter: "blur(24px)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <AndazeSeLogo size="lg" />
          <div className="flex items-center gap-3">
            {/* Language switcher in navbar */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
              {(["en","hi","gu"] as Lang[]).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className="px-2.5 py-1 rounded-md text-xs font-black transition-all"
                  style={lang === l
                    ? { background: BLUE, color: "white" }
                    : { color: "rgba(255,255,255,0.4)" }}>
                  {l === "en" ? "EN" : l === "hi" ? "हि" : "ગુ"}
                </button>
              ))}
            </div>
            <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors px-3 py-1.5 font-semibold hidden sm:block">
              {tr.signIn}
            </Link>
            <Link href="/register"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-white text-sm font-black transition-all hover:opacity-90"
              style={{ background: BLUE, boxShadow: "0 0 20px rgba(88,101,242,0.35)" }}>
              {tr.startFree} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="orb-1 absolute w-[700px] h-[700px] rounded-full -top-40 -left-40 opacity-20"
            style={{ background: `radial-gradient(circle, ${BLUE} 0%, transparent 65%)`, filter: "blur(100px)" }} />
          <div className="orb-2 absolute w-[500px] h-[500px] rounded-full top-0 right-0 opacity-15"
            style={{ background: "radial-gradient(circle, #7289DA 0%, transparent 70%)", filter: "blur(90px)" }} />
          <div className="orb-3 absolute w-[400px] h-[400px] rounded-full bottom-0 left-1/2 opacity-10"
            style={{ background: "radial-gradient(circle, #EB459E 0%, transparent 70%)", filter: "blur(80px)" }} />
        </div>

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7 text-xs font-bold"
              style={{ background: "rgba(88,101,242,0.1)", border: "1px solid rgba(88,101,242,0.28)" }}>
              <span style={{ color: BLUE }}>✦</span>
              <span style={{ color: "#7289DA" }}>{tr.badge}</span>
            </div>

            <h1 className="font-black leading-[1.08] mb-6 tracking-tight"
              style={{ fontSize: "clamp(36px, 5vw, 66px)" }}>
              <span className="text-white">{tr.h1}</span><br />
              <span className="text-white">{tr.h2}</span><br />
              <span style={{
                background: `linear-gradient(135deg, ${BLUE} 0%, #7289DA 50%, #EB459E 100%)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                fontStyle: "italic",
              }}>{tr.h3}</span>
            </h1>

            <p className="text-white/45 text-lg leading-relaxed mb-9 max-w-xl font-medium">{tr.sub}</p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/register"
                className="cta-glow flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-white font-black text-base transition-all hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #7289DA 100%)` }}>
                <Swords size={17} /> {tr.cta1}
              </Link>
              <a href="#how-it-works"
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white/55 hover:text-white text-base font-bold transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                {tr.cta2}
              </a>
            </div>

            <div className="flex flex-wrap gap-8 mb-8">
              {STATS_VALUES.map((val, i) => (
                <div key={i}>
                  <div className="text-2xl font-black text-white mb-0.5">{val}</div>
                  <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">{tr.stats[i]}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {["CE","IT","ME","Civil","EE","EC","Diploma","+more"].map(b => (
                <span key={b} className="px-3 py-1.5 rounded-full text-xs text-white/35 font-bold"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>{b}</span>
              ))}
            </div>
          </div>

          {/* Illustration */}
          <div className="hidden lg:flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full opacity-20 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${BLUE} 0%, transparent 70%)`, filter: "blur(60px)" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/illustrations/studying.svg" alt="Student studying"
              className="relative z-10 w-full max-w-[500px]"
              style={{ filter: "drop-shadow(0 0 40px rgba(88,101,242,0.2))" }} />
          </div>
        </div>
      </section>

      {/* ── Product preview ── */}
      <section className="py-4 px-6 relative overflow-hidden">
        <div className="max-w-2xl mx-auto relative">
          <RevealOnScroll>
            <div className="rounded-3xl overflow-hidden shadow-[0_40px_100px_rgba(88,101,242,0.15)]"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(88,101,242,0.2)", backdropFilter: "blur(20px)" }}>
              <div className="px-5 py-4 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl" style={{ background: "rgba(88,101,242,0.15)", border: "1px solid rgba(88,101,242,0.25)" }}>
                    <Swords size={16} style={{ color: BLUE }} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">Brahmastra</p>
                    <p className="text-[11px] text-white/30 font-semibold">{tr.previewSub}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400">3/7 {tr.studied} ✅</span>
                  <div className="h-4 w-px bg-white/10"/>
                  <span className="text-xs text-white/30 font-semibold">47 {tr.analyzed}</span>
                </div>
              </div>
              <div className="mx-5 mt-4 rounded-2xl px-4 py-3"
                style={{ background: "rgba(254,231,92,0.05)", border: "1px solid rgba(254,231,92,0.12)" }}>
                <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "rgba(254,231,92,0.6)" }}>{tr.professorNote}</p>
                <p className="text-xs text-white/45 leading-relaxed font-semibold">{tr.professorNoteText}</p>
              </div>
              <div className="p-4 space-y-2.5">
                {PREVIEW_QUESTIONS.map((item, i) => (
                  <div key={i} className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
                    style={{
                      background: i === 0 ? "rgba(88,101,242,0.08)" : "rgba(255,255,255,0.02)",
                      border: i === 0 ? "1px solid rgba(88,101,242,0.22)" : "1px solid rgba(255,255,255,0.05)",
                    }}>
                    <span className="text-lg shrink-0">{item.fires}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 font-semibold truncate">{item.q}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-white/25 font-semibold">Unit {item.unit}</span>
                        {item.badge && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(235,69,158,0.12)", color: "#EB459E", border: "1px solid rgba(235,69,158,0.2)" }}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-black shrink-0" style={{ color: BLUE }}>{item.pct}%</span>
                  </div>
                ))}
                <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3 opacity-20 pointer-events-none select-none"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", filter: "blur(3px)" }}>
                  <span className="text-lg">🔥🔥</span>
                  <div className="flex-1 h-3 rounded-full bg-white/20"/>
                  <span className="text-sm font-black" style={{ color: "#7289DA" }}>68%</span>
                </div>
              </div>
              <div className="px-5 py-4 flex items-center justify-between"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-xs text-white/20 italic font-semibold">{tr.tagline}</p>
                <Link href="/register"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-black transition-all hover:opacity-90"
                  style={{ background: BLUE }}>
                  {tr.buildYours} <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb-3 absolute w-[400px] h-[400px] rounded-full right-0 top-1/2 -translate-y-1/2 opacity-10"
            style={{ background: "radial-gradient(circle, #57F287 0%, transparent 70%)", filter: "blur(90px)" }} />
        </div>
        <div className="max-w-5xl mx-auto relative grid lg:grid-cols-2 gap-16 items-center">
          <RevealOnScroll>
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-4">Students ki baatein</p>
            <h2 className="font-black tracking-tight text-white mb-6" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>
              {tr.studentChat}
            </h2>
            <p className="text-white/35 text-lg font-semibold leading-relaxed">{tr.studentChatSub}</p>
          </RevealOnScroll>
          <RevealOnScroll delay={120}>
            <div className="rounded-3xl overflow-hidden shadow-2xl max-w-sm mx-auto lg:mx-0"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="px-4 py-3.5 flex items-center gap-3 bg-[#075E54]">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xs font-black text-white">CE</div>
                <div>
                  <p className="text-white font-black text-sm">CE 5th Sem 🔥</p>
                  <p className="text-white/60 text-[11px] font-semibold">47 members</p>
                </div>
              </div>
              <div className="px-3 py-4 space-y-2.5 bg-[#ECE5DD]">
                {CHAT_BUBBLES.map((b, i) => (
                  <div key={i} className={`flex ${b.side === "right" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-snug font-semibold shadow-sm
                      ${b.side === "right" ? "bg-[#DCF8C6] text-[#1a1a1a] rounded-br-sm" : "bg-white text-[#1a1a1a] rounded-bl-sm"}`}>
                      {b.text}
                      <p className="text-[10px] text-black/30 text-right mt-1">{b.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb-1 absolute w-[500px] h-[500px] rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-8"
            style={{ background: `radial-gradient(circle, ${BLUE} 0%, transparent 70%)`, filter: "blur(100px)" }} />
        </div>
        <div className="max-w-5xl mx-auto relative">
          <RevealOnScroll className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-3">{tr.howBadge}</p>
            <h2 className="font-black tracking-tight text-white" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>{tr.howTitle}</h2>
          </RevealOnScroll>
          <div className="grid md:grid-cols-3 gap-5">
            {tr.steps.map(({ emoji, title, desc }, i) => (
              <RevealOnScroll key={i} delay={i * 100}>
                <div className="relative p-7 rounded-3xl h-full transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
                  <div className="text-4xl mb-5">{emoji}</div>
                  <div className="absolute top-5 right-5 text-[11px] font-black text-white/15">0{i+1}</div>
                  <h3 className="font-black text-base mb-2 text-white">{title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed font-semibold">{desc}</p>
                  <div className="absolute bottom-0 left-8 right-8 h-px"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(88,101,242,0.5), transparent)" }} />
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb-2 absolute w-[500px] h-[500px] rounded-full left-0 top-1/2 -translate-y-1/2 opacity-8"
            style={{ background: "radial-gradient(circle, #7289DA 0%, transparent 70%)", filter: "blur(100px)" }} />
        </div>
        <div className="max-w-6xl mx-auto relative">
          <RevealOnScroll className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-3">{tr.featBadge}</p>
            <h2 className="font-black tracking-tight text-white" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>{tr.featTitle}</h2>
          </RevealOnScroll>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tr.features.map(({ title, desc }, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <RevealOnScroll key={title} delay={i * 60}>
                  <GlowCard glowColor={FEATURE_GLOWS[i]} borderHoverColor={FEATURE_GLOWS[i].replace(/[\d.]+\)$/, "0.5)")}>
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                      style={{ background: FEATURE_GLOWS[i], border: "1px solid rgba(255,255,255,0.08)" }}>
                      <Icon size={19} className={FEATURE_COLORS[i]} />
                    </div>
                    <h3 className="font-black text-[15px] mb-2 text-white">{title}</h3>
                    <p className="text-sm text-white/40 leading-relaxed font-semibold">{desc}</p>
                  </GlowCard>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb-3 absolute w-[400px] h-[400px] rounded-full right-0 bottom-0 opacity-10"
            style={{ background: "radial-gradient(circle, #EB459E 0%, transparent 70%)", filter: "blur(80px)" }} />
        </div>
        <div className="max-w-6xl mx-auto relative">
          <RevealOnScroll className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-3">{tr.revBadge}</p>
            <h2 className="font-black tracking-tight text-white" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>{tr.revTitle}</h2>
          </RevealOnScroll>
          {testimonials.length === 0 ? (
            <div className="flex flex-col items-center gap-5 py-16 text-center">
              <div className="text-5xl">📝</div>
              <div>
                <p className="font-black text-white mb-1">{tr.revEmpty}</p>
                <p className="text-sm text-white/40 font-semibold">{tr.revEmptySub}</p>
              </div>
              <Link href="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-black transition-all hover:scale-105"
                style={{ background: BLUE, boxShadow: "0 0 20px rgba(88,101,242,0.3)" }}>
                {tr.revCta} <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testimonials.map((tt, idx) => {
                const roleLabel = [tt.branch, tt.semester ? `Sem ${tt.semester}` : null].filter(Boolean).join(" · ");
                return (
                  <RevealOnScroll key={tt.id} delay={idx * 60}>
                    <div className="p-6 rounded-3xl flex flex-col gap-4 transition-all duration-300 hover:scale-[1.02]"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}>
                      <div className="flex gap-1">
                        {Array.from({ length: tt.stars }).map((_, i) => <Star key={i} size={12} className="text-yellow-400 fill-yellow-400" />)}
                      </div>
                      <p className="text-sm text-white/50 leading-relaxed flex-1 font-semibold">&ldquo;{tt.quote}&rdquo;</p>
                      <div className="flex items-center gap-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                          {getInitials(tt.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white truncate">{tt.name}</p>
                          {roleLabel && <p className="text-xs text-white/30 font-semibold truncate">{roleLabel}</p>}
                          {tt.college && <p className="text-[10px] text-white/20 font-semibold truncate">{tt.college}</p>}
                        </div>
                      </div>
                    </div>
                  </RevealOnScroll>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <RevealOnScroll className="text-center mb-14">
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-3">{tr.contactBadge}</p>
            <h2 className="font-black tracking-tight text-white" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>{tr.contactTitle}</h2>
          </RevealOnScroll>
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2 p-6 rounded-3xl space-y-5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}>
              {[
                { icon: Mail,   label: "Email",   value: "yashbonde21@gmail.com", href: "mailto:yashbonde21@gmail.com" },
                { icon: MapPin, label: "Made for", value: "GTU students\nBE & Diploma — all", href: null },
                { icon: Clock,  label: "Reply",    value: "24 hours",              href: null },
              ].map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(88,101,242,0.12)", border: "1px solid rgba(88,101,242,0.25)" }}>
                    <Icon size={15} style={{ color: BLUE }} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white mb-0.5">{label}</p>
                    {href
                      ? <a href={href} className="text-sm text-white/40 hover:text-white/80 transition-colors font-semibold">{value}</a>
                      : <p className="text-sm text-white/40 whitespace-pre-line font-semibold">{value}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="md:col-span-3 p-7 rounded-3xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb-1 absolute w-[900px] h-[900px] rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-12"
            style={{ background: `radial-gradient(circle, ${BLUE} 0%, transparent 55%)`, filter: "blur(90px)" }} />
          <div className="orb-2 absolute w-[400px] h-[400px] rounded-full right-0 bottom-0 opacity-10"
            style={{ background: "radial-gradient(circle, #EB459E 0%, transparent 70%)", filter: "blur(80px)" }} />
        </div>
        <div className="max-w-7xl mx-auto relative grid lg:grid-cols-2 gap-12 items-center">
          <RevealOnScroll className="hidden lg:flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ background: "radial-gradient(circle, #EB459E 0%, transparent 70%)", filter: "blur(60px)" }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/illustrations/exams.svg" alt="Exam preparation"
                className="relative z-10 w-full max-w-[480px]"
                style={{ filter: "drop-shadow(0 0 40px rgba(235,69,158,0.15))" }} />
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={100} className="text-center lg:text-left">
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-6">{tr.ctaBadge}</p>
            <h2 className="font-black tracking-tight text-white mb-4 leading-tight" style={{ fontSize: "clamp(36px, 5vw, 60px)" }}>
              {tr.ctaH.split("Andaze Se").map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #EB459E 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                      Andaze Se
                    </span>
                  )}
                </span>
              ))}
            </h2>
            <p className="text-white/35 text-xl mb-10 font-semibold">{tr.ctaSub}</p>
            <Link href="/register"
              className="cta-glow inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-white font-black text-lg transition-all hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #7289DA 100%)` }}>
              {tr.ctaBtn} <ArrowRight size={20} />
            </Link>
            <p className="text-xs text-white/15 mt-5 italic font-semibold">{tr.tagline}</p>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── Footer — Discord style ── */}
      <footer style={{ background: "linear-gradient(180deg, #07070F 0%, #0b0b20 35%, #11114a 75%, #1a1a6e 100%)" }}>

        {/* Top bar */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
            {/* Language switcher */}
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
              {([["en","English"],["hi","हिंदी"],["gu","ગુજરાતી"]] as [Lang,string][]).map(([l, label]) => (
                <button key={l} onClick={() => setLang(l)}
                  className="px-3 py-1.5 rounded-lg text-sm font-black transition-all"
                  style={lang === l ? { background: BLUE, color: "white" } : { color: "rgba(255,255,255,0.4)" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-2">
              {[
                { label: "X", href: "#", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                { label: "Instagram", href: "#", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
                { label: "GitHub", href: "https://github.com/YashB118", path: "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" },
                { label: "YouTube", href: "#", path: "M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" },
              ].map(({ label, href, path }) => (
                <a key={label} href={href} aria-label={label} target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={path}/></svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Link columns */}
        <div className="max-w-7xl mx-auto px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div>
              <h5 className="text-xs font-black uppercase tracking-widest text-white/40 mb-5">{tr.footerCol1}</h5>
              <ul className="space-y-3">
                {["Brahmastra","Andaza Laga","Pooch Lo","Notes & Books","PYQ Bank"].map(l => (
                  <li key={l}><Link href="/register" className="text-sm text-white/55 hover:text-white font-semibold transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-black uppercase tracking-widest text-white/40 mb-5">{tr.footerCol2}</h5>
              <ul className="space-y-3">
                {[["About","#"],["Contact","#contact"],["GitHub","https://github.com/YashB118"]].map(([l,h]) => (
                  <li key={l}><a href={h} className="text-sm text-white/55 hover:text-white font-semibold transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-black uppercase tracking-widest text-white/40 mb-5">{tr.footerCol3}</h5>
              <ul className="space-y-3">
                {["CE Branch","IT Branch","ME Branch","Civil","Diploma"].map(l => (
                  <li key={l}><Link href="/register" className="text-sm text-white/55 hover:text-white font-semibold transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-black uppercase tracking-widest text-white/40 mb-5">{tr.footerCol4}</h5>
              <ul className="space-y-3">
                {["Privacy Policy","Terms of Service","Cookie Settings"].map(l => (
                  <li key={l}><a href="#" className="text-sm text-white/55 hover:text-white font-semibold transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Massive brand name */}
        <div className="overflow-hidden px-4 pb-0 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="font-black text-white leading-[0.85] tracking-tighter select-none"
            style={{ fontSize: "clamp(60px, 14.5vw, 220px)", opacity: 0.95 }}>
            andaze se.
          </p>
        </div>

      </footer>
    </div>
  );
}
