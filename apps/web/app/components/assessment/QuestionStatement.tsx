"use client";

import { STATEMENT_GRAPH_SIZE } from "@/lib/graph-sizes";
import { KaTeXText } from "@/lib/katex-utils";
import { getGraphDimensions } from "@/lib/graph-aspects";
import type { Question } from "@/lib/types";
import type { VisualSpec } from "@/app/types";
import { VisualRenderer } from "@/app/components/visuals/VisualRenderer";
import { SourceImage } from "./SourceImage";
import { QuestionPanel } from "./QuestionPanel";
import type { PanelSlot } from "./QuestionPanel";

interface QuestionStatementProps {
  question: Question;
  sharedImageSrc?: string;
  /** Structured graph spec rendered by `VisualRenderer`. */
  visualSpec?: VisualSpec | null;
  onOpenImageModal: (src: string, alt: string, svg?: string) => void;
  /** Placement and measuring hooks from `useQuestionLayout`. */
  slot: PanelSlot;
  /** Text beside the graph instead of above it. */
  split?: boolean;
  /** Max graph height chosen by the layout (px); null keeps the CSS default. */
  graphMax?: number | null;
}

export function QuestionStatement({
  question,
  sharedImageSrc,
  visualSpec,
  onOpenImageModal,
  slot,
  split,
  graphMax,
}: QuestionStatementProps) {
  const graphDimensions = getGraphDimensions(sharedImageSrc);
  const isStructuredGraph = visualSpec && (visualSpec.visual ?? visualSpec).type !== "table";
  return (
    <QuestionPanel
      id="statement"
      slot={slot}
      contentKey={question.original_number}
      split={split}
      graphMax={graphMax}
    >
      {/* `group-data-[split=true]` reads the data-split attribute on the panel
          content, which is how the layout switches this arrangement. */}
      <div className="p-5 md:p-6 flex flex-col gap-5 md:gap-6 group-data-[split=true]:flex-row group-data-[split=true]:items-center">
        {/* The text keeps a readable measure however wide the panel gets, so
            a wide graph can use the extra width without stretching the lines. */}
        {question.statement && (
          <div className="prose dark:prose-invert w-full max-w-[72ch] mx-auto text-base md:text-lg leading-[1.6] md:leading-[1.8] text-foreground font-serif min-w-0 group-data-[split=true]:flex-1 group-data-[split=true]:max-w-none group-data-[split=true]:mx-0">
            <KaTeXText text={question.statement} />
          </div>
        )}

        {visualSpec ? (
          <div className={`min-w-0 flex items-center justify-center mx-auto ${isStructuredGraph ? "source-graph-frame statement-visual-frame" : "w-full"}`}
            style={isStructuredGraph ? { width: STATEMENT_GRAPH_SIZE.width, maxWidth: "100%", aspectRatio: `${STATEMENT_GRAPH_SIZE.width} / ${STATEMENT_GRAPH_SIZE.height}` } : undefined}>
            <VisualRenderer
              spec={visualSpec}
              itemId={question.original_number}
              className="w-full"
            />
          </div>
        ) : sharedImageSrc ? (
          /* Source graph: inline SVG when available, PNG fallback. */
          <div className="min-w-0 flex items-center justify-center group-data-[split=true]:flex-1">
            <button
              type="button"
              style={{ width: STATEMENT_GRAPH_SIZE.width + 2 }}
              aria-label="Ampliar imagen de apoyo"
              className="flex items-center justify-center w-fit max-w-full rounded-sm border border-border overflow-hidden cursor-zoom-in hover:border-accent transition-colors shadow-sm"
              onClick={() => onOpenImageModal(sharedImageSrc, "Imagen de apoyo", question.graph_svg)}
            >
              <SourceImage
                size="statement"
                svg={question.graph_svg}
                png={sharedImageSrc}
                alt="Imagen de apoyo"
                width={graphDimensions?.width ?? 800}
                height={graphDimensions?.height ?? 600}
                className="graph-image block w-auto h-auto max-w-full max-h-[var(--graph-max,450px)] object-contain bg-white pointer-events-none"
              />
            </button>
          </div>
        ) : null}
      </div>
    </QuestionPanel>
  );
}
