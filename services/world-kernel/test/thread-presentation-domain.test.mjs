import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeThreadPresentationBundle,
  normalizeThreadPresentationPacket,
  threadPresentationPacketDigest,
} from "../src/thread-presentation-domain.mjs";

function bundle() {
  const provenance = {
    schemaVersion: "presentation-provenance-v0.1",
    provenancePacketId: "prov_can_tho",
    threadId: "thr_pr39_g2_04",
    generatedAt: "2026-08-21T18:00:00Z",
    entries: [
      { provenanceId: "prov_subject", kind: "authoritative_fact", sourceReferences: ["identity_candidate"], note: null },
      { provenanceId: "prov_intro", kind: "editorial", sourceReferences: ["evt_market"], note: "Presentation-only editorial summary." },
      { provenanceId: "prov_origin", kind: "fibre_projection", sourceReferences: ["world_can_tho"], note: null },
      { provenanceId: "prov_place", kind: "authoritative_fact", sourceReferences: ["world_can_tho"], note: null },
      { provenanceId: "prov_relationship", kind: "fibre_projection", sourceReferences: ["world_can_tho"], note: null },
      { provenanceId: "prov_event", kind: "fibre_projection", sourceReferences: ["evt_market"], note: null },
      { provenanceId: "prov_memory", kind: "thread_memory", sourceReferences: ["mem_market"], note: null },
      { provenanceId: "prov_meaning", kind: "thread_meaning", sourceReferences: ["meaning_market"], note: null },
      { provenanceId: "prov_media", kind: "generated_reconstruction", sourceReferences: ["mem_market"], note: "Not historical evidence." },
    ],
  };

  const media = {
    schemaVersion: "thread-media-packet-v0.1",
    mediaPacketId: "media_can_tho",
    threadId: "thr_pr39_g2_04",
    generatedAt: "2026-08-21T18:00:00Z",
    assets: [
      {
        mediaId: "media_portrait",
        kind: "image",
        role: "primary_portrait",
        status: "placeholder",
        locator: null,
        mediaType: null,
        sha256: null,
        width: null,
        height: null,
        durationMs: null,
        posterRef: null,
        unavailableReason: null,
        sourceReferences: ["mem_market"],
        provenanceRef: "prov_media",
        generation: null,
      },
    ],
  };

  const presentation = {
    schemaVersion: "thread-presentation-packet-v0.1",
    manifest: {
      presentationId: "presentation_can_tho",
      threadId: "thr_pr39_g2_04",
      lifecycleStatus: "genesis_candidate",
      fixture: true,
      generatedAt: "2026-08-21T18:00:00Z",
      mediaPacketId: "media_can_tho",
      provenancePacketId: "prov_can_tho",
    },
    subject: {
      displayName: null,
      birthDate: "2004-08-20",
      languages: ["Vietnamese", "English"],
      homePlaceRef: "place_home",
      provenanceRef: "prov_subject",
    },
    introduction: {
      headline: "A life shaped in Cần Thơ.",
      summary: "A presentation fixture built from an unpublished Genesis candidate.",
      sourceReferences: ["evt_market"],
      provenanceRef: "prov_intro",
      mediaRefs: ["media_portrait"],
    },
    origins: [
      {
        originRef: "origin_can_tho",
        title: "Beginnings",
        summary: "A prior life rooted in Cần Thơ.",
        sourceReferences: ["world_can_tho"],
        provenanceRef: "prov_origin",
        mediaRefs: [],
      },
    ],
    places: [
      {
        placeRef: "place_home",
        displayName: "Home in Ninh Kiều",
        region: "Cần Thơ, Vietnam",
        summary: "A mixed residential-commercial neighborhood setting.",
        sourceReferences: ["world_can_tho"],
        provenanceRef: "prov_place",
        mediaRefs: [],
      },
    ],
    relationships: [
      {
        relationshipRef: "rel_sibling",
        displayLabel: "Younger sibling",
        relationshipKind: "sibling",
        summary: "A recurring family relationship across ordinary decisions.",
        sourceReferences: ["world_can_tho"],
        provenanceRef: "prov_relationship",
        mediaRefs: [],
      },
    ],
    life: {
      timeline: [
        {
          eventRef: "evt_market",
          title: "Tomatoes at the market",
          summary: "An ordinary errand completed alone with money and change.",
          occurredAt: "2015-03-15T08:30:00Z",
          placeRef: "place_home",
          participantRefs: ["person_caregiver"],
          sourceReferences: ["evt_market"],
          provenanceRef: "prov_event",
          mediaRefs: [],
        },
      ],
    },
    memories: [
      {
        memoryRef: "mem_market",
        title: "The tomato errand",
        rememberedContent: "Being sent alone to buy tomatoes and returning with the change.",
        uncertainty: ["Exact words spoken in Vietnamese"],
        formedAt: "2015-06-08T04:47:59.999Z",
        sourceReferences: ["mem_market"],
        meaningRefs: ["meaning_market"],
        provenanceRef: "prov_memory",
        mediaRefs: ["media_portrait"],
      },
    ],
    meanings: [
      {
        meaningRef: "meaning_market",
        title: "Being trusted",
        summary: "The errand came to carry a quiet sense of competence and reliability.",
        formedAt: "2015-06-08T04:47:59.999Z",
        memoryRefs: ["mem_market"],
        sourceReferences: ["meaning_market"],
        supersedesMeaningRef: null,
        provenanceRef: "prov_meaning",
        mediaRefs: [],
      },
    ],
  };

  return { presentation, media, provenance };
}

