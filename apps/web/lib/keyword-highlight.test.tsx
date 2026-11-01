import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KaTeXText } from "./katex-utils";

describe("question hint keyword highlighting", () => {
  it("matches accented whole words and phrases while preserving punctuation, lists and bold text", () => {
    const { container, rerender } = render(<KaTeXText text={"• **Traslación** y traslaciones.\n• El radio, el RADIO y un punto interior."} formatLists highlightKeywords={["traslación", "radio", "punto interior"]} />);
    expect([...container.querySelectorAll("mark")].map((mark) => mark.textContent)).toEqual(["Traslación", "radio", "RADIO", "punto interior"]);
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("strong mark")).toBeInTheDocument();
    rerender(<KaTeXText text="El radio." />);
    expect(container.querySelector("mark")).not.toBeInTheDocument();
  });

  it("keeps KaTeX intact and only marks complete matching expressions", () => {
    const { container } = render(<KaTeXText text={"El $50\\%$ cumple $f(x)=x^2$."} highlightKeywords={["50\\%", "x"]} displayMath />);
    expect(container.querySelectorAll("mark")).toHaveLength(1);
    expect(container.querySelector("mark .katex")).toBeInTheDocument();
    expect(container.querySelectorAll(".katex")).toHaveLength(2);
    expect(container.querySelector(".katex-error")).not.toBeInTheDocument();
    expect(container.textContent).toContain(".");
  });

  it("treats regex characters literally and prefers longer phrases", () => {
    const { container } = render(<KaTeXText text="punto interior; punto; radio+" highlightKeywords={["punto", "punto interior", "radio+"]} />);
    expect([...container.querySelectorAll("mark")].map((mark) => mark.textContent)).toEqual(["punto interior", "punto", "radio+"]);
  });
});
