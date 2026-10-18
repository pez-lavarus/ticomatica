/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, Flag, BookOpen, Shapes, BarChart3, Binary } from "lucide-react";
import type { QuizData } from "@/lib/types";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Logo } from "@/app/components/Logo";
import ImageModal from "@/app/components/ImageModal";
import ConfirmModal from "@/app/components/ConfirmModal";
import FormulaModal from "@/app/components/FormulaModal";
import SectionModal from "@/app/components/SectionModal";
import { QuestionExperience } from "@/app/components/assessment/QuestionExperience";
import { useAssessment } from "@/lib/hooks/useAssessment";
import { AssessmentErrorBoundary } from "@/app/components/error/AssessmentErrorBoundary";

// Import the normalized JSON manifest
import quizDataRaw from "@/data/BXM_Math_Full_02_2026_questions_answers.json";
const quizData: QuizData = quizDataRaw as unknown as QuizData;

import { FULL_TEST_TOPICS } from "@/lib/constants";

export default function QuestionPage() {
  const router = useRouter();
 
  // Modals state
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState({ src: "", alt: "" });

  const handleFinishTest = useCallback(() => {
    setIsConfirmModalOpen(true);
  }, []);

  const assessment = useAssessment({
    quizData,
    onTimerEnd: () => {
       // In the original page.tsx, when timeLeft === 0, handleNextSection was called.
       // handleNextSection would either jump to next section or call handleFinishTest (which opens the modal).
       // However, handleFinishTest just opens a modal. If the timer actually runs out,
       // maybe it should force finish?
       // Looking at original code:
       /*
       useEffect(() => {
         if (timeLeft === 0) handleNextSectionRef.current();
       }, [timeLeft]);
       */
       // We'll handle this in an effect here to keep logic clear.
    }
  });

  const {
    mounted,
    testMode,
    currentTopicIndex,
    currentIndex,
    selectedAnswers,
    flaggedQuestions,
    timeLeft,
    currentTopic,
    currentQuestion,
    currentSectionQuestionsWithGlobalIndex,
    sectionIndex,
    progress,
    isComplete,
    remainingCount,
    handleSelect,
    toggleFlag,
    handleNext,
    handlePrev,
    handleJumpToSection,
    jumpToQuestion,
    handleNextSection,
    testMode: currentTestMode,
    hasMoreSections,
  } = assessment;

  const handleNextWithFinish = useCallback(() => {
    if (sectionIndex === currentSectionQuestionsWithGlobalIndex.length - 1 && (!hasMoreSections || currentTestMode !== "full")) {
      handleFinishTest();
    } else {
      handleNext();
    }
  }, [sectionIndex, currentSectionQuestionsWithGlobalIndex.length, hasMoreSections, currentTestMode, handleFinishTest, handleNext]);

  // Timer end effect
  useEffect(() => {
    if (timeLeft === 0 && mounted) {
      if (testMode === "full" && currentTopicIndex < FULL_TEST_TOPICS.length - 1) {
        handleNextSection();
      } else {
        handleFinishTest();
      }
    }
  }, [timeLeft, mounted, testMode, currentTopicIndex, handleNextSection, handleFinishTest]);

  const confirmFinishTest = () => {
    localStorage.setItem("bxm-pilot-answers", JSON.stringify(selectedAnswers));
    localStorage.setItem("bxm-pilot-time-left", timeLeft.toString());
    router.push("/results");
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const openImageModal = (src: string, alt: string) => {
    setModalImage({ src, alt });
    setIsImageModalOpen(true);
  };

  if (!currentQuestion) return null;

  return (
    <AssessmentErrorBoundary>
    <div className="min-h-screen bg-background transition-colors">
      {/* Top Professional Bar */}
      <div className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 md:py-8 flex items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-6">
            <button
              onClick={() => {
                localStorage.setItem("bxm-pilot-answers", JSON.stringify(selectedAnswers));
                localStorage.setItem("bxm-pilot-flags", JSON.stringify(flaggedQuestions));
                localStorage.setItem("bxm-pilot-index", currentIndex.toString());
                localStorage.setItem("bxm-pilot-topic-index", currentTopicIndex.toString());
                localStorage.setItem("bxm-pilot-time-left", timeLeft.toString());
                router.push("/welcome");
              }}
              className="flex items-center gap-2 md:gap-3 group"
            >
              <Logo className="w-8 h-8 md:w-10 md:h-10 rounded-sm shadow-md group-hover:brightness-110 transition-all" />
            </button>
          </div>

          {/* Section Indicator & Timer - Separated but adjacent */}
          <div className="flex items-center gap-1.5 md:gap-3">
            <button
              onClick={() => setIsSectionModalOpen(true)}
              className="flex items-center justify-center w-8 h-8 md:w-14 md:h-14 bg-card rounded-sm border border-border shadow-sm hover:bg-muted transition-colors text-destructive"
              title="Información de la sección"
            >
              {currentTopic === "Geometría" && <Shapes className="w-4 h-4 md:w-7 md:h-7" />}
              {currentTopic === "Estadística y Probabilidad" && <BarChart3 className="w-4 h-4 md:w-7 md:h-7" />}
              {currentTopic === "Funciones" && <Binary className="w-4 h-4 md:w-7 md:h-7" />}
              {currentTopic === "full" && <Clock className="w-4 h-4 md:w-7 md:h-7" />}
            </button>

            <div className="flex items-center px-2 md:px-8 h-8 md:h-14 bg-card rounded-sm border border-border shadow-sm">
              <span className="font-mono text-xs md:text-2xl font-bold tabular-nums text-foreground min-w-[35px] md:min-w-[80px] text-center">
                {mounted ? formatTime(timeLeft) : "--:--"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-10">
            <div>
              <ThemeToggle />
            </div>
            <button
              onClick={() => setIsFormulaModalOpen(true)}
              className="flex items-center gap-1.5 md:gap-2 px-2 md:px-8 py-2 md:py-4 bg-muted border border-border hover:border-accent text-foreground text-[8px] md:text-xs font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] rounded-sm transition-colors"
              title="Fórmulas"
            >
              <BookOpen className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden md:inline">Fórmulas</span>
            </button>
            <button
              onClick={handleFinishTest}
              className="flex items-center gap-1.5 md:gap-4 px-3 md:px-10 py-2 md:py-4 bg-primary text-primary-foreground text-[8px] md:text-xs font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] rounded-sm shadow-md transition-all hover:brightness-90 group"
            >
              <Flag className="w-3 h-3 md:w-4 md:h-4 transition-colors group-hover:text-destructive group-active:text-destructive" />
              <span className="hidden sm:inline">Finalizar</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-1 bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <QuestionExperience
          question={currentQuestion}
          currentIndex={currentIndex}
          sectionQuestions={currentSectionQuestionsWithGlobalIndex}
          testMode={testMode}
          currentTopicIndex={currentTopicIndex}
          selectedAnswer={selectedAnswers[currentIndex]}
          isFlagged={!!flaggedQuestions[currentIndex]}
          selectedAnswers={selectedAnswers}
          flaggedQuestions={flaggedQuestions}
          onSelect={handleSelect}
          onToggleFlag={toggleFlag}
          onNext={handleNextWithFinish}
          onPrev={handlePrev}
          onJumpToQuestion={jumpToQuestion}
          onJumpToSection={handleJumpToSection}
          onOpenImageModal={openImageModal}
          isLastQuestionInSection={sectionIndex === currentSectionQuestionsWithGlobalIndex.length - 1}
          hasMoreSections={hasMoreSections}
          sharedImageSrc={currentQuestion.shared_image ? quizData.shared_images[currentQuestion.shared_image] : undefined}
        />
      </div>

      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        src={modalImage.src}
        alt={modalImage.alt}
      />

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmFinishTest}
        title="¿Finalizar la prueba?"
        message={
          isComplete
            ? "Has completado todas las preguntas de la prueba. ¿Deseas finalizar y ver tus resultados ahora?"
            : remainingCount === 1
              ? "Te falta 1 pregunta por responder. ¿Estás seguro de que deseas finalizar la prueba ahora?"
              : `Te faltan ${remainingCount} preguntas por responder. ¿Estás seguro de que deseas finalizar la prueba ahora?`
        }
        confirmText="Sí, finalizar"
        cancelText="Seguir practicando"
        variant={isComplete ? "primary" : "danger"}
      />

      <FormulaModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
      />

      <SectionModal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        currentTopic={currentTopic}
        testMode={testMode}
      />
    </div>
    </AssessmentErrorBoundary>
  );
}
