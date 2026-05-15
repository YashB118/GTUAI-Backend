"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Star, Sparkles, MessageSquare, BookOpen, Users,
  FileQuestion, Upload, Shield, Lock, Newspaper, Check, ChevronRight,
} from "lucide-react";
import ContactForm from "@/components/landing/ContactForm";
import { AndazeSeLogo } from "@/components/ui/AndazeSeLogo";

interface TestimonialData {
  id: string; name: string; branch: string | null;
  semester: number | null; college: string | null;
  quote: string; stars: number;
}

// ─── Student face SVGs ────────────────────────────────────────────────────────

// Palette: South-Asian skin tones used across campus
const FACE_PALETTE = [
  { skin: "#F5C5A3", hair: "#1A0A00", bg: "#EEF2FF" },   // fair, black hair
  { skin: "#D4956A", hair: "#0D0600", bg: "#FEF9EE" },   // medium, dark hair
  { skin: "#C17A4A", hair: "#2C1507", bg: "#F0FDF4" },   // warm brown
  { skin: "#9E6B3F", hair: "#0A0200", bg: "#FFF7ED" },   // deeper brown
  { skin: "#B87850", hair: "#180900", bg: "#F5F3FF" },   // golden brown
  { skin: "#E8AA80", hair: "#1C0B00", bg: "#FFF1F2" },   // light wheat
];

type StudentStyle = "short_male" | "long_female" | "glasses_male" | "hijab_female" | "curly_male" | "bun_female";

function StudentFace({ style, p }: { style: StudentStyle; p: typeof FACE_PALETTE[0] }) {
  return (
    <>
      {/* Face */}
      <ellipse cx="50" cy="56" rx="22" ry="26" fill={p.skin} />

      {/* Ears */}
      <ellipse cx="28" cy="57" rx="5" ry="7" fill={p.skin} />
      <ellipse cx="72" cy="57" rx="5" ry="7" fill={p.skin} />

      {/* Eyes */}
      <circle cx="43" cy="51" r="3.5" fill="#1A0A00" />
      <circle cx="57" cy="51" r="3.5" fill="#1A0A00" />
      <circle cx="44.5" cy="49.5" r="1.2" fill="white" />
      <circle cx="58.5" cy="49.5" r="1.2" fill="white" />

      {/* Nose */}
      <ellipse cx="50" cy="58" rx="2" ry="1.5" fill={p.skin} stroke="#C4926A" strokeWidth="0.8" />

      {/* Smile */}
      <path d="M44 64 Q50 69 56 64" stroke="#8B5E3C" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Hair by style */}
      {style === "short_male" && (
        <path d="M28 44 Q30 28 50 26 Q70 28 72 44 Q68 34 50 32 Q32 34 28 44Z" fill={p.hair} />
      )}
      {style === "long_female" && (
        <>
          <path d="M28 44 Q30 28 50 26 Q70 28 72 44 Q68 34 50 32 Q32 34 28 44Z" fill={p.hair} />
          <rect x="26" y="42" width="8" height="38" rx="4" fill={p.hair} />
          <rect x="66" y="42" width="8" height="38" rx="4" fill={p.hair} />
        </>
      )}
      {style === "glasses_male" && (
        <>
          <path d="M28 44 Q30 28 50 26 Q70 28 72 44 Q68 34 50 32 Q32 34 28 44Z" fill={p.hair} />
          {/* Glasses */}
          <rect x="36" y="47" width="12" height="9" rx="3" fill="none" stroke="#444" strokeWidth="1.5" />
          <rect x="52" y="47" width="12" height="9" rx="3" fill="none" stroke="#444" strokeWidth="1.5" />
          <line x1="48" y1="51.5" x2="52" y2="51.5" stroke="#444" strokeWidth="1.5" />
          <line x1="34" y1="51.5" x2="36" y2="51.5" stroke="#444" strokeWidth="1" />
          <line x1="64" y1="51.5" x2="68" y2="51.5" stroke="#444" strokeWidth="1" />
        </>
      )}
      {style === "hijab_female" && (
        <>
          <path d="M24 52 Q26 26 50 24 Q74 26 76 52 Q72 36 50 34 Q28 36 24 52Z" fill={p.hair} />
          <path d="M24 52 Q24 78 50 80 Q76 78 76 52 L72 54 Q70 74 50 76 Q30 74 28 54Z" fill={p.hair} />
        </>
      )}
      {style === "curly_male" && (
        <>
          <path d="M28 48 Q26 26 50 24 Q74 26 72 48 Q68 30 50 28 Q32 30 28 48Z" fill={p.hair} />
          {/* Curly texture dots */}
          {[32,38,44,50,56,62,68].map(x => (
            <circle key={x} cx={x} cy={30} r="3" fill={p.hair} />
          ))}
          {[36,44,52,60].map(x => (
            <circle key={x} cx={x} cy={24} r="2.5" fill={p.hair} />
          ))}
        </>
      )}
      {style === "bun_female" && (
        <>
          <path d="M28 44 Q30 28 50 26 Q70 28 72 44 Q68 34 50 32 Q32 34 28 44Z" fill={p.hair} />
          <rect x="27" y="42" width="7" height="20" rx="3.5" fill={p.hair} />
          <rect x="66" y="42" width="7" height="20" rx="3.5" fill={p.hair} />
          {/* Bun */}
          <circle cx="50" cy="22" r="9" fill={p.hair} />
        </>
      )}

      {/* Neck + shoulders */}
      <rect x="44" y="78" width="12" height="10" rx="4" fill={p.skin} />
      <path d="M20 100 Q28 82 50 80 Q72 82 80 100" fill="#5865F2" fillOpacity="0.7" />
    </>
  );
}

