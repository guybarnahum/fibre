import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { STORED_ASSET_RECEIPT_VERSION } from "#services/asset-generator/src/index.mjs";
import {
  GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY,
  attachGenesisCanonicalVisualIdentity,
} from "#services/world-kernel/src/genesis-canonical-visual-identity.mjs";
import { publicationValidatorSetWitness } from "#services/world-kernel/src/genesis-domain.mjs";
import { attachTestCivilRegistration } from "#services/world-kernel/test/support/civil-registration-fixture.mjs";
import { createWorldCloudflareRuntime } from "../runtime.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const THREAD_ID = "thr_slice_c_cloud_recovery_001";
const PRIVATE_TOKEN = "slice-c-cloud-private-token";
const sha = (char) => `sha256:${char.repeat(64)}`;

function cursor(rows = [], rowsWritten = 0) {
  return {
    rowsWritten,
    toArray() { return rows.map((row) => Object.fromEntries(Object.entries(row))); },
  };
}

function durableStorage() {
  const database = new DatabaseSync(":memory:");
  let transactionActive = false;
  let alarm = null;
  return {
    sql: {
      exec(sql, ...bindings) {
        const normalized = sql.trim();
        if (bindings.length === 0 && /;\s*(?:\S|$)/u.test(normalized.replace(/;\s*$/u, ""))) {
          database.exec(sql);
          return cursor();
        }
        if (bindings.length === 0 && /^(?:CREATE|ALTER|DROP)\b/iu.test(normalized)) {
          database.exec(sql);
          return cursor();
        }
        const statement = database.prepare(sql);
        if (/^(?:SELECT|WITH|EXPLAIN|PRAGMA)\b/iu.test(normalized)) {
          return cursor(statement.all(...bindings));
        }
        const result = statement.run(...bindings);
        return cursor([], Number(result.changes ?? 0));
      },
    },
    transactionSync(callback) {
      if (transactionActive) throw new Error("nested Durable Object transaction");
      database.exec("BEGIN IMMEDIATE");
      transactionActive = true;
      try {
        const result = callback();
        database.exec("COMMIT");
        transactionActive = false;
        return result;
      } catch (error) {
        database.exec("ROLLBACK");
        transactionActive = false;
        throw error;
      }
    },
    getAlarm() { return alarm; },
    setAlarm(value) { alarm = value; },
    deleteAlarm() { alarm = null; },
    closeDatabase() { database.close(); },
  };
}

function worldSpec() {
  return {
    worldSpecId: "world_slice_c_cloud_recovery_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-31T18:30:00Z" },
    places: [{ placeId: "place_slice_c_cloud", description: "A bounded ordinary city context." }],
    householdShape: "One ordinary household.",
    familyRelations: ["Household members share ordinary routines."],
    languages: ["English"],
    materialCircumstances: "Stable housing and ordinary public services.",
    mobilityPattern: "Walking and public transit.",
    schoolingOrCommunityContext: "Public schools and community institutions.",
    culturalContext: "Mixed neighborhood institutions.",
    availableInstitutions: ["public_school", "public_library"],
    intellectualEnvironment: "Books and ordinary discussion are available.",
    affordedRoles: ["caregiver", "peer", "teacher"],
    worldAuthorship: {
      authorId: "human_slice_c",
      sourcesConsulted: [],
      abstractionMethod: "Synthetic Slice-C cloud recovery fixture.",
      relocationWitness: "No source biography is used as Thread history.",
      familiarityProbe: null,
      createdAt: "2026-08-31T18:20:00Z",
    },
    createdAt: "2026-08-31T18:20:00Z",
  };
}

function cognition() {
  const surface = (char) => ({
    provider: "fixture",
    modelId: "fixture-model-v1",
    promptHash: sha(char),
    schemaHash: sha(char === "a" ? "b" : char),
    sampling: { temperature: 0.4, seed: 41 },
  });
  return {
    passA: surface("a"),
    passB: surface("c"),
    passC: surface("d"),
    recordRepair: surface("e"),
    policyVersion: "genesis-v1",
    eventStructurePoolDigest: sha("f"),
    publicationValidatorSetWitness: publicationValidatorSetWitness(),
  };
}

function birth() {
  const thread = structuredClone(mina);
  thread.threadId = THREAD_ID;
  thread.status = "active";
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-08-31T18:21:00Z",
    createdBy: "fibre.genesis",
    lastEventId: `evt_seed_${THREAD_ID}`,
  };
  const visualBundle = attachGenesisCanonicalVisualIdentity({
    manifest: {
      genesisId: `gen_${THREAD_ID}`,
      threadId: THREAD_ID,
      originMode: "de_novo",
      entry: {
        stage: "young_adult",
        ageAtEntry: 22,
        chronologyEndsAt: "2026-08-31T18:19:00Z",
        justification: "Slice-C cloud recovery fixture.",
        policyRef: "entry-policy-v1",
      },
      worldSpecRef: worldSpec().worldSpecId,
      sourceBundleRefs: [],
      parentOrAncestorRefs: [],
      genomeRef: null,
      cognition: cognition(),
      publication: {
        status: "published",
        publishedAt: "2026-08-31T18:23:00Z",
        resultingThreadVersion: thread.version,
      },
      createdAt: "2026-08-31T18:20:30Z",
    },
    thread,
  }, {
    policyRef: GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY,
    specification: {
      subject: {
        partyId: THREAD_ID,
        description: "A person with stable ordinary facial landmarks, visible skin texture, dark eyes, wavy dark hair, and a small diagonal scar above the outer left eyebrow; preserve these identity cues across renderings.",
      },
      method: "canonical synthetic portrait specification",
      description: "Head-and-shoulders, frontal, neutral expression, ordinary perspective and even daylight-balanced illumination.",
      model: "replaceable-renderer",
    },
  });
  return attachTestCivilRegistration(visualBundle);
}

