import assert from "node:assert/strict";
import test from "node:test";

import { reconcilePresentationAssets } from "../src/presentation-asset-demand.mjs";
import { createEncounterVisualization } from "../src/lived-encounter-visualization.mjs";
import { planEncounterPresentationAssetSlot } from "../src/encounter-presentation-asset-planner.mjs";

function visualIdentity(threadId, objectRef) {
  return {
    threadId,
    birthDate:threadId === "thr_e4_mina" ? "1990-01-15" : "1995-06-10",
    visualIdentity:{
      projectionVersion:"thread-visual-identity-projection-v0.1",
      authority:"authorized_embodiment_projection",
      embodimentId:`emb_${threadId}`,
      embodimentRevision:1,
      specificationDigest:"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      subjectDescription:`Stable visual identity for ${threadId}.`,
      renderDescription:"Preserve facial geometry, asymmetry, and recognizable identity across age and scene.",
      sourceReferences:[`src_${threadId}`],
      permissionReferences:[],
      referenceObjectRefs:[objectRef],
      provenanceRef:`prov_${threadId}`,
    },
  };
}

function encounter() {
  const story={
    storyVersion:"encounter-story-v0.1",
    beats:[
      { actorThreadId:"thr_e4_mina", kind:"utterance", text:"Noor, move your sketch. You are taking up too much of the table." },
      { actorThreadId:"thr_e4_noor", kind:"utterance", text:"You could have asked without talking to me like that." },
    ],
  };
  return {
    encounterId:"story_e4_social",
    occurredAt:"2026-09-21T18:00:00.000Z",
    threadPresence:[
      { threadId:"thr_e4_mina", situationId:"sit_e4_mina" },
      { threadId:"thr_e4_noor", situationId:"sit_e4_noor" },
      { threadId:"thr_e4_sela", situationId:"sit_e4_sela" },
    ],
    story,
    visualization:createEncounterVisualization({
      occurredAt:"2026-09-21T18:00:00.000Z",
      story,
      scene:"A small café encounter among three independently present Threads.",
      sourceReferences:["sit_e4_mina","sit_e4_noor","sit_e4_sela"],
      depictedThreadRefs:["thr_e4_mina","thr_e4_noor"],
    }),
  };
}

test("E4 objective Encounter Story can feed replaceable image or video generation with distinct identity references", () => {
  const shared = encounter();
  const visualIdentities=[
    visualIdentity("thr_e4_mina", "asset_identity_mina"),
    visualIdentity("thr_e4_noor", "asset_identity_noor"),
  ];
  const image = planEncounterPresentationAssetSlot({
    encounterStory:shared,
    visualIdentities,
    mediaId:"encounter_e4_still",
    assetKind:"image",
  });
  const video = planEncounterPresentationAssetSlot({
    encounterStory:shared,
    visualIdentities,
    mediaId:"encounter_e4_video",
    assetKind:"video",
  });

  assert.equal(image.status, "missing", "bound encounter should be renderable");
  assert.deepEqual([...image.referenceObjectRefs].sort(), ["asset_identity_mina","asset_identity_noor"],
    "each depicted Thread should keep its own canonical identity reference");
  assert.deepEqual(
    image.context.depictedThreads.map((entry) => [entry.threadId,entry.targetAgeYears]),
    [["thr_e4_mina",36],["thr_e4_noor",31]],
    "depicted ages should come from encounter chronology",
  );
  assert.match(image.brief.description, /OBJECTIVE FIBRE ENCOUNTER RECONSTRUCTION/u,
    "rendering should consume the durable objective visualization lineage");
  assert.equal(image.brief.description.includes("protective of Noor"), false,
    "private witness experience must not enter objective rendering");
  assert.equal(
    image.brief.description.includes(visualIdentities[0].visualIdentity.subjectDescription)
      || image.brief.description.includes(visualIdentities[0].visualIdentity.renderDescription),
    false,
    "encounter rendering must stop carrying phenotype prose after canonical-root admission",
  );
  assert.equal(video.brief.description.startsWith(shared.visualization.visualizationPrompt), true,
    "video should consume the same admitted scene prompt");
  assert.equal(video.brief.constraints.some((value) => value.includes("voice")), true,
    "video rendering must not invent canonical voices");

  const generated = reconcilePresentationAssets({
    slots:[image],
    requestedAt:"2026-09-21T18:01:00.000Z",
    providerProfile:"encounter-image-default-v1",
  });
  assert.equal(generated.jobs.length, 1, "encounter still should use ordinary generated-asset machinery");
  assert.equal(generated.jobs[0].context.eventRef, shared.encounterId);
  assert.equal(generated.jobs[0].role, "encounter_scene");
});

