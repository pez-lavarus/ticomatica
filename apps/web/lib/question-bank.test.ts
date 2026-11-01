import { describe, expect, it } from "vitest";
import katex from "katex";
import raw from "@/data/2026_2/questions.json";
import { quizData } from "./question-bank";

function validateMath(text: string) {
  for (const match of text.matchAll(/\$([^$]+)\$/g)) {
    expect(() => katex.renderToString(match[1], { throwOnError: true })).not.toThrow();
  }
}

describe("authored question help", () => {
  it("loads concept pairs and relevant formulas separately from existing answer steps for all 60 items", () => {
    expect(quizData.questions).toHaveLength(60);
    expect(quizData.questions.reduce((sum, q) => sum + q.resolutionTimeMinutes!, 0)).toBe(180);
    for (const question of quizData.questions) {
      const item = raw.items.find((item) => item.id === question.original_number)!;
      expect(question.resolutionTimeMinutes).toBe(item.resolutionTimeMinutes);
      expect(question.resolutionTimeMinutes).toBeGreaterThan(0);
      expect(question.hints).toEqual(item.hints);
      expect(question.hints!.length).toBeGreaterThan(0);
      expect(question.formulas).toEqual(item.formulas);
      expect(question.answerSteps).toEqual(item.solution_steps.slice(0, -1));
      expect(quizData.explanations.find((entry) => entry.original_number === item.id)!.explanation_steps).toEqual(item.solution_steps);
      for (const hint of question.hints!) {
        expect(hint.hint.trim().length).toBeGreaterThan(0);
        expect(hint.explanation.trim().length).toBeGreaterThan(hint.hint.length);
        expect(hint.keywords.length).toBeGreaterThan(0);
        const content = [question.statement, question.problem, ...question.options.map((option) => option.text ?? "")].join(" ").toLocaleLowerCase();
        for (const keyword of hint.keywords) {
          expect(content).toContain(keyword.toLocaleLowerCase());
        }
        validateMath(hint.hint);
        validateMath(hint.explanation);
      }
      for (const formula of question.formulas!) {
        expect(() => katex.renderToString(formula.formula, { throwOnError: true, displayMode: true })).not.toThrow();
        validateMath(formula.explanation);
      }
    }
  });

  it("leaves conceptual graph-reading questions without invented formulas", () => {
    for (const id of [19, 24, 26, 27, 35, 36, 51, 52, 54, 57, 58]) {
      expect(quizData.questions.find((question) => question.original_number === id)!.formulas).toEqual([]);
    }
  });
});
