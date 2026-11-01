import type { QuestionHint } from "./types";

/** Statement first, then response prompt and options in their displayed order.
 * Ties and missing keywords keep their authored order; source data is untouched. */
export function orderHintsByAppearance(hints: readonly QuestionHint[], containers: readonly string[]): QuestionHint[] {
  const ranked = hints.map((hint, index) => {
    for (let container = 0; container < containers.length; container++) {
      let position = Infinity;
      for (const keyword of hint.keywords) {
        const term = keyword.trim();
        if (!term) continue;
        const literal = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${literal}(?![\\p{L}\\p{N}_])`, "iu");
        const match = pattern.exec(containers[container]);
        if (match) position = Math.min(position, match.index);
      }
      if (position !== Infinity) return { hint, index, container, position };
    }
    return { hint, index, container: containers.length, position: 0 };
  });
  return ranked.sort((a, b) => a.container - b.container || a.position - b.position || a.index - b.index)
    .map(({ hint }) => hint);
}
