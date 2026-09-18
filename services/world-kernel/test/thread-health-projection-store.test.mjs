import assert from "node:assert/strict";
import test from "node:test";

import { createThreadHealthReader } from "../src/thread-health-projection-store.mjs";

test("health diagnosis is reused until an authoritative witness changes", async () => {
  let presentationDigest = "sha256:present-a";
  let diagnoses = 0;
  let projected = null;

  const reader = createThreadHealthReader({
    projectionStore:{
      worldWitness() {
        return {
          diagnosis:{
            thread:{ version:7, stateHash:"sha256:world-a", updatedAt:"2026-09-18T00:00:00Z" },
            civilRegistrationDigest:"sha256:civil-a",
            embodimentHeads:[],
            genesisPublication:null,
          },
        };
      },
      get(_threadId, witness) {
        return projected?.witness === JSON.stringify(witness) ? projected.diagnosis : null;
      },
      put(_threadId, witness, diagnosis) {
        projected = { witness:JSON.stringify(witness), diagnosis };
        return diagnosis;
      },
    },
    presentationReader:{
      async getSnapshotDigest() { return presentationDigest; },
    },
    diagnosisService:{
      async diagnose() {
        diagnoses += 1;
        return { exists:true, health:"healthy", revision:diagnoses };
      },
    },
  });

  await reader.diagnose("thr_health_1");
  await reader.diagnose("thr_health_1");
  assert.equal(diagnoses, 1, "stable witness must reuse health");

  presentationDigest = "sha256:present-b";
  await reader.diagnose("thr_health_1");
  assert.equal(diagnoses, 2, "changed witness must re-diagnose");
});
