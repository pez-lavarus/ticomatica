import type { Question } from "./types";
import type { TestSession } from "./test-session";
import { FULL_TEST_TOPICS } from "./constants";

export function questionTimeSeconds(question: Question): number {
  return (question.resolutionTimeMinutes ?? 3) * 60;
}

/** One atomic clock transition: expiration is separate from a submitted answer. */
export function advanceAssessmentClock(session: TestSession, questions: Question[], elapsed: number): TestSession {
  if (session.phase !== "active" || session.review || session.timeLeft <= 0) return session;
  const seconds = Math.min(Math.max(0, elapsed), session.timeLeft);
  const next = { ...session, timeLeft: Math.max(0, session.timeLeft - seconds) };
  const question = questions[session.index];
  if (!session.hardMode || !question || (session.mode !== "full" && question.topic !== session.mode)
    || session.answers[session.index] || session.expiredQuestions[session.index]) return next;
  const remaining = Math.max(0, (session.questionTimeLeft[session.index] ?? questionTimeSeconds(question)) - seconds);
  next.questionTimeLeft = { ...session.questionTimeLeft, [session.index]: remaining };
  if (remaining > 0) return next;
  next.expiredQuestions = { ...session.expiredQuestions, [session.index]: true };
  const pending = questions.flatMap((q, index) => (session.mode === "full" || q.topic === session.mode)
    && !session.answers[index] && !next.expiredQuestions[index] ? [index] : []);
  const following = pending.find((index) => index > session.index) ?? pending[0];
  if (following !== undefined) {
    next.index = following;
    const topicIndex = FULL_TEST_TOPICS.indexOf(questions[following].topic);
    if (session.mode === "full" && topicIndex >= 0) next.topicIndex = topicIndex;
  }
  return next;
}
