import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  ThreadAlreadyExistsError,
  UNCOMMANDED_EVENT_TYPES,
  assertId,
  canonicalJson,
  threadStateHash,
} from "./persistence-common.mjs";
import {
  applyEventToThread,
  normalizeSeedSnapshot,
  rowToEvent,
  validateThreadSnapshot,
} from "./persistence-domain.mjs";
import {
  migrateDatabase,
  normalizeDatabasePath,
  safeRollback,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import {
  ensureMemoryVisualCompanion,
  persistLegacySeedIdentity,
} from "./identity-schema.mjs";
import { createGenesisTables } from "./genesis-schema.mjs";
import {
  THREAD_LIFE_EPISODE_RECORDED,
  applyGenesisLifeEpisodeEventToThread,
  genesisLifeEpisodeEventId,
  normalizePublishedGenesisEpisode,
} from "./genesis-life-episode.mjs";
import {
  AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
  normalizeAutobiographicalMemory,
} from "./autobiographical-memory-domain.mjs";
import {
  appendAutobiographicalMemoryRevisionInTransaction,
  assertAutobiographicalMemoryRevisionCompatibility,
} from "./autobiographical-memory-persistence.mjs";
import {
  genesisRecordDigest,
  normalizeGenerationAttempt,
  normalizeGenesisManifest,
  normalizeGenesisWorldSpec,
  publicationValidatorSetWitness,
} from "./genesis-domain.mjs";
import {
  genesisOriginAuthorityDigest,
  normalizeGenesisOriginAuthority,
} from "./genesis-origin-authority.mjs";
import {
  assertForkBoundaryAgainstCanonicalEvents,
  assertGenesisOriginAuthorityWitness,
  normalizeGenesisOriginIntegrityFixture,
} from "./genesis-origin-source-integrity.mjs";
import { bindBirthGenomeAndLineageInTransaction } from "./genesis-birth-genome-lineage.mjs";
import { publishGenesisSituatedContinuityInTransaction } from "./genesis-birth-situated-continuity.mjs";

export class GenesisConflictError extends Error {}
export class GenesisNotFoundError extends Error {}

const GENESIS_TABLES = Object.freeze([
  "genesis_world_specs",
  "genesis_manifests",
  "genesis_generation_attempts",
]);

const SOURCE_DERIVED_ORIGIN_MODES = Object.freeze([
  "thread_parent",
  "echo",
  "homage",
  "fork",
]);

function parseRecord(name, json) {
  try { return JSON.parse(json); }
  catch (error) { throw new IntegrityError(`${name} is not valid JSON: ${error.message}`); }
}

function tableExists(database, tableName) {
  return database.prepare(
    "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name=?",
  ).get(tableName) !== undefined;
}

function genesisSchemaPresent(database) {
  return GENESIS_TABLES.every((tableName) => tableExists(database, tableName));
}

function assertCurrentPublicationValidators(manifest) {
  const actual = canonicalJson(manifest.cognition.publicationValidatorSetWitness);
  const current = canonicalJson(publicationValidatorSetWitness());
  if (actual !== current) {
    throw new GenesisConflictError(
      "Genesis publication validator witness does not match the current executable validator set",
    );
  }
}

function assertExactReferenceList(name, actual, expected) {
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    throw new GenesisConflictError(`${name} does not exactly match the verified origin witness`);
  }
}

