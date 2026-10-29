import archiver from "archiver";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
mkdirSync(distDir, { recursive: true });

const output = createWriteStream(join(distDir, "lambda.zip"));
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(`Wrote ${archive.pointer()} bytes to dist/lambda.zip`);
});

archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);
archive.file(join(distDir, "index.js"), { name: "index.js" });
await archive.finalize();
