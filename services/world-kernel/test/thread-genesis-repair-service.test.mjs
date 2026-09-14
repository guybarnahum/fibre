import test from "node:test";
import assert from "node:assert/strict";

import { genesisSexForThread } from "#core/src/genesis-sex.mjs";
import { createThreadGenesisRepairService } from "../src/thread-genesis-repair-service.mjs";

function fixture() {
  const threadId = "thr_repair_1";
  const objectRef = "visual_identity_reference_1";
  const officialMediaId = "media_identity_1";
  const state = { presentation:null, rebuilt:false, visual:false, activity:[] };
  const thread = {
    threadId,
    status:"active",
    identity:{
      name:"Repair Thread",
      sex:"female",
      originOrientation:"original",
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
  const publicIdentity = {
    subject:{ displayName:"Repair Thread" },
    civilIdentity:{ fibreIdentityNumber:"ABCD-12-EFGH" },
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
          presentation:{ ...publicIdentity, visualIdentity:null, identityCard:null },
          media:{ assets:[] },
        };
        return { rebuilt:true, genesisId:"gen_repair_1", threadId };
      },
    },
    visualReconciler:{
      async reconcileThread({ threadId:id, regenerationKey }) {
        assert.equal(id, threadId);
        assert.equal(regenerationKey, "repair_test_1");
        state.visual = true;
        state.presentation = {
          presentation:{
            ...publicIdentity,
            visualIdentity:{ referenceObjectRefs:[objectRef] },
            identityCard:{ officialPhotoMediaRef:officialMediaId },
          },
          media:{ assets:[{ mediaId:officialMediaId, status:"ready", locator:"identity_photo_1" }] },
        };
        return { complete:true, stage:"complete" };
      },
    },
    genesisSexMigrator:{ migrate() { throw new Error("sex migration should not run for a complete Thread"); } },
    activityRecorder:{ async record(entry) { state.activity.push(structuredClone(entry)); } },
  });
  return { service, state, threadId, thread };
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

test("R4 exposes authoritative identity completeness without requiring sex in public Presentation", async () => {
  const { service, state, threadId } = fixture();
  state.presentation = {
    presentation:{
      subject:{ displayName:"Repair Thread" },
      civilIdentity:{ fibreIdentityNumber:"ABCD-12-EFGH" },
      visualIdentity:{ referenceObjectRefs:["visual_identity_reference_1"] },
      identityCard:{ officialPhotoMediaRef:"media_identity_1" },
    },
    media:{ assets:[{ mediaId:"media_identity_1", status:"ready", locator:"identity_photo_1" }] },
  };
  const diagnosis = await service.diagnose(threadId);
  assert.deepEqual(diagnosis.identity, {
    name:"Repair Thread",
    sex:"female",
    fibreIdentityNumber:"ABCD-12-EFGH",
    originOrientation:"original",
    birthDate:null,
    canonicalVisualSpecification:"present",
  });
  assert.equal(diagnosis.findings.find((entry) => entry.code === "SEX").state, "healthy");
  assert.equal(diagnosis.findings.some((entry) => entry.code === "SEX_PRESENTATION_MISSING"), false);
  assert.equal(diagnosis.health, "healthy");
});

test("R4 distinguishes public projection omission from authoritative Genesis absence", async () => {
  const { service, state, threadId } = fixture();
  state.presentation = {
    presentation:{
      subject:{},
      civilIdentity:{ fibreIdentityNumber:"ABCD-12-EFGH" },
      visualIdentity:{ referenceObjectRefs:["visual_identity_reference_1"] },
      identityCard:{ officialPhotoMediaRef:"media_identity_1" },
    },
    media:{ assets:[{ mediaId:"media_identity_1", status:"ready", locator:"identity_photo_1" }] },
  };
  const diagnosis = await service.diagnose(threadId);
  const name = diagnosis.findings.find((entry) => entry.code === "NAME_PRESENTATION_MISSING");
  assert.equal(name.state, "operator_decision_required");
  assert.equal(name.authoritative, "Repair Thread");
  assert.equal(diagnosis.health, "operator_decision_required");
});

test("R4 surfaces authority conflicts instead of silently repairing them", async () => {
  const { service, state, threadId } = fixture();
  state.presentation = {
    presentation:{
      subject:{ displayName:"Different Thread" },
      civilIdentity:{ fibreIdentityNumber:"ZZZZ-99-ZZZZ" },
      visualIdentity:{ referenceObjectRefs:["visual_identity_reference_1"] },
      identityCard:{ officialPhotoMediaRef:"media_identity_1" },
    },
    media:{ assets:[{ mediaId:"media_identity_1", status:"ready", locator:"identity_photo_1" }] },
  };
  const diagnosis = await service.diagnose(threadId);
  assert.equal(diagnosis.health, "integrity_error");
  assert.deepEqual(
    diagnosis.findings.filter((entry) => entry.state === "integrity_error").map((entry) => entry.code),
    ["FIN_CONFLICT", "NAME_CONFLICT"],
  );
});

