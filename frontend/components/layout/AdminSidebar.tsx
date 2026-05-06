"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CheckCircle, FileText,
  GraduationCap, Users, BarChart3, Settings, X, Swords,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const navItems = [
  { href: "/admin/dashboard",  icon: LayoutDashboard, label: "Dashboard",  badge: false },
  { href: "/admin/approvals",  icon: CheckCircle,     label: "Approvals",   badge: true  },
  { href: "/admin/papers",     icon: FileText,        label: "Papers",      badge: false },
  { href: "/admin/subjects",   icon: GraduationCap,   label: "Subjects",    badge: false },
  { href: "/admin/users",      icon: Users,           label: "Users",       badge: false },
  { href: "/admin/analytics",  icon: BarChart3,       label: "Analytics",   badge: false },
  { href: "/admin/settings",   icon: Settings,        label: "Settings",    badge: false },
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
  hidden:  { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.13, delay: 0.06 } },
  exit:    { opacity: 0, x: -6, transition: { duration: 0.08 } },
};

interface AdminSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const overview = await api.get("/admin/analytics/overview");
        if (!cancelled) setPendingCount(overview?.pending_approvals ?? 0);
      } catch {}
    };
    load();
    const id = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 bg-black/80 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      {/* Mobile drawer */}
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : "-100%" }}
        transition={sidebarSpring}
        className="fixed top-0 left-0 z-30 h-full w-[240px] flex flex-col glass border-r border-border lg:hidden"
      >
        <div className="flex items-center justify-between h-14 px-5">
          <div className="flex items-center gap-2.5">
            <Swords size={15} className="text-accent" />
            <span className="text-base font-bold text-text-primary">Andaza</span>
            <span className="text-xs text-text-muted">Admin</span>
          </div>
          <button onClick={onClose} className="text-text-muted p-1.5 rounded-lg hover:bg-bg-elevated">
            <X size={16} />
          </button>
        </div>
        <div className="h-px bg-border/50 mx-4" />
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, icon: Icon, label, badge }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            const showBadge = badge && pendingCount > 0;
            return (
              <Link key={href} href={href} onClick={onClose}
                className={cn(
                  "flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-colors",
                  active ? "bg-accent/10 text-accent" : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                )}>
                <span className="flex items-center gap-3.5">
                  <Icon size={16} className={cn("shrink-0", active ? "text-accent" : "text-text-muted")} />
                  {label}
                </span>
                {showBadge && (
                  <span className="text-xs font-semibold bg-amber-500/15 text-amber-400 rounded-full px-1.5 min-w-[20px] text-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-3.5 border-t border-border/50">
          <p className="text-xs text-text-muted">GTU ExamAI · Admin</p>
        </div>
      </motion.aside>

      {/* Desktop hover-expand rail */}
      <motion.aside
        className="hidden lg:flex flex-col h-screen border-r border-border glass sticky top-0 shrink-0 z-20 overflow-hidden"
        animate={{ width: hovered ? EXPANDED : COLLAPSED }}
        transition={sidebarSpring}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        style={{ willChange: "width" }}
      >
        {/* Brand */}
        <div className="flex items-center h-14 border-b border-border/50 px-4 gap-3 shrink-0">
          <div className="w-7 h-7 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
            <Swords size={14} className="text-accent" />
          </div>
          <AnimatePresence>
            {hovered && (
              <motion.div
                key="brand"
                variants={labelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden"
              >
                <span className="text-[15px] font-bold text-text-primary">Andaza</span>
                <span className="text-xs text-text-muted">Admin</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col py-3 gap-1 px-2 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ href, icon: Icon, label, badge }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            const showBadge = badge && pendingCount > 0;
            return (
              <Link key={href} href={href} className={cn(
                "relative flex items-center h-11 rounded-xl px-2.5 shrink-0 transition-colors duration-100",
                active ? "bg-accent/15 text-accent" : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
              )}>
                <span className="relative flex items-center justify-center w-6 h-6 shrink-0">
                  <Icon size={20} />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </span>

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

                <AnimatePresence>
                  {hovered && showBadge && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-auto text-xs font-semibold bg-amber-500/15 text-amber-400 rounded-full px-1.5 shrink-0"
                    >
                      {pendingCount}
                    </motion.span>
                  )}
                </AnimatePresence>

                {active && <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-l-sm bg-accent" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3.5 border-t border-border/50 flex items-center gap-3 shrink-0">
          <span className="text-xs text-text-muted shrink-0">A</span>
          <AnimatePresence>
            {hovered && (
              <motion.span
                key="footer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.1 } }}
                exit={{ opacity: 0 }}
                className="text-xs text-text-muted whitespace-nowrap"
              >
                GTU ExamAI · Admin
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </>
  );
}
