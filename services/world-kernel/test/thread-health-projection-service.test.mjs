import assert from "node:assert/strict";
import test from "node:test";

import {
  createThreadHealthProjectionService,
  THREAD_HEALTH_PROJECTION_VERSION,
} from "../src/thread-health-projection-service.mjs";

test("Thread health reuses unchanged authority and invalidates only on diagnosis inputs", async () => {
  const threadId = "thr_health_projection_001";
  let worldVersion = 7;
  let presentationDigest = "sha256:presentation-a";
  let reconciliationState = "complete";
  let symbolicGenomeDigest = "sha256:genome-a";
  let raisedLanguages = ["Georgian", "English"];
  let deepDiagnoses = 0;
  let cached = {
    witness:JSON.stringify({
      projectionVersion:"thread-health-v0.1",
      world:{
        thread:{ version:worldVersion, stateHash:`sha256:world-${worldVersion}`, updatedAt:"2026-09-18T00:00:00Z" },
        civilRegistrationDigest:"sha256:civil",
        embodimentHeads:[],
        genesisPublication:null,
        raisedLanguages,
        symbolicGenomes:[{ genomeId:"genome_1", genomeDigest:symbolicGenomeDigest }],
      },
      presentationSnapshotDigest:presentationDigest,
    }),
    diagnosis:{ threadId, exists:true, health:"repairable", findings:[{ code:"STALE_DIAGNOSIS" }] },
  };

  const projectionStore = {
    worldWitness(id) {
      assert.equal(id, threadId);
      return {
        diagnosis:{
          thread:{ version:worldVersion, stateHash:`sha256:world-${worldVersion}`, updatedAt:"2026-09-18T00:00:00Z" },
          civilRegistrationDigest:"sha256:civil",
          embodimentHeads:[],
          genesisPublication:null,
        raisedLanguages,
        symbolicGenomes:[{ genomeId:"genome_1", genomeDigest:symbolicGenomeDigest }],
        },
        reconciliation:{ state:reconciliationState, lastError:null, updatedAt:"2026-09-18T00:00:00Z" },
      };
    },
    get(id, witness) {
      assert.equal(id, threadId);
      return cached?.witness === JSON.stringify(witness) ? cached.diagnosis : null;
    },
    put(id, witness, diagnosis) {
      assert.equal(id, threadId);
      cached = { witness:JSON.stringify(witness), diagnosis };
    },
  };
  const service = createThreadHealthProjectionService({
    projectionStore,
    presentationWitnessReader:{
      async getSnapshotDigest(id) {
        assert.equal(id, threadId);
        return presentationDigest;
      },
    },
    async diagnose(id) {
      assert.equal(id, threadId);
      deepDiagnoses += 1;
      return { threadId, exists:true, health:"healthy", findings:[] };
    },
  });

  assert.equal(THREAD_HEALTH_PROJECTION_VERSION, "thread-health-v0.3");
  const refreshed = await service.inspect(threadId);
  assert.equal(refreshed.cacheHit, false, "older diagnostic semantics were reused");
  assert.equal(refreshed.diagnosis.health, "healthy", "stale cached health survived semantic revision");
  assert.equal(deepDiagnoses, 1);

  assert.equal((await service.inspect(threadId)).cacheHit, true);
  assert.equal(deepDiagnoses, 1, "unchanged health must not re-run deep diagnosis");

  reconciliationState = "pending";
  assert.equal((await service.inspect(threadId)).cacheHit, true);
  assert.equal(deepDiagnoses, 1, "reconciliation-only changes must not invalidate diagnosis");

  presentationDigest = "sha256:presentation-b";
  assert.equal((await service.inspect(threadId)).cacheHit, false);
  assert.equal(deepDiagnoses, 2, "Presentation changes must invalidate cached health");

  symbolicGenomeDigest = "sha256:genome-b";
  assert.equal((await service.inspect(threadId)).cacheHit, false);
  assert.equal(deepDiagnoses, 3, "symbolic genome migration must invalidate cached health");

  raisedLanguages = ["Georgian"];
  assert.equal((await service.inspect(threadId)).cacheHit, false);
  assert.equal(deepDiagnoses, 4, "Raised-language correction must invalidate cached health");

  worldVersion = 8;
  assert.equal((await service.inspect(threadId)).cacheHit, false);
  assert.equal(deepDiagnoses, 5, "World authority changes must invalidate cached health");
});