const STUDENTS: Array<{ style: StudentStyle; p: typeof FACE_PALETTE[0]; name: string; info: string }> = [
  { style: "short_male",    p: FACE_PALETTE[0], name: "Yash P.",   info: "CE · Sem 5" },
  { style: "long_female",   p: FACE_PALETTE[1], name: "Priya S.",  info: "IT · Sem 3" },
  { style: "glasses_male",  p: FACE_PALETTE[2], name: "Rahul M.",  info: "EC · Sem 7" },
  { style: "hijab_female",  p: FACE_PALETTE[3], name: "Aisha K.",  info: "ME · Sem 4" },
  { style: "curly_male",    p: FACE_PALETTE[4], name: "Dev R.",    info: "CS · Sem 6" },
  { style: "bun_female",    p: FACE_PALETTE[5], name: "Neha T.",   info: "Civil · Sem 2" },
];

function StudentAvatar({ student, size = 44 }: { student: typeof STUDENTS[0]; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="50" cy="50" r="50" fill={student.p.bg} />
      <StudentFace style={student.style} p={student.p} />
      {/* Border */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="white" strokeWidth="4" />
    </svg>
  );
}

function AvatarGroup({ count = 2400 }: { count?: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2.5">
        {STUDENTS.slice(0, 5).map((s) => (
          <div key={s.name} className="rounded-full ring-2 ring-bg-page overflow-hidden" title={`${s.name} — ${s.info}`}>
            <StudentAvatar student={s} size={40} />
          </div>
        ))}
      </div>
      <div>
        <p className="text-[13.5px] font-semibold text-text-primary leading-tight">
          {count.toLocaleString()}+ students
        </p>
        <div className="flex gap-0.5 mt-0.5">
          {[1,2,3,4,5].map(i => <Star key={i} size={10} className="text-amber-400 fill-amber-400" />)}
          <span className="text-[10.5px] text-text-muted ml-1">4.9 / 5</span>
        </div>
      </div>
    </div>
  );
}

// ─── Animated counter ────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const val = useMotionValue(0);
  const spring = useSpring(val, { stiffness: 60, damping: 18, mass: 1 });
  const inView = useInView(ref, { once: true, margin: "-60px" });

  useEffect(() => {
    if (inView) val.set(to);
  }, [inView, val, to]);

  useEffect(() => {
    return spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = Math.round(v) + suffix;
    });
  }, [spring, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

// ─── SVG Illustrations ────────────────────────────────────────────────────────

function ExamPaperSVG() {
  return (
    <svg viewBox="0 0 280 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Paper shadow */}
      <rect x="22" y="22" width="236" height="296" rx="16" fill="rgb(88,101,242)" opacity="0.08" />
      {/* Paper */}
      <rect x="12" y="12" width="236" height="296" rx="16" fill="white" />
      <rect x="12" y="12" width="236" height="296" rx="16" stroke="rgb(234,236,240)" strokeWidth="1.5" />
      {/* Header strip */}
      <rect x="12" y="12" width="236" height="52" rx="16" fill="rgb(88,101,242)" opacity="0.06" />
      <rect x="12" y="48" width="236" height="16" fill="rgb(88,101,242)" opacity="0.06" />
      {/* Title lines */}
      <rect x="36" y="30" width="100" height="8" rx="4" fill="rgb(88,101,242)" opacity="0.35" />
      <rect x="36" y="44" width="64" height="6" rx="3" fill="rgb(88,101,242)" opacity="0.2" />

      {/* Q1 — highlighted (predicted) */}
      <rect x="20" y="76" width="220" height="56" rx="10" fill="rgb(16,185,129)" fillOpacity="0.07" />
      <rect x="20" y="76" width="3" height="56" rx="2" fill="rgb(16,185,129)" />
      {/* Q1 badge */}
      <rect x="172" y="83" width="60" height="20" rx="10" fill="rgb(16,185,129)" fillOpacity="0.15" />
      <text x="202" y="97" textAnchor="middle" fontSize="9" fill="rgb(16,185,129)" fontWeight="600">🔥🔥🔥 92%</text>
      {/* Q1 text lines */}
      <rect x="36" y="88" width="120" height="7" rx="3.5" fill="rgb(10,10,10)" opacity="0.25" />
      <rect x="36" y="101" width="90" height="6" rx="3" fill="rgb(10,10,10)" opacity="0.12" />
      <rect x="36" y="113" width="60" height="6" rx="3" fill="rgb(10,10,10)" opacity="0.08" />

      {/* Q2 — highlighted */}
      <rect x="20" y="144" width="220" height="56" rx="10" fill="rgb(88,101,242)" fillOpacity="0.06" />
      <rect x="20" y="144" width="3" height="56" rx="2" fill="rgb(88,101,242)" />
      <rect x="172" y="151" width="60" height="20" rx="10" fill="rgb(88,101,242)" fillOpacity="0.12" />
      <text x="202" y="165" textAnchor="middle" fontSize="9" fill="rgb(88,101,242)" fontWeight="600">🔥🔥 78%</text>
      <rect x="36" y="156" width="130" height="7" rx="3.5" fill="rgb(10,10,10)" opacity="0.25" />
      <rect x="36" y="169" width="80" height="6" rx="3" fill="rgb(10,10,10)" opacity="0.12" />
      <rect x="36" y="181" width="65" height="6" rx="3" fill="rgb(10,10,10)" opacity="0.08" />

      {/* Q3 — normal */}
      <rect x="36" y="218" width="140" height="7" rx="3.5" fill="rgb(10,10,10)" opacity="0.12" />
      <rect x="36" y="231" width="100" height="6" rx="3" fill="rgb(10,10,10)" opacity="0.08" />

      {/* Q4 — normal */}
      <rect x="36" y="258" width="155" height="7" rx="3.5" fill="rgb(10,10,10)" opacity="0.12" />
      <rect x="36" y="271" width="90" height="6" rx="3" fill="rgb(10,10,10)" opacity="0.08" />

      {/* AI sparkle badge */}
      <circle cx="232" cy="76" r="18" fill="rgb(88,101,242)" />
      <text x="232" y="81" textAnchor="middle" fontSize="14">✨</text>
    </svg>
  );
}

function ChatBubbleSVG() {
  return (
    <svg viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Bot avatar */}
      <circle cx="40" cy="40" r="28" fill="rgb(88,101,242)" fillOpacity="0.12" />
      <circle cx="40" cy="40" r="28" stroke="rgb(88,101,242)" strokeOpacity="0.2" strokeWidth="1.5" />
      <text x="40" y="46" textAnchor="middle" fontSize="20">🤖</text>

      {/* AI bubble 1 */}
      <rect x="78" y="16" width="168" height="48" rx="14" rx="14" fill="rgb(88,101,242)" fillOpacity="0.08" />
      <rect x="78" y="16" width="168" height="48" rx="14" stroke="rgb(88,101,242)" strokeOpacity="0.2" strokeWidth="1.5" />
      <rect x="94" y="28" width="100" height="7" rx="3.5" fill="rgb(88,101,242)" opacity="0.4" />
      <rect x="94" y="41" width="130" height="6" rx="3" fill="rgb(88,101,242)" opacity="0.2" />
      {/* Tail */}
      <path d="M78 36 L60 40 L78 44 Z" fill="rgb(88,101,242)" fillOpacity="0.08" />

      {/* User bubble */}
      <rect x="34" y="86" width="168" height="40" rx="14" fill="rgb(10,10,10)" fillOpacity="0.06" />
      <rect x="34" y="86" width="168" height="40" rx="14" stroke="rgb(10,10,10)" strokeOpacity="0.08" strokeWidth="1.5" />
      <rect x="50" y="98" width="120" height="6" rx="3" fill="rgb(10,10,10)" opacity="0.2" />
      <rect x="50" y="110" width="80" height="6" rx="3" fill="rgb(10,10,10)" opacity="0.1" />
      <path d="M202 100 L222 106 L202 112 Z" fill="rgb(10,10,10)" fillOpacity="0.06" />

      {/* AI bubble 2 — with source chip */}
      <rect x="78" y="148" width="188" height="58" rx="14" fill="rgb(88,101,242)" fillOpacity="0.08" />
      <rect x="78" y="148" width="188" height="58" rx="14" stroke="rgb(88,101,242)" strokeOpacity="0.2" strokeWidth="1.5" />
      <rect x="94" y="159" width="110" height="7" rx="3.5" fill="rgb(88,101,242)" opacity="0.4" />
      <rect x="94" y="172" width="140" height="6" rx="3" fill="rgb(88,101,242)" opacity="0.2" />
      {/* Source chip */}
      <rect x="94" y="183" width="68" height="14" rx="7" fill="rgb(16,185,129)" fillOpacity="0.15" />
      <text x="128" y="193" textAnchor="middle" fontSize="7" fill="rgb(16,185,129)" fontWeight="600">📄 Unit 4 Notes</text>
      <path d="M78 165 L60 168 L78 172 Z" fill="rgb(88,101,242)" fillOpacity="0.08" />

      {/* Typing dots */}
      <circle cx="78" cy="218" r="4" fill="rgb(88,101,242)" opacity="0.3" />
      <circle cx="90" cy="218" r="4" fill="rgb(88,101,242)" opacity="0.5" />
      <circle cx="102" cy="218" r="4" fill="rgb(88,101,242)" opacity="0.7" />
    </svg>
  );
}

