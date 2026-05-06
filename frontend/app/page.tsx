import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingClient from "@/components/landing/LandingClient";

interface TestimonialData {
  id: string; name: string; branch: string | null;
  semester: number | null; college: string | null;
  quote: string; stars: number;
}

export default async function RootPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const role = session.user.user_metadata?.role || "student";
    redirect(role === "admin" ? "/admin/dashboard" : "/dashboard");
  }

  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  let testimonials: TestimonialData[] = [];
  try {
    const res = await fetch(`${BACKEND}/testimonials`, { cache: "no-store" });
    if (res.ok) testimonials = await res.json();
  } catch {}

  return <LandingClient testimonials={testimonials} />;
}
