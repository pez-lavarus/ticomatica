// Shared TypeScript interfaces for Ticomatica

import type { VisualSpec } from "@/app/types";

export interface QuestionOption {
  label: "A" | "B" | "C" | "D";
  text?: string;
  image?: string;
  /** Dark-mode variant of `image` (falls back to `image` when absent). */
  image_dark?: string;
}

export interface Question {
  original_number: number;
  section_number: number;
  statement: string;
  problem: string;
  /** Legacy PNG graph key (no longer used; visuals drive the graph). */
  shared_image?: string;
  /** Structured graph spec rendered by `VisualRenderer`. */
  visual_spec?: VisualSpec | null;
  /** Resolved source-image URL for the question's statement graph. */
  graph_image?: string;
  /** Dark-mode variant of `graph_image` (falls back to `graph_image` when absent). */
  graph_image_dark?: string;
  options: QuestionOption[];
  correct_answer: "A" | "B" | "C" | "D";
  topic: string;
  /** Specific knowledge topic from the item bank (e.g. "Circunferencia"). */
  knowledge_topic?: string;
  /** Shared-context group id (same graph/statement across sibling items). */
  group_id?: string | null;
  keywords?: string[];
  hints?: string[];
  hint_strategy?: string;
}

export type TestMode = "full" | "Geometría" | "Funciones" | "Estadística y Probabilidad";

export interface TestConfig {
  mode: TestMode;
  durationMinutes: number;
  questionCount: number;
}

export interface Explanation {
  original_number: number;
  display_number: number;
  image?: string;
  shared_image?: string;
  explanation_steps: string[];
}

export interface QuizMetadata {
  document: string;
  program: string;
  subject: string;
  year: number;
  convocatoria: string;
  section: string;
  items_practica: string;
  format: string;
  source: string;
  notes: string;
}

export interface QuizData {
  metadata: QuizMetadata;
  shared_images: Record<string, string>;
  questions: Question[];
  explanations: Explanation[];
}

export interface UserData {
  name: string;
  age: number;
}
