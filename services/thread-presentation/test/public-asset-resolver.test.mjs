import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryInfraDriver } from "#infra/providers/local";
import {
  PublicPresentationAssetIntegrityError,
  createPublicPresentationAssetResolver,
  threadPresentationChannelId,
} from "../src/index.mjs";

const THREAD_ID = "thr_asset_resolver_demo";
const MEDIA_ID = "media_asset_resolver_demo";
const OBJECT_REF = "asset_resolver_demo";
const DIGEST = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function currentSnapshot({ role = "place", card = null } = {}) {
  return {
    pointer: { threadId: THREAD_ID },
    snapshot: {
      presentation: { identityCard: card },
      media: {
        assets: [{
          mediaId: MEDIA_ID,
          kind: "image",
          role,
        }],
      },
    },
  };
}

async function fixture({
  channelPublic = true,
  mediaPublic = true,
  mediaRole = "place",
  currentRole = mediaRole,
  identityCredentialMedia = false,
  card = null,
  mediaDigest = DIGEST,
  objectDigest = DIGEST,
} = {}) {
  const infra = createMemoryInfraDriver();
  const channelId = threadPresentationChannelId(THREAD_ID);
  await infra.catalog.upsert(channelId, {
    channelId,
    threadId: THREAD_ID,
    publiclyVisible: channelPublic,
  });
  await infra.objects.putImmutable(
    OBJECT_REF,
    new TextEncoder().encode("public-asset-bytes"),
    objectDigest,
    { kind: "credentialed_generated_media" },
  );
  await infra.catalog.upsert(`media:${OBJECT_REF}`, {
    kind: "public_presentation_media",
    publiclyVisible: mediaPublic,
    identityCredentialMedia,
    threadId: THREAD_ID,
    mediaId: MEDIA_ID,
    role: mediaRole,
    objectRef: OBJECT_REF,
    digest: mediaDigest,
    mediaType: "image/png",
    provenanceClass: "generated_reconstruction",
    eventId: "event_media_ready_asset_resolver_demo",
    eventSequence: 1,
  });
  const presentationReader = {
    async getSnapshot(requestedChannelId) {
      assert.equal(requestedChannelId, channelId);
      return currentSnapshot({ role: currentRole, card });
    },
  };
  return {
    infra,
    resolver: createPublicPresentationAssetResolver({ infra, presentationReader }),
  };
}

test("public asset resolver returns only stable Fibre serving metadata and immutable bytes", async () => {
  const { resolver } = await fixture();
  const resolved = await resolver.resolve(OBJECT_REF);

  assert.equal(resolved.objectRef, OBJECT_REF);
  assert.equal(resolved.threadId, THREAD_ID);
  assert.equal(resolved.mediaId, MEDIA_ID);
  assert.equal(resolved.role, "place");
  assert.equal(resolved.digest, DIGEST);
  assert.equal(resolved.mediaType, "image/png");
  assert.equal(resolved.provenanceClass, "generated_reconstruction");
  assert.equal(new TextDecoder().decode(resolved.bytes), "public-asset-bytes");
  assert.equal("url" in resolved, false);
  assert.equal("bucket" in resolved, false);
  assert.equal("provider" in resolved, false);
});

test("object possession or a hidden publication projection cannot make an asset public", async () => {
  const infra = createMemoryInfraDriver();
  await infra.objects.putImmutable(
    OBJECT_REF,
    new TextEncoder().encode("private-object"),
    DIGEST,
    { kind: "credentialed_generated_media" },
  );
  const resolver = createPublicPresentationAssetResolver({
    infra,
    presentationReader: { async getSnapshot() { throw new Error("must not be reached"); } },
  });
  assert.equal(await resolver.resolve(OBJECT_REF), null);

  const hidden = await fixture({ mediaPublic: false });
  assert.equal(await hidden.resolver.resolve(OBJECT_REF), null);

  const hiddenChannel = await fixture({ channelPublic: false });
  assert.equal(await hiddenChannel.resolver.resolve(OBJECT_REF), null);
});

test("Thread compatibility scoping cannot resolve another Thread's public asset", async () => {
  const { resolver } = await fixture();
  assert.equal(
    await resolver.resolve(OBJECT_REF, { expectedThreadId: "thr_someone_else" }),
    null,
  );
});

test("current presentation state defeats stale roles and private identity-photo catalog mistakes", async () => {
  const stale = await fixture({ mediaRole: "place", currentRole: "memory_reconstruction" });
  assert.equal(await stale.resolver.resolve(OBJECT_REF), null);

  const privatePhoto = await fixture({
    mediaRole: "official_id_photo",
    currentRole: "official_id_photo",
    identityCredentialMedia: true,
    card: {
      officialPhotoMediaRef: MEDIA_ID,
      visibility: "private",
    },
  });
  assert.equal(await privatePhoto.resolver.resolve(OBJECT_REF), null);
});

test("published catalog digest must match immutable object storage", async () => {
  const { resolver } = await fixture({
    mediaDigest: DIGEST,
    objectDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  });
  await assert.rejects(
    resolver.resolve(OBJECT_REF),
    PublicPresentationAssetIntegrityError,
  );
});
