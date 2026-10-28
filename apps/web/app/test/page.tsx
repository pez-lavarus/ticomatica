/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Clock, Flag, BookOpen, Shapes, BarChart3, Binary, RotateCcw, Lightbulb } from "lucide-react";
import type { QuizData } from "@/lib/types";
import ImageModal from "@/app/components/ImageModal";
import ConfirmModal from "@/app/components/ConfirmModal";
import FormulaModal from "@/app/components/FormulaModal";
import SectionModal from "@/app/components/SectionModal";
import HintModal from "@/app/components/HintModal";
import { QuestionExperience } from "@/app/components/assessment/QuestionExperience";
import { DesktopNavigator } from "@/app/components/assessment/DesktopNavigator";
import { useAssessment } from "@/lib/hooks/useAssessment";
import { useFontScale } from "@/lib/font-scale";
import { AssessmentErrorBoundary } from "@/app/components/error/AssessmentErrorBoundary";
import { preloadGraphAspects } from "@/lib/graph-aspects";

// Import the normalized JSON manifest
import quizDataRaw from "@/data/BXM_Math_Full_02_2026_questions_answers.json";
const quizData: QuizData = quizDataRaw as unknown as QuizData;

import { FULL_TEST_TOPICS } from "@/lib/constants";

export default function QuestionPage() {
  const router = useRouter();
  const { increase, decrease, scale, scaleIndex, steps } = useFontScale();

  // Modals state
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isHintModalOpen, setIsHintModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState({ src: "", alt: "" });
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalContainer(document.getElementById("test-header-controls"));
  }, []);

  const hintPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isHintModalOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (hintPanelRef.current && !hintPanelRef.current.contains(e.target as Node)) {
        setIsHintModalOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isHintModalOpen]);

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
    reviewMode,
    update,
    currentTopic,
    currentQuestion,
    currentSectionQuestionsWithGlobalIndex,
    sectionIndex,
    isComplete,
    remainingCount,
    handleSelect,
    toggleFlag,
    handleNext,
    handlePrev,
    jumpToQuestion,
    handleNextSection,
    testMode: currentTestMode,
    hasMoreSections,
  } = assessment;

  const allQuestionsWithGlobalIndex = quizData.questions.map((q, idx) => ({ ...q, globalIndex: idx }));
  const correctAnswers = quizData.questions.reduce<Record<number, string>>((acc, q, idx) => {
    acc[idx] = q.correct_answer;
    return acc;
  }, {});
  const navigatorSections = (testMode === "full" ? FULL_TEST_TOPICS : [testMode]).map((topic) => ({
    topic,
    questions: allQuestionsWithGlobalIndex
      .filter((q) => q.topic === topic)
      .map((q) => ({
        globalIndex: q.globalIndex,
        section_number: testMode === "full" ? q.globalIndex + 1 : q.section_number,
      })),
  }));

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

  // Preload every graph's aspect ratio so question switching never has to wait
  // for an image decode and the layout engine stays stable across navigation.
  useEffect(() => {
    const optionImages = quizData.questions.flatMap((question) =>
      question.options
        .map((option) => option.image)
        .filter((image): image is string => Boolean(image)),
    );
    void preloadGraphAspects([...Object.values(quizData.shared_images), ...optionImages]);
  }, []);

  const confirmFinishTest = () => {
    update({ phase: "results", review: false });
    router.push("/results");
  };

  const handleResults = () => {
    update({ phase: "results", review: false });
    router.push("/results");
  };

  const resetCurrentQuestion = useCallback(() => {
    update((prev) => {
      const answers = { ...prev.answers };
      delete answers[currentIndex];
      return { answers };
    });
  }, [currentIndex, update]);

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

  const explanation = quizData.explanations?.find(
    (e) => e.original_number === currentQuestion.original_number,
  );

  return (
    <AssessmentErrorBoundary>
    <div className="h-full flex flex-col bg-background transition-colors">

      {portalContainer &&
        createPortal(
          <>
            <div className="flex items-center gap-1.5 md:gap-3">
              {!reviewMode && (
                <div className="flex items-center px-2 md:px-8 h-8 md:h-14 bg-card rounded-sm border border-border shadow-sm">
                  <span className="font-mono text-xs md:text-2xl font-bold tabular-nums text-foreground min-w-[35px] md:min-w-[80px] text-center">
                    {mounted ? formatTime(timeLeft) : "--:--"}
                  </span>
                </div>
              )}

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
            </div>

            <div className="flex items-center gap-2 md:gap-6">
              <button
                onClick={() => setIsFormulaModalOpen(true)}
                className="flex items-center gap-1.5 md:gap-2 px-2 md:px-8 py-2 md:py-4 bg-muted border border-border hover:border-accent text-foreground text-xs md:text-xs font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] rounded-sm transition-colors"
                title="Fórmulas"
              >
                <BookOpen className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline">Fórmulas</span>
              </button>
              {!reviewMode && (
                <button
                  onClick={handleFinishTest}
                  className="flex items-center gap-1.5 md:gap-4 px-3 md:px-10 py-2 md:py-4 bg-primary text-primary-foreground text-xs md:text-xs font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] rounded-sm shadow-md transition-all hover:brightness-90 group"
                >
                  <Flag className="w-3 h-3 md:w-4 md:h-4 transition-colors group-hover:text-destructive group-active:text-destructive" />
                  <span className="hidden sm:inline">Finalizar</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={decrease}
                disabled={scaleIndex === 0}
                className="flex items-center justify-center w-8 h-8 md:w-14 md:h-14 bg-card rounded-sm border border-border shadow-sm hover:bg-muted transition-colors disabled:opacity-30"
                title="Reducir tamaño de texto"
                aria-label="Reducir tamaño de texto"
              >
                <span className="text-xs md:text-sm font-bold text-foreground">A−</span>
              </button>
              <button
                onClick={increase}
                disabled={scaleIndex === steps.length - 1}
                className="flex items-center justify-center w-8 h-8 md:w-14 md:h-14 bg-card rounded-sm border border-border shadow-sm hover:bg-muted transition-colors disabled:opacity-30"
                title="Aumentar tamaño de texto"
                aria-label="Aumentar tamaño de texto"
              >
                <span className="text-base md:text-xl font-bold text-foreground">A+</span>
              </button>
            </div>
            
            {!reviewMode && (
              <button
                onClick={resetCurrentQuestion}
                disabled={!selectedAnswers[currentIndex]}
                className="flex items-center justify-center w-8 h-8 md:w-14 md:h-14 bg-card rounded-sm border border-border shadow-sm hover:bg-muted transition-colors disabled:opacity-30"
                title="Limpiar respuesta"
                aria-label="Limpiar respuesta"
              >
                <RotateCcw className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
              </button>
            )}
            {!reviewMode && (
              <button
                onClick={() => setIsHintModalOpen((prev) => !prev)}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex items-center justify-center w-8 h-8 md:w-14 md:h-14 bg-card rounded-sm border border-border shadow-sm hover:bg-muted transition-colors"
                title="Pistas"
                aria-label="Pistas"
              >
                <Lightbulb className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
              </button>
            )}
            
          </>,
          portalContainer,
        )}

      <div className="flex flex-1 min-h-0">
        {!isHintModalOpen && (
          <aside className="hidden lg:flex lg:w-80 xl:w-70 shrink-0 flex-col border-r border-border bg-card min-h-0">
            <DesktopNavigator
              testMode={testMode}
              sections={navigatorSections}
              currentTopicIndex={currentTopicIndex}
              currentIndex={currentIndex}
              isFlagged={!!flaggedQuestions[currentIndex]}
              selectedAnswers={selectedAnswers}
              correctAnswers={correctAnswers}
              flaggedQuestions={flaggedQuestions}
              reviewMode={reviewMode}
              onResults={handleResults}
              onToggleFlag={toggleFlag}
              onJumpToQuestion={jumpToQuestion}
              onPrev={handlePrev}
              onNext={handleNextWithFinish}
              isLastQuestionInSection={sectionIndex === currentSectionQuestionsWithGlobalIndex.length - 1}
              hasMoreSections={hasMoreSections}
            />
          </aside>
        )}

        <div className="flex-1 min-w-0 min-h-0 overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ zoom: scale }}>
          <div className="px-8 mx-auto h-full flex flex-col">
            <QuestionExperience
              question={currentQuestion}
              currentIndex={currentIndex}
              sectionQuestions={currentSectionQuestionsWithGlobalIndex}
              testMode={testMode}
              explanation={explanation}
              selectedAnswer={selectedAnswers[currentIndex]}
              selectedAnswers={selectedAnswers}
              flaggedQuestions={flaggedQuestions}
              onSelect={handleSelect}
              onNext={handleNextWithFinish}
              onPrev={handlePrev}
              onJumpToQuestion={jumpToQuestion}
              onOpenImageModal={openImageModal}
              isLastQuestionInSection={sectionIndex === currentSectionQuestionsWithGlobalIndex.length - 1}
              hasMoreSections={hasMoreSections}
              sharedImageSrc={currentQuestion.shared_image ? quizData.shared_images[currentQuestion.shared_image] : undefined}
              reviewMode={reviewMode}
            />
          </div>
        </div>

        {isHintModalOpen && (
          <aside
            ref={hintPanelRef}
            className="hidden lg:flex lg:w-96 xl:w-80 shrink-0 flex-col border-l border-border bg-card min-h-0"
          >
            <HintModal
              keywords={currentQuestion.keywords}
              hints={currentQuestion.hints}
              hintStrategy={currentQuestion.hint_strategy}
            />
          </aside>
        )}
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
        section={currentTopic}
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
