"use client";

import { useId, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import { KaTeXText } from "@/lib/katex-utils";
import type { QuestionHint, QuestionFormula } from "@/lib/types";

interface HintModalProps {
  keywords?: string[];
  hints?: QuestionHint[];
  formulas?: QuestionFormula[];
  answerSteps?: string[];
  hintStrategy?: string;
}

const tabs = ["Pistas", "Fórmulas", "Respuesta"] as const;

export default function HintModal({ keywords = [], hints = [], formulas = [], answerSteps = [], hintStrategy }: HintModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const topic = keywords[0];
  const cardClass = "p-4 rounded-sm border border-border/60 bg-muted/20 space-y-3 min-w-0";
  const textClass = "text-base md:text-lg text-foreground font-serif leading-[1.6] md:leading-[1.8]";

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      <div className="p-6 border-b border-border/60 flex items-center gap-3 bg-muted/30 shrink-0">
        <Lightbulb className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Pistas de la Pregunta</h3>
      </div>
      <div role="tablist" aria-label="Ayuda de la pregunta" className="grid grid-cols-3 border-b border-border/60 shrink-0">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            ref={(button) => { buttons.current[index] = button; }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={activeTab === index}
            tabIndex={activeTab === index ? 0 : -1}
            onClick={() => setActiveTab(index)}
            onKeyDown={(event) => {
              const next = event.key === "ArrowRight" ? (index + 1) % tabs.length
                : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length
                : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
              if (next === null) return;
              event.preventDefault();
              setActiveTab(next);
              buttons.current[next]?.focus();
            }}
            className={`px-2 py-3 text-sm font-semibold border-b-2 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-4px] ${activeTab === index ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:bg-muted/30"}`}
          >{tab}</button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab}
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={activeTab !== index}
          tabIndex={0}
          className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4"
        >
          {activeTab === index && <>
            {topic && <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary"><KaTeXText text={topic} /></p>}
            {index === 0 && (hints.length ? hints.map((entry, i) => (
              <article key={i} className={cardClass}>
                <h4 className="font-semibold text-foreground"><KaTeXText text={entry.hint} /></h4>
                <div className={textClass}><KaTeXText text={entry.explanation} formatLists /></div>
              </article>
            )) : <p className="text-muted-foreground">No hay pistas disponibles para esta pregunta.</p>)}
            {index === 1 && (formulas.length ? formulas.map((entry, i) => (
              <article key={i} className={cardClass}>
                <h4 className="font-semibold text-foreground">{entry.name}</h4>
                <div className={`${textClass} overflow-x-auto`}><KaTeXText text={`\\[${entry.formula}\\]`} /></div>
                <div className={textClass}><KaTeXText text={entry.explanation} formatLists /></div>
              </article>
            )) : <p className="text-muted-foreground font-serif leading-relaxed">Esta pregunta se resuelve con lectura e interpretación conceptual; no requiere una fórmula específica.</p>)}
            {index === 2 && (answerSteps.length ? answerSteps.map((step, i) => (
              <div key={i} className={cardClass}>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Paso {i + 1}</p>
                <div className={textClass}><KaTeXText text={step} formatLists /></div>
              </div>
            )) : <p className="text-muted-foreground">No hay una explicación disponible para esta pregunta.</p>)}
            {index === 2 && hintStrategy && <div className="text-sm text-muted-foreground font-serif italic"><KaTeXText text={hintStrategy} /></div>}
          </>}
        </div>
      ))}
    </div>
  );
}
