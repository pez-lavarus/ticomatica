"use client";

import React from "react";
import { InlineMath } from "react-katex";

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

/**
 * Renders a text string that may contain LaTeX delimiters:
 * - \$ (Escaped dollar sign, rendered as plain "$")
 * - $$ ... $$ or \[ ... \] (Block math)
 * - $ ... $ or \( ... \) (Inline math)
 * - **bold** (Bold markdown in plain text)
 * - \n (Line breaks in plain text)
 */
export function KaTeXText({ text, displayMath = false }: { text: string; displayMath?: boolean }) {
  if (!text) return null;

  // Regex matches:
  // 1) Escaped dollar sign: \$
  // 2) Block math: $$...$$ or \[...\]
  // 3) Inline math: $...$ or \(...\)
  const parts = text.split(/(\\\$|\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\n])+?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;

        if (part === "\\$") {
          return <span key={i}>$</span>;
        }
        const authoredBlock = part.startsWith("$$") || part.startsWith("\\[");
        const math = authoredBlock ? part.slice(2, -2)
          : part.startsWith("$") && part.endsWith("$") ? part.slice(1, -1)
            : part.startsWith("\\(") && part.endsWith("\\)") ? part.slice(2, -2) : null;
        if (math !== null) {
          if (displayMath || authoredBlock) {
            // Keep punctuation attached even when authors put whitespace or a
            // newline between a math delimiter and the sentence-ending period.
            const punctuation = parts[i + 1]?.match(/^\s*([)\]”’"']*[.,;:!?]+(?:[”’"'])?)(?!\d)/);
            if (punctuation) parts[i + 1] = parts[i + 1].slice(punctuation[0].length);
            return (
              <span key={i} className={`math-line${authoredBlock ? " katex-display" : ""}`}>
                <InlineMath math={`\\displaystyle ${math}`} />{punctuation?.[1]}
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
