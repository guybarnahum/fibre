import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const required = [
  "README.md", "AGENTS.md", "CLAUDE.md",
  "docs/vision/constitution.md", "docs/vision/invariants.md",
  "docs/state/current-state.md", "docs/architecture/thread-lifecycle.md",
  "schemas/thread.schema.json", "apps/thread-editor/index.html"
];
let failed = false;
for (const file of required) {
  if (!existsSync(file)) { console.error(`Missing required file: ${file}`); failed = true; }
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

for (const file of walk("docs")) {
  if (!file.endsWith(".md")) continue;
  const text = readFileSync(file, "utf8");
  if (/\bICAN\b/.test(text) && !file.includes("history")) {
    console.error(`Superseded term ICAN found in canonical docs: ${file}`); failed = true;
  }
}

for (const file of walk("schemas")) {
  if (file.endsWith(".json")) {
    try { JSON.parse(readFileSync(file, "utf8")); }
    catch (error) { console.error(`Invalid JSON ${file}: ${error.message}`); failed = true; }
  }
}

if (failed) process.exit(1);
console.log("Repository validation passed.");
