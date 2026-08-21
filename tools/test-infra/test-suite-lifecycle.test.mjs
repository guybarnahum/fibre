import assert from "node:assert/strict";
import test from "node:test";

import {
  REPRO_TOOL_TEST_PATHS,
  discoverTestSuites,
  relativeTestPaths,
  testLifecycleForPath,
} from "./test-suite-lifecycle.mjs";
import { parseTestSuiteArgs, testSuiteCommand } from "./run-test-suite.mjs";

test("retired proof and experiment tests are explicit reproducibility evidence", () => {
  const suites = discoverTestSuites();
  const repro = relativeTestPaths(suites.repro);
  const active = new Set(relativeTestPaths(suites.active));
  const all = relativeTestPaths(suites.all);

  assert.deepEqual(repro, [...REPRO_TOOL_TEST_PATHS].sort());
  assert.equal(suites.counts.allFiles, suites.counts.activeFiles + suites.counts.reproFiles);
  assert.equal(all.length, new Set(all).size);
  for (const path of repro) assert.equal(active.has(path), false);

  for (const path of [
    "services/asset-generator/test/asset-generation-service.test.mjs",
    "tools/genesis/genesis-memory-meaning-characterization.test.mjs",
    "tools/genesis/genesis-pass-a-dev.test.mjs",
    "tools/genesis/genesis-pass-c-semantics-audit.test.mjs",
    "tools/genesis/genesis-rich-life-dev.test.mjs",
    "tools/test-infra/test-value-audit.test.mjs",
    "tools/test-infra/test-suite-lifecycle.test.mjs",
    "tools/gates/history/history-bends-judgment-candidate-4-frozen-boundary.test.mjs",
  ]) {
    assert.equal(active.has(path), true, `${path} must remain active`);
  }
});

test("new tests default active and the runner exposes only active, repro, or all", () => {
  assert.equal(testLifecycleForPath("tools/new-future-regression.test.mjs"), "active");
  assert.equal(
    testLifecycleForPath("tools/repro/pr39/e2/genesis-rich-life-e2-n2.test.mjs"),
    "repro",
  );
  assert.equal(
    testLifecycleForPath("services/world-kernel/test/genesis-rich-life.test.mjs"),
    "active",
  );
  assert.equal(
    testLifecycleForPath("services/asset-generator/test/asset-generation-service.test.mjs"),
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
