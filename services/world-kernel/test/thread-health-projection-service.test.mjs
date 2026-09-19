import assert from "node:assert/strict";
import test from "node:test";

import { createThreadHealthProjectionService } from "../src/thread-health-projection-service.mjs";

test("Thread health reuses unchanged authority and invalidates only on diagnosis inputs", async () => {
  const threadId = "thr_health_projection_001";
  let worldVersion = 7;
  let presentationDigest = "sha256:presentation-a";
  let reconciliationState = "complete";
  let deepDiagnoses = 0;
  let cached = null;

  const projectionStore = {
    worldWitness(id) {
      assert.equal(id, threadId);
      return {
        diagnosis:{
          thread:{ version:worldVersion, stateHash:`sha256:world-${worldVersion}`, updatedAt:"2026-09-18T00:00:00Z" },
          civilRegistrationDigest:"sha256:civil",
          embodimentHeads:[],
          genesisPublication:null,
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

  assert.equal((await service.inspect(threadId)).cacheHit, false);
  assert.equal(deepDiagnoses, 1);

  assert.equal((await service.inspect(threadId)).cacheHit, true);
  assert.equal(deepDiagnoses, 1, "unchanged health must not re-run deep diagnosis");

  reconciliationState = "pending";
  assert.equal((await service.inspect(threadId)).cacheHit, true);
  assert.equal(deepDiagnoses, 1, "reconciliation-only changes must not invalidate diagnosis");

  presentationDigest = "sha256:presentation-b";
  assert.equal((await service.inspect(threadId)).cacheHit, false);
  assert.equal(deepDiagnoses, 2, "Presentation changes must invalidate cached health");

  worldVersion = 8;
  assert.equal((await service.inspect(threadId)).cacheHit, false);
  assert.equal(deepDiagnoses, 3, "World authority changes must invalidate cached health");
});
