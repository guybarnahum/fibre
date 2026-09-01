import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildGenesisDevelopmentPlan } from "#services/birth-center/src/genesis-development-plan.mjs";
import {
  GENESIS_STAGING_EVIDENCE_VERSION,
  runGenesisDevelopmentE2E,
} from "./genesis-development-e2e.mjs";

const SOURCE_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SHA = "abcdef1234567890abcdef1234567890abcdef12";
const TOKEN = "staging-private-token-12345";
const FIN = "FIBRE-STAGING-TEST-001";

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function deploymentEvidence() {
  return {
    contract: "fibre-cloudflare-deployment-evidence-v1",
    environment: "staging",
    sourceGitSha: SHA,
    sourceTreeClean: true,
    recordedAt: "2026-09-01T00:00:00.000Z",
    deployments: [
      { serviceId: "asset-generator", baseUrl: "https://asset.example.workers.dev" },
      { serviceId: "thread-presentation", baseUrl: "https://api.staging.insidefibre.com" },
      { serviceId: "world-kernel", baseUrl: "https://world.example.workers.dev" },
      { serviceId: "birth-center", baseUrl: "https://birth.example.workers.dev" },
    ],
    externalViewerOrigin: "https://staging.insidefibre.com",
  };
}

function absentWorld(plan) {
  return {
    ok: true,
    inspection: {
      genesisId: plan.genesisId,
      threadId: plan.threadId,
      authoritativeThread: { exists: false, version: null, status: null, eventCount: 0, lastEventId: null },
      genesis: { manifestExists: false, threadPublished: false, manifestDigest: null, worldSpecId: null, worldSpecDigest: null, historicalEnvelopePlanDigest: null },
      symbolicGenomes: { count: 0, genomes: [] },
      civilRegistration: null,
      embodiment: { currentCount: 0, current: [] },
    },
  };
}

function liveWorld(plan) {
  return {
    ok: true,
    inspection: {
      genesisId: plan.genesisId,
      threadId: plan.threadId,
      authoritativeThread: { exists: true, version: 15, status: "frozen", eventCount: 15, lastEventId: `evt_last_${plan.threadId}` },
      genesis: {
        manifestExists: true,
        threadPublished: true,
        manifestDigest: `sha256:${"a".repeat(64)}`,
        worldSpecId: plan.worldSpec.worldSpecId,
        worldSpecDigest: plan.worldSpecDigest,
        historicalEnvelopePlanDigest: plan.envelopePlan.digest,
      },
      symbolicGenomes: {
        count: 1,
        genomes: [{ genomeId: plan.genome.header.genomeId, genomeDigest: plan.genomeDigest }],
      },
      civilRegistration: {
        registrationId: "registration_staging_test",
        fibreIdentityNumber: FIN,
        birthEventRef: `evt_seed_${plan.threadId}`,
        worldRef: plan.worldSpec.worldSpecId,
        registrationDigest: `sha256:${"b".repeat(64)}`,
      },
      embodiment: {
        currentCount: 1,
        current: [{
          embodimentId: "emb_staging_test",
          revision: 1,
          kind: "canonical_identity",
          representationKind: "synthetic_generation",
          visibility: "public",
          specificationDigest: `sha256:${"c".repeat(64)}`,
          referenceObjectRef: "asset_staging_canonical_root",
        }],
      },
    },
  };
}

function presentation(plan) {
  return {
    pointer: {
      threadId: plan.threadId,
      snapshotVersion: "visual-identity-staging-test",
      snapshotDigest: `sha256:${"d".repeat(64)}`,
      sequence: 3,
    },
    snapshot: {
      presentation: {
        manifest: {
          threadId: plan.threadId,
          lifecycleStatus: "active",
          fixture: false,
        },
        visualIdentity: {
          embodimentId: "emb_staging_test",
          embodimentRevision: 1,
          specificationDigest: `sha256:${"c".repeat(64)}`,
          referenceObjectRefs: ["asset_staging_canonical_root"],
        },
      },
    },
  };
}

