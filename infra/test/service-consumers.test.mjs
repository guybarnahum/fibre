import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../../", import.meta.url);
const HOSTS = Object.freeze({
  assetGenerator: new URL("deployments/cloudflare/asset-generator/worker.mjs", ROOT),
  threadPresentation: new URL("deployments/cloudflare/thread-presentation/worker.mjs", ROOT),
  c2pa: new URL("services/c2pa-local/server.mjs", ROOT),
  birthCenter: new URL("services/birth-center/src/server.mjs", ROOT),
  worldKernel: new URL("services/world-kernel/src/server.mjs", ROOT),
});

async function text(url) {
  return readFile(url, "utf8");
}

test("all runtime service hosts use the root Infra service seam", async () => {
  const entries = await Promise.all(Object.entries(HOSTS).map(async ([name, url]) => [name, await text(url)]));
  for (const [name, source] of entries) {
    assert.equal(source.includes("#infra/service"), true, `${name} must use the shared Infra service seam`);
    assert.equal(source.includes("infra/service-runtime"), false, `${name} must not use the removed service-runtime directory`);
    assert.equal(source.includes("packages/infra"), false, `${name} must not use package-style Infra`);
    assert.equal(source.includes("infra/src"), false, `${name} must not use an Infra src directory`);
  }
});

test("local HTTP service hosts use the local provider adapter", async () => {
  for (const [name, url] of Object.entries({ c2pa: HOSTS.c2pa, birthCenter: HOSTS.birthCenter, worldKernel: HOSTS.worldKernel })) {
    const source = await text(url);
    assert.equal(source.includes("#infra/providers/local/service"), true, `${name} must use the local service provider`);
  }
});

test("Cloudflare service hosts use Cloudflare providers and keep paid generation private", async () => {
  const assetWorker = await text(HOSTS.assetGenerator);
  const presentationWorker = await text(HOSTS.threadPresentation);

  assert.equal(assetWorker.includes("#infra/providers/cloudflare"), true);
  assert.equal(presentationWorker.includes("#infra/providers/cloudflare"), true);
  assert.doesNotMatch(assetWorker, /pathname\s*===\s*"\/generate"/);
  assert.doesNotMatch(assetWorker, /path:\s*"\/generate"/);
  assert.match(assetWorker, /serviceName:\s*"asset-generator"/);
  assert.match(presentationWorker, /serviceName:\s*"thread-presentation"/);
});

test("C2PA keeps embed and verify semantics behind optional local service auth", async () => {
  const source = await text(HOSTS.c2pa);
  assert.equal(source.includes("FIBRE_C2PA_SERVICE_TOKEN"), true);
  assert.equal(source.includes("SERVICE_TOKEN === null ? null : bearerAuth(SERVICE_TOKEN)"), true);
  assert.equal(source.includes('path: "/embed"'), true);
  assert.equal(source.includes('path: "/verify"'), true);
  assert.equal(source.includes('trustPolicy: "development_signature_only"'), true);
});
