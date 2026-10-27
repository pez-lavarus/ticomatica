# Assessment state-management layer

## Goal

Replace the scattered, inconsistent `bxm-pilot-*` localStorage handling with a
single typed session module + hydration-safe hook, so `welcome`, `test`,
`results`, and the `Header` agree on the session lifecycle (start / continue /
finish / review / retake / abandon).

## Decisions (resolved)

- **Architecture**: a typed storage module (`lib/test-session.ts`) plus a
  hydration-safe `useTestSession()` hook. No new dependencies.
- **Session phase**: add an explicit `phase: "active" | "results"` field so the
  welcome page can distinguish "continue in progress" from "already finished".
- The existing `review` boolean stays as a sub-state of `phase === "results"`
  ("currently reviewing a question from the results page").

## Current inconsistencies (verified)

- Keys are magic strings spread across `welcome/page.tsx`, `test/page.tsx`,
  `results/page.tsx`, `useAssessment.ts`, `Header.tsx`, `font-scale.tsx`.
- Clearing is incomplete: `welcome` "NUEVA PRÁCTICA" leaves `flags`/`review`;
  `results` "Reintentar" leaves `mode`; `Header` clears a hardcoded list.
- `bxm-pilot-user` and `bxm-pilot-start-time` are written but never read (dead).
- Hydration is done three ways (`mounted` flag, `setTimeout(...,0)`,
  `useEffect`).
- `welcome`'s `hasSession` (answers non-empty) shows "CONTINUAR" even after a
  finished session.
- `font-scale` (`bxm-pilot-font-scale`) and `theme` are global UI preferences
  and stay out of this layer.

## Target shape

`lib/test-session.ts`:

```ts
export type SessionPhase = "active" | "results";
export interface TestSession {
  phase: SessionPhase;
  mode: TestMode;
  answers: Record<number, string>;
  flags: Record<number, boolean>;
  index: number;        // current question globalIndex
  topicIndex: number;   // current topic index (full mode)
  timeLeft: number;     // seconds
  review: boolean;      // reviewing a question from results
}
```

Single storage key `bxm-pilot-session` (atomic JSON blob). Global prefs
(`font-scale`, `theme`) remain separate.

Module API:
- `EMPTY_SESSION` (defaults: `phase: "active"`, `mode: "full"`, `timeLeft: FULL_TEST_TIME`).
- `loadTestSession(): TestSession` — reads the blob; if absent, one-time
  fallback to the legacy keys (`bxm-pilot-answers`, `-flags`, `-mode`,
  `-index`, `-topic-index`, `-time-left`, `-review`), defaulting `phase` to
  `"active"` (legacy has no phase; note the edge case below).
- `saveTestSession(session): void` — writes the blob.
- `resetTestSession(mode, timeLeft): void` — "new attempt": keep `mode`/`timeLeft`,
  reset `answers`/`flags`/`index`/`topicIndex`/`review`, set `phase = "active"`.
- `clearTestSession(): void` — remove the blob and every legacy key.
- `hasTestProgress(): boolean` — answers non-empty, or `review`, or
  `phase === "results"`.
- `useTestSession()` — hydration-safe (`useState(EMPTY_SESSION)` +
  `useEffect(load)`), returns `{ session, hydrated, update(patch), reset, clear }`;
  `update` merges and writes the blob.

## Phase transitions

| Action | phase | review |
|---|---|---|
| welcome "INICIAR" / "NUEVA PRÁCTICA" | `active` | `false` |
| welcome "CONTINUAR" | unchanged (`active`) | unchanged |
| test "Finalizar" (confirm) | `results` | `false` |
| test navigator "Resultado" | `results` | `false` |
| results → question | `results` | `true` |
| results "Reintentar" | `active` | `false` |
| Header logo "Sí, salir" | cleared | cleared |

## Ordered tasks

1. **Create `apps/web/lib/test-session.ts`** — schema, keys, `EMPTY_SESSION`,
   `loadTestSession` (with legacy fallback), `saveTestSession`,
   `resetTestSession`, `clearTestSession`, `hasTestProgress`, `useTestSession`.

2. **Refactor `lib/hooks/useAssessment.ts`** — consume `useTestSession()` for
   `answers/flags/mode/index/topicIndex/timeLeft/review`; drop its manual
   localStorage effects; keep the timer (gated on `hydrated`/`paused`), derived
   state, and actions. Actions call `update({ ... })`.

3. **Refactor `app/test/page.tsx`** — read `reviewMode` from the session;
   `confirmFinishTest` sets `phase: "results"`; `handleResults` sets
   `phase: "results"`, `review: false`.

4. **Refactor `app/results/page.tsx`** — load via `loadTestSession()`;
   `handleJumpToQuestion` sets `index` + `review: true`; `handleRetake` uses
   `resetTestSession(mode, FULL/SECTION time)`.

5. **Refactor `app/welcome/page.tsx`** — `hasSession` becomes
   `hasTestProgress() && phase === "active"`; `handleSubmit` uses
   `resetTestSession(selectedMode, duration)`; drop `bxm-pilot-user` /
   `bxm-pilot-start-time` writes.

6. **Refactor `app/components/Header.tsx`** — `handleConfirmExit` uses
   `clearTestSession()`.

7. **Validate** — `pnpm --filter @ticomatica/web typecheck` and `lint`, and
   `pnpm --filter @ticomatica/web test`.

## Risks / edge cases

- **Legacy migration**: a legacy session cannot express `phase`; it is loaded as
  `phase: "active"`. A previously *finished* session would therefore briefly
  show "CONTINUAR" once after the migration. Acceptable for the pilot.
- **Blob write atomicity**: writing the whole blob on each change is simpler than
  per-key writes; `useAssessment` already batches changes per action, so write
  frequency is unchanged.
- **`font-scale`/`theme`** are intentionally left as separate providers; do not
  fold them into the session blob.

## Out of scope

- Persisting `user` (name/age) for display — currently unused; dropped.
- Cross-tab sync / `storage` event listeners.
- Test framework coverage for the new module (optional; the existing 25 tests
  must still pass).

## Open question (non-blocking)

- Whether `Reintentar` should keep the previous `mode` or re-open the welcome
  screen for mode selection. Recommendation: keep the previous `mode`
  (`resetTestSession(currentMode, ...)`), matching current behavior.