function canonicalThreadEventsInTransaction(database, threadId) {
  assertId("origin source threadId", threadId);
  const rows = database.prepare(`
    SELECT event_id, thread_id, sequence, expected_version, resulting_version,
           event_type, command_id, command_digest, payload_json, actor_json,
           occurred_at, state_hash, authorization_id, causation_id, correlation_id,
           payload_schema_version, provenance_json
    FROM thread_events WHERE thread_id=? ORDER BY sequence ASC
  `).all(threadId);
  if (rows.length === 0) {
    throw new GenesisConflictError(`origin source Thread ${threadId} has no canonical history`);
  }

  const events = rows.map(rowToEvent);
  let replayed = null;
  for (const [index, event] of events.entries()) {
    if (event.sequence !== index + 1) {
      throw new IntegrityError(`origin source Thread ${threadId} event sequence has a gap`);
    }
    if (!UNCOMMANDED_EVENT_TYPES.has(event.eventType)) {
      const command = database.prepare(`
        SELECT command_digest, expected_version, resulting_version, event_id, created_at
        FROM commands WHERE thread_id=? AND command_id=?
      `).get(event.threadId, event.commandId);
      if (command === undefined) {
        throw new IntegrityError(`origin source event ${event.eventId} has no accepted command witness`);
      }
      if (
        command.command_digest !== event.commandDigest ||
        Number(command.expected_version) !== event.expectedVersion ||
        Number(command.resulting_version) !== event.resultingVersion ||
        command.event_id !== event.eventId ||
        command.created_at !== event.occurredAt
      ) {
        throw new IntegrityError(`origin source event ${event.eventId} disagrees with its command witness`);
      }
    }
    replayed = applyEventToThread(replayed, event);
    if (threadStateHash(replayed) !== event.stateHash) {
      throw new IntegrityError(`origin source event ${event.eventId} state hash failed replay`);
    }
  }

  const projection = database.prepare(`
    SELECT thread_id,version,status,state_hash,last_event_id
    FROM threads WHERE thread_id=?
  `).get(threadId);
  if (projection === undefined) {
    throw new GenesisConflictError(`origin source Thread ${threadId} does not exist`);
  }
  if (
    replayed.threadId !== threadId ||
    Number(projection.version) !== replayed.version ||
    projection.status !== replayed.status ||
    projection.state_hash !== threadStateHash(replayed) ||
    projection.last_event_id !== replayed.provenance.lastEventId
  ) {
    throw new IntegrityError(`origin source Thread ${threadId} projection disagrees with canonical replay`);
  }
  return events;
}

function originAuthorityInTransaction(database, authorityRef) {
  assertId("origin authorityRef", authorityRef);
  const row = database.prepare(
    "SELECT record_json,record_digest FROM genesis_origin_authorities WHERE authority_ref=?",
  ).get(authorityRef);
  if (row === undefined) {
    throw new GenesisConflictError(`Genesis origin authority ${authorityRef} was not found`);
  }
  const record = normalizeGenesisOriginAuthority(
    parseRecord(`Genesis origin authority ${authorityRef}`, row.record_json),
  );
  const recordDigest = genesisOriginAuthorityDigest(record);
  if (recordDigest !== row.record_digest || canonicalJson(record) !== row.record_json) {
    throw new IntegrityError(`Genesis origin authority ${authorityRef} failed canonical/digest verification`);
  }
  return { record, recordDigest };
}

