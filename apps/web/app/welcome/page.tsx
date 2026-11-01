import { FULL_TEST_TIME, SECTION_TIME } from "@/lib/constants";
import { quizData } from "@/lib/question-bank";
import type { TestMode, TestConfig } from "@/lib/types";
import WelcomeClient from "./WelcomeClient";

// Compute counts at build time; the welcome client does not need the item bank.
const topicCounts = quizData.questions.reduce<Record<string, number>>((acc, q) => {
  acc[q.topic] = (acc[q.topic] ?? 0) + 1;
  return acc;
}, {});

const TEST_CONFIGS: Record<TestMode, TestConfig> = {
  full: { mode: "full", durationMinutes: FULL_TEST_TIME / 60, questionCount: quizData.questions.length },
  Geometría: { mode: "Geometría", durationMinutes: SECTION_TIME / 60, questionCount: topicCounts["Geometría"] ?? 0 },
  Funciones: { mode: "Funciones", durationMinutes: SECTION_TIME / 60, questionCount: topicCounts["Funciones"] ?? 0 },
  "Estadística y Probabilidad": { mode: "Estadística y Probabilidad", durationMinutes: SECTION_TIME / 60, questionCount: topicCounts["Estadística y Probabilidad"] ?? 0 },
};

export default function WelcomePage() {
  return <WelcomeClient testConfigs={TEST_CONFIGS} />;
}
