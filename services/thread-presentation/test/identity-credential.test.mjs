import assert from "node:assert/strict";
import test from "node:test";

import * as presentationApi from "../src/index.mjs";

function identityBundle() {
  return {
    provenance: {
      schemaVersion: "presentation-provenance-v0.1",
      provenancePacketId: "prov_identity_demo",
      threadId: "thr_identity_demo",
      generatedAt: "2026-08-25T12:00:00Z",
      entries: [
        {
          provenanceId: "prov_subject",
          kind: "authoritative_fact",
          sourceReferences: ["registration_demo"],
          note: "Authoritative identity projection source.",
        },
        {
          provenanceId: "prov_intro",
          kind: "editorial",
          sourceReferences: ["registration_demo"],
          note: "Presentation-only introduction.",
        },
        {
          provenanceId: "prov_civil",
          kind: "authoritative_fact",
          sourceReferences: ["registration_demo", "birth_demo", "world_demo"],
          note: "Read-only Fibre civil-registration projection.",
        },
        {
          provenanceId: "prov_visual",
          kind: "fibre_projection",
          sourceReferences: ["emb_demo", "permission_demo"],
          note: "Authorized projection of admitted portrait embodiment; not embodiment authority.",
        },
        {
          provenanceId: "prov_card",
          kind: "fibre_projection",
          sourceReferences: ["registration_demo", "card_demo_1"],
          note: "Replaceable credential presentation.",
        },
        {
          provenanceId: "prov_photo",
          kind: "generated_reconstruction",
          sourceReferences: ["emb_demo", "registration_demo"],
          note: "Derived official identity photograph; not embodiment evidence.",
        },
      ],
    },
    media: {
      schemaVersion: "thread-media-packet-v0.1",
      mediaPacketId: "media_identity_demo",
      threadId: "thr_identity_demo",
      generatedAt: "2026-08-25T12:00:00Z",
      assets: [
        {
          mediaId: "media_official_id_photo",
          kind: "image",
          role: "official_id_photo",
          status: "placeholder",
          locator: null,
          mediaType: null,
          sha256: null,
          width: null,
          height: null,
          durationMs: null,
          posterRef: null,
          unavailableReason: null,
          sourceReferences: ["emb_demo", "registration_demo"],
          provenanceRef: "prov_photo",
          generation: null,
        },
      ],
    },
    presentation: {
      schemaVersion: "thread-presentation-packet-v0.2",
      manifest: {
        presentationId: "presentation_identity_demo",
        threadId: "thr_identity_demo",
        lifecycleStatus: "active",
        fixture: false,
        generatedAt: "2026-08-25T12:00:00Z",
        mediaPacketId: "media_identity_demo",
        provenancePacketId: "prov_identity_demo",
      },
      subject: {
        displayName: "Mira Vale",
        birthDate: "2026-08-25",
        languages: ["English"],
        homePlaceRef: null,
        provenanceRef: "prov_subject",
      },
      introduction: {
        headline: "A Fibre Thread with registered civil identity.",
        summary: "Presentation-only identity credential fixture.",
        sourceReferences: ["registration_demo"],
        provenanceRef: "prov_intro",
        mediaRefs: [],
      },
      origins: [],
      places: [],
      relationships: [],
      life: { timeline: [] },
      memories: [],
      meanings: [],
      civilIdentity: {
        fibreIdentityNumber: "7K3M-2Q-8W5R",
        registrationId: "registration_demo",
        registeredAt: "2026-08-25T10:00:00Z",
        birthEventRef: "birth_demo",
        worldRef: "world_demo",
        issuer: "fibre_civil_registry",
        sourceReferences: ["registration_demo", "birth_demo", "world_demo"],
        provenanceRef: "prov_civil",
      },
      visualIdentity: {
        projectionVersion: "thread-visual-identity-projection-v0.1",
        authority: "authorized_embodiment_projection",
        embodimentId: "emb_demo",
        embodimentRevision: 2,
        specificationDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        subjectDescription: "A stable authorized visual likeness with an oval face, dark wavy hair, and warm brown eyes.",
        renderDescription: "Current portrait embodiment revision, preserving facial proportions, hair, and ordinary presentation.",
        sourceReferences: ["emb_demo", "permission_demo"],
        permissionReferences: ["permission_demo"],
        referenceObjectRefs: [],
        provenanceRef: "prov_visual",
      },
      identityCard: {
        credentialVersion: "fibre-identity-card-credential-v0.1",
        credentialId: "fibre_card_demo_1",
        cardSerial: "FIC-28R9-42",
        revision: 1,
        supersedesCredentialId: null,
        registrationId: "registration_demo",
        displayName: "Mira Vale",
        dateField: { kind: "birth_date", value: "2026-08-25" },
        issuedAt: "2026-08-25T10:05:00Z",
        expiresAt: null,
        status: "active",
        officialPhotoMediaRef: "media_official_id_photo",
        machineReadableCredentialRef: null,
        sourceReferences: ["registration_demo", "card_demo_1"],
        provenanceRef: "prov_card",
      },
    },
  };
}

