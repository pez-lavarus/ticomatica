# Rendering Improvement & Flicker Fixes

## Goal

Eliminate visible flicker on the question screen and fix logic inconsistencies in the rendering pipeline, without changing the data model or the theme-adaptive SVG behavior the user asked for.

## Scope decisions

- **Graphs**: keep inline SVG + `currentColor` (confirmed), harden it instead of switching to `mask-image` or `img`+invert.
- **Theme**: apply the theme class before first paint (like `font-scale.tsx` already does), so there is no light→dark flash.
- **Session**: gate the test screen on hydration so a returning user never sees question 0 flash before their saved question.
- **Out of scope (follow-up)**: making `VisualRenderer`'s JSXGraph graphs recolor on theme toggle. The active 2026_2 data only uses `visual_spec` for tables; `cartesian_2d`/`transformation_overlay` are latent and can be fixed separately.

## Findings (root causes)

1. **Theme FOUC** — `lib/theme-provider.tsx` adds the `dark`/`light` class in a `useEffect`, and its first read uses `setTimeout(() => setTheme(...), 0)`. `app/layout.tsx` has no pre-paint theme script (it only has `FONT_SCALE_INIT_SCRIPT`). Combined with the `body { transition: background-color ... 300ms }` rule in `app/globals.css:104-108`, first paint is light and then fades to dark.
2. **Session hydration flash** — `lib/test-session.ts` hydrates in an effect; `app/test/page.tsx` renders `quizData.questions[0]` (index 0) before hydration, then jumps to the saved question. The timer is already gated on `mounted`, but the question is not.
3. **Graph load flash + measure/render mismatch** — `app/components/assessment/SourceImage.tsx` renders the PNG `<Image>` immediately and swaps to the inline SVG once `fetch` resolves. It also sizes the SVG wrapper from the PNG's `width` (via `getGraphDimensions`), so a graph with a different aspect than its PNG shifts on arrival. SVG content is re-fetched on every question mount (no cache).
4. **Layout re-plan thrash** — `useQuestionLayout.ts` re-plans on container/panel resize, on every image aspect preload (`bumpMeasure`), and on font `loadingdone`/`ready`. Each non-identical plan triggers the 420 ms `.question-panel` transitions (`globals.css:263-276`), so panels visibly animate multiple times per question.
5. **Inlined SVG side-effects** — four option SVGs (item 6) inject four global `<style>` blocks with overlapping class names (`.line`, `.stroke`, `.label`, `.dot`, `.guide`, `.point`, `.axis`) and duplicate `id="title"`/`id="desc"` (`aria-labelledby`), which can collide.
6. **Timer churn** — `lib/hooks/useAssessment.ts:41-47` recreates the `setInterval` every second because `timeLeft` is a dependency.
7. **Misc consistency** — `useHintPanelWidth` initializes to 440 then corrects in an effect (hint panel width flash); `ImageModal`/`FormulaModal` set `document.body.style.overflow` without restoring the previous value; duplicate `overflow-y-auto` in `app/layout.tsx:40`; dead code and unused `Eye` import in `HintModal.tsx`; a broad `eslint-disable react-hooks/set-state-in-effect` at the top of `app/test/page.tsx`.

## Ordered tasks

### P0 — flicker

1. **Theme before first paint**
   - Add a `THEME_INIT_SCRIPT` (mirroring `FONT_SCALE_INIT_SCRIPT` in `lib/font-scale.tsx`) that reads `localStorage["bxm-pilot-theme"]`, falls back to the time-based `getThemeByHour()` logic, and adds `light`/`dark` to `document.documentElement` before render. Wire it into `<head>` in `app/layout.tsx`.
   - In `lib/theme-provider.tsx`, drop the `setTimeout` initial read; read the saved theme synchronously in state initialization only when `typeof window !== "undefined"`, and keep the class-application effect idempotent. Add `color-scheme: light` to `:root` and `color-scheme: dark` to `.dark` in `globals.css` so native controls/scrollbars adapt.

2. **Session hydration gate**
   - In `app/test/page.tsx`, render a stable minimal shell (or `null`) until `assessment.mounted` is true, before reading `currentQuestion`. Keep the timer `--:--` gating as-is.

