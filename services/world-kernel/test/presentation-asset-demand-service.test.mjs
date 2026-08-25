import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryInfraDriver } from "#packages/infra/src/memory-driver.mjs";
import { presentationAssetSourceDigest } from "../src/presentation-asset-demand.mjs";
import {
  createPresentationAssetDemandService,
  presentationAssetDemandCatalogKey,
} from "../src/presentation-asset-demand-service.mjs";
import { planWorldPresentationAssetSlots } from "../src/world-presentation-asset-planner.mjs";
import { planExperiencePresentationAssetSlots } from "../src/experience-presentation-asset-planner.mjs";

function missingSlot({
  slotKey = "thread:thr_1:media:media_1",
  entityKind = "thread",
  entityRef = "thr_1",
  mediaId = "media_1",
  source = { summary: "first" },
} = {}) {
  return {
    slotKey,
    entityKind,
    entityRef,
    mediaId,
    assetKind: "image",
    role: "place",
    variant: "default",
    status: "missing",
    brief: {
      description: `Generated reconstruction for ${mediaId}.`,
      constraints: ["Not documentary evidence."],
    },
    inputReferences: [`source_${mediaId}`],
    referenceObjectRefs: [],
    sourceDigest: presentationAssetSourceDigest(source),
    provenanceRef: "prov_generated",
    deferredReason: null,
    context: {
      kind: "thread_presentation_media",
      threadId: entityRef,
      mediaId,
    },
  };
}

test("demand service dispatches before persisting and repeated reconciliation creates no duplicate demand", async () => {
  const infra = createMemoryInfraDriver();
  const service = createPresentationAssetDemandService({ infra });
  const scope = { entityKind: "thread", entityRef: "thr_1" };
  const input = {
    scope,
    slots: [missingSlot()],
    requestedAt: "2026-08-25T19:40:00Z",
  };

  const first = await service.reconcile(input);
  assert.equal(first.reconciliation.createdDemands.length, 1);
  assert.equal(first.reconciliation.jobs.length, 1);
  assert.equal(first.dispatches.length, 1);
  assert.equal(first.dispatches[0].dispatch.workflowStatus, "queued");
  assert.equal(first.projection.demands[0].demand.state, "pending");
  assert.equal(first.projection.demands[0].demand.current, true);

  const stored = await infra.catalog.get(presentationAssetDemandCatalogKey(scope));
  assert.deepEqual(stored, structuredClone(first.projection));

  const second = await service.reconcile({
    ...input,
    requestedAt: "2026-08-25T19:41:00Z",
  });
  assert.equal(second.reconciliation.createdDemands.length, 0);
  assert.equal(second.reconciliation.jobs.length, 0);
  assert.equal(second.reconciliation.retainedDemands.length, 1);
  assert.equal(second.projection.demands.length, 1);
  assert.equal(second.projection.demands[0].demand.job.requestedAt, "2026-08-25T19:40:00Z");
});

test("catalog failure after Workflow dispatch is replay-safe because exact job start is idempotent", async () => {
  const base = createMemoryInfraDriver();
  let failPersist = true;
  const infra = {
    ...base,
    catalog: {
      ...base.catalog,
      async upsert(key, value) {
        if (failPersist) {
          failPersist = false;
          throw new Error("simulated catalog failure");
        }
        return base.catalog.upsert(key, value);
      },
    },
  };
  const service = createPresentationAssetDemandService({ infra });
  const input = {
    scope: { entityKind: "thread", entityRef: "thr_retry" },
    slots: [missingSlot({
      slotKey: "thread:thr_retry:media:media_retry",
      entityRef: "thr_retry",
      mediaId: "media_retry",
    })],
    requestedAt: "2026-08-25T19:42:00Z",
  };

  await assert.rejects(() => service.reconcile(input), /simulated catalog failure/);
  assert.equal(await base.catalog.get(presentationAssetDemandCatalogKey(input.scope)), null);

  const retried = await service.reconcile(input);
  assert.equal(retried.reconciliation.jobs.length, 1);
  assert.equal(retried.dispatches[0].dispatch.duplicate, true);
  assert.equal(retried.projection.demands.length, 1);
});

