import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { KaTeXText, ExplanationText } from "@/lib/katex-utils";

describe("katex-utils", () => {
  describe("KaTeXText", () => {
    it("renders plain text without math", () => {
      const { container } = render(<KaTeXText text="Texto simple sin matemática" />);
      expect(container.textContent).toBe("Texto simple sin matemática");
    });

    it("renders inline math delimited by $...$", () => {
      const { container } = render(<KaTeXText text="Si $x = 2$, entonces $x^2 = 4$" />);
      const katexElements = container.querySelectorAll(".katex");
      expect(katexElements.length).toBe(2);
      expect(container.textContent).toContain("Si");
      expect(container.textContent).toContain("entonces");
    });

    it("renders inline math delimited by \\(...\\)", () => {
      const { container } = render(<KaTeXText text={"Sea \\(f(x) = 3x - 1\\) una función."} />);
      const katexElements = container.querySelectorAll(".katex");
      expect(katexElements.length).toBe(1);
    });

    it("renders block math delimited by $$...$$ and \\[...\\]", () => {
      const { container } = render(
        <KaTeXText text={"$$f(x) = x^2$$\n\\[g(x) = \\sqrt{x}\\]"} />
      );
      const katexDisplayElements = container.querySelectorAll(".katex-display");
      expect(katexDisplayElements.length).toBe(2);
    });

    it("handles escaped dollar sign \\$ correctly", () => {
      const { container } = render(<KaTeXText text={"Depositó \\$250 en la cuenta con $f(x) = 2^x$."} />);
      expect(container.textContent).toContain("Depositó $250 en la cuenta con");
      const katexElements = container.querySelectorAll(".katex");
      expect(katexElements.length).toBe(1);
    });

    it("supports bold text and line breaks in prose", () => {
      const { container } = render(<KaTeXText text={"Paso **1**:\nEvaluar $f(2)$."} />);
      const strongElement = container.querySelector("strong");
      expect(strongElement).not.toBeNull();
      expect(strongElement?.textContent).toBe("1");
      expect(container.querySelector("br")).not.toBeNull();
      expect(container.querySelectorAll(".katex").length).toBe(1);
    });
  });

  describe("ExplanationText", () => {
    it("renders solution step with math and bold formatting", () => {
      const { container } = render(
        <ExplanationText text="**Paso 1**: Sustituyendo $h=2$, $k=3$: $(x-2)^2 + (y-3)^2 = 25$." />
      );
      expect(container.querySelector("strong")?.textContent).toBe("Paso 1");
      expect(container.querySelectorAll(".katex").length).toBe(3);
    });
  });
});
