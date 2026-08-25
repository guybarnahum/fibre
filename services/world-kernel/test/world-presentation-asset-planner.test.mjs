import test from "node:test";
import assert from "node:assert/strict";

import { reconcilePresentationAssets } from "../src/presentation-asset-demand.mjs";
import { planWorldPresentationAssetSlots } from "../src/world-presentation-asset-planner.mjs";

function worldPresentation() {
  return {
    contractVersion: "world-presentation-v1",
    presentationRevision: "can-tho-presentation-3",
    scope: "world",
    authority: "derived_non_cognitive_presentation",
    derivationPolicy: "fixture",
    worldSpecRef: "world_can_tho",
    sourceWorldSpecPath: null,
    worldSpecDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    displayName: "Cần Thơ",
    shortDescription: "A river city in the Mekong Delta.",
    longDescription: "A warm, humid river city with ordinary neighborhoods, markets, schools, libraries and mixed traffic.",
    visualProfile: {
      overallCharacter: "Dense everyday river-city life rather than a tourist postcard",
      geographyAndClimate: "Low, humid delta landscape with canals and heavy seasonal rain",
      builtEnvironment: "Mixed low- and mid-rise homes and shopfronts",
      streetsAndPublicRealm: "Busy streets shared by pedestrians, motorbikes, buses and small businesses",
      interiors: "Practical tiled homes, classrooms, libraries and shops",
      materialsAndTextures: "Concrete, tile, painted plaster, metal shutters and weathered surfaces",
      lightAndAtmosphere: "Bright humid daylight and rain-darkened surfaces",
      vegetationAndLandscape: "Tropical roadside and riverside vegetation",
      mobilityAndVehicles: "Motorbikes, buses, bicycles and river transport",
      signageAndLanguage: "Ordinary Vietnamese-language signage",
      clothingAndEverydayObjects: "Everyday warm-weather clothing and practical household goods",
      technologyAndInfrastructure: "Ordinary urban utilities and consumer technology",
      publicInstitutions: "Public schools, libraries, markets and transit facilities",
      visualAnchors: ["river-oriented commercial streets", "motorbike-heavy mixed traffic"],
      temporalLayers: {
        early: "Feature phones and more analog public information",
        continuities: "River geography, public institutions and mixed neighborhood commerce",
      },
      avoid: ["floating-market cliché as the whole city", "exoticized poverty"],
    },
    assetShotIdeas: [
      "street-level neighborhood scene after rain",
      "ordinary public library interior",
    ],
    assetRefs: [],
  };
}

test("World asset brief consumes rich WorldPresentation grounding without becoming World authority", () => {
  const plan = planWorldPresentationAssetSlots({
    worldRef: "world_can_tho",
    presentation: worldPresentation(),
    assetRequests: [{
      mediaId: "world_hero",
      role: "world_hero_environment",
      description: "A representative street-level environmental hero image.",
      temporalLayer: "early",
    }],
  });
  assert.equal(plan.slots.length, 1);
  const slot = plan.slots[0];
  assert.match(slot.brief.description, /river-city life/);
  assert.match(slot.brief.description, /Feature phones/);
  assert.match(slot.brief.description, /river-oriented commercial streets/);
  assert.match(slot.brief.description, /ordinary public library interior/);
  assert.equal(slot.brief.constraints.some((value) => value.includes("not World authority")), true);
  assert.equal(slot.brief.constraints.some((value) => value.includes("Do not invent Thread biography")), true);
  assert.equal(slot.brief.constraints.some((value) => value.includes("floating-market cliché")), true);

  const reconciliation = reconcilePresentationAssets({
    slots: plan.slots,
    requestedAt: "2026-08-25T18:00:00Z",
  });
  assert.equal(reconciliation.jobs.length, 1);
  assert.equal(reconciliation.jobs[0].context.kind, "world_presentation_media");
  assert.equal(JSON.stringify(reconciliation.jobs[0]).includes("sourceWorldSpecPath"), false);
});

test("World visual-source change produces a new source digest while identical presentation stays stable", () => {
  const a = planWorldPresentationAssetSlots({
    worldRef: "world_can_tho",
    presentation: worldPresentation(),
    assetRequests: [{
      mediaId: "world_street",
      role: "world_street_neighborhood",
      description: "An ordinary neighborhood street.",
    }],
  });
  const b = planWorldPresentationAssetSlots({
    worldRef: "world_can_tho",
    presentation: worldPresentation(),
    assetRequests: [{
      mediaId: "world_street",
      role: "world_street_neighborhood",
      description: "An ordinary neighborhood street.",
    }],
  });
  const changedPresentation = worldPresentation();
  changedPresentation.visualProfile.lightAndAtmosphere = "Heavy monsoon rain under overcast afternoon light";
  const c = planWorldPresentationAssetSlots({
    worldRef: "world_can_tho",
    presentation: changedPresentation,
    assetRequests: [{
      mediaId: "world_street",
      role: "world_street_neighborhood",
      description: "An ordinary neighborhood street.",
    }],
  });

  assert.equal(a.slots[0].sourceDigest, b.slots[0].sourceDigest);
  assert.notEqual(a.slots[0].sourceDigest, c.slots[0].sourceDigest);
});
