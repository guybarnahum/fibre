import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { publicationValidatorSetWitness } from "../src/genesis-domain.mjs";
import { GenesisOriginAuthorityStore } from "../src/genesis-origin-authority-store.mjs";
import { GenesisStore } from "../src/genesis-store.mjs";
import { openWorldStore } from "../src/persistence.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const sha = (char) => `sha256:${char.repeat(64)}`;

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-f-delegation-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function worldSpec() {
  return {
    worldSpecId: "world_slice_f_delegation_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-19T20:00:00Z" },
    places: [{ placeId: "place_f_delegation", description: "A source-free ordinary city context." }],
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
      abstractionMethod: "Synthetic publication delegation fixture.",
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

function manifest(value, { originMode, sourceBundleRefs = [], parentOrAncestorRefs = [] }) {
  return {
    genesisId: `gen_${value.threadId}`,
    threadId: value.threadId,
    originMode,
    entry: {
      stage: "young_adult",
      ageAtEntry: 22,
      chronologyEndsAt: "2026-08-19T19:59:00Z",
      justification: "Slice-F canonical publication delegation fixture.",
      policyRef: "entry-policy-v1",
    },
    worldSpecRef: "world_slice_f_delegation_001",
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
      sourcePartyId: "source_homage_subject",
      subjectStatus: "deceased",
      consentAuthorityRef: null,
      subjectStatusAttestationRef: "attestation_homage_subject",
      publicSourceRefs: ["public_homage_subject"],
      protectedBiographyFacts: ["Protected source biography remains source-side."],
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

function updateSelfModelCommand(source) {
  return {
    commandId: `cmd_${source.threadId}_self_model`,
    threadId: source.threadId,
    expectedVersion: 1,
    type: "UPDATE_SELF_MODEL",
    payload: {
      selfModel: "The source Thread records a second canonical event for fork-prefix testing.",
      summary: "Added a second canonical source event.",
    },
    actor: {
      entityId: "human_guy",
      kind: "human",
      displayName: "Guy Bar-Nahum",
    },
    occurredAt: "2026-08-19T19:58:00Z",
  };
}

test("publishBirth delegates Echo source-party matching to canonical Slice-F authority", () =>
  withDatabase((databasePath) => {
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(worldSpec());
    const authorities = new GenesisOriginAuthorityStore(databasePath);
    authorities.recordAuthority(authority({
      authorityRef: "consent_jane_doe",
      authorityKind: "living_source_consent",
      sourcePartyId: "human_wrong_source_party",
      subjectStatus: "living",
    }));
    authorities.close();

    const echo = thread("thr_f_delegation_wrong_party");
    assert.throws(
      () => genesis.publishBirth({
        manifest: manifest(echo, { originMode: "echo", sourceBundleRefs: ["consent_jane_doe"] }),
        thread: echo,
        originFixture: echoFixture(echo.threadId),
      }),
      /belongs to another source party/,
    );
    genesis.close();
  }));

test("publishBirth delegates Homage subject-status matching to canonical Slice-F authority", () =>
  withDatabase((databasePath) => {
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(worldSpec());
    const authorities = new GenesisOriginAuthorityStore(databasePath);
    authorities.recordAuthority(authority({
      authorityRef: "attestation_homage_subject",
      authorityKind: "subject_status_attestation",
      sourcePartyId: "source_homage_subject",
      subjectStatus: "fictional",
    }));
    authorities.close();

    const homage = thread("thr_f_delegation_wrong_status");
    assert.throws(
      () => genesis.publishBirth({
        manifest: manifest(homage, {
          originMode: "homage",
          sourceBundleRefs: ["attestation_homage_subject"],
        }),
        thread: homage,
        originFixture: homageFixture(homage.threadId),
      }),
      /does not attest the fixture subject status/,
    );
    genesis.close();
  }));

test("publishBirth delegates exact fork-prefix matching to canonical Slice-F boundary", () =>
  withDatabase((databasePath) => {
    const genesis = new GenesisStore(databasePath);
    genesis.recordWorldSpec(worldSpec());

    const source = thread("thr_f_delegation_fork_source");
    const world = openWorldStore(databasePath);
    world.seedThread(source);
    world.applyCommand(updateSelfModelCommand(source));
    const events = world.listEvents(source.threadId);
    assert.equal(events.length, 2);
    world.close();

    const fork = thread("thr_f_delegation_bad_prefix");
    const forkFixture = {
      fixtureId: "origin_f_delegation_bad_prefix",
      threadId: fork.threadId,
      originKind: "fork",
      threadParent: null,
      sourceBundle: null,
      fork: {
        sourceThreadRef: source.threadId,
        divergenceEventRef: events[1].eventId,
        divergenceSequence: 2,
        inheritedHistoryEventRefs: ["evt_noncanonical_prefix", events[1].eventId],
        postForkImportedEventRefs: [],
      },
    };

    assert.throws(
      () => genesis.publishBirth({
        manifest: manifest(fork, {
          originMode: "fork",
          parentOrAncestorRefs: [source.threadId],
        }),
        thread: fork,
        originFixture: forkFixture,
      }),
      /fork inherited history is not the exact canonical source prefix through divergence/,
    );
    genesis.close();
  }));
