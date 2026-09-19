import assert from "node:assert/strict";
import test from "node:test";

import { resolveCloudThreadFidSource } from "./cloud-thread-source.mjs";

const THREAD_ID = "thr_cloud_fid_001";
const FIN = "8PKH-A4-VH5R";
const ROOT = "asset_visual_root_001";
const PHOTO = "asset_official_photo_001";
const ROOT_DIGEST = `sha256:${"a".repeat(64)}`;
const PHOTO_DIGEST = `sha256:${"b".repeat(64)}`;

function world() {
  return {
    observatory:{
      threadId:THREAD_ID,
      civilRegistration:{
        registrationVersion:"fibre-civil-registration-v1",
        registrationId:"civreg_demo",
        threadId:THREAD_ID,
        fibreIdentityNumber:FIN,
        registeredAt:"2026-09-01T12:00:00.000Z",
        birthEventRef:"birth_demo",
        worldRef:"world_demo",
        issuer:"fibre_civil_registry",
        finPolicyRef:"fibre-fin-luhn-mod-n32-v1",
        registrationDigest:`sha256:${"c".repeat(64)}`,
      },
      embodiments:[{
        asset:{ referenceObjectRef:ROOT, sha256:ROOT_DIGEST },
      }],
    },
  };
}

function presentation(status = "ready") {
  return {
    pointer:{ threadId:THREAD_ID },
    snapshot:{
      presentation:{
        subject:{ displayName:"Mira Vale", birthDate:"2004-03-18" },
        civilIdentity:{ registrationId:"civreg_demo", fibreIdentityNumber:FIN },
        visualIdentity:{ referenceObjectRefs:[ROOT] },
        identityCard:{ officialPhotoMediaRef:"media_official" },
      },
      media:{ assets:[{
        mediaId:"media_official",
        role:"official_id_photo",
        status,
        locator:status === "ready" ? PHOTO : null,
        mediaType:status === "ready" ? "image/png" : null,
        sha256:status === "ready" ? PHOTO_DIGEST : null,
        provenanceRef:"prov_official",
        sourceReferences:[ROOT],
        generation:status === "ready" ? { inputReferences:[ROOT] } : null,
      }] },
    },
  };
}

function fetcher(status = "ready") {
  return async (input) => {
    const url = new URL(input);
    if (url.hostname === "world.example") return Response.json(world());
    if (url.pathname.includes("/snapshot")) return Response.json(presentation(status));
    if (url.pathname.includes("/api/assets/")) return new Response(Uint8Array.from([137,80,78,71]), {
      headers:{ "content-type":"image/png" },
    });
    return new Response(null, { status:404 });
  };
}

test("cloud Thread source resolves authoritative identity and its official photo", async () => {
  const source = await resolveCloudThreadFidSource({
    threadId:THREAD_ID,
    worldBaseUrl:"https://world.example",
    presentationBaseUrl:"https://presentation.example",
    viewerOrigin:"https://viewer.example",
    privateToken:"test-token",
    fetchImpl:fetcher(),
  });
  assert.equal(source.threadId, THREAD_ID, "wrong Thread");
  assert.equal(source.displayName, "Mira Vale", "wrong name");
  assert.equal(source.civilRegistration.fibreIdentityNumber, FIN, "wrong FIN");
  assert.equal(source.visualIdentity.digest, ROOT_DIGEST, "wrong visual root");
  assert.equal(source.photo.objectRef, PHOTO, "wrong official photo");
  assert.equal(source.photo.bytes.byteLength, 4, "photo bytes missing");
});

test("cloud Thread source refuses a non-ready official photo", async () => {
  await assert.rejects(
    () => resolveCloudThreadFidSource({
      threadId:THREAD_ID,
      worldBaseUrl:"https://world.example",
      presentationBaseUrl:"https://presentation.example",
      viewerOrigin:"https://viewer.example",
      privateToken:"test-token",
      fetchImpl:fetcher("pending"),
    }),
    /official ID photo is pending/,
  );
});