function CommunityLockSVG() {
  return (
    <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Three student circles */}
      {[
        { cx: 60, cy: 80, label: "🦁", color: "rgb(245,158,11)" },
        { cx: 140, cy: 60, label: "🦊", color: "rgb(88,101,242)" },
        { cx: 220, cy: 80, label: "🐺", color: "rgb(16,185,129)" },
      ].map((s) => (
        <g key={s.cx}>
          <circle cx={s.cx} cy={s.cy} r="32" fill={s.color} fillOpacity="0.1" />
          <circle cx={s.cx} cy={s.cy} r="32" stroke={s.color} strokeOpacity="0.25" strokeWidth="1.5" />
          <text x={s.cx} y={s.cy + 7} textAnchor="middle" fontSize="22">{s.label}</text>
        </g>
      ))}

      {/* Connection lines */}
      <line x1="88" y1="75" x2="110" y2="68" stroke="rgb(88,101,242)" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="168" y1="68" x2="192" y2="75" stroke="rgb(88,101,242)" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="4 3" />

      {/* Chat bubbles */}
      <rect x="26" y="120" width="68" height="28" rx="10" fill="rgb(245,158,11)" fillOpacity="0.1" />
      <rect x="26" y="120" width="68" height="28" rx="10" stroke="rgb(245,158,11)" strokeOpacity="0.25" strokeWidth="1" />
      <rect x="36" y="129" width="48" height="6" rx="3" fill="rgb(245,158,11)" opacity="0.35" />
      <rect x="36" y="139" width="32" height="5" rx="2.5" fill="rgb(245,158,11)" opacity="0.2" />

      <rect x="106" y="108" width="68" height="28" rx="10" fill="rgb(88,101,242)" fillOpacity="0.1" />
      <rect x="106" y="108" width="68" height="28" rx="10" stroke="rgb(88,101,242)" strokeOpacity="0.25" strokeWidth="1" />
      <rect x="116" y="117" width="48" height="6" rx="3" fill="rgb(88,101,242)" opacity="0.35" />
      <rect x="116" y="127" width="36" height="5" rx="2.5" fill="rgb(88,101,242)" opacity="0.2" />

      <rect x="186" y="120" width="68" height="28" rx="10" fill="rgb(16,185,129)" fillOpacity="0.1" />
      <rect x="186" y="120" width="68" height="28" rx="10" stroke="rgb(16,185,129)" strokeOpacity="0.25" strokeWidth="1" />
      <rect x="196" y="129" width="48" height="6" rx="3" fill="rgb(16,185,129)" opacity="0.35" />
      <rect x="196" y="139" width="28" height="5" rx="2.5" fill="rgb(16,185,129)" opacity="0.2" />

      {/* Lock badge */}
      <circle cx="140" cy="170" r="24" fill="rgb(16,185,129)" fillOpacity="0.12" />
      <circle cx="140" cy="170" r="24" stroke="rgb(16,185,129)" strokeOpacity="0.3" strokeWidth="1.5" />
      <text x="140" y="177" textAnchor="middle" fontSize="18">🔒</text>
      <text x="140" y="196" textAnchor="middle" fontSize="8.5" fill="rgb(16,185,129)" fontWeight="600">E2E Encrypted</text>
    </svg>
  );
}

