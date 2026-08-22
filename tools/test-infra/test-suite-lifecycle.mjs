import { readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_TEST_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

// Reproducibility tests are explicit path-level evidence. Any new test that is not
// deliberately listed here remains ACTIVE by default.
export const REPRO_TOOL_TEST_PATHS = Object.freeze([
  "tools/repro/m1/m1-demo-editor.test.mjs",
  "tools/repro/m1/m1-reviewed-proof.test.mjs",
  "tools/repro/pr39/genome-control/genesis-genome-positive-control.test.mjs",
  "tools/repro/pr39/e2/genesis-rich-life-e2-a0-candidate-driver.test.mjs",
  "tools/repro/pr39/e2/genesis-rich-life-e2-a0.test.mjs",
  "tools/repro/pr39/e2/genesis-rich-life-e2-a2.test.mjs",
  "tools/repro/pr39/e2/genesis-rich-life-e2-a2b-driver.test.mjs",
  "tools/repro/pr39/e2/genesis-rich-life-e2-a2b.test.mjs",
  "tools/repro/pr39/e2/genesis-rich-life-e2-h6-participation.test.mjs",
  "tools/repro/pr39/e2/genesis-rich-life-e2-h6-probe.test.mjs",
  "tools/repro/pr39/e2/genesis-rich-life-e2-n1-a0.test.mjs",
  "tools/repro/pr39/e2/genesis-rich-life-e2-n1-driver.test.mjs",
  "tools/repro/pr39/e2/genesis-rich-life-e2-n1.test.mjs",
  "tools/repro/pr39/e2/genesis-rich-life-e2-n2.test.mjs",
  "tools/repro/pr39/e2/genesis-rich-life-e2-protocol-clear-amendments.test.mjs",
  "tools/repro/pr39/e2/genesis-rich-life-e2-v1.test.mjs",
  "tools/repro/pr39/e2/genesis-rich-life-e2-v2-affordance-preflight.test.mjs",
  "tools/repro/pr39/e2/genesis-rich-life-e2-worlds.test.mjs",
  "tools/repro/guardian/semantic-guardian-v4-standing-gate-v4.test.mjs",
  "tools/repro/standing/standing-evidence-archive.test.mjs",
]);

const REPRO_PATH_SET = new Set(REPRO_TOOL_TEST_PATHS);

function normalized(path) {
  return path.split("\\").join("/");
}

function walkTests(directory) {
  const result = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walkTests(path));
    else if (entry.isFile() && entry.name.endsWith(".test.mjs")) result.push(path);
  }
  return result.sort();
}

function relativePathForLifecycle(path, root = DEFAULT_TEST_ROOT) {
  const absolute = resolve(path);
  const rootAbsolute = resolve(root);
  if (!absolute.startsWith(`${rootAbsolute}/`) && !absolute.startsWith(`${rootAbsolute}\\`)) {
    return normalized(path);
  }
  return normalized(relative(root, path));
}

export function testLifecycleForPath(path, root = DEFAULT_TEST_ROOT) {
  const relativePath = relativePathForLifecycle(path, root);
  return REPRO_PATH_SET.has(relativePath) ? "repro" : "active";
}

export function discoverTestSuites(root = DEFAULT_TEST_ROOT) {
  const domain = walkTests(join(root, "packages/domain/test"));
  const infra = walkTests(join(root, "packages/infra/test"));
  const assetGenerator = walkTests(join(root, "services/asset-generator/test"));
  const birthCenter = walkTests(join(root, "services/birth-center/test"));
  const presentationCloudflare = walkTests(join(root, "services/presentation-cloudflare/test"));
  const worldKernel = walkTests(join(root, "services/world-kernel/test"));
  const tools = walkTests(join(root, "tools"));
  const all = [...domain, ...infra, ...assetGenerator, ...birthCenter, ...presentationCloudflare, ...worldKernel, ...tools].sort();
  const allRelative = new Set(all.map((path) => normalized(relative(root, path))));
  const missingReproTests = REPRO_TOOL_TEST_PATHS.filter((path) => !allRelative.has(path));
  if (missingReproTests.length > 0) {
    throw new TypeError(`repro test manifest names missing files: ${missingReproTests.join(", ")}`);
  }

  const repro = all.filter((path) => testLifecycleForPath(path, root) === "repro");
  const active = all.filter((path) => testLifecycleForPath(path, root) === "active");
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
  return paths.map((path) => normalized(relative(root, path)));
}
