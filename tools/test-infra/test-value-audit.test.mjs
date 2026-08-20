import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { buildTestValueAudit } from "./test-value-audit.mjs";

function withAuditFixture(run) {
  const root = mkdtempSync(join(tmpdir(), "fibre-test-value-audit-"));
  for (const directory of [
    "packages/domain/test",
    "services/world-kernel/test",
    "tools",
  ]) {
    mkdirSync(join(root, directory), { recursive: true });
  }
  try { return run(root); }
  finally { rmSync(root, { recursive: true, force: true }); }
}

function put(root, path, source) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, source);
}

test("test-value audit distinguishes semantic tests from mechanical tombstones and aliases", () =>
  withAuditFixture((root) => {
    put(root, "packages/domain/test/thread.test.mjs", `
      import test from "node:test";
      test("thread identity persists", () => {});
    `);
    put(root, "services/world-kernel/test/comment-only.test.mjs", `
      // Coverage moved to the canonical file.
      // Old test("retired boundary", () => {}) is not executable evidence.
      /* This path is intentionally retired. */
    `);
    put(root, "services/world-kernel/test/canonical.test.mjs", `
      import test from "node:test";
      test("publication rejects mutation", () => {});
    `);
    put(root, "services/world-kernel/test/alias.test.mjs", `
      import "./canonical.test.mjs";
    `);
    put(root, "tools/dynamic.test.mjs", `
      import test from "node:test";
      const codeShapedString = 'import "./ghost.test.mjs"; test("ghost", () => {});';
      void codeShapedString;
      const cases = [1, 2];
      for (const value of cases) test(\`generated \${value}\`, () => {});
    `);

    const audit = buildTestValueAudit(root);
    assert.equal(audit.totals.files, 5);
    assert.equal(audit.hygiene.commentOnlyTestFiles.length, 1);
    assert.equal(
      audit.hygiene.commentOnlyTestFiles[0],
      "services/world-kernel/test/comment-only.test.mjs",
    );
    assert.deepEqual(audit.hygiene.testImportAliases, [{
      path: "services/world-kernel/test/alias.test.mjs",
      importedTestFiles: ["./canonical.test.mjs"],
      declaredTestCalls: 0,
    }]);

    const commentOnly = audit.records.find((record) => record.path === "services/world-kernel/test/comment-only.test.mjs");
    assert.equal(commentOnly.declaredTestCalls, 0);

    const dynamic = audit.records.find((record) => record.path === "tools/dynamic.test.mjs");
    assert.equal(dynamic.zeroDeclaredTests, false);
    assert.equal(dynamic.declaredTestCalls, 1);
    assert.deepEqual(dynamic.importedTestFiles, []);
    assert.equal(dynamic.commentOnly, false);
    assert.equal(dynamic.family, "experimental-or-repo-tooling");
  }));

test("test-value audit reports byte-identical test files without treating shared titles as proof of duplication", () =>
  withAuditFixture((root) => {
    const duplicate = `
      import test from "node:test";
      test("same boundary", () => {});
    `;
    put(root, "packages/domain/test/a.test.mjs", duplicate);
    put(root, "services/world-kernel/test/b.test.mjs", duplicate);
    put(root, "tools/c.test.mjs", `
      import test from "node:test";
      test("same boundary", () => { const distinct = true; void distinct; });
    `);

    const audit = buildTestValueAudit(root);
    assert.equal(audit.hygiene.exactDuplicateBodies.length, 1);
    assert.deepEqual(audit.hygiene.exactDuplicateBodies[0].paths, [
      "packages/domain/test/a.test.mjs",
      "services/world-kernel/test/b.test.mjs",
    ]);
    assert.equal(audit.hygiene.duplicateTitles.length, 1);
    assert.deepEqual(audit.hygiene.duplicateTitles[0].paths, [
      "packages/domain/test/a.test.mjs",
      "services/world-kernel/test/b.test.mjs",
      "tools/c.test.mjs",
    ]);
  }));
