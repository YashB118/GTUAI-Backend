"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AndazeSeLogo } from "@/components/ui/AndazeSeLogo";
import { captureEvent } from "@/lib/posthog";

const BRANCHES = [
  { value: "CE",    label: "Computer Engineering (CE)" },
  { value: "IT",    label: "Information Technology (IT)" },
  { value: "EC",    label: "Electronics & Communication (EC)" },
  { value: "ME",    label: "Mechanical Engineering (ME)" },
  { value: "Civil", label: "Civil Engineering" },
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
    if (!form.branch || !form.semester) { setError("Please select branch and semester"); return; }
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
      captureEvent("user_signed_up", {
        email: form.email,
        branch: form.branch,
        semester: parseInt(form.semester),
        college: form.college || null,
      });
      router.push("/login?registered=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-page grid lg:grid-cols-2">

      {/* Left — form */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[440px] animate-fade-in">

          <Link href="/" className="inline-block mb-10">
            <AndazeSeLogo size="lg" />
          </Link>

          <div className="mb-7">
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">Create account</h1>
            <p className="text-[14.5px] text-text-secondary mt-2">Join thousands of GTU students.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <Input id="fullName" label="Full Name" placeholder="Yash Patel"
              value={form.fullName} onChange={set("fullName")} required />
            <div className="grid grid-cols-2 gap-3">
              <Input id="enrollmentNo" label="Enrollment No" placeholder="21XXXXXXXX"
                value={form.enrollmentNo} onChange={set("enrollmentNo")} required />
              <Input id="email" label="Email" type="email" placeholder="your@email.com"
                value={form.email} onChange={set("email")} required autoComplete="email" />
            </div>
            <Input id="password" label="Password" type="password" placeholder="Minimum 6 characters"
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
              <p className="text-[12.5px] text-status-error bg-status-error/10 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-12 text-[14.5px] mt-3"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create account <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          <p className="text-center text-[13.5px] text-text-muted mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right — decorative */}
      <div className="hidden lg:flex relative bg-bg-card border-l border-border items-center justify-center p-12 overflow-hidden">
        <div className="absolute top-1/4 -right-32 w-[500px] h-[500px] rounded-full opacity-30 orb-1"
          style={{ background: "radial-gradient(circle, rgb(88,101,242) 0%, transparent 70%)" }} />

        <div className="relative max-w-md text-center">
          <div className="inline-flex items-center gap-2 chip mb-6">
            <GraduationCap size={12} /> Free for GTU students
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-text-primary text-balance">
            Predict it.<br />Study it.<br />Pass it.
          </h2>
          <p className="text-[14.5px] text-text-secondary mt-5 text-pretty">
            Get AI predictions, model answers, study materials, and a study community — all in one app.
          </p>
        </div>
      </div>
    </div>
  );
}
