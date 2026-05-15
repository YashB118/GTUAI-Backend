import { getAvatarUrl, getAvatarTheme } from "@/lib/avatar";

interface UserAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  userId?: string;         // if provided, use DiceBear; else fallback to initials
}

const COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-pink-100 text-pink-700",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return COLORS[hash % COLORS.length];
}

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-[11.5px]",
  md: "w-9 h-9 text-[13px]",
  lg: "w-12 h-12 text-[15px]",
};

export function UserAvatar({ name, size = "md", userId }: UserAvatarProps) {
  // If userId provided, render DiceBear avatar
  if (userId) {
    const theme = getAvatarTheme(userId);
    const url   = getAvatarUrl(userId);
    return (
      <div
        className={`${SIZE_CLASSES[size]} ${theme.primary} rounded-full overflow-hidden flex items-center justify-center shrink-0 select-none`}
        title={name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} className="w-full h-full object-cover" draggable={false} />
      </div>
    );
  }

  // Fallback: coloured initials
  const initials = getInitials(name || "?");
  const colorClass = getColorClass(name || "?");
  return (
    <div
      className={`${SIZE_CLASSES[size]} ${colorClass} rounded-full flex items-center justify-center font-semibold shrink-0 select-none`}
      title={name}
    >
      {initials}
    </div>
  );
}
