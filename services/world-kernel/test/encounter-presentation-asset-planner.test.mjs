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
