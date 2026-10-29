# Practice Mode Engine

## Goal

Introduce a central "practice mode engine" that switches the test-page behavior between the two modes:

- **Prueba completa** (`testMode === "full"`): no per-question feedback, auto-advance after selecting.
- **Other practice modes** (`testMode !== "full"`): immediate correct/incorrect feedback (blink), no auto-advance, non-selected options removed, and a result + explanation panel shown.

## Resolved decisions

- **Correct-answer reveal**: the new result panel already shows the correct option (green), so no separate green row is needed in the options list.
- **Explanation placement**: layout-based — `horizontal` → inside the options column (replacing removed options); `vertical` → below options, full width.
- **Blink**: the selected option flashes (pulses) red/green via a CSS animation, then settles into a solid state.
- **Advancing**: reuse the existing prev/next controls (mobile bottom nav + `DesktopNavigator`); no new "Siguiente" button.

## Files

### 1. New `apps/web/lib/practice-mode.ts` (the engine)

- `export function isPracticeMode(testMode: TestMode): boolean` → `testMode !== "full"`.
- `export interface ModeBehavior { autoAdvance: boolean; immediateFeedback: boolean; showExplanation: boolean; collapseOptions: boolean }`.
- `export function getModeBehavior(testMode: TestMode): ModeBehavior`:
  - `full` → `{ autoAdvance: true, immediateFeedback: false, showExplanation: false, collapseOptions: false }`.
  - otherwise → `{ autoAdvance: false, immediateFeedback: true, showExplanation: true, collapseOptions: true }`.

### 2. New `apps/web/app/components/assessment/ExplanationPanel.tsx`

Props: `question: Question`, `selectedAnswer?: string`, `explanation?: Explanation`, `onOpenImageModal: (src, alt) => void`.

Renders (reusing `KaTeXText`, `ExplanationText`, and `next/image`):

1. Result block (mirrors results page "Tu respuesta / Respuesta correcta", lines ~359–396):
   - Correct → green banner "Correcta" + correct option (letter + text/image).
   - Incorrect → red "Tu respuesta" (selected option) + green "Respuesta correcta" (correct option).
2. Explanation block (results page lines ~399–425):
   - Heading "Análisis Técnico de la Solución".
   - Optional `explanation.image`.
   - Numbered `explanation.explanation_steps` via `ExplanationText`.

When `explanation` is missing, show only the result block.

### 3. `apps/web/app/components/assessment/useQuestionLayout.ts`

- Add `explanationPlacement: "options-column" | "below"` to the return value.
- Derive from `layout`: `horizontal` → `"options-column"`, `vertical` → `"below"`.

### 4. `apps/web/app/components/assessment/ResponseOptions.tsx`

- Add props: `revealed?: boolean`, `correctAnswer?: string`.
- Compute `isCorrect = selectedAnswer === correctAnswer` (or accept an `isCorrect` prop).
- When `revealed`:
  - Selected option: apply red (`destructive`) or green (`success`) solid styling.
  - Add a transient flash animation (see globals.css) that runs on the reveal transition, then settles.
  - Hide/collapse all non-selected options (render only the selected option row).
- Keep the existing `scrollRef`, `useGrid`, vertical/grid layout intact; collapsing simply omits non-selected buttons.

### 5. `apps/web/app/components/assessment/QuestionExperience.tsx`

- Accept `explanation?: Explanation` prop.
- `const behavior = getModeBehavior(testMode)`.
- `handleSelect`: only schedule `autoNextTimer` when `behavior.autoAdvance`; otherwise just `onSelect(label)`.
- Add an effect to clear `autoNextTimer` on question change / unmount (prevents a stray `onNext` after navigating away).
- Compute `revealed = behavior.immediateFeedback && Boolean(selectedAnswer)` and `isCorrect = selectedAnswer === question.correct_answer`.
- Pass `revealed` and `correctAnswer={question.correct_answer}` to `ResponseOptions`.
- Render `ExplanationPanel` when `behavior.showExplanation && revealed`:
  - `explanationPlacement === "options-column"` (horizontal): render inside the options cell (`optionsRef` div), below `ResponseOptions`.
  - `explanationPlacement === "below"` (vertical): render as a third grid item; override `gridTemplateRows` to `"auto minmax(0, 1fr) auto"` when the panel is present.

### 6. `apps/web/app/test/page.tsx`

- Compute `const explanation = quizData.explanations.find(e => e.original_number === currentQuestion.original_number)`.
- Pass `explanation={explanation}` to `<QuestionExperience>`.

### 7. `apps/web/app/globals.css`

- Add `@keyframes` for the flash (pulse) effect and two utility classes:
  - `.answer-flash-correct` / `.answer-flash-incorrect` — run 2–3 pulses over ~0.6–0.9s, then settle (the base solid classes remain after the animation).

## Data flow

- `selectedAnswer` comes from persisted `selectedAnswers[currentIndex]`; `revealed` is derived from it, so revisiting an already-answered question re-shows the result (solid, no re-blink).
- Explanation lookup is by `original_number` (`quizData.explanations`).

## Edge cases

- **Image options**: the selected image option also flashes and stays; the correct option image is shown in the panel.
- **No explanation**: panel shows only the result block.
- **Blink on revisit**: trigger the flash only on the reveal transition (e.g., `key` the selected option by `selectedAnswer`), so it doesn't replay on every re-render.
- **Auto-advance timer**: clear on question change to avoid an unexpected `onNext`.
- **Vertical grid**: only add the third row when the explanation panel is actually rendered (practice + revealed + `below`).

## Validation

- `pnpm --filter @ticomatica/web typecheck` and `pnpm --filter @ticomatica/web lint`.
- Manual checks:
  - Full mode: no feedback, auto-advance after ~300ms.
  - Practice mode: select → blink red/green → non-selected removed → result + explanation appear in the correct placement (options column vs below) → no auto-advance; prev/next still work.
  - Revisit an answered practice question: result shown without re-blinking.
