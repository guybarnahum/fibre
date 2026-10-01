import test from "node:test";
import assert from "node:assert/strict";

import { resolveBirthPhysicalInheritance } from "#core/src/human-phenotype/index.mjs";
import { appearanceCalibrationDependencies } from "#core/src/population-context/index.mjs";
import { ACTIVITY_RECORD_VERSION, normalizeActivityRecord } from "#infra/telemetry";
import { canonicalVisualSpecificationFromPhysicalGenome } from "../src/canonical-visual-identity-from-physical-genome.mjs";
import { embodimentSpecificationDigest } from "../src/embodiment-domain.mjs";
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

function validatingActivityRecorder(state) {
  let ordinal = 0;
  return {
    async record(entry) {
      ordinal += 1;
      state.activity.push(normalizeActivityRecord({
        activityVersion:ACTIVITY_RECORD_VERSION,
        activityId:`act_repair_${ordinal}`,
        occurredAt:"2026-09-30T18:00:00.000Z",
        recordedAt:"2026-09-30T18:00:00.001Z",
        environment:"test",
        service:"world-kernel",
        deploymentGitSha:null,
        requestId:null,
        genesisId:null,
        threadId:null,
        experienceId:null,
        sessionId:null,
        correlationId:null,
        causationId:null,
        operationId:null,
        parentOperationId:null,
        message:null,
        error:null,
        ...entry,
      }));
    },
  };
}

function fixture({ symbolicGenomeMigrator = null, physicalGenomeMigrator = null, visualIdentityRepairService = null, identityUpdater = NO_IDENTITY_UPDATE } = {}) {
  const threadId = "thr_repair_1";
  const objectRef = "visual_identity_reference_1";
  const officialMediaId = "media_identity_1";
  const state = { presentation:null, rebuilt:false, visual:false, activity:[], raisedLanguages:["English"] };
  const thread = {
    threadId,
    status:"active",
    genome:{ textualTraits:{}, runtimeBaselines:{} },
    identity:{
      name:"Repair Thread",
      sex:"female",
      originOrientation:"original",
      selfDescription:"I persist.",
      birthDate:"2004-08-20",
      languages:["English"],
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
    specification:{ subject:{ description:"current embodied face" }, description:"current embodiment rule" },
    specificationDigest:`sha256:${"c".repeat(64)}`,
    asset:{ referenceObjectRef:objectRef },
  };
  const publicIdentity = {
    subject:{ displayName:"Repair Thread", birthDate:"2004-08-20", languages:["English"] },
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
            identityCard:null,
          },
          media:{ assets:[] },
        };
        return { complete:true, stage:"complete" };
      },
    },
    genesisSexEvidence:{ resolve() { return null; } },
    genesisSexMigrator:{ migrate() { throw new Error("sex migration should not run for a complete Thread"); } },
    symbolicGenomeMigrator,
    physicalGenomeMigrator,
    visualIdentityRepairService,
    genesisAuthority:{
      getRaisedLanguagesForThread() { return { languages:[...state.raisedLanguages] }; },
      correctRaisedLanguages(id, { languages }) {
        assert.equal(id, threadId);
        const previousLanguages = [...state.raisedLanguages];
        state.raisedLanguages = [...languages];
        return { changed:true, correctionId:"grc_test", languages:[...languages], previousLanguages };
      },
    },
    identityUpdater,
    activityRecorder:validatingActivityRecorder(state),
  });
  return { service, state, threadId, thread, embodiment };
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
  assert.equal(diagnosis.findings.find((entry) => entry.code === "SPOKEN_LANGUAGES").identityAction, undefined);
  assert.equal(diagnosis.findings.find((entry) => entry.code === "RAISED_LANGUAGES").identityAction.id, "change_raised_languages");
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

