import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
  hover?: boolean;
  padding?: "sm" | "md" | "lg" | "none";
}

const PADDING_MAP = {
  none: "",
  sm:   "p-4",
  md:   "p-6",
  lg:   "p-7",
};

export function Card({ children, className, accent, hover, padding = "md" }: CardProps) {
  return (
    <div
      className={cn(
        "card rounded-2xl",
        PADDING_MAP[padding],
        hover && "card-hover hover:-translate-y-0.5 cursor-pointer",
        accent && "ring-1 ring-accent/20",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-5", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-[15px] font-semibold text-text-primary tracking-tight", className)}>{children}</h3>;
}

export function CardLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("section-title mb-2", className)}>{children}</p>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(className)}>{children}</div>;
}
