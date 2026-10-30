// Transforms the structured 2026_2 item bank into the shape the question UI
// consumes (QuizData). The bank carries structured `visual_spec` graphs (SVG)
// instead of the legacy PNG placeholders, plus per-item solution steps that
// double as progressive hints.
//
// `questions.json` is the single source of truth: shared contexts and figures
// (items that refer to the same graph/table) live in its top-level `groups`
// array and are referenced from each item through `group_id`.

import questionsRaw from "@/data/2026_2/questions.json";
import type { VisualSpec } from "@/app/types";
import type { Explanation, Question, QuizData, QuizMetadata } from "@/lib/types";

/** Consistent graph width (px) injected into every visual so the figures do
 *  not jump in size from question to question. */
export const VISUAL_WIDTH = 520;

const AREA_TO_TOPIC: Record<string, string> = {
  geometry: "Geometría",
  functions: "Funciones",
  statistics: "Estadística y Probabilidad",
};

const HINT_STRATEGY =
  "Cada pista corresponde a un paso de la solución, en orden; la respuesta final solo se muestra al pedir la solución.";

type RawItem = {
  id: number;
  area_id?: string;
  topic?: string;
  statement?: string;
  problem?: string;
  options?: Record<string, string>;
  correct_answer?: string;
  solution_steps?: (string | { explanation?: string })[];
  group_id?: string | null;
  visual_spec?: VisualSpec | null;
};

type RawGroup = {
  group_id?: string;
  items?: number[];
  title?: string;
  visual_spec?: VisualSpec | null;
  context_text?: string | null;
};

type RawBank = {
  exam?: string;
  convocatoria?: string;
  source?: string;
  items?: RawItem[];
  groups?: RawGroup[];
};

function stepText(step: string | { explanation?: string }): string {
  if (typeof step === "string") return step;
  return step?.explanation ?? "";
}

/** Deep-clone a visual spec and pin a consistent width onto it. */
function withVisualWidth(spec: VisualSpec | null | undefined, width: number): VisualSpec | null {
  if (!spec) return null;
  const clone = JSON.parse(JSON.stringify(spec)) as VisualSpec;
  const visual = clone.visual ?? clone;
  if (typeof visual === "object") {
    visual.width = width;
    if (Array.isArray(visual.views)) {
      for (const view of visual.views) {
        if (view?.visual && typeof view.visual === "object") {
          view.visual.width = width;
        }
      }
    }
  }
  return clone;
}

function buildBank(): QuizData {
  const bank = questionsRaw as unknown as RawBank;
  const groups = bank.groups ?? [];

  const groupVisual = new Map<string, VisualSpec>();
  const groupContext = new Map<string, string>();
  for (const group of groups) {
    if (group.group_id && group.visual_spec) {
      groupVisual.set(group.group_id, group.visual_spec);
    }
    if (group.group_id && group.context_text) {
      groupContext.set(group.group_id, group.context_text);
    }
  }

  const items = bank.items ?? [];
  const sectionCounters: Record<string, number> = {};

  const questions: Question[] = items.map((item) => {
    const areaId = item.area_id ?? "";
    const topic = AREA_TO_TOPIC[areaId] ?? item.topic ?? areaId;
    const sectionNumber = (sectionCounters[areaId] = (sectionCounters[areaId] ?? 0) + 1);

    const options = (["A", "B", "C", "D"] as const).map((label) => ({
      label,
      text: item.options?.[label] ?? "",
    }));

    const steps = (item.solution_steps ?? []).map(stepText);
    const hints = steps.length > 1 ? steps.slice(0, -1) : steps;

    const ownVisual = item.visual_spec;
    const inheritedVisual = item.group_id ? groupVisual.get(item.group_id) ?? null : null;
    const visualSpec = withVisualWidth(ownVisual ?? inheritedVisual, VISUAL_WIDTH);

    const itemStatement = item.statement ?? "";
    const groupStatement = item.group_id ? (groupContext.get(item.group_id) ?? "") : "";

    return {
      original_number: item.id,
      section_number: sectionNumber,
      statement: itemStatement || groupStatement,
      problem: item.problem ?? "",
      visual_spec: visualSpec,
      options,
      correct_answer: (item.correct_answer as Question["correct_answer"]) ?? "A",
      topic,
      knowledge_topic: item.topic,
      group_id: item.group_id ?? null,
      keywords: item.topic ? [item.topic] : [],
      hints,
      hint_strategy: HINT_STRATEGY,
    };
  });

  const explanations: Explanation[] = items.map((item) => ({
    original_number: item.id,
    display_number: item.id,
    explanation_steps: (item.solution_steps ?? []).map(stepText),
  }));

  const metadata: QuizMetadata = {
    document: "Práctica de Matemáticas – Bachillerato por Madurez Suficiente",
    program: "BXM",
    subject: "Matemáticas",
    year: 2026,
    convocatoria: bank.convocatoria ?? "02-2026",
    section: "Consolidado (Geometría, Funciones, Estadística)",
    items_practica: `1 a ${items.length}`,
    format: "Selección única",
    source: bank.source ?? "Práctica BXM Matemáticas 02-2026",
    notes: "Gráficos vectoriales generados desde la especificación visual de cada ítem.",
  };

  return {
    metadata,
    shared_images: {},
    questions,
    explanations,
  };
}

export const quizData: QuizData = buildBank();
