import assert from "node:assert/strict";
import test from "node:test";

import { createThreadPresentationVisualPublicationReconciler } from "../src/visual-publication-reconciler.mjs";

function embodiment(threadId = "thr_visual_fid_001") {
  return {
    embodimentId:`emb_${threadId}`,
    revision:3,
    threadId,
    kind:"portrait",
    visibility:"public",
    status:"available",
    asset:{ referenceObjectRef:`visual_identity_reference_${threadId}` },
  };
}

function snapshot(threadId) {
  return {
    pointer:{
      threadId,
      objectRef:`snapshot_${threadId}`,
      snapshotDigest:`sha256:${"a".repeat(64)}`,
    },
    snapshot:{
      presentation:{
        manifest:{ threadId, generatedAt:"2026-09-24T16:00:00Z" },
        civilIdentity:{ registeredAt:"2026-09-24T15:59:00Z" },
      },
      media:{ assets:[] },
      provenance:{},
    },
  };
}

function demandService() {
  return { async reconcile() { throw new Error("not reached"); } };
}

test("admitted canonical identity automatically converges through the FID lifecycle", async () => {
  const visual = embodiment();
  const current = snapshot(visual.threadId);
  const fidCalls = [];
  let projections = 0;
  const reconciler = createThreadPresentationVisualPublicationReconciler({
    presentationServer:{
      async getSnapshot() { return current; },
      async publishSnapshot() { throw new Error("not reached"); },
    },
    infra:{},
    selectProviderProfile() { return "unused"; },
    createDemandService:() => demandService(),
    createVisualRewrite() {
      return {
        async project() {
          projections += 1;
          return { reused:projections > 1 };
        },
      };
    },
    async ensureFid(input) {
      fidCalls.push(input);
      if (fidCalls.length === 1) {
        return { complete:false, state:"derivation_requested", derivation:{ jobId:"fid_photo_job_1" } };
      }
      return {
        complete:true,
        state:"active",
        credential:{ credentialId:"fidc_visual_001", revision:1 },
      };
    },
  });

  const first = await reconciler.reconcileAvailableEmbodiment({
    threadId:visual.threadId,
    embodiment:visual,
    observedAt:"2026-09-24T16:01:00Z",
  });
  const second = await reconciler.reconcileAvailableEmbodiment({
    threadId:visual.threadId,
    embodiment:visual,
    observedAt:"2026-09-24T16:02:00Z",
  });

  assert.equal(first.stage, "fid_pending", "FID derivation was not left retryable");
  assert.equal(second.complete, true, "FID lifecycle did not converge");
  assert.equal(second.detail.fidCredentialId, "fidc_visual_001", "active FIN Card was not projected");
  assert.equal(fidCalls[0].idempotencyKey, fidCalls[1].idempotencyKey, "FID retry changed issuance identity");
  assert.equal(fidCalls[0].threadId, visual.threadId, "FID issuance targeted another Thread");
  assert.equal(
    fidCalls[0].canonicalReferenceObjectRef,
    visual.asset.referenceObjectRef,
    "FID issuance was not bound to the canonical root",
  );
});

test("visual reconciliation waits for newborn Presentation before issuing identity media", async () => {
  const visual = embodiment("thr_visual_waiting");
  let touched = false;
  const reconciler = createThreadPresentationVisualPublicationReconciler({
    presentationServer:{
      async getSnapshot() { return null; },
      async publishSnapshot() { touched = true; },
    },
    infra:{},
    selectProviderProfile() { touched = true; return "unused"; },
    createDemandService:() => demandService(),
    createVisualRewrite() { touched = true; return {}; },
    async ensureFid() { touched = true; },
  });

  const result = await reconciler.reconcileAvailableEmbodiment({
    threadId:visual.threadId,
    embodiment:visual,
    observedAt:"2026-09-24T16:01:00Z",
  });

  assert.equal(result.stage, "awaiting_genesis_projection");
  assert.equal(touched, false, "identity work ran before newborn Presentation existed");
});

