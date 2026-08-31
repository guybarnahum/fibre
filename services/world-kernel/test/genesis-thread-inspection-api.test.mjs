import assert from "node:assert/strict";
import test from "node:test";

import { createGenesisThreadInspectionApi } from "../src/genesis-thread-inspection-api.mjs";

const TOKEN = "world-inspection-private-token-123";

function apiFixture({ born = false } = {}) {
  const threadId = "thr_world_inspection_001";
  const genesisId = "genesis_world_inspection_001";
  return createGenesisThreadInspectionApi({
    privateToken: TOKEN,
    worldReader: {
      getThread(id) {
        assert.equal(id, threadId);
        return born ? { threadId, version: 15, status: "frozen", provenance: { lastEventId: "evt_15" } } : null;
      },
      listEvents(id) {
        assert.equal(id, threadId);
        return Array.from({ length: 15 }, (_, index) => ({ eventId: `evt_${index + 1}` }));
      },
    },
    genesisReader: {
      inspectGenesis(id) {
        assert.equal(id, genesisId);
        return born ? {
          genesisId,
          manifest: { manifest: { threadId }, manifestDigest: "sha256:manifest" },
          worldSpec: { record: { worldSpecId: "world_inspection_001" }, recordDigest: "sha256:world" },
          historicalEnvelopePlan: { planDigest: "sha256:envelopes" },
          threadPublished: true,
        } : {
          genesisId,
          manifest: null,
          worldSpec: null,
          historicalEnvelopePlan: null,
          threadPublished: false,
        };
      },
    },
    genomeReader: {
      listThreadGenomes(id) {
        assert.equal(id, threadId);
        return born ? [{ header: { genomeId: "genome_inspection_001" }, genomeDigest: "sha256:genome" }] : [];
      },
    },
    civilRegistry: {
      getCivilRegistrationByThreadId(id) {
        assert.equal(id, threadId);
        return born ? {
          registrationId: "civreg_inspection",
          fibreIdentityNumber: "0000-00-0000",
          birthEventRef: "evt_seed",
          worldRef: "world_inspection_001",
          registrationDigest: "sha256:registration",
          privateField: "must-not-escape",
        } : null;
      },
    },
    embodimentReader: {
      listCurrent(id) {
        assert.equal(id, threadId);
        return born ? [{
          embodimentId: "emb_inspection_001",
          revision: 2,
          kind: "visual_identity",
          representationKind: "canonical_visual_identity",
          visibility: "public",
          specificationDigest: "sha256:spec",
          asset: { referenceObjectRef: "asset_reference_001", privateField: "must-not-escape" },
        }] : [];
      },
    },
  });
}

function request() {
  return new Request(
    "https://world.internal/internal/genesis/genesis_world_inspection_001/threads/thr_world_inspection_001/inspection",
    { headers: { "x-fibre-private-token": TOKEN } },
  );
}

test("World inspection proves authoritative absence before birth", async () => {
  const response = await apiFixture().fetch(request());
  assert.equal(response.status, 200);
  const { inspection } = await response.json();
  assert.equal(inspection.authoritativeThread.exists, false);
  assert.equal(inspection.authoritativeThread.eventCount, 0);
  assert.equal(inspection.genesis.manifestExists, false);
  assert.equal(inspection.genesis.threadPublished, false);
  assert.equal(inspection.symbolicGenomes.count, 0);
  assert.equal(inspection.civilRegistration, null);
  assert.equal(inspection.embodiment.currentCount, 0);
});

test("World inspection exposes only authority witnesses for the one born Thread", async () => {
  const response = await apiFixture({ born: true }).fetch(request());
  assert.equal(response.status, 200);
  const { inspection } = await response.json();
  assert.deepEqual(inspection.authoritativeThread, {
    exists: true,
    version: 15,
    status: "frozen",
    eventCount: 15,
    lastEventId: "evt_15",
  });
  assert.equal(inspection.genesis.worldSpecId, "world_inspection_001");
  assert.equal(inspection.symbolicGenomes.count, 1);
  assert.equal(inspection.symbolicGenomes.genomes[0].genomeId, "genome_inspection_001");
  assert.equal(inspection.civilRegistration.registrationId, "civreg_inspection");
  assert.equal(Object.hasOwn(inspection.civilRegistration, "privateField"), false);
  assert.equal(inspection.embodiment.current[0].referenceObjectRef, "asset_reference_001");
  assert.equal(Object.hasOwn(inspection.embodiment.current[0], "asset"), false);
});

test("World inspection is private and rejects Genesis/Thread identity mismatch", async () => {
  const api = createGenesisThreadInspectionApi({
    privateToken: TOKEN,
    worldReader: { getThread() { return null; }, listEvents() { return []; } },
    genesisReader: {
      inspectGenesis() {
        return {
          manifest: { manifest: { threadId: "thr_other" }, manifestDigest: "sha256:m" },
          worldSpec: null,
          historicalEnvelopePlan: null,
          threadPublished: true,
        };
      },
    },
    genomeReader: { listThreadGenomes() { return []; } },
    civilRegistry: { getCivilRegistrationByThreadId() { return null; } },
    embodimentReader: { listCurrent() { return []; } },
  });
  const unauthorized = await api.fetch(new Request(request().url));
  assert.equal(unauthorized.status, 403);
  const mismatch = await api.fetch(request());
  assert.equal(mismatch.status, 409);
});
