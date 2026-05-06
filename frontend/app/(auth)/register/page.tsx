"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Swords } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const BRANCHES = [
  { value: "CE",    label: "Computer Engineering (CE)" },
  { value: "IT",    label: "Information Technology (IT)" },
  { value: "EC",    label: "Electronics & Communication (EC)" },
  { value: "ME",    label: "Mechanical Engineering (ME)" },
  { value: "Civil", label: "Civil Engineering (Civil)" },
  { value: "EE",    label: "Electrical Engineering (EE)" },
  { value: "CHEM",  label: "Chemical Engineering" },
  { value: "AUTO",  label: "Automobile Engineering" },
  { value: "CO",    label: "Diploma — Computer (CO)" },
];

const SEMESTERS = Array.from({ length: 8 }, (_, i) => ({
  value: i + 1,
  label: `Semester ${i + 1}`,
}));

interface FormData {
  fullName: string;
  enrollmentNo: string;
  email: string;
  password: string;
  branch: string;
  semester: string;
  college: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    fullName: "", enrollmentNo: "", email: "",
    password: "", branch: "", semester: "", college: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.branch || !form.semester) { setError("Branch aur semester select karo"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.fullName,
          enrollment_no: form.enrollmentNo,
          branch: form.branch,
          semester: parseInt(form.semester),
          college: form.college || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");
      router.push("/login?registered=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[360px] animate-blur-in">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4">
            <Swords size={18} className="text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Andaza</h1>
          <p className="text-sm text-text-muted mt-1 italic">Sirf wahi jo aayega.</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 space-y-5 bg-bg-card border border-border">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Account banao ⚔️</h2>
            <p className="text-sm text-text-muted mt-0.5">GTU student ho? Toh yahan ho sahi jagah.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input id="fullName" label="Full Name" placeholder="Yash Patel"
              value={form.fullName} onChange={set("fullName")} required />
            <Input id="enrollmentNo" label="Enrollment No" placeholder="21XXXXXXXX"
              value={form.enrollmentNo} onChange={set("enrollmentNo")} required />
            <Input id="email" label="Email" type="email" placeholder="your@email.com"
              value={form.email} onChange={set("email")} required autoComplete="email" />
            <Input id="password" label="Password" type="password" placeholder="Min 6 characters"
              value={form.password} onChange={set("password")} required minLength={6} autoComplete="new-password" />

            <div className="grid grid-cols-2 gap-3">
              <Select id="branch" label="Branch" placeholder="Select"
                value={form.branch} onChange={set("branch")} options={BRANCHES} required />
              <Select id="semester" label="Semester" placeholder="Sem"
                value={form.semester} onChange={set("semester")} options={SEMESTERS} required />
            </div>

            <Input id="college" label="College (optional)" placeholder="Your college name"
              value={form.college} onChange={set("college")} />

            {error && (
              <p className="text-[12px] text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-semibold text-base transition-colors flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Andaza Join Karo <Swords size={13} /></>
              )}
            </button>
          </form>

          <p className="text-center text-[12px] text-text-muted">
            Account hai already?{" "}
            <Link href="/login" className="text-orange-400 hover:text-orange-300 transition-colors font-medium">
              Sign in karo
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
