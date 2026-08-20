import { readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_TEST_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

// These tests preserve retired/frozen #39 development instruments and their exact
// protocol mechanics. They remain executable scientific evidence, but they are not
// part of Fibre's everyday product/regression suite.
//
// Keep this list explicit. A newly added test defaults to ACTIVE until a maintainer
// deliberately classifies it as reproducibility evidence.
export const REPRO_TOOL_TEST_FILES = Object.freeze([
  "genesis-genome-positive-control.test.mjs",
  "genesis-rich-life-e2-a0-candidate-driver.test.mjs",
  "genesis-rich-life-e2-a0.test.mjs",
  "genesis-rich-life-e2-a2.test.mjs",
  "genesis-rich-life-e2-a2b-driver.test.mjs",
  "genesis-rich-life-e2-a2b.test.mjs",
  "genesis-rich-life-e2-h6-participation.test.mjs",
  "genesis-rich-life-e2-h6-probe.test.mjs",
  "genesis-rich-life-e2-n1-a0.test.mjs",
  "genesis-rich-life-e2-n1-driver.test.mjs",
  "genesis-rich-life-e2-n1.test.mjs",
  "genesis-rich-life-e2-n2.test.mjs",
  "genesis-rich-life-e2-protocol-clear-amendments.test.mjs",
  "genesis-rich-life-e2-v1.test.mjs",
  "genesis-rich-life-e2-v2-affordance-preflight.test.mjs",
  "genesis-rich-life-e2-worlds.test.mjs",
]);

const REPRO_TOOL_TEST_SET = new Set(REPRO_TOOL_TEST_FILES);

function topLevelTests(root, directory) {
  const absolute = join(root, directory);
  return readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".test.mjs"))
    .map((entry) => join(absolute, entry.name))
    .sort();
}

export function testLifecycleForPath(path) {
  const normalized = path.split("\\").join("/");
  const name = normalized.slice(normalized.lastIndexOf("/") + 1);
  return normalized.includes("/tools/") || normalized.startsWith("tools/")
    ? (REPRO_TOOL_TEST_SET.has(name) ? "repro" : "active")
    : "active";
}

export function discoverTestSuites(root = DEFAULT_TEST_ROOT) {
  const domain = topLevelTests(root, "packages/domain/test");
  const worldKernel = topLevelTests(root, "services/world-kernel/test");
  const tools = topLevelTests(root, "tools");
  const toolNames = new Set(tools.map((path) => path.slice(path.lastIndexOf("/") + 1)));
  const missingReproTests = REPRO_TOOL_TEST_FILES.filter((name) => !toolNames.has(name));
  if (missingReproTests.length > 0) {
    throw new TypeError(
      `repro test manifest names missing files: ${missingReproTests.join(", ")}`,
    );
  }

  const repro = tools.filter((path) => testLifecycleForPath(path) === "repro");
  const activeTools = tools.filter((path) => testLifecycleForPath(path) === "active");
  const active = [...domain, ...worldKernel, ...activeTools];
  const all = [...domain, ...worldKernel, ...tools];

  return Object.freeze({
    active: Object.freeze(active),
    repro: Object.freeze(repro),
    all: Object.freeze(all),
    counts: Object.freeze({
      activeFiles: active.length,
      reproFiles: repro.length,
      allFiles: all.length,
    }),
  });
}

export function relativeTestPaths(paths, root = DEFAULT_TEST_ROOT) {
  return paths.map((path) => relative(root, path).split("\\").join("/"));
}
