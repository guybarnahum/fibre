import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryInfraDriver } from "#infra/providers/local";
import {
  createFidCardAssetDescriptor,
  materializeFidCardAsset,
} from "../src/fid-presentation-projector.mjs";

function activeFid() {
  return {
    threadId:"thr_card_asset",
    credentialId:"fidc_card_asset_2",
    revision:2,
    supersedesCredentialId:"fidc_card_asset_1",
    registrationId:"registration_card_asset",
    issuerAuthorityId:"fibre_identity_authority",
    issuanceRecordDigest:"sha256:1111111111111111111111111111111111111111111111111111111111111111",
    photoAdmissionId:"photo_admission_card_asset",
    photoDigest:"sha256:2222222222222222222222222222222222222222222222222222222222222222",
    issuedAt:"2026-09-19T20:00:00.000Z",
    expiresAt:null,
    status:"active",
    front:{
      objectRef:"fidcard_fidc_card_asset_2_front",
      digest:"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      mediaType:"image/png",
      width:1016,
      height:640,
    },
    back:{
      objectRef:"fidcard_fidc_card_asset_2_back",
      digest:"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      mediaType:"image/png",
      width:1016,
      height:640,
    },
  };
}

test("rich FIN card descriptor binds the exact immutable front and back", () => {
  const descriptor = createFidCardAssetDescriptor(activeFid());
  assert.deepEqual(descriptor, {
    schemaVersion:"fibre-identity-card-asset-v0.1",
    credentialId:"fidc_card_asset_2",
    revision:2,
    aspectRatio:1.586,
    interaction:{ flip:"click", initialSide:"front" },
    front:{
      objectRef:"fidcard_fidc_card_asset_2_front",
      digest:"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      mediaType:"image/png",
      width:1016,
      height:640,
    },
    back:{
      objectRef:"fidcard_fidc_card_asset_2_back",
      digest:"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      mediaType:"image/png",
      width:1016,
      height:640,
    },
  });
});

test("rich FIN card descriptor is stored as one immutable document asset", async () => {
  const infra = createMemoryInfraDriver();
  const active = activeFid();
  const materialized = await materializeFidCardAsset(infra, active);

  assert.equal(materialized.cardAsset.objectRef, "fidcard_fidc_card_asset_2_card");
  assert.equal(materialized.cardAsset.mediaType, "application/vnd.fibre.identity-card+json");
  assert.match(materialized.cardAsset.digest, /^sha256:[0-9a-f]{64}$/u);

  const stored = await infra.objects.get(materialized.cardAsset.objectRef);
  assert.equal(stored.digest, materialized.cardAsset.digest);
  assert.deepEqual(
    JSON.parse(new TextDecoder().decode(stored.bytes)),
    createFidCardAssetDescriptor(active),
  );

  const replay = await materializeFidCardAsset(infra, active);
  assert.equal(replay.cardAsset.digest, materialized.cardAsset.digest, "same credential must materialize the same rich asset");
});
