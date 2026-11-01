import { describe, expect, it } from "vitest";
import type { QuestionHint } from "./types";
import { orderHintsByAppearance } from "./hint-order";

const hint = (keyword: string, ...others: string[]): QuestionHint => ({ hint: keyword, explanation: keyword, keywords: [keyword, ...others] });

describe("hint reading order", () => {
  it("orders by statement, response prompt and option appearance without mutating the source", () => {
    const hints = [hint("opción B"), hint("interior"), hint("radio"), hint("centro"), hint("opción A")];
    const original = [...hints];
    expect(orderHintsByAppearance(hints, ["El centro y su radio.", "Un punto interior.", "opción A", "opción B"]).map((h) => h.hint))
      .toEqual(["centro", "radio", "interior", "opción A", "opción B"]);
    expect(hints).toEqual(original);
  });

  it("uses the earliest of several keywords and keeps ties and missing terms stable", () => {
    const first = hint("pendiente", "recta"), second = hint("recta"), third = hint("ausente"), fourth = hint("otro");
    expect(orderHintsByAppearance([first, second, third, fourth], ["La recta tiene pendiente."]))
      .toEqual([first, second, third, fourth]);
  });

  it("matches accented words, literal math and phrases without matching word fragments", () => {
    const hints = [hint("50\\%"), hint("área"), hint("radio"), hint("punto interior")];
    expect(orderHintsByAppearance(hints, ["Radios; ÁREA; un punto interior; radio; $50\\%$."]).map((h) => h.hint))
      .toEqual(["área", "punto interior", "radio", "50\\%"]);
  });
});
