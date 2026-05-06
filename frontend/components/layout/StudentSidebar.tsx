"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Sparkles, BookOpen, FileQuestion,
  Upload, MessageSquare, Swords, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Home",          special: false },
  { href: "/brahmastra",    icon: Swords,          label: "Brahmastra",    special: true  },
  { href: "/predict",       icon: Sparkles,        label: "Andaza Laga",   special: false },
  { href: "/chat",          icon: MessageSquare,   label: "Pooch Lo",      special: false },
  { href: "/materials",     icon: BookOpen,        label: "Notes & Books", special: false },
  { href: "/question-bank", icon: FileQuestion,    label: "PYQ Bank",      special: false },
  { href: "/my-uploads",    icon: Upload,          label: "Meri Files",    special: false },
];

const COLLAPSED = 60;
const EXPANDED  = 230;

const sidebarSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 35,
  mass: 0.8,
};

const labelVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.13, delay: 0.06 } },
  exit:    { opacity: 0, x: -6, transition: { duration: 0.08 } },
};

interface StudentSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function StudentSidebar({ open, onClose }: StudentSidebarProps) {
  const pathname  = usePathname();
  const [hovered, setHovered] = useState(false);

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
        <div className="flex items-center justify-between h-14 px-5">
          <div className="w-7 h-7 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
            <Swords size={14} className="text-blue-400" />
          </div>
          <button onClick={onClose} className="text-text-muted p-1.5 rounded-lg hover:bg-bg-elevated">
            <X size={16} />
          </button>
        </div>
        <div className="h-px bg-border/50 mx-4" />
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label, special }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors",
                  special
                    ? active
                      ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                      : "text-blue-400/90 border border-blue-500/15 bg-blue-500/5"
                    : active
                      ? "bg-accent/10 text-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                )}
              >
                <Icon size={16} className={cn(
                  "shrink-0",
                  special ? (active ? "text-blue-300" : "text-blue-400") : active ? "text-accent" : "text-text-muted"
                )} />
                {label}
                {special && <span className="ml-auto text-xs text-blue-500/60">⚔️</span>}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-3.5 border-t border-border/50">
          <p className="text-xs text-blue-400/50 italic">Sirf wahi jo aayega.</p>
        </div>
      </motion.aside>

      {/* ── Desktop: Framer Motion hover-expand rail ── */}
      <motion.aside
        className="hidden lg:flex flex-col h-screen border-r border-border glass sticky top-0 shrink-0 z-20 overflow-hidden"
        animate={{ width: hovered ? EXPANDED : COLLAPSED }}
        transition={sidebarSpring}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        style={{ willChange: "width" }}
      >
        {/* Brand — icon only, no text (logo lives in topbar) */}
        <div className="flex items-center h-14 border-b border-border/50 px-4 shrink-0">
          <div className="w-7 h-7 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
            <Swords size={14} className="text-blue-400" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col py-3 gap-1 px-2 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ href, icon: Icon, label, special }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center h-11 rounded-xl px-2.5 shrink-0 transition-colors duration-100",
                  special
                    ? active
                      ? "bg-blue-500/20 text-blue-300"
                      : "text-blue-400/70 hover:bg-blue-500/10 hover:text-blue-400"
                    : active
                      ? "bg-accent/15 text-accent"
                      : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                )}
              >
                {/* Icon — always visible */}
                <span className="flex items-center justify-center w-6 h-6 shrink-0">
                  <Icon size={20} />
                </span>

                {/* Label — animated in/out */}
                <AnimatePresence>
                  {hovered && (
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

                {/* Brahmastra ⚔️ badge */}
                {special && hovered && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="ml-auto text-xs shrink-0 whitespace-nowrap text-blue-500/50"
                  >
                    ⚔️
                  </motion.span>
                )}

                {/* Active bar */}
                {active && (
                  <span className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-l-sm",
                    special ? "bg-blue-400" : "bg-accent"
                  )} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3.5 border-t border-border/50 flex items-center gap-3 shrink-0">
          <span className="text-xs text-text-muted shrink-0">v6</span>
          <AnimatePresence>
            {hovered && (
              <motion.span
                key="tagline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.1 } }}
                exit={{ opacity: 0 }}
                className="text-xs text-blue-400/40 italic whitespace-nowrap"
              >
                Sirf wahi jo aayega.
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </>
  );
}
