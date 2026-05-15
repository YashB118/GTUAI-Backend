import { cn } from "@/lib/utils";

type BadgeVariant =
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "pending"
  | "approved"
  | "rejected"
  | "info"
  | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  accent:   "bg-accent/10 text-accent",
  success:  "bg-emerald-500/10 text-emerald-600",
  warning:  "bg-amber-500/10 text-amber-600",
  danger:   "bg-red-500/10 text-red-600",
  pending:  "bg-amber-500/10 text-amber-600",
  approved: "bg-emerald-500/10 text-emerald-600",
  rejected: "bg-red-500/10 text-red-600",
  info:     "bg-blue-500/10 text-blue-600",
  default:  "bg-bg-muted text-text-secondary",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
