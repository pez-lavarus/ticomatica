# QuestionExperience sizing refactor

## Goal

Improve how `QuestionStatement`, `ResponseOptions`, and `ExplanationPanel` fill the
question container — at all times and across resizes — without changing the
vertical/horizontal **layout decision** or the **placement** of the three elements.
Keep the experience visually pleasing, recompute sizing only when the default
rules would overflow/overlap, and add lightweight transformation animations.

Hard requirements:
- The three cards must never overlap.
- They stay content-sized (don't fill the whole parent) when they fit.
- `QuestionStatement` and `ResponseOptions` stay fully visible; only
  `ResponseOptions` with image/graph options may scroll internally (existing behavior).
- `ExplanationPanel` scrolls internally so the other two never have to.

## Context (verified against code)

- The app is height-locked: `body` is `h-dvh overflow-hidden`; `main` is
  `overflow-y-auto` (`apps/web/app/layout.tsx:32-37`).
- The question column is `overflow-hidden` and applies `zoom: scale` for font
  scaling (`apps/web/app/test/page.tsx:245`).
- `QuestionExperience` renders a grid (`apps/web/app/components/assessment/QuestionExperience.tsx:148-209`)
  whose tracks come from `useQuestionLayout` (`apps/web/app/components/assessment/useQuestionLayout.ts:171-183`).
- The three cards are already content-sized (corner-aligned); `ResponseOptions`
  is `h-full` only when `fillHeight` (image options).
- `globals.css:116` forces `img { transition: none !important; }`, which blocks
  any image size transition unless overridden.

## Decisions (resolved)

- **Sizing approach: targeted recompute.** Keep the current `fr`-based grid as
  the default. Add a single measured ceiling — `panelMaxHeight` — that only
  activates when the panel would overflow, instead of rewriting every track.
- **Animations: panel + graph only.** Fade/slide the panel on mount; smoothly
  transition the graph's `max-height` on resize. Cross-breakpoint reflow stays
  instant (grid reflow is not animatable without overlap risk).
- **Panel scroll granularity:** the whole card (heading, image, steps) scrolls
  together — no pinned header for now.

## Problems identified

1. **Overlap in horizontal + panel.** Horizontal-with-panel uses
   `gridTemplateRows = "minmax(0, 1fr) auto"` (`useQuestionLayout.ts:178-183`);
   row 1 can collapse to 0 and content-sized statement/options spill into the
   panel row.
2. **`ExplanationPanel` has no scroll** (`ExplanationPanel.tsx:15`) and overflows
   the `overflow-hidden` column when tall.
3. **No recompute for the panel's height.** The panel row is `auto` in the
   image-options case, so the panel is unbounded there.
4. **Debug border left in place** (`test/page.tsx:246`).
5. **No motion** when the panel appears or the graph resizes.

## Ordered tasks

1. **Fix horizontal+panel track order** — `useQuestionLayout.ts:171-183`.
   Horizontal `gridTemplateRows`:
   - no panel → `"minmax(0, 1fr)"` (unchanged);
   - panel + image options → `"minmax(0, 1fr) auto"` (options keep filling + scrolling);
   - panel + text options → `"auto minmax(0, 1fr)"` (statement/options content-sized, panel fills remainder).

2. **Recompute a panel ceiling** — `useQuestionLayout.ts`.
   Add a `panelRef` (new, wired to the panel wrapper in `QuestionExperience`) and
   a `useLayoutEffect` that measures the remaining vertical space for the panel:
   `panelMaxHeight = containerHeight - (row above the panel) - gap - BOTTOM_MARGIN`.
   - Horizontal: row above = `max(statementHeight, optionsHeight)`.
   - Vertical: row above = `statementHeight`.
   Return `panelMaxHeight: number | null`. This is the "override when needed"
   ceiling: it constrains nothing when content fits, but bounds + scrolls the
   panel when content would overflow (including the image-options case). Observe
   the container, statement, and options so it recomputes on resize.

3. **Apply the ceiling and scroll** — `QuestionExperience.tsx:191-207` + `ExplanationPanel.tsx`.
   - Panel wrapper: keep `justify-self-start/end`; pass
     `style={{ maxHeight: panelMaxHeight ?? undefined }}` and `min-h-0`.
   - `ExplanationPanel` root: add `max-h-full min-h-0 overflow-y-auto hide-scrollbar`
     so it is capped by the wrapper and scrolls internally.

4. **Panel mount animation** — `globals.css` + `ExplanationPanel.tsx`.
   Add a `panel-enter` keyframe (opacity 0→1, `translateY(8px)→0`, ~200ms ease-out)
   and apply it to the panel root. Because the panel renders conditionally, the
   animation plays on mount; unmount stays instant (no exit animation).

5. **Graph resize transition** — `QuestionStatement.tsx` + `globals.css`.
   Add a scoped transition on the graph image's `max-height` (e.g. a `graph-image`
   class with `transition: max-height 240ms ease`), and update `globals.css:116`
   so this class is exempt from the `img { transition: none !important; }` rule
   (add the class to that selector's exclusion, or use an `!important` transition).
   This animates only `max-height` changes (resize); question switches render the
   new image at final size with no animation.

6. **Remove the debug border** — `test/page.tsx:246`: drop `border border-red-500`.

## Edge cases / limitations

- **Statement + options alone exceed the viewport** (text-only question with 4
  tall options on a very short screen). Requirement says keep both fully visible,
  which is physically impossible without scroll/shrink. Vertical graph shrinking
  handles the graph case; the no-graph extreme remains a rare clip. Not addressed
  by the panel ceiling (the ceiling only bounds the panel).
- **`panelMaxHeight` ≤ 0** when statement + options already fill the container:
  the panel collapses to ~0 and scrolls invisibly. Acceptable because statement +
  options have priority; note for later if a `min-h` is desired.
- **`zoom: scale`**: measurements must use post-zoom `offsetHeight`/`getBoundingClientRect`
  (they already do); verify the ceiling tracks font-scale changes via ResizeObserver.

## Validation

- `pnpm --filter @ticomatica/web typecheck` and `pnpm --filter @ticomatica/web lint`.
- Manual: graph question (horizontal) answered in practice mode → panel fades in,
  panel scrolls when tall, statement + options stay fully visible, no overlap.
- Manual: image-options question → options scroll (sticky statement), panel (if
  shown) sits below statement and is bounded by the recomputed ceiling.
- Manual: resize across `lg` breakpoints and short heights → no transient overlap,
  graph `max-height` transitions smoothly, panel ceiling recomputes.
- Manual: toggle font scale → no overflow/overlap.
