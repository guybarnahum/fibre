import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSourceMaterialEncounteredByThread,
  genesisOriginIntegrityFixtureDigest,
  normalizeGenesisOriginIntegrityFixture,
  projectOriginSourceForThreadLife,
} from "../src/genesis-origin-source-integrity.mjs";

const MATERIAL = Object.freeze({
  kind: "book",
  subjectKind: "work",
  subjectLabel: "A source-authored essay about how maps omit contested boundaries",
});

function echoFixture(overrides = {}) {
  return {
    fixtureId: "origin_echo_fixture_001",
    threadId: "thr_echo_fixture_001",
    originKind: "echo",
    threadParent: null,
    fork: null,
    sourceBundle: {
      sourcePartyId: "human_source_fixture_001",
      subjectStatus: "living",
      consentAuthorityRef: "consent_echo_fixture_001",
      subjectStatusAttestationRef: null,
      publicSourceRefs: ["public_source_fixture_001"],
      protectedBiographyFacts: [
        "The source spent part of childhood in a coastal city and later described a family disagreement about moving away.",
      ],
      approvedMaterials: [MATERIAL],
      ...overrides,
    },
  };
}

function homageFixture(overrides = {}) {
  return {
    fixtureId: "origin_homage_fixture_001",
    threadId: "thr_homage_fixture_001",
    originKind: "homage",
    threadParent: null,
    fork: null,
    sourceBundle: {
      sourcePartyId: "source_homage_fixture_001",
      subjectStatus: "deceased",
      consentAuthorityRef: null,
      subjectStatusAttestationRef: "attestation_homage_fixture_001",
      publicSourceRefs: ["public_source_homage_fixture_001"],
      protectedBiographyFacts: ["The source was raised by an aunt after a parent died."],
      approvedMaterials: [MATERIAL],
      ...overrides,
    },
  };
}

function encounterEpisode(threadId, subjectLabel = MATERIAL.subjectLabel) {
  return {
    episodeId: "epi_origin_source_encounter_001",
    occurredAt: "2012-06-01T16:00:00Z",
    ageAtEvent: 16,
    placeRef: "place_library",
    participantRefs: [threadId],
    observableAction: "The student reads the essay at a library table, compares two maps printed beside it, and copies one disputed boundary label into a notebook.",
    structureRef: null,
    introducedParticipants: [],
    intellectualEncounter: {
      kind: "book",
      subjectKind: "work",
      subjectLabel,
      participantRef: null,
      accessMode: "self_directed",
    },
  };
}

test("living identifiable source requires Echo consent even when public sources exist", () => {
  assert.throws(
    () => normalizeGenesisOriginIntegrityFixture(echoFixture({ consentAuthorityRef: null })),
    /consentAuthorityRef is required/,
  );
  const normalized = normalizeGenesisOriginIntegrityFixture(echoFixture());
  assert.equal(normalized.originKind, "echo");
  assert.equal(normalized.sourceBundle.subjectStatus, "living");
  assert.match(genesisOriginIntegrityFixtureDigest(normalized), /^sha256:[0-9a-f]{64}$/);
});

test("living source cannot be relabeled Homage and Homage requires explicit deceased or fictional attestation", () => {
  assert.throws(
    () => normalizeGenesisOriginIntegrityFixture(homageFixture({ subjectStatus: "living" })),
    /Homage requires attested deceased or fictional subject status/,
  );
  assert.throws(
    () => normalizeGenesisOriginIntegrityFixture(homageFixture({ subjectStatusAttestationRef: null })),
    /subjectStatusAttestationRef is required/,
  );
  assert.equal(normalizeGenesisOriginIntegrityFixture(homageFixture()).sourceBundle.subjectStatus, "deceased");
  assert.equal(normalizeGenesisOriginIntegrityFixture(homageFixture({ subjectStatus: "fictional" })).sourceBundle.subjectStatus, "fictional");
});

test("source biography remains protected fixture evidence rather than Thread-life projection", () => {
  const fixture = echoFixture();
  const projection = projectOriginSourceForThreadLife(fixture);
  const serialized = JSON.stringify(projection);
  assert.equal(serialized.includes("coastal city"), false);
  assert.equal(serialized.includes("family disagreement"), false);
  assert.equal(Object.hasOwn(projection, "protectedBiographyFacts"), false);
  assert.equal(Object.hasOwn(projection, "publicSourceRefs"), false);
  assert.equal(projection.sourceDisclosure.consentAuthorityRef, "consent_echo_fixture_001");
  assert.equal(projection.approvedMaterials.length, 1);
  assert.match(projection.approvedMaterials[0].subjectRef, /^isrc_[0-9a-f]{64}$/);
});