test("an enacted public present becomes durable Presentation and can request a scene depiction", async () => {
  const threadId = "thr_public_present_continuity";
  const present = {
    presentVersion:"thread-public-present-v0.1",
    situationId:"sit_public_present_continuity",
    establishedAt:"2026-09-20T17:00:00Z",
    phase:"at_place",
    location:{ kind:"place", place:{ displayName:"Harbor café", region:"Haifa District" } },
    mediatedContext:null,
    activity:"Sketching boats moving through the harbor.",
    reason:null,
    participants:[],
    depictionMediaId:"media_present_continuity",
  };
  let catalog = { publiclyVisible:true };
  let appended = null;
  let demand = null;

  const reconciler = createThreadPresentationVisualPublicationReconciler({
    presentationServer:{
      async getSnapshot() {
        return {
          pointer:{ threadId, objectRef:"snapshot_present", snapshotDigest:`sha256:${"e".repeat(64)}` },
          snapshot:{ presentation:{ manifest:{ threadId }, visualIdentity:null }, media:{ assets:[] }, provenance:{} },
        };
      },
      async publishSnapshot() { throw new Error("not reached"); },
      async appendEvent(event) {
        appended = event;
        return { event:{ ...event, sequence:7 }, duplicate:false };
      },
    },
    infra:{
      catalog:{
        async get() { return catalog; },
        async upsert(_key, value) { catalog = value; return value; },
      },
    },
    selectProviderProfile({ requiresReferenceObjects }) {
      assert.equal(requiresReferenceObjects, false);
      return "scene-provider";
    },
    createDemandService() {
      return {
        async reconcile(input) {
          demand = input;
          return { changed:true };
        },
      };
    },
    createVisualRewrite() { return { async project() { throw new Error("not reached"); } }; },
    async ensureFid() { throw new Error("not reached"); },
  });

  const result = await reconciler.publishCurrentPresent({ threadId, present });

  assert.equal(appended.kind, "present.updated");
  assert.equal(catalog.currentPresent.event.payload.activity, present.activity);
  assert.deepEqual(demand.scope, { entityKind:"experience", entityRef:present.situationId });
  assert.equal(demand.slots[0].role, "present_scene");
  assert.equal(result.event.sequence, 7);
});


test("identity-media convergence emits one observable checkpoint", async () => {
  const visual = embodiment("thr_visual_activity");
  const records = [];
  const reconciler = createThreadPresentationVisualPublicationReconciler({
    presentationServer:{
      async getSnapshot() { return snapshot(visual.threadId); },
      async publishSnapshot() { throw new Error("not reached"); },
    },
    infra:{},
    selectProviderProfile() { return "unused"; },
    createDemandService:() => demandService(),
    createVisualRewrite() {
      return { async project() { return { reused:true }; } };
    },
    async ensureFid() {
      return {
        complete:true,
        state:"active",
        credential:{ credentialId:"fidc_visual_activity", revision:2 },
        presentation:{ changed:true },
      };
    },
    activityRecorder:{
      async record(record) { records.push(record); },
      async runStage() { throw new Error("not reached"); },
    },
  });

  const result = await reconciler.reconcileAvailableEmbodiment({
    threadId:visual.threadId,
    embodiment:visual,
    observedAt:"2026-09-24T16:03:00Z",
  });

  assert.equal(result.complete,true);
  assert.deepEqual(
    records.filter((record)=>record.stage==="presentation.identity_media.ensure")
      .map((record)=>record.status),
    ["succeeded"],
    "current identity media was not observable in Activity",
  );
});

