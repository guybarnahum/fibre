import assert from "node:assert/strict";
import test from "node:test";

import {
  REPRO_TOOL_TEST_FILES,
  discoverTestSuites,
  relativeTestPaths,
  testLifecycleForPath,
} from "./test-suite-lifecycle.mjs";
import { parseTestSuiteArgs, testSuiteCommand } from "./run-test-suite.mjs";

test("retired #39 experiment tests are explicit reproducibility evidence, not active regressions", () => {
  const suites = discoverTestSuites();
  const repro = relativeTestPaths(suites.repro);
  const active = new Set(relativeTestPaths(suites.active));
  const all = relativeTestPaths(suites.all);

  assert.deepEqual(
    repro,
    [...REPRO_TOOL_TEST_FILES].sort().map((name) => `tools/${name}`),
  );
  assert.equal(suites.counts.allFiles, suites.counts.activeFiles + suites.counts.reproFiles);
  assert.equal(all.length, new Set(all).size);
  for (const path of repro) assert.equal(active.has(path), false);

  // These are current doctrine/diagnostic/development protections even though they
  // live beside the retired E2 lineage.
  for (const path of [
    "tools/genesis-memory-meaning-characterization.test.mjs",
    "tools/genesis-pass-a-dev.test.mjs",
    "tools/genesis-pass-c-semantics-audit.test.mjs",
    "tools/genesis-rich-life-dev.test.mjs",
    "tools/test-value-audit.test.mjs",
    "tools/test-suite-lifecycle.test.mjs",
  ]) {
    assert.equal(active.has(path), true, `${path} must remain active`);
  }
});

test("new tests default active and the runner exposes only active, repro, or all", () => {
  assert.equal(testLifecycleForPath("tools/new-future-regression.test.mjs"), "active");
  assert.equal(
    testLifecycleForPath("tools/genesis-rich-life-e2-n2.test.mjs"),
    "repro",
  );
  assert.equal(
    testLifecycleForPath("services/world-kernel/test/genesis-rich-life.test.mjs"),
    "active",
  );

  assert.deepEqual(parseTestSuiteArgs([]), { suite: "active", nodeTestArgs: [] });
  assert.deepEqual(parseTestSuiteArgs(["repro", "--test-name-pattern=protocol"]), {
    suite: "repro",
    nodeTestArgs: ["--test-name-pattern=protocol"],
  });
  assert.throws(() => parseTestSuiteArgs(["retired"]), /active, repro, or all/);

  const active = testSuiteCommand(["active"]);
  const repro = testSuiteCommand(["repro"]);
  const all = testSuiteCommand(["all"]);
  assert.equal(active.command.includes("--test"), true);
  assert.equal(active.files.length + repro.files.length, all.files.length);
  for (const path of repro.files) assert.equal(active.files.includes(path), false);
});
