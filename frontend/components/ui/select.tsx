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
      <div className="flex flex-col gap-2">
        {label && (
          <label
            htmlFor={id}
            className="text-[13px] font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          style={{ colorScheme: "inherit", ...style }}
          className={cn(
            "h-11 w-full rounded-xl bg-bg-card border border-border",
            "px-4 pr-8 text-[14px] text-text-primary",
            "focus:outline-none focus:border-accent/60 focus:ring-4 focus:ring-accent/10",
            "transition-all duration-150 cursor-pointer appearance-none",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-status-error/60",
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
        {error && <p className="text-[12px] text-status-error">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