test("P1 accepts an unnamed Unicode Genesis candidate with placeholder media", () => {
  const normalized = normalizeThreadPresentationBundle(bundle());
  assert.equal(normalized.presentation.subject.displayName, null);
  assert.equal(normalized.presentation.subject.birthDate, "2004-08-20");
  assert.match(normalized.presentation.introduction.headline, /Cần Thơ/);
  assert.equal(normalized.presentation.manifest.lifecycleStatus, "genesis_candidate");
  assert.equal(normalized.media.assets[0].status, "placeholder");
  assert.match(threadPresentationPacketDigest(bundle().presentation), /^sha256:[0-9a-f]{64}$/);
});

test("presentation subject cannot invent a pronouns primitive", () => {
  const value = bundle().presentation;
  value.subject = { ...value.subject, pronouns: "they/them" };
  assert.throws(
    () => normalizeThreadPresentationPacket(value),
    /presentation\.subject\.pronouns is not allowed/,
  );
});

test("P1 rejects encounter ontology from ThreadPresentationPacket", () => {
  for (const forbidden of ["encounter", "dailyPlan", "recentLivedContext", "onMyMind"]) {
    const value = bundle().presentation;
    value[forbidden] = {};
    assert.throws(
      () => normalizeThreadPresentationPacket(value),
      new RegExp(`presentation\\.${forbidden} is not allowed`),
    );
  }
});

test("an unpublished Genesis candidate cannot be laundered into a non-fixture presentation", () => {
  const value = bundle().presentation;
  value.manifest = { ...value.manifest, fixture: false };
  assert.throws(
    () => normalizeThreadPresentationPacket(value),
    /genesis_candidate presentation must remain an explicit fixture/,
  );
});

test("memory and meaning sections require their own authority classes", () => {
  const value = bundle();
  value.provenance.entries = value.provenance.entries.map((entry) =>
    entry.provenanceId === "prov_memory" ? { ...entry, kind: "authoritative_fact" } : entry);
  assert.throws(
    () => normalizeThreadPresentationBundle(value),
    /presentation\.memories\[0\] cannot use authoritative_fact provenance/,
  );

  const value2 = bundle();
  value2.provenance.entries = value2.provenance.entries.map((entry) =>
    entry.provenanceId === "prov_meaning" ? { ...entry, kind: "fibre_projection" } : entry);
  assert.throws(
    () => normalizeThreadPresentationBundle(value2),
    /presentation\.meanings\[0\] cannot use fibre_projection provenance/,
  );
});

test("generated media cannot masquerade under factual provenance", () => {
  const value = bundle();
  value.media.assets[0] = {
    ...value.media.assets[0],
    generation: {
      provider: "replaceable-image-provider",
      model: "replaceable-model",
      generatedAt: "2026-08-21T18:00:00Z",
      inputReferences: ["mem_market"],
    },
    provenanceRef: "prov_place",
    sourceReferences: ["world_can_tho"],
  };
  assert.throws(
    () => normalizeThreadPresentationBundle(value),
    /generated media must use generated_reconstruction provenance/,
  );
});

test("presentation claims cannot cite sources absent from their provenance entry", () => {
  const value = bundle();
  value.presentation.introduction = {
    ...value.presentation.introduction,
    sourceReferences: ["evt_other"],
  };
  assert.throws(
    () => normalizeThreadPresentationBundle(value),
    /sourceReferences must be covered by provenance/,
  );
});

test("cross-packet identities and references are bound", () => {
  const wrongThread = bundle();
  wrongThread.media.threadId = "thread_other";
  assert.throws(
    () => normalizeThreadPresentationBundle(wrongThread),
    /threadId values must match/,
  );

  const missingMedia = bundle();
  missingMedia.presentation.introduction = {
    ...missingMedia.presentation.introduction,
    mediaRefs: ["media_missing"],
  };
  assert.throws(
    () => normalizeThreadPresentationBundle(missingMedia),
    /references unknown id: media_missing/,
  );
});
