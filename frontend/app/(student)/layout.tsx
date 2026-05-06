"use client";

import { useState, useEffect } from "react";
import { StudentSidebar } from "@/components/layout/StudentSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  full_name?: string;
  branch?: string;
  semester?: number;
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({});

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("full_name, branch, semester")
          .eq("id", user.id)
          .maybeSingle();
        if (data) setProfile(data);
      }
    }
    loadProfile();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <StudentSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          onSearchClick={() => setPaletteOpen(true)}
          userName={profile.full_name}
          userRole="student"
          userBranch={profile.branch}
          userSemester={profile.semester}
        />
        <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 pb-24 md:pb-6 animate-fade-in">
          {children}
        </main>
      </div>
      <MobileNav />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
