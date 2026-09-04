import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryInfraDriver } from "#infra/providers/local";
import {
  createAssetGenerationJobFromIdentity,
  createAssetGenerationService,
  fibreShortIdSuffix,
} from "../src/index.mjs";

const IDENTITY_DIGEST = `sha256:${"a".repeat(64)}`;

function job(requestedAt, overrides = {}) {
  return createAssetGenerationJobFromIdentity({
    identityDigest: IDENTITY_DIGEST,
    idSuffix: fibreShortIdSuffix(IDENTITY_DIGEST),
    assetKind: "image",
    role: "official_id_photo",
    variant: "identity-card",
    brief: {
      description: "Official identity portrait.",
      constraints: ["Preserve likeness."],
    },
    inputReferences: ["identity_thr_recovery"],
    referenceObjectRefs: ["visual_identity_reference_recovery"],
    requestedAt,
    providerProfile: "bfl-flux-2-pro-v1",
    context: {
      kind: "thread_presentation_media",
      threadId: "thr_recovery",
      mediaId: "media_recovery",
    },
    ...overrides,
  });
}

test("asset request adopts durable Workflow input when replay differs only by requestedAt", async () => {
  const infra = createMemoryInfraDriver();
  const service = createAssetGenerationService({ infra });
  const original = job("2026-09-03T20:04:00Z");
  await infra.workflows.start("asset_generation_v1", original.jobId, original);

  const replay = job("2026-09-03T20:10:00Z");
  const result = await service.request(replay);

  assert.equal(result.adopted, true);
  assert.equal(result.instance.duplicate, true);
  assert.equal(result.job.requestedAt, original.requestedAt);
  assert.equal(replay.requestedAt, original.requestedAt);

  const witness = await infra.workflows.get("asset_generation_v1", original.jobId);
  assert.deepEqual(result.job, witness.input);
});

test("asset request preserves hard conflict when durable Workflow input differs semantically", async () => {
  const infra = createMemoryInfraDriver();
  const service = createAssetGenerationService({ infra });
  const original = job("2026-09-03T20:04:00Z");
  await infra.workflows.start("asset_generation_v1", original.jobId, original);

  const conflicting = job("2026-09-03T20:10:00Z");
  conflicting.context = { ...conflicting.context, mediaId: "media_other" };

  await assert.rejects(
    () => service.request(conflicting),
    /already exists with different input/,
  );
});
