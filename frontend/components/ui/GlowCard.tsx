"use client";

import { useState, ReactNode } from "react";

export function GlowCard({
  children,
  glowColor,
  borderHoverColor,
  className = "",
}: {
  children: ReactNode;
  glowColor: string;
  borderHoverColor: string;
  className?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`relative p-6 rounded-3xl h-full transition-all duration-300 cursor-default ${className}`}
      style={{
        background: hovered ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.03)",
        border: hovered ? `1px solid ${borderHoverColor}` : "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
        boxShadow: hovered ? `0 0 40px ${glowColor}, 0 8px 32px rgba(0,0,0,0.3)` : "0 4px 24px rgba(0,0,0,0.2)",
        transform: hovered ? "translateY(-2px) scale(1.01)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  );
}
