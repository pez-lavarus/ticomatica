/* eslint-disable @typescript-eslint/no-explicit-any */
export type DomainArea = 'geometry' | 'functions' | 'statistics';

export interface VisualElementSpec {
  type: string;
  [key: string]: any;
}

export interface VisualSpec {
  alt?: string;
  type?: string;
  visual?: VisualSpec;
  domain?: {
    x?: [number, number];
    y?: [number, number];
  };
  grid?: boolean;
  axes?: {
    arrows?: boolean;
  };
  x_label?: string;
  y_label?: string;
  children?: VisualElementSpec[];
  elements?: VisualElementSpec[];
  layout?: {
    rows: number;
    cols: number;
  };
  views?: Array<{
    id?: string;
    label?: string;
    visual?: VisualSpec;
  }>;
  [key: string]: any;
}

export interface Option {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface SolutionStep {
  step: number;
  title: string;
  explanation: string;
}

export interface SetInfo {
  id: string;
  name: string;
  description: string;
  total_items: number;
}

export interface Item {
  id: number;
  set_id?: string;
  area: string;
  area_id: DomainArea;
  topic: string;
  spec?: {
    block?: string;
    affirmation?: string;
    affirmation_desc?: string | null;
    evidence?: string;
    evidence_desc?: string;
  };
  evidence?: string;
  knowledge?: string;
  stem: string;
  options: Record<'A' | 'B' | 'C' | 'D', string> | Option[];
  correct_answer: 'A' | 'B' | 'C' | 'D';
  solution_steps: (string | SolutionStep)[];
  group_id?: string | null;
  visual_spec?: VisualSpec | null;
  [key: string]: any;
}

export interface Group {
  group_id: string;
  items: number[];
  title?: string;
  context_text?: string;
  visual_spec?: VisualSpec;
}

export interface QuestionBankData {
  schema_version: string;
  exam: string;
  convocatoria: string;
  language: string;
  source: string;
  specification: string;
  solucionario_verified: boolean;
  total_items: number;
  sets?: SetInfo[];
  sections: Array<{
    id: string;
    name: string;
    item_range: [number, number];
    total_items: number;
  }>;
  notes?: string[];
  items: Item[];
}

export interface GroupBankData {
  schema_version: string;
  groups: Group[];
}

export interface ItemResponse {
  itemId: number;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  isCorrect?: boolean;
  timeSpentSeconds?: number;
  flagged?: boolean;
}

export interface PracticeConfig {
  mode: 'simulation' | 'area' | 'topic';
  setId?: string | 'all';
  area?: DomainArea | 'all';
  topic?: string | 'all';
  itemCount: number | 'all';
  enableTimer: boolean;
  timerDurationMinutes: number;
}

export interface Attempt {
  id: string;
  userId: string;
  timestamp: string; // ISO String
  mode: 'simulation' | 'area' | 'topic';
  scopeText: string;
  scorePercentage: number;
  correctCount: number;
  totalItems: number;
  durationSeconds: number;
  responses: Record<number, ItemResponse>;
}

export interface TestSession {
  sessionId: string;
  userId: string;
  config: PracticeConfig;
  itemIds: number[];
  currentResponseIndex: number;
  responses: Record<number, ItemResponse>;
  flaggedItems: Record<number, boolean>;
  startTime: string;
  elapsedSeconds: number;
  isCompleted: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
}