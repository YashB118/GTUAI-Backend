"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PredictionCardProps {
  question: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  score: number;
  yearsAsked: number[];
  expectedMarks: number | null | undefined;
  unit: number | null | undefined;
  questionType?: string | null;
  answer?: string | null;
  index: number;
  onClick?: () => void;
}

const CONFIDENCE_VARIANTS = {
  HIGH: "success" as const,
  MEDIUM: "warning" as const,
  LOW: "danger" as const,
};

export function PredictionCard({
  question,
  confidence,
  score,
  yearsAsked,
  expectedMarks,
  unit,
  questionType,
  index,
  onClick,
}: PredictionCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-bg-card border border-border rounded-xl p-5 hover:border-accent/40 hover:bg-bg-elevated transition-all duration-200 hover:-translate-y-0.5 group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={CONFIDENCE_VARIANTS[confidence]}>
            {confidence} · {Math.round(score)}%
          </Badge>
          {unit && (
            <Badge variant="accent">Unit {unit}</Badge>
          )}
          {questionType && (
            <span className="text-xs text-text-muted capitalize">{questionType}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-text-muted">#{index + 1}</span>
          <Sparkles size={12} className="text-text-muted group-hover:text-accent transition-colors" />
        </div>
      </div>

      <p className="text-sm text-text-primary leading-relaxed mb-4">
        {question}
      </p>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {yearsAsked.map((y) => (
            <span
              key={y}
              className="inline-flex items-center px-2 py-0.5 bg-bg-elevated border border-border rounded text-xs text-text-secondary font-mono"
            >
              {y}
            </span>
          ))}
        </div>
        {expectedMarks != null && (
          <span className="text-xs text-text-muted shrink-0">
            {expectedMarks} marks
          </span>
        )}
      </div>
    </button>
  );
}