function assertBirthOriginWitnessesInTransaction(database, manifest, originFixtureCandidate) {
  const sourceDerived = SOURCE_DERIVED_ORIGIN_MODES.includes(manifest.originMode);
  if (!sourceDerived) {
    if (originFixtureCandidate !== null && originFixtureCandidate !== undefined) {
      throw new GenesisConflictError(`${manifest.originMode} birth cannot carry a source-derived origin fixture`);
    }
    if (manifest.sourceBundleRefs.length !== 0) {
      throw new GenesisConflictError(`${manifest.originMode} birth cannot publish sourceBundleRefs`);
    }
    return null;
  }

  if (originFixtureCandidate === null || originFixtureCandidate === undefined) {
    throw new GenesisConflictError(`${manifest.originMode} birth requires a verified originFixture`);
  }
  const fixture = normalizeGenesisOriginIntegrityFixture(originFixtureCandidate);
  if (fixture.threadId !== manifest.threadId) {
    throw new GenesisConflictError("originFixture/thread identity mismatch");
  }
  if (fixture.originKind !== manifest.originMode) {
    throw new GenesisConflictError("originFixture/originMode mismatch");
  }

  if (fixture.originKind === "thread_parent") {
    if (manifest.sourceBundleRefs.length !== 0) {
      throw new GenesisConflictError("thread-parent birth cannot publish sourceBundleRefs");
    }
    assertExactReferenceList(
      "manifest.parentOrAncestorRefs",
      manifest.parentOrAncestorRefs,
      fixture.threadParent.parentThreadRefs,
    );
    for (const parentThreadRef of fixture.threadParent.parentThreadRefs) {
      canonicalThreadEventsInTransaction(database, parentThreadRef);
    }
    return fixture;
  }

  if (fixture.originKind === "fork") {
    if (manifest.parentOrAncestorRefs.length !== 1 || manifest.parentOrAncestorRefs[0] !== fixture.fork.sourceThreadRef) {
      throw new GenesisConflictError("fork manifest must bind exactly the verified source Thread");
    }
    if (manifest.sourceBundleRefs.length !== 0) {
      throw new GenesisConflictError("fork birth cannot publish sourceBundleRefs");
    }
    const sourceEvents = canonicalThreadEventsInTransaction(database, fixture.fork.sourceThreadRef);
    assertForkBoundaryAgainstCanonicalEvents(fixture, sourceEvents, GenesisConflictError);
    return fixture;
  }

  if (manifest.parentOrAncestorRefs.length !== 0) {
    throw new GenesisConflictError(`${fixture.originKind} birth cannot publish parentOrAncestorRefs`);
  }
  assertExactReferenceList(
    "manifest.sourceBundleRefs",
    manifest.sourceBundleRefs,
    fixture.sourceBundleRefs,
  );
  if (fixture.originKind === "homage" && fixture.livingSubject === true) {
    throw new GenesisConflictError("homage birth cannot identify a living human subject");
  }
  if (fixture.originKind === "echo") {
    const authorityRef = fixture.consentAuthority?.authorityRef;
    if (typeof authorityRef !== "string" || authorityRef.length === 0) {
      throw new GenesisConflictError("echo birth requires a consent-authority reference");
    }
    const { record: authority, recordDigest } = originAuthorityInTransaction(database, authorityRef);
    assertGenesisOriginAuthorityWitness({
      fixture,
      authority,
      authorityDigest: recordDigest,
      ErrorType: GenesisConflictError,
    });
  }
  return fixture;
}

function normalizeBirthEpisodes(episodeCandidates, manifest) {
  if (!Array.isArray(episodeCandidates)) throw new TypeError("episodes must be an array");
  return episodeCandidates.map((candidate) => normalizePublishedGenesisEpisode({
    ...candidate,
    threadId: manifest.threadId,
    genesisId: manifest.genesisId,
    worldSpecRef: manifest.worldSpecRef,
  }));
}

function normalizeBirthMemories(memoryCandidates, { manifest, threadId, lifeEventIds }) {
  if (!Array.isArray(memoryCandidates)) throw new TypeError("memories must be an array");
  const normalized = memoryCandidates.map((candidate) => normalizeAutobiographicalMemory(candidate));
  const seenRevisions = new Set();
  const maxRevisionByMemory = new Map();
  for (const record of normalized) {
    if (record.formatVersion !== AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2) {
      throw new GenesisConflictError("Genesis birth accepts autobiographical memory format v2 only");
    }
    if (record.threadId !== threadId) throw new GenesisConflictError("memory/thread identity mismatch");
    const key = `${record.memoryId}:${record.revision}`;
    if (seenRevisions.has(key)) throw new GenesisConflictError(`duplicate memory revision ${key}`);
    seenRevisions.add(key);
    const expectedRevision = (maxRevisionByMemory.get(record.memoryId) ?? 0) + 1;
    if (record.revision !== expectedRevision) {
      throw new GenesisConflictError(`memory ${record.memoryId} revisions must start at 1 and remain contiguous`);
    }
    maxRevisionByMemory.set(record.memoryId, record.revision);
    if (!lifeEventIds.has(record.subject.originEventRef)) {
      throw new GenesisConflictError(`memory ${record.memoryId} origin must cite an admitted life event`);
    }
    for (const eventRef of record.eventRefs) {
      if (!lifeEventIds.has(eventRef)) {
        throw new GenesisConflictError(`memory ${record.memoryId} cites event outside this Genesis life`);
      }
    }
    const expectedCreatedBy = `genesis:${manifest.genesisId}`;
    if (record.createdBy !== expectedCreatedBy) {
      throw new GenesisConflictError(`memory ${record.memoryId} createdBy must be ${expectedCreatedBy}`);
    }
  }
  const previousByMemory = new Map();
  for (const record of normalized) {
    const previous = previousByMemory.get(record.memoryId) ?? null;
    if (previous !== null) {
      assertAutobiographicalMemoryRevisionCompatibility(record, previous, GenesisConflictError);
    }
    previousByMemory.set(record.memoryId, record);
  }
  return normalized;
}

