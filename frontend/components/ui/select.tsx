import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, placeholder, style, ...props }, ref) => {
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
        <select
          ref={ref}
          id={id}
          style={{ colorScheme: "inherit", ...style }}
          className={cn(
            "w-full rounded-lg bg-bg-elevated border border-border",
            "px-3.5 py-2.5 text-[13px] text-text-primary",
            "focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15",
            "transition-all duration-200 cursor-pointer appearance-none",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-red-500/50",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[11px] text-red-400 mt-0.5">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
