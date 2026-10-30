/* eslint-disable react-hooks/set-state-in-effect */
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
import { QuestionExperience } from "@/app/components/assessment/QuestionExperience";
import { DesktopNavigator } from "@/app/components/assessment/DesktopNavigator";
import { useHintPanelWidth } from "@/app/components/assessment/useQuestionLayout";
import { useAssessment } from "@/lib/hooks/useAssessment";
import { FontScaleControl, HeaderIconButton, HeaderReadout, HeaderTextButton } from "@/app/components/HeaderControls";
import { AssessmentErrorBoundary } from "@/app/components/error/AssessmentErrorBoundary";

import { FULL_TEST_TOPICS } from "@/lib/constants";

export default function QuestionPage() {
  const router = useRouter();
  const hintWidth = useHintPanelWidth();

  // Modals state
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isHintModalOpen, setIsHintModalOpen] = useState(false);
  const [isHintBlinking, setIsHintBlinking] = useState(false);
  const [modalImage, setModalImage] = useState({ src: "", alt: "" });
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
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

  const assessment = useAssessment({
    quizData,
    onTimerEnd: () => {}
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

  // Blink the hint lightbulb for a few seconds whenever a new question opens.
  useEffect(() => {
    setIsHintBlinking(true);
    const timer = setTimeout(() => setIsHintBlinking(false), 3000);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const handleSelectOption = useCallback((option: string) => {
    handleSelect(option);
    if (testMode !== "full" && !reviewMode) {
        setIsHintBlinking(true);
        // Incorrect option selected: open hint modal automatically if closed, stay open if already open
        setIsHintModalOpen(true);
    }
  }, [handleSelect, testMode, reviewMode,]);

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
        {!isHintModalOpen && (
          <aside key="navigator" className="hidden lg:flex lg:w-80 xl:w-70 shrink-0 flex-col border-r border-border bg-card min-h-0">
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
