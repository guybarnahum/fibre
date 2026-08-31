import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createHttpContentCredentialSigner } from "../../../integrations/content-credentials/c2pa-http-signer.mjs";
import { AssetGenerationError } from "../src/asset-generation-error.mjs";
import {
  parseDeploymentManifest,
  resolveServiceDeployment,
} from "../../../infra/deployments/manifest.mjs";

const encoder = new TextEncoder();
const productionSignerId = "fibre-c2pa-production-v1";

function response({ status = 200, payload, headers = {} }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get(name) { return headers[name.toLowerCase()] ?? null; } },
    async json() { return payload; },
  };
}

function assertion() {
  return {
    schemaVersion: "fibre-embedded-asset-provenance-v0.1",
    provenanceClass: "generated_reconstruction",
    assetKind: "image",
    role: "place",
    variant: "default",
    generationRecordDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    semanticBriefDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    providerRequestDigest: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    providerOutputDigest: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    provider: "openai",
    model: "gpt-image-2-2026-04-21",
    generatedAt: "2026-08-29T00:00:00Z",
    promptDisclosure: { mode: "digest_only", authorizationRef: null, semanticBrief: null, providerRequest: null },
  };
}

function validVerification(overrides = {}) {
  return {
    valid: true,
    format: "c2pa",
    signerId: productionSignerId,
    manifestDigest: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    assertion: assertion(),
    verifiedAt: "2026-08-29T00:00:02Z",
    failureReason: null,
    trust: { policy: "c2pa_trust_list", trusted: true },
    ...overrides,
  };
}

test("production HTTP C2PA signer requires HTTPS and an authorization token", () => {
  assert.throws(
    () => createHttpContentCredentialSigner({ baseUrl: "http://signer.example.test", signerId: productionSignerId, trustPolicy: "c2pa_trust_list", authorizationToken: "secret" }),
    /must use https/,
  );
  assert.throws(
    () => createHttpContentCredentialSigner({ baseUrl: "https://signer.example.test", signerId: productionSignerId, trustPolicy: "c2pa_trust_list" }),
    /requires an authorization token/,
  );
});

test("production HTTP C2PA signer authenticates requests and accepts only explicit trust-list verification", async () => {
  const calls = [];
  const signer = createHttpContentCredentialSigner({
    baseUrl: "https://signer.example.test/",
    signerId: productionSignerId,
    trustPolicy: "c2pa_trust_list",
    authorizationToken: "signer-secret",
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith("/embed")) {
        return response({ payload: { bytesBase64: btoa("credentialed"), format: "c2pa", signerId: productionSignerId, manifestDigest: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", embeddedAt: "2026-08-29T00:00:01Z" } });
      }
      return response({ payload: validVerification() });
    },
  });

  assert.equal(signer.trustPolicy, "c2pa_trust_list");
  const embedded = await signer.embed({ bytes: encoder.encode("raw"), mediaType: "image/png", assertion: assertion() });
  const verification = await signer.verify({ bytes: embedded.bytes, mediaType: "image/png" });
  assert.equal(verification.valid, true);
  assert.equal(verification.signerId, productionSignerId);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.headers.Authorization, "Bearer signer-secret");
  assert.equal(calls[1].init.headers.Authorization, "Bearer signer-secret");
  assert.equal(JSON.stringify(calls[0].init.body).includes("signer-secret"), false);
  assert.equal("trust" in verification, false);
});

test("valid signature from an untrusted C2PA signer fails closed and is terminal", async () => {
  const signer = createHttpContentCredentialSigner({
    baseUrl: "https://signer.example.test",
    signerId: productionSignerId,
    trustPolicy: "c2pa_trust_list",
    authorizationToken: "signer-secret",
    fetchImpl: async () => response({ payload: validVerification({ trust: { policy: "c2pa_trust_list", trusted: false } }) }),
  });
  await assert.rejects(
    () => signer.verify({ bytes: encoder.encode("credentialed"), mediaType: "image/png" }),
    (error) => error instanceof AssetGenerationError
      && error.phase === "credential_verification"
      && error.category === "authentication"
      && error.retryable === false
      && /not trusted by the C2PA Trust List/.test(error.safeDetail),
  );
});