test("R4 marks missing authoritative identity facts as migration, not ordinary repair", async () => {
  const service = createThreadGenesisRepairService({
    worldReader:{ getThread() { return { threadId:"thr_legacy_1", status:"frozen", identity:{ selfDescription:"Legacy" } }; } },
    civilRegistry:{ getCivilRegistrationByThreadId() { return null; } },
    embodimentReader:{ listCurrent() { return []; } },
    presentationReader:{ async getSnapshot() { return null; } },
    presentationDelivery:{ async rebuildThreadPresentation() { throw new Error("should not run"); } },
    visualReconciler:{ async reconcileThread() { throw new Error("should not run"); } },
    genesisSexMigrator:{ migrate() { throw new Error("diagnosis must not migrate"); } },
  });
  const diagnosis = await service.diagnose("thr_legacy_1");
  assert.equal(diagnosis.health, "migration_required");
  assert.equal(diagnosis.findings.find((entry) => entry.code === "NAME_MISSING").state, "migration_required");
  const sex = diagnosis.findings.find((entry) => entry.code === "SEX_MISSING");
  assert.equal(sex.state, "migration_required");
  assert.equal(sex.action, "migrate_genesis_sex");
  assert.equal(sex.deterministic, true);
  assert.equal(diagnosis.findings.find((entry) => entry.code === "FIN_MISSING").state, "migration_required");
  assert.equal(diagnosis.findings.find((entry) => entry.code === "ORIGIN_ORIENTATION_MISSING").state, "migration_required");
});

test("R6 deterministically restores missing Genesis sex before continuing repair", async () => {
  const { state, threadId, thread } = fixture();
  delete thread.identity.sex;
  state.presentation = {
    presentation:{
      subject:{ displayName:"Repair Thread" },
      civilIdentity:{ fibreIdentityNumber:"ABCD-12-EFGH" },
      visualIdentity:{ referenceObjectRefs:["visual_identity_reference_1"] },
      identityCard:{ officialPhotoMediaRef:"media_identity_1" },
    },
    media:{ assets:[{ mediaId:"media_identity_1", status:"ready", locator:"identity_photo_1" }] },
  };
  const service = createThreadGenesisRepairService({
    worldReader:{ getThread() { return thread; } },
    civilRegistry:{ getCivilRegistrationByThreadId() { return { fibreIdentityNumber:"ABCD-12-EFGH" }; } },
    embodimentReader:{ listCurrent() { return [{ embodimentId:"emb_repair_1", kind:"portrait", visibility:"public", status:"available", asset:{ referenceObjectRef:"visual_identity_reference_1" } }]; } },
    presentationReader:{ async getSnapshot() { return state.presentation; } },
    presentationDelivery:{ async rebuildThreadPresentation() { throw new Error("not needed"); } },
    visualReconciler:{ async reconcileThread() { throw new Error("not needed"); } },
    genesisSexMigrator:{
      migrate(current) {
        const sex = genesisSexForThread({ threadId:current.threadId });
        current.identity.sex = sex;
        return { migrated:true, reused:false, sex, eventId:"evt_genesis_sex_migrated" };
      },
    },
    activityRecorder:{ async record(entry) { state.activity.push(structuredClone(entry)); } },
  });

  const before = await service.diagnose(threadId);
  assert.equal(before.findings.find((entry) => entry.code === "SEX_MISSING").action, "migrate_genesis_sex");
  const result = await service.repair(threadId, { repairKey:"repair_sex_1" });
  assert.equal(thread.identity.sex, genesisSexForThread({ threadId }));
  assert.deepEqual(result.actions.map((entry) => entry.action), ["migrate_genesis_sex"]);
  assert.equal(result.after.findings.find((entry) => entry.code === "SEX").state, "healthy");
  assert.equal(result.after.health, "healthy");
});

test("R7 records one repair root with causally parented repair actions", async () => {
  const { service, state, threadId } = fixture();
  await service.repair(threadId, { repairKey:"repair_test_1" });
  const repair = state.activity.filter((entry) => entry.stage.startsWith("thread.repair."));
  assert.deepEqual(repair.map((entry) => entry.stage), [
    "thread.repair.start",
    "thread.repair.presentation_rebuild",
    "thread.repair.visual_reconcile",
    "thread.repair.complete",
  ]);
  assert.equal(repair[0].operationId, "repair_test_1");
  assert.equal(repair[0].parentOperationId, undefined);
  assert.equal(repair.slice(1).every((entry) => entry.parentOperationId === "repair_test_1"), true);
  assert.deepEqual(repair.slice(1).map((entry) => entry.operationId), [
    "repair_test_1.presentation",
    "repair_test_1.visual",
    "repair_test_1.complete",
  ]);
});