test("Thread Presentation consumes a supplied FIN but exposes no FIN minting authority", () => {
  const bundle = identityBundle();
  const normalized = presentationApi.normalizeThreadPresentationBundle(bundle);
  assert.equal(normalized.presentation.civilIdentity.fibreIdentityNumber, "7K3M-2Q-8W5R");
  assert.equal(presentationApi.fibreIdentityCardDisplayData(normalized.presentation).fibreIdentityNumber, "7K3M-2Q-8W5R");
  assert.equal("mintFibreIdentityNumber" in presentationApi, false);
  assert.equal("generateFibreIdentityNumber" in presentationApi, false);

  bundle.presentation.identityCard.fibreIdentityNumber = "0AAA-00-AAAA";
  assert.throws(
    () => presentationApi.normalizeThreadPresentationBundle(bundle),
    /identityCard\.fibreIdentityNumber is not allowed/,
  );
});

test("card credential identity is distinct from permanent FIN and reissue preserves civil identity", () => {
  const original = identityBundle();
  const first = presentationApi.fibreIdentityCardDisplayData(
    presentationApi.normalizeThreadPresentationBundle(original).presentation,
  );

  const reissued = identityBundle();
  reissued.presentation.identityCard = {
    ...reissued.presentation.identityCard,
    credentialId: "fibre_card_demo_2",
    cardSerial: "FIC-51T2-77",
    revision: 2,
    supersedesCredentialId: "fibre_card_demo_1",
    issuedAt: "2026-09-01T10:05:00Z",
  };
  reissued.provenance.entries = reissued.provenance.entries.map((entry) =>
    entry.provenanceId === "prov_card"
      ? { ...entry, sourceReferences: ["registration_demo", "card_demo_1"] }
      : entry);
  const second = presentationApi.fibreIdentityCardDisplayData(
    presentationApi.normalizeThreadPresentationBundle(reissued).presentation,
  );

  assert.equal(first.fibreIdentityNumber, second.fibreIdentityNumber);
  assert.notEqual(first.credentialId, second.credentialId);
  assert.notEqual(first.cardSerial, second.cardSerial);

  const illegal = identityBundle();
  illegal.presentation.identityCard.cardSerial = illegal.presentation.civilIdentity.fibreIdentityNumber;
  assert.throws(
    () => presentationApi.normalizeThreadPresentationBundle(illegal),
    /credential identity must be distinct from FIN/,
  );
});

test("official_id_photo is derived presentation media and must be the card photo", () => {
  const valid = identityBundle();
  assert.doesNotThrow(() => presentationApi.normalizeThreadPresentationBundle(valid));

  const factual = identityBundle();
  factual.provenance.entries = factual.provenance.entries.map((entry) =>
    entry.provenanceId === "prov_photo" ? { ...entry, kind: "authoritative_fact" } : entry);
  assert.throws(
    () => presentationApi.normalizeThreadPresentationBundle(factual),
    /official_id_photo must be derived generated image presentation media/,
  );

  const wrongRole = identityBundle();
  wrongRole.media.assets[0].role = "profile_portrait";
  assert.throws(
    () => presentationApi.normalizeThreadPresentationBundle(wrongRole),
    /officialPhotoMediaRef must resolve to official_id_photo image media/,
  );
});

test("identity card cannot drift from authoritative civil registration or presented identity", () => {
  const wrongRegistration = identityBundle();
  wrongRegistration.presentation.identityCard.registrationId = "registration_other";
  assert.throws(
    () => presentationApi.normalizeThreadPresentationBundle(wrongRegistration),
    /registrationId must match civil identity registrationId/,
  );

  const wrongName = identityBundle();
  wrongName.presentation.identityCard.displayName = "Another Name";
  assert.throws(
    () => presentationApi.normalizeThreadPresentationBundle(wrongName),
    /displayName must match the current presented subject name/,
  );

  const wrongBirthDate = identityBundle();
  wrongBirthDate.presentation.identityCard.dateField.value = "2026-08-24";
  assert.throws(
    () => presentationApi.normalizeThreadPresentationBundle(wrongBirthDate),
    /birth date must match the current presented subject birth date/,
  );
});

test("Genesis candidates cannot acquire live FIN/card identity through presentation", () => {
  const candidate = identityBundle();
  candidate.presentation.manifest.lifecycleStatus = "genesis_candidate";
  candidate.presentation.manifest.fixture = true;
  assert.throws(
    () => presentationApi.normalizeThreadPresentationPacket(candidate.presentation),
    /genesis_candidate presentation cannot carry live civil identity or an identity card/,
  );
});

test("v0.1 Thread Presentation remains a supported compatibility boundary", async () => {
  const { readFile } = await import("node:fs/promises");
  const base = new URL("../../../fixtures/thread-presentation/can-tho/", import.meta.url);
  const bundle = {
    presentation: JSON.parse(await readFile(new URL("presentation.json", base), "utf8")),
    media: JSON.parse(await readFile(new URL("media.json", base), "utf8")),
    provenance: JSON.parse(await readFile(new URL("provenance.json", base), "utf8")),
  };
  const normalized = presentationApi.normalizeThreadPresentationBundle(bundle);
  assert.equal(normalized.presentation.schemaVersion, presentationApi.THREAD_PRESENTATION_PACKET_LEGACY_VERSION);
  assert.equal(presentationApi.THREAD_PRESENTATION_PACKET_VERSION, presentationApi.THREAD_PRESENTATION_PACKET_CURRENT_VERSION);
  assert.deepEqual(
    presentationApi.THREAD_PRESENTATION_PACKET_VERSIONS,
    [presentationApi.THREAD_PRESENTATION_PACKET_LEGACY_VERSION, presentationApi.THREAD_PRESENTATION_PACKET_CURRENT_VERSION],
  );
});
