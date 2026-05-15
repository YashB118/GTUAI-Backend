"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Sparkles, BookOpen, FileQuestion,
  Upload, MessageSquare, X, Users, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Home"          },
  { href: "/predict",       icon: Sparkles,        label: "Andaza Laga"   },
  { href: "/chat",          icon: MessageSquare,   label: "Pooch Lo"      },
  { href: "/materials",     icon: BookOpen,        label: "Notes"         },
  { href: "/question-bank", icon: FileQuestion,    label: "PYQ Bank"      },
  { href: "/my-uploads",    icon: Upload,          label: "My Uploads"    },
  { href: "/community",     icon: Users,           label: "Community"     },
];

const COLLAPSED = 68;
const EXPANDED  = 232;

const sidebarSpring = {
  type: "spring" as const,
  stiffness: 380,
  damping: 32,
  mass: 0.7,
};

const labelVariants = {
  hidden:  { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.14, delay: 0.05 } },
  exit:    { opacity: 0, x: -6, transition: { duration: 0.08 } },
};

interface StudentSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function StudentSidebar({ open, onClose }: StudentSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("gtu_sidebar_collapsed");
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
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile drawer */}
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : "-100%" }}
        transition={sidebarSpring}
        className="fixed top-0 left-0 z-30 h-full w-[260px] flex flex-col bg-bg-card border-r border-border lg:hidden shadow-modal"
      >
        <div className="flex items-center justify-between h-16 px-5">
          <span className="text-[13px] font-semibold text-text-primary">Menu</span>
          <button onClick={onClose} className="text-text-muted p-2 rounded-xl hover:bg-bg-elevated">
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-colors",
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                )}
              >
                <Icon size={17} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </motion.aside>

      {/* Desktop rail */}
      <motion.aside
        className="hidden lg:flex flex-col h-screen sticky top-0 shrink-0 z-20 overflow-hidden bg-bg-card border-r border-border"
        animate={{ width: collapsed ? COLLAPSED : EXPANDED }}
        transition={sidebarSpring}
        style={{ willChange: "width" }}
      >
        {/* Topbar-aligned spacer */}
        <div className="h-16 shrink-0" />

        <nav className="flex-1 flex flex-col py-2 gap-0.5 px-3 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center h-10 rounded-xl px-3 shrink-0 transition-colors duration-100",
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                )}
              >
                <span className="flex items-center justify-center w-5 h-5 shrink-0">
                  <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                </span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      key={`label-${href}`}
                      variants={labelVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="ml-3 text-[13.5px] font-medium whitespace-nowrap overflow-hidden tracking-[-0.005em]"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Toggle */}
        <div className="px-3 py-3 shrink-0">
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand" : "Collapse"}
            className={cn(
              "flex items-center h-9 rounded-xl transition-colors duration-100 w-full text-text-muted hover:text-text-primary hover:bg-bg-elevated",
              collapsed ? "justify-center px-0" : "px-3 gap-3"
            )}
          >
            <span className="flex items-center justify-center w-5 h-5 shrink-0">
              {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
            </span>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  key="toggle-label"
                  variants={labelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="text-[12.5px] font-medium whitespace-nowrap overflow-hidden"
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
