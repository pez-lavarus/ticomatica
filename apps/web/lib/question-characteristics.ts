import type { Question } from "./types";

/** Versioned, viewport-independent facts about the content actually displayed.
 * Lengths count Unicode code points in source text (including LaTeX markup).
 * Word counts exclude math and Markdown markers; formulas count delimited math
 * spans, not operators. Resolve shared context before calling the extractor. */
export interface LayoutCharacteristics {
  version: 1;
  wordNum: number;
  questionStatementWordNum: number;
  responseStatementWordNum: number;
  responseOptionsWordNum: number;
  questionStatementLength: number;
  responseStatementLength: number;
  largestResponseOptionLength: number;
  totalResponseOptionsLength: number;
  longestWordLength: number;
  longestOptionWordLength: number;
  hasGraph: boolean;
  hasStatementGraph: boolean;
  hasTable: boolean;
  hasSharedContext: boolean;
  optionGraphNum: number;
  optionNum: number;
  optionContentType: "text" | "graph" | "mixed";
  hasFormula: boolean;
  formulaNum: number;
  questionFormulaNum: number;
  responseFormulaNum: number;
  optionFormulaNum: number;
  displayFormulaNum: number;
  complexFormulaNum: number;
  largestFormulaLength: number;
  largestOptionFormulaLength: number;
  questionParagraphNum: number;
  responseParagraphNum: number;
}

type Content = Pick<Question, "statement" | "problem" | "options" | "graph_image" | "graph_svg" | "visual_spec" | "group_id">;
const length = (text: string) => Array.from(text).length;
const mathPattern = /\\\$|\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?:\\.|[^$\n])+?\$|\\\([\s\S]*?\\\)/g;

function inspect(text: string) {
  const formulas: string[] = [];
  let displayNum = 0;
  const prose = text.replace(mathPattern, (span) => {
    if (span === "\\$") return "$";
    const display = span.startsWith("$$") || span.startsWith("\\[");
    const delimiterLength = span.startsWith("$") && !display ? 1 : 2;
    formulas.push(span.slice(delimiterLength, -delimiterLength));
    if (display) displayNum++;
    return " ";
  });
  const words = prose.match(/[\p{L}\p{N}]+(?:['’’-][\p{L}\p{N}]+)*/gu) ?? [];
  return {
    formulas, displayNum, wordNum: words.length,
    longestWordLength: Math.max(0, ...words.map(length)),
    paragraphs: text.trim() ? text.trim().split(/\n\s*\n/).length : 0,
  };
}

export function extractLayoutCharacteristics(content: Content): LayoutCharacteristics {
  const statement = inspect(content.statement);
  const response = inspect(content.problem);
  // Image option labels such as "Gráfico A" are source descriptions, not the
  // prose rendered inside the answer card, and must not inflate its length.
  const optionTexts = content.options.map((o) => o.image || o.svg ? "" : o.text ?? "");
  const options = optionTexts.map(inspect);
  const optionFormulas = options.flatMap((o) => o.formulas);
  const formulas = [...statement.formulas, ...response.formulas, ...optionFormulas];
  const visual = content.visual_spec?.visual ?? content.visual_spec;
  const hasTable = visual?.type === "table";
  const hasStatementGraph = !hasTable && Boolean(content.graph_image || content.graph_svg || visual);
  const optionGraphNum = content.options.filter((o) => o.image || o.svg).length;
  return {
    version: 1,
    wordNum: statement.wordNum + response.wordNum + options.reduce((n, o) => n + o.wordNum, 0),
    questionStatementWordNum: statement.wordNum,
    responseStatementWordNum: response.wordNum,
    responseOptionsWordNum: options.reduce((n, o) => n + o.wordNum, 0),
    questionStatementLength: length(content.statement),
    responseStatementLength: length(content.problem),
    largestResponseOptionLength: Math.max(0, ...optionTexts.map(length)),
    totalResponseOptionsLength: optionTexts.reduce((n, text) => n + length(text), 0),
    longestWordLength: Math.max(statement.longestWordLength, response.longestWordLength, ...options.map((o) => o.longestWordLength)),
    longestOptionWordLength: Math.max(0, ...options.map((o) => o.longestWordLength)),
    hasGraph: hasStatementGraph || optionGraphNum > 0,
    hasStatementGraph, hasTable, hasSharedContext: Boolean(content.group_id),
    optionGraphNum, optionNum: content.options.length,
    optionContentType: optionGraphNum === 0 ? "text" : optionGraphNum === content.options.length ? "graph" : "mixed",
    hasFormula: formulas.length > 0, formulaNum: formulas.length,
    questionFormulaNum: statement.formulas.length,
    responseFormulaNum: response.formulas.length,
    optionFormulaNum: optionFormulas.length,
    displayFormulaNum: statement.displayNum + response.displayNum + options.reduce((n, o) => n + o.displayNum, 0),
    complexFormulaNum: formulas.filter((f) => /\\(?:d?frac|sqrt|sum|int|begin)\b/.test(f)).length,
    largestFormulaLength: Math.max(0, ...formulas.map(length)),
    largestOptionFormulaLength: Math.max(0, ...optionFormulas.map(length)),
    questionParagraphNum: statement.paragraphs,
    responseParagraphNum: response.paragraphs,
  };
}

/** Content preferences are soft; the measured fit and readable widths remain
 * authoritative. Very long answer text/formulas, however, need a full column. */
export function layoutPreferences(facts: LayoutCharacteristics) {
  const needsWideAnswers = facts.largestResponseOptionLength > 140
    || facts.largestOptionFormulaLength > 36 || facts.longestOptionWordLength > 24;
  const wordyStatement = facts.questionStatementWordNum >= 45
    || facts.questionStatementLength >= 320 || facts.questionParagraphNum >= 3;
  const shortOptions = facts.optionGraphNum === 0
    && facts.largestResponseOptionLength <= 80 && facts.largestOptionFormulaLength <= 24;
  return {
    template: !(wordyStatement && shortOptions) && facts.hasStatementGraph && !facts.hasTable && facts.optionGraphNum === 0
      && facts.questionStatementWordNum <= 70 && facts.questionStatementLength <= 500
      && facts.responseStatementLength <= 280 && facts.questionParagraphNum <= 2 ? "side" : "stack",
    columns: !needsWideAnswers && facts.optionNum >= 3
      && (facts.optionGraphNum > 0 || facts.largestResponseOptionLength <= 80) ? 2 : 1,
    needsWideAnswers,
  } as const;
}
