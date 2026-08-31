import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  assertForkBoundaryAgainstCanonicalHistory,
  assertGenesisOriginAuthorityResolved,
  assertSourceMaterialEncounteredByThread,
  genesisOriginIntegrityFixtureDigest,
  normalizeGenesisOriginIntegrityFixture,
  projectOriginSourceForThreadLife,
} from "../src/genesis-origin-source-integrity.mjs";
import { GenesisOriginAuthorityStore } from "../src/genesis-origin-authority-store.mjs";
import { GenesisStore } from "../src/genesis-store.mjs";
import { publicationValidatorSetWitness } from "../src/genesis-domain.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { publishMinimalGenesisPriorLifeFixture } from "./support/genesis-prior-life-fixture.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

const MATERIAL = Object.freeze({
  kind: "book",
  subjectKind: "work",
  subjectLabel: "A source-authored essay about how maps omit contested boundaries",
});

const sha = (char) => `sha256:${char.repeat(64)}`;

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-f-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

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

function authorityRecord({ authorityRef, authorityKind, sourcePartyId, subjectStatus }) {
  return {
    authorityRef,
    authorityKind,
    sourcePartyId,
    subjectStatus,
    assertedAt: "2026-08-19T20:30:00Z",
    provenanceRefs: [`provenance_${authorityRef}`],
  };
}

function worldSpec() {
  return {
    worldSpecId: "world_slice_f_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-19T20:00:00Z" },
    places: [{ placeId: "place_library", description: "A public library with reading tables and map shelves." }],
    householdShape: "Two caregivers and siblings share a small apartment.",
    familyRelations: ["Caregivers and siblings see one another regularly."],
    languages: ["English"],
    materialCircumstances: "Stable access to public services and limited discretionary money.",
    mobilityPattern: "Routine travel by foot and public transit.",
    schoolingOrCommunityContext: "Public schools and a neighborhood library.",
    culturalContext: "Mixed neighborhood institutions and family routines.",
    availableInstitutions: ["public_school", "public_library"],
    intellectualEnvironment: "Books and public information are routinely available.",
    affordedRoles: ["caregiver", "sibling", "peer", "librarian", "teacher"],
    worldAuthorship: {
      authorId: "human_guy",
      sourcesConsulted: [],
      abstractionMethod: "Synthetic Slice-F authority/history fixture.",
      relocationWitness: "No source biography is used as Thread history.",
      familiarityProbe: null,
      createdAt: "2026-08-19T20:00:00Z",
    },
    createdAt: "2026-08-19T20:00:00Z",
  };
}

function cognition() {
  const surface = (char) => ({
    provider: "fixture",
    modelId: "fixture-model-v1",
    promptHash: sha(char),
    schemaHash: sha(char === "a" ? "b" : char),
    sampling: { temperature: 0, seed: 39 },
  });
  return {
    passA: surface("a"),
    passB: surface("c"),
    passC: surface("d"),
    recordRepair: surface("e"),
    policyVersion: "genesis-v1",
    eventStructurePoolDigest: sha("f"),
    publicationValidatorSetWitness: publicationValidatorSetWitness(),
  };
}

function genesisThread(threadId) {
  const thread = structuredClone(mina);
  thread.threadId = threadId;
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-08-19T20:01:00Z",
    createdBy: "fibre.genesis",
    lastEventId: "evt_provisional_not_authoritative",
  };
  return thread;
}

function manifest(thread, episodeCount) {
  return {
    genesisId: `gen_${thread.threadId}`,
    threadId: thread.threadId,
    originMode: "de_novo",
    entry: {
      stage: "young_adult",
      ageAtEntry: 22,
      chronologyEndsAt: "2026-08-19T19:59:00Z",
      justification: "Slice-F fixture establishes canonical history only.",
      policyRef: "entry-policy-v1",
    },
    worldSpecRef: "world_slice_f_001",
    sourceBundleRefs: [],
    parentOrAncestorRefs: [],
    genomeRef: null,
    cognition: cognition(),
    publication: {
      status: "published",
      publishedAt: "2026-08-19T20:02:00Z",
      resultingThreadVersion: thread.version + episodeCount,
    },
    createdAt: "2026-08-19T20:00:30Z",
  };
}

