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
    assert.match(source, /#infra\/service/, `${name} must use the shared Infra service seam`);
    assert.doesNotMatch(source, /infra\/service-runtime/, `${name} must not use the removed service-runtime directory`);
    assert.doesNotMatch(source, /packages\/infra/, `${name} must not use package-style Infra`);
    assert.doesNotMatch(source, /infra\/src/, `${name} must not use an Infra src directory`);
  }
});

test("local HTTP service hosts use the local provider adapter", async () => {
  for (const [name, url] of Object.entries({ c2pa: HOSTS.c2pa, birthCenter: HOSTS.birthCenter, worldKernel: HOSTS.worldKernel })) {
    const source = await text(url);
    assert.match(source, /#infra\/providers\/local\/service/, `${name} must use the local service provider`);
  }
});

test("Cloudflare service hosts use Cloudflare providers and keep paid generation private", async () => {
  const assetWorker = await text(HOSTS.assetGenerator);
  const presentationWorker = await text(HOSTS.threadPresentation);

  assert.match(assetWorker, /#infra\/providers\/cloudflare/);
  assert.match(presentationWorker, /#infra\/providers\/cloudflare/);
  assert.doesNotMatch(assetWorker, /pathname\s*===\s*"\/generate"/);
  assert.doesNotMatch(assetWorker, /path:\s*"\/generate"/);
  assert.match(assetWorker, /serviceName:\s*"asset-generator"/);
  assert.match(presentationWorker, /serviceName:\s*"thread-presentation"/);
});

test("C2PA keeps embed and verify semantics behind optional local service auth", async () => {
  const source = await text(HOSTS.c2pa);
  assert.match(source, /FIBRE_C2PA_SERVICE_TOKEN/);
  assert.match(source, /SERVICE_TOKEN === null \? null : bearerAuth\(SERVICE_TOKEN\)/);
  assert.match(source, /path:\s*"\/embed"/);
  assert.match(source, /path:\s*"\/verify"/);
  assert.match(source, /trustPolicy:\s*"development_signature_only"/);
});
