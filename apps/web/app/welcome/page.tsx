import { quizData } from "@/lib/question-bank";
import type { TestMode, TestConfig } from "@/lib/types";
import WelcomeClient from "./WelcomeClient";

// Compute counts at build time; the welcome client does not need the item bank.
const topicCounts = quizData.questions.reduce<Record<string, number>>((acc, q) => {
  acc[q.topic] = (acc[q.topic] ?? 0) + 1;
  return acc;
}, {});

const TEST_CONFIGS: Record<TestMode, TestConfig> = {
  full: { mode: "full", durationMinutes: 120, questionCount: quizData.questions.length },
  Geometría: { mode: "Geometría", durationMinutes: 40, questionCount: topicCounts["Geometría"] ?? 0 },
  Funciones: { mode: "Funciones", durationMinutes: 40, questionCount: topicCounts["Funciones"] ?? 0 },
  "Estadística y Probabilidad": { mode: "Estadística y Probabilidad", durationMinutes: 40, questionCount: topicCounts["Estadística y Probabilidad"] ?? 0 },
};

export default function WelcomePage() {
  return <WelcomeClient testConfigs={TEST_CONFIGS} />;
}
