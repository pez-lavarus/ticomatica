import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { informationBlocks } from "./information-lists";
import { KaTeXText } from "./katex-utils";
import { quizData } from "./question-bank";
import { VisualRenderer } from "@/app/components/visuals/VisualRenderer";

afterEach(cleanup);

describe("information lists in questions and responses", () => {
  it("renders the real probability event definitions as bullets without losing event labels", () => {
    const question = quizData.questions.find((q) => q.original_number === 53)!;
    const { container } = render(<KaTeXText text={question.statement} formatLists displayMath />);
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(4);
    expect(Array.from(items, (li) => li.textContent?.slice(0, 2))).toEqual(["E:", "F:", "G:", "H:"]);
    expect(container.textContent).toContain("control de calidad");
  });

  it("renders function bullets with their complete math expressions inside each item", () => {
    const question = quizData.questions.find((q) => q.original_number === 25)!;
    const { container } = render(<KaTeXText text={question.statement} formatLists displayMath />);
    expect(container.querySelectorAll("li")).toHaveLength(3);
    expect(container.querySelectorAll("li .katex")).toHaveLength(3);
  });

  it("lists the four volunteer records and keeps the final question outside the list", () => {
    const question = quizData.questions.find((q) => q.original_number === 60)!;
    const { container } = render(<KaTeXText text={question.problem} formatLists displayMath />);
    expect(container.querySelectorAll("li")).toHaveLength(4);
    expect(container.querySelector("ul")?.textContent).not.toContain("En términos relativos");
    expect(container.textContent).toContain("En términos relativos");
    expect(container.querySelectorAll("li .katex")).toHaveLength(4);
  });

  it("preserves plain paragraphs, single definitions and decimal numbers", () => {
    const text = "Una explicación\nen dos líneas.\nE: Una definición.\n1.25 kilómetros.";
    expect(informationBlocks(text)).toEqual([{ type: "text", text }]);
  });

  it("never interprets minus signs inside multiline math as list markers", () => {
    const text = "Considere:\n$$x = y\n- z$$";
    const { container } = render(<KaTeXText text={text} formatLists displayMath />);
    expect(container.querySelector("ul")).toBeNull();
    expect(container.querySelectorAll(".katex")).toHaveLength(1);
  });

  it("supports lists in answer content and keeps sentence punctuation with math", () => {
    const { container } = render(<KaTeXText text={"- $x=2$.\n- $x=3$."} formatLists displayMath />);
    expect(container.querySelectorAll("li")).toHaveLength(2);
    for (const li of container.querySelectorAll("li")) expect(li.textContent).toMatch(/\.$/);
  });
});

describe("statistics tables", () => {
  it.each([53, 59])("centers the structured table in question %s and preserves its data", (id) => {
    const question = quizData.questions.find((q) => q.original_number === id)!;
    const { container } = render(<VisualRenderer spec={question.visual_spec!} className="w-full" />);
    const table = container.querySelector("table")!;
    expect(table).toHaveClass("mx-auto");
    expect(table.parentElement).toHaveClass("overflow-x-auto");
    const visual = question.visual_spec!.visual!;
    expect(table.querySelectorAll("tbody tr")).toHaveLength(visual.rows.length);
    expect(table.querySelectorAll("th")).toHaveLength(visual.columns.length);
  });
});
