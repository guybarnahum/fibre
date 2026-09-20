import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryInfraDriver } from "#infra/providers/local";
import {
  createFidCardAssetDescriptor,
  materializeFidCardAsset,
  projectFidThreadPresentation,
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

function presentationBundle() {
  return {
    presentation:{
      schemaVersion:"thread-presentation-packet-v0.2",
      manifest:{
        presentationId:"presentation_card_asset",
        threadId:"thr_card_asset",
        lifecycleStatus:"active",
        fixture:false,
        generatedAt:"2026-09-19T19:00:00.000Z",
        mediaPacketId:"media_card_asset",
        provenancePacketId:"prov_card_asset",
      },
      subject:{
        displayName:"Mira Vale",
        birthDate:"2004-08-20",
        languages:["English"],
        homePlaceRef:null,
        provenanceRef:"prov_subject",
      },
      introduction:{
        headline:"Mira Vale",
        summary:"Current public presentation.",
        sourceReferences:["registration_card_asset"],
        provenanceRef:"prov_intro",
        mediaRefs:[],
      },
      origins:[],
      places:[],
      relationships:[],
      life:{ timeline:[] },
      memories:[],
      meanings:[],
      civilIdentity:{
        fibreIdentityNumber:"7K3M-2Q-8W5R",
        registrationId:"registration_card_asset",
        registeredAt:"2026-09-19T18:00:00.000Z",
        birthEventRef:"birth_card_asset",
        worldRef:"world_card_asset",
        issuer:"fibre_civil_registry",
        sourceReferences:["registration_card_asset","birth_card_asset","world_card_asset"],
        provenanceRef:"prov_civil",
      },
      visualIdentity:null,
      identityCard:null,
    },
    media:{
      schemaVersion:"thread-media-packet-v0.1",
      mediaPacketId:"media_card_asset",
      threadId:"thr_card_asset",
      generatedAt:"2026-09-19T19:00:00.000Z",
      assets:[],
    },
    provenance:{
      schemaVersion:"presentation-provenance-v0.1",
      provenancePacketId:"prov_card_asset",
      threadId:"thr_card_asset",
      generatedAt:"2026-09-19T19:00:00.000Z",
      entries:[
        {
          provenanceId:"prov_subject",
          kind:"authoritative_fact",
          sourceReferences:["registration_card_asset"],
          note:null,
        },
        {
          provenanceId:"prov_intro",
          kind:"editorial",
          sourceReferences:["registration_card_asset"],
          note:null,
        },
        {
          provenanceId:"prov_civil",
          kind:"authoritative_fact",
          sourceReferences:["registration_card_asset","birth_card_asset","world_card_asset"],
          note:null,
        },
      ],
    },
  };
}

test("FID projection publishes front, back and one logical rich card asset", async () => {
  const infra = createMemoryInfraDriver();
  const enriched = await materializeFidCardAsset(infra, activeFid());
  const projected = projectFidThreadPresentation({
    bundle:presentationBundle(),
    activeFid:enriched,
    projectedAt:"2026-09-19T20:05:00.000Z",
    visibility:"public",
  });

  const cardAssets = projected.media.assets.filter((asset) => asset.role.startsWith("fibre_identity_card"));
  assert.equal(cardAssets.length, 3);
  assert.deepEqual(
    cardAssets.map((asset) => [asset.role, asset.kind, asset.mediaType]),
    [
      ["fibre_identity_card_front","image","image/png"],
      ["fibre_identity_card_back","image","image/png"],
      ["fibre_identity_card","document","application/vnd.fibre.identity-card+json"],
    ],
  );
  assert.equal(projected.presentation.identityCard.frontMediaRef, "media_fid_fidc_card_asset_2_front");
  assert.equal(projected.presentation.identityCard.backMediaRef, "media_fid_fidc_card_asset_2_back");
});