export class GenesisStore {
  #databasePath;
  #readOnly;
  #database;

  constructor({ databasePath, readOnly = false } = {}) {
    this.#databasePath = normalizeDatabasePath(databasePath);
    this.#readOnly = readOnly;
    migrateDatabase(this.#databasePath);
    const probe = new DatabaseSync(this.#databasePath, { readOnly: this.#readOnly });
    try {
      if (!genesisSchemaPresent(probe)) {
        if (this.#readOnly) {
          throw new GenesisNotFoundError("Genesis storage is not present in this world");
        }
        createGenesisTables(probe);
      }
    } finally {
      probe.close();
    }
    this.#database = new DatabaseSync(this.#databasePath, { readOnly: this.#readOnly });
  }

  close() { this.#database.close(); }

  recordWorldSpec(candidate) {
    if (this.#readOnly) throw new GenesisConflictError("read-only Genesis store cannot write");
    const record = normalizeGenesisWorldSpec(candidate);
    const digest = genesisRecordDigest("world_spec", record);
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const existing = this.#database.prepare(
        "SELECT record_json,record_digest FROM genesis_world_specs WHERE world_spec_id=?",
      ).get(record.worldSpecId);
      if (existing !== undefined) {
        if (existing.record_digest !== digest || existing.record_json !== canonicalJson(record)) {
          throw new GenesisConflictError(`WorldSpec ${record.worldSpecId} already exists with different immutable content`);
        }
        this.#database.exec("COMMIT");
        return { record: structuredClone(record), recordDigest: digest, idempotent: true };
      }
      this.#database.prepare(`
        INSERT INTO genesis_world_specs(
          world_spec_id,authored_by,source_material_ref,created_at,record_json,record_digest
        ) VALUES (?,?,?,?,?,?)
      `).run(
        record.worldSpecId,
        record.authorship.authoredBy,
        record.authorship.sourceMaterialRef,
        record.createdAt,
        canonicalJson(record),
        digest,
      );
      this.#database.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
    return { record: structuredClone(record), recordDigest: digest, idempotent: false };
  }

  getWorldSpec(worldSpecId) {
    assertId("worldSpecId", worldSpecId);
    const row = this.#database.prepare(
      "SELECT record_json,record_digest FROM genesis_world_specs WHERE world_spec_id=?",
    ).get(worldSpecId);
    if (row === undefined) throw new GenesisNotFoundError(`WorldSpec ${worldSpecId} was not found`);
    const record = normalizeGenesisWorldSpec(parseRecord(`WorldSpec ${worldSpecId}`, row.record_json));
    const digest = genesisRecordDigest("world_spec", record);
    if (digest !== row.record_digest || canonicalJson(record) !== row.record_json) {
      throw new IntegrityError(`WorldSpec ${worldSpecId} failed canonical/digest verification`);
    }
    return { record, recordDigest: digest };
  }

  recordGenerationAttempt(candidate) {
    if (this.#readOnly) throw new GenesisConflictError("read-only Genesis store cannot write");
    const record = normalizeGenerationAttempt(candidate);
    const digest = genesisRecordDigest("generation_attempt", record);
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const existing = this.#database.prepare(
        "SELECT record_json,record_digest FROM genesis_generation_attempts WHERE attempt_id=?",
      ).get(record.attemptId);
      if (existing !== undefined) {
        if (existing.record_digest !== digest || existing.record_json !== canonicalJson(record)) {
          throw new GenesisConflictError(`generation attempt ${record.attemptId} already exists with different immutable content`);
        }
        this.#database.exec("COMMIT");
        return { record: structuredClone(record), recordDigest: digest, idempotent: true };
      }
      this.#database.prepare(`
        INSERT INTO genesis_generation_attempts(
          attempt_id,genesis_id,provisional_thread_id,candidate_attempt_number,scope,
          failed_pass,failed_gate,record_json,record_digest,recorded_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?)
      `).run(
        record.attemptId,
        record.genesisId,
        record.provisionalThreadId,
        record.candidateAttemptNumber,
        record.scope,
        record.failedPass,
        record.failedGate,
        canonicalJson(record),
        digest,
        record.recordedAt,
      );
      this.#database.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
    return { record: structuredClone(record), recordDigest: digest, idempotent: false };
  }

  listGenerationAttempts(genesisId) {
    assertId("genesisId", genesisId);
    if (!tableExists(this.#database, "genesis_generation_attempts")) return [];
    return this.#database.prepare(`
      SELECT record_json,record_digest FROM genesis_generation_attempts
      WHERE genesis_id=? ORDER BY candidate_attempt_number,recorded_at,attempt_id
    `).all(genesisId).map((row) => {
      const record = normalizeGenerationAttempt(parseRecord("Genesis generation attempt", row.record_json));
      const digest = genesisRecordDigest("generation_attempt", record);
      if (digest !== row.record_digest || canonicalJson(record) !== row.record_json) {
        throw new IntegrityError(`generation attempt ${record.attemptId} failed canonical/digest verification`);
      }
      return { record, recordDigest: digest };
    });
  }

  #insertManifest(manifest) {
    const digest = genesisRecordDigest("manifest", manifest);
    this.#database.prepare(`
      INSERT INTO genesis_manifests(
        genesis_id,thread_id,origin_mode,world_spec_id,publication_status,
        record_json,record_digest,created_at
      ) VALUES (?,?,?,?,?,?,?,?)
    `).run(
      manifest.genesisId,
      manifest.threadId,
      manifest.originMode,
      manifest.worldSpecRef,
      manifest.publication.status,
      canonicalJson(manifest),
      digest,
      manifest.createdAt,
    );
    return digest;
  }

  recordFailedManifest(candidate) {
    if (this.#readOnly) throw new GenesisConflictError("read-only Genesis store cannot write");
    const manifest = normalizeGenesisManifest(candidate);
    if (manifest.publication.status !== "failed") {
      throw new TypeError("recordFailedManifest requires publication.status=failed");
    }
    this.getWorldSpec(manifest.worldSpecRef);
    assertCurrentPublicationValidators(manifest);
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const digest = this.#insertManifest(manifest);
      this.#database.exec("COMMIT");
      return { manifest: structuredClone(manifest), manifestDigest: digest };
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
  }

  publishBirth(
    {
      manifest: manifestCandidate,
      thread: threadCandidate,
      episodes: episodeCandidates = [],
      memories: memoryCandidates = [],
      lifeRelations: lifeRelationCandidates = [],
      initialRoster: initialRosterCandidate = null,
      lifeContinuity: lifeContinuityCandidate = null,
      originFixture: originFixtureCandidate = null,
    },
    {
      failAfterSeedForTest = false,
      failAfterFirstMemoryForTest = false,
      failAfterLineageForTest = false,
      failAfterSituatedContinuityForTest = false,
    } = {},
  ) {
    if (this.#readOnly) throw new GenesisConflictError("read-only Genesis store cannot publish birth");
    const manifest = normalizeGenesisManifest(manifestCandidate);
    if (manifest.publication.status !== "published") {
      throw new TypeError("publishBirth requires publication.status=published");
    }
    validateThreadSnapshot(threadCandidate);
    const seedSnapshot = normalizeSeedSnapshot(threadCandidate);
    const normalizedEpisodes = normalizeBirthEpisodes(episodeCandidates, manifest);
    if (manifest.threadId !== seedSnapshot.threadId) throw new GenesisConflictError("manifest/thread identity mismatch");
    const hasPriorLife = normalizedEpisodes.length > 0;
    const hasSituatedContinuity = initialRosterCandidate !== null && lifeContinuityCandidate !== null;
    if (hasPriorLife && !hasSituatedContinuity) {
      throw new GenesisConflictError("Genesis prior-life birth requires both initialRoster and lifeContinuity");
    }
    if (!hasPriorLife && (initialRosterCandidate !== null || lifeContinuityCandidate !== null)) {
      throw new GenesisConflictError("Genesis situated continuity requires admitted life episodes");
    }

    const { record: worldSpecRecord } = this.getWorldSpec(manifest.worldSpecRef);
    assertCurrentPublicationValidators(manifest);
    if (this.#database.prepare("SELECT 1 AS present FROM threads WHERE thread_id=?").get(seedSnapshot.threadId) !== undefined) {
      throw new ThreadAlreadyExistsError(`Thread ${seedSnapshot.threadId} already exists`);
    }

    const publishedAt = manifest.publication.publishedAt;
    if (Date.parse(publishedAt) < Date.parse(seedSnapshot.provenance.createdAt)) {
      throw new GenesisConflictError("birth publication cannot predate Thread creation provenance");
    }

    const seedEventId = seedSnapshot.provenance.lastEventId;
    const actor = {
      entityId: seedSnapshot.provenance.createdBy,
      kind: "other",
      displayName: seedSnapshot.provenance.createdBy,
    };
    const actorJson = canonicalJson(actor);
    const seedStateHash = threadStateHash(seedSnapshot);
    const seedPayloadJson = canonicalJson({ snapshot: seedSnapshot });
    const seedProvenanceJson = canonicalJson({
      source: "genesis_birth",
      genesisId: manifest.genesisId,
      worldSpecRef: manifest.worldSpecRef,
    });

    let publishedThread = seedSnapshot;
    const publishedEpisodes = normalizedEpisodes.map(({ episode, payload }, index) => {
      const eventId = genesisLifeEpisodeEventId({
        threadId: seedSnapshot.threadId,
        genesisId: manifest.genesisId,
        episode,
      });
      const provenance = {
        source: "genesis_birth",
        genesisId: manifest.genesisId,
        worldSpecRef: manifest.worldSpecRef,
        episodeId: episode.episodeId,
        pass: "A",
      };
      const event = {
        eventId,
        threadId: seedSnapshot.threadId,
        sequence: index + 2,
        expectedVersion: publishedThread.version,
        resultingVersion: publishedThread.version + 1,
        eventType: THREAD_LIFE_EPISODE_RECORDED,
        commandId: null,
        commandDigest: null,
        payload,
        actor,
        occurredAt: episode.occurredAt,
        stateHash: "sha256:" + "0".repeat(64),
        authorizationId: null,
        causationId: seedEventId,
        correlationId: manifest.genesisId,
        payloadSchemaVersion: 1,
        provenance,
      };
      const nextThread = applyGenesisLifeEpisodeEventToThread(publishedThread, event, IntegrityError);
      event.stateHash = threadStateHash(nextThread);
      publishedThread = nextThread;
      return { event, payloadJson: canonicalJson(payload), provenanceJson: canonicalJson(provenance) };
    });

    const lifeEventIds = new Set(publishedEpisodes.map(({ event }) => event.eventId));
    const normalizedMemories = normalizeBirthMemories(memoryCandidates, {
      manifest,
      threadId: seedSnapshot.threadId,
      lifeEventIds,
    });
    const derivedFirstLiveVersion = seedSnapshot.version + publishedEpisodes.length + normalizedMemories.length;
    if (manifest.publication.resultingThreadVersion !== derivedFirstLiveVersion) {
      throw new GenesisConflictError(
        `manifest first-live version ${manifest.publication.resultingThreadVersion} does not match derived event-chain version ${derivedFirstLiveVersion}`,
      );
    }

    validateThreadSnapshot(publishedThread);
    const episodeStateJson = canonicalJson(publishedThread);
    const episodeStateHash = threadStateHash(publishedThread);

    try {
      this.#database.exec("BEGIN IMMEDIATE");
      assertBirthOriginWitnessesInTransaction(this.#database, manifest, originFixtureCandidate);
      this.#database.prepare(`
        INSERT INTO threads(
          thread_id,version,status,state_json,state_hash,last_event_id,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?)
      `).run(
        publishedThread.threadId,
        publishedThread.version,
        publishedThread.status,
        episodeStateJson,
        episodeStateHash,
        publishedThread.provenance.lastEventId,
        seedSnapshot.provenance.createdAt,
        publishedAt,
      );
      this.#database.prepare(`
        INSERT INTO thread_events(
          event_id,thread_id,sequence,expected_version,resulting_version,event_type,
          command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
          authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
        ) VALUES (?,?,1,0,?,'THREAD_SEEDED',NULL,NULL,?,?,?,?,NULL,?,?,1,?)
      `).run(
        seedEventId,
        seedSnapshot.threadId,
        seedSnapshot.version,
        seedPayloadJson,
        actorJson,
        publishedAt,
        seedStateHash,
        seedEventId,
        manifest.genesisId,
        seedProvenanceJson,
      );

      // The exact live #37/#38 validators/triggers remain authority. Genesis exercises them
      // inside the same publication transaction rather than creating parallel birth stores.
      persistLegacySeedIdentity(this.#database, seedSnapshot, { sourceEventId: seedEventId });
      for (const memoryRef of seedSnapshot.memoryRefs) {
        ensureMemoryVisualCompanion(this.#database, {
          threadId: seedSnapshot.threadId,
          memoryRef,
          recordedAt: seedSnapshot.provenance.createdAt,
          createdFrom: "legacy_memory_reference",
        });
      }

      if (failAfterSeedForTest) throw new GenesisConflictError("simulated Slice-A publication failure");

      for (const { event, payloadJson, provenanceJson } of publishedEpisodes) {
        this.#database.prepare(`
          INSERT INTO thread_events(
            event_id,thread_id,sequence,expected_version,resulting_version,event_type,
            command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
            authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
          ) VALUES (?,?,?,?,?,'THREAD_LIFE_EPISODE_RECORDED',NULL,NULL,?,?,?,?,NULL,?,?,1,?)
        `).run(
          event.eventId,
          event.threadId,
          event.sequence,
          event.expectedVersion,
          event.resultingVersion,
          payloadJson,
          actorJson,
          event.occurredAt,
          event.stateHash,
          event.causationId,
          event.correlationId,
          provenanceJson,
        );
      }

      let situatedContinuity = null;
      if (hasSituatedContinuity) {
        situatedContinuity = publishGenesisSituatedContinuityInTransaction(this.#database, {
          manifest,
          worldSpec: worldSpecRecord,
          initialRoster: initialRosterCandidate,
          episodes: normalizedEpisodes.map(({ episode }) => episode),
          lifeContinuity: lifeContinuityCandidate,
          seedEventId,
          ErrorType: GenesisConflictError,
        });
        if (failAfterSituatedContinuityForTest) {
          throw new GenesisConflictError("simulated situated-continuity publication failure");
        }
      }

      bindBirthGenomeAndLineageInTransaction(this.#database, {
        manifest,
        lifeRelationCandidates,
        seedEventId,
        ErrorType: GenesisConflictError,
      });
      if (failAfterLineageForTest) {
        throw new GenesisConflictError("simulated Stage-8 lineage publication failure");
      }

      const memoryHeadById = new Map();
      for (let index = 0; index < normalizedMemories.length; index += 1) {
        const record = normalizedMemories[index];
        const previous = memoryHeadById.get(record.memoryId) ?? null;
        const appended = appendAutobiographicalMemoryRevisionInTransaction(this.#database, record, {
          previousRecord: previous?.record ?? null,
          previousDigest: previous?.recordDigest ?? null,
          ConflictErrorType: GenesisConflictError,
          createdFrom: "genesis_birth",
        });
        publishedThread = appended.thread;
        memoryHeadById.set(record.memoryId, appended);
        if (failAfterFirstMemoryForTest && index === 0) {
          throw new GenesisConflictError("simulated Slice-D memory publication failure");
        }
      }

      validateThreadSnapshot(publishedThread);
      if (publishedThread.version !== derivedFirstLiveVersion) {
        throw new IntegrityError("derived Genesis Thread version disagrees with complete birth event chain");
      }
      const manifestDigest = this.#insertManifest(manifest);
      this.#database.exec("COMMIT");
      return {
        thread: structuredClone(publishedThread),
        manifest: structuredClone(manifest),
        manifestDigest,
        situatedContinuity: situatedContinuity === null ? null : structuredClone(situatedContinuity),
      };
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
  }

  getManifest(genesisId, { required = true } = {}) {
    assertId("genesisId", genesisId);
    if (!tableExists(this.#database, "genesis_manifests")) {
      if (!required) return null;
      throw new GenesisNotFoundError("Genesis manifest storage is not present in this world");
    }
    const row = this.#database.prepare(
      "SELECT record_json,record_digest FROM genesis_manifests WHERE genesis_id=?",
    ).get(genesisId);
    if (row === undefined) {
      if (!required) return null;
      throw new GenesisNotFoundError(`Genesis manifest ${genesisId} was not found`);
    }
    const record = normalizeGenesisManifest(parseRecord(`Genesis manifest ${genesisId}`, row.record_json));
    const digest = genesisRecordDigest("manifest", record);
    if (digest !== row.record_digest || canonicalJson(record) !== row.record_json) {
      throw new IntegrityError(`Genesis manifest ${genesisId} failed canonical/digest verification`);
    }
    return { record, recordDigest: digest };
  }

  listManifests({ threadId = null, publicationStatus = null } = {}) {
    const clauses = [];
    const params = [];
    if (threadId !== null) {
      assertId("threadId", threadId);
      clauses.push("thread_id=?");
      params.push(threadId);
    }
    if (publicationStatus !== null) {
      if (!["provisional", "published", "failed"].includes(publicationStatus)) {
        throw new TypeError("publicationStatus must be provisional, published, or failed");
      }
      clauses.push("publication_status=?");
      params.push(publicationStatus);
    }
    const where = clauses.length === 0 ? "" : ` WHERE ${clauses.join(" AND ")}`;
    return this.#database.prepare(`
      SELECT record_json,record_digest FROM genesis_manifests${where}
      ORDER BY created_at,genesis_id
    `).all(...params).map((row) => {
      const record = normalizeGenesisManifest(parseRecord("Genesis manifest", row.record_json));
      const digest = genesisRecordDigest("manifest", record);
      if (digest !== row.record_digest || canonicalJson(record) !== row.record_json) {
        throw new IntegrityError(`Genesis manifest ${record.genesisId} failed canonical/digest verification`);
      }
      return { record, recordDigest: digest };
    });
  }
}