function StudyStackSVG() {
  return (
    <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Stack of books/notes */}
      {[
        { y: 130, color: "rgb(88,101,242)", label: "Data Structures Notes", w: 200 },
        { y: 110, color: "rgb(245,158,11)", label: "Computer Networks", w: 180 },
        { y: 90,  color: "rgb(16,185,129)", label: "DBMS Textbook", w: 160 },
        { y: 70,  color: "rgb(239,68,68)",  label: "OS Notes", w: 140 },
      ].map((b, i) => (
        <g key={i}>
          <rect x={(280 - b.w) / 2} y={b.y} width={b.w} height={26} rx="8" fill={b.color} fillOpacity="0.1" />
          <rect x={(280 - b.w) / 2} y={b.y} width={b.w} height={26} rx="8" stroke={b.color} strokeOpacity="0.3" strokeWidth="1.5" />
          <rect x={(280 - b.w) / 2 + 10} y={b.y + 10} width={b.w - 80} height="6" rx="3" fill={b.color} opacity="0.4" />
          {/* Type chip */}
          <rect x={(280 - b.w) / 2 + b.w - 60} y={b.y + 7} width={50} height="14" rx="7" fill={b.color} fillOpacity="0.15" />
          <circle cx={(280 - b.w) / 2 + 5} y={b.y + 13} r="3" fill={b.color} opacity="0.5" />
        </g>
      ))}

      {/* Upload arrow */}
      <circle cx="140" cy="38" r="28" fill="rgb(88,101,242)" fillOpacity="0.1" />
      <path d="M140 52 L140 26 M130 36 L140 26 L150 36" stroke="rgb(88,101,242)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="130" y="52" width="20" height="4" rx="2" fill="rgb(88,101,242)" opacity="0.3" />

      {/* Verified badge */}
      <circle cx="236" cy="132" r="20" fill="rgb(16,185,129)" fillOpacity="0.12" />
      <circle cx="236" cy="132" r="20" stroke="rgb(16,185,129)" strokeOpacity="0.3" strokeWidth="1.5" />
      <text x="236" y="138" textAnchor="middle" fontSize="14">✓</text>
    </svg>
  );
}

