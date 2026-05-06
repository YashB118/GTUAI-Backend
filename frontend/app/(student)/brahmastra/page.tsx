"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Swords, Search, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

interface Subject {
  id: string;
  name: string;
  code: string | null;
  branch: string | null;
  semester: number | null;
}

interface UserProfile {
  branch: string | null;
  semester: number | null;
}

export default function BrahmastraIndexPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filtered, setFiltered] = useState<Subject[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({ branch: null, semester: null });

  useEffect(() => {
    (async () => {
      // Step 1: fetch profile via Supabase client (not /auth/profile which 404s)
      let branch: string | null = null;
      let semester: number | null = null;

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase
          .from("users")
          .select("branch, semester")
          .eq("id", user.id)
          .maybeSingle();
        if (prof) {
          branch   = prof.branch   ?? null;
          semester = prof.semester ?? null;
          setProfile({ branch, semester });
        }
      }

      // Step 2: fetch subjects filtered by student's branch + semester
      const params = new URLSearchParams();
      if (branch)   params.set("branch",   branch);
      if (semester) params.set("semester", String(semester));

      const data: Subject[] = await api.get(`/subjects/?${params.toString()}`).catch(() => []);
      setSubjects(data);
      setFiltered(data);
      setLoading(false);
    })();
  }, []);

  const handleSearch = (q: string) => {
    setQuery(q);
    const lower = q.toLowerCase();
    setFiltered(
      subjects.filter(s =>
        s.name.toLowerCase().includes(lower) ||
        (s.code || "").toLowerCase().includes(lower)
      )
    );
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 mt-0.5">
          <Swords size={20} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Brahmastra</h1>
          {profile.branch && profile.semester ? (
            <p className="text-sm text-text-muted">
              {profile.branch} · Sem {profile.semester} subjects
            </p>
          ) : (
            <p className="text-sm text-text-muted">Select a subject to generate your brief</p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search subjects..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-bg-card border border-border
            text-sm text-text-primary placeholder:text-text-muted
            focus:outline-none focus:border-blue-500/40 transition-colors"
        />
      </div>

      {/* Subject list */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-bg-elevated rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-base text-text-muted">Koi subject nahi mila.</p>
          <p className="text-sm text-text-muted opacity-60">Profile mein branch/semester set karo.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-text-muted">
            {filtered.length} subject{filtered.length !== 1 ? "s" : ""} mila
            {profile.branch ? ` for ${profile.branch}` : ""}
            {profile.semester ? ` Sem ${profile.semester}` : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filtered.map(s => (
              <button
                key={s.id}
                onClick={() => router.push(`/brahmastra/${s.id}`)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl
                  bg-bg-card border border-border hover:border-blue-500/30 hover:bg-blue-500/5
                  transition-all group text-left"
              >
                <div className="min-w-0">
                  <p className="text-base font-medium text-text-primary group-hover:text-blue-300 transition-colors truncate">
                    {s.name}
                  </p>
                  <div className="flex gap-2 text-xs text-text-muted mt-0.5">
                    {s.code && <span>{s.code}</span>}
                    {s.semester && <span>Sem {s.semester}</span>}
                    {s.branch && s.branch !== "COMMON" && <span>{s.branch}</span>}
                  </div>
                </div>
                <ChevronRight size={14} className="text-text-muted group-hover:text-blue-400 transition-colors shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
