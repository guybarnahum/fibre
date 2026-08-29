import { readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_TEST_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

// Replay tests are explicit current replay demonstrations that are intentionally
// kept outside the active suite. Historical experiment chronology belongs in
// Git history, not in this manifest.
export const REPLAY_TOOL_TEST_PATHS = Object.freeze([
  "tools/replays/m1/m1-demo-editor.test.mjs",
  "tools/replays/m1/m1-reviewed-proof.test.mjs",
]);

const REPLAY_PATH_SET = new Set(REPLAY_TOOL_TEST_PATHS);

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
  return REPLAY_PATH_SET.has(relativePath) ? "replay" : "active";
}

export function discoverTestSuites(root = DEFAULT_TEST_ROOT) {
  const domain = walkTests(join(root, "core/test"));
  const infra = walkTests(join(root, "infra/test"));
  const deployments = walkTests(join(root, "infra/deployments"));
  const assetGenerator = walkTests(join(root, "services/asset-generator/test"));
  const birthCenter = walkTests(join(root, "services/birth-center/test"));
  const threadPresentation = walkTests(join(root, "services/thread-presentation/test"));
  const worldKernel = walkTests(join(root, "services/world-kernel/test"));
  const tools = walkTests(join(root, "tools"));
  const all = [
    ...domain,
    ...infra,
    ...deployments,
    ...assetGenerator,
    ...birthCenter,
    ...threadPresentation,
    ...worldKernel,
    ...tools,
  ].sort();
  const allRelative = new Set(all.map((path) => normalized(relative(root, path))));
  const missingReplayTests = REPLAY_TOOL_TEST_PATHS.filter((path) => !allRelative.has(path));
  if (missingReplayTests.length > 0) {
    throw new TypeError(`replay test manifest names missing files: ${missingReplayTests.join(", ")}`);
  }

  const replay = all.filter((path) => testLifecycleForPath(path, root) === "replay");
  const active = all.filter((path) => testLifecycleForPath(path, root) === "active");
  return Object.freeze({
    active: Object.freeze(active),
    replay: Object.freeze(replay),
    all: Object.freeze(all),
    counts: Object.freeze({
      activeFiles: active.length,
      replayFiles: replay.length,
      allFiles: all.length,
    }),
  });
}

export function relativeTestPaths(paths, root = DEFAULT_TEST_ROOT) {
  return paths.map((path) => normalized(relative(root, path)));
}