test("admitted age portraits condition current scenes without changing canonical authority",async()=>{
  const threadId="thr_present_age_continuity";
  const rootRef="canonical_visual_present";
  const rootDigest="sha256:"+"a".repeat(64);
  const admitted=(age,ref,overrides={})=>({
    contract:"visual-age-anchor-admission-v0.1",
    admissionId:"age_admission_"+ref,threadId,targetAgeYears:age,
    portraitObjectRef:ref,portraitDigest:"sha256:"+"b".repeat(64),
    canonicalReferenceObjectRef:rootRef,canonicalReferenceDigest:rootDigest,
    sourceAnchorRefs:[],generationReceiptRef:"receipt_"+ref,
    approvalRef:"approval_"+ref,admittedAt:"2026-10-19T00:00:00.000Z",
    ...overrides,
  });
  let approved=[admitted(10,"age_10"),admitted(35,"age_35"),admitted(40,"age_40"),
    admitted(36,"foreign_36",{threadId:"thr_other"}),
    admitted(36,"retired_36",{canonicalReferenceDigest:"sha256:"+"e".repeat(64)})];
  const presentation={
    manifest:{threadId},subject:{birthDate:"1990-01-01"},
    visualIdentity:{
      projectionVersion:"thread-visual-identity-projection-v0.1",
      authority:"authorized_embodiment_projection",
      embodimentId:"emb_present_root",embodimentRevision:1,
      specificationDigest:"sha256:"+"f".repeat(64),
      subjectDescription:"The same recognizable person.",
      renderDescription:"Neutral photographic reference.",
      sourceReferences:["emb_present_root"],
      permissionReferences:[],referenceObjectRefs:[rootRef],
      provenanceRef:"prov_present_root",
    },
  };
  const present={
    situationId:"sit_age_continuity",
    depictionMediaId:"media_age_continuity",
    establishedAt:"2026-10-19T12:00:00Z",
    phase:"at_place",
    location:{kind:"place",place:{displayName:"the café",region:null}},
    activity:"Reading at a table.",reason:null,mediatedContext:null,participants:[],
  };
  let recorded;
  const current={pointer:{threadId},snapshot:{presentation}};
  const reconciler=createThreadPresentationVisualPublicationReconciler({
    presentationServer:{
      async getSnapshot(){return current;},
      async publishSnapshot(){throw new Error("not reached");},
      async appendEvent(event){return{event:{...event,sequence:1},duplicate:false};},
    },
    infra:{
      objects:{async head(ref){
        assert.equal(ref,rootRef,"noncanonical object was treated as identity root");
        return{digest:rootDigest};
      }},
      catalog:{
        async get(){return{publiclyVisible:true};},
        async upsert(){},
        async list({prefix}){
          assert.equal(prefix,"visual-age-anchor:admission:"+threadId+":");
          return{entries:approved.map((value,i)=>({key:prefix+i,value})),nextCursor:null};
        },
      },
    },
    selectProviderProfile:()=> "age-scene-provider",
    createDemandService:()=>({async reconcile(input){recorded=input;return{changed:true};}}),
    createVisualRewrite:()=>({}),
    async ensureFid(){throw new Error("not reached");},
  });
  await reconciler.publishCurrentPresent({threadId,present});
  const first=recorded.slots[0];
  assert.deepEqual(first.referenceObjectRefs,[rootRef,"age_35","age_40"],
    "Scene did not use nearest admitted ages with canonical identity first");
  assert.ok(first.brief.description.includes("image 2 is the admitted age-35 portrait")
    && first.brief.description.includes("image 3 is the admitted age-40 portrait"),
    "Scene model lost the actual ages of its selected reference portraits");
  assert.ok(first.inputReferences.includes("age_admission_age_35"),
    "Approved age anchor was not attributable");
  const firstDigest=first.sourceDigest;

  // Later operator-approved portrait at the same age changes future demand,
  // never rewriting the original canonical root or prior depiction.
  approved=[...approved,admitted(35,"age_35_new",{admittedAt:"2026-10-20T00:00:00.000Z"})];
  await reconciler.publishCurrentPresent({threadId,present});
  assert.deepEqual(recorded.slots[0].referenceObjectRefs,[rootRef,"age_35_new","age_40"]);
  assert.notEqual(recorded.slots[0].sourceDigest,firstDigest,
    "A newly admitted age likeness did not change future depiction identity");
  approved=[];
  await reconciler.publishCurrentPresent({threadId,present});
  assert.deepEqual(recorded.slots[0].referenceObjectRefs,[rootRef],
    "With no anchors, existing canonical-only depiction changed");
});