function readyRoot(job) {
  const receipt = {
    receiptVersion: STORED_ASSET_RECEIPT_VERSION,
    jobId: job.jobId,
    status: "ready",
    assetKind: job.assetKind,
    role: job.role,
    variant: job.variant,
    objectRef: job.outputObjectRef,
    sha256: sha("1"),
    mediaType: "image/webp",
    width: 1024,
    height: 1024,
    durationMs: null,
    completedAt: "2026-08-31T18:24:00Z",
    generationRecordObjectRef: "generation_record_slice_c_cloud_001",
    generationRecordDigest: sha("2"),
    providerOutputDigest: sha("3"),
    credential: {
      format: "fixture-content-credential",
      signerId: "fixture-signer",
      manifestDigest: sha("4"),
      embeddedAt: "2026-08-31T18:23:58Z",
      verifiedAt: "2026-08-31T18:23:59Z",
    },
    inputReferences: job.inputReferences,
    context: job.context,
  };
  return {
    state: "ready",
    proof: { receipt, generationRecord: { job }, verification: { valid: true } },
    recordedAt: "2026-08-31T18:24:01Z",
  };
}

function serviceEnvironment(calls) {
  return {
    FIBRE_PRIVATE_TOKEN: PRIVATE_TOKEN,
    FIBRE_WORLD_RECONCILIATION_MS: "1000",
    ASSET_GENERATOR: {
      async fetch(request) {
        calls.root += 1;
        const body = await request.json();
        return Response.json({ ok: true, result: readyRoot(body.job) });
      },
    },
    THREAD_PRESENTATION: {
      async fetch(request) {
        const pathname = new URL(request.url).pathname;
        if (pathname === "/internal/genesis/presentations") {
          calls.genesisPresentation += 1;
          return Response.json({ ok: true, reused: false });
        }
        if (pathname === "/internal/visual-publication/reconcile") {
          calls.visualPresentation += 1;
          calls.visualRequests.push(await request.json());
          return Response.json({
            ok: true,
            result: { complete: true, stage: "complete", detail: { demandId: "demand_slice_c_cloud_001" } },
          });
        }
        return Response.json({ error: "not_found" }, { status: 404 });
      },
    },
  };
}

test("Cloudflare World restart resumes the durable wake without duplicate semantic admission", async () => {
  const storage = durableStorage();
  const calls = { root: 0, genesisPresentation: 0, visualPresentation: 0, visualRequests: [] };
  const env = serviceEnvironment(calls);
  let clock = 10_000;
  const nowMs = () => clock;
  const now = () => "2026-08-31T18:25:00Z";

  let first = createWorldCloudflareRuntime({ storage, env, now, nowMs });
  first.genesisStore.recordWorldSpec(worldSpec());
  const published = await first.birthPublisher.publishBirth(birth());
  assert.equal(published.thread.threadId, THREAD_ID);
  assert.equal(await first.infraDriver.scheduler.get("world"), 10_000);
  assert.equal(calls.root, 0, "birth schedules durable reconciliation instead of relying on process lifetime");
  await first.close();
  first = null;

  clock = 20_000;
  let recovered = createWorldCloudflareRuntime({ storage, env, now, nowMs });
  const wake = await recovered.reconciliationRuntime.handleWake();
  assert.equal(wake.skipped, false);
  assert.equal(calls.genesisPresentation, 1);
  assert.equal(calls.root, 1);
  assert.equal(calls.visualPresentation, 1);
  const firstDemandId = wake.visualPublication.result.results[0].reconciliation.demandId;
  assert.equal(firstDemandId, "demand_slice_c_cloud_001");
  const embodiments = recovered.embodimentStore.listCurrent(THREAD_ID);
  assert.equal(embodiments.length, 1);
  assert.equal(embodiments[0].status, "available");
  assert.equal(recovered.embodimentStore.history(THREAD_ID, embodiments[0].embodimentId).length, 2);
  assert.equal(await recovered.infraDriver.scheduler.get("world"), 21_000);
  await recovered.close();
  recovered = null;

  clock = 30_000;
  const replay = createWorldCloudflareRuntime({ storage, env, now, nowMs });
  const replayWake = await replay.reconciliationRuntime.handleWake();
  assert.equal(calls.genesisPresentation, 1, "delivered Genesis projection must not be duplicated after restart");
  assert.equal(calls.root, 1, "admitted canonical root must not be regenerated after restart");
  assert.equal(calls.visualPresentation, 2, "Presentation reconciliation may replay idempotently");
  const replayDemandId = replayWake.visualPublication.result.results[0].reconciliation.demandId;
  assert.equal(replayDemandId, firstDemandId, "replayed World state must resolve to the same current Presentation demand");
  assert.equal(calls.visualRequests.length, 2);
  assert.equal(calls.visualRequests[0].threadId, THREAD_ID);
  assert.equal(calls.visualRequests[1].threadId, THREAD_ID);
  assert.equal(calls.visualRequests[0].embodiment.embodimentId, calls.visualRequests[1].embodiment.embodimentId);
  assert.equal(calls.visualRequests[0].embodiment.asset.referenceObjectRef, calls.visualRequests[1].embodiment.asset.referenceObjectRef);
  const replayEmbodiments = replay.embodimentStore.listCurrent(THREAD_ID);
  assert.equal(replayEmbodiments.length, 1);
  assert.equal(replay.embodimentStore.history(THREAD_ID, replayEmbodiments[0].embodimentId).length, 2);
  await replay.close({ cancelSchedule: true });
  storage.closeDatabase();
});
