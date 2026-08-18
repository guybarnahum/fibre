import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { publicationValidatorSetWitness } from "../src/genesis-domain.mjs";
import {
  genesisLifeEpisodeEventId,
} from "../src/genesis-life-episode.mjs";
import { normalizePassAEpisode } from "../src/genesis-pass-a-domain.mjs";
import { GenesisStore } from "../src/genesis-store.mjs";
import { canonicalJson, threadStateHash } from "../src/persistence-common.mjs";
import { openWorldStore } from "../src/persistence.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const sha = (char) => `sha256:${char.repeat(64)}`;

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-life-policy-drift-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function worldSpec() {
  return {
    worldSpecId: "world_policy_drift_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-18T20:00:00Z" },
    places: [
      {
        placeId: "place_policy_drift_library",
        description: "A neighborhood with a public library and ordinary family routines.",
      },
    ],
    householdShape: "Two caregivers and one child.",
    familyRelations: ["The household shares ordinary daily routines."],
    languages: ["English"],
    materialCircumstances: "Stable housing and modest discretionary resources.",
    mobilityPattern: "Daily life is walkable and transit-accessible.",
    schoolingOrCommunityContext: "Public school and a neighborhood library.",
    culturalContext: "Ordinary neighborhood and school life.",
    availableInstitutions: ["public_school", "public_library"],
    intellectualEnvironment: "Books and ordinary family discussion are available.",
    affordedRoles: ["caregiver", "peer", "school_teacher", "librarian"],
    worldAuthorship: {
      authorId: "human_guy",
      sourcesConsulted: [],
      abstractionMethod: "Ordinary structural conditions only.",
      relocationWitness: "No source character or plot is retained.",
      familiarityProbe: null,
      createdAt: "2026-08-18T20:00:00Z",
    },
    createdAt: "2026-08-18T20:00:00Z",
  };
}

function cognition() {
  const surface = (char) => ({
    provider: "fixture",
    modelId: "fixture-model-v1",
    promptHash: sha(char),
    schemaHash: sha(char === "a" ? "b" : char),
    sampling: { temperature: 0.4, seed: 39 },
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

function genesisThread() {
  const thread = structuredClone(mina);
  thread.threadId = "thr_policy_drift_001";
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-08-18T20:01:00Z",
    createdBy: "fibre.genesis",
    lastEventId: "evt_provisional_policy_drift",
  };
  return thread;
}

function publish(databasePath) {
  const genesis = new GenesisStore(databasePath);
  genesis.recordWorldSpec(worldSpec());
  const thread = genesisThread();
  const publishedEpisode = {
    episodeId: "ep_policy_drift_library",
    occurredAt: "2004-03-08T16:15:00Z",
    ageAtEvent: 7.1,
    placeRef: "place_policy_drift_library",
    participantRefs: [],
    observableAction: "The child returns two library books at the desk and chooses another book from a nearby shelf.",
    structureRef: null,
    introducedParticipants: [],
  };
  const manifest = {
    genesisId: "gen_policy_drift_001",
    threadId: thread.threadId,
    originMode: "de_novo",
    entry: {
      stage: "young_adult",
      ageAtEntry: 22,
      chronologyEndsAt: "2019-12-31T23:59:59Z",
      justification: "The fixture admits bounded pre-entry life without a future role target.",
      policyRef: "entry-policy-v1",
    },
    worldSpecRef: "world_policy_drift_001",
    sourceBundleRefs: [],
    parentOrAncestorRefs: [],
    genomeRef: null,
    cognition: cognition(),
    publication: {
      status: "published",
      publishedAt: "2026-08-18T20:02:00Z",
      resultingThreadVersion: thread.version + 1,
    },
    createdAt: "2026-08-18T20:00:30Z",
  };
  genesis.publishBirth({ manifest, thread, episodes: [publishedEpisode] });
  genesis.close();
  return { threadId: thread.threadId, genesisId: manifest.genesisId };
}

test("published Genesis history survives later Pass-A form-policy drift while content-address tampering still fails", () =>
  withDatabase((databasePath) => {
    const { threadId, genesisId } = publish(databasePath);

    let world = openWorldStore(databasePath);
    const lifeEvent = world.listEvents(threadId)[1];
    const liveThread = world.getThread(threadId);
    world.close();

    const driftedObservableAction =
      "The child learned that the library closes early after reading the posted closing-time notice.";
    const historicalEpisode = {
      ...structuredClone(lifeEvent.payload),
      observableAction: driftedObservableAction,
      occurredAt: lifeEvent.occurredAt,
    };

    // This episode represents content that a prior Pass-A policy could have admitted
    // but the current form policy rejects. Replay must reconstruct it without applying
    // today's admission policy again.
    assert.throws(
      () => normalizePassAEpisode(historicalEpisode),
      /forbidden Pass-A interpretation form/,
    );

    const historicalEventId = genesisLifeEpisodeEventId({
      threadId,
      genesisId,
      episode: historicalEpisode,
    });
    const historicalPayload = {
      ...structuredClone(lifeEvent.payload),
      observableAction: driftedObservableAction,
    };
    const historicalThread = {
      ...structuredClone(liveThread),
      provenance: {
        ...structuredClone(liveThread.provenance),
        lastEventId: historicalEventId,
      },
    };
    const historicalStateHash = threadStateHash(historicalThread);

    let database = new DatabaseSync(databasePath);
    database.prepare(`
      UPDATE thread_events
      SET event_id=?, payload_json=?, state_hash=?
      WHERE event_id=?
    `).run(
      historicalEventId,
      canonicalJson(historicalPayload),
      historicalStateHash,
      lifeEvent.eventId,
    );
    database.prepare(`
      UPDATE threads
      SET state_json=?, state_hash=?, last_event_id=?
      WHERE thread_id=?
    `).run(
      canonicalJson(historicalThread),
      historicalStateHash,
      historicalEventId,
      threadId,
    );
    database.close();

    world = openWorldStore(databasePath);
    assert.deepEqual(world.replayThread(threadId), historicalThread);
    assert.doesNotThrow(() => world.verifyThreadIntegrity(threadId));
    world.close();

    const tamperedPayload = {
      ...historicalPayload,
      observableAction:
        "The child learned that the library closes later after reading a different posted notice.",
    };
    database = new DatabaseSync(databasePath);
    database.prepare(
      "UPDATE thread_events SET payload_json=? WHERE event_id=?",
    ).run(canonicalJson(tamperedPayload), historicalEventId);
    database.close();

    world = openWorldStore(databasePath);
    assert.throws(
      () => world.replayThread(threadId),
      /does not match its Genesis episode content/,
    );
    assert.throws(
      () => world.verifyThreadIntegrity(threadId),
      /does not match its Genesis episode content/,
    );
    world.close();
  }));
