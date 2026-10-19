import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { planThreadPresentationAssetSlots, planThreadPresentationAssetSlotsWithAdmittedAges } from "../src/thread-presentation-asset-planner.mjs";
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

});


test("approved age portraits influence a historical memory but never replace identity authority",async()=>{
  const bundle=await canonicalReferenceBundle();
  const threadId=bundle.presentation.manifest.threadId;
  const canonicalRef=bundle.presentation.visualIdentity.referenceObjectRefs[0];
  const rootDigest="sha256:"+"c".repeat(64);
  const admitted=(age,objectRef,overrides={})=>({
    contract:"visual-age-anchor-admission-v0.1",threadId,
    admissionId:"admission_"+objectRef,targetAgeYears:age,
    portraitObjectRef:objectRef,portraitDigest:"sha256:"+"d".repeat(64),
    canonicalReferenceObjectRef:canonicalRef,canonicalReferenceDigest:rootDigest,
    sourceAnchorRefs:[],generationReceiptRef:"receipt_"+objectRef,
    approvalRef:"approval_"+objectRef,admittedAt:"2026-10-19T00:00:00Z",
    ...overrides,
  });
  let admissions=[
    admitted(7,"portrait_7"),admitted(12,"portrait_12"),
    admitted(10,"foreign_portrait",{threadId:"thr_not_this_thread"}),
    admitted(10,"retired_portrait",{canonicalReferenceDigest:"sha256:"+"e".repeat(64)}),
  ];
  const infra={
    catalog:{async list({prefix}){
      assert.equal(prefix,"visual-age-anchor:admission:"+threadId+":");
      return {entries:admissions.map(value=>({value})),nextCursor:null};
    }},
    objects:{async head(ref){
      assert.equal(ref,canonicalRef);
      return {digest:rootDigest};
    }},
  };
  const request=()=>planThreadPresentationAssetSlotsWithAdmittedAges({
    bundle,snapshotObjectRef:"snapshot_age_anchor_memory",
    snapshotDigest:"sha256:"+"b".repeat(64),infra,
  });
  const initial=await request();
  const memory=initial.slots.find(slot=>slot.mediaId==="media_memory_tomatoes");
  const idPhoto=initial.slots.find(slot=>slot.role==="official_id_photo");
  assert.equal(memory.context.targetAgeYears,10,"memory's experienced age was lost");
  assert.deepEqual(memory.referenceObjectRefs,[canonicalRef,"portrait_7","portrait_12"],
    "historical likeness did not interpolate between approved ages");
  assert.ok(memory.brief.description.includes("image 2 is the admitted age-7 portrait")
    &&memory.brief.description.includes("image 3 is the admitted age-12 portrait"),
    "historical depiction was not told the selected reference ages");
  assert.deepEqual(idPhoto.referenceObjectRefs,[canonicalRef],
    "age anchors changed official civil identity imagery");
  const previousDigest=memory.sourceDigest;

  admissions.push(admitted(12,"portrait_12_new",{admittedAt:"2026-10-20T00:00:00Z"}));
  const newer=(await request()).slots.find(slot=>slot.mediaId==="media_memory_tomatoes");
  assert.deepEqual(newer.referenceObjectRefs,[canonicalRef,"portrait_7","portrait_12_new"],
    "later approval could not guide a future reconstruction");
  assert.notEqual(newer.sourceDigest,previousDigest,
    "a newly admitted portrait was not reflected in future demand identity");

  admissions=[];
  const fallback=(await request()).slots.find(slot=>slot.mediaId==="media_memory_tomatoes");
  assert.deepEqual(fallback.referenceObjectRefs,[canonicalRef],
    "memory depiction did not preserve canonical-only behavior without anchors");
  assert.equal(fallback.brief.description.includes("image 2 is the admitted"),false,
    "unavailable age portraits were invented in memory generation");
});
