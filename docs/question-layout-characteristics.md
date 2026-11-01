# Question layout characteristics

Every question exposes `layoutCharacteristics`. The schema in
`apps/web/data/2026_2/schema.json` defines this derived object; the schema itself
validates data and does not execute extraction.

`extractLayoutCharacteristics` in `apps/web/lib/question-characteristics.ts`
computes the facts after the bank adapter resolves shared group statements,
images, and structured visuals. The runtime recomputes them once when building
the bank, so editing content cannot leave the rendered experience using stale
stored metrics.

| Information | Main fields |
| --- | --- |
| Prose density | `wordNum`, `questionStatementWordNum`, `responseStatementWordNum`, `responseOptionsWordNum` |
| Source length | `questionStatementLength`, `responseStatementLength`, `largestResponseOptionLength`, `totalResponseOptionsLength` |
| Wrapping risks | `longestWordLength`, `longestOptionWordLength`, paragraph counts |
| Visuals | `hasGraph`, `hasStatementGraph`, `hasTable`, `optionGraphNum`, `optionContentType` |
| Mathematics | `formulaNum`, per-region formula counts, `displayFormulaNum`, `complexFormulaNum`, largest formula lengths |
| Structure | `version`, `optionNum`, `hasSharedContext` |

`responseStatementLength` describes the `problem` prompt, not the answers.
Lengths count Unicode code points in source text, including LaTeX commands.
Word counts exclude delimited math. Formula counts count math spans, not
operators, and recognize `$...$`, `$$...$$`, `\(...\)`, and `\[...\]`.
Escaped currency dollars are not formulas. Image-only placeholder text such as
"Gráfico A" is omitted because the response renderer displays the image instead.
`hasGraph` includes answer graphs; tables have their own flag.

The layout engine uses these facts for content preferences: short graph
statements favor horizontal cards, dense prose and tables favor stacking, and
long textual answers or formulas retain a full answer column. A statement with
at least 45 prose words, 320 source characters, or three paragraphs favors
vertical stacking when textual options are short (at most 80 source characters
and no formula longer than 24 characters). Short answers and
image options can favor two columns. Actual measured fit, readable minimums,
and fixed graph frames remain authoritative; metadata does not force scrolling
merely to keep a preferred orientation.

To regenerate stored facts for all 60 source items:

```sh
pnpm update:layout-characteristics
pnpm check:layout-characteristics
```

The generator preserves question text, answer values, formulas, and existing
formatting. The check fails if any item's stored facts are missing or stale.
Tests compare every stored profile to the resolved runtime question. When
extraction semantics change, update the profile version and regenerate data.
