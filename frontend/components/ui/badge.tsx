import { cn } from "@/lib/utils";

type BadgeVariant =
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "pending"
  | "approved"
  | "rejected"
  | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  accent:   "bg-accent/10 text-accent border-accent/20",
  success:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  danger:   "bg-red-500/10 text-red-400 border-red-500/20",
  pending:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  default:  "bg-bg-elevated text-text-secondary border-border",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border tracking-wide",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
