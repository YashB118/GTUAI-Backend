import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  // Brand accent fill — primary CTA across the app
  primary:
    "bg-accent text-white hover:bg-accent-hover active:scale-[0.98] shadow-[0_1px_2px_rgba(88,101,242,0.18),0_4px_12px_rgba(88,101,242,0.18)] hover:shadow-[0_2px_4px_rgba(88,101,242,0.22),0_8px_20px_rgba(88,101,242,0.22)] font-semibold",
  // White card with border, dark text — soft action
  secondary:
    "bg-bg-card text-text-primary border border-border hover:bg-bg-elevated hover:border-border-strong active:scale-[0.98]",
  // Transparent
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
  // Dark fill — sparingly for high contrast
  dark:
    "bg-text-primary text-bg-card hover:opacity-90 active:scale-[0.98]",
  danger:
    "bg-status-error/10 text-status-error hover:bg-status-error/15",
};

const sizes: Record<Size, string> = {
  sm:   "h-8  px-3.5 text-[12.5px]",
  md:   "h-10 px-4   text-[13.5px]",
  lg:   "h-11 px-5   text-[14px]",
  icon: "h-9 w-9 px-0",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, children, disabled, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