test("R4 canonical visual health follows the canonical projection, not FIN media", async () => {
  const { service, state, threadId } = fixture();
  state.presentation = {
    presentation:{
      subject:{ displayName:"Repair Thread", birthDate:"2004-08-20", languages:["English"] },
      civilIdentity:{ fibreIdentityNumber:"ABCD-12-EFGH" },
      visualIdentity:{ referenceObjectRefs:["visual_identity_reference_1"] },
      identityCard:null,
    },
    media:{ assets:[] },
  };
  const diagnosis = await service.diagnose(threadId);
  assert.equal(diagnosis.identity.name, "Repair Thread", "World name must remain authoritative");
  assert.equal(diagnosis.identity.sex, "female", "World sex must remain authoritative");
  assert.equal(diagnosis.identity.fibreIdentityNumber, "ABCD-12-EFGH", "civil identity must remain authoritative");
  assert.equal(diagnosis.presentation.portraitObjectRef, "visual_identity_reference_1", "canonical root was not reported");
  assert.equal(diagnosis.findings.some((entry) => entry.code === "SEX_PRESENTATION_MISSING"), false, "public Presentation must not become sex authority");
  assert.equal(diagnosis.health, "healthy", "complete authoritative identity should be healthy");
});

test("R4 distinguishes public projection omission from authoritative Genesis absence", async () => {
  const { service, state, threadId } = fixture();
  state.presentation = {
    presentation:{
      subject:{ birthDate:"2004-08-20", languages:["English"] },
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
      subject:{ displayName:"Old Name", birthDate:"2004-08-20", languages:["English"] },
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
      subject:{ displayName:"Different Thread", birthDate:"2004-08-20", languages:["English"] },
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
    genesisAuthority:{
      getRaisedLanguagesForThread() { return { languages:["English"] }; },
      correctRaisedLanguages() { throw new Error("diagnosis must not correct Genesis"); },
    },
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

test("legacy demographic Raised-language list requires explicit operator review", async () => {
  const { service, state, threadId } = fixture();
  state.raisedLanguages = ["Hebrew", "Arabic", "English", "Russian", "Amharic"];
  state.presentation = {
    presentation:{
      subject:{
        displayName:"Repair Thread",
        birthDate:"2004-08-20",
        languages:["Hebrew", "Arabic", "English", "Russian", "Amharic"],
      },
      civilIdentity:{ fibreIdentityNumber:"ABCD-12-EFGH" },
      visualIdentity:{ referenceObjectRefs:["visual_identity_reference_1"] },
      identityCard:{ officialPhotoMediaRef:"media_identity_1" },
    },
    media:{ assets:[{ mediaId:"media_identity_1", status:"ready", locator:"identity_photo_1" }] },
  };

  const diagnosis = await service.diagnose(threadId);
  const finding = diagnosis.findings.find((entry) => entry.code === "RAISED_LANGUAGES_NEED_REVIEW");
  assert.equal(diagnosis.health, "operator_decision_required");
  assert.deepEqual(finding.authoritative, ["Hebrew", "Arabic", "English", "Russian", "Amharic"]);
  assert.equal(finding.identityAction.id, "change_raised_languages");
  assert.equal(finding.identityAction.input.fields[0].default, "Hebrew, Arabic, English, Russian, Amharic");
});

test("missing birth date requires explicit operator admission and preserves Presentation evidence", async () => {
  const { service, state, threadId, thread } = fixture();
  delete thread.identity.birthDate;
  state.presentation = {
    presentation:{
      subject:{ displayName:"Repair Thread", birthDate:"2004-08-20", languages:["English"] },
      civilIdentity:{ fibreIdentityNumber:"ABCD-12-EFGH" },
      visualIdentity:{ referenceObjectRefs:["visual_identity_reference_1"] },
      identityCard:{ officialPhotoMediaRef:"media_identity_1" },
    },
    media:{ assets:[{ mediaId:"media_identity_1", status:"ready", locator:"identity_photo_1" }] },
  };

  const diagnosis = await service.diagnose(threadId);
  const birthDate = diagnosis.findings.find((entry) => entry.code === "BIRTH_DATE_MISSING");
  assert.equal(diagnosis.health, "operator_decision_required");
  assert.equal(birthDate.presentation, "2004-08-20");
  assert.equal(birthDate.identityAction.id, "admit_birth_date");
  assert.equal(birthDate.identityAction.input.fields[0].default, "2004-08-20");

  const repair = await service.repair(threadId, { repairKey:"repair_preserved_birth_date_1" });
  assert.equal(thread.identity.birthDate, undefined, "repair promoted Presentation birth date into World");
  assert.deepEqual(repair.actions, [], "repair bypassed operator birth-date admission");
});

test("preserved public name requires explicit World admission instead of being lost or silently promoted", async () => {
  const { service, state, threadId, thread } = fixture();
  thread.identity.name = "Fibre Thread";
  state.presentation = {
    presentation:{
      subject:{ displayName:"Maya Cohen", birthDate:"2004-08-20", languages:["English"] },
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
      subject:{ displayName:"Repair Thread", birthDate:"2004-08-20", languages:["English"] },
      civilIdentity:{ fibreIdentityNumber:"ABCD-12-EFGH" },
      visualIdentity:{ referenceObjectRefs:["visual_identity_reference_1"] },
      identityCard:{ officialPhotoMediaRef:"media_identity_1" },
    },
    media:{ assets:[{ mediaId:"media_identity_1", status:"ready", locator:"identity_photo_1" }] },
  };
  const service = createThreadGenesisRepairService({
    worldReader:{ getThread() { return thread; } },
    civilRegistry:{ getCivilRegistrationByThreadId() { return { fibreIdentityNumber:"ABCD-12-EFGH" }; } },
    embodimentReader:{
      listCurrent() {
        const specification={ subject:{ description:"stable face" }, description:"stable visual rule" };
        return [{
          embodimentId:"emb_repair_1",
          kind:"portrait",
          visibility:"public",
          status:"available",
          specification,
          specificationDigest:embodimentSpecificationDigest(specification),
          asset:{ referenceObjectRef:"visual_identity_reference_1" },
        }];
      },
    },
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
    genesisAuthority:{
      getRaisedLanguagesForThread() { return { languages:["English"] }; },
      correctRaisedLanguages() { throw new Error("migration must not correct Genesis languages"); },
    },
    identityUpdater:NO_IDENTITY_UPDATE,
    activityRecorder:validatingActivityRecorder(state),
  });

  const before = await service.diagnose(threadId);
  const missing = before.findings.find((entry) => entry.code === "SEX_MISSING");
  assert.equal(missing.migration.id, "genesis_sex_v1");
  assert.equal(missing.migration.domain, "identity");
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
  assert.deepEqual(
    state.activity.filter((entry) => entry.stage.startsWith("thread.migration.")).map((entry) => entry.stage),
    ["thread.migration.start", "thread.migration.genesis_sex", "thread.migration.complete"],
    "successful migration vanished from Activity",
  );
});

test("legacy embodiment migration admits explicit North-African physical ancestry", async () => {
  const ancestry=[{population:"Moroccan family",share:1,referencePopulation:"afr_north"}];
  let repairInput=null;
  const physicalGenomeMigrator={
    migrate(thread,{physicalAncestry,operationKey}){
      assert.equal(operationKey,"legacy_physical_repair_1");
      assert.deepEqual(physicalAncestry,{maternal:ancestry,paternal:ancestry});
      const physicalGenome=resolveBirthPhysicalInheritance({
        maternalAncestry:ancestry,
        paternalAncestry:ancestry,
        seed:"legacy-physical-service-test",
      }).genome;
      thread.genome.physical=physicalGenome;
      return{
        migrated:true,
        reused:false,
        eventId:"evt_physical_genome_migrated_1",
        physicalAncestry,
        physicalGenome,
        thread,
      };
    },
  };
  const visualIdentityRepairService={
    repair(input){
      repairInput=structuredClone(input);
      return{
        threadId:input.threadId,
        operationKey:input.operationKey,
        embodiment:{
          revision:3,
          status:"pending_generation",
          specification:input.correctedSpecification,
          specificationDigest:"sha256:"+("d".repeat(64)),
        },
      };
    },
  };
  const {service,threadId,thread}=fixture({physicalGenomeMigrator,visualIdentityRepairService});

  const before=await service.diagnose(threadId);
  const legacy=before.findings.find(entry=>entry.code==="LEGACY_PHYSICAL_EMBODIMENT");
  assert.equal(legacy.state,"healthy");
  assert.equal(legacy.migration.id,"physical_embodiment_v2");
  assert.equal(legacy.migration.domain,"appearance");
  const maternalReference=legacy.migration.input.fields.find(
    field=>field.name==="maternalReferencePopulation",
  );
  assert.ok(maternalReference.options.includes("afr_north"),
    "North Africa is unavailable to appearance migration");
  assert.ok(maternalReference.options.includes("afr_south"),
    "Southern Africa is unavailable to appearance migration");

  const result=await service.migrate(threadId,{
    migrationId:"physical_embodiment_v2",
    migrationKey:"legacy_physical_repair_1",
    input:{
      physicalAncestry:{maternal:ancestry,paternal:ancestry},
      reason:"Replace the materially incorrect legacy visual authority from operator-confirmed physical ancestry.",
    },
  });

  assert.equal(result.migrated,true);
  assert.equal(thread.genome.physical.version,"physical-genome-v0.3","migration did not establish physical authority");
  assert.equal(repairInput.correctedSpecification.method,
    "layered canonical synthetic portrait specification derived from the Thread's inherited physical genome");
  assert.deepEqual(repairInput.evidenceReferences,["evt_physical_genome_migrated_1"],
    "visual correction was not grounded in the migration event");
  assert.equal(result.after.findings.find(entry=>entry.code==="PHYSICAL_GENOME").state,"healthy");
});

test("current physical genome upgrades a legacy visual spec without rewriting genetics",async()=>{
  const ancestry=[{population:"Polynesian family",share:1,referencePopulation:"oceania.polynesia"}];
  const physicalGenome=resolveBirthPhysicalInheritance({
    maternalAncestry:ancestry,
    paternalAncestry:ancestry,
    seed:"current-genome-visual-model-upgrade",
  }).genome;
  let physicalCalls=0;
  let repairInput=null;
  const physicalGenomeMigrator={
    migrate(){physicalCalls+=1;throw new Error("visual-model upgrade must not rewrite physical authority");},
  };
  const visualIdentityRepairService={
    repair(input){
      repairInput=structuredClone(input);
      embodiment.specification=input.correctedSpecification;
      embodiment.specificationDigest=embodimentSpecificationDigest(input.correctedSpecification);
      embodiment.status="pending_generation";
      embodiment.asset=null;
      return{
        threadId:input.threadId,
        operationKey:input.operationKey,
        embodiment:structuredClone(embodiment),
      };
    },
  };
  const {service,threadId,thread,embodiment}=fixture({
    physicalGenomeMigrator,
    visualIdentityRepairService,
  });
  thread.genome.physical=structuredClone(physicalGenome);
  embodiment.representationKind="synthetic_generation";

  const before=await service.diagnose(threadId);
  const visualUpgrade=before.findings.find(entry=>entry.code==="CANONICAL_VISUAL_MODEL_OUTDATED");
  assert.equal(visualUpgrade.state,"migration_required");
  assert.equal(visualUpgrade.migration.label,"Upgrade visual model");
  assert.deepEqual(
    visualUpgrade.migration.input.fields.map(field=>field.name),
    ["reason"],
    "renderer migration unexpectedly requested ancestry",
  );

  const originalGenome=structuredClone(thread.genome.physical);
  const result=await service.migrate(threadId,{
    migrationId:"physical_embodiment_v2",
    migrationKey:"visual_model_upgrade_1",
    input:{reason:"Upgrade the canonical render specification while preserving the exact current physical genome."},
  });

  assert.equal(physicalCalls,0,"visual-model upgrade invoked physical migration");
  assert.deepEqual(thread.genome.physical,originalGenome,"visual-model upgrade changed physical genome");
  assert.equal(result.physicalMigrated,false);
  assert.equal(result.visualMigrated,true);
  assert.equal(repairInput.correctedSpecification.method,
    "layered canonical synthetic portrait specification derived from the Thread's inherited physical genome");
  assert.deepEqual(repairInput.evidenceReferences,[],"visual-model upgrade invented a physical migration witness");
  assert.equal(result.after.findings.some(entry=>entry.code==="CANONICAL_VISUAL_MODEL_OUTDATED"),false);
});

test("legacy embodiment migration retry resumes its matching pending canonical supersession", async () => {
  const ancestry=[{population:"operator-confirmed Sichuan Chinese family",share:1,referencePopulation:"east_asia"}];
  const physicalGenome=resolveBirthPhysicalInheritance({
    maternalAncestry:ancestry,
    paternalAncestry:ancestry,
    seed:"legacy-physical-retry-test",
  }).genome;
  let repairCalls=0;
  const physicalGenomeMigrator={
    migrate(thread,{physicalAncestry,operationKey}){
      assert.equal(operationKey,"legacy_physical_retry_1");
      assert.deepEqual(physicalAncestry,{maternal:ancestry,paternal:ancestry});
      assert.deepEqual(thread.genome.physical,physicalGenome);
      return{
        migrated:false,
        reused:true,
        eventId:"evt_physical_genome_migrated_retry_1",
        physicalAncestry,
        physicalGenome,
        thread,
      };
    },
  };
  const visualIdentityRepairService={
    repair(){
      repairCalls+=1;
      throw new Error("matching pending supersession must be resumed, not appended again");
    },
  };
  const {service,threadId,thread,embodiment}=fixture({physicalGenomeMigrator,visualIdentityRepairService});
  thread.genome.physical=physicalGenome;
  const specification=canonicalVisualSpecificationFromPhysicalGenome({
    threadId,
    sex:thread.identity.sex,
    physicalGenome,
  });
  embodiment.status="pending_generation";
  embodiment.asset=null;
  embodiment.specification=specification;
  embodiment.specificationDigest=embodimentSpecificationDigest(specification);

  const result=await service.migrate(threadId,{
    migrationId:"physical_embodiment_v2",
    migrationKey:"legacy_physical_retry_1",
    input:{
      physicalAncestry:{maternal:ancestry,paternal:ancestry},
      reason:"Resume the interrupted legacy physical embodiment migration without creating another canonical supersession.",
    },
  });

  assert.equal(result.migrated,false,"retry rewrote physical authority");
  assert.equal(result.result.reused,true,"retry did not reuse the physical migration event");
  assert.equal(result.visualIdentityCorrection.reused,true,"retry appended another canonical supersession");
  assert.equal(result.visualIdentityCorrection.embodiment.status,"pending_generation","retry lost pending visual work");
  assert.equal(repairCalls,0,"retry created a second canonical supersession");
});

test("Fix restores unambiguous malformed birth geography from existing World identity", async () => {
  const identityUpdater = {
    update(current, { birthPlace, operationKey }) {
      assert.equal(operationKey, "repair_birth_geography_1.birth_geography");
      current.identity.birthCity = birthPlace.displayName;
      current.identity.birthPlace = structuredClone(birthPlace);
      return {
        changed:true,
        eventId:"evt_birth_geography_repaired",
        changes:{ birthCity:birthPlace.displayName, birthPlace:structuredClone(birthPlace) },
        thread:current,
      };
    },
  };
  const { service, state, threadId, thread } = fixture({ identityUpdater });
  thread.identity.birthCity = "Hilo, Hawaii, United SAtates";
  thread.identity.birthPlace = {
    displayName:"Hilo, Hawaii, United SAtates",
    country:"United SAtates",
    city:"Hilo, Hawaii",
    lat:19.70737,
    long:-155.08158,
  };
  state.presentation = {
    presentation:{
      subject:{ displayName:"Repair Thread", birthDate:"2004-08-20", languages:["English"] },
      civilIdentity:{ fibreIdentityNumber:"ABCD-12-EFGH" },
      visualIdentity:{ referenceObjectRefs:["visual_identity_reference_1"] },
      identityCard:null,
    },
    media:{ assets:[] },
  };

  const before = await service.diagnose(threadId);
  const finding = before.findings.find((entry) => entry.code === "BIRTH_GEOGRAPHY_RECOVERABLE");
  assert.equal(finding.action, "repair_birth_geography", "unambiguous birthplace was not repairable");
  assert.equal(finding.recovered.displayName, "Hilo, Hawaii, United States");

  const result = await service.repair(threadId, { repairKey:"repair_birth_geography_1" });

  assert.deepEqual(result.actions.map((entry) => entry.action), ["repair_birth_geography"], "Fix did more than birth geography repair");
  assert.equal(thread.identity.birthCity, "Hilo, Hawaii, United States");
  assert.deepEqual(thread.identity.birthPlace, {
    displayName:"Hilo, Hawaii, United States",
    country:"United States",
    city:"Hilo, Hawaii",
    lat:19.70737,
    long:-155.08158,
  });
  assert.equal(result.after.findings.some((entry) => entry.code === "BIRTH_GEOGRAPHY_RECOVERABLE"), false);
  assert.equal(result.after.health, "healthy");
});


test("birth geography recovery ignores punctuation noise without guessing locality", async () => {
  const { service, threadId, thread } = fixture();
  thread.identity.birthCity = "San Francisco Califronia,, USA";

  const diagnosis = await service.diagnose(threadId);
  const finding = diagnosis.findings.find((entry) => entry.code === "BIRTH_GEOGRAPHY_RECOVERABLE");

  assert.equal(finding?.action, "repair_birth_geography", "punctuation hid recoverable birthplace");
  assert.equal(finding.recovered.displayName, "San Francisco, California, United States");
});

test("safe birth geography repair is not blocked by unrelated operator input", async () => {
  const identityUpdater = {
    update(current, { birthPlace }) {
      current.identity.birthCity = birthPlace.displayName;
      current.identity.birthPlace = structuredClone(birthPlace);
      return { changed:true, eventId:"evt_birth_geography_repaired", changes:{ birthPlace }, thread:current };
    },
  };
  const { service, threadId, thread } = fixture({ identityUpdater });
  thread.identity.birthCity = "Hilo, Hawaii, United SAtates";
  delete thread.identity.birthDate;

  const before = await service.diagnose(threadId);
  assert.equal(before.health, "operator_decision_required");
  assert.ok(before.findings.some((entry) => entry.code === "BIRTH_GEOGRAPHY_RECOVERABLE"));

  const result = await service.repair(threadId, { repairKey:"repair_birth_geography_with_input_pending" });

  assert.equal(thread.identity.birthCity, "Hilo, Hawaii, United States", "safe geography repair stayed blocked");
  assert.equal(result.after.health, "operator_decision_required", "repair hid unresolved operator input");
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
  assert.equal(repair[0].parentOperationId, null);
  assert.equal(repair.slice(1).every((entry) => entry.parentOperationId === "repair_test_1"), true);
  assert.deepEqual(repair.slice(1).map((entry) => entry.operationId), [
    "repair_test_1.presentation",
    "repair_test_1.visual",
    "repair_test_1.complete",
  ]);
});

test("symbolic genome migration is explicit, preserves repair separation, and converges diagnosis", async () => {
  let legacy = true;
  const symbolicGenomeMigrator = {
    inspectThreadGenomeMigration() {
      return legacy
        ? { state:"legacy_v1_de_novo", genomeIds:["genome_legacy"], legacyGenomeIds:["genome_legacy"] }
        : { state:"current", genomeIds:["genome_legacy"] };
    },
    migrateThreadGenomeV1ToV2() {
      legacy = false;
      return {
        migrated:true,
        genomes:[{
          genomeId:"genome_legacy",
          beforeDigest:`sha256:${"a".repeat(64)}`,
          afterDigest:`sha256:${"b".repeat(64)}`,
        }],
      };
    },
  };
  const { service, state, threadId } = fixture({ symbolicGenomeMigrator });

  const before = await service.diagnose(threadId);
  assert.equal(before.health, "migration_required");
  const symbolicMigration=before.findings.find((entry) => entry.code === "SYMBOLIC_GENOME_V1").migration;
  assert.equal(symbolicMigration.id, "symbolic_genome_v1_to_v2");
  assert.equal(symbolicMigration.domain, "identity");

  const repair = await service.repair(threadId, { repairKey:"repair_before_genome_migration" });
  assert.deepEqual(repair.actions, [], "ordinary repair performed an authoritative genome migration");

  const migration = await service.migrate(threadId, {
    migrationId:"symbolic_genome_v1_to_v2",
    migrationKey:"migration_symbolic_genome_v2",
  });
  assert.equal(migration.migrated, true);
  assert.equal(migration.after.findings.some((entry) => entry.code === "SYMBOLIC_GENOME_V1"), false);
  assert.deepEqual(
    state.activity.filter((entry) => entry.stage.startsWith("thread.migration.")).map((entry) => entry.stage),
    ["thread.migration.start", "thread.migration.symbolic_genome", "thread.migration.complete"],
  );
});


test("outdated appearance model reuses durable ancestry evidence", async () => {
  const ancestry=[{population:"operator-confirmed Chinese family",share:1,referencePopulation:"east_asia.han_chinese"}];
  const physicalAncestry={maternal:ancestry,paternal:ancestry};
  let migrationInput=null;
  let evidence={
    eventId:"evt_prior_physical_migration",
    recordedAt:"2026-09-27T18:00:00.000Z",
    physicalAncestry,
    physicalGenomeVersion:"physical-genome-v0.1",
    previousPhysicalGenomeVersion:null,
    calibrationDependencies:null,
  };
  const physicalGenomeMigrator={
    latestEvidence(){return evidence;},
    migrate(thread,input){
      migrationInput=structuredClone(input);
      const physicalGenome=resolveBirthPhysicalInheritance({
        maternalAncestry:physicalAncestry.maternal,
        paternalAncestry:physicalAncestry.paternal,
        seed:"appearance-upgrade-test",
      }).genome;
      thread.genome.physical=physicalGenome;
      const calibrationDependencies=appearanceCalibrationDependencies(physicalAncestry);
      evidence={
        eventId:"evt_physical_upgrade_v02",
        recordedAt:"2026-09-30T20:00:00.000Z",
        physicalAncestry,
        physicalGenomeVersion:physicalGenome.version,
        previousPhysicalGenomeVersion:"physical-genome-v0.1",
        calibrationDependencies,
        previousCalibrationDependencies:null,
      };
      return{
        migrated:true,
        reused:false,
        eventId:"evt_physical_upgrade_v02",
        physicalAncestry,
        calibrationDependencies,
        previousCalibrationDependencies:null,
        physicalGenome,
        thread,
      };
    },
  };
  const visualIdentityRepairService={
    repair(input){
      return{
        threadId:input.threadId,
        operationKey:input.operationKey,
        embodiment:{
          revision:3,
          status:"pending_generation",
          specification:input.correctedSpecification,
          specificationDigest:embodimentSpecificationDigest(input.correctedSpecification),
        },
      };
    },
  };
  const {service,threadId,thread}=fixture({physicalGenomeMigrator,visualIdentityRepairService});
  const oldGenome=resolveBirthPhysicalInheritance({
    maternalAncestry:ancestry,
    paternalAncestry:ancestry,
    seed:"old-appearance-model",
  }).genome;
  oldGenome.version="physical-genome-v0.1";
  thread.genome.physical=oldGenome;

  const before=await service.diagnose(threadId);
  const outdated=before.findings.find(entry=>entry.code==="PHYSICAL_APPEARANCE_MODEL_OUTDATED");
  assert.equal(outdated.state,"migration_required");
  assert.equal(outdated.currentVersion,"physical-genome-v0.1");
  assert.equal(outdated.targetVersion,"physical-genome-v0.3");
  assert.deepEqual(outdated.migration.evidence.physicalAncestry,physicalAncestry);
  assert.deepEqual(
    outdated.migration.input.fields.map(field=>field.name),
    ["reason"],
    "upgrade asked operator to re-enter durable ancestry",
  );
  assert.ok(
    outdated.migration.input.fields[0].default?.length>16,
    "appearance upgrade did not prefill its routine reason",
  );

  const result=await service.migrate(threadId,{
    migrationId:"physical_embodiment_v2",
    migrationKey:"physical_upgrade_v02",
    input:{reason:"Upgrade the Thread to the calibrated physical appearance model using its recorded ancestry evidence."},
  });

  assert.deepEqual(migrationInput.physicalAncestry,physicalAncestry,"upgrade did not reuse durable ancestry");
  assert.equal(thread.genome.physical.version,"physical-genome-v0.3");
  const currentPhysical=result.after.findings.find(entry=>entry.code==="PHYSICAL_GENOME");
  assert.equal(currentPhysical.state,"healthy");
  assert.deepEqual(currentPhysical.evidence.physicalAncestry,physicalAncestry,
    "current appearance hid its recorded parental-origin evidence");
  assert.equal(result.after.findings.some(entry=>entry.code==="PHYSICAL_APPEARANCE_MODEL_OUTDATED"),false);
});



test("calibration drift is an explicit Appearance migration", async () => {
  const ancestry=[{population:"Moroccan family",share:1,referencePopulation:"afr_north.morocco"}];
  const physicalAncestry={maternal:ancestry,paternal:ancestry};
  const physicalGenome=resolveBirthPhysicalInheritance({
    maternalAncestry:ancestry,
    paternalAncestry:ancestry,
    seed:"calibration-domain-test",
  }).genome;
  const currentDependencies=appearanceCalibrationDependencies(physicalAncestry);
  const storedDependencies=structuredClone(currentDependencies);
  storedDependencies[0].dependencyChain.at(-1).version=0;

  const physicalGenomeMigrator={
    latestEvidence(){
      return {
        eventId:"evt_calibration_domain",
        recordedAt:"2026-09-30T22:00:00.000Z",
        physicalAncestry,
        physicalGenomeVersion:physicalGenome.version,
        calibrationDependencies:storedDependencies,
      };
    },
    migrate(){throw new Error("diagnosis must not migrate");},
  };
  const {service,threadId,thread}=fixture({physicalGenomeMigrator});
  thread.genome.physical=physicalGenome;

  const diagnosis=await service.diagnose(threadId);
  const finding=diagnosis.findings.find((entry)=>entry.code==="PHYSICAL_APPEARANCE_CALIBRATION_OUTDATED");

  assert.equal(finding.state,"migration_required");
  assert.equal(finding.migration.domain,"appearance",
    "calibration drift was not exposed through the shared Appearance migration path");
  assert.equal(finding.migration.id,"physical_embodiment_v2");
});

test("canonical visual diagnosis follows current Embodiment, not stale Genesis seed", async () => {
  const {service,threadId,thread,embodiment}=fixture();
  thread.identity.canonicalVisualIdentity.specification={
    subject:{description:"stale Genesis face"},
    description:"stale Genesis rule",
  };
  embodiment.specification={
    subject:{description:"current genome-derived face"},
    description:"current Embodiment rule",
  };

  const diagnosis=await service.diagnose(threadId);
  const visual=diagnosis.findings.find(entry=>entry.code==="CANONICAL_VISUAL_SPEC");
  assert.equal(visual.state,"healthy");
  assert.equal(visual.authority,"embodiment","diagnosis treated Genesis seed as current visual authority");
  assert.equal(visual.specificationDigest,embodiment.specificationDigest);
});


test("appearance migration suggests birthplace defaults without treating them as evidence", async () => {
  const physicalGenomeMigrator={
    latestEvidence(){return null;},
    migrate(){throw new Error("migration should not run during diagnosis");},
  };

  const morocco=fixture({physicalGenomeMigrator});
  morocco.thread.identity.birthPlace={
    displayName:"Fes, Morocco",
    country:"Morocco",
    city:"Fes",
    lat:34.03313,
    long:-5.00028,
  };
  morocco.thread.identity.birthCity="Fes, Morocco";

  const diagnosis=await morocco.service.diagnose(morocco.threadId);
  const physical=diagnosis.findings.find(entry=>entry.code==="LEGACY_PHYSICAL_EMBODIMENT");
  assert.equal(physical.migration.evidence,null,"birthplace suggestion became ancestry evidence");
  assert.equal(physical.migration.suggestion.country,"Morocco");
  assert.deepEqual(
    Object.fromEntries(physical.migration.input.fields.map(field=>[field.name,field.default])),
    {
      maternalOrigin:"Moroccan family",
      maternalReferencePopulation:"afr_north.morocco",
      paternalOrigin:"Moroccan family",
      paternalReferencePopulation:"afr_north.morocco",
      reason:"Install physical-genome-v0.3 using Fibre's preselected parental physical-origin defaults for Morocco; review or override them if needed.",
    },
    "Moroccan migration defaults are not useful",
  );

  const unitedStates=fixture({physicalGenomeMigrator});
  unitedStates.thread.identity.birthPlace={
    displayName:"Chicago, United States",
    country:"United States",
    city:"Chicago",
    lat:41.85003,
    long:-87.65005,
  };
  unitedStates.thread.identity.birthCity="Chicago, United States";
  const diverse=await unitedStates.service.diagnose(unitedStates.threadId);
  const diversePhysical=diverse.findings.find(entry=>entry.code==="LEGACY_PHYSICAL_EMBODIMENT");
  assert.equal(diversePhysical.migration.suggestion,null,"diverse birthplace invented ancestry defaults");
  assert.equal(
    diversePhysical.migration.input.fields.find(field=>field.name==="maternalReferencePopulation").default,
    undefined,
    "diverse birthplace preselected a physical reference",
  );
});
