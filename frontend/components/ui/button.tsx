import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:scale-[0.98] shadow-[0_1px_6px_rgba(108,99,255,0.28)] hover:shadow-[0_2px_14px_rgba(108,99,255,0.38)]",
  secondary:
    "bg-transparent border border-border text-text-primary hover:border-accent/30 hover:bg-bg-elevated",
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
  danger:
    "bg-red-500/8 text-red-400 border border-red-500/15 hover:bg-red-500/12 hover:border-red-500/25",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[12px] rounded-lg",
  md: "px-4 py-2 text-[13px] rounded-lg",
  lg: "px-6 py-2.5 text-sm rounded-xl",
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
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed",
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
