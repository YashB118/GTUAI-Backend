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

  const field = "input";

  if (sent) {
    return (
      <div className="card p-12 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle size={26} />
        </div>
        <p className="text-[17px] font-semibold text-text-primary mt-4">Message sent!</p>
        <p className="text-[13.5px] text-text-secondary mt-1">We&apos;ll get back to you within 24 hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-7 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-text-primary mb-2">Your name</label>
          <input
            className={field}
            placeholder="Raj Patel"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-text-primary mb-2">Email</label>
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
        <label className="block text-[13px] font-medium text-text-primary mb-2">Subject</label>
        <input
          className={field}
          placeholder="Question about predictions"
          value={form.subject}
          onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
          required
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-text-primary mb-2">Message</label>
        <textarea
          className={`${field} resize-none min-h-[120px] py-3`}
          rows={5}
          placeholder="Tell us how we can help..."
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          required
        />
      </div>
      {error && (
        <p className="text-[12.5px] text-status-error bg-status-error/10 rounded-xl px-4 py-2.5">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full h-12"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <Send size={15} />
        )}
        {loading ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
