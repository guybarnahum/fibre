import test from "node:test";
import assert from "node:assert/strict";

import { createThreadGenesisRepairService } from "../src/thread-genesis-repair-service.mjs";

const SEX_EVIDENCE = Object.freeze({
  sex:"female",
  genesisId:"gen_repair_1",
  source:"genesis_birth_publication",
  resultDigest:`sha256:${"a".repeat(64)}`,
});

const NO_IDENTITY_UPDATE = Object.freeze({
  update() { throw new Error("identity update should not run in this test"); },
});

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
      async reconcileThreadPresentationIdentity(id) {
        assert.equal(id, threadId);
        state.presentation.presentation.subject = {
          ...(state.presentation.presentation.subject ?? {}),
          displayName:thread.identity.name,
        };
        return { threadId, reconciled:true };
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
    genesisSexEvidence:{ resolve() { return null; } },
    genesisSexMigrator:{ migrate() { throw new Error("sex migration should not run for a complete Thread"); } },
    identityUpdater:NO_IDENTITY_UPDATE,
    activityRecorder:{ async record(entry) { state.activity.push(structuredClone(entry)); } },
  });
  return { service, state, threadId, thread };
}

test("R1 diagnoses missing Presentation and unpublished canonical visual without inventing identity", async () => {
  const { service, threadId } = fixture();
  const diagnosis = await service.diagnose(threadId);
  assert.equal(diagnosis.health, "repairable");
  const name = diagnosis.findings.find((entry) => entry.code === "NAME");
  assert.equal(name.state, "healthy");
  assert.equal(name.identityAction.id, "change_name");
  assert.equal(name.identityAction.input.fields[0].default, "Repair Thread");
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

test("R4 keeps authoritative identity complete while public Presentation stays a projection", async () => {
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
  assert.equal(diagnosis.identity.name, "Repair Thread", "World name must remain authoritative");
  assert.equal(diagnosis.identity.sex, "female", "World sex must remain authoritative");
  assert.equal(diagnosis.identity.fibreIdentityNumber, "ABCD-12-EFGH", "civil identity must remain authoritative");
  assert.equal(diagnosis.presentation.portraitObjectRef, "identity_photo_1", "published portrait must stay discoverable");
  assert.equal(diagnosis.findings.some((entry) => entry.code === "SEX_PRESENTATION_MISSING"), false, "public Presentation must not become sex authority");
  assert.equal(diagnosis.health, "healthy", "complete authoritative identity should be healthy");
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
  assert.equal(name.state, "repairable");
  assert.equal(name.authoritative, "Repair Thread");
  assert.equal(diagnosis.health, "repairable");
});

test("R4 repairs stale public name from World without rebuilding Genesis", async () => {
  const { service, state, threadId } = fixture();
  state.presentation = {
    presentation:{
      subject:{ displayName:"Old Name" },
      civilIdentity:{ fibreIdentityNumber:"ABCD-12-EFGH" },
      visualIdentity:{ referenceObjectRefs:["visual_identity_reference_1"] },
      identityCard:{ officialPhotoMediaRef:"media_identity_1" },
    },
    media:{ assets:[{ mediaId:"media_identity_1", status:"ready", locator:"identity_photo_1" }] },
  };

  const result = await service.repair(threadId, { repairKey:"repair_identity_projection_1" });

  assert.equal(state.rebuilt, false, "Genesis rebuild was used");
  assert.deepEqual(result.actions.map((entry) => entry.action), ["reconcile_identity_projection"], "wrong repair path");
  assert.equal(result.after.health, "healthy", "identity did not converge");
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
    ["FIN_CONFLICT"],
  );
  assert.equal(diagnosis.findings.find((entry) => entry.code === "NAME_PRESENTATION_STALE").state, "repairable");
});

test("Fibre Thread and missing sex require explicit operator identity decisions without invented evidence", async () => {
  const service = createThreadGenesisRepairService({
    worldReader:{ getThread() { return { threadId:"thr_legacy_1", status:"frozen", identity:{ name:"Fibre Thread", selfDescription:"Legacy" } }; } },
    civilRegistry:{ getCivilRegistrationByThreadId() { return null; } },
    embodimentReader:{ listCurrent() { return []; } },
    presentationReader:{ async getSnapshot() { return null; } },
    presentationDelivery:{ async rebuildThreadPresentation() { throw new Error("should not run"); } },
    visualReconciler:{ async reconcileThread() { throw new Error("should not run"); } },
    genesisSexEvidence:{ resolve() { return null; } },
    genesisSexMigrator:{ migrate() { throw new Error("diagnosis must not migrate"); } },
    identityUpdater:NO_IDENTITY_UPDATE,
  });
  const diagnosis = await service.diagnose("thr_legacy_1");
  assert.equal(diagnosis.health, "operator_decision_required");
  const name = diagnosis.findings.find((entry) => entry.code === "NAME_UNFINISHED");
  assert.equal(name.state, "operator_decision_required");
  assert.equal(name.authoritative, "Fibre Thread");
  assert.equal(name.identityAction.id, "set_name");
  const sex = diagnosis.findings.find((entry) => entry.code === "SEX_MISSING");
  assert.equal(sex.state, "operator_decision_required");
  assert.equal(sex.migration, undefined);
  assert.equal(sex.evidenceAvailable, false);
  assert.equal(sex.identityAction.id, "set_sex");
});

test("preserved public name requires explicit World admission instead of being lost or silently promoted", async () => {
  const { service, state, threadId, thread } = fixture();
  thread.identity.name = "Fibre Thread";
  state.presentation = {
    presentation:{
      subject:{ displayName:"Maya Cohen" },
      civilIdentity:{ fibreIdentityNumber:"ABCD-12-EFGH" },
      visualIdentity:{ referenceObjectRefs:["visual_identity_reference_1"] },
      identityCard:{ officialPhotoMediaRef:"media_identity_1" },
    },
    media:{ assets:[{ mediaId:"media_identity_1", status:"ready", locator:"identity_photo_1" }] },
  };

  const diagnosis = await service.diagnose(threadId);
  const name = diagnosis.findings.find((entry) => entry.code === "NAME_UNFINISHED");
  assert.equal(name.state, "operator_decision_required", "name admission was not explicit");
  assert.equal(name.presentation, "Maya Cohen", "preserved name was lost");
  assert.equal(name.identityAction.id, "admit_name", "wrong admission action");
  assert.equal(name.identityAction.input.fields[0].default, "Maya Cohen", "candidate was not prefilled");

  const repair = await service.repair(threadId, { repairKey:"repair_preserved_name_1" });
  assert.equal(thread.identity.name, "Fibre Thread", "repair promoted projection into World");
  assert.deepEqual(repair.actions, [], "repair bypassed operator admission");
});

test("migration changes legacy authority; repair never substitutes for it", async () => {
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
    genesisSexEvidence:{ resolve() { return SEX_EVIDENCE; } },
    genesisSexMigrator:{
      migrate(current, { evidence }) {
        assert.deepEqual(evidence, SEX_EVIDENCE);
        current.identity.sex = evidence.sex;
        return { migrated:true, reused:false, sex:evidence.sex, eventId:"evt_genesis_sex_migrated", evidence };
      },
    },
    identityUpdater:NO_IDENTITY_UPDATE,
    activityRecorder:{ async record(entry) { state.activity.push(structuredClone(entry)); } },
  });

  const before = await service.diagnose(threadId);
  const missing = before.findings.find((entry) => entry.code === "SEX_MISSING");
  assert.equal(missing.migration.id, "genesis_sex_v1");
  assert.equal(missing.genesisId, SEX_EVIDENCE.genesisId);

  const repair = await service.repair(threadId, { repairKey:"repair_sex_1" });
  assert.equal(thread.identity.sex, undefined, "repair must not perform migration");
  assert.deepEqual(repair.actions, []);

  const migration = await service.migrate(threadId, {
    migrationId:"genesis_sex_v1",
    migrationKey:"migration_sex_1",
  });
  assert.equal(thread.identity.sex, "female");
  assert.equal(migration.migrated, true);
  assert.equal(migration.after.findings.find((entry) => entry.code === "SEX").state, "healthy");
  assert.equal(migration.after.health, "healthy");
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