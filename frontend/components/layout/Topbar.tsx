"use client";

import { useState } from "react";
import { Menu, LogOut, Search, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface TopbarProps {
  onMenuClick: () => void;
  onSearchClick?: () => void;
  userName?: string;
  userRole?: string;
  userBranch?: string;
  userSemester?: number;
}

export function Topbar({
  onMenuClick,
  onSearchClick,
  userName = "Student",
  userRole = "student",
  userBranch,
  userSemester,
}: TopbarProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("access_token");
    window.location.replace("/");
  };

  return (
    <header className="h-14 flex items-center gap-3 px-4 lg:px-5 sticky top-0 z-10 bg-bg-primary/90 backdrop-blur-xl border-b border-border/60">

      {/* Mobile: hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-text-muted hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-bg-elevated shrink-0"
      >
        <Menu size={17} />
      </button>

      {/* Desktop: Andaza wordmark (only on mobile the sidebar hides) */}
      <div className="hidden lg:flex items-center gap-1.5 shrink-0">
        <Swords size={13} className="text-orange-400" />
        <span className="text-[13px] font-bold text-text-primary tracking-tight">Andaza</span>
        {userRole === "admin" && (
          <span className="text-[10px] text-text-muted ml-0.5 font-normal">Admin</span>
        )}
      </div>

      {/* Search — takes remaining space */}
      <button
        onClick={onSearchClick}
        className="flex-1 max-w-sm flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-bg-elevated border border-border hover:border-border/80 transition-colors text-text-muted text-sm text-left"
      >
        <Search size={12} className="shrink-0" />
        <span className="flex-1">Search...</span>
        <kbd className="hidden sm:inline text-[10px] border border-border/60 rounded px-1.5 py-0.5 font-mono shrink-0">⌘K</kbd>
      </button>

      {/* Right — streak/points placeholder + avatar */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Streak placeholder — wired up later */}
        {/* <StreakBadge /> */}

        {/* Avatar + dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="flex items-center gap-1.5 hover:bg-bg-elevated rounded-lg px-1.5 py-1 transition-colors"
            aria-label="User menu"
          >
            <UserAvatar name={userName} size="sm" />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-text-primary leading-none">{userName.split(" ")[0]}</p>
              {userBranch && userSemester && (
                <p className="text-xs text-text-muted leading-none mt-0.5">{userBranch} S{userSemester}</p>
              )}
            </div>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl overflow-hidden z-50 animate-scale-in shadow-modal border border-border bg-bg-card">
                <div className="px-3.5 py-3">
                  <p className="text-[12px] font-semibold text-text-primary">{userName}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {userRole === "admin" ? "Administrator" : `${userBranch ?? ""} · Sem ${userSemester ?? ""}`}
                  </p>
                </div>
                <div className="h-px bg-border mx-3" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] text-text-secondary hover:text-red-400 hover:bg-bg-elevated transition-colors"
                >
                  <LogOut size={12} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
