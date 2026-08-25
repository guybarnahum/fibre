import test from "node:test";
import assert from "node:assert/strict";

import { reconcilePresentationAssets } from "../src/presentation-asset-demand.mjs";
import { planExperiencePresentationAssetSlots } from "../src/experience-presentation-asset-planner.mjs";

function world() {
  return {
    authority: "derived_non_cognitive_presentation",
    presentationRevision: "world-pres-2",
    worldSpecRef: "world_can_tho",
    worldSpecDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    visualProfile: {
      overallCharacter: "Ordinary river-city neighborhood life",
      geographyAndClimate: "Warm humid delta climate",
      builtEnvironment: "Mixed homes and small commercial buildings",
      streetsAndPublicRealm: "Pedestrians, motorbikes and local shops",
      interiors: "Practical tiled domestic and public interiors",
      materialsAndTextures: "Concrete, tile and painted plaster",
      lightAndAtmosphere: "Humid daylight",
      publicInstitutions: "Neighborhood schools and libraries",
      visualAnchors: ["mixed residential-commercial streets"],
      temporalLayers: {
        childhood: "More feature phones and paper notices than later years",
        continuities: "The same neighborhood street fabric and public institutions",
      },
      avoid: ["tourist-postcard framing"],
    },
  };
}

test("Experience image brief keeps event, memory and generated reconstruction as separate authorities", () => {
  const plan = planExperiencePresentationAssetSlots({
    experience: {
      eventRef: "event_market_errand",
      title: "Market errand",
      summary: "Bought tomatoes after comparing two stalls.",
      occurredAt: "2014-06-11T16:30:00+07:00",
      placeRef: "place_market",
      sourceReferences: ["history_event_market_errand"],
      provenanceRef: "prov_history_market_errand",
      participantRefs: [],
      mediaRefs: [],
    },
    placePresentation: {
      placeRef: "place_market",
      displayName: "Neighborhood market",
      region: "Cần Thơ, Vietnam",
      summary: "A neighborhood market with groceries, prepared food and household goods.",
      sourceReferences: ["place_market_fact"],
    },
    worldPresentation: world(),
    worldRef: "world_can_tho",
    memoryPresentation: {
      memoryRef: "memory_market_errand",
      rememberedContent: "I remember weighing whether the cheaper tomatoes were too bruised.",
      uncertainty: ["which stall was closest to the entrance"],
      sourceReferences: ["memory_market_errand_record"],
    },
    mediaId: "experience_market_scene",
    temporalLayer: "childhood",
  });

  const brief = plan.slots[0].brief;
  assert.match(brief.description, /Presented historical\/event context:/);
  assert.match(brief.description, /Remembered perspective \(memory, not historical authority\):/);
  assert.match(brief.description, /Memory uncertainty:/);
  assert.match(brief.description, /More feature phones/);
  assert.equal(brief.constraints.some((value) => value.includes("event/history is distinct")), true);
  assert.equal(brief.constraints.some((value) => value.includes("do not convert remembered uncertainty")), true);

  const reconciliation = reconcilePresentationAssets({
    slots: plan.slots,
    requestedAt: "2026-08-25T18:00:00Z",
  });
  assert.equal(reconciliation.jobs.length, 1);
  assert.equal(reconciliation.jobs[0].context.kind, "experience_presentation_media");
  assert.equal(reconciliation.jobs[0].context.memoryRef, "memory_market_errand");
});

test("Experience planner rejects mismatched place grounding", () => {
  assert.throws(() => planExperiencePresentationAssetSlots({
    experience: {
      eventRef: "event_1",
      title: "School day",
      summary: "Stayed after class to finish a project.",
      occurredAt: "2016-02-01T15:00:00+07:00",
      placeRef: "place_school",
      sourceReferences: ["history_event_1"],
      provenanceRef: "prov_event_1",
    },
    placePresentation: {
      placeRef: "place_market",
      displayName: "Market",
      summary: "A market.",
      sourceReferences: ["place_market_fact"],
    },
    mediaId: "experience_1",
  }), /does not match/);
});
