/**
 * Avatar system — deterministic per user ID.
 * Uses DiceBear `lorelei` style (illustrated character with visible shoulders).
 * Seed = user UUID → same avatar every render, no DB column needed.
 */

export type AvatarTheme = {
  name: string;
  primary: string;      // Tailwind bg class
  text: string;         // Tailwind text class
  cardBg: string;       // Tailwind bg for ID card
  cardBorder: string;   // Tailwind border
  badge: string;        // Tailwind chip bg+text
  hex: string;          // Hex for SVG inline use
};

const THEMES: AvatarTheme[] = [
  { name: "violet",  primary: "bg-violet-100",  text: "text-violet-700",  cardBg: "bg-violet-50",  cardBorder: "border-violet-200",  badge: "bg-violet-100 text-violet-700",  hex: "#7C3AED" },
  { name: "blue",    primary: "bg-blue-100",    text: "text-blue-700",    cardBg: "bg-blue-50",    cardBorder: "border-blue-200",    badge: "bg-blue-100 text-blue-700",      hex: "#2563EB" },
  { name: "emerald", primary: "bg-emerald-100", text: "text-emerald-700", cardBg: "bg-emerald-50", cardBorder: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700",hex: "#059669" },
  { name: "rose",    primary: "bg-rose-100",    text: "text-rose-700",    cardBg: "bg-rose-50",    cardBorder: "border-rose-200",    badge: "bg-rose-100 text-rose-700",      hex: "#E11D48" },
  { name: "amber",   primary: "bg-amber-100",   text: "text-amber-700",   cardBg: "bg-amber-50",   cardBorder: "border-amber-200",   badge: "bg-amber-100 text-amber-700",    hex: "#D97706" },
  { name: "cyan",    primary: "bg-cyan-100",    text: "text-cyan-700",    cardBg: "bg-cyan-50",    cardBorder: "border-cyan-200",    badge: "bg-cyan-100 text-cyan-700",      hex: "#0891B2" },
  { name: "pink",    primary: "bg-pink-100",    text: "text-pink-700",    cardBg: "bg-pink-50",    cardBorder: "border-pink-200",    badge: "bg-pink-100 text-pink-700",      hex: "#DB2777" },
  { name: "indigo",  primary: "bg-indigo-100",  text: "text-indigo-700",  cardBg: "bg-indigo-50",  cardBorder: "border-indigo-200",  badge: "bg-indigo-100 text-indigo-700",  hex: "#4F46E5" },
];

/** Deterministic hash of a string → 0..N-1 */
function hashMod(s: string, n: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % n;
}

/** Pick one of 8 themes deterministically from user ID */
export function getAvatarTheme(userId: string): AvatarTheme {
  return THEMES[hashMod(userId, THEMES.length)];
}

/** DiceBear URL for a given user ID */
export function getAvatarUrl(userId: string): string {
  // lorelei — illustrated character, diverse, shows shoulders
  // backgroundColor removed so we can set our own card bg
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(userId)}&scale=90`;
}

/** Short display name (first + last initial) */
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Student";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
