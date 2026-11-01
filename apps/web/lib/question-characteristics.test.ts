import { describe, expect, it } from "vitest";
import bank from "@/data/2026_2/questions.json";
import schema from "@/data/2026_2/schema.json";
import { quizData } from "./question-bank";
import { extractLayoutCharacteristics, layoutPreferences } from "./question-characteristics";

const content = {
  statement: "", problem: "", options: [{ label: "A" as const, text: "" }],
};

describe("question layout characteristics", () => {
  it("counts all four math delimiters and ignores escaped currency dollars", () => {
    const facts = extractLayoutCharacteristics({ ...content,
      statement: String.raw`Valor $x$ y \(y\). $$z$$ Luego \[w\] y \$25.`,
    });
    expect(facts.formulaNum).toBe(4);
    expect(facts.questionFormulaNum).toBe(4);
    expect(facts.displayFormulaNum).toBe(2);
    expect(facts.hasFormula).toBe(true);
    expect(facts.largestFormulaLength).toBe(1);
  });

  it("counts Unicode source characters separately from prose words and paragraphs", () => {
    const statement = "Ángulo 🔺 $x=2$.\n\nOtro.";
    const facts = extractLayoutCharacteristics({ ...content, statement });
    expect(facts.questionStatementLength).toBe(Array.from(statement).length);
    expect(facts.questionStatementWordNum).toBe(2);
    expect(facts.questionParagraphNum).toBe(2);
    expect(facts.wordNum).toBe(2);
  });

  it("tracks mixed image answers without counting their hidden placeholder text", () => {
    const facts = extractLayoutCharacteristics({ ...content, options: [
      { label: "A", text: "Gráfico A", image: "/a.png" },
      { label: "B", text: String.raw`Área $\frac{25}{4}$` },
    ] });
    expect(facts.optionContentType).toBe("mixed");
    expect(facts.optionGraphNum).toBe(1);
    expect(facts.hasGraph).toBe(true);
    expect(facts.hasStatementGraph).toBe(false);
    expect(facts.responseOptionsWordNum).toBe(1);
    expect(facts.optionFormulaNum).toBe(1);
    expect(facts.complexFormulaNum).toBe(1);
  });

  it("distinguishes tables from graphs", () => {
    const facts = extractLayoutCharacteristics({ ...content, visual_spec: { visual: { type: "table" } } });
    expect(facts.hasTable).toBe(true);
    expect(facts.hasGraph).toBe(false);
    expect(layoutPreferences(facts).template).toBe("stack");
  });

  it("uses resolved group content and keeps every stored profile synchronized with the rendered bank", () => {
    for (const question of quizData.questions) {
      const stored = bank.items.find((item) => item.id === question.original_number)!;
      expect(question.layoutCharacteristics).toEqual(extractLayoutCharacteristics(question));
      expect(stored.layoutCharacteristics).toEqual(question.layoutCharacteristics);
      expect(Object.keys(question.layoutCharacteristics!).sort()).toEqual([...schema.$defs.layoutCharacteristics.required].sort());
    }
    const grouped = quizData.questions.find((q) => q.original_number === 26)!;
    expect(grouped.layoutCharacteristics?.hasSharedContext).toBe(true);
    expect(grouped.layoutCharacteristics?.hasStatementGraph).toBe(true);
    expect(grouped.layoutCharacteristics?.questionStatementLength).toBeGreaterThan(0);
  });

  it("prefers vertical layout for a wordy graph statement with short answer options", () => {
    const facts = extractLayoutCharacteristics({ ...content, graph_image: "/graph.png",
      statement: "palabra ".repeat(50),
      options: [{ label: "A", text: "$5$" }, { label: "B", text: "$10$" }, { label: "C", text: "$15$" }],
    });
    expect(facts.questionStatementWordNum).toBe(50);
    expect(layoutPreferences(facts).template).toBe("stack");
    expect(layoutPreferences(facts).columns).toBe(2);
  });

  it("uses prose density and answer formula length to inform layout preferences", () => {
    const short = extractLayoutCharacteristics({ ...content, graph_image: "/graph.png" });
    expect(layoutPreferences(short).template).toBe("side");
    const dense = extractLayoutCharacteristics({ ...content, graph_image: "/graph.png", statement: "palabra ".repeat(80) });
    expect(layoutPreferences(dense).template).toBe("stack");
    const formulas = extractLayoutCharacteristics({ ...content, options: [
      { label: "A", text: `$${"x+".repeat(25)}1=0$` },
      { label: "B", text: "$x=1$" }, { label: "C", text: "$x=2$" },
    ] });
    expect(layoutPreferences(formulas).needsWideAnswers).toBe(true);
    expect(layoutPreferences(formulas).columns).toBe(1);
  });
});