3. **Graph load: cache + no-PNG-flash + correct sizing**
   - `SourceImage.tsx`: add a module-level `Map<string, string>` cache for fetched SVG content (persists across navigations within a session). Parse the fetched SVG to extract its `viewBox` aspect ratio. While loading, render an empty placeholder box using the raster's known aspect (from `preloadGraphAspect`) rather than the PNG itself; render the PNG only when the SVG fetch returns 404. Once loaded, size the SVG to its own `viewBox` aspect, not the PNG `width`.
   - `QuestionStatement.tsx` / `ResponseOptions.tsx`: pass the SVG URL as the sizing source where available instead of only the PNG dimensions.

4. **Layout re-plan thrash**
   - In `useQuestionLayout.ts`, coalesce `bumpMeasure` through a single `requestAnimationFrame` so multiple async arrivals (several image preloads + fonts) collapse into one re-plan.
   - While a re-plan of the *same* question is pending, suppress `.question-panel`/`.question-stage` transitions (e.g. add a `data-measuring` flag) so intermediate plans snap instead of animating; allow animation only for the first placement of a new question and for user-triggered changes (explanation open, font scale).

### P1 — consistency

5. **SVG inline scoping**
   - Scope each injected SVG's `<style>` so its rules only apply inside its own graph (rewrite selectors to a per-instance class, or strip the inline `<style>` and rely on a single `.graph-svg svg` stylesheet in `globals.css`). Give each injected `<title id>`/`<desc id>` a unique id (e.g. prefix with the SVG URL hash) and point `aria-labelledby` at the unique ids.
   - Standardize the SVG class names (`.stroke`, `.guide`, `.label`, `.dot`, `.point`, `.line`, `.axis`) in `public/svg/2026_2/*.svg` so a single scoped stylesheet covers them.

6. **Timer churn**
   - `useAssessment.ts`: keep a single `setInterval` (empty deps or a `useRef`), and decrement via the `update` functional updater so it never depends on a stale `timeLeft`.

7. **Modal overflow lock**
   - `ImageModal.tsx` / `FormulaModal.tsx`: save and restore `document.body.style.overflow` (and add the same for any other modals that lock scroll) so closing restores the prior value rather than `"unset"`.

8. **Hint panel width**
   - `useHintPanelWidth` (`useQuestionLayout.ts:294`): initialize from `window.innerWidth` via a `useState` initializer (client-only) or a `useLayoutEffect`, so the panel never flashes the default 440 width.

9. **Cleanup**
   - Remove the duplicate `overflow-y-auto` in `app/layout.tsx:40`.
   - Remove the unused `Eye` import and the commented-out `onRevealSolution` block in `HintModal.tsx`.
   - Narrow the `eslint-disable react-hooks/set-state-in-effect` in `app/test/page.tsx` to the specific effects that need it (or fix them).

### P2 — follow-up (explicitly out of scope for this pass)

10. **JSXGraph theme recolor** — `VisualRenderer.tsx` resolves `var(--...)` colors once at board creation; graphs with `cartesian_2d`/`transformation_overlay` would not recolor on theme toggle. No active 2026_2 data uses these, so defer.

## Data flow (unchanged)

`questions.json` → `question-bank.ts` (resolves `image`/`graph_image` PNG + `svg`/`graph_svg` URLs) → `test/page.tsx` → `QuestionExperience` → `QuestionStatement`/`ResponseOptions` → `SourceImage` (inline SVG or PNG). The layout engine (`useQuestionLayout` + `question-layout-plan.ts`) measures panels and positions them; this plan only changes *when/how* it re-plans and how `SourceImage` reports size, not the data contract.

## Failure modes

- **Theme script vs provider drift**: the init script and `getThemeByHour()` must stay in sync; add a comment linking them (mirroring the `--font-scale` note).
- **Hydration gate**: ensure the shell is present for both light/dark so no layout jump when the real content mounts.
- **SVG scoping**: if selectors are stripped, verify the 6 SVGs still render after the single stylesheet; if unique ids are added, verify `aria-labelledby` still resolves.
- **Layout suppression**: verify panels do not get stuck without transition if a re-plan is interrupted (cleanup the `data-measuring` flag on unmount).

## Validation

- `pnpm --filter @ticomatica/web typecheck`, `lint` (expect only pre-existing warnings), `test`, and `build` all pass.
- Manual: reload in dark mode (no light flash); resume a mid-test session (no question-0 flash); navigate questions with graphs (no PNG→SVG swap); open item 6 (4 SVG options render correctly, no style/id collision); toggle dark/light (graphs recolor instantly, body fades only on the toggle); resize (panels snap, not animate, while re-planning).
- Run the existing visual/layout tests (`contentVisuals.test.tsx`, `useQuestionLayout`/layout-plan tests) to confirm no regressions.
