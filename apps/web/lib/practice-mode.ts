import type { TestMode } from "@/lib/types";

export interface ModeBehavior {
  autoAdvance: boolean;
  immediateFeedback: boolean;
  showExplanation: boolean;
  collapseOptions: boolean;
}

export function isPracticeMode(testMode: TestMode): boolean {
  return testMode !== "full";
}

export function getModeBehavior(testMode: TestMode): ModeBehavior {
  if (testMode === "full") {
    return {
      autoAdvance: true,
      immediateFeedback: false,
      showExplanation: false,
      collapseOptions: false,
    };
  }
  return {
    autoAdvance: false,
    immediateFeedback: true,
    showExplanation: true,
    collapseOptions: true,
  };
}
