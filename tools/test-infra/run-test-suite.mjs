import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { discoverTestSuites } from "./test-suite-lifecycle.mjs";

export function parseTestSuiteArgs(argv) {
  const [suite = "active", ...rest] = argv;
  if (!new Set(["active", "repro", "all"]).has(suite)) {
    throw new TypeError("test suite must be active, repro, or all");
  }
  return { suite, nodeTestArgs: rest };
}

export function testSuiteCommand(argv = process.argv.slice(2)) {
  const { suite, nodeTestArgs } = parseTestSuiteArgs(argv);
  const suites = discoverTestSuites();
  const files = suites[suite];
  return {
    suite,
    files,
    command: [
      process.execPath,
      "--disable-warning=ExperimentalWarning",
      "--test",
      ...nodeTestArgs,
      ...files,
    ],
  };
}

export function runTestSuite(argv = process.argv.slice(2)) {
  const { suite, files, command } = testSuiteCommand(argv);
  console.error(`FIBRE-TEST-SUITE: ${suite} (${files.length} files)`);
  const result = spawnSync(command[0], command.slice(1), {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runTestSuite();
}
