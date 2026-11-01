import { describe, expect, it } from "vitest";
import { advanceAssessmentClock } from "./assessment-clock";
import { EMPTY_SESSION } from "./test-session";
import type { Question } from "./types";
const questions = [
  { topic: "Geometría", resolutionTimeMinutes: 2 },
  { topic: "Geometría", resolutionTimeMinutes: 4 },
  { topic: "Funciones", resolutionTimeMinutes: 3 },
] as Question[];
const hard = { ...EMPTY_SESSION, hardMode: true };

describe("hard-mode clock", () => {
  it("consumes only the active unanswered question and keeps the general clock running", () => {
    const first = advanceAssessmentClock(hard, questions, 12.5);
    const second = advanceAssessmentClock({ ...first, index: 1 }, questions, 20);
    expect(second.questionTimeLeft).toEqual({ 0: 107.5, 1: 220 });
    const returned = advanceAssessmentClock({ ...second, index: 0 }, questions, 2);
    expect(returned.questionTimeLeft).toEqual({ 0: 105.5, 1: 220 });
    expect(returned.timeLeft).toBe(180 * 60 - 34.5);
  });
  it("expires without inventing an answer and advances across a section boundary", () => {
    const next = advanceAssessmentClock({ ...hard, index: 1, questionTimeLeft: { 1: 1 } }, questions, 1);
    expect(next.expiredQuestions).toEqual({ 1: true });
    expect(next.answers).toEqual({});
    expect(next.index).toBe(2);
    expect(next.topicIndex).toBe(1);
    expect(next.questionTimeLeft[1]).toBe(0);
  });
  it("wraps to unanswered questions and never escapes a practice section", () => {
    const next = advanceAssessmentClock({ ...hard, mode: "Geometría", index: 1, questionTimeLeft: { 1: 1 } }, questions, 1);
    expect(next.index).toBe(0);
    expect(next.expiredQuestions[1]).toBe(true);
  });
  it("stops a submitted question clock but continues the overall countdown", () => {
    const next = advanceAssessmentClock({ ...hard, answers: { 0: "A" }, questionTimeLeft: { 0: 30 } }, questions, 40);
    expect(next.questionTimeLeft[0]).toBe(30);
    expect(next.expiredQuestions).toEqual({});
    expect(next.timeLeft).toBe(EMPTY_SESSION.timeLeft - 40);
  });
  it("does not activate question timing in ordinary mode or while reviewing/results", () => {
    expect(advanceAssessmentClock(EMPTY_SESSION, questions, 3).questionTimeLeft).toEqual({});
    for (const session of [{ ...hard, review: true }, { ...hard, phase: "results" as const }]) {
      expect(advanceAssessmentClock(session, questions, 500)).toEqual(session);
    }
  });
  it("does not give the next question time spent on a delayed tick or exceed the general limit", () => {
    const delayed = advanceAssessmentClock(hard, questions, 200);
    expect(delayed.expiredQuestions).toEqual({ 0: true });
    expect(delayed.questionTimeLeft[1]).toBeUndefined();
    const final = advanceAssessmentClock({ ...hard, timeLeft: 3 }, questions, 100);
    expect(final.timeLeft).toBe(0);
    expect(final.questionTimeLeft[0]).toBe(117);
    expect(final.expiredQuestions).toEqual({});
  });
});
