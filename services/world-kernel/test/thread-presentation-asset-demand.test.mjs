import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { createPresentationAssetDemandService } from "../src/presentation-asset-demand-service.mjs";
import { createThreadPresentationAssetDemandTrigger } from "../src/thread-presentation-asset-demand.mjs";
import { createThreadPresentationServer } from "../src/thread-presentation-server.mjs";

async function bundle() {
  const base = new URL("../../../fixtures/thread-presentation/can-tho/", import.meta.url);
  return {
    presentation: JSON.parse(await readFile(new URL("presentation.json", base), "utf8")),
    media: JSON.parse(await readFile(new URL("media.json", base), "utf8")),
    provenance: JSON.parse(await readFile(new URL("provenance.json", base), "utf8")),
  };
}

test("Thread demand trigger always reconciles the current admitted snapshot", async () => {
  const infra = createMemoryInfraDriver();
  const server = createThreadPresentationServer({ infra });
  const demandService = createPresentationAssetDemandService({ infra });
  const trigger = createThreadPresentationAssetDemandTrigger({
    presentationServer: server,
    demandService,
  });
  const firstBundle = await bundle();
  const channelId = "channel_thr_pr39_g2_04";

  const firstSnapshot = await server.publishSnapshot({
    channelId,
    objectRef: "snapshot_thread_demand_1",
    snapshotVersion: "fixture-1",
    bundle: firstBundle,
    expectedSequence: 0,
  });
  const first = await trigger.reconcileCurrent({
    channelId,
    requestedAt: "2026-08-25T19:47:00Z",
  });
  assert.equal(first.snapshotDigest, firstSnapshot.digest);
  assert.equal(first.demand.reconciliation.jobs.length, 5, "pre-embodiment fixture may generate places only");
  assert.deepEqual(
    new Set(first.demand.reconciliation.jobs.map((job) => job.role)),
    new Set(["place"]),
  );
  assert.equal(
    first.demand.reconciliation.deferredSlots.filter((slot) =>
      slot.role === "memory_reconstruction" && slot.deferredReason === "deferred_missing_embodiment").length,
    6,
  );

  const changedBundle = structuredClone(firstBundle);
  const market = changedBundle.presentation.places.find(
    (place) => place.mediaRefs.includes("media_place_market"),
  );
  market.summary = `${market.summary} Rain-darkened pavement is common after an afternoon shower.`;

  const secondSnapshot = await server.publishSnapshot({
    channelId,
    objectRef: "snapshot_thread_demand_2",
    snapshotVersion: "fixture-2",
    bundle: changedBundle,
    expectedSequence: 0,
  });
  const second = await trigger.reconcileCurrent({
    channelId,
    requestedAt: "2026-08-25T19:48:00Z",
  });

  assert.equal(second.snapshotDigest, secondSnapshot.digest);
  assert.notEqual(second.snapshotDigest, first.snapshotDigest);
  assert.equal(second.demand.reconciliation.jobs.length, 1);
  assert.equal(second.demand.reconciliation.jobs[0].context.mediaId, "media_place_market");
  assert.equal(second.demand.reconciliation.supersededDemands.length, 1);
});
