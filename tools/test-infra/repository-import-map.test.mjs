// fibre-test-lifecycle: permanent
//
// Fibre resolves cross-tree module specifiers through the root package.json
// `imports` map rather than through relocation symlinks. This test protects the
// two properties that keeps true: the map resolves, and the symlink bridges do
// not come back.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const imports = packageJson.imports ?? {};

function trackedFiles(...patterns) {
  return execFileSync("git", ["ls-files", "--", ...patterns], { cwd: root, encoding: "utf8" })
    .split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}

function resolveSubpath(specifier) {
  for (const [pattern, target] of Object.entries(imports)) {
    if (!pattern.includes("*")) {
      if (specifier === pattern) return target;
      continue;
    }
    const [prefix, suffix] = pattern.split("*");
    if (specifier.startsWith(prefix) && specifier.endsWith(suffix)) {
      const rest = specifier.slice(prefix.length, specifier.length - suffix.length);
      return target.replace("*", rest);
    }
  }
  return null;
}

test("the repository carries no tracked relocation symlinks", () => {
  const index = execFileSync("git", ["ls-files", "-s"], { cwd: root, encoding: "utf8" });
  const symlinks = index.split(/\r?\n/u)
    .filter((line) => line.startsWith("120000"))
    .map((line) => line.split("\t")[1]);
  assert.deepEqual(
    symlinks,
    [],
    "cross-tree imports use the package.json imports map; re-adding a symlink bridge hides a real path",
  );
});

test("every declared subpath import target exists", () => {
  assert.ok(Object.keys(imports).length > 0, "the repository declares subpath imports");
  for (const [pattern, target] of Object.entries(imports)) {
    const probe = target.replace("*", "");
    assert.equal(
      existsSync(resolve(root, probe)),
      true,
      `imports["${pattern}"] points at a missing path ${target}`,
    );
  }
});

test("every subpath specifier used in the repository resolves to a real file", () => {
  const files = trackedFiles("*.mjs", "*.js", "*.ts");
  const specifier = /(?:\bfrom\s*|\bimport\s*\(\s*)(["'])(#[^"']+)\1/gu;
  let checked = 0;
  for (const file of files) {
    const absolute = resolve(root, file);
    if (lstatSync(absolute).isSymbolicLink()) continue;
    const source = readFileSync(absolute, "utf8");
    for (const match of source.matchAll(specifier)) {
      const resolved = resolveSubpath(match[2]);
      assert.notEqual(resolved, null, `${file} uses undeclared subpath import ${match[2]}`);
      assert.equal(
        existsSync(resolve(root, resolved)),
        true,
        `${file} imports ${match[2]} which resolves to missing ${resolved}`,
      );
      checked += 1;
    }
  }
  assert.ok(checked > 100, `expected the repository to use subpath imports broadly, saw ${checked}`);
});

test("relocated executable wrappers remain real files with stable main guards", async () => {
  for (const relativePath of ["tools/m1-demo-world-kernel.mjs"]) {
    const absolute = resolve(root, relativePath);
    assert.equal(lstatSync(absolute).isSymbolicLink(), false, `${relativePath} must remain a real executable wrapper`);
    await assert.doesNotReject(import(`file://${absolute}`), `${relativePath} must remain importable`);
  }
  assert.ok(dirname(root));
});
