import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { SourceImage } from "./SourceImage";
import { ResponseOptions } from "./ResponseOptions";
import { quizData } from "@/lib/question-bank";

const question12Svg = readFileSync(
  "public/svg/2026_2/02-2026-p_12.svg",
  "utf8",
);

// jsdom does not apply <style> elements inside SVGs. Install their emitted CSS
// as ordinary stylesheets to check the selectors against the whole document.
function installSvgStyles(container: HTMLElement) {
  const styles = Array.from(container.querySelectorAll("svg style"), (svgStyle) => {
    const style = document.createElement("style");
    style.textContent = svgStyle.textContent;
    document.head.append(style);
    return style;
  });
  return () => styles.forEach((style) => style.remove());
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SourceImage style isolation", () => {
  it("keeps geometry question 12's faint graph grid from fading the response options", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(question12Svg)));
    const question = quizData.questions.find((q) => q.original_number === 12)!;
    const { container } = render(
      <>
        <SourceImage svg="/question12-isolation.svg" png="/question12.png" alt="Question 12 graph" />
        <ResponseOptions
          question={question}
          onSelect={() => {}}
          onOpenImageModal={() => {}}
          slot={{ register: () => {}, rect: null, animate: false }}
        />
      </>,
    );
    await waitFor(() => expect(container.querySelector(".graph-svg svg")).not.toBeNull());
    const removeStyles = installSvgStyles(container);
    try {
      const options = container.querySelector(".response-option-button")!.parentElement!;
      expect(options).toHaveClass("grid");
      expect(getComputedStyle(options).opacity || "1").toBe("1");
      expect(getComputedStyle(container.querySelector("svg .grid")!).opacity).toBe("0.22");
    } finally {
      removeStyles();
    }
  });

  it("isolates grouped class and element selectors between SVGs and preserves theme inheritance", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((src: string) => Promise.resolve(new Response(
      src.includes("first")
        ? '<svg viewBox="0 0 100 100"><style>:root{color:black}@media(prefers-color-scheme:dark){:root{color:white}}.label, text {opacity:.3;fill:currentColor}</style><text class="label">First</text></svg>'
        : '<svg viewBox="0 0 100 100"><style>.label, text {opacity:.8;fill:currentColor}</style><text class="label">Second</text></svg>',
    ))));
    const { container } = render(
      <>
        <SourceImage svg="/first-isolation.svg" png="/first.png" alt="First" />
        <SourceImage svg="/second-isolation.svg" png="/second.png" alt="Second" />
        <span className="label">Interface label</span>
      </>,
    );
    await waitFor(() => expect(container.querySelectorAll("svg text")).toHaveLength(2));
    const removeStyles = installSvgStyles(container);
    try {
      const texts = container.querySelectorAll("svg text");
      expect(getComputedStyle(texts[0]).opacity).toBe("0.3");
      expect(getComputedStyle(texts[1]).opacity).toBe("0.8");
      expect(getComputedStyle(container.querySelector("span.label")!).opacity || "1").toBe("1");
      for (const style of container.querySelectorAll("svg style")) {
        expect(style.textContent).toMatch(/currentcolor/i);
        expect(style.textContent).not.toContain(":root");
        expect(style.textContent).not.toContain("prefers-color-scheme");
      }
    } finally {
      removeStyles();
    }
  });
});


describe("uniform graph frames", () => {
  it("uses the same statement frame for wide and tall SVG sources, and a smaller option frame", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((src: string) => Promise.resolve(new Response(
      src.includes("wide") ? '<svg viewBox="0 0 1000 200"><path /></svg>' : '<svg viewBox="0 0 200 1000"><path /></svg>',
    ))));
    const { container } = render(<>
      <SourceImage svg="/uniform-wide.svg" png="/wide.png" alt="Wide" size="statement" />
      <SourceImage svg="/uniform-tall.svg" png="/tall.png" alt="Tall" size="statement" />
      <SourceImage svg="/uniform-option.svg" png="/option.png" alt="Option" size="option" />
    </>);
    await waitFor(() => expect(container.querySelectorAll("svg")).toHaveLength(3));
    for (const frame of container.querySelectorAll<HTMLElement>(".source-graph-statement")) {
      expect(frame.style.width).toBe("480px");
      expect(frame.style.aspectRatio).toBe("480 / 320");
      expect(frame.querySelector<HTMLElement>(".graph-svg")!.style.height).toBe("100%");
    }
    const optionFrame = container.querySelector<HTMLElement>(".source-graph-option")!;
    expect(optionFrame.style.width).toBe("200px");
    expect(optionFrame.style.aspectRatio).toBe("200 / 140");
    // Source geometry stays intact; the SVG's native aspect preservation fits
    // the drawing within the shared viewport instead of distorting its axes.
    expect(container.querySelectorAll("svg")[0]).toHaveAttribute("viewBox", "0 0 1000 200");
    expect(container.querySelectorAll("svg")[1]).toHaveAttribute("viewBox", "0 0 200 1000");
  });

  it("keeps the frame size when a missing vector falls back to a raster", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    const { container } = render(<SourceImage svg="/uniform-missing.svg" png="/fallback.png" alt="Raster" size="option" width={1000} height={800} />);
    await waitFor(() => expect(container.querySelector("img")).not.toBeNull());
    const frame = container.querySelector<HTMLElement>(".source-graph-option")!;
    expect(frame.style.width).toBe("200px");
    expect(frame.style.aspectRatio).toBe("200 / 140");
  });
});
