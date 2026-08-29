import assert from "node:assert/strict";
import test from "node:test";

import {
  PRIVATE_SERVICE_MIGRATION_EDGES,
  privateServiceEdgesForSource,
  runtimeDependencyViolationsForSource,
  validateRuntimeDependencyPolicy,
} from "./runtime-dependency-policy.mjs";

function fakeImport(specifier, { kind = "static" } = {}) {
  if (kind === "dynamic") return `const module = await ${"im" + "port"}("${specifier}");\n`;
  return `${"im" + "port"} { Example } from "${specifier}";\n`;
}

function fakeExport(specifier) {
  return `${"ex" + "port"} { Example } from "${specifier}";\n`;
}

test("current runtime has no unregistered private cross-owner dependencies", () => {
  assert.deepEqual(validateRuntimeDependencyPolicy(), []);
});

test("current private sibling-service dependencies are exact migration debt", () => {
  assert.deepEqual(PRIVATE_SERVICE_MIGRATION_EDGES, [
    "services/thread-presentation/src/civil-identity-projection.mjs::#services/world-kernel/src/thread-presentation-identity-domain.mjs",
    "services/thread-presentation/src/index.mjs::../../world-kernel/src/thread-presentation-domain.mjs",
    "services/thread-presentation/src/index.mjs::../../world-kernel/src/thread-presentation-identity-domain.mjs",
    "services/world-kernel/src/presentation-asset-completion-service.mjs::#services/asset-generator/src/index.mjs",
    "services/world-kernel/src/presentation-asset-demand-service.mjs::#services/asset-generator/src/index.mjs",
    "services/world-kernel/src/presentation-asset-demand.mjs::#services/asset-generator/src/index.mjs",
    "services/world-kernel/src/thread-presentation-asset-planner.mjs::#services/asset-generator/src/index.mjs",
    "services/world-kernel/src/thread-presentation-asset-publisher.mjs::#services/asset-generator/src/index.mjs",
  ]);
});

test("new relative imports cannot reach into another service private source tree", () => {
  const specifier = ["..", "..", "world-kernel", "src", "world-store.mjs"].join("/");
  assert.deepEqual(
    runtimeDependencyViolationsForSource(
      "services/future-social/src/runtime.mjs",
      fakeImport(specifier),
    ),
    [
      `Runtime dependency boundary: services/future-social/src/runtime.mjs reaches into world-kernel through private cross-owner specifier ${specifier}; use a stable public @fibre/... boundary`,
    ],
  );
});

test("new repository aliases cannot expose another service private source tree", () => {
  const specifier = ["#services", "world-kernel", "src", "world-store.mjs"].join("/");
  assert.deepEqual(
    runtimeDependencyViolationsForSource(
      "services/future-social/src/runtime.mjs",
      fakeExport(specifier),
    ),
    [
      `Runtime dependency boundary: services/future-social/src/runtime.mjs reaches into world-kernel through private cross-owner specifier ${specifier}; use a stable public @fibre/... boundary`,
    ],
  );
});

test("private Infra aliases cannot bypass the @fibre/infra public seam", () => {
  const specifier = ["#packages", "infra", "src", "infra-driver.mjs"].join("/");
  assert.deepEqual(
    runtimeDependencyViolationsForSource(
      "services/example/src/runtime.mjs",
      fakeImport(specifier),
    ),
    [
      `Runtime dependency boundary: services/example/src/runtime.mjs reaches into private Infra source through ${specifier}; use a public @fibre/infra export`,
    ],
  );
});

test("deployment composition cannot reach Infra through relative private source paths", () => {
  const specifier = ["..", "..", "..", "packages", "infra", "src", "cloudflare-v1.mjs"].join("/");
  assert.deepEqual(
    runtimeDependencyViolationsForSource(
      "deployments/cloudflare/example/worker.mjs",
      fakeImport(specifier),
    ),
    [
      `Runtime dependency boundary: deployments/cloudflare/example/worker.mjs reaches into private Infra source through ${specifier}; use a public @fibre/infra export`,
    ],
  );
});

test("same-owner imports and stable named package boundaries remain legal", () => {
  const source = [
    fakeImport("../shared/local-thing.mjs").trimEnd(),
    fakeImport("@fibre/domain/civil-identity").trimEnd(),
    fakeImport("@fibre/asset-generator").trimEnd(),
    fakeImport("@fibre/infra").trimEnd(),
    fakeImport("@fibre/infra/cloudflare-v1").trimEnd(),
  ].join("\n");
  assert.deepEqual(privateServiceEdgesForSource("services/example/src/runtime.mjs", source), []);
  assert.deepEqual(runtimeDependencyViolationsForSource("services/example/src/runtime.mjs", source), []);
  assert.deepEqual(
    runtimeDependencyViolationsForSource(
      "deployments/cloudflare/example/worker.mjs",
      fakeImport("@fibre/infra/cloudflare-v1"),
    ),
    [],
  );
});

test("dynamic imports are subject to the same ownership boundary", () => {
  const specifier = ["..", "..", "world-kernel", "src", "world-store.mjs"].join("/");
  assert.deepEqual(
    runtimeDependencyViolationsForSource(
      "services/example/src/runtime.mjs",
      fakeImport(specifier, { kind: "dynamic" }),
    ),
    [
      `Runtime dependency boundary: services/example/src/runtime.mjs reaches into world-kernel through private cross-owner specifier ${specifier}; use a stable public @fibre/... boundary`,
    ],
  );
});

test("runtime tests are not production dependency-policy targets", () => {
  const serviceSpecifier = ["..", "..", "world-kernel", "src", "world-store.mjs"].join("/");
  assert.deepEqual(
    runtimeDependencyViolationsForSource(
      "services/example/test/integration.test.mjs",
      fakeImport(serviceSpecifier),
    ),
    [],
  );

  const infraSpecifier = ["..", "..", "..", "packages", "infra", "src", "cloudflare-v1.mjs"].join("/");
  assert.deepEqual(
    runtimeDependencyViolationsForSource(
      "deployments/cloudflare/example/test/worker.test.mjs",
      fakeImport(infraSpecifier),
    ),
    [],
  );
});

test("registered migration debt is allowed only at its exact source edge", () => {
  const registeredSpecifier = ["..", "..", "world-kernel", "src", "thread-presentation-domain.mjs"].join("/");
  assert.deepEqual(
    runtimeDependencyViolationsForSource(
      "services/thread-presentation/src/index.mjs",
      fakeExport(registeredSpecifier),
    ),
    [],
  );
  assert.equal(
    runtimeDependencyViolationsForSource(
      "services/thread-presentation/src/civil-identity-projection.mjs",
      fakeImport(registeredSpecifier),
    ).length,
    1,
  );
});

test("removed Birth Center HTTP reach-through cannot be reintroduced", () => {
  const removedSpecifier = ["..", "..", "world-kernel", "src", "http-server.mjs"].join("/");
  assert.equal(
    runtimeDependencyViolationsForSource(
      "services/birth-center/src/server.mjs",
      fakeImport(removedSpecifier),
    ).length,
    1,
  );
});

test("removed Birth Center durable invocation reach-through cannot be reintroduced", () => {
  const removedSpecifier = ["..", "..", "world-kernel", "src", "model-runtime", "durable-invocation-journal.mjs"].join("/");
  assert.equal(
    runtimeDependencyViolationsForSource(
      "services/birth-center/src/runtime.mjs",
      fakeImport(removedSpecifier),
    ).length,
    1,
  );
});
