import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
  hover?: boolean;
}

export function Card({ children, className, accent, hover }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-5 transition-all duration-300 card-depth",
        hover && "hover:card-depth-hover hover:-translate-y-px cursor-pointer",
        accent && "ring-1 ring-accent/20 shadow-accent",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-[12px] font-medium text-text-secondary uppercase tracking-[0.06em]", className)}>{children}</h3>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(className)}>{children}</div>;
}
