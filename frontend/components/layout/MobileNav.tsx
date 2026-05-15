"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, MessageSquare, BookOpen, Users } from "lucide-react";
// import { Swords } from "lucide-react";  // Brahmastra disabled — to be rebuilt
import { cn } from "@/lib/utils";

// 4 items — removed Home (topbar logo serves that), added Materials
const NAV_ITEMS = [
  { label: "Andaza Laga", icon: Sparkles,        href: "/predict"   },
  { label: "Pooch Lo",    icon: MessageSquare,   href: "/chat"      },
  { label: "Materials",   icon: BookOpen,        href: "/materials" },
  { label: "Community",   icon: Users,           href: "/community" },
  // { label: "Brahmastra", icon: Swords, href: "/brahmastra" },  // Brahmastra disabled — to be rebuilt
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-border/60 bg-bg-primary/95 backdrop-blur-xl">
      {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium transition-colors",
              active ? "text-accent" : "text-text-muted hover:text-text-secondary"
            )}
          >
            <span className={cn(
              "rounded-xl p-1.5 transition-colors",
              active ? "bg-accent/10" : ""
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
