"use client";

/**
 * AvatarCard — student's personal illustrated character with an ID card overlay.
 *
 * The card is positioned at the bottom of the avatar, overlapping slightly,
 * giving the visual impression the character is holding it.
 *
 * Sizes:
 *   sm  — 56px avatar, compact card  (used in chat messages, answer headers)
 *   md  — 80px avatar, standard card (used in navbar dropdown, community)
 *   lg  — 120px avatar, full card    (used in dashboard welcome, profile)
 *   xl  — 160px avatar, hero card    (used in onboarding, account page)
 */

import Image from "next/image";
import { Sparkles, GraduationCap, Hash } from "lucide-react";
import { getAvatarUrl, getAvatarTheme } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export interface AvatarCardProps {
  userId: string;
  name: string;
  branch?: string;
  semester?: number;
  enrollmentNo?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showCard?: boolean;
  className?: string;
}

const SIZE = {
  sm:  { avatar: 48,  card: "px-2 py-1.5 text-[10px]",     gap: "-mt-2" },
  md:  { avatar: 72,  card: "px-3 py-2   text-[11px]",     gap: "-mt-3" },
  lg:  { avatar: 108, card: "px-4 py-3   text-[12.5px]",   gap: "-mt-4" },
  xl:  { avatar: 148, card: "px-5 py-4   text-[13.5px]",   gap: "-mt-5" },
};

export function AvatarCard({
  userId,
  name,
  branch,
  semester,
  enrollmentNo,
  size = "md",
  showCard = true,
  className,
}: AvatarCardProps) {
  const theme  = getAvatarTheme(userId);
  const url    = getAvatarUrl(userId);
  const cfg    = SIZE[size];

  const firstName = name.split(" ")[0] || "Student";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* ── Character ── */}
      <div
        className={cn("rounded-2xl overflow-hidden flex items-center justify-center", theme.primary)}
        style={{ width: cfg.avatar, height: cfg.avatar }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name}
          width={cfg.avatar}
          height={cfg.avatar}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>

      {/* ── ID card ── */}
      {showCard && (
        <div
          className={cn(
            "w-full rounded-2xl border-2 shadow-card",
            theme.cardBg,
            theme.cardBorder,
            cfg.card,
            cfg.gap,
          )}
          style={{ maxWidth: cfg.avatar + 32 }}
        >
          {/* Accent strip at top of card */}
          <div
            className="w-8 h-1 rounded-full mx-auto mb-2"
            style={{ background: theme.hex }}
          />

          {/* Name */}
          <p className={cn("font-bold text-center leading-tight", theme.text)}>
            {firstName}
          </p>

          {/* Branch + Semester chips */}
          {(branch || semester) && (
            <div className="flex items-center justify-center gap-1 mt-1.5 flex-wrap">
              {branch && (
                <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold", theme.badge)}>
                  <GraduationCap size={9} />
                  {branch}
                </span>
              )}
              {semester && (
                <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold", theme.badge)}>
                  <Hash size={9} />
                  Sem {semester}
                </span>
              )}
            </div>
          )}

          {/* Enrollment — only on lg/xl */}
          {enrollmentNo && (size === "lg" || size === "xl") && (
            <p className="text-center text-text-muted font-mono mt-1.5 text-[10px] truncate">
              {enrollmentNo}
            </p>
          )}

          {/* Feature tag — shows "Andaza Se" branding */}
          {size === "xl" && (
            <div className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 mt-2 mx-auto", theme.badge)}>
              <Sparkles size={9} />
              <span className="font-semibold">Andaza Se</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * AvatarOnly — just the character circle, no card. For use in list items, messages.
 */
export function AvatarOnly({
  userId,
  name,
  size = 40,
  className,
}: {
  userId: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const theme = getAvatarTheme(userId);
  const url   = getAvatarUrl(userId);
  return (
    <div
      className={cn("rounded-full overflow-hidden flex items-center justify-center shrink-0", theme.primary, className)}
      style={{ width: size, height: size }}
      title={name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name} width={size} height={size} className="w-full h-full object-cover" draggable={false} />
    </div>
  );
}
