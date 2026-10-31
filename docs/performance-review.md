# Performance review

Reviewed against `82d89ea20afa4f66a18ab9c3d427312378565c93` on 2026-10-31.

## Findings and fixes

| Finding | Impact | Fix |
| --- | --- | --- |
| The welcome client imported the entire question bank to calculate counts. | Downloads and initializes exam content before a practice starts. | Calculate counts in the server page at build time and pass only mode configurations to `WelcomeClient`. |
| Each countdown update recreated section questions and image-modal callbacks. | Defeats `QuestionExperience` memoization, revisiting text and SVG trees every second. | Memoize section data and stabilize the callback. |
| The desktop navigator rebuilt its data and rendered on countdown updates. | Reconciles all question rows and answer indicators every second. | Memoize navigator data and the component, and stabilize the results callback. |
| The layout measurement cache included graph height for every panel. | Repeats synchronous DOM measurements for options and explanations whose sizes do not depend on the statement graph's height. | Keep graph height in the statement cache key only. Caches remain local to each search so content, font, and viewport changes receive fresh measurements. |
| Infrastructure specified `ignoreDeprecations: "6.0"` with TypeScript 5.9. | Blocks root type checking and infrastructure builds. | Remove the unsupported compiler option. |
| Infrastructure tests also discovered compiled `dist/test/*.js` after a build. | Reruns generated CommonJS test files that cannot import Vitest, breaking tests after builds. | Scope Vitest discovery to `test/**/*.test.ts` in an ESM configuration file. |

## Measurements

| Check | Before | After |
| --- | ---: | ---: |
| Welcome initial JavaScript, uncompressed bytes | 1,133,497 | 1,050,921 |
| Welcome initial JavaScript, gzip bytes | 305,990 | 286,480 |
| Question rerenders caused by two isolated countdown ticks | 2 | 0 |
| Option-height probes in the graph-and-explanation regression case | 79 | 37 |
| Measurement calls across 108 synthetic layout cases | 7,384 | 4,312 |

Bundle totals sum each unique script URL in the production-exported `welcome.html`.
Gzip totals compress those individual scripts with Python's `gzip.compress`;
they describe an artifact comparison, not observed CDN transfer sizes. The
welcome scripts no longer contain the question-bank payload. The reduction is
82,576 uncompressed bytes (7.3%) and 19,510 gzip bytes (6.4%).

The synthetic comparison used the existing text-flow measurement model at six
widths (320, 390, 768, 1000, 1200, 1600), three heights (500, 700, 1000), three
statement types (text, graph, wide graph), and explanation visible/hidden.
All 108 resulting plans, including their scores, matched the baseline exactly.
Total measurement calls fell 41.6%; this is not a claim of a 41.6% reduction in
wall-clock layout time.

## Validation

- All 63 workspace tests pass (54 web, 9 infrastructure).
- New regression coverage verifies countdown-only render skipping, answer and
  previous/next navigation updates, and unique measurements per graph-independent
  panel width and variant. The countdown and measurement tests failed before
  their corresponding fixes.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.
- Both `pnpm infra:synth:dev` and `pnpm infra:synth:prod` pass.
- `git diff --check` passes.

The final navigator change was additionally checked with the page regression
tests, web type checking, lint, and a fresh production build.

## Limits

This review covers source inspection, production artifact sizes, React
regressions, and synthetic layout measurements. A Chromium download failed,
so no browser smoke test, CPU trace, Core Web Vitals, or production traffic
measurement is claimed. Profile real mobile devices and representative
questions after deployment to establish the user-visible timing improvement.

No production deployment or live AWS resource change was performed.