test("production verifier must return trust evidence and the configured signer identity", async () => {
  const missingTrust = createHttpContentCredentialSigner({
    baseUrl: "https://signer.example.test",
    signerId: productionSignerId,
    trustPolicy: "c2pa_trust_list",
    authorizationToken: "signer-secret",
    fetchImpl: async () => response({ payload: { ...validVerification(), trust: undefined } }),
  });
  await assert.rejects(() => missingTrust.verify({ bytes: encoder.encode("credentialed"), mediaType: "image/png" }), /did not return C2PA trust-list evidence/);

  const wrongSigner = createHttpContentCredentialSigner({
    baseUrl: "https://signer.example.test",
    signerId: productionSignerId,
    trustPolicy: "c2pa_trust_list",
    authorizationToken: "signer-secret",
    fetchImpl: async () => response({ payload: validVerification({ signerId: "other-signer" }) }),
  });
  await assert.rejects(() => wrongSigner.verify({ bytes: encoder.encode("credentialed"), mediaType: "image/png" }), /unexpected signerId other-signer/);
});

async function json(url) { return JSON.parse(await readFile(url, "utf8")); }
async function deployment(url) { return parseDeploymentManifest(await readFile(url, "utf8")); }

test("Cloudflare deployment separates development signature proof from production C2PA trust", async () => {
  const assetLocal = await json(new URL("../../../infra/deployments/asset-generator/cloudflare/wrangler.local.jsonc", import.meta.url));
  const assetRemote = await json(new URL("../../../infra/deployments/asset-generator/cloudflare/wrangler.jsonc", import.meta.url));
  const presentationLocal = await json(new URL("../../../infra/deployments/thread-presentation/cloudflare/wrangler.local.jsonc", import.meta.url));
  const presentationRemote = await json(new URL("../../../infra/deployments/thread-presentation/cloudflare/wrangler.jsonc", import.meta.url));
  const localManifest = await deployment(new URL("../../../infra/deployments/environments/local.yaml", import.meta.url));
  const remoteManifest = await deployment(new URL("../../../infra/deployments/environments/cloudflare.yaml", import.meta.url));
  const assetWorker = await readFile(new URL("../../../infra/deployments/asset-generator/cloudflare/worker.mjs", import.meta.url), "utf8");
  const presentationWorker = await readFile(new URL("../../../infra/deployments/thread-presentation/cloudflare/worker.mjs", import.meta.url), "utf8");

  for (const config of [assetLocal, presentationLocal]) {
    assert.equal(config.vars.C2PA_SIGNER_ID, "fibre-c2pa-node-local-v1");
    assert.equal(config.vars.C2PA_TRUST_POLICY, "development_signature_only");
    assert.equal(config.vars.FIBRE_DEPLOYMENT_ENV, "local");
  }
  for (const config of [assetRemote, presentationRemote]) {
    assert.equal(config.vars.C2PA_SIGNER_ID, productionSignerId);
    assert.equal(config.vars.C2PA_TRUST_POLICY, "c2pa_trust_list");
    assert.equal(config.vars.FIBRE_DEPLOYMENT_ENV, "cloudflare");
    assert.ok(!config.secrets.required.includes("C2PA_SIGNER_URL"));
    assert.ok(config.secrets.required.includes("C2PA_SIGNER_TOKEN"));
  }

  const localAsset = resolveServiceDeployment(localManifest, "asset-generator");
  const localPresentation = resolveServiceDeployment(localManifest, "thread-presentation");
  const remoteAsset = resolveServiceDeployment(remoteManifest, "asset-generator");
  const remotePresentation = resolveServiceDeployment(remoteManifest, "thread-presentation");
  for (const selected of [localAsset.integrations.contentCredentials, localPresentation.integrations.contentCredentials]) {
    assert.equal(selected.provider, "c2pa-http");
    assert.equal(selected.environment.trustPolicy, "C2PA_TRUST_POLICY");
  }
  for (const selected of [remoteAsset.integrations.contentCredentials, remotePresentation.integrations.contentCredentials]) {
    assert.equal(selected.provider, "c2pa-http");
    assert.equal(selected.environment.authorizationToken, "C2PA_SIGNER_TOKEN");
  }

  for (const worker of [assetWorker, presentationWorker]) {
    assert.match(worker, /integration-selection\.mjs/);
    assert.match(worker, /selectContentCredentialIntegration/);
    assert.doesNotMatch(worker, /#integrations\/content-credentials\/c2pa-http-signer\.mjs/);
    assert.doesNotMatch(worker, /fibre-c2pa-node-local-v1/);
  }
});
