// Shared TypeScript interfaces for Ticomatica

export interface QuestionOption {
  label: "A" | "B" | "C" | "D";
  text?: string;
  image?: string;
}

export interface Question {
  original_number: number;
  section_number: number;
  statement: string;
  problem: string;
  shared_image?: string;
  options: QuestionOption[];
  correct_answer: "A" | "B" | "C" | "D";
  topic: string;
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
