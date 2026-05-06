"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sparkles, MessageSquare, Swords, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home",        icon: LayoutDashboard, href: "/dashboard",  special: false },
  { label: "Andaza Laga", icon: Sparkles,        href: "/predict",    special: false },
  { label: "Brahmastra",  icon: Swords,          href: "/brahmastra", special: true  },
  { label: "Pooch Lo",    icon: MessageSquare,   href: "/chat",       special: false },
  { label: "Notes",       icon: BookOpen,        href: "/materials",  special: false },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-border/60 bg-bg-primary/95 backdrop-blur-xl">
      {NAV_ITEMS.map(({ label, icon: Icon, href, special }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium transition-colors",
              special
                ? active ? "text-blue-300" : "text-blue-400/70 hover:text-blue-400"
                : active ? "text-accent" : "text-text-muted hover:text-text-secondary"
            )}
          >
            <span className={cn(
              "rounded-xl p-1.5 transition-colors",
              special
                ? active ? "bg-blue-500/15" : ""
                : active ? "bg-accent/10" : ""
            )}>
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
