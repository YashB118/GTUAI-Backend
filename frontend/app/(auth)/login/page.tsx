"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Swords } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

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
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[340px] animate-blur-in">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
            <Swords size={18} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Andaza</h1>
          <p className="text-sm text-text-muted mt-1 italic">Sirf wahi jo aayega.</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 space-y-5 bg-bg-card border border-border">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Wapas aao 👋</h2>
            <p className="text-sm text-text-muted mt-0.5">Apne account mein sign in karo</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
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
              <p className="text-[12px] text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold text-base transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <Swords size={13} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted">
            Pehli baar?{" "}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
              Account banao
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
