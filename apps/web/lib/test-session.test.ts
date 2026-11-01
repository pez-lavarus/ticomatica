import { beforeEach, describe, expect, it } from "vitest";
import { EMPTY_SESSION, SESSION_KEY, loadTestSession, resetTestSession, saveTestSession, hasTestProgress } from "./test-session";
import { FULL_TEST_TIME, SECTION_TIME } from "./constants";
describe("timed session persistence", () => {
  beforeEach(() => localStorage.clear());
  it("starts a full 180-minute test and resets all hard-mode timing on retake", () => {
    expect(FULL_TEST_TIME).toBe(180 * 60);
    resetTestSession("full", FULL_TEST_TIME, true);
    expect(loadTestSession()).toMatchObject({ hardMode: true, timeLeft: 10800, questionTimeLeft: {}, expiredQuestions: {} });
    saveTestSession({ ...EMPTY_SESSION, hardMode: true, questionTimeLeft: { 0: 3.5 }, expiredQuestions: { 1: true } });
    expect(loadTestSession().questionTimeLeft[0]).toBe(3.5);
    expect(hasTestProgress()).toBe(true);
    resetTestSession("Geometría", SECTION_TIME, true);
    expect(loadTestSession()).toMatchObject({ hardMode: true, timeLeft: SECTION_TIME, questionTimeLeft: {}, expiredQuestions: {} });
  });
  it("upgrades old full exams to 180 minutes while preserving elapsed time and answers", () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ mode: "full", timeLeft: 7100, answers: { 0: "A" } }));
    const session = loadTestSession();
    expect(session.timeLeft).toBe(10700);
    expect(session.answers[0]).toBe("A");
    expect(session.hardMode).toBe(false);
    saveTestSession(session);
    expect(loadTestSession().timeLeft).toBe(10700);
  });
  it("migrates legacy full-exam clocks once and keeps legacy review times intact", () => {
    localStorage.setItem("bxm-pilot-mode", "full");
    localStorage.setItem("bxm-pilot-time-left", "7000");
    expect(loadTestSession().timeLeft).toBe(10600);
    expect(loadTestSession().timeLeft).toBe(10600);
    localStorage.clear();
    localStorage.setItem("bxm-pilot-mode", "full");
    localStorage.setItem("bxm-pilot-time-left", "7000");
    localStorage.setItem("bxm-pilot-review", "true");
    expect(loadTestSession().timeLeft).toBe(7000);
  });
  it("does not change historical completed-session times", () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ phase: "results", mode: "full", timeLeft: 20 }));
    expect(loadTestSession().timeLeft).toBe(20);
  });
});
