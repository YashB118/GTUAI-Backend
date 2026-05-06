interface Props {
  questions: string[];
  onSelect: (q: string) => void;
}

export function SuggestedQuestions({ questions, onSelect }: Props) {
  if (!questions.length) return null;
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-border">
      {questions.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect(q)}
          className="text-xs px-3 py-1.5 rounded-full border border-accent/30 text-accent hover:bg-accent/10 transition-colors text-left max-w-[240px] truncate"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