function encounterEpisode(threadId, {
  episodeId = "epi_origin_source_encounter_001",
  occurredAt = "2012-06-01T16:00:00Z",
  subjectLabel = MATERIAL.subjectLabel,
  intellectualEncounter = true,
} = {}) {
  return {
    episodeId,
    occurredAt,
    ageAtEvent: 16,
    placeRef: "place_library",
    participantRefs: [threadId],
    observableAction: "The student reads an essay at a library table, compares two maps printed beside it, and copies one disputed boundary label into a notebook.",
    structureRef: null,
    introducedParticipants: [],
    ...(intellectualEncounter ? {
      intellectualEncounter: {
        kind: "book",
        subjectKind: "work",
        subjectLabel,
        participantRef: null,
        accessMode: "self_directed",
      },
    } : { intellectualEncounter: null }),
  };
}

function publishEpisodes(databasePath, threadId, episodes) {
  const genesis = new GenesisStore(localWorldStateStorage(databasePath));
  if (genesis.getWorldSpec("world_slice_f_001", { required: false }) === null) genesis.recordWorldSpec(worldSpec());
  const thread = genesisThread(threadId);
  publishMinimalGenesisPriorLifeFixture(genesis, { manifest: manifest(thread, episodes.length), thread, episodes });
  genesis.close();
}