function PredictionGraphSVG() {
  // Mini bar chart of question prediction confidence
  const bars = [
    { h: 90, color: "rgb(16,185,129)", label: "OSI Model" },
    { h: 76, color: "rgb(16,185,129)", label: "TCP/IP" },
    { h: 62, color: "rgb(88,101,242)", label: "Subnetting" },
    { h: 48, color: "rgb(88,101,242)", label: "Routing" },
    { h: 36, color: "rgb(245,158,11)", label: "DNS" },
    { h: 28, color: "rgb(245,158,11)", label: "HTTP" },
  ];
  return (
    <svg viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Grid lines */}
      {[0, 30, 60, 90].map(y => (
        <line key={y} x1="48" y1={20 + y} x2="300" y2={20 + y} stroke="rgb(234,236,240)" strokeWidth="1" />
      ))}
      {/* Bars */}
      {bars.map((b, i) => {
        const x = 56 + i * 42;
        const y = 110 - b.h;
        return (
          <g key={i}>
            <rect x={x} y={y} width="28" height={b.h} rx="6" fill={b.color} fillOpacity="0.85" />
            <text x={x + 14} y="130" textAnchor="middle" fontSize="7" fill="rgb(142,142,142)">{b.label.slice(0, 5)}</text>
            <text x={x + 14} y={y - 4} textAnchor="middle" fontSize="7.5" fill={b.color} fontWeight="600">{b.h}%</text>
          </g>
        );
      })}
      {/* Y-axis labels */}
      {[100, 75, 50, 25].map((v, i) => (
        <text key={v} x="40" y={24 + i * 30} textAnchor="end" fontSize="8" fill="rgb(142,142,142)">{v}%</text>
      ))}
      {/* Title */}
      <text x="174" y="150" textAnchor="middle" fontSize="9" fill="rgb(142,142,142)">Computer Networks — Prediction Confidence</text>
    </svg>
  );
}