test("changed semantic source supersedes the prior demand without overwriting its job witness", async () => {
  const infra = createMemoryInfraDriver();
  const service = createPresentationAssetDemandService({ infra });
  const scope = { entityKind: "thread", entityRef: "thr_source" };
  const first = await service.reconcile({
    scope,
    slots: [missingSlot({
      slotKey: "thread:thr_source:media:media_source",
      entityRef: "thr_source",
      mediaId: "media_source",
      source: { summary: "first" },
    })],
    requestedAt: "2026-08-25T19:43:00Z",
  });
  const oldDemand = first.projection.demands[0].demand;

  const second = await service.reconcile({
    scope,
    slots: [missingSlot({
      slotKey: "thread:thr_source:media:media_source",
      entityRef: "thr_source",
      mediaId: "media_source",
      source: { summary: "changed" },
    })],
    requestedAt: "2026-08-25T19:44:00Z",
  });

  assert.equal(second.reconciliation.createdDemands.length, 1);
  assert.equal(second.reconciliation.supersededDemands.length, 1);
  assert.equal(second.projection.demands.length, 2);
  const historical = second.projection.demands.find((entry) => entry.demand.demandId === oldDemand.demandId);
  const current = second.projection.demands.find((entry) => entry.demand.current);
  assert.equal(historical.demand.state, "superseded");
  assert.equal(historical.supersededByDemandId, current.demand.demandId);
  assert.equal(historical.demand.job.jobId, oldDemand.job.jobId);
  assert.notEqual(current.demand.job.jobId, oldDemand.job.jobId);
});

function worldPresentation() {
  return {
    authority: "derived_non_cognitive_presentation",
    presentationRevision: "world-pres-1",
    worldSpecRef: "world_can_tho",
    worldSpecDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    displayName: "Cần Thơ",
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
      temporalLayers: { continuities: "River geography and neighborhood fabric" },
      avoid: ["tourist-postcard framing"],
    },
    assetShotIdeas: ["ordinary neighborhood street"],
  };
}

test("same durable demand service dispatches World and Experience presentation slots without gaining authority", async () => {
  const infra = createMemoryInfraDriver();
  const service = createPresentationAssetDemandService({ infra });

  const worldPlan = planWorldPresentationAssetSlots({
    worldRef: "world_can_tho",
    presentation: worldPresentation(),
    assetRequests: [{
      mediaId: "world_hero",
      role: "world_hero_environment",
      description: "Representative street-level environment.",
    }],
  });
  const worldResult = await service.reconcile({
    scope: { entityKind: "world", entityRef: worldPlan.worldRef },
    slots: worldPlan.slots,
    requestedAt: "2026-08-25T19:45:00Z",
  });
  assert.equal(worldResult.reconciliation.jobs[0].context.kind, "world_presentation_media");

  const experiencePlan = planExperiencePresentationAssetSlots({
    experience: {
      eventRef: "event_market",
      title: "Market errand",
      summary: "Bought tomatoes after comparing two stalls.",
      occurredAt: "2014-06-11T16:30:00+07:00",
      placeRef: null,
      sourceReferences: ["history_event_market"],
      provenanceRef: "prov_history_market",
    },
    worldPresentation: worldPresentation(),
    worldRef: "world_can_tho",
    mediaId: "experience_market",
  });
  const experienceResult = await service.reconcile({
    scope: { entityKind: "experience", entityRef: experiencePlan.experienceRef },
    slots: experiencePlan.slots,
    requestedAt: "2026-08-25T19:46:00Z",
  });
  assert.equal(
    experienceResult.reconciliation.jobs[0].context.kind,
    "experience_presentation_media",
  );
  assert.equal(
    JSON.stringify(experienceResult.projection).includes("World authority"),
    false,
  );
});
