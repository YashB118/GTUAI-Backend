"use client";

import { useState } from "react";
import { Menu, LogOut, Search } from "lucide-react";
import { AndazeSeLogo } from "@/components/ui/AndazeSeLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
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
    <header className="h-16 flex items-center gap-4 px-5 lg:px-7 sticky top-0 z-10 bg-bg-card border-b border-border" style={{ transition: "background-color 0.2s ease" }}>

      {/* Mobile: hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-text-secondary hover:text-text-primary transition-colors p-2 -ml-1 rounded-xl hover:bg-bg-elevated shrink-0"
      >
        <Menu size={18} />
      </button>

      {/* Desktop: wordmark */}
      <div className="hidden lg:flex items-center gap-2.5 shrink-0">
        <AndazeSeLogo size="lg" />
        {userRole === "admin" && (
          <span className="chip text-[11px] font-semibold">Admin</span>
        )}
      </div>

      {/* Search — pill input */}
      <button
        onClick={onSearchClick}
        className="flex-1 max-w-md flex items-center gap-3 h-10 px-4 rounded-full bg-bg-card hover:bg-bg-elevated border border-border transition-colors text-text-muted text-[13px] text-left"
      >
        <Search size={14} className="shrink-0" />
        <span className="flex-1">Search anything…</span>
        <kbd className="hidden sm:inline text-[10px] bg-bg-muted rounded-md px-1.5 py-0.5 font-mono shrink-0 text-text-muted">⌘K</kbd>
      </button>

      {/* Right cluster */}
      <div className="flex items-center gap-1 ml-auto">
        <ThemeToggle />
        <div className="relative">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="flex items-center gap-2.5 hover:bg-bg-elevated rounded-full pl-1 pr-3 py-1 transition-colors"
            aria-label="User menu"
          >
            <UserAvatar name={userName} size="sm" />
            <div className="hidden sm:block text-left">
              <p className="text-[13px] font-semibold text-text-primary leading-tight">{userName.split(" ")[0]}</p>
              {userBranch && userSemester && (
                <p className="text-[11px] text-text-muted leading-tight">{userBranch} · Sem {userSemester}</p>
              )}
            </div>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden z-50 animate-scale-in shadow-menu bg-bg-card border border-border">
                <div className="px-4 py-3.5">
                  <p className="text-[13px] font-semibold text-text-primary">{userName}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {userRole === "admin" ? "Administrator" : `${userBranch ?? ""} · Sem ${userSemester ?? ""}`}
                  </p>
                </div>
                <div className="divider mx-3" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-text-secondary hover:text-status-error hover:bg-bg-elevated transition-colors"
                >
                  <LogOut size={13} />
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
