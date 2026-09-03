import assert from "node:assert/strict";
import test from "node:test";

import { inspectSliceGPublicClosure, verifySliceGPublicClosure } from "./cloudflare-e2e-slice-g.mjs";

const THREAD_ID = "thr_slice_g_cloud_001";
const ROOT = "asset_canonical_root_001";
const PHOTO = "asset_official_photo_001";
const MEDIA = "media_official_id_photo_001";

function evidence() {
  return {
    request: { developmentPlanThreadId: THREAD_ID },
    endpoints: {
      threadPresentation: "https://api.staging.insidefibre.com",
      viewer: "https://staging.insidefibre.com",
    },
    world: { civilRegistration: { registrationId: "civil_reg_001" } },
  };
}

function snapshot({ inputs = [ROOT], status = "ready" } = {}) {
  return {
    pointer: { threadId: THREAD_ID },
    snapshot: {
      presentation: {
        visualIdentity: { referenceObjectRefs: [ROOT] },
        identityCard: {
          credentialId: "fibre_card_001",
          cardSerial: "FIC-001",
          registrationId: "civil_reg_001",
          status: "active",
          visibility: "public",
          officialPhotoMediaRef: MEDIA,
        },
      },
      media: {
        assets: [{
          mediaId: MEDIA,
          kind: "image",
          role: "official_id_photo",
          status,
          locator: PHOTO,
          generation: {
            provider: "bfl",
            model: "flux-2-pro",
            generatedAt: "2026-09-03T15:00:00Z",
            inputReferences: inputs,
          },
        }],
      },
    },
  };
}

test("Slice G requires a ready official photo generated from the canonical root", () => {
  const result = inspectSliceGPublicClosure(snapshot(), evidence());
  assert.equal(result.objectRef, PHOTO);
  assert.equal(result.canonicalRootObjectRef, ROOT);
  assert.deepEqual(result.generation.inputReferences, [ROOT]);
  assert.throws(() => inspectSliceGPublicClosure(snapshot({ inputs: [] }), evidence()), /not generated from the admitted canonical root/);
  assert.throws(() => inspectSliceGPublicClosure(snapshot({ status: "pending" }), evidence()), /not ready/);
});

test("Slice G verifies final official-photo bytes and provenance", async () => {
  const calls = [];
  const result = await verifySliceGPublicClosure({
    evidence: evidence(),
    async fetchImpl(url) {
      calls.push(String(url));
      if (String(url).includes("/snapshot")) {
        return new Response(JSON.stringify(snapshot()), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (String(url).includes(`/api/assets/${PHOTO}`)) {
        return new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: {
            "content-type": "image/png",
            "x-fibre-provenance": "generated_reconstruction",
            etag: "photo-etag",
          },
        });
      }
      throw new Error(`unexpected URL ${url}`);
    },
  });
  assert.equal(result.officialPhotoAsset.byteLength, 3);
  assert.equal(result.officialPhotoAsset.provenanceClass, "generated_reconstruction");
  assert.equal(calls.length, 2);
});
