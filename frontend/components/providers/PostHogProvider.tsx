"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { initPostHog, identifyUser, resetUser } from "@/lib/posthog";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();

    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user) {
        identifyUser(user.id, {
          email: user.email,
          role: user.user_metadata?.role ?? "student",
          branch: user.user_metadata?.branch,
          semester: user.user_metadata?.semester,
          college: user.user_metadata?.college,
        });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        identifyUser(session.user.id, {
          email: session.user.email,
          role: session.user.user_metadata?.role ?? "student",
          branch: session.user.user_metadata?.branch,
          semester: session.user.user_metadata?.semester,
          college: session.user.user_metadata?.college,
        });
      } else if (event === "SIGNED_OUT") {
        resetUser();
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
