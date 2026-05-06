"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard, FileText, Users, CheckCircle, Clock,
  BookOpen, GraduationCap, Sparkles, BarChart3, Settings, MessageSquare,
  RefreshCw, AlertCircle, Upload,
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

interface Overview {
  total_students: number;
  total_admins: number;
  total_papers: number;
  total_materials: number;
  pending_approvals: number;
  approved_materials: number;
  rejected_materials: number;
  total_questions: number;
  total_subjects: number;
  total_patterns: number;
  total_answers: number;
}

interface AdminMe {
  sub: string;
  email: string;
  role: string | null;
}

const EMPTY: Overview = {
  total_students: 0, total_admins: 0, total_papers: 0, total_materials: 0,
  pending_approvals: 0, approved_materials: 0, rejected_materials: 0,
  total_questions: 0, total_subjects: 0, total_patterns: 0, total_answers: 0,
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Overview>(EMPTY);
  const [adminMe, setAdminMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, me] = await Promise.all([
        api.get("/admin/analytics/overview"),
        api.get("/admin/me").catch(() => null),
      ]);
      setStats(data || EMPTY);
      if (me) setAdminMe(me);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isEmpty = !loading && !error && stats.total_papers === 0 && stats.total_students === 0;

  const statCards = [
    {
      label: "Total Students", value: stats.total_students, icon: Users,
      color: "text-accent", bg: "bg-accent/10",
      hint: stats.total_students === 0 ? "No signups yet" : null,
    },
    {
      label: "Question Papers", value: stats.total_papers, icon: FileText,
      color: "text-blue-400", bg: "bg-blue-400/10",
      hint: stats.total_papers === 0 ? "Upload the first paper" : null,
    },
    {
      label: "Approved Materials", value: stats.approved_materials, icon: BookOpen,
      color: "text-emerald-400", bg: "bg-emerald-400/10",
      hint: stats.approved_materials === 0 ? "None approved yet" : null,
    },
    {
      label: "Questions Extracted", value: stats.total_questions, icon: Sparkles,
      color: "text-violet-400", bg: "bg-violet-400/10",
      hint: stats.total_questions === 0 ? "Process papers to extract" : null,
    },
    {
      label: "Subjects", value: stats.total_subjects, icon: GraduationCap,
      color: "text-amber-400", bg: "bg-amber-400/10",
      hint: stats.total_subjects === 0 ? "Add subjects to get started" : null,
    },
    {
      label: "Answers Generated", value: stats.total_answers, icon: MessageSquare,
      color: "text-cyan-400", bg: "bg-cyan-400/10",
      hint: null,
    },
  ];

  const adminActions = [
    {
      href: "/admin/approvals",
      label: "Review pending materials",
      desc: stats.pending_approvals > 0 ? `${stats.pending_approvals} awaiting review` : "All clear",
      icon: CheckCircle,
      urgent: stats.pending_approvals > 0,
    },
    {
      href: "/admin/papers",
      label: "Question papers",
      desc: stats.total_papers > 0
        ? `${stats.total_papers} papers · ${stats.total_questions} questions extracted`
        : "Upload the first GTU question paper",
      icon: FileText,
      urgent: false,
    },
    {
      href: "/admin/users",
      label: "User management",
      desc: stats.total_students > 0
        ? `${stats.total_students} students · ${stats.total_admins} admins`
        : "No students yet — share the platform link",
      icon: Users,
      urgent: false,
    },
    {
      href: "/admin/subjects",
      label: "Subjects",
      desc: stats.total_subjects > 0
        ? `${stats.total_subjects} subjects configured`
        : "Add subjects before uploading papers",
      icon: GraduationCap,
      urgent: stats.total_subjects === 0,
    },
    {
      href: "/admin/analytics",
      label: "Analytics dashboard",
      desc: "Charts · uploads · top subjects",
      icon: BarChart3,
      urgent: false,
    },
    {
      href: "/admin/settings",
      label: "Prediction settings",
      desc: "Scoring weights · cache control",
      icon: Settings,
      urgent: false,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard size={20} className="text-accent" />
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Admin Dashboard</h1>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Auth error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          <AlertCircle size={15} />
          <div>
            <p className="font-medium">{error}</p>
            {error.toLowerCase().includes("admin") && (
              <p className="text-xs text-red-400/70 mt-0.5">
                Your account may not have admin role set in Supabase user_metadata.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pending approvals */}
      {stats.pending_approvals > 0 && (
        <Link
          href="/admin/approvals"
          className="flex items-center gap-3 bg-amber-500/8 border border-amber-500/25 rounded-xl px-4 py-3 text-sm text-amber-400 hover:bg-amber-500/12 transition-colors"
        >
          <Clock size={15} />
          <span><strong>{stats.pending_approvals}</strong> material{stats.pending_approvals !== 1 ? "s" : ""} waiting for approval</span>
          <span className="ml-auto text-xs font-medium">Review →</span>
        </Link>
      )}

      {/* Getting started hint when DB is empty */}
      {isEmpty && (
        <div className="bg-bg-card border border-accent/20 rounded-xl px-4 py-4">
          <p className="text-sm font-semibold text-text-primary mb-1">Getting started</p>
          <p className="text-xs text-text-secondary mb-3">
            Database is empty. Start here to populate the platform:
          </p>
          <ol className="space-y-1.5 text-xs text-text-secondary list-decimal list-inside">
            <li>Go to <Link href="/admin/subjects" className="text-accent hover:underline">Subjects</Link> and add branches + semesters</li>
            <li>Go to <Link href="/admin/papers" className="text-accent hover:underline">Papers</Link> and upload GTU question papers</li>
            <li>Wait for AI processing to extract questions automatically</li>
            <li>Students can then get predictions and AI answers</li>
          </ol>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, hint }) => (
          <div key={label} className="bg-bg-card border border-border rounded-xl px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-text-muted font-medium">{label}</p>
              <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={13} className={color} />
              </div>
            </div>
            <p className="text-2xl font-bold text-text-primary tracking-tight">
              {loading ? "—" : value.toLocaleString()}
            </p>
            {!loading && hint && value === 0 && (
              <p className="text-[11px] text-text-muted mt-1">{hint}</p>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {adminActions.map(({ href, label, desc, icon: Icon, urgent }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 bg-bg-card border rounded-xl px-4 py-3.5 hover:bg-bg-elevated transition-all group ${
                urgent ? "border-amber-500/30 hover:border-amber-500/50" : "border-border hover:border-accent/30"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${urgent ? "bg-amber-500/10" : "bg-bg-elevated group-hover:bg-accent/10"} transition-colors`}>
                <Icon size={14} className={urgent ? "text-amber-400" : "text-text-muted group-hover:text-accent transition-colors"} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">{label}</p>
                <p className="text-xs text-text-muted truncate">{desc}</p>
              </div>
              <span className="text-text-muted/50 group-hover:text-accent transition-colors text-xs">→</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Platform status */}
      <div className="bg-bg-card border border-emerald-500/20 rounded-xl px-4 py-3.5 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-secondary">
            <span className="text-emerald-400 font-medium">Backend connected</span>
            {adminMe?.email && (
              <span className="text-text-muted"> · Admin: <span className="text-text-secondary">{adminMe.email}</span></span>
            )}
          </p>
        </div>
        {!loading && (
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Upload size={10} className="text-blue-400" />
              {stats.total_papers} papers
            </span>
            <span className="flex items-center gap-1">
              <Users size={10} className="text-accent" />
              {stats.total_students} students
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