test("staging Genesis E2E retains one exact-SHA 13-point cloud birth evidence record without secrets", async () => {
  const directory = mkdtempSync(resolve(tmpdir(), "fibre-genesis-staging-e2e-"));
  const deploymentPath = resolve(directory, "deployment.json");
  const evidenceRoot = resolve(directory, "evidence");
  writeFileSync(deploymentPath, JSON.stringify(deploymentEvidence()));

  let submitted = false;
  let plan = null;
  let postCount = 0;
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(input instanceof URL ? input : input.url ?? input);
    if (url.hostname === "birth.example.workers.dev") {
      if (url.pathname.endsWith("/inspection")) {
        if (!submitted) return json({ error: { code: "DEVELOPMENT_NOT_FOUND" } }, 404);
        const invocations = Array.from({ length: 20 }, (_, index) => ({
          clientRequestId: `${plan.freshModelRequestDomain}:fixture-${String(index + 1).padStart(2, "0")}`,
          provider: "openai",
          modelId: "gpt-5.1-2025-11-13",
          requestDigest: `sha256:${String(index % 10).repeat(64)}`,
          resultDigest: `sha256:${String((index + 1) % 10).repeat(64)}`,
          providerRequestId: `req_openai_staging_${index + 1}`,
          recordedAt: "2026-09-01T00:02:00.000Z",
        }));
        return json({
          ok: true,
          inspection: {
            requestId: plan.requestId,
            requestDigest: plan.requestDigest,
            planDigest: `sha256:${"e".repeat(64)}`,
            admissionDigest: `sha256:${"f".repeat(64)}`,
            genesisId: plan.genesisId,
            threadId: plan.threadId,
            requestStatus: "submitted",
            provisionalStatus: "published",
            invocationCount: invocations.length,
            invocations,
          },
        });
      }
      assert.equal(url.pathname, "/internal/births/develop");
      assert.equal(init.headers["x-fibre-private-token"], TOKEN);
      const body = JSON.parse(init.body);
      plan = buildGenesisDevelopmentPlan(body);
      submitted = true;
      postCount += 1;
      return json({
        ok: true,
        development: {
          serviceVersion: "fibre-genesis-development-service-v3",
          requestId: plan.requestId,
          requestDigest: plan.requestDigest,
          developmentPlanDigest: `sha256:${"e".repeat(64)}`,
          genesisId: plan.genesisId,
          threadId: plan.threadId,
          fibreIdentityNumber: FIN,
          status: "published",
          idempotent: postCount > 1,
          generated: postCount === 1,
        },
      });
    }

    if (url.hostname === "world.example.workers.dev") {
      assert.ok(plan, "World inspection should use the plan derived before submission");
      return json(submitted ? liveWorld(plan) : absentWorld(plan));
    }

    if (url.hostname === "api.staging.insidefibre.com") {
      assert.equal(init.headers?.Origin, "https://staging.insidefibre.com");
      if (url.pathname.endsWith("/snapshot")) {
        if (!submitted) return json({ error: "not_found" }, 404);
        return json(presentation(plan));
      }
      if (url.pathname === "/api/threads") {
        return json({
          threads: [{
            threadId: plan.threadId,
            lifecycleStatus: "active",
            snapshotVersion: "visual-identity-staging-test",
            snapshotDigest: `sha256:${"d".repeat(64)}`,
          }],
          nextCursor: null,
        });
      }
      if (url.pathname === "/api/assets/asset_staging_canonical_root") {
        return new Response(new Uint8Array([1, 2, 3, 4]), {
          status: 200,
          headers: {
            "content-type": "image/png",
            etag: `\"sha256:${"9".repeat(64)}\"`,
            "x-fibre-provenance": "c2pa_verified",
          },
        });
      }
    }

    if (url.hostname === "staging.insidefibre.com") {
      return new Response("<!doctype html><title>Fibre</title>", { status: 200 });
    }
    throw new Error(`unexpected staging fixture URL ${url}`);
  };

  const result = await runGenesisDevelopmentE2E({
    mode: "staging",
    repoRoot: SOURCE_ROOT,
    environment: {
      FIBRE_PRIVATE_TOKEN: TOKEN,
      FIBRE_GENESIS_REQUEST_ID: "genesis-staging-e2e-test-001",
      FIBRE_GENESIS_REQUESTED_AT: "2026-09-01T00:01:00.000Z",
      FIBRE_GENESIS_E2E_SLOT: "1",
      FIBRE_GENESIS_E2E_REQUEST_TIMEOUT_MS: "5000",
      FIBRE_GENESIS_E2E_PUBLISH_WAIT_MS: "5000",
      FIBRE_GENESIS_E2E_CONVERGENCE_WAIT_MS: "5000",
      FIBRE_GENESIS_E2E_POLL_MS: "1",
      FIBRE_CLOUDFLARE_DEPLOYMENT_RECORD: deploymentPath,
      FIBRE_GENESIS_E2E_EVIDENCE_ROOT: evidenceRoot,
    },
    fetchImpl,
    sleep: async () => {},
    emit: () => {},
    sourceResolver: () => ({ gitSha: SHA, workingTreeClean: true }),
  });

  assert.equal(result.evidence.contract, GENESIS_STAGING_EVIDENCE_VERSION);
  assert.equal(result.evidence.sourceGitSha, SHA);
  assert.equal(result.evidence.request.developmentPlanThreadId, plan.threadId);
  assert.equal(result.evidence.birthCenter.providerCalls.length, 20);
  assert.equal(result.evidence.world.authoritativeThread.exists, true);
  assert.equal(result.evidence.presentation.pointer.threadId, plan.threadId);
  assert.equal(result.evidence.viewer.reachable, true);
  assert.equal(result.evidence.runtimeParticipation.localFibreRuntimeParticipated, false);
  assert.equal(result.evidence.closureAssertions.length, 13);
  assert.ok(result.evidence.closureAssertions.every((entry) => entry.passed === true));

  const retained = JSON.parse(readFileSync(result.evidencePath, "utf8"));
  assert.equal(retained.sourceGitSha, SHA);
  assert.equal(retained.presentation.canonicalPublicAsset.objectRef, "asset_staging_canonical_root");
  const serialized = JSON.stringify(retained);
  assert.equal(serialized.includes(TOKEN), false);
  assert.equal(serialized.includes("OPENAI_API_KEY"), false);
});
