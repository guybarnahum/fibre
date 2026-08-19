import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { GenesisOriginAuthorityStore } from "../src/genesis-origin-authority-store.mjs";
import { GenesisStore } from "../src/genesis-store.mjs";
import { publicationValidatorSetWitness } from "../src/genesis-domain.mjs";
import { openWorldStore } from "../src/persistence.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const sha = (char) => `sha256:${char.repeat(64)}`;

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-f-publish-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function worldSpec() {
  return {
    worldSpecId: "world_slice_f_publish_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-19T20:00:00Z" },
    places: [{ placeId: "place_f_publish", description: "A source-free ordinary city context." }],
    householdShape: "Two caregivers and one sibling.",
    familyRelations: ["Household members share ordinary routines."],
    languages: ["English"],
    materialCircumstances: "Stable housing and ordinary public services.",
    mobilityPattern: "Walking and public transit.",
    schoolingOrCommunityContext: "Public schools and community institutions.",
    culturalContext: "Mixed neighborhood institutions.",
    availableInstitutions: ["public_school", "public_library"],
    intellectualEnvironment: "Books and ordinary discussion are available.",
    affordedRoles: ["caregiver", "sibling", "peer", "teacher"],
    worldAuthorship: {
      authorId: "human_guy",
      sourcesConsulted: [],
      abstractionMethod: "Synthetic publication-boundary fixture.",
      relocationWitness: "No source biography is used as Thread history.",
      familiarityProbe: null,
      createdAt: "2026-08-19T19:50:00Z",
    },
    createdAt: "2026-08-19T19:50:00Z",
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

function thread(threadId) {
  const value = structuredClone(mina);
  value.threadId = threadId;
  value.relationshipRefs = [];
  value.memoryRefs = [];
  value.provenance = {
    createdAt: "2026-08-19T19:55:00Z",
    createdBy: "fibre.genesis",
    lastEventId: `evt_seed_${threadId}`,
  };
  return value;
}

function manifest(value, {
  originMode = "de_novo",
  sourceBundleRefs = [],
  parentOrAncestorRefs = [],
} = {}) {
  return {
    genesisId: `gen_${value.threadId}`,
    threadId: value.threadId,
    originMode,
    entry: {
      stage: "young_adult",
      ageAtEntry: 22,
      chronologyEndsAt: "2026-08-19T19:59:00Z",
      justification: "Slice-F publication integration fixture.",
      policyRef: "entry-policy-v1",
    },
    worldSpecRef: "world_slice_f_publish_001",
    sourceBundleRefs,
    parentOrAncestorRefs,
    genomeRef: null,
    cognition: cognition(),
    publication: {
      status: "published",
      publishedAt: "2026-08-19T20:00:00Z",
      resultingThreadVersion: value.version,
    },
    createdAt: "2026-08-19T19:52:00Z",
  };
}

function echoFixture(threadId) {
  return {
    fixtureId: `origin_echo_${threadId}`,
    threadId,
    originKind: "echo",
    threadParent: null,
    fork: null,
    sourceBundle: {
      sourcePartyId: "human_source_jane_doe",
      subjectStatus: "living",
      consentAuthorityRef: "consent_jane_doe",
      subjectStatusAttestationRef: null,
      publicSourceRefs: ["public_jane_doe"],
      protectedBiographyFacts: ["Protected source biography must not become Thread history."],
      approvedMaterials: [],
    },
  };
}

function homageFixture(threadId) {
  return {
    fixtureId: `origin_homage_${threadId}`,
    threadId,
    originKind: "homage",
    threadParent: null,
    fork: null,
    sourceBundle: {
      sourcePartyId: "source_homage_deceased",
      subjectStatus: "deceased",
      consentAuthorityRef: null,
      subjectStatusAttestationRef: "attestation_homage_deceased",
      publicSourceRefs: ["public_homage_source"],
      protectedBiographyFacts: ["Protected biography remains source-side."],
      approvedMaterials: [],
    },
  };
}

function authority({ authorityRef, authorityKind, sourcePartyId, subjectStatus }) {
  return {
    authorityRef,
    authorityKind,
    sourcePartyId,
    subjectStatus,
    assertedAt: "2026-08-19T19:40:00Z",
    provenanceRefs: [`provenance_${authorityRef}`],
  };
}

test("publishBirth itself enforces Thread-parent, Echo, Homage, and Fork origin witnesses", () =>
  withDatabase((databasePath) => {
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(worldSpec());

    const echo = thread("thr_publish_echo");
    const echoManifest = manifest(echo, {
      originMode: "echo",
      sourceBundleRefs: ["consent_jane_doe"],
    });
    assert.throws(
      () => genesis.publishBirth({ manifest: echoManifest, thread: echo }),
      /requires a verified originFixture/,
    );
    assert.throws(
      () => genesis.publishBirth({ manifest: echoManifest, thread: echo, originFixture: echoFixture(echo.threadId) }),
      /origin authority consent_jane_doe was not found/,
    );

    const authorities = new GenesisOriginAuthorityStore(databasePath);
    authorities.recordAuthority(authority({
      authorityRef: "consent_jane_doe",
      authorityKind: "living_source_consent",
      sourcePartyId: "human_source_jane_doe",
      subjectStatus: "living",
    }));
    authorities.recordAuthority(authority({
      authorityRef: "attestation_homage_deceased",
      authorityKind: "subject_status_attestation",
      sourcePartyId: "source_homage_deceased",
      subjectStatus: "deceased",
    }));
    authorities.close();

    const publishedEcho = genesis.publishBirth({
      manifest: echoManifest,
      thread: echo,
      originFixture: echoFixture(echo.threadId),
    });
    assert.equal(publishedEcho.manifest.originMode, "echo");
    assert.deepEqual(publishedEcho.manifest.sourceBundleRefs, ["consent_jane_doe"]);

    const homage = thread("thr_publish_homage");
    const homageManifest = manifest(homage, {
      originMode: "homage",
      sourceBundleRefs: ["attestation_homage_deceased"],
    });
    const publishedHomage = genesis.publishBirth({
      manifest: homageManifest,
      thread: homage,
      originFixture: homageFixture(homage.threadId),
    });
    assert.equal(publishedHomage.manifest.originMode, "homage");

    const world = openWorldStore(databasePath);
    const parent = thread("thr_publish_parent");
    world.seedThread(parent);
    const forkSource = thread("thr_publish_fork_source");
    world.seedThread(forkSource);
    const forkEvents = world.listEvents(forkSource.threadId);
    assert.equal(forkEvents.length, 1);
    world.close();

    const child = thread("thr_publish_child");
    const parentFixture = {
      fixtureId: "origin_parent_child",
      threadId: child.threadId,
      originKind: "thread_parent",
      sourceBundle: null,
      fork: null,
      threadParent: {
        parentThreadRefs: [parent.threadId],
        inheritanceWitnessRefs: ["inheritance_publish_child"],
        retrospectiveSharedHistoryRefs: [],
      },
    };
    const publishedChild = genesis.publishBirth({
      manifest: manifest(child, {
        originMode: "thread_parent",
        parentOrAncestorRefs: [parent.threadId],
      }),
      thread: child,
      originFixture: parentFixture,
    });
    assert.equal(publishedChild.manifest.originMode, "thread_parent");

    const fork = thread("thr_publish_fork");
    const forkFixture = {
      fixtureId: "origin_fork_publish",
      threadId: fork.threadId,
      originKind: "fork",
      threadParent: null,
      sourceBundle: null,
      fork: {
        sourceThreadRef: forkSource.threadId,
        divergenceEventRef: forkEvents[0].eventId,
        divergenceSequence: 1,
        inheritedHistoryEventRefs: [forkEvents[0].eventId],
        postForkImportedEventRefs: [],
      },
    };
    const publishedFork = genesis.publishBirth({
      manifest: manifest(fork, {
        originMode: "fork",
        parentOrAncestorRefs: [forkSource.threadId],
      }),
      thread: fork,
      originFixture: forkFixture,
    });
    assert.equal(publishedFork.manifest.originMode, "fork");

    const bogusFork = thread("thr_publish_bogus_fork");
    assert.throws(
      () => genesis.publishBirth({
        manifest: manifest(bogusFork, {
          originMode: "fork",
          parentOrAncestorRefs: ["thr_does_not_exist"],
        }),
        thread: bogusFork,
        originFixture: {
          ...forkFixture,
          fixtureId: "origin_bogus_fork_publish",
          threadId: bogusFork.threadId,
          fork: {
            ...forkFixture.fork,
            sourceThreadRef: "thr_does_not_exist",
          },
        },
      }),
      /origin source Thread thr_does_not_exist has no canonical history/,
    );

    const wrongRefs = thread("thr_publish_wrong_echo_refs");
    assert.throws(
      () => genesis.publishBirth({
        manifest: manifest(wrongRefs, {
          originMode: "echo",
          sourceBundleRefs: ["public_jane_doe"],
        }),
        thread: wrongRefs,
        originFixture: echoFixture(wrongRefs.threadId),
      }),
      /sourceBundleRefs does not exactly match/,
    );

    genesis.close();
  }));
