// Shared graph frames, in local CSS pixels. Preserve the source aspect ratio
// inside these frames; only narrow screens may scale the whole frame down.
export const STATEMENT_GRAPH_SIZE = { width: 600, height: 400 } as const;
export const OPTION_GRAPH_SIZE = { width: 200, height: 140 } as const;
export const GRAPH_SIZES = { statement: STATEMENT_GRAPH_SIZE, option: OPTION_GRAPH_SIZE } as const;