// ─── Floating card mockup for hero ────────────────────────────────────────────
function HeroMockup() {
  return (
    <div className="relative w-full max-w-md mx-auto select-none">
      {/* Main prediction card */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: [-6, 6, -6] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="card p-6 shadow-elevated"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
            <Sparkles size={13} className="text-accent" />
          </div>
          <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">AI Predicted Paper</span>
        </div>
        <h3 className="text-[15px] font-semibold text-text-primary mb-1">Computer Networks · Sem 5</h3>
        <p className="text-[11.5px] text-text-muted mb-4">3 papers analyzed</p>

        {[
          { q: "Explain OSI Reference Model with diagram", tier: "🔥🔥🔥", pct: 92, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { q: "TCP/IP vs OSI — compare and contrast", tier: "🔥🔥🔥", pct: 88, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { q: "Subnetting with VLSM — numerical", tier: "🔥🔥",  pct: 74, color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20"    },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.15, duration: 0.4 }}
            className={`flex items-start gap-3 px-3 py-2.5 rounded-xl mb-1.5 last:mb-0 ${item.bg}`}
          >
            <span className="text-[13px] shrink-0 mt-0.5">{item.tier}</span>
            <p className="text-[12px] text-text-primary flex-1 leading-snug">{item.q}</p>
            <span className={`text-[11px] font-bold tabular-nums shrink-0 ${item.color}`}>{item.pct}%</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Floating stat badge — top right */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
        transition={{ delay: 0.8, duration: 0.5, y: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 } }}
        className="absolute -top-5 -right-5 card p-3 shadow-elevated"
      >
        <p className="text-[10px] text-text-muted">Hit rate</p>
        <p className="text-[22px] font-bold text-emerald-600 leading-tight">78%</p>
      </motion.div>

      {/* Floating source badge — bottom left */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, y: [0, 5, 0] }}
        transition={{ delay: 1.0, duration: 0.5, y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 } }}
        className="absolute -bottom-4 -left-4 card px-3 py-2 shadow-elevated flex items-center gap-2"
      >
        <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
          <Sparkles size={10} className="text-accent" />
        </div>
        <div>
          <p className="text-[9px] text-text-muted">Papers analyzed</p>
          <p className="text-[13px] font-bold text-text-primary">8+ years</p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Animation variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 },
  }),
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function LandingClient({ testimonials }: { testimonials: TestimonialData[] }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen bg-bg-page text-text-primary overflow-x-hidden">

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-bg-card/90 backdrop-blur-xl shadow-card border-b border-border"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <AndazeSeLogo size="lg" />
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center h-10 px-4 rounded-full text-[13.5px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              Sign in
            </Link>
            <Link href="/register" className="btn-primary">
              Get started free <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left — copy */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="inline-flex items-center gap-2 chip bg-accent/10 text-accent mb-6"
              >
                <Sparkles size={12} />
                AI-powered exam predictions for GTU
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-text-primary leading-[1.0] text-balance"
              >
                Stop guessing.
                <br />
                <span className="text-accent">Know what's</span>
                <br />
                coming next.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.35 }}
                className="text-[16px] md:text-[17px] text-text-secondary mt-6 max-w-lg leading-relaxed"
              >
                Andaza Se analyzes 8+ years of GTU past papers and uses AI to predict which questions will appear on your next exam — with confidence scores.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="flex items-center gap-3 mt-8 flex-wrap"
              >
                <Link href="/register" className="btn-primary h-12 px-6 text-[15px]">
                  Start predicting free
                  <ArrowRight size={15} />
                </Link>
                <Link href="/login" className="btn-secondary h-12 px-6 text-[15px]">Sign in</Link>
              </motion.div>

              {/* Student avatar group — social proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.65 }}
                className="mt-8"
              >
                <AvatarGroup count={2400} />
              </motion.div>

              {/* Trust row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.8 }}
                className="flex items-center gap-5 mt-5 flex-wrap"
              >
                {[
                  { icon: "✓", text: "Free forever" },
                  { icon: "✓", text: "All GTU branches" },
                  { icon: "✓", text: "No credit card" },
                ].map((t) => (
                  <span key={t.text} className="flex items-center gap-1.5 text-[13px] text-text-muted">
                    <span className="text-emerald-500 font-bold">{t.icon}</span>
                    {t.text}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right — animated mockup */}
            <motion.div
              initial={{ opacity: 0, x: 24, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <HeroMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Student cards scroll strip ── */}
      <section className="py-10 px-6 overflow-hidden bg-bg-card border-y border-border">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-7xl mx-auto"
        >
          <p className="section-title text-center mb-6">Who&apos;s using Andaza Se</p>
          <div className="flex gap-4 justify-center flex-wrap">
            {STUDENTS.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="card p-4 flex items-center gap-3 min-w-[180px]"
              >
                <div className="rounded-full overflow-hidden ring-2 ring-bg-page shrink-0">
                  <StudentAvatar student={s} size={44} />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-text-primary">{s.name}</p>
                  <p className="text-[12px] text-text-muted">{s.info}</p>
                  <div className="flex gap-0.5 mt-1">
                    {[1,2,3,4,5].map(n => <Star key={n} size={9} className="text-amber-400 fill-amber-400" />)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Stats strip ── */}
      <section className="py-10 px-6 border-b border-border bg-bg-page">
        <div className="max-w-5xl mx-auto">
          <Section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: 8,   suffix: "+",  label: "Years of GTU data" },
                { value: 78,  suffix: "%",  label: "Average prediction hit rate" },
                { value: 12,  suffix: "+",  label: "GTU branches covered" },
                { value: 500, suffix: "+",  label: "Papers analyzed" },
              ].map((s, i) => (
                <motion.div key={s.label} variants={fadeUp} custom={i}>
                  <p className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight">
                    <Counter to={s.value} suffix={s.suffix} />
                  </p>
                  <p className="text-[13px] text-text-muted mt-1.5">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ── Pain → Solution ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Section>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <p className="section-title mb-3">The problem</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-text-primary text-balance">
                GTU syllabus is huge.
                <br />
                <span className="text-text-muted">Exam time is not.</span>
              </h2>
              <p className="text-[15.5px] text-text-secondary mt-5 max-w-xl mx-auto text-pretty">
                Every student faces the same problem: too much to study, too little time.
                Random revision doesn&apos;t work. Luck isn&apos;t a strategy.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { emoji: "😰", title: "Syllabus too vast", desc: "Thousands of pages, weeks of content. Impossible to cover everything before the exam." },
                { emoji: "🎲", title: "Guessing what comes", desc: "Students waste time on low-priority topics while missing the questions that actually appear." },
                { emoji: "😤", title: "Past papers everywhere", desc: "PDFs scattered, years of data untouched. No one has time to analyze 8 years manually." },
              ].map((p, i) => (
                <motion.div key={p.title} variants={fadeUp} custom={i} className="card p-6 text-center">
                  <span className="text-4xl block mb-4">{p.emoji}</span>
                  <p className="text-[16px] font-semibold text-text-primary mb-2">{p.title}</p>
                  <p className="text-[13.5px] text-text-secondary text-pretty">{p.desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeUp} custom={3} className="flex items-center justify-center my-10">
              <div className="flex items-center gap-4">
                <div className="h-px w-20 bg-border" />
                <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center">
                  <ChevronRight size={18} />
                </div>
                <div className="h-px w-20 bg-border" />
              </div>
            </motion.div>

            <motion.div variants={fadeUp} custom={4} className="card p-8 md:p-10 text-center bg-accent/5 border border-accent/20">
              <div className="inline-flex items-center gap-2 chip bg-accent/10 text-accent mb-4">
                <Sparkles size={12} /> The solution
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tighter">
                AI reads 8 years of GTU papers.<br />Tells you exactly what to study.
              </h3>
              <p className="text-[14.5px] text-text-secondary mt-4 max-w-lg mx-auto">
                Andaza Se clusters every question pattern, calculates prediction confidence using Bayesian scoring, and generates model answers — all in seconds.
              </p>
            </motion.div>
          </Section>
        </div>
      </section>

      {/* ── Features with SVG illustrations ── */}
      <section className="py-20 px-6 bg-bg-card border-y border-border">
        <div className="max-w-7xl mx-auto">
          <Section>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <p className="section-title mb-3">Features</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-text-primary">
                Every tool you need.
                <br />
                <span className="text-accent">Nothing you don&apos;t.</span>
              </h2>
            </motion.div>

            {/* Bento feature grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

              {/* Feature 1 — Big card, Predictions */}
              <motion.div variants={fadeUp} custom={0} className="card p-7 lg:col-span-2 group overflow-hidden relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center mb-4">
                      <Sparkles size={18} />
                    </div>
                    <h3 className="text-[22px] font-bold text-text-primary tracking-tight mb-2">Andaza Laga</h3>
                    <p className="text-[14px] text-text-secondary leading-relaxed">
                      AI scans past papers, finds patterns, and ranks questions by prediction confidence. Know what&apos;s almost certain, likely, or just possible.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {["Almost Certain", "Likely", "Possible"].map((t, i) => (
                        <span key={t} className={`chip text-[11px] ${
                          i === 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30" :
                          i === 1 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30" :
                          "bg-amber-100 text-amber-700 dark:bg-amber-900/30"
                        }`}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="h-48 md:h-auto">
                    <ExamPaperSVG />
                  </div>
                </div>
              </motion.div>

              {/* Feature 2 — Pooch Lo */}
              <motion.div variants={fadeUp} custom={1} className="card p-7 group overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4">
                  <MessageSquare size={18} />
                </div>
                <h3 className="text-[20px] font-bold text-text-primary tracking-tight mb-2">Pooch Lo</h3>
                <p className="text-[13.5px] text-text-secondary mb-5">
                  Ask anything about your GTU syllabus. AI tutor knows your subject, your semester, your papers.
                </p>
                <div className="h-44">
                  <ChatBubbleSVG />
                </div>
              </motion.div>

              {/* Feature 3 — Materials */}
              <motion.div variants={fadeUp} custom={2} className="card p-7 group overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center mb-4">
                  <BookOpen size={18} />
                </div>
                <h3 className="text-[20px] font-bold text-text-primary tracking-tight mb-2">Notes & Materials</h3>
                <p className="text-[13.5px] text-text-secondary mb-5">
                  Student-uploaded notes, textbooks, slides — approved, organized, and embedded into the AI.
                </p>
                <div className="h-44">
                  <StudyStackSVG />
                </div>
              </motion.div>

              {/* Feature 4 — PYQ Bank */}
              <motion.div variants={fadeUp} custom={3} className="card p-7 group overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/20 text-violet-600 flex items-center justify-center mb-4">
                  <FileQuestion size={18} />
                </div>
                <h3 className="text-[20px] font-bold text-text-primary tracking-tight mb-2">PYQ Bank</h3>
                <p className="text-[13.5px] text-text-secondary mb-5">
                  Every past year question, searchable by unit, year, and marks. With AI-generated model answers.
                </p>
                <div className="h-44">
                  <PredictionGraphSVG />
                </div>
              </motion.div>

              {/* Feature 5 — Community */}
              <motion.div variants={fadeUp} custom={4} className="card p-7 group overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center mb-4">
                  <Users size={18} />
                </div>
                <h3 className="text-[20px] font-bold text-text-primary tracking-tight mb-2">Community</h3>
                <p className="text-[13.5px] text-text-secondary mb-5">
                  Anonymous, end-to-end encrypted study rooms. Study with students across GTU — no identity exposed.
                </p>
                <div className="h-44">
                  <CommunityLockSVG />
                </div>
              </motion.div>

            </div>
          </Section>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Section>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <p className="section-title mb-3">How it works</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-text-primary">
                Three steps.<br />Better marks.
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Connector line */}
              <div className="hidden md:block absolute top-10 left-[33%] right-[33%] h-px bg-border z-0" />

              {[
                {
                  n: "01",
                  icon: <FileQuestion size={22} />,
                  title: "Select your subject",
                  desc: "Choose any GTU subject — BE, Diploma, MBA, MCA. All branches, all semesters.",
                  color: "bg-accent/10 text-accent",
                },
                {
                  n: "02",
                  icon: <Upload size={22} />,
                  title: "Upload past papers",
                  desc: "Drop 2–3 PDFs. AI extracts every question, clusters patterns, calculates frequencies.",
                  color: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600",
                },
                {
                  n: "03",
                  icon: <Sparkles size={22} />,
                  title: "Get predictions",
                  desc: "See ranked questions with confidence scores, model answers, and diagram explanations.",
                  color: "bg-amber-100 dark:bg-amber-900/20 text-amber-600",
                },
              ].map((step, i) => (
                <motion.div key={step.n} variants={fadeUp} custom={i} className="card p-6 relative z-10">
                  <div className={`w-12 h-12 rounded-2xl ${step.color} flex items-center justify-center mb-5`}>
                    {step.icon}
                  </div>
                  <p className="text-[60px] font-black text-text-muted/10 leading-none absolute top-3 right-4 pointer-events-none">{step.n}</p>
                  <p className="text-[17px] font-bold text-text-primary mb-2">{step.title}</p>
                  <p className="text-[13.5px] text-text-secondary leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ── Privacy / trust ── */}
      <section className="py-20 px-6 bg-bg-card border-y border-border">
        <div className="max-w-7xl mx-auto">
          <Section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <motion.div variants={fadeUp}>
                <div className="inline-flex items-center gap-2 chip bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 mb-5">
                  <Shield size={12} />
                  Privacy first
                </div>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-text-primary text-balance">
                  Your data is yours.<br />Always.
                </h2>
                <p className="text-[15px] text-text-secondary mt-5 text-pretty max-w-lg">
                  Community messages are AES-256-GCM encrypted before leaving your device. We store only ciphertext. Even we can&apos;t read your messages.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-8">
                  {[
                    { icon: Lock, title: "AES-256-GCM", desc: "End-to-end encrypted chat" },
                    { icon: Users, title: "Anonymous", desc: "Pseudonyms in rooms" },
                    { icon: Shield, title: "Enrollment safe", desc: "Never shared externally" },
                    { icon: Check, title: "HTTPS only", desc: "All traffic encrypted" },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="card p-4 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0">
                        <Icon size={15} />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-text-primary">{title}</p>
                        <p className="text-[11.5px] text-text-muted">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={fadeUp} custom={1} className="flex items-center justify-center">
                <div className="w-full max-w-sm">
                  <CommunityLockSVG />
                </div>
              </motion.div>
            </div>
          </Section>
        </div>
      </section>

      {/* ── Testimonials ── */}
      {testimonials.length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <Section>
              <motion.div variants={fadeUp} className="text-center mb-12">
                <p className="section-title mb-3">Students say</p>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-text-primary">
                  Real results.<br />Real GTU students.
                </h2>
              </motion.div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testimonials.slice(0, 6).map((t, i) => (
                  <motion.div key={t.id} variants={fadeUp} custom={i % 3} className="card p-6">
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} size={13} className={s < t.stars ? "text-amber-400 fill-amber-400" : "text-text-muted/20"} />
                      ))}
                    </div>
                    <p className="text-[14.5px] text-text-primary leading-relaxed text-pretty">&ldquo;{t.quote}&rdquo;</p>
                    <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
                      <div className="rounded-full overflow-hidden ring-2 ring-bg-page shrink-0">
                        <StudentAvatar student={STUDENTS[i % STUDENTS.length]} size={40} />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-text-primary">{t.name}</p>
                        <p className="text-[11.5px] text-text-muted">
                          {[t.branch, t.semester && `Sem ${t.semester}`, t.college].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Section>
          </div>
        </section>
      )}

      {/* ── Final CTA ── */}
      <section className="py-28 px-6 bg-bg-card border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <Section>
            <motion.div variants={fadeUp}>
              <p className="section-title mb-4">Ready?</p>
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-text-primary text-balance">
                Your next exam
                <br />
                is predictable.
              </h2>
              <p className="text-[16px] text-text-secondary mt-6 max-w-md mx-auto">
                Join GTU students who study smarter. Free. No card. Start in 30 seconds.
              </p>
              <div className="flex items-center justify-center gap-3 mt-9 flex-wrap">
                <Link href="/register" className="btn-primary h-13 px-8 text-[15.5px]">
                  Create free account <ArrowRight size={15} />
                </Link>
                <Link href="/login" className="btn-secondary h-13 px-8 text-[15.5px]">Already have an account</Link>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
                {["Free forever", "All GTU branches", "No credit card", "Instant access"].map(t => (
                  <span key={t} className="flex items-center gap-1.5 text-[12.5px] text-text-muted">
                    <Check size={12} className="text-emerald-500" /> {t}
                  </span>
                ))}
              </div>
            </motion.div>
          </Section>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <Section>
            <motion.div variants={fadeUp} className="text-center mb-10">
              <p className="section-title mb-3">Contact</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-text-primary">Have a question?</h2>
              <p className="text-[14px] text-text-secondary mt-2">We reply within 24 hours.</p>
            </motion.div>
            <motion.div variants={fadeUp} custom={1}>
              <ContactForm />
            </motion.div>
          </Section>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-10 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <AndazeSeLogo size="md" />
          <p className="text-[12px] text-text-muted">© {new Date().getFullYear()} GTU ExamAI · Built for GTU students.</p>
          <div className="flex items-center gap-5">
            <Link href="/login"    className="text-[12.5px] text-text-muted hover:text-text-primary transition-colors">Sign in</Link>
            <Link href="/register" className="text-[12.5px] text-text-muted hover:text-text-primary transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
