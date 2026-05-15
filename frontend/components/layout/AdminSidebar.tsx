"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CheckCircle, FileText,
  GraduationCap, Users, BarChart3, Settings, X,
  ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const navItems = [
  { href: "/admin/dashboard",  icon: LayoutDashboard, label: "Dashboard",  badge: false },
  { href: "/admin/approvals",  icon: CheckCircle,     label: "Approvals",  badge: true  },
  { href: "/admin/papers",     icon: FileText,        label: "Papers",     badge: false },
  { href: "/admin/subjects",   icon: GraduationCap,   label: "Subjects",   badge: false },
  { href: "/admin/users",      icon: Users,           label: "Users",      badge: false },
  { href: "/admin/analytics",  icon: BarChart3,       label: "Analytics",  badge: false },
  { href: "/admin/settings",   icon: Settings,        label: "Settings",   badge: false },
];

const COLLAPSED = 68;
const EXPANDED  = 232;

const sidebarSpring = { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.7 };

const labelVariants = {
  hidden:  { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.14, delay: 0.05 } },
  exit:    { opacity: 0, x: -6, transition: { duration: 0.08 } },
};

interface AdminSidebarProps { open?: boolean; onClose?: () => void; }

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

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
        <div className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      {/* Mobile drawer */}
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : "-100%" }}
        transition={sidebarSpring}
        className="fixed top-0 left-0 z-30 h-full w-[260px] flex flex-col bg-bg-card border-r border-border lg:hidden shadow-modal"
      >
        <div className="flex items-center justify-between h-16 px-5">
          <span className="text-[13px] text-text-primary font-semibold">Admin</span>
          <button onClick={onClose} className="text-text-muted p-2 rounded-xl hover:bg-bg-elevated">
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-1">
          {navItems.map(({ href, icon: Icon, label, badge }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            const showBadge = badge && pendingCount > 0;
            return (
              <Link key={href} href={href} onClick={onClose}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-colors",
                  active ? "bg-accent/10 text-accent" : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                )}>
                <span className="flex items-center gap-3">
                  <Icon size={17} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
                  {label}
                </span>
                {showBadge && (
                  <span className="chip text-[11px] bg-status-warn/15 text-status-warn">{pendingCount}</span>
                )}
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
        <div className="h-16 shrink-0" />

        <nav className="flex-1 flex flex-col py-2 gap-0.5 px-3 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ href, icon: Icon, label, badge }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            const showBadge = badge && pendingCount > 0;
            return (
              <Link key={href} href={href} className={cn(
                "relative flex items-center h-10 rounded-xl px-3 shrink-0 transition-colors",
                active ? "bg-accent/10 text-accent" : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
              )}>
                <span className="relative flex items-center justify-center w-5 h-5 shrink-0">
                  <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                  {showBadge && collapsed && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-status-warn text-[9px] font-bold text-white flex items-center justify-center">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </span>

                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      key={`label-${href}`}
                      variants={labelVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="ml-3 text-[13.5px] font-medium whitespace-nowrap overflow-hidden"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {!collapsed && showBadge && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-auto chip text-[11px] bg-status-warn/15 text-status-warn shrink-0"
                    >
                      {pendingCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 shrink-0">
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand" : "Collapse"}
            className={cn(
              "flex items-center h-9 rounded-xl transition-colors w-full text-text-muted hover:text-text-primary hover:bg-bg-elevated",
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
