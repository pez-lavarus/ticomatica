// Keep the statically exported PDF and PDF.js worker in sync with their sources.
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const web = path.join(root, "apps/web");
const require = createRequire(path.join(web, "package.json"));
const pdfjsRoot = path.dirname(require.resolve("pdfjs-dist/package.json"));
const { version } = JSON.parse(await readFile(path.join(pdfjsRoot, "package.json"), "utf8"));
const destination = path.join(web, "public/pdfjs", version);
await rm(path.join(web, "public/pdfjs"), { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const asset of ["cmaps", "standard_fonts", "wasm", "LICENSE"]) {
  await cp(path.join(pdfjsRoot, asset), path.join(destination, asset), { recursive: true });
}
await cp(path.join(pdfjsRoot, "build/pdf.worker.min.mjs"), path.join(destination, "pdf.worker.min.mjs"));
await mkdir(path.join(web, "public/documents"), { recursive: true });
await cp(
  path.join(web, "data/2026_2/Practica-BxM-Matematicas-02-2026.pdf"),
  path.join(web, "public/documents/Practica-BxM-Matematicas-02-2026.pdf"),
);
console.log(`Prepared practice document and PDF.js ${version} assets.`);