test("approved source material becomes Thread formation only through an actual matching Thread encounter", () => {
  const fixture = echoFixture();
  const projection = projectOriginSourceForThreadLife(fixture);
  const materialRef = projection.approvedMaterials[0].subjectRef;
  const episode = encounterEpisode(fixture.threadId);
  const witness = assertSourceMaterialEncounteredByThread({
    originFixture: fixture,
    sourceMaterialRef: materialRef,
    encounterEpisodeRef: episode.episodeId,
    episodes: [episode],
  });
  assert.deepEqual(witness, {
    fixtureId: fixture.fixtureId,
    threadId: fixture.threadId,
    sourceMaterialRef: materialRef,
    encounterEpisodeRef: episode.episodeId,
  });

  const noEncounter = structuredClone(episode);
  delete noEncounter.intellectualEncounter;
  assert.throws(
    () => assertSourceMaterialEncounteredByThread({
      originFixture: fixture,
      sourceMaterialRef: materialRef,
      encounterEpisodeRef: noEncounter.episodeId,
      episodes: [noEncounter],
    }),
    /without an intellectual encounter/,
  );

  const other = encounterEpisode(fixture.threadId, "A different essay about municipal water pricing");
  assert.throws(
    () => assertSourceMaterialEncounteredByThread({
      originFixture: fixture,
      sourceMaterialRef: materialRef,
      encounterEpisodeRef: other.episodeId,
      episodes: [other],
    }),
    /does not match the approved source material/,
  );
});

test("source-material encounter cannot be borrowed from another Thread's episode", () => {
  const fixture = echoFixture();
  const materialRef = projectOriginSourceForThreadLife(fixture).approvedMaterials[0].subjectRef;
  const foreign = encounterEpisode("thr_someone_else");
  assert.throws(
    () => assertSourceMaterialEncounteredByThread({
      originFixture: fixture,
      sourceMaterialRef: materialRef,
      encounterEpisodeRef: foreign.episodeId,
      episodes: [foreign],
    }),
    /does not involve the origin Thread/,
  );
});

test("Thread-parent fixture refuses fabricated retrospective shared childhood", () => {
  const fixture = {
    fixtureId: "origin_thread_parent_fixture_001",
    threadId: "thr_child_fixture_001",
    originKind: "thread_parent",
    sourceBundle: null,
    fork: null,
    threadParent: {
      parentThreadRefs: ["thr_parent_fixture_001", "thr_parent_fixture_002"],
      inheritanceWitnessRefs: ["inheritance_fixture_001"],
      retrospectiveSharedHistoryRefs: [],
    },
  };
  assert.equal(normalizeGenesisOriginIntegrityFixture(fixture).threadParent.parentThreadRefs.length, 2);
  assert.throws(
    () => normalizeGenesisOriginIntegrityFixture({
      ...fixture,
      threadParent: {
        ...fixture.threadParent,
        retrospectiveSharedHistoryRefs: ["evt_fabricated_childhood_001"],
      },
    }),
    /cannot fabricate retrospective shared childhood history/,
  );
});

test("fork fixture requires an exact divergence boundary and cannot import post-fork source history", () => {
  const fixture = {
    fixtureId: "origin_fork_fixture_001",
    threadId: "thr_fork_child_001",
    originKind: "fork",
    threadParent: null,
    sourceBundle: null,
    fork: {
      sourceThreadRef: "thr_fork_source_001",
      divergenceEventRef: "evt_fork_divergence_003",
      divergenceSequence: 3,
      inheritedHistoryEventRefs: ["evt_fork_source_001", "evt_fork_source_002", "evt_fork_divergence_003"],
      postForkImportedEventRefs: [],
    },
  };
  const normalized = normalizeGenesisOriginIntegrityFixture(fixture);
  assert.equal(normalized.fork.divergenceSequence, 3);
  assert.equal(normalized.fork.inheritedHistoryEventRefs.at(-1), normalized.fork.divergenceEventRef);

  assert.throws(
    () => normalizeGenesisOriginIntegrityFixture({
      ...fixture,
      fork: { ...fixture.fork, divergenceEventRef: "evt_wrong_boundary" },
    }),
    /must end exactly at divergenceEventRef/,
  );
  assert.throws(
    () => normalizeGenesisOriginIntegrityFixture({
      ...fixture,
      fork: { ...fixture.fork, postForkImportedEventRefs: ["evt_source_after_fork_004"] },
    }),
    /cannot import source-Thread facts after the divergence boundary/,
  );
});

test("origin authority classes cannot be composited to route around their source rules", () => {
  assert.throws(
    () => normalizeGenesisOriginIntegrityFixture({
      ...echoFixture(),
      threadParent: {
        parentThreadRefs: ["thr_parent_fixture_001"],
        inheritanceWitnessRefs: [],
        retrospectiveSharedHistoryRefs: [],
      },
    }),
    /cannot carry thread-parent or fork authority/,
  );
  assert.throws(
    () => normalizeGenesisOriginIntegrityFixture({
      fixtureId: "origin_fork_composite_001",
      threadId: "thr_fork_composite_001",
      originKind: "fork",
      threadParent: null,
      sourceBundle: echoFixture().sourceBundle,
      fork: {
        sourceThreadRef: "thr_fork_source_001",
        divergenceEventRef: "evt_fork_divergence_001",
        divergenceSequence: 1,
        inheritedHistoryEventRefs: ["evt_fork_divergence_001"],
        postForkImportedEventRefs: [],
      },
    }),
    /cannot carry thread-parent or human-source authority/,
  );
});
