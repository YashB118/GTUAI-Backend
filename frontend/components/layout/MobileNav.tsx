"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, MessageSquare, BookOpen, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Andaza", icon: Sparkles,      href: "/predict"   },
  { label: "Chat",   icon: MessageSquare, href: "/chat"      },
  { label: "Notes",  icon: BookOpen,      href: "/materials" },
  { label: "Group",  icon: Users,         href: "/community" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 md:hidden">
      <div className="flex items-center justify-around bg-bg-card border border-border rounded-full shadow-elevated px-2 py-2">
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors"
            >
              <span
                className={cn(
                  "rounded-full w-9 h-9 flex items-center justify-center transition-all",
                  active
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
              </span>
              <span className={cn("transition-colors", active ? "text-text-primary" : "text-text-muted")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
