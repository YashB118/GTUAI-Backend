import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label
            htmlFor={id}
            className="text-[13px] font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "h-11 w-full rounded-xl bg-bg-card border border-border",
            "px-4 text-[14px] text-text-primary placeholder:text-text-muted",
            "focus:outline-none focus:border-accent/60 focus:ring-4 focus:ring-accent/10",
            "transition-all duration-150",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            error && "border-status-error/60 focus:border-status-error focus:ring-status-error/10",
            className
          )}
          {...props}
        />
        {error && <p className="text-[12px] text-status-error">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
