"use client";

import React from "react";
import { informationBlocks } from "./information-lists";
import { highlightText, matchesMathKeyword } from "./keyword-highlight";
import { InlineMath } from "react-katex";

function renderPlainText(text: string, keyPrefix: string, highlightKeywords?: readonly string[]) {
  // Handle **bold** markdown and newlines in plain text
  const segments = text.split(/(\*\*.*?\*\*)/g);
  return (
    <React.Fragment key={keyPrefix}>
      {segments.map((seg, j) => {
        if (seg.startsWith("**") && seg.endsWith("**")) {
          return (
            <strong key={j} className="font-semibold">
              {highlightText(seg.slice(2, -2), highlightKeywords)}
            </strong>
          );
        }
        // Handle newlines
        const lines = seg.split("\n");
        return lines.map((line, k) => (
          <React.Fragment key={`${j}-${k}`}>
            {k > 0 && <br />}
            {highlightText(line, highlightKeywords)}
          </React.Fragment>
        ));
      })}
    </React.Fragment>
  );
}

/** Promote defining equations and substantial algebra, not values, coordinates,
 * unit-bearing quantities, function references, or short substitutions. */
function isRelevantExpression(math: string): boolean {
  const compact = math.replace(/\\(?:left|right)\b/g, "").replace(/\s/g, "");
  if (/\\begin\{(?:cases|aligned|matrix|pmatrix|bmatrix)\}/.test(compact)) return true;
  if (/[a-zA-Z]\([^)]*\)=/.test(compact)) return true;
  const relation = /[=<>]|\\(?:approx|equiv|leq?|geq?|neq)\b/.test(compact);
  if (relation && compact.length >= 16) return true;
  const complex = /\\(?:d?frac|sqrt|sum|int)\b/.test(compact);
  const operations = compact.match(/[+\-*/^]/g)?.length ?? 0;
  return complex && compact.length >= 28 && operations >= 2;
}

/**
 * Renders a text string that may contain LaTeX delimiters:
 * - \$ (Escaped dollar sign, rendered as plain "$")
 * - $$ ... $$ or \[ ... \] (Block math)
 * - $ ... $ or \( ... \) (Inline math)
 * - **bold** (Bold markdown in plain text)
 * - \n (Line breaks in plain text)
 */
export function KaTeXText({ text, displayMath = false, formatLists = false, highlightKeywords }: { text: string; displayMath?: boolean; formatLists?: boolean; highlightKeywords?: readonly string[] }) {
  if (!text) return null;
  if (formatLists) {
    const blocks = informationBlocks(text);
    if (blocks.some((block) => block.type === "list")) return <>
      {blocks.map((block, index) => block.type === "list" ? (
        <ul key={index} className="information-list">
          {block.items.map((item, itemIndex) => <li key={itemIndex}><KaTeXText text={item} displayMath={displayMath} highlightKeywords={highlightKeywords} /></li>)}
        </ul>
      ) : <KaTeXText key={index} text={block.text} displayMath={displayMath} highlightKeywords={highlightKeywords} />)}
    </>;
  }

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
          const expression = <InlineMath math={authoredBlock || (displayMath && isRelevantExpression(math)) ? `\\displaystyle ${math}` : math} />;
          const renderedMath = matchesMathKeyword(math, highlightKeywords) ? <mark className="hint-keyword">{expression}</mark> : expression;
          // Keep sentence punctuation with both inline and displayed math.
          const punctuation = parts[i + 1]?.match(/^\s*([)\]”’"']*[.,;:!?]+(?:[”’"'])?)(?!\d)/);
          if (punctuation) parts[i + 1] = parts[i + 1].slice(punctuation[0].length);
          if (authoredBlock || (displayMath && isRelevantExpression(math))) {
            return (
              <span key={i} className={`math-line${authoredBlock ? " katex-display" : ""}`}>
                {renderedMath}{punctuation?.[1]}
              </span>
            );
          }
          return punctuation ? (
            <span key={i} className="math-inline-punctuation">{renderedMath}{punctuation[1]}</span>
          ) : <React.Fragment key={i}>{renderedMath}</React.Fragment>;
        }

        return renderPlainText(part, `plain-${i}`, highlightKeywords);
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
