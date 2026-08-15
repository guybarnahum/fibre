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
  genesisRecordDigest,
  normalizeGenerationAttempt,
  normalizeGenesisManifest,
  normalizeGenesisWorldSpec,
  publicationValidatorSetWitness,
} from "./genesis-domain.mjs";

export class GenesisConflictError extends Error {}
export class GenesisNotFoundError extends Error {}

function parseRecord(name, json) {
  try { return JSON.parse(json); }
  catch (error) { throw new IntegrityError(`${name} is not valid JSON: ${error.message}`); }
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

  publishBirth({ manifest: manifestCandidate, thread: threadCandidate }, { failAfterSeedForTest = false } = {}) {
    if (this.#readOnly) throw new GenesisConflictError("read-only Genesis store cannot publish birth");
    const manifest = normalizeGenesisManifest(manifestCandidate);
    if (manifest.publication.status !== "published") {
      throw new TypeError("publishBirth requires publication.status=published");
    }
    validateThreadSnapshot(threadCandidate);
    const thread = normalizeSeedSnapshot(threadCandidate);
    if (manifest.threadId !== thread.threadId) throw new GenesisConflictError("manifest/thread identity mismatch");
    if (manifest.publication.resultingThreadVersion !== thread.version) {
      throw new GenesisConflictError("manifest first-live version does not match the published Thread version");
    }
    this.getWorldSpec(manifest.worldSpecRef);
    assertCurrentPublicationValidators(manifest);
    if (this.#database.prepare("SELECT 1 AS present FROM threads WHERE thread_id=?").get(thread.threadId) !== undefined) {
      throw new ThreadAlreadyExistsError(`Thread ${thread.threadId} already exists`);
    }

    const occurredAt = manifest.publication.publishedAt;
    if (Date.parse(occurredAt) < Date.parse(thread.provenance.createdAt)) {
      throw new GenesisConflictError("birth publication cannot predate Thread creation provenance");
    }
    const eventId = thread.provenance.lastEventId;
    const stateJson = canonicalJson(thread);
    const stateHash = threadStateHash(thread);
    const payloadJson = canonicalJson({ snapshot: thread });
    const actorJson = canonicalJson({
      entityId: thread.provenance.createdBy,
      kind: "other",
      displayName: thread.provenance.createdBy,
    });
    const provenanceJson = canonicalJson({
      source: "genesis_birth",
      genesisId: manifest.genesisId,
      worldSpecRef: manifest.worldSpecRef,
    });

    try {
      this.#database.exec("BEGIN IMMEDIATE");
      this.#database.prepare(`
        INSERT INTO threads(
          thread_id,version,status,state_json,state_hash,last_event_id,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?)
      `).run(
        thread.threadId,
        thread.version,
        thread.status,
        stateJson,
        stateHash,
        eventId,
        thread.provenance.createdAt,
        occurredAt,
      );
      this.#database.prepare(`
        INSERT INTO thread_events(
          event_id,thread_id,sequence,expected_version,resulting_version,event_type,
          command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
          authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
        ) VALUES (?,?,1,0,?,'THREAD_SEEDED',NULL,NULL,?,?,?,?,NULL,?,?,1,?)
      `).run(
        eventId,
        thread.threadId,
        thread.version,
        payloadJson,
        actorJson,
        occurredAt,
        stateHash,
        eventId,
        manifest.genesisId,
        provenanceJson,
      );

      // The exact live #37/#38 validators/triggers remain authority. Slice A intentionally
      // exercises them inside the same publication transaction rather than copying them.
      persistLegacySeedIdentity(this.#database, thread, { sourceEventId: eventId });
      for (const memoryRef of thread.memoryRefs) {
        ensureMemoryVisualCompanion(this.#database, {
          threadId: thread.threadId,
          memoryRef,
          recordedAt: thread.provenance.createdAt,
          createdFrom: "legacy_memory_reference",
        });
      }

      if (failAfterSeedForTest) throw new GenesisConflictError("simulated Slice-A publication failure");

      const manifestDigest = this.#insertManifest(manifest);
      this.#database.exec("COMMIT");
      return {
        thread: structuredClone(thread),
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
