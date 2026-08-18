import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  ThreadAlreadyExistsError,
  assertId,
  canonicalJson,
  threadStateHash,
} from "./persistence-common.mjs";
import {
  normalizeSeedSnapshot,
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
  genesisRecordDigest,
  normalizeGenerationAttempt,
  normalizeGenesisManifest,
  normalizeGenesisWorldSpec,
  publicationValidatorSetWitness,
} from "./genesis-domain.mjs";

export class GenesisConflictError extends Error {}
export class GenesisNotFoundError extends Error {}

const GENESIS_TABLES = Object.freeze([
  "genesis_world_specs",
  "genesis_manifests",
  "genesis_generation_attempts",
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

function normalizeBirthEpisodes(candidates, manifest) {
  if (!Array.isArray(candidates)) throw new TypeError("publishBirth episodes must be an array");
  const normalized = candidates.map((candidate) => normalizePublishedGenesisEpisode(candidate));
  const episodeIds = new Set();
  let previousOccurredAt = null;
  for (const { episode } of normalized) {
    if (episodeIds.has(episode.episodeId)) {
      throw new GenesisConflictError(`duplicate published Genesis episode ${episode.episodeId}`);
    }
    episodeIds.add(episode.episodeId);
    if (Date.parse(episode.occurredAt) > Date.parse(manifest.entry.chronologyEndsAt)) {
      throw new GenesisConflictError(`Genesis episode ${episode.episodeId} exceeds chronologyEndsAt`);
    }
    if (previousOccurredAt !== null && Date.parse(episode.occurredAt) <= Date.parse(previousOccurredAt)) {
      throw new GenesisConflictError("published Genesis episodes must advance lived chronology");
    }
    previousOccurredAt = episode.occurredAt;
  }
  return normalized;
}

export class GenesisStore {
  #database;
  #readOnly;

  constructor(databasePath, { readOnly = false } = {}) {
    this.#readOnly = readOnly;
    this.#database = new DatabaseSync(normalizeDatabasePath(databasePath), {
      readOnly,
      enableForeignKeyConstraints: true,
    });
    try {
      if (readOnly) {
        this.#database.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=5000;");
      } else {
        this.#database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
        migrateDatabase(this.#database);
        this.#database.exec("BEGIN IMMEDIATE");
        createGenesisTables(this.#database);
        this.#database.exec("COMMIT");
      }
    } catch (error) {
      safeRollback(this.#database);
      this.#database.close();
      throw error;
    }
  }

  close() { this.#database.close(); }

  queryOnly() {
    return Number(this.#database.prepare("PRAGMA query_only").get().query_only) === 1;
  }

  recordWorldSpec(candidate) {
    if (this.#readOnly) throw new GenesisConflictError("read-only Genesis store cannot write");
    const record = normalizeGenesisWorldSpec(candidate);
    const digest = genesisRecordDigest("world_spec", record);
    const existing = this.#database.prepare(
      "SELECT record_json,record_digest FROM genesis_world_specs WHERE world_spec_id=?",
    ).get(record.worldSpecId);
    if (existing !== undefined) {
      if (existing.record_json !== canonicalJson(record) || existing.record_digest !== digest) {
        throw new GenesisConflictError(`WorldSpec ${record.worldSpecId} already exists with different content`);
      }
      return { record: structuredClone(record), recordDigest: digest, idempotent: true };
    }
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      this.#database.prepare(`
        INSERT INTO genesis_world_specs(world_spec_id,record_json,record_digest,created_at)
        VALUES (?,?,?,?)
      `).run(record.worldSpecId, canonicalJson(record), digest, record.createdAt);
      this.#database.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
    return { record: structuredClone(record), recordDigest: digest, idempotent: false };
  }

  getWorldSpec(worldSpecId, { required = true } = {}) {
    assertId("worldSpecId", worldSpecId);
    if (!tableExists(this.#database, "genesis_world_specs")) {
      if (!required) return null;
      throw new GenesisNotFoundError("Genesis WorldSpec storage is not present in this world");
    }
    const row = this.#database.prepare(
      "SELECT record_json,record_digest FROM genesis_world_specs WHERE world_spec_id=?",
    ).get(worldSpecId);
    if (row === undefined) {
      if (!required) return null;
      throw new GenesisNotFoundError(`WorldSpec ${worldSpecId} was not found`);
    }
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
    const existing = this.#database.prepare(
      "SELECT record_json,record_digest FROM genesis_generation_attempts WHERE attempt_id=?",
    ).get(record.attemptId);
    if (existing !== undefined) {
      if (existing.record_json !== canonicalJson(record) || existing.record_digest !== digest) {
        throw new GenesisConflictError(`generation attempt ${record.attemptId} already exists with different content`);
      }
      return { record: structuredClone(record), recordDigest: digest, idempotent: true };
    }
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      this.#database.prepare(`
        INSERT INTO genesis_generation_attempts(
          attempt_id,genesis_id,provisional_thread_id,candidate_attempt_number,
          scope,failed_pass,failed_gate,record_json,record_digest,recorded_at
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
    { manifest: manifestCandidate, thread: threadCandidate, episodes: episodeCandidates = [] },
    { failAfterSeedForTest = false } = {},
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

    const derivedFirstLiveVersion = seedSnapshot.version + normalizedEpisodes.length;
    if (manifest.publication.resultingThreadVersion !== derivedFirstLiveVersion) {
      throw new GenesisConflictError(
        `manifest first-live version ${manifest.publication.resultingThreadVersion} does not match derived event-chain version ${derivedFirstLiveVersion}`,
      );
    }
    this.getWorldSpec(manifest.worldSpecRef);
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

    validateThreadSnapshot(publishedThread);
    if (publishedThread.version !== derivedFirstLiveVersion) {
      throw new IntegrityError("derived Genesis Thread version disagrees with episode chain");
    }

    const finalStateJson = canonicalJson(publishedThread);
    const finalStateHash = threadStateHash(publishedThread);

    try {
      this.#database.exec("BEGIN IMMEDIATE");
      this.#database.prepare(`
        INSERT INTO threads(
          thread_id,version,status,state_json,state_hash,last_event_id,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?)
      `).run(
        publishedThread.threadId,
        publishedThread.version,
        publishedThread.status,
        finalStateJson,
        finalStateHash,
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

      // The exact live #37/#38 validators/triggers remain authority. Slice A intentionally
      // exercises them inside the same publication transaction rather than copying them.
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

      const manifestDigest = this.#insertManifest(manifest);
      this.#database.exec("COMMIT");
      return {
        thread: structuredClone(publishedThread),
        manifest: structuredClone(manifest),
        manifestDigest,
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
    const manifest = normalizeGenesisManifest(parseRecord(`Genesis manifest ${genesisId}`, row.record_json));
    const digest = genesisRecordDigest("manifest", manifest);
    if (digest !== row.record_digest || canonicalJson(manifest) !== row.record_json) {
      throw new IntegrityError(`Genesis manifest ${genesisId} failed canonical/digest verification`);
    }
    return { manifest, manifestDigest: digest };
  }

  inspectGenesis(genesisId) {
    if (!genesisSchemaPresent(this.#database)) {
      return { genesisId, manifest: null, worldSpec: null, attempts: [], threadPublished: false };
    }
    const manifestRecord = this.getManifest(genesisId, { required: false });
    const attempts = this.listGenerationAttempts(genesisId);
    if (manifestRecord === null) return { genesisId, manifest: null, worldSpec: null, attempts, threadPublished: false };
    const worldSpec = this.getWorldSpec(manifestRecord.manifest.worldSpecRef);
    const threadPublished = this.#database.prepare(
      "SELECT 1 AS present FROM threads WHERE thread_id=?",
    ).get(manifestRecord.manifest.threadId) !== undefined;
    return {
      genesisId,
      manifest: manifestRecord,
      worldSpec,
      attempts,
      threadPublished,
    };
  }
}