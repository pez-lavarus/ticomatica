import React from 'react';
import katex from 'katex';

interface TextRendererProps {
  content?: string;
  className?: string;
  inline?: boolean;
}

/**
  Normalizes LaTeX math expressions to ensure beautiful fraction rendering.
  Replaces standard \frac with \dfrac (display fraction) when appropriate or ensures displayMode formatting.
 */
function normalizeMathExpr(expr: string): string {
  // Convert \frac to \dfrac for better vertical spacing in inline math unless it's already \dfrac or \cfrac
  return expr.replace(/\\frac\{/g, '\\dfrac{');
}

export const TextRenderer: React.FC<TextRendererProps> = ({
  content = '',
  className = '',
  inline = false,
}) => {
  if (!content) return null;

  // Split by LaTeX delimiters: $...$, $$...$$, \(...\), \[...\]
  const parts: Array<{ text: string; isMath: boolean; isBlock: boolean }> = [];
  const regex = /(\$\$.*?\$\$|\$.*?\$|\\\(.*?\\\)|\\\[.*?\\\])/gs;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: content.substring(lastIndex, match.index),
        isMath: false,
        isBlock: false,
      });
    }

    const matchedStr = match[0];
    let mathExpr = matchedStr;
    let isBlock = false;

    if (matchedStr.startsWith('$$') && matchedStr.endsWith('$$')) {
      mathExpr = matchedStr.slice(2, -2);
      isBlock = true;
    } else if (matchedStr.startsWith('$') && matchedStr.endsWith('$')) {
      mathExpr = matchedStr.slice(1, -1);
    } else if (matchedStr.startsWith('\\(') && matchedStr.endsWith('\\)')) {
      mathExpr = matchedStr.slice(2, -2);
    } else if (matchedStr.startsWith('\\[') && matchedStr.endsWith('\\]')) {
      mathExpr = matchedStr.slice(2, -2);
      isBlock = true;
    }

    parts.push({
      text: normalizeMathExpr(mathExpr),
      isMath: true,
      isBlock,
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({
      text: content.substring(lastIndex),
      isMath: false,
      isBlock: false,
    });
  }

  return (
    <span className={`text-renderer ${className}`}>
      {parts.map((part, index) => {
        if (!part.isMath) {
          return <React.Fragment key={index}>{part.text}</React.Fragment>;
        }

        try {
          const html = katex.renderToString(part.text, {
            displayMode: part.isBlock && !inline,
            throwOnError: false,
          });

          return (
            <span
              key={index}
              className={`math-data-badge ${
                part.isBlock
                  ? 'block my-3 text-center p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 shadow-2xs font-extrabold text-zinc-950 dark:text-zinc-50'
                  : 'inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/70 text-indigo-950 dark:text-indigo-100 font-bold align-baseline transition-colors'
              }`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={index} className="text-red-500 font-mono">{part.text}</span>;
        }
      })}
    </span>
  );
};