"use client";

import React from "react";
import { InlineMath, BlockMath } from "react-katex";

function renderPlainText(text: string, keyPrefix: string) {
  // Handle **bold** markdown and newlines in plain text
  const segments = text.split(/(\*\*.*?\*\*)/g);
  return (
    <React.Fragment key={keyPrefix}>
      {segments.map((seg, j) => {
        if (seg.startsWith("**") && seg.endsWith("**")) {
          return (
            <strong key={j} className="font-semibold">
              {seg.slice(2, -2)}
            </strong>
          );
        }
        // Handle newlines
        const lines = seg.split("\n");
        return lines.map((line, k) => (
          <React.Fragment key={`${j}-${k}`}>
            {k > 0 && <br />}
            {line}
          </React.Fragment>
        ));
      })}
    </React.Fragment>
  );
}

/** Keep quantities, coordinates and short substitutions in the sentence;
 * give complete equations and substantial expressions their own visual line. */
function isProminentFormula(math: string): boolean {
  const compact = math.replace(/\s/g, "");
  const relation = /[=<>]|\\(?:leq?|geq?|neq|approx)\b/.test(math);
  return /\\(?:d?frac|sqrt|sum|int|begin)\b/.test(math)
    || (relation && compact.length >= 12)
    || /[a-z]\s*\([^)]*\)\s*=/.test(math);
}

/**
 * Renders a text string that may contain LaTeX delimiters:
 * - \$ (Escaped dollar sign, rendered as plain "$")
 * - $$ ... $$ or \[ ... \] (Block math)
 * - $ ... $ or \( ... \) (Inline math)
 * - **bold** (Bold markdown in plain text)
 * - \n (Line breaks in plain text)
 */
export function KaTeXText({ text, emphasizeFormulas = false }: { text: string; emphasizeFormulas?: boolean }) {
  if (!text) return null;

  // Regex matches:
  // 1) Escaped dollar sign: \$
  // 2) Block math: $$...$$ or \[...\]
  // 3) Inline math: $...$ or \(...\)
  const parts = text.split(/(\\\$|\$\$.*?\$\$|\$[^\$]+?\$|\\\(.*?\\\)|\\\[.*?\\\])/g);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;

        if (part === "\\$") {
          return <span key={i}>$</span>;
        }
        if (part.startsWith("$$") && part.endsWith("$$")) {
          return <BlockMath key={i} math={part.slice(2, -2)} />;
        }
        if (part.startsWith("\\[") && part.endsWith("\\]")) {
          return <BlockMath key={i} math={part.slice(2, -2)} />;
        }
        const math = part.startsWith("$") && part.endsWith("$")
          ? part.slice(1, -1)
          : part.startsWith("\\(") && part.endsWith("\\)")
            ? part.slice(2, -2)
            : null;
        if (math !== null) {
          if (emphasizeFormulas && isProminentFormula(math)) {
            // Sentence punctuation belongs with the formula, not on a line
            // by itself underneath it. The source question stays unchanged.
            const punctuation = parts[i + 1]?.match(/^[.,;:!?]/)?.[0] ?? "";
            if (punctuation) parts[i + 1] = parts[i + 1].slice(1);
            return (
              <span key={i} className="question-formula">
                <InlineMath math={`\\displaystyle ${math}`} />{punctuation}
              </span>
            );
          }
          return <InlineMath key={i} math={math} />;
        }

        return renderPlainText(part, `plain-${i}`);
      })}
    </>
  );
}

/**
 * Renders explanation step text with support for LaTeX math, bolding, and line breaks.
 * Shares full functionality with KaTeXText.
 */
export function ExplanationText({ text }: { text: string }) {
  return <KaTeXText text={text} />;
}
