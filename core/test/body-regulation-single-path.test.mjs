import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// A Thread feels only through its Body regulation system (AGENTS.md, "The
// Body regulation contract"). The genome shapes what is felt in one place:
// the regulation core. Levels may take an inherited persistence only through
// the one accessor World's Body levels share. Anything else reading an urge's
// inherited positions is a parallel path for feeling.
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SHAPES = /positions?\??\.(gain|feltThreshold|persistence|selfRegard|stubbornness)\b/u;
const ALLOWED = new Map([
  ["core/src/intrinsic-regulation.mjs", /./u],
  ["services/world-kernel/src/lived-now-regulation.mjs", /positions\?\.(persistence|selfRegard|stubbornness)/u],
]);

function sources(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (["node_modules", "test", "tests", ".git", ".fibre", "dist", "generated"].includes(name)) return [];
    return statSync(path).isDirectory() ? sources(path) : /\.(mjs|js)$/u.test(name) ? [path] : [];
  });
}

test("only the regulation core shapes what a Thread feels by its genome", () => {
  const strays = ["core", "services", "infra", "apps", "integrations", "tools"].flatMap((top) => sources(join(ROOT, top)))
    .flatMap((path) => readFileSync(path, "utf8").split("\n").map((line, index) => ({ path:relative(ROOT, path), line, index })))
    .filter(({ path, line }) => SHAPES.test(line) && !(ALLOWED.get(path)?.test(line)));
  assert.deepEqual(strays.map(({ path, index }) => `${path}:${index + 1}`), [],
    "an urge's inherited gain or threshold is read outside the regulation core: a parallel path for feeling");
});
