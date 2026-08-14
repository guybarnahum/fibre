import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import { openIdentityStore } from "../src/identity-store.mjs";
import {
  completeMemoryPhoto,
  completeOutstandingMemoryPhotos,
  reportMemoryPhotoAssetIssue,
} from "../src/memory-photo-completion.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-memory-photo-"));
  const databasePath = join(directory, "world.sqlite");
  const finish = () => rmSync(directory, { recursive: true, force: true });
  return Promise.resolve(run(databasePath)).finally(finish);
}

function seed(databasePath) {
  const world = openWorldStore(databasePath);
  world.seedThread(structuredClone(fixture));
  world.close();
}

test("Slice D fulfills every outstanding memory-photo obligation from durable Fibre prompts", async () =>
  withDatabase(async (databasePath) => {
    seed(databasePath);
    const identity = openIdentityStore(databasePath);
    const memoryRef = fixture.memoryRefs[0];
    const pending = identity.getMemoryVisualCompanionHistory(fixture.threadId, memoryRef).at(-1).companion;

    const batch = await completeOutstandingMemoryPhotos({
      identityStore: identity,
      threadId: fixture.threadId,
      recordedAt: "2026-08-14T18:05:00Z",
      render: async (request) => {
        assert.equal(request.photoPrompt, pending.photoPrompt);
        assert.equal(request.photoPromptDigest, pending.photoPromptDigest);
        assert.equal(request.truthStatus, "synthetic_representation_not_historical_evidence");
        return {
          assetRef: `s3://fibre-memory-visuals/${request.memoryRef}.webp`,
          generatedBy: "fibre.test-renderer",
        };
      },
    });

    assert.equal(batch.memoryCount, fixture.memoryRefs.length);
    assert.equal(batch.attempted, fixture.memoryRefs.length);
    assert.equal(batch.completed, fixture.memoryRefs.length);
    assert.equal(batch.failed, 0);
    const completed = identity.getMemoryVisualCompanionHistory(fixture.threadId, memoryRef).at(-1).companion;
    assert.equal(completed.status, "available");
    assert.equal(completed.photoPromptDigest, pending.photoPromptDigest);
    assert.equal(completed.truthStatus, "synthetic_representation_not_historical_evidence");
    assert.equal(identity.verifyThreadIdentityIntegrity(fixture.threadId).memoryPhotoRequirementSatisfied, true);

    const idempotent = await completeMemoryPhoto({
      identityStore: identity,
      threadId: fixture.threadId,
      memoryRef,
      recordedAt: "2026-08-14T18:06:00Z",
      render: async () => { throw new Error("should not render twice"); },
    });
    assert.equal(idempotent.idempotent, true);
    assert.equal(identity.getMemoryVisualCompanionHistory(fixture.threadId, memoryRef).length, 2);
    identity.close();
  }));

test("provider failure, corrupt cache and regeneration never rewrite memory truth", async () =>
  withDatabase(async (databasePath) => {
    seed(databasePath);
    const identity = openIdentityStore(databasePath);
    const memoryRef = fixture.memoryRefs[0];
    const original = identity.getMemoryVisualCompanionHistory(fixture.threadId, memoryRef).at(-1).companion;

    const failed = await completeMemoryPhoto({
      identityStore: identity,
      threadId: fixture.threadId,
      memoryRef,
      recordedAt: "2026-08-14T18:10:00Z",
      render: async () => { throw new Error("provider down"); },
    });
    assert.equal(failed.companion.status, "unavailable_with_reason");
    assert.equal(failed.companion.unavailableReason, "provider_failure");
    assert.equal(identity.verifyThreadIdentityIntegrity(fixture.threadId).memoryPhotoRequirementSatisfied, false);

    const recovered = await completeMemoryPhoto({
      identityStore: identity,
      threadId: fixture.threadId,
      memoryRef,
      recordedAt: "2026-08-14T18:11:00Z",
      render: async () => ({
        assetRef: "cache://memory/mina/recovered.webp",
        generatedBy: "fibre.test-renderer",
      }),
    });
    assert.equal(recovered.companion.status, "available");

    const corrupt = reportMemoryPhotoAssetIssue({
      identityStore: identity,
      threadId: fixture.threadId,
      memoryRef,
      issue: "hash_mismatch",
      recordedAt: "2026-08-14T18:12:00Z",
    });
    assert.equal(corrupt.companion.status, "unavailable_with_reason");
    assert.equal(corrupt.companion.unavailableReason, "hash_mismatch");

    const regenerated = await completeMemoryPhoto({
      identityStore: identity,
      threadId: fixture.threadId,
      memoryRef,
      recordedAt: "2026-08-14T18:13:00Z",
      render: async (request) => {
        assert.equal(request.photoPromptDigest, original.photoPromptDigest);
        return {
          assetRef: "s3://fibre-memory-visuals/mina/regenerated.webp",
          generatedBy: "fibre.test-renderer-v2",
        };
      },
    });

    assert.equal(regenerated.companion.status, "available");
    const history = identity.getMemoryVisualCompanionHistory(fixture.threadId, memoryRef);
    assert.equal(history.length, 5);
    for (const { companion } of history) {
      assert.equal(companion.photoPromptDigest, original.photoPromptDigest);
      assert.equal(companion.truthStatus, "synthetic_representation_not_historical_evidence");
      assert.deepEqual(companion.sourceReferences, original.sourceReferences);
    }
    assert.equal(identity.verifyThreadIdentityIntegrity(fixture.threadId).memoryPhotoRequirementSatisfied, true);
    identity.close();
  }));
