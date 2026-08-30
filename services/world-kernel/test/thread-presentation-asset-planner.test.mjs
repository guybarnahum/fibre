import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeAssetGenerationJob } from "#services/asset-generator/src/asset-generation-domain.mjs";
import { normalizeThreadPresentationEventInput } from "../src/thread-presentation-stream-domain.mjs";
import {
  assetGenerationReceiptToPresentationEventInput,
  planThreadPresentationAssetGeneration,
} from "../src/thread-presentation-asset-planner.mjs";

async function p2Bundle() {
  const base = new URL("../../../fixtures/thread-presentation/can-tho/", import.meta.url);
  return {
    presentation: JSON.parse(await readFile(new URL("presentation.json", base), "utf8")),
    media: JSON.parse(await readFile(new URL("media.json", base), "utf8")),
    provenance: JSON.parse(await readFile(new URL("provenance.json", base), "utf8")),
  };
}

test("Cần Thơ pre-embodiment planner schedules place imagery but defers self-depicting memories", async () => {
  const bundle = await p2Bundle();
  const plan = planThreadPresentationAssetGeneration({
    bundle,
    snapshotObjectRef: "obj_thr_pr39_g2_04_presentation_v1",
    snapshotDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    requestedAt: "2026-08-21T20:10:11Z",
  });
  assert.equal(plan.jobs.length, 5);
  assert.equal(plan.deferred.length, 9);
  assert.deepEqual(new Set(plan.jobs.map((job) => job.role)), new Set(["place"]));
  plan.jobs.forEach((job) => assert.doesNotThrow(() => normalizeAssetGenerationJob(job)));
  assert.equal(plan.jobs.every((job) => job.variant === "default" && job.referenceObjectRefs.length === 0), true);

  const selfMemories = bundle.presentation.memories.map((memory) => memory.mediaRefs[0]);
  assert.equal(selfMemories.length, 6);
  for (const mediaId of selfMemories) {
    assert.equal(
      plan.deferred.some((item) => item.mediaId === mediaId && item.reason === "deferred_missing_embodiment"),
      true,
      `${mediaId} must not invent a Thread likeness before canonical visual identity is admitted`,
    );
  }
  assert.equal(plan.deferred.some((item) => item.mediaId === "media_portrait_primary" && item.reason === "deferred_missing_embodiment_brief"), true);
  assert.equal(plan.deferred.some((item) => item.mediaId === "media_voice_primary" && item.reason === "deferred_non_image_asset"), true);
  assert.equal(plan.deferred.some((item) => item.mediaId === "media_life_film" && item.reason === "deferred_non_image_asset"), true);
});

test("self-depicting memory remains deferred before Embodiment instead of using remembered text to invent a face", async () => {
  const bundle = await p2Bundle();
  const plan = planThreadPresentationAssetGeneration({
    bundle,
    snapshotObjectRef: "obj_thr_pr39_g2_04_presentation_v1",
    snapshotDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    requestedAt: "2026-08-21T20:10:11Z",
  });
  const tomatoes = plan.deferred.find((item) => item.mediaId === "media_memory_tomatoes");
  assert.ok(tomatoes);
  assert.equal(tomatoes.reason, "deferred_missing_embodiment");
  assert.equal(plan.jobs.some((job) => job.context.mediaId === "media_memory_tomatoes"), false);
});

test("same snapshot and provider profile produce deterministic job and object identities", async () => {
  const bundle = await p2Bundle();
  const input = {
    bundle,
    snapshotObjectRef: "obj_thr_pr39_g2_04_presentation_v1",
    snapshotDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    requestedAt: "2026-08-21T20:10:11Z",
  };
  const a = planThreadPresentationAssetGeneration(input);
  const b = planThreadPresentationAssetGeneration(input);
  assert.deepEqual(
    a.jobs.map(({ jobId, outputObjectRef, receiptObjectRef }) => ({ jobId, outputObjectRef, receiptObjectRef })),
    b.jobs.map(({ jobId, outputObjectRef, receiptObjectRef }) => ({ jobId, outputObjectRef, receiptObjectRef })),
  );
});

test("ready asset receipt becomes a legal media.ready presentation event without cloud-native locator leakage", () => {
  const job = {
    jobVersion: "asset-generation-job-v0.1",
    jobId: "asset_job_1",
    assetKind: "image",
    role: "place",
    variant: "default",
    brief: {
      description: "Generated place reconstruction.",
      constraints: ["Not documentary evidence."],
    },
    inputReferences: ["presentation_1", "media_1", "source_1"],
    referenceObjectRefs: [],
    outputObjectRef: "asset_object_1",
    receiptObjectRef: "asset_receipt_1",
    requestedAt: "2026-08-21T20:10:11Z",
    providerProfile: "presentation-image-default-v1",
    context: {
      kind: "thread_presentation_media",
      threadId: "thr_1",
      presentationId: "presentation_1",
      mediaPacketId: "media_packet_1",
      mediaId: "media_1",
      provenanceRef: "prov_generated_reconstruction",
      snapshotObjectRef: "snapshot_1",
      snapshotDigest: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    },
  };
  const receipt = {
    receiptVersion: "asset-generation-receipt-v0.1",
    jobId: "asset_job_1",
    job,
    status: "ready",
    assetKind: "image",
    role: "place",
    objectRef: "asset_object_1",
    sha256: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    mediaType: "image/webp",
    width: 1024,
    height: 1024,
    durationMs: null,
    completedAt: "2026-08-21T20:12:00Z",
    generation: {
      provider: "fixture",
      model: "fixture-v1",
      providerRequestId: "req_1",
      generatedAt: "2026-08-21T20:11:59Z",
      configuration: { size: "1024x1024" },
    },
    inputReferences: job.inputReferences,
    context: job.context,
    unavailableReason: null,
  };
  const event = assetGenerationReceiptToPresentationEventInput(receipt, { channelId: "channel_thr_1" });
  assert.doesNotThrow(() => normalizeThreadPresentationEventInput(event));
  assert.equal(event.kind, "media.ready");
  assert.equal(event.payload.objectRef, "asset_object_1");
  assert.equal(JSON.stringify(event).includes("r2://"), false);
});
