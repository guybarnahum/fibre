import assert from "node:assert/strict";
import test from "node:test";

import { sampleFounderPhysicalGenome } from "#core/src/human-appearance/index.mjs";
import { PROVENANCED_ASSET_RECEIPT_VERSION } from "#services/asset-generator/src/index.mjs";
import {
  embodimentId,
  embodimentSpecificationDigest,
} from "../src/embodiment-domain.mjs";
import {
  bindVerifiedCanonicalVisualIdentityProof,
  planCanonicalVisualIdentityGeneration,
  planCanonicalVisualIdentityGeometryGeneration,
} from "../src/canonical-visual-identity-generation.mjs";
import { canonicalVisualSpecificationFromPhysicalGenome } from "../src/canonical-visual-identity-from-physical-genome.mjs";
import { projectPublicEmbodimentVisualIdentity } from "../src/thread-presentation-embodiment-projection.mjs";
import { CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS } from "../src/visual-identity-reference-domain.mjs";

const DIGEST_A="sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DIGEST_B="sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const REQUESTED_AT="2026-08-30T05:05:10Z";

function embodimentFromSpecification(specification){
  const threadId="thr_canonical_visual_identity_001";
  return {
    embodimentId:embodimentId({threadId,kind:"portrait",lineage:"canonical"}),
    revision:1,
    threadId,
    kind:"portrait",
    representationKind:"synthetic_generation",
    truthStatus:"synthetic_representation_not_historical_evidence",
    rightsBasis:"thread_self_owned",
    permissionReferences:[],
    sourceReferences:["evt_seed_thr_canonical_visual_identity_001"],
    specification,
    specificationDigest:embodimentSpecificationDigest(specification),
    respecification:null,
    status:"pending_generation",
    unavailableReason:null,
    asset:null,
    visibility:"public",
    recordedAt:"2026-08-30T05:05:00Z",
  };
}

function pendingEmbodiment(){
  const threadId="thr_canonical_visual_identity_001";
  const physicalGenome=sampleFounderPhysicalGenome({
    ancestry:[{population:"test family",share:1,referencePopulation:"oceania.polynesia"}],
    seed:"canonical-geometry-test",
  });
  return embodimentFromSpecification(canonicalVisualSpecificationFromPhysicalGenome({
    threadId,
    sex:"female",
    physicalGenome,
  }));
}

function legacyPendingEmbodiment(){
  const threadId="thr_canonical_visual_identity_001";
  return embodimentFromSpecification({
    subject:{
      partyId:threadId,
      description:"An individual with a softly angular oval face, medium warm-brown skin, wide-set dark brown eyes, a narrow straight nose, tapered jaw, and thick dark-brown wavy hair.",
    },
    method:"canonical synthetic portrait specification",
    description:"Neutral head-and-shoulders portrait with ordinary lighting and natural asymmetry.",
    model:"replaceable-renderer",
  });
}

function provenancedReceipt(job,overrides={}){
  return {
    receiptVersion:PROVENANCED_ASSET_RECEIPT_VERSION,
    jobId:job.jobId,
    status:"ready",
    assetKind:"image",
    role:job.role,
    variant:job.variant,
    objectRef:job.outputObjectRef,
    sha256:DIGEST_A,
    mediaType:"image/webp",
    width:1024,
    height:1024,
    durationMs:null,
    completedAt:"2026-08-30T05:06:00Z",
    generationRecordObjectRef:"generation_record_visual_identity_001",
    generationRecordDigest:DIGEST_B,
    providerOutputDigest:DIGEST_A,
    inputReferences:job.inputReferences,
    context:job.context,
    ...overrides,
  };
}

function plannedPair(embodiment=pendingEmbodiment()){
  const geometry=planCanonicalVisualIdentityGeometryGeneration({
    embodiment,
    requestedAt:REQUESTED_AT,
  });
  const final=planCanonicalVisualIdentityGeneration({
    embodiment,
    requestedAt:REQUESTED_AT,
    geometryAnchorObjectRef:geometry.outputObjectRef,
  });
  return {embodiment,geometry,final};
}

