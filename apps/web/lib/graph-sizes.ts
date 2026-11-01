// Shared graph frames, in local CSS pixels. Preserve the source aspect ratio
// inside these frames. Narrow screens and formula-heavy answer layouts may
// reduce statement frames to preserve reading space.
export const STATEMENT_GRAPH_SIZE = { width: 600, height: 400 } as const;
export const OPTION_GRAPH_SIZE = { width: 220, height: 154 } as const;
export const GRAPH_SIZES = { statement: STATEMENT_GRAPH_SIZE, option: OPTION_GRAPH_SIZE } as const;
