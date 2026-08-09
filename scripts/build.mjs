import { access, cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(projectRoot, "public");
const outputDir = join(projectRoot, "dist");

if (outputDir === projectRoot || dirname(outputDir) !== projectRoot) {
  throw new Error("Небезопасный путь каталога сборки");
}

for (const requiredFile of ["index.html", "styles.css", "core.js", "game.js"]) {
  await access(join(sourceDir, requiredFile));
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(sourceDir, outputDir, { recursive: true });

const files = await Promise.all(
  ["index.html", "styles.css", "core.js", "game.js"].map(async (name) => ({
    name,
    bytes: (await stat(join(outputDir, name))).size
  }))
);

console.log(`MANDATE static build: ${files.map((file) => `${file.name} (${file.bytes} B)`).join(", ")}`);
