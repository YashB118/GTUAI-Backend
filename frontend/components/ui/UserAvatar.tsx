interface UserAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
}

const COLORS = [
  { bg: "bg-violet-500/20 border-violet-500/30 text-violet-400" },
  { bg: "bg-blue-500/20 border-blue-500/30 text-blue-400" },
  { bg: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" },
  { bg: "bg-amber-500/20 border-amber-500/30 text-amber-400" },
  { bg: "bg-rose-500/20 border-rose-500/30 text-rose-400" },
  { bg: "bg-cyan-500/20 border-cyan-500/30 text-cyan-400" },
  { bg: "bg-orange-500/20 border-orange-500/30 text-orange-400" },
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
  return COLORS[hash % COLORS.length].bg;
}

const SIZE_CLASSES = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base",
};

export function UserAvatar({ name, size = "md" }: UserAvatarProps) {
  const initials = getInitials(name || "?");
  const colorClass = getColorClass(name || "?");

  return (
    <div
      className={`${SIZE_CLASSES[size]} ${colorClass} rounded-full border flex items-center justify-center font-semibold shrink-0 select-none`}
      title={name}
    >
      {initials}
    </div>
  );
}
