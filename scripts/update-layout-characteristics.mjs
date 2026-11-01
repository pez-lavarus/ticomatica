import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extractLayoutCharacteristics } from "../apps/web/lib/question-characteristics.ts";

const path = fileURLToPath(new URL("../apps/web/data/2026_2/questions.json", import.meta.url));
const text = await readFile(path, "utf8");
const bank = JSON.parse(text);
const groups = new Map((bank.groups ?? []).map((g) => [g.group_id, g]));
const characteristics = bank.items.map((item) => {
  const group = groups.get(item.group_id);
  return extractLayoutCharacteristics({
    statement: item.statement || group?.context_text || "",
    problem: item.problem ?? "",
    graph_image: item.image ?? group?.image,
    visual_spec: item.visual_spec ?? group?.visual_spec,
    group_id: item.group_id,
    options: Object.entries(item.options).map(([label, value]) => ({
      label, text: value, image: item.option_images?.[label],
    })),
  });
});
if (process.argv.includes("--check")) {
  const stale = bank.items.filter((item, i) => JSON.stringify(item.layoutCharacteristics) !== JSON.stringify(characteristics[i]));
  if (stale.length) throw new Error(`Stale layout characteristics: items ${stale.map((q) => q.id).join(", ")}`);
  console.log(`Verified layout characteristics for ${bank.items.length} questions.`);
} else {
  // Preserve the source bank's formatting and mathematical content. Each
  // generated flat object gets one line rather than reformatting the exam.
  const marker = /^  "items":\s*\[/m.exec(text);
  if (!marker) throw new Error("Cannot locate the top-level items array");
  const start = marker.index + marker[0].length;
  const ranges = [];
  let depth = 0, quoted = false, escaped = false, itemStart = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === "{") { if (depth++ === 0) itemStart = i; }
    else if (c === "}" && --depth === 0) ranges.push([itemStart, i + 1]);
    else if (c === "]" && depth === 0) break;
  }
  if (ranges.length !== bank.items.length) throw new Error("Item range count mismatch");
  let updated = text;
  for (let i = ranges.length - 1; i >= 0; i--) {
    const [from, to] = ranges[i];
    let body = text.slice(from, to - 1).trimEnd();
    body = body.replace(/,\s*"layoutCharacteristics":\s*\{[^\n]*\}\s*$/, "");
    const item = `${body},\n      "layoutCharacteristics": ${JSON.stringify(characteristics[i])}\n    }`;
    updated = updated.slice(0, from) + item + updated.slice(to);
  }
  const parsed = JSON.parse(updated);
  for (let i = 0; i < parsed.items.length; i++) {
    const { layoutCharacteristics: _before, ...before } = bank.items[i];
    const { layoutCharacteristics: _after, ...after } = parsed.items[i];
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error(`Unexpected content change in item ${before.id}`);
  }
  await writeFile(path, updated);
  console.log(`Updated layout characteristics for ${bank.items.length} questions.`);
}