test("synthetic canonical identity is geometry-first and deterministic",()=>{
  const {embodiment,geometry,final}=plannedPair();

  assert.equal(geometry.role,"canonical_visual_identity_geometry_anchor");
  assert.deepEqual(geometry.referenceObjectRefs,[]);
  assert.match(geometry.brief.description,/geometry anchor/i);
  assert.match(geometry.brief.description,/structural morphology/i);

  assert.equal(final.role,"canonical_visual_identity_reference");
  assert.deepEqual(final.referenceObjectRefs,[geometry.outputObjectRef]);
  assert.notEqual(final.outputObjectRef,geometry.outputObjectRef);
  assert.equal(final.context.referenceAgeYears,CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS);
  assert.equal(CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,25);
  assert.match(final.brief.description,/surface phenotype/i);
  assert.equal(final.brief.constraints.some(value=>/preserve the supplied geometry anchor/i.test(value)),true);

  assert.deepEqual(
    plannedPair(embodiment),
    {embodiment,geometry,final},
    "same appearance authority did not reproduce the same two generation jobs",
  );
});

test("synthetic canonical identity cannot bypass layered Human Appearance",()=>{
  const legacy=legacyPendingEmbodiment();
  assert.throws(
    ()=>planCanonicalVisualIdentityGeometryGeneration({embodiment:legacy,requestedAt:REQUESTED_AT}),
    /layered Human Appearance/,
    "non-layered synthetic root remained generatable",
  );
  assert.throws(
    ()=>planCanonicalVisualIdentityGeneration({
      embodiment:legacy,
      requestedAt:REQUESTED_AT,
      geometryAnchorObjectRef:"visual_identity_geometry_legacy",
    }),
    /layered Human Appearance/,
    "non-layered synthetic final remained generatable",
  );
});

test("Embodiment admits only the verified surface-applied portrait",()=>{
  const {embodiment,geometry,final}=plannedPair();
  const geometryProof={
    receipt:provenancedReceipt(geometry,{sha256:DIGEST_B,providerOutputDigest:DIGEST_B}),
    generationRecord:{job:geometry},
  };
  const finalProof={
    receipt:provenancedReceipt(final),
    generationRecord:{job:final},
  };

  assert.throws(
    ()=>bindVerifiedCanonicalVisualIdentityProof({
      embodiment,
      proof:finalProof,
      recordedAt:"2026-08-30T05:06:01Z",
    }),
    /geometry-anchor proof/,
    "final portrait was admitted without geometry provenance",
  );

  const available=bindVerifiedCanonicalVisualIdentityProof({
    embodiment,
    proof:finalProof,
    geometryProof,
    recordedAt:"2026-08-30T05:06:01Z",
  });
  assert.equal(available.status,"available");
  assert.equal(available.revision,2);
  assert.equal(available.asset.referenceObjectRef,final.outputObjectRef);
  assert.notEqual(available.asset.referenceObjectRef,geometry.outputObjectRef);

  const visualIdentity=projectPublicEmbodimentVisualIdentity(available,{
    provenanceRef:"prov_canonical_visual_identity_001",
  });
  assert.deepEqual(visualIdentity.referenceObjectRefs,[final.outputObjectRef]);
});

test("canonical admission stays bound to the exact geometry and embodiment revision",()=>{
  const {embodiment,geometry,final}=plannedPair();
  const geometryProof={
    receipt:provenancedReceipt(geometry,{sha256:DIGEST_B,providerOutputDigest:DIGEST_B}),
    generationRecord:{job:geometry},
  };

  assert.throws(()=>bindVerifiedCanonicalVisualIdentityProof({
    embodiment,
    geometryProof,
    proof:{
      receipt:provenancedReceipt(final),
      generationRecord:{job:{...final,jobId:"asset_job_other"}},
    },
    recordedAt:"2026-08-30T05:06:01Z",
  }),/proof job does not match/);

  const staleContext={...final.context,embodimentRevision:2};
  assert.throws(()=>bindVerifiedCanonicalVisualIdentityProof({
    embodiment,
    geometryProof,
    proof:{
      receipt:provenancedReceipt({...final,context:staleContext},{context:staleContext}),
      generationRecord:{job:{...final,context:staleContext}},
    },
    recordedAt:"2026-08-30T05:06:01Z",
  }),/receipt does not match/);
});
