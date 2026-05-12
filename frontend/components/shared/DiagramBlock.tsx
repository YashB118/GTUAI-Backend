"use client";

import { useEffect, useRef, useState } from "react";

interface DiagramBlockProps {
  engine: "mermaid" | "graphviz" | "ascii";
  dsl: string;
  fallbackAscii?: string;
  svgData?: string | null;
  diagramType?: string;
  title?: string;
}

export default function DiagramBlock({
  engine,
  dsl,
  fallbackAscii,
  svgData,
  diagramType,
  title,
}: DiagramBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState(false);
  const [rendered, setRendered] = useState(false);

  // Server-side SVG (Kroki) — highest priority
  if (svgData) {
    return (
      <div className="diagram-block my-4 rounded-lg border border-border bg-muted/30 p-4">
        {title && <p className="text-xs text-muted-foreground mb-2 font-medium">Fig: {title}</p>}
        <div
          className="flex justify-center overflow-auto"
          dangerouslySetInnerHTML={{ __html: svgData }}
        />
      </div>
    );
  }

  // ASCII diagram — pre-formatted
  if (engine === "ascii") {
    return (
      <div className="diagram-block my-4 rounded-lg border border-border bg-muted/30 p-4">
        {title && <p className="text-xs text-muted-foreground mb-2 font-medium">Fig: {title}</p>}
        <pre className="text-xs font-mono overflow-auto leading-tight whitespace-pre">
          {dsl || fallbackAscii}
        </pre>
      </div>
    );
  }

  // Graphviz — fallback to ASCII since browser can't render DOT without a lib
  if (engine === "graphviz") {
    return (
      <div className="diagram-block my-4 rounded-lg border border-border bg-muted/30 p-4">
        {title && <p className="text-xs text-muted-foreground mb-2 font-medium">Fig: {title}</p>}
        <pre className="text-xs font-mono overflow-auto leading-tight whitespace-pre">
          {fallbackAscii || dsl}
        </pre>
      </div>
    );
  }

  // Mermaid — render in browser via global mermaid object loaded by layout.tsx
  return (
    <div className="diagram-block my-4 rounded-lg border border-border bg-muted/30 p-4">
      {title && <p className="text-xs text-muted-foreground mb-2 font-medium">Fig: {title}</p>}
      <MermaidRenderer dsl={dsl} fallback={fallbackAscii} />
    </div>
  );
}

function MermaidRenderer({ dsl, fallback }: { dsl: string; fallback?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ref.current || !dsl) return;
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    ref.current.innerHTML = `<div class="mermaid" id="${id}">${dsl}</div>`;

    const mermaid = (window as any).mermaid;
    if (mermaid) {
      try {
        mermaid.init(undefined, `#${id}`);
      } catch {
        setError(true);
      }
    }
  }, [dsl]);

  if (error) {
    return (
      <pre className="text-xs font-mono overflow-auto leading-tight whitespace-pre">
        {fallback || dsl}
      </pre>
    );
  }

  return <div ref={ref} className="flex justify-center overflow-auto" />;
}
