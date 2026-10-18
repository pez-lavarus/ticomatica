"use client";

import React from "react";
import { InlineMath, BlockMath } from "react-katex";

/**
 * Renders a text string that may contain LaTeX delimiters:
 * - $ ... $ (Inline)
 * - \( ... \) (Inline)
 * - \[ ... \] (Block)
 */
export function KaTeXText({ text }: { text: string }) {
  // Split on all supported LaTeX delimiters
  const parts = text.split(/(\$.*?\$|\\\(.*?\\\)|\\\[.*?\\\])/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("$") && part.endsWith("$")) {
          return <InlineMath key={i} math={part.slice(1, -1)} />;
        }
        if (part.startsWith("\\(") && part.endsWith("\\)")) {
          return <InlineMath key={i} math={part.slice(2, -2)} />;
        }
        if (part.startsWith("\\[") && part.endsWith("\\]")) {
          return <BlockMath key={i} math={part.slice(2, -2)} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/**
 * Renders explanation step text with support for:
 * - LaTeX ($, \(, \[)
 * - Bold markdown **text**
 * - Newlines
 */
export function ExplanationText({ text }: { text: string }) {
  // Split on LaTeX delimiters
  const parts = text.split(/(\$.*?\$|\\\(.*?\\\)|\\\[.*?\\\])/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("$") && part.endsWith("$")) {
          return <InlineMath key={i} math={part.slice(1, -1)} />;
        }
        if (part.startsWith("\\(") && part.endsWith("\\)")) {
          return <InlineMath key={i} math={part.slice(2, -2)} />;
        }
        if (part.startsWith("\\[") && part.endsWith("\\]")) {
          return <BlockMath key={i} math={part.slice(2, -2)} />;
        }
        
        // Handle **bold** markdown and newlines in plain text
        const segments = part.split(/(\*\*.*?\*\*)/g);
        return (
          <span key={i}>
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
          </span>
        );
      })}
    </>
  );
}
