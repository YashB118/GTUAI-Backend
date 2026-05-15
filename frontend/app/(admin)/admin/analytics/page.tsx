"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3, RefreshCw, FileText, BookOpen, Users, GraduationCap, Sparkles, Clock,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { api } from "@/lib/api";

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

interface UploadPoint {
  date: string;
  papers: number;
  materials: number;
}

interface TopSubject {
  id: string;
  name: string;
  code: string | null;
  paper_count: number;
}

interface TopMaterial {
  id: string;
  title: string;
  material_type: string;
  chunk_count: number | null;
  file_size_kb: number;
  subjects?: { name: string };
}

interface Signup {
  id: string;
  full_name: string;
  email: string;
  branch: string | null;
  semester: number | null;
  enrollment_no: string | null;
  created_at: string;
}

const EMPTY: Overview = {
  total_students: 0, total_admins: 0, total_papers: 0, total_materials: 0,
  pending_approvals: 0, approved_materials: 0, rejected_materials: 0,
  total_questions: 0, total_subjects: 0, total_patterns: 0, total_answers: 0,
};

const ACCENT = "#5865F2";
const BLUE   = "#3B82F6";
const GRID   = "#EAECF0";   /* light-safe grid lines */
const TICK   = "#A1A1A1";

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<Overview>(EMPTY);
  const [uploads, setUploads] = useState<UploadPoint[]>([]);
  const [topSubjects, setTopSubjects] = useState<TopSubject[]>([]);
  const [topMaterials, setTopMaterials] = useState<TopMaterial[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // overview is the auth gate — let it throw if 403/500
      const overview = await api.get("/admin/analytics/overview");
      // remaining endpoints fail individually without breaking the page
      const [u, ts, tm, su] = await Promise.all([
        api.get("/admin/analytics/uploads-chart?days=14").catch(() => []),
        api.get("/admin/analytics/top-subjects?limit=8").catch(() => []),
        api.get("/admin/analytics/top-materials?limit=10").catch(() => []),
        api.get("/admin/analytics/recent-signups?limit=10").catch(() => []),
      ]);
      setOverview(overview || EMPTY);
      setUploads(Array.isArray(u) ? u : []);
      setTopSubjects(Array.isArray(ts) ? ts : []);
      setTopMaterials(Array.isArray(tm) ? tm : []);
      setSignups(Array.isArray(su) ? su : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const statCards = [
    { label: "Total Students", value: overview.total_students, icon: Users, color: "text-accent", bg: "bg-accent/10" },
    { label: "Question Papers", value: overview.total_papers, icon: FileText, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Materials Approved", value: overview.approved_materials, icon: BookOpen, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Questions Extracted", value: overview.total_questions, icon: Sparkles, color: "text-violet-400", bg: "bg-violet-400/10" },
    { label: "Subjects", value: overview.total_subjects, icon: GraduationCap, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Patterns Detected", value: overview.total_patterns, icon: BarChart3, color: "text-pink-400", bg: "bg-pink-400/10" },
    { label: "Answers Generated", value: overview.total_answers, icon: Sparkles, color: "text-cyan-400", bg: "bg-cyan-400/10" },
    { label: "Pending Approvals", value: overview.pending_approvals, icon: Clock, color: overview.pending_approvals > 0 ? "text-amber-400" : "text-text-muted", bg: overview.pending_approvals > 0 ? "bg-amber-400/10" : "bg-bg-elevated" },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <p className="section-title">Insights</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary mt-2">Analytics</h1>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <LoadingSkeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <LoadingSkeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-7">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="section-title">Insights</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary mt-2">Analytics</h1>
        </div>
        <button onClick={load} className="btn-ghost">
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-start gap-2">
          <span className="shrink-0 mt-0.5">⚠</span>
          <div>
            <p className="font-medium">{error}</p>
            {error.toLowerCase().includes("admin") && (
              <p className="text-xs text-red-400/70 mt-0.5">
                Your account may not have the admin role set. Check Supabase → Auth → Users → user_metadata.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pending approvals alert */}
      {overview.pending_approvals > 0 && (
        <div className="flex items-center gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-400">
          <Clock size={15} />
          <span><strong>{overview.pending_approvals}</strong> material{overview.pending_approvals !== 1 ? "s" : ""} waiting for approval</span>
          <Link href="/admin/approvals" className="ml-auto text-xs font-medium hover:underline">Review →</Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11.5px] text-text-muted font-medium">{label}</p>
              <Icon size={14} className="text-text-muted" />
            </div>
            <p className="text-3xl font-bold text-text-primary tracking-tight">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Chart row */}
      {(() => {
        const hasUploadData = uploads.some(d => d.papers > 0 || d.materials > 0);
        const hasSubjectData = topSubjects.some(s => s.paper_count > 0);
        return (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 bg-bg-card border border-border rounded-xl p-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">
                Uploads · last 14 days
              </h3>
              {!hasUploadData ? (
                <div className="h-64 flex flex-col items-center justify-center gap-2 text-center">
                  <p className="text-xs text-text-muted">No uploads in the last 14 days</p>
                  <Link href="/admin/papers" className="text-xs text-accent hover:underline">Upload a paper →</Link>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={uploads} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" stroke={TICK} fontSize={10} tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis stroke={TICK} fontSize={10} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "var(--bg-card)", border: `1px solid ${GRID}`, borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="papers" stroke={ACCENT} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="materials" stroke={BLUE} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 bg-bg-card border border-border rounded-xl p-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">
                Top subjects (papers)
              </h3>
              {topSubjects.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-2 text-center">
                  <p className="text-xs text-text-muted">No subjects configured yet</p>
                  <Link href="/admin/subjects" className="text-xs text-accent hover:underline">Add subjects →</Link>
                </div>
              ) : !hasSubjectData ? (
                <div className="h-64 flex flex-col items-center justify-center gap-2 text-center">
                  <p className="text-xs text-text-muted">{topSubjects.length} subjects found — no papers yet</p>
                  <Link href="/admin/papers" className="text-xs text-accent hover:underline">Upload papers →</Link>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSubjects} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" stroke={TICK} fontSize={10} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" stroke={TICK} fontSize={10} width={100} tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + "…" : v} />
                      <Tooltip contentStyle={{ background: "var(--bg-card)", border: `1px solid ${GRID}`, borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="paper_count" fill={ACCENT} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
            Top materials (by content size)
          </h3>
          {topMaterials.length === 0 ? (
            <p className="text-xs text-text-muted">No approved materials yet.</p>
          ) : (
            <div className="space-y-1.5">
              {topMaterials.map((m, i) => (
                <div key={m.id} className="flex items-center justify-between gap-2 text-xs px-3 py-2 bg-bg-elevated rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-text-primary truncate">{i + 1}. {m.title}</p>
                    <p className="text-text-muted truncate">{m.subjects?.name} · {m.material_type}</p>
                  </div>
                  <span className="text-text-secondary font-medium shrink-0">
                    {m.chunk_count ?? 0} chunks
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
            Recent student signups
          </h3>
          {signups.length === 0 ? (
            <p className="text-xs text-text-muted">No signups yet.</p>
          ) : (
            <div className="space-y-1.5">
              {signups.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-2 text-xs px-3 py-2 bg-bg-elevated rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-text-primary truncate">{s.full_name}</p>
                    <p className="text-text-muted truncate">{s.email} · {s.branch || "—"} S{s.semester || "?"}</p>
                  </div>
                  <span className="text-text-muted shrink-0">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

