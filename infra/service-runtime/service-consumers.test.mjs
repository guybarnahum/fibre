import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const assetWorkerUrl = new URL("../../deployments/cloudflare/asset-generator/worker.mjs", import.meta.url);
const c2paServerUrl = new URL("../../services/c2pa-local/server.mjs", import.meta.url);

async function text(url) {
  return readFile(url, "utf8");
}

test("Asset Generator and C2PA share operational HTTP runtime without sharing service semantics", async () => {
  const [assetWorker, c2paServer] = await Promise.all([
    text(assetWorkerUrl),
    text(c2paServerUrl),
  ]);

  assert.match(assetWorker, /infra\/service-runtime\/service-runtime\.mjs/);
  assert.match(assetWorker, /createServiceRuntime/);
  assert.match(assetWorker, /serviceName:\s*"asset-generator"/);
  assert.match(assetWorker, /pathname === "\/healthz"/);
  assert.match(assetWorker, /new Response\("Not Found", \{ status: 404 \}\)/);
  assert.doesNotMatch(assetWorker, /pathname === "\/generate"/);

  assert.match(c2paServer, /infra\/service-runtime\/service-runtime\.mjs/);
  assert.match(c2paServer, /infra\/local\/node-service-runtime\.mjs/);
  assert.match(c2paServer, /FIBRE_C2PA_SERVICE_TOKEN/);
  assert.match(c2paServer, /SERVICE_TOKEN === null \? null : bearerAuth\(SERVICE_TOKEN\)/);
  assert.match(c2paServer, /path:\s*"\/embed"/);
  assert.match(c2paServer, /path:\s*"\/verify"/);
  assert.match(c2paServer, /trustPolicy:\s*"development_signature_only"/);
});
