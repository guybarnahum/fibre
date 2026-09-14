import test from "node:test";
import assert from "node:assert/strict";

import { createThreadGenesisRepairService } from "../src/thread-genesis-repair-service.mjs";

function fixture() {
  const threadId = "thr_repair_1";
  const objectRef = "visual_identity_reference_1";
  const officialMediaId = "media_identity_1";
  const state = { presentation:null, rebuilt:false, visual:false };
  const thread = {
    threadId,
    status:"active",
    identity:{
      name:"Repair Thread",
      sex:"female",
      selfDescription:"I persist.",
      canonicalVisualIdentity:{ specification:{ subject:{ description:"stable face" } } },
    },
  };
  const embodiment = {
    embodimentId:"emb_repair_1",
    revision:2,
    threadId,
    kind:"portrait",
    visibility:"public",
    status:"available",
    asset:{ referenceObjectRef:objectRef },
  };
  const service = createThreadGenesisRepairService({
    worldReader:{ getThread(id, options = {}) { return id === threadId ? thread : (options.required === false ? null : undefined); } },
    civilRegistry:{ getCivilRegistrationByThreadId(id) { return id === threadId ? { fibreIdentityNumber:"ABCD-12-EFGH" } : null; } },
    embodimentReader:{ listCurrent(id) { return id === threadId ? [embodiment] : []; } },
    presentationReader:{ async getSnapshot(id) { return id === threadId ? state.presentation : null; } },
    presentationDelivery:{
      async rebuildThreadPresentation(id) {
        assert.equal(id, threadId);
        state.rebuilt = true;
        state.presentation = {
          presentation:{ visualIdentity:null, identityCard:null },
          media:{ assets:[] },
        };
        return { rebuilt:true, threadId };
      },
    },
    visualReconciler:{
      async reconcileThread({ threadId:id, regenerationKey }) {
        assert.equal(id, threadId);
        assert.equal(regenerationKey, "repair_test_1");
        state.visual = true;
        state.presentation = {
          presentation:{
            visualIdentity:{ referenceObjectRefs:[objectRef] },
            identityCard:{ officialPhotoMediaRef:officialMediaId },
          },
          media:{ assets:[{ mediaId:officialMediaId, status:"ready", locator:"identity_photo_1" }] },
        };
        return { complete:true, stage:"complete" };
      },
    },
  });
  return { service, state, threadId };
}

test("R1 diagnoses missing Presentation and unpublished canonical visual without inventing identity", async () => {
  const { service, threadId } = fixture();
  const diagnosis = await service.diagnose(threadId);
  assert.equal(diagnosis.health, "repairable");
  assert.equal(diagnosis.findings.find((entry) => entry.code === "NAME").state, "healthy");
  assert.equal(diagnosis.findings.find((entry) => entry.code === "SEX").state, "healthy");
  assert.equal(diagnosis.findings.find((entry) => entry.code === "PRESENTATION_MISSING").action, "rebuild_presentation");
  assert.equal(diagnosis.findings.find((entry) => entry.code === "CANONICAL_VISUAL_NOT_PUBLISHED").action, "reconcile_visual_publication");
});

test("R2-R3 rebuild missing Presentation before existing visual reconciliation", async () => {
  const { service, state, threadId } = fixture();
  const result = await service.repair(threadId, { repairKey:"repair_test_1" });
  assert.equal(state.rebuilt, true);
  assert.equal(state.visual, true);
  assert.deepEqual(result.actions.map((entry) => entry.action), [
    "rebuild_presentation",
    "reconcile_visual_publication",
  ]);
  assert.equal(result.before.health, "repairable");
  assert.equal(result.after.health, "healthy");
});

test("R1 marks missing authoritative identity facts as migration, not repair", async () => {
  const service = createThreadGenesisRepairService({
    worldReader:{ getThread() { return { threadId:"thr_legacy_1", status:"frozen", identity:{ selfDescription:"Legacy" } }; } },
    civilRegistry:{ getCivilRegistrationByThreadId() { return null; } },
    embodimentReader:{ listCurrent() { return []; } },
    presentationReader:{ async getSnapshot() { return null; } },
    presentationDelivery:{ async rebuildThreadPresentation() { throw new Error("should not run"); } },
    visualReconciler:{ async reconcileThread() { throw new Error("should not run"); } },
  });
  const diagnosis = await service.diagnose("thr_legacy_1");
  assert.equal(diagnosis.health, "migration_required");
  assert.equal(diagnosis.findings.find((entry) => entry.code === "NAME_MISSING").state, "migration_required");
  assert.equal(diagnosis.findings.find((entry) => entry.code === "SEX_MISSING").state, "migration_required");
});
