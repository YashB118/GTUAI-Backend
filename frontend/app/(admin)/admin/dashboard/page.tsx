"use client";

import { useEffect, useState } from "react";
import {
  FileText, Users, CheckCircle, Clock,
  BookOpen, GraduationCap, Sparkles, BarChart3, Settings, MessageSquare,
  RefreshCw, AlertCircle, ArrowRight,
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

interface AdminMe { sub: string; email: string; role: string | null; }

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
    { label: "Students",       value: stats.total_students,      icon: Users },
    { label: "Papers",         value: stats.total_papers,        icon: FileText },
    { label: "Materials",      value: stats.approved_materials,  icon: BookOpen },
    { label: "Questions",      value: stats.total_questions,     icon: Sparkles },
    { label: "Subjects",       value: stats.total_subjects,      icon: GraduationCap },
    { label: "Answers",        value: stats.total_answers,       icon: MessageSquare },
  ];

  const adminActions = [
    { href: "/admin/approvals", label: "Pending approvals",
      desc: stats.pending_approvals > 0 ? `${stats.pending_approvals} waiting` : "All clear",
      icon: CheckCircle, urgent: stats.pending_approvals > 0 },
    { href: "/admin/papers",    label: "Question papers",
      desc: `${stats.total_papers} papers · ${stats.total_questions} questions`, icon: FileText, urgent: false },
    { href: "/admin/users",     label: "User management",
      desc: `${stats.total_students} students · ${stats.total_admins} admins`, icon: Users, urgent: false },
    { href: "/admin/subjects",  label: "Subjects",
      desc: `${stats.total_subjects} configured`, icon: GraduationCap, urgent: stats.total_subjects === 0 },
    { href: "/admin/analytics", label: "Analytics", desc: "Charts · trends · top subjects", icon: BarChart3, urgent: false },
    { href: "/admin/settings",  label: "Settings",  desc: "Prediction weights · cache", icon: Settings, urgent: false },
  ];

  return (
    <div className="max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">Admin</h1>
          {adminMe?.email && (
            <p className="text-[13.5px] text-text-muted mt-1">{adminMe.email}</p>
          )}
        </div>
        <button onClick={load} className="btn-ghost">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 mb-5 flex items-center gap-3 border-l-4 border-l-status-error">
          <AlertCircle size={16} className="text-status-error shrink-0" />
          <div className="text-[13.5px]">
            <p className="font-medium text-text-primary">{error}</p>
            {error.toLowerCase().includes("admin") && (
              <p className="text-[12px] text-text-muted mt-0.5">
                Your account may not have admin role in Supabase user_metadata.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pending approvals alert */}
      {stats.pending_approvals > 0 && (
        <Link href="/admin/approvals" className="block mb-6">
          <div className="card card-hover p-5 flex items-center gap-4 border-l-4 border-l-amber-500">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-text-primary">
                {stats.pending_approvals} material{stats.pending_approvals !== 1 ? "s" : ""} waiting for review
              </p>
              <p className="text-[12.5px] text-text-muted mt-0.5">Approve to make available to students</p>
            </div>
            <ArrowRight size={15} className="text-text-muted" />
          </div>
        </Link>
      )}

      {/* Empty hint */}
      {isEmpty && (
        <div className="card p-6 mb-6">
          <p className="text-[15px] font-semibold text-text-primary mb-1">Getting started</p>
          <p className="text-[13px] text-text-muted mb-3">Database is empty. Start here:</p>
          <ol className="space-y-1.5 text-[13px] text-text-secondary list-decimal list-inside">
            <li>Add subjects via <Link href="/admin/subjects" className="text-accent hover:underline">Subjects</Link></li>
            <li>Upload papers in <Link href="/admin/papers" className="text-accent hover:underline">Papers</Link></li>
            <li>Wait for AI processing to extract questions</li>
            <li>Students can get predictions and answers</li>
          </ol>
        </div>
      )}

      {/* Stat grid — big numbers like reference image */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-7">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-text-muted font-medium">{label}</p>
              <Icon size={14} className="text-text-muted" />
            </div>
            <p className="text-3xl font-bold text-text-primary tracking-tight">
              {loading ? "—" : value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <p className="section-title mb-3">Quick actions</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {adminActions.map(({ href, label, desc, icon: Icon, urgent }) => (
            <Link key={href} href={href} className="block">
              <div className={`card card-hover p-5 flex items-center gap-3 group ${urgent ? "border-l-4 border-l-amber-500" : ""}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${urgent ? "bg-amber-100 text-amber-600" : "bg-bg-muted text-text-secondary"}`}>
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-text-primary">{label}</p>
                  <p className="text-[12.5px] text-text-muted truncate">{desc}</p>
                </div>
                <ArrowRight size={14} className="text-text-muted/50 group-hover:text-text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Status footer */}
      <div className="card p-4 mt-7 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        <p className="text-[13px] text-text-secondary flex-1">
          <span className="text-emerald-600 font-medium">Backend connected</span>
        </p>
        {!loading && (
          <div className="flex items-center gap-3 text-[12px] text-text-muted">
            <span>{stats.total_papers} papers</span>
            <span>·</span>
            <span>{stats.total_students} students</span>
          </div>
        )}
      </div>
    </div>
  );
}
