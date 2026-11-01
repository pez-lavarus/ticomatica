export type InformationBlock = { type: "text"; text: string } | { type: "list"; items: string[] };

/** Recognize authored bullets and consecutive labelled definitions. Work on
 * complete lines before math tokenization, so a formula stays inside its item.
 * Do not infer lists from ordinary line wrapping or sentence punctuation. */
export function informationBlocks(text: string): InformationBlock[] {
  const lines = text.split(/\r?\n/);
  const mathRanges = Array.from(text.matchAll(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g),
    (match) => [match.index!, match.index! + match[0].length]);
  const offsets: number[] = [];
  let offset = 0;
  for (const line of lines) {
    offsets.push(offset);
    const end = offset + line.length;
    offset = end + (text.slice(end, end + 2) === "\r\n" ? 2 : 1);
  }
  const marker = (line: string, index: number) => {
    const position = offsets[index] + line.search(/\S/);
    if (mathRanges.some(([start, end]) => position >= start && position < end)) return null;
    const bullet = /^\s*[-*•]\s+(.+)$/.exec(line);
    if (bullet) return { text: bullet[1], explicit: true };
    if (/^\s*(?:\d+[.)]|[A-Za-z][.)])\s+\S/.test(line)) return { text: line.trim(), explicit: true };
    if (/^\s*[A-Z]\s*:\s+\S/.test(line)) return { text: line.trim(), explicit: false };
    return null;
  };
  const blocks: InformationBlock[] = [];
  let prose: string[] = [];
  const flush = () => {
    const value = prose.join("\n").trim();
    if (value) blocks.push({ type: "text", text: value });
    prose = [];
  };
  for (let i = 0; i < lines.length;) {
    const first = marker(lines[i], i);
    if (!first) { prose.push(lines[i++]); continue; }
    const start = i;
    const items: string[] = [];
    let explicit = false;
    while (i < lines.length) {
      const item = marker(lines[i], i);
      if (item) { items.push(item.text); explicit ||= item.explicit; i++; }
      else if (!lines[i].trim() && i + 1 < lines.length && marker(lines[i + 1], i + 1)) i++;
      else break;
    }
    if (!explicit && items.length < 2) { prose.push(...lines.slice(start, i)); continue; }
    flush();
    blocks.push({ type: "list", items });
  }
  flush();
  return blocks;
}
