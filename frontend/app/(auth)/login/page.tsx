"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { AndazeSeLogo } from "@/components/ui/AndazeSeLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      if (data.session) {
        localStorage.setItem("access_token", data.session.access_token);
        const role = data.user?.user_metadata?.role || "student";
        router.push(role === "admin" ? "/admin/dashboard" : "/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-page grid lg:grid-cols-2">

      {/* Left — form */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px] animate-fade-in">

          <Link href="/" className="inline-block mb-10">
            <AndazeSeLogo size="lg" />
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">Welcome back</h1>
            <p className="text-[14.5px] text-text-secondary mt-2">Sign in to continue your exam prep.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="text-[12.5px] text-status-error bg-status-error/10 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-12 text-[14.5px] mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign in <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          <p className="text-center text-[13.5px] text-text-muted mt-7">
            New here?{" "}
            <Link href="/register" className="text-text-primary font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Right — decorative */}
      <div className="hidden lg:flex relative bg-bg-card border-l border-border items-center justify-center p-12 overflow-hidden">
        <div className="absolute top-1/4 -right-32 w-[500px] h-[500px] rounded-full opacity-30 orb-1"
          style={{ background: "radial-gradient(circle, rgb(88,101,242) 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 -left-32 w-[400px] h-[400px] rounded-full opacity-20 orb-2"
          style={{ background: "radial-gradient(circle, rgb(236,72,153) 0%, transparent 70%)" }} />

        <div className="relative max-w-md text-center">
          <div className="inline-flex items-center gap-2 chip mb-6">
            <Sparkles size={12} /> AI-powered exam prep
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-text-primary text-balance">
            Predict your exam. Save your time.
          </h2>
          <p className="text-[14.5px] text-text-secondary mt-5 text-pretty">
            Andaza analyzes 8 years of GTU papers to show you exactly what to study.
          </p>
        </div>
      </div>
    </div>
  );
}
