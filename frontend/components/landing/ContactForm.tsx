"use client";

import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${base}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to send");
      setSent(true);
    } catch {
      setError("Failed to send message. Email us at yashbonde21@gmail.com");
    } finally {
      setLoading(false);
    }
  };

  const field = "w-full bg-bg-elevated border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60 transition-colors";

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle className="text-emerald-400" size={28} />
        </div>
        <div>
          <p className="text-lg font-semibold text-text-primary">Message sent!</p>
          <p className="text-sm text-text-secondary mt-1">We&apos;ll get back to you within 24 hours.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Your Name</label>
          <input
            className={field}
            placeholder="Raj Patel"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Email Address</label>
          <input
            type="email"
            className={field}
            placeholder="raj@example.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Subject</label>
        <input
          className={field}
          placeholder="Question about predictions"
          value={form.subject}
          onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Message</label>
        <textarea
          className={`${field} resize-none`}
          rows={5}
          placeholder="Tell us how we can help..."
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          required
        />
      </div>
      {error && (
        <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-accent text-white font-semibold hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Send size={15} />
        )}
        {loading ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
