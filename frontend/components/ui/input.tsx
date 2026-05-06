import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-[11px] font-medium uppercase tracking-[0.07em] text-text-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            // Base — theme-aware background + hairline border
            "w-full rounded-lg bg-bg-elevated border border-border",
            "px-3.5 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted",
            // Focus — tight accent ring
            "focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 focus:bg-bg-card",
            "transition-all duration-200",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            error && "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/15",
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-red-400 mt-0.5">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
