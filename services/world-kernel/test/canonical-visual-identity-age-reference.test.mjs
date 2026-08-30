import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { planThreadPresentationAssetSlots } from "../src/thread-presentation-asset-planner.mjs";
import { CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS } from "../src/visual-identity-reference-domain.mjs";

async function canonicalReferenceBundle() {
  const base = new URL("../../../fixtures/thread-presentation/can-tho/", import.meta.url);
  const presentation = JSON.parse(await readFile(new URL("presentation.json", base), "utf8"));
  const media = JSON.parse(await readFile(new URL("media.json", base), "utf8"));
  const provenance = JSON.parse(await readFile(new URL("provenance.json", base), "utf8"));

  presentation.schemaVersion = "thread-presentation-packet-v0.2";
  presentation.manifest.lifecycleStatus = "active";
  presentation.civilIdentity = {
    fibreIdentityNumber: "7K3M-2Q-8W5R",
    registrationId: "registration_age_reference",
    registeredAt: "2026-08-21T18:20:00Z",
    birthEventRef: "birth_age_reference",
    worldRef: "world_age_reference",
    issuer: "fibre_civil_registry",
    sourceReferences: ["registration_age_reference", "birth_age_reference", "world_age_reference"],
    provenanceRef: "prov_age_reference_civil",
  };
  presentation.visualIdentity = {
    projectionVersion: "thread-visual-identity-projection-v0.1",
    authority: "authorized_embodiment_projection",
    embodimentId: "embodiment_age_reference",
    embodimentRevision: 2,
    specificationDigest: `sha256:${"a".repeat(64)}`,
    subjectDescription: "A stable canonical facial identity with explicitly recorded proportions, asymmetries, hairline, skin detail, eye spacing, nose geometry, jaw shape, and distinctive marks.",
    renderDescription: "Natural photographic rendering used only to preserve the same person's visual identity across age, expression, clothing, and scene changes.",
    sourceReferences: ["embodiment_age_reference", "visual_identity_spec_age_reference"],
    permissionReferences: ["permission_age_reference"],
    referenceObjectRefs: ["asset_visual_identity_root_age_reference"],
    provenanceRef: "prov_age_reference_visual_identity",
  };
  presentation.identityCard = {
    credentialVersion: "fibre-identity-card-credential-v0.1",
    credentialId: "fibre_card_age_reference",
    cardSerial: "FIC-AGE-REFERENCE-1",
    revision: 1,
    supersedesCredentialId: null,
    registrationId: "registration_age_reference",
    displayName: presentation.subject.displayName,
    dateField: { kind: "birth_date", value: presentation.subject.birthDate },
    issuedAt: "2026-08-21T18:25:00Z",
    expiresAt: null,
    status: "active",
    visibility: "private",
    officialPhotoMediaRef: "media_portrait_primary",
    machineReadableCredentialRef: null,
    sourceReferences: ["registration_age_reference", "fibre_card_age_reference"],
    provenanceRef: "prov_age_reference_card",
  };

  media.assets = media.assets.map((asset) =>
    asset.mediaId === "media_portrait_primary"
      ? { ...asset, role: "official_id_photo" }
      : asset);

  provenance.entries.push(
    {
      provenanceId: "prov_age_reference_civil",
      kind: "authoritative_fact",
      sourceReferences: ["registration_age_reference", "birth_age_reference", "world_age_reference"],
      note: "Authoritative civil identity for canonical-reference age test.",
    },
    {
      provenanceId: "prov_age_reference_visual_identity",
      kind: "fibre_projection",
      sourceReferences: ["embodiment_age_reference", "visual_identity_spec_age_reference", "permission_age_reference", "asset_visual_identity_root_age_reference"],
      note: "Authorized projection of one immutable canonical visual-identity root.",
    },
    {
      provenanceId: "prov_age_reference_card",
      kind: "fibre_projection",
      sourceReferences: ["registration_age_reference", "fibre_card_age_reference"],
      note: "Private identity-card projection for official-photo planning.",
    },
  );

  return { presentation, media, provenance };
}

test("one immutable canonical visual-identity root conditions current and historical images at different target ages", async () => {
  const bundle = await canonicalReferenceBundle();
  const plan = planThreadPresentationAssetSlots({
    bundle,
    snapshotObjectRef: "snapshot_age_reference",
    snapshotDigest: `sha256:${"b".repeat(64)}`,
  });

  const official = plan.slots.find((slot) => slot.role === "official_id_photo");
  const memory = plan.slots.find((slot) => slot.mediaId === "media_memory_tomatoes");

  assert.ok(official, "official ID-photo slot must be planned");
  assert.ok(memory, "historical memory slot must be planned");
  assert.equal(official.status, "missing");
  assert.equal(memory.status, "missing");

  const canonicalRoot = "asset_visual_identity_root_age_reference";
  assert.deepEqual(official.referenceObjectRefs, [canonicalRoot]);
  assert.deepEqual(memory.referenceObjectRefs, [canonicalRoot]);
  assert.equal(official.context.referenceAgeYears, CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS);
  assert.equal(memory.context.referenceAgeYears, CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS);
  assert.equal(CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS, 25);

  assert.equal(official.context.targetAgeYears, 22, "official photo uses age at presentation generation time");
  assert.equal(memory.context.targetAgeYears, 10, "memory uses age at its referenced historical event");
  assert.notEqual(official.context.targetAgeYears, memory.context.targetAgeYears);

  assert.match(official.brief.description, /22 years old/);
  assert.match(memory.brief.description, /10 years old/);
  assert.match(official.brief.description, /normalized reference age 25/);
  assert.match(memory.brief.description, /normalized reference age 25/);
});
