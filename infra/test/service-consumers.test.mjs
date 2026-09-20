import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../../", import.meta.url);
const HOSTS = Object.freeze({
  assetGenerator: new URL("infra/deployments/asset-generator/cloudflare/worker.mjs", ROOT),
  threadPresentation: new URL("infra/deployments/thread-presentation/cloudflare/worker.mjs", ROOT),
  birthCenter: new URL("infra/deployments/birth-center/local/server.mjs", ROOT),
  worldKernel: new URL("infra/deployments/world-kernel/local/server.mjs", ROOT),
});

async function text(url) {
  return readFile(url, "utf8");
}

function sourceIncludes(source, needle, message) {
  assert.equal(source.includes(needle), true, message);
}

function sourceExcludes(source, needle, message) {
  assert.equal(source.includes(needle), false, message);
}

function sourceMatches(source, pattern, message) {
  assert.equal(pattern.test(source), true, message);
}

function sourceDoesNotMatch(source, pattern, message) {
  assert.equal(pattern.test(source), false, message);
}

test("service HTTP semantics use the root Infra service seam while deployment hosts own provider selection", async () => {
  const entries = await Promise.all(Object.entries(HOSTS).map(async ([name, url]) => [name, await text(url)]));
  for (const [name, source] of entries) {
    sourceExcludes(source, "infra/service-runtime", `${name} must not use the removed service-runtime directory`);
    sourceExcludes(source, "packages/infra", `${name} must not use package-style Infra`);
    sourceExcludes(source, "infra/src", `${name} must not use an Infra src directory`);
  }
});

test("local executable service hosts use the local provider adapter", async () => {
  for (const [name, url] of Object.entries({
    birthCenter: HOSTS.birthCenter,
    worldKernel: HOSTS.worldKernel,
  })) {
    const source = await text(url);
    sourceIncludes(source, "#infra/providers/local/service", `${name} must use the local service provider`);
  }
});

test("Cloudflare service hosts use Cloudflare providers and keep paid generation private", async () => {
  const assetWorker = await text(HOSTS.assetGenerator);
  const presentationWorker = await text(HOSTS.threadPresentation);

  sourceIncludes(assetWorker, "#infra/providers/cloudflare", "asset-generator Cloudflare host must use the Cloudflare provider");
  sourceIncludes(presentationWorker, "#infra/providers/cloudflare", "thread-presentation Cloudflare host must use the Cloudflare provider");
  sourceDoesNotMatch(assetWorker, /pathname\s*===\s*"\/generate"/, "asset-generator must not expose a public /generate route");
  sourceDoesNotMatch(assetWorker, /path:\s*"\/generate"/, "asset-generator service routes must not include /generate");
  sourceMatches(assetWorker, /serviceName:\s*"asset-generator"/, "asset-generator host must expose the asset-generator service identity");
  sourceMatches(presentationWorker, /serviceName:\s*"thread-presentation"/, "thread-presentation host must expose the thread-presentation service identity");
});
