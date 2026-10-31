"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAssessment } from "@/lib/hooks/useAssessment";
import { quizData } from "@/lib/question-bank";

const onTimerEnd = () => {};
type Assessment = ReturnType<typeof useAssessment>;
const AssessmentContext = createContext<(Assessment & {
  isHintModalOpen: boolean;
  setIsHintModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) | null>(null);

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const assessment = useAssessment({ quizData, onTimerEnd, paused: pathname === "/results" });
  const [hintRequested, setIsHintModalOpen] = useState(false);
  // Review always shows the current question's hints, including unanswered
  // questions. Derive this before paint so the panel never opens a frame late.
  const isHintModalOpen = pathname === "/test" && (assessment.reviewMode || hintRequested);
  const { mounted, isComplete, session, update } = assessment;
  useEffect(() => {
    if (mounted && isComplete && session.phase === "active" && !session.review && pathname === "/test") {
      update({ phase: "results", review: false });
      router.push("/results", { scroll: false });
    }
  }, [mounted, isComplete, session.phase, session.review, pathname, update, router]);

  return (
    <AssessmentContext.Provider value={{ ...assessment, isHintModalOpen, setIsHintModalOpen }}>
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessmentContext() {
  const context = useContext(AssessmentContext);
  if (!context) throw new Error("Assessment views must use the shared assessment layout");
  return context;
}
