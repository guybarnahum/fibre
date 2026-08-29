import assert from "node:assert/strict";
import test from "node:test";

import {
  REPLAY_TOOL_TEST_PATHS,
  discoverTestSuites,
  relativeTestPaths,
  testLifecycleForPath,
} from "./test-suite-lifecycle.mjs";
import { parseTestSuiteArgs, testSuiteCommand } from "./run-test-suite.mjs";

test("retired proof and experiment tests are explicit reproducibility evidence", () => {
  const suites = discoverTestSuites();
  const replay = relativeTestPaths(suites.replay);
  const active = new Set(relativeTestPaths(suites.active));
  const all = relativeTestPaths(suites.all);

  assert.deepEqual(replay, [...REPLAY_TOOL_TEST_PATHS].sort());
  assert.equal(suites.counts.allFiles, suites.counts.activeFiles + suites.counts.replayFiles);
  assert.equal(all.length, new Set(all).size);
  for (const path of replay) assert.equal(active.has(path), false);

  for (const path of [
    "infra/test/cloudflare-v1.test.mjs",
    "infra/test/cloudflare-presentation-ports.test.mjs",
    "services/asset-generator/test/asset-generation-service.test.mjs",
    "services/asset-generator/test/credentialed-asset-generation.test.mjs",
    "services/asset-generator/test/provider-adapters.test.mjs",
    "services/thread-presentation/test/deployment/presentation-read-api.test.mjs",
    "services/world-kernel/test/thread-presentation-asset-publisher.test.mjs",
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

test("new tests default active and the runner exposes only active, replay, or all", () => {
  assert.equal(testLifecycleForPath("tools/new-future-regression.test.mjs"), "active");
  assert.equal(
    testLifecycleForPath("tools/replays/m1/m1-demo-editor.test.mjs"),
    "replay",
  );
  assert.equal(
    testLifecycleForPath("services/world-kernel/test/genesis-rich-life.test.mjs"),
    "active",
  );
  assert.equal(
    testLifecycleForPath("services/asset-generator/test/asset-generation-service.test.mjs"),
    "active",
  );
  assert.equal(
    testLifecycleForPath("services/asset-generator/test/provider-adapters.test.mjs"),
    "active",
  );
  assert.equal(
    testLifecycleForPath("infra/test/cloudflare-v1.test.mjs"),
    "active",
  );
  assert.equal(
    testLifecycleForPath("services/thread-presentation/test/deployment/presentation-read-api.test.mjs"),
    "active",
  );

  assert.deepEqual(parseTestSuiteArgs([]), { suite: "active", nodeTestArgs: [] });
  assert.deepEqual(parseTestSuiteArgs(["replay", "--test-name-pattern=protocol"]), {
    suite: "replay",
    nodeTestArgs: ["--test-name-pattern=protocol"],
  });
  assert.throws(() => parseTestSuiteArgs(["retired"]), /active, replay, or all/);

  const active = testSuiteCommand(["active"]);
  const replay = testSuiteCommand(["replay"]);
  const all = testSuiteCommand(["all"]);
  assert.equal(active.command.includes("--test"), true);
  assert.equal(active.files.length + replay.files.length, all.files.length);
  for (const path of replay.files) assert.equal(active.files.includes(path), false);
});
