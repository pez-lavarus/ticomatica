"use client";

import { Lightbulb } from "lucide-react";

interface HintModalProps {
  keywords?: string[];
  hints?: string[];
  hintStrategy?: string;
}

export default function HintModal({ keywords = [], hints = [], hintStrategy }: HintModalProps) {
  const pairs = keywords.map((keyword, index) => ({
    keyword,
    hint: hints[index] ?? "",
  }));

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-6 border-b border-border/60 flex items-center gap-3 bg-muted/30 shrink-0">
        <Lightbulb className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Pistas de la Pregunta</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {pairs.length > 0 ? (
          pairs.map(({ keyword, hint }, index) => (
            <div key={index} className="p-4 rounded-sm border border-border/60 bg-muted/20">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-2">
                {index + 1}. {keyword}
              </p>
              <p className="text-sm text-foreground font-serif leading-relaxed">{hint}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground font-serif">
            No hay pistas disponibles para esta pregunta.
          </p>
        )}
      </div>

      {hintStrategy && (
        <div className="p-4 border-t border-border/60 bg-muted/10 shrink-0">
          <p className="text-xs text-muted-foreground italic">{hintStrategy}</p>
        </div>
      )}
    </div>
  );
}
