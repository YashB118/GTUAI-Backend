"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Sparkles, BookOpen, FileQuestion,
  Upload, MessageSquare, X, Users, ChevronRight, ChevronLeft,
  // Swords,          // Brahmastra disabled — to be rebuilt
  // Trophy, Wallet,  // leaderboard/coins — disabled
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Home"          },
  // { href: "/brahmastra", icon: Swords,          label: "Brahmastra"    },  // Brahmastra disabled — to be rebuilt
  { href: "/predict",       icon: Sparkles,        label: "Andaza Laga"   },
  { href: "/chat",          icon: MessageSquare,   label: "Pooch Lo"      },
  { href: "/materials",     icon: BookOpen,        label: "Notes & Books" },
  { href: "/question-bank", icon: FileQuestion,    label: "PYQ Bank"      },
  { href: "/my-uploads",    icon: Upload,          label: "Meri Files"    },
  { href: "/community",     icon: Users,           label: "Community"     },
  // { href: "/leaderboard",  icon: Trophy,         label: "Leaderboard"   },  // leaderboard disabled
  // { href: "/coins",        icon: Wallet,         label: "My Coins"      },  // coins disabled
];

const COLLAPSED = 60;
const EXPANDED  = 224;

const sidebarSpring = {
  type: "spring" as const,
  stiffness: 380,
  damping: 32,
  mass: 0.7,
};

const labelVariants = {
  hidden:  { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.14, delay: 0.05 } },
  exit:    { opacity: 0, x: -8, transition: { duration: 0.08 } },
};

interface StudentSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function StudentSidebar({ open, onClose }: StudentSidebarProps) {
  const pathname = usePathname();

  // Desktop collapsed state — persisted in localStorage (default: expanded)
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("gtu_sidebar_collapsed");
    // Default expanded unless user explicitly collapsed before
    setCollapsed(saved === "true");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(v => {
      const next = !v;
      localStorage.setItem("gtu_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <>
      {/* ── Mobile overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* ── Mobile: slide-in drawer ── */}
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : "-100%" }}
        transition={sidebarSpring}
        className="fixed top-0 left-0 z-30 h-full w-[240px] flex flex-col glass border-r border-border lg:hidden"
      >
        <div className="flex items-center justify-end h-14 px-5">
          <button onClick={onClose} className="text-text-muted p-1.5 rounded-lg hover:bg-bg-elevated">
            <X size={16} />
          </button>
        </div>
        <div className="h-px bg-border/50 mx-4" />
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                )}
              >
                <Icon size={16} className={cn("shrink-0", active ? "text-accent" : "text-text-muted")} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-3.5 border-t border-border/50">
          <p className="text-xs text-text-muted/50 italic">GTU ExamAI</p>
        </div>
      </motion.aside>

      {/* ── Desktop: click-toggle rail ── */}
      <motion.aside
        className="hidden lg:flex flex-col h-screen border-r border-border glass sticky top-0 shrink-0 z-20 overflow-hidden"
        animate={{ width: collapsed ? COLLAPSED : EXPANDED }}
        transition={sidebarSpring}
        style={{ willChange: "width" }}
      >
        {/* Topbar-height spacer */}
        <div className="h-14 border-b border-border/50 shrink-0" />

        {/* Nav */}
        <nav className="flex-1 flex flex-col py-3 gap-0.5 px-2 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center h-11 rounded-xl px-2.5 shrink-0 transition-colors duration-100",
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                )}
              >
                {/* Icon — always visible */}
                <span className="flex items-center justify-center w-6 h-6 shrink-0">
                  <Icon size={19} />
                </span>

                {/* Label — animated in/out */}
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      key={`label-${href}`}
                      variants={labelVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Active indicator bar */}
                {active && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-l-sm bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Toggle button */}
        <div className="px-2 py-3 border-t border-border/50 shrink-0">
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex items-center h-9 rounded-xl transition-colors duration-100 w-full",
              "text-text-muted hover:text-text-primary hover:bg-bg-elevated",
              collapsed ? "justify-center px-0" : "px-2.5 gap-3"
            )}
          >
            <span className="flex items-center justify-center w-6 h-6 shrink-0">
              {collapsed
                ? <ChevronRight size={16} />
                : <ChevronLeft  size={16} />
              }
            </span>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  key="toggle-label"
                  variants={labelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="text-xs whitespace-nowrap overflow-hidden"
                >
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