function updateSelfModelCommand(threadId, expectedVersion, ordinal) {
  return {
    commandId: `cmd_fork_source_${ordinal}`,
    threadId,
    expectedVersion,
    type: "UPDATE_SELF_MODEL",
    payload: {
      selfModel: `Canonical fork source state ${ordinal}`,
      summary: `Advance canonical source chronology ${ordinal}`,
    },
    actor: { entityId: "human_guy", kind: "other", displayName: "Guy" },
    occurredAt: `2026-08-19T20:1${ordinal}:00Z`,
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

  withDatabase((databasePath) => {
    let authorities = new GenesisOriginAuthorityStore(localWorldStateStorage(databasePath));
    authorities.recordAuthority(authorityRecord({
      authorityRef: "consent_echo_fixture_001",
      authorityKind: "living_source_consent",
      sourcePartyId: "human_source_fixture_001",
      subjectStatus: "living",
    }));
    authorities.close();
    authorities = new GenesisOriginAuthorityStore(localWorldStateStorage(databasePath), { readOnly: true });
    const witness = assertGenesisOriginAuthorityResolved({ originFixture: echoFixture(), authorityStore: authorities });
    assert.equal(witness.authorityKind, "living_source_consent");
    assert.equal(witness.sourcePartyId, "human_source_fixture_001");
    assert.match(witness.authorityRecordDigest, /^sha256:[0-9a-f]{64}$/);
    authorities.close();
  });
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

  withDatabase((databasePath) => {
    const authorities = new GenesisOriginAuthorityStore(localWorldStateStorage(databasePath));
    authorities.recordAuthority(authorityRecord({
      authorityRef: "attestation_homage_fixture_001",
      authorityKind: "subject_status_attestation",
      sourcePartyId: "source_homage_fixture_001",
      subjectStatus: "deceased",
    }));
    assert.equal(
      assertGenesisOriginAuthorityResolved({ originFixture: homageFixture(), authorityStore: authorities }).subjectStatus,
      "deceased",
    );
    assert.throws(
      () => assertGenesisOriginAuthorityResolved({
        originFixture: homageFixture({ sourcePartyId: "source_someone_else" }),
        authorityStore: authorities,
      }),
      /belongs to another source party/,
    );
    assert.throws(
      () => assertGenesisOriginAuthorityResolved({
        originFixture: homageFixture({ subjectStatus: "fictional" }),
        authorityStore: authorities,
      }),
      /does not attest the fixture subject status/,
    );
    authorities.close();
  });
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

test("approved source material becomes Thread formation only through an actual matching Thread encounter", () =>
  withDatabase((databasePath) => {
    const fixture = echoFixture();
    const materialRef = projectOriginSourceForThreadLife(fixture).approvedMaterials[0].subjectRef;
    const matching = encounterEpisode(fixture.threadId);
    const noEncounter = encounterEpisode(fixture.threadId, {
      episodeId: "epi_origin_source_no_encounter_002",
      occurredAt: "2013-06-01T16:00:00Z",
      intellectualEncounter: false,
    });
    const different = encounterEpisode(fixture.threadId, {
      episodeId: "epi_origin_source_other_003",
      occurredAt: "2014-06-01T16:00:00Z",
      subjectLabel: "A different essay about municipal water pricing",
    });
    publishEpisodes(databasePath, fixture.threadId, [matching, noEncounter, different]);

    const historyStore = openWorldStore(localWorldStateStorage(databasePath));
    const witness = assertSourceMaterialEncounteredByThread({
      originFixture: fixture,
      sourceMaterialRef: materialRef,
      encounterEpisodeRef: matching.episodeId,
      historyStore,
    });
    assert.equal(witness.fixtureId, fixture.fixtureId);
    assert.equal(witness.threadId, fixture.threadId);
    assert.equal(witness.sourceMaterialRef, materialRef);
    assert.equal(witness.encounterEpisodeRef, matching.episodeId);
    assert.match(witness.encounterEventRef, /^evt_/);
    assert.equal(witness.encounterSequence, 2);

    assert.throws(
      () => assertSourceMaterialEncounteredByThread({
        originFixture: fixture,
        sourceMaterialRef: materialRef,
        encounterEpisodeRef: noEncounter.episodeId,
        historyStore,
      }),
      /without an intellectual encounter/,
    );
    assert.throws(
      () => assertSourceMaterialEncounteredByThread({
        originFixture: fixture,
        sourceMaterialRef: materialRef,
        encounterEpisodeRef: different.episodeId,
        historyStore,
      }),
      /does not match the approved source material/,
    );
    assert.throws(
      () => assertSourceMaterialEncounteredByThread({
        originFixture: fixture,
        sourceMaterialRef: materialRef,
        encounterEpisodeRef: matching.episodeId,
        episodes: [matching],
      }),
      /canonical WorldStore/,
    );
    historyStore.close();
  }));

test("source-material encounter cannot be borrowed from another Thread's episode", () =>
  withDatabase((databasePath) => {
    const fixture = echoFixture();
    const materialRef = projectOriginSourceForThreadLife(fixture).approvedMaterials[0].subjectRef;
    publishEpisodes(databasePath, fixture.threadId, [encounterEpisode(fixture.threadId, { intellectualEncounter: false })]);
    publishEpisodes(databasePath, "thr_someone_else", [encounterEpisode("thr_someone_else")]);

    const historyStore = openWorldStore(localWorldStateStorage(databasePath));
    assert.throws(
      () => assertSourceMaterialEncounteredByThread({
        originFixture: fixture,
        sourceMaterialRef: materialRef,
        encounterEpisodeRef: "epi_origin_source_encounter_001",
        historyStore,
      }),
      /without an intellectual encounter/,
    );
    historyStore.close();
  }));

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

test("fork fixture requires an exact divergence boundary and cannot import post-fork source history", () =>
  withDatabase((databasePath) => {
    const sourceThreadId = "thr_fork_source_001";
    const world = openWorldStore(localWorldStateStorage(databasePath));
    const source = genesisThread(sourceThreadId);
    world.seedThread(source);
    world.applyCommand(updateSelfModelCommand(sourceThreadId, source.version, 1));
    world.applyCommand(updateSelfModelCommand(sourceThreadId, source.version + 1, 2));
    const events = world.listEvents(sourceThreadId);
    assert.equal(events.length, 3);

    const fixture = {
      fixtureId: "origin_fork_fixture_001",
      threadId: "thr_fork_child_001",
      originKind: "fork",
      threadParent: null,
      sourceBundle: null,
      fork: {
        sourceThreadRef: sourceThreadId,
        divergenceEventRef: events[2].eventId,
        divergenceSequence: 3,
        inheritedHistoryEventRefs: events.map((event) => event.eventId),
        postForkImportedEventRefs: [],
      },
    };
    const normalized = normalizeGenesisOriginIntegrityFixture(fixture);
    assert.equal(normalized.fork.divergenceSequence, 3);
    assert.equal(normalized.fork.inheritedHistoryEventRefs.at(-1), normalized.fork.divergenceEventRef);
    const witness = assertForkBoundaryAgainstCanonicalHistory({ originFixture: fixture, historyStore: world });
    assert.deepEqual(witness.inheritedHistoryEventRefs, events.map((event) => event.eventId));
    assert.match(witness.canonicalPrefixDigest, /^sha256:[0-9a-f]{64}$/);

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
    assert.throws(
      () => assertForkBoundaryAgainstCanonicalHistory({
        originFixture: {
          ...fixture,
          fork: {
            ...fixture.fork,
            inheritedHistoryEventRefs: [events[0].eventId, events[2].eventId],
          },
        },
        historyStore: world,
      }),
      /exact canonical source prefix/,
    );
    assert.throws(
      () => assertForkBoundaryAgainstCanonicalHistory({
        originFixture: {
          ...fixture,
          fork: {
            ...fixture.fork,
            divergenceEventRef: events[1].eventId,
            inheritedHistoryEventRefs: [events[0].eventId, events[1].eventId],
          },
        },
        historyStore: world,
      }),
      /does not match canonical source chronology/,
    );
    world.close();
  }));

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
