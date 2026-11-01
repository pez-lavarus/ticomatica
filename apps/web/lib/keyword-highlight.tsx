import type { ReactNode } from "react";

/** Literal, case-insensitive whole-word matches; never inject authored HTML. */
export function highlightText(text: string, keywords: readonly string[] = []): ReactNode {
  const terms = [...new Set(keywords.map((term) => term.trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length);
  if (!terms.length) return text;
  const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])(${terms.map(escape).join("|")})(?![\\p{L}\\p{N}_])`, "giu");
  const parts: ReactNode[] = [];
  let start = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index!;
    if (start < index) parts.push(text.slice(start, index));
    parts.push(<mark key={index} className="hint-keyword">{match[0]}</mark>);
    start = index + match[0].length;
  }
  if (start < text.length) parts.push(text.slice(start));
  return parts.length ? parts : text;
}

/** Highlight math only as a complete expression, preserving the KaTeX tree. */
export function matchesMathKeyword(math: string, keywords: readonly string[] = []): boolean {
  const normalize = (text: string) => text.replace(/^\$+|\$+$/g, "").replace(/\s+/g, "");
  return keywords.some((term) => normalize(term) === normalize(math));
}
