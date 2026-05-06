import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

type Status = "queued" | "processing" | "done" | "failed" | "idle";

interface ProcessingStatusProps {
  status: Status;
  questionCount?: number;
  fileName?: string;
}

export function ProcessingStatus({ status, questionCount, fileName }: ProcessingStatusProps) {
  if (status === "idle") return null;

  const config = {
    queued: {
      icon: <Clock size={16} className="text-amber-400" />,
      text: "Queued for processing...",
      sub: "Will start shortly",
      color: "border-amber-500/20 bg-amber-500/5",
    },
    processing: {
      icon: <Loader2 size={16} className="text-accent animate-spin" />,
      text: "Extracting questions with AI...",
      sub: "This takes 30–60 seconds",
      color: "border-accent/20 bg-accent/5",
    },
    done: {
      icon: <CheckCircle size={16} className="text-green-400" />,
      text: `Found ${questionCount ?? 0} questions`,
      sub: "Predictions updated below",
      color: "border-green-500/20 bg-green-500/5",
    },
    failed: {
      icon: <XCircle size={16} className="text-red-400" />,
      text: "Processing failed",
      sub: "AI could not extract questions. Try a clearer PDF or re-upload.",
      color: "border-red-500/20 bg-red-500/5",
    },
  }[status];

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${config.color}`}>
      <div className="mt-0.5 shrink-0">{config.icon}</div>
      <div>
        <p className="text-sm font-medium text-text-primary">{config.text}</p>
        <p className="text-xs text-text-secondary mt-0.5">{config.sub}</p>
        {fileName && <p className="text-xs text-text-muted mt-1 font-mono truncate">{fileName}</p>}
      </div>
    </div>
  );
}
