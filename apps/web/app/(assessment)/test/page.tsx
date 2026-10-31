"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Clock, Flag, BookOpen, Shapes, BarChart3, Binary, RotateCcw, Lightbulb } from "lucide-react";
import { quizData } from "@/lib/question-bank";
import ImageModal from "@/app/components/ImageModal";
import ConfirmModal from "@/app/components/ConfirmModal";
import FormulaModal from "@/app/components/FormulaModal";
import SectionModal from "@/app/components/SectionModal";
import HintModal from "@/app/components/HintModal";
import { preloadGraphAspect } from "@/lib/graph-aspects";
import { preloadSourceSvg } from "@/app/components/assessment/SourceImage";
import { QuestionExperience } from "@/app/components/assessment/QuestionExperience";
import { useHintPanelWidth } from "@/app/components/assessment/useQuestionLayout";
import { useAssessmentContext } from "@/app/components/assessment/AssessmentContext";
import { FontScaleControl, HeaderIconButton, HeaderReadout, HeaderTextButton } from "@/app/components/HeaderControls";
import { AssessmentErrorBoundary } from "@/app/components/error/AssessmentErrorBoundary";

import { FULL_TEST_TOPICS } from "@/lib/constants";

export default function QuestionPage() {
  const router = useRouter();
  const hintWidth = useHintPanelWidth();

  const assessment = useAssessmentContext();

  const {
    isHintModalOpen,
    setIsHintModalOpen,
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
    handleNext,
    handlePrev,
    jumpToQuestion,
    handleNextSection,
    testMode: currentTestMode,
    hasMoreSections,
  } = assessment;


  // Modals state
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isHintBlinking, setIsHintBlinking] = useState(false);
  const [modalImage, setModalImage] = useState({ src: "", alt: "" });
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // The header controls live outside the client tree; resolve their portal
    // target once on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPortalContainer(document.getElementById("test-header-controls"));
  }, []);

  const hintPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isHintModalOpen) return;
    const handleClick = (e: MouseEvent) => {
      const path = e.composedPath ? e.composedPath() : [];
      const isInsideHintPanel = hintPanelRef.current && path.includes(hintPanelRef.current);
      const isOptionButton = path.some(
        (el) => el instanceof HTMLElement && (el.classList.contains("response-option-button") || el.closest?.(".response-option-button"))
      );
      const isHeaderHintButton = path.some(
        (el) => el instanceof HTMLElement && (el.classList.contains("header-hint-button") || el.closest?.(".header-hint-button"))
      );

      // Fallback target check in case composedPath is unavailable or target was connected
      const target = e.target as HTMLElement | null;
      const isTargetInHintPanel = hintPanelRef.current?.contains(target as Node);
      const isTargetOptionButton = Boolean(target?.closest(".response-option-button"));
      const isTargetHeaderHintButton = Boolean(target?.closest(".header-hint-button"));

      if (
        !isInsideHintPanel &&
        !isOptionButton &&
        !isHeaderHintButton &&
        !isTargetInHintPanel &&
        !isTargetOptionButton &&
        !isTargetHeaderHintButton
      ) {
        setIsHintModalOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClick);
    };
  }, [isHintModalOpen]);

  const handleFinishTest = useCallback(() => {
    setIsConfirmModalOpen(true);
  }, []);

  useEffect(() => () => setIsHintModalOpen(false), [setIsHintModalOpen]);

  // Warm the neighboring questions without fetching the entire exam. Shared
  // in-flight caches also cover an immediate click before preloading completes.
  useEffect(() => {
    if (!mounted) return;
    for (const offset of [-1, 1]) {
      const neighbor = currentSectionQuestionsWithGlobalIndex[sectionIndex + offset];
      const question = neighbor && quizData.questions[neighbor.globalIndex];
      if (!question) continue;
      if (question.graph_image && !question.visual_spec) {
        void preloadGraphAspect(question.graph_image);
        if (question.graph_svg) void preloadSourceSvg(question.graph_svg);
      }
      for (const option of question.options) {
        if (!option.image) continue;
        void preloadGraphAspect(option.image);
        if (option.svg) void preloadSourceSvg(option.svg);
      }
    }
  }, [mounted, sectionIndex, currentSectionQuestionsWithGlobalIndex]);

  // Blink the hint lightbulb for a few seconds whenever a new question opens.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHintBlinking(true);
    const timer = setTimeout(() => setIsHintBlinking(false), 3000);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const handleSelectOption = useCallback((option: string) => {
    handleSelect(option);
    if (testMode !== "full" && !reviewMode) {
      setIsHintBlinking(true);
      // Open the hint modal automatically when an answer is selected.
      setIsHintModalOpen(true);
    }
  }, [handleSelect, testMode, reviewMode]);

  const handleNextWithFinish = useCallback(() => {
    if (sectionIndex === currentSectionQuestionsWithGlobalIndex.length - 1 && (!hasMoreSections || currentTestMode !== "full")) {
      handleFinishTest();
    } else {
      handleNext();
    }
  }, [sectionIndex, currentSectionQuestionsWithGlobalIndex.length, hasMoreSections, currentTestMode, handleFinishTest, handleNext]);

  // Timer end effect: transitions to the next section or the finish dialog.
  useEffect(() => {
    if (timeLeft === 0 && mounted && !reviewMode) {
      if (testMode === "full" && currentTopicIndex < FULL_TEST_TOPICS.length - 1) {
        handleNextSection();
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        handleFinishTest();
      }
    }
  }, [timeLeft, mounted, testMode, currentTopicIndex, handleNextSection, handleFinishTest, reviewMode]);

  const confirmFinishTest = () => {
    setIsConfirmModalOpen(false);
    setIsHintModalOpen(false);
    update({ phase: "results", review: false });
    router.push("/results", { scroll: false });
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

  const openImageModal = useCallback((src: string, alt: string) => {
    setModalImage({ src, alt });
    setIsImageModalOpen(true);
  }, []);

  if (!mounted || !currentQuestion) {
    // Gate on hydration so a returning user never sees question 0 flash before
    // their saved question loads.
    return (
      <AssessmentErrorBoundary>
        <div className="h-full flex flex-col bg-background transition-colors" />
      </AssessmentErrorBoundary>
    );
  }

  const hasSelectedAnswer = Boolean(selectedAnswers[currentIndex]);

  return (
    <AssessmentErrorBoundary>
    <div className="h-full flex flex-col bg-background transition-colors">

      {portalContainer &&
        createPortal(
          <>
            <div className="flex items-center gap-1.5 md:gap-3">
              {!reviewMode && (
                <HeaderReadout>
                  <span className="font-mono text-xs md:text-2xl font-bold tabular-nums text-foreground min-w-[35px] md:min-w-[80px] text-center">
                    {mounted ? formatTime(timeLeft) : "--:--"}
                  </span>
                </HeaderReadout>
              )}

              <HeaderIconButton
                label="Información de la sección"
                iconSize="lg"
                onClick={() => setIsSectionModalOpen(true)}
                className="text-destructive"
              >
                {currentTopic === "Geometría" && <Shapes />}
                {currentTopic === "Estadística y Probabilidad" && <BarChart3 />}
                {currentTopic === "Funciones" && <Binary />}
                {currentTopic === "full" && <Clock />}
              </HeaderIconButton>
            </div>

            <div className="flex items-center gap-2 md:gap-6">
              <HeaderTextButton label="Fórmulas" icon={<BookOpen />} onClick={() => setIsFormulaModalOpen(true)} />
              {!reviewMode && (
                <HeaderTextButton
                  label="Finalizar"
                  tone="primary"
                  icon={<Flag className="transition-colors group-hover:text-destructive group-active:text-destructive" />}
                  onClick={handleFinishTest}
                />
              )}
            </div>

            <FontScaleControl />

            {!reviewMode && (
              <HeaderIconButton
                label="Limpiar respuesta"
                onClick={resetCurrentQuestion}
                disabled={!selectedAnswers[currentIndex]}
              >
                <RotateCcw className="text-foreground" />
              </HeaderIconButton>
            )}
            {!reviewMode && (
              <HeaderIconButton
                label="Pistas"
                onClick={() => setIsHintModalOpen((prev) => !prev)}
                onMouseDown={(e) => e.stopPropagation()}
                className="header-hint-button"
              >
                <Lightbulb className={`text-accent ${isHintBlinking ? "animate-pulse ring-2 ring-primary/50 rounded-sm" : ""}`} />
              </HeaderIconButton>
            )}
          </>,
          portalContainer,
        )}

      <div className="flex flex-1 min-h-0">
        <div key="question" className="font-scaled flex-1 min-w-0 min-h-0 overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="px-0 sm:px-4 lg:px-8 mx-auto h-full flex flex-col">
            <QuestionExperience
              question={currentQuestion}
              currentIndex={currentIndex}
              sectionQuestions={currentSectionQuestionsWithGlobalIndex}
              testMode={testMode}
              selectedAnswer={selectedAnswers[currentIndex]}
              selectedAnswers={selectedAnswers}
              flaggedQuestions={flaggedQuestions}
              onSelect={handleSelectOption}
              onNext={handleNextWithFinish}
              onPrev={handlePrev}
              onJumpToQuestion={jumpToQuestion}
              onOpenImageModal={openImageModal}
              isLastQuestionInSection={sectionIndex === currentSectionQuestionsWithGlobalIndex.length - 1}
              hasMoreSections={hasMoreSections}
              sharedImageSrc={currentQuestion.graph_image ?? undefined}
              visualSpec={currentQuestion.visual_spec ?? null}
              reviewMode={reviewMode}
            />
          </div>
        </div>

        {isHintModalOpen && (
          <aside
            key="hint"
            ref={hintPanelRef}
            style={{ width: hintWidth }}
            className="font-scaled hidden lg:flex shrink-0 flex-col border-l border-border bg-card min-h-0 panel-enter transition-all duration-300 ease-out"
          >
            <HintModal
              keywords={currentQuestion.keywords}
              hints={currentQuestion.hints}
              hintStrategy={currentQuestion.hint_strategy}
              onRevealSolution={
                testMode !== "full" && !hasSelectedAnswer
                  ? () => {
                      handleSelectOption(currentQuestion.correct_answer);
                      setIsHintModalOpen(false);
                    }
                  : undefined
              }
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
