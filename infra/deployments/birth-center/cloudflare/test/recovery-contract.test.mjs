import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { publicationValidatorSetWitness } from "#services/world-kernel/src/genesis-domain.mjs";
import { attachTestCivilRegistration } from "#services/world-kernel/test/support/civil-registration-fixture.mjs";
import { createWorldCloudflareRuntime } from "../../../world-kernel/cloudflare/runtime.mjs";
import { createBirthCenterCloudflareRuntime } from "../runtime.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const THREAD_ID = "thr_slice_d_birth_cloud_recovery_001";
const GENESIS_ID = `gen_${THREAD_ID}`;
const PRIVATE_TOKEN = "slice-d-cloud-private-token";
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
    worldSpecId: "world_slice_d_birth_cloud_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-31T19:00:00Z" },
    places: [{ placeId: "place_slice_d_birth", description: "A bounded ordinary city context." }],
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
      authorId: "human_slice_d",
      sourcesConsulted: [],
      abstractionMethod: "Synthetic Slice-D Birth Center recovery fixture.",
      relocationWitness: "No source biography is used as Thread history.",
      familiarityProbe: null,
      createdAt: "2026-08-31T18:55:00Z",
    },
    createdAt: "2026-08-31T18:55:00Z",
  };
}

function cognition() {
  const surface = (char) => ({
    provider: "fixture",
    modelId: "fixture-model-v1",
    promptHash: sha(char),
    schemaHash: sha(char === "a" ? "b" : char),
    sampling: { temperature: 0.4, seed: 44 },
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

function birthBundle() {
  const thread = structuredClone(mina);
  thread.threadId = THREAD_ID;
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-08-31T18:56:00Z",
    createdBy: "fibre.genesis",
    lastEventId: `evt_seed_${THREAD_ID}`,
  };
  return attachTestCivilRegistration({
    manifest: {
      genesisId: GENESIS_ID,
      threadId: THREAD_ID,
      originMode: "de_novo",
      entry: {
        stage: "young_adult",
        ageAtEntry: 22,
        chronologyEndsAt: "2026-08-31T18:54:00Z",
        justification: "Slice-D Birth Center cloud recovery fixture.",
        policyRef: "entry-policy-v1",
      },
      worldSpecRef: worldSpec().worldSpecId,
      sourceBundleRefs: [],
      parentOrAncestorRefs: [],
      genomeRef: null,
      cognition: cognition(),
      publication: {
        status: "published",
        publishedAt: "2026-08-31T18:58:00Z",
        resultingThreadVersion: thread.version,
      },
      createdAt: "2026-08-31T18:55:30Z",
    },
    thread,
  });
}

function worldEnvironment() {
  return {
    FIBRE_PRIVATE_TOKEN: PRIVATE_TOKEN,
    FIBRE_WORLD_RECONCILIATION_MS: "1000",
    ASSET_GENERATOR: {
      async fetch() { return Response.json({ error: "not_expected" }, { status: 500 }); },
    },
    THREAD_PRESENTATION: {
      async fetch() { return Response.json({ error: "not_expected" }, { status: 500 }); },
    },
  };
}

function birthRequest(bundle) {
  return new Request("https://birth-center.internal/internal/births", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-fibre-private-token": PRIVATE_TOKEN,
    },
    body: JSON.stringify(bundle),
  });
}

test("Cloudflare Birth Center survives lost World acknowledgement and converges on one authoritative Thread", async () => {
  const worldStorage = durableStorage();
  const birthStorage = durableStorage();
  let clock = 10_000;
  const nowMs = () => clock;
  const now = () => "2026-08-31T19:00:00Z";
  const world = createWorldCloudflareRuntime({ storage: worldStorage, env: worldEnvironment(), now, nowMs });
  world.genesisStore.recordWorldSpec(worldSpec());

  let worldCalls = 0;
  const birthEnvironment = {
    FIBRE_PRIVATE_TOKEN: PRIVATE_TOKEN,
    FIBRE_BIRTH_RECONCILIATION_MS: "1000",
    WORLD_KERNEL: {
      async fetch(request) {
        worldCalls += 1;
        const response = await world.birthApi.fetch(request);
        if (!response.ok) {
          const detail = await response.clone().text();
          throw new Error(`World birth API failed: ${response.status} ${detail}`);
        }
        if (worldCalls === 1) throw new Error("simulated World acknowledgement loss");
        return response;
      },
    },
  };

  let first = createBirthCenterCloudflareRuntime({
    storage: birthStorage,
    env: birthEnvironment,
    now,
    nowMs,
  });
  const acceptedResponse = await first.birthApi.fetch(birthRequest(birthBundle()));
  assert.equal(acceptedResponse.status, 202);
  assert.equal(first.runtime.status().pendingBirthCount, 1);
  assert.equal(await first.infraDriver.scheduler.get("birth"), 10_000);
  assert.equal(world.worldStore.getThread(THREAD_ID, { required: false }), null);

  await assert.rejects(first.runtime.handleWake(), /simulated World acknowledgement loss/);
  assert.equal(worldCalls, 1);
  assert.equal(world.worldStore.getThread(THREAD_ID).threadId, THREAD_ID);
  assert.equal(first.runtime.provisionalBirthStore.get(GENESIS_ID).status, "pending");
  assert.equal(await first.infraDriver.scheduler.get("birth"), 11_000);
  first.close();
  first = null;

  clock = 20_000;
  const recovered = createBirthCenterCloudflareRuntime({
    storage: birthStorage,
    env: birthEnvironment,
    now,
    nowMs,
  });
  assert.equal(await recovered.infraDriver.scheduler.get("birth"), 11_000, "Durable Object alarm survives runtime disposal");
  const recovery = await recovered.runtime.handleWake();
  assert.deepEqual(recovery, { attempted: 1, published: 1 });
  assert.equal(worldCalls, 2, "retry crosses the World boundary exactly once after the lost acknowledgement");
  assert.equal(recovered.runtime.status().pendingBirthCount, 0);
  assert.equal(recovered.runtime.provisionalBirthStore.get(GENESIS_ID).status, "published");
  assert.equal(await recovered.infraDriver.scheduler.get("birth"), null);

  const replayResponse = await recovered.birthApi.fetch(birthRequest(birthBundle()));
  assert.equal(replayResponse.status, 200);
  const replayBody = await replayResponse.json();
  assert.equal(replayBody.accepted.idempotent, true);
  assert.equal(replayBody.accepted.status, "published");
  assert.equal(worldCalls, 2, "exact Birth Center replay must not republish an already-published provisional birth");
  assert.equal(world.worldStore.getThread(THREAD_ID).threadId, THREAD_ID);
  assert.equal(world.genesisStore.getManifest(GENESIS_ID).manifest.threadId, THREAD_ID);

  recovered.close();
  await world.close({ cancelSchedule: true });
  birthStorage.closeDatabase();
  worldStorage.closeDatabase();
});