test("E4 encounter rendering defers rather than inventing a missing Thread likeness", () => {
  const slot = planEncounterPresentationAssetSlot({
    encounterStory:encounter(),
    visualIdentities:[visualIdentity("thr_e4_mina", "asset_identity_mina")],
    mediaId:"encounter_e4_missing_noor",
  });

  assert.equal(slot.status, "deferred");
  assert.equal(slot.deferredReason, "deferred_missing_visual_identity_reference");
  assert.deepEqual(slot.referenceObjectRefs, [], "partial identity binding must not render");
});

test("admitted age portraits remain owned by each depicted Thread in one encounter",()=>{
  const story=encounter();
  const mina=visualIdentity("thr_e4_mina","asset_identity_mina");
  const noor=visualIdentity("thr_e4_noor","asset_identity_noor");
  const minaRoot="sha256:"+"a".repeat(64);
  const noorRoot="sha256:"+"b".repeat(64);
  const anchor=(threadId,canonicalRef,canonicalDigest,age,portrait,patch={})=>({
    contract:"visual-age-anchor-admission-v0.1",
    admissionId:"admission_"+portrait,threadId,targetAgeYears:age,
    portraitObjectRef:portrait,portraitDigest:"sha256:"+"c".repeat(64),
    canonicalReferenceObjectRef:canonicalRef,canonicalReferenceDigest:canonicalDigest,
    sourceAnchorRefs:[],generationReceiptRef:"receipt_"+portrait,
    approvalRef:"approval_"+portrait,admittedAt:"2026-10-19T00:00:00Z",
    ...patch,
  });
  mina.canonicalReferenceDigest=minaRoot;
  mina.ageAnchorAdmissions=[
    anchor(mina.threadId,"asset_identity_mina",minaRoot,34,"mina_34"),
    anchor(mina.threadId,"asset_identity_mina",minaRoot,40,"mina_40"),
    anchor(noor.threadId,"asset_identity_noor",noorRoot,36,"foreign_36"),
    anchor(mina.threadId,"asset_identity_mina","sha256:"+"d".repeat(64),36,"retired_36"),
  ];
  noor.canonicalReferenceDigest=noorRoot;
  noor.ageAnchorAdmissions=[
    anchor(noor.threadId,"asset_identity_noor",noorRoot,31,"noor_31"),
    anchor(noor.threadId,"asset_identity_noor",noorRoot,28,"noor_28"),
  ];
  const plan=()=>planEncounterPresentationAssetSlot({
    encounterStory:story,visualIdentities:[mina,noor],mediaId:"encounter_age_continuity",
  });
  const before=plan();
  assert.deepEqual(before.referenceObjectRefs,[
    "asset_identity_mina","mina_34","mina_40",
    "asset_identity_noor","noor_31",
  ],"two Threads' approved likenesses were mixed or ignored");
  const [minaRefs,noorRefs]=before.context.depictedThreads.map(item=>item.referenceImages);
  assert.deepEqual(minaRefs.map(x=>x.targetAgeYears),[25,34,40],
    "Mina's reference group lost its true ages");
  assert.deepEqual(noorRefs.map(x=>x.targetAgeYears),[25,31],
    "Noor's exact-age anchor was not selected");
  assert.match(before.brief.description,/image 2 is Thread thr_e4_mina's approved age-34 portrait/i,
    "Mina's reference image was not attributed to her");
  assert.match(before.brief.description,/Image 5 is Thread thr_e4_noor's approved age-31 portrait/u,
    "Noor's reference image was not attributed to him");
  assert.equal(before.brief.description.includes("foreign_36"),false,
    "A foreign person's portrait contaminated the encounter");
  assert.ok(before.inputReferences.includes("admission_mina_40")
    &&before.inputReferences.includes("admission_noor_31"),
    "Encounter generation lacks admission provenance");

  mina.ageAnchorAdmissions.push(anchor(mina.threadId,"asset_identity_mina",minaRoot,40,
    "mina_40_revised",{admittedAt:"2026-10-20T00:00:00Z"}));
  const revised=plan();
  assert.deepEqual(revised.referenceObjectRefs,[
    "asset_identity_mina","mina_34","mina_40_revised",
    "asset_identity_noor","noor_31",
  ],"a new Mina approval changed Noor's reference group");
  assert.notEqual(revised.sourceDigest,before.sourceDigest,
    "approved visual development did not affect the next encounter generation");

  const canonicalOnly=planEncounterPresentationAssetSlot({
    encounterStory:story,
    visualIdentities:[visualIdentity(mina.threadId,"asset_identity_mina"),
      visualIdentity(noor.threadId,"asset_identity_noor")],
    mediaId:"encounter_age_continuity",
  });
  assert.deepEqual(canonicalOnly.referenceObjectRefs,["asset_identity_mina","asset_identity_noor"],
    "no admitted anchors must preserve canonical-only encounter generation");
  assert.equal(canonicalOnly.context.depictedThreads.some(x=>"referenceImages" in x),false,
    "an empty age anchor registry changed legacy encounter source identity");
});
