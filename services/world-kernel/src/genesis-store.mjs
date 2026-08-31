import {
  IntegrityError,
  ThreadAlreadyExistsError,
  UNCOMMANDED_EVENT_TYPES,
  assertId,
  canonicalJson,
  sha256,
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
import {
  assertGenesisHistoricalEnvelopePublication,
  normalizeGenesisHistoricalEnvelopePlan,
} from "./genesis-historical-envelope-authority.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

export class GenesisConflictError extends Error {}
export class GenesisNotFoundError extends Error {}

const GENESIS_TABLES = Object.freeze([
  "genesis_world_specs",
  "genesis_manifests",
  "genesis_historical_envelope_plans",
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

function birthPublicationRequestDigest(request) {
  return `sha256:${sha256(canonicalJson(request))}`;
}

function exactBirthPublicationReplay(database, { genesisId, threadId, requestDigest }) {
  if (!tableExists(database, "genesis_birth_publications")) return null;
  const row = database.prepare(`
    SELECT genesis_id,thread_id,request_digest,result_json
    FROM genesis_birth_publications
    WHERE genesis_id=? OR thread_id=?
    LIMIT 1
  `).get(genesisId, threadId);
  if (row === undefined) return null;
  if (row.genesis_id !== genesisId || row.thread_id !== threadId || row.request_digest !== requestDigest) {
    throw new GenesisConflictError(
      `Genesis birth replay conflicts with existing publication for ${genesisId}/${threadId}`,
    );
  }
  const result = parseRecord(`Genesis birth publication ${genesisId}`, row.result_json);
  if (canonicalJson(result) !== row.result_json) {
    throw new IntegrityError(`Genesis birth publication ${genesisId} failed canonical verification`);
  }
  return Object.freeze({ ...structuredClone(result), idempotent: true });
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

  if (fixture.originKind === "echo" || fixture.originKind === "homage") {
    if (manifest.parentOrAncestorRefs.length !== 0) {
      throw new GenesisConflictError(`${fixture.originKind} birth cannot publish parentOrAncestorRefs`);
    }
    const authorityRef = fixture.originKind === "echo"
      ? fixture.sourceBundle.consentAuthorityRef
      : fixture.sourceBundle.subjectStatusAttestationRef;
    assertExactReferenceList("manifest.sourceBundleRefs", manifest.sourceBundleRefs, [authorityRef]);
    assertGenesisOriginAuthorityWitness({
      originFixture: fixture,
      resolvedAuthority: originAuthorityInTransaction(database, authorityRef),
      ErrorType: GenesisConflictError,
    });
    return fixture;
  }

  if (fixture.originKind === "fork") {
    if (manifest.sourceBundleRefs.length !== 0) {
      throw new GenesisConflictError("fork birth cannot publish sourceBundleRefs");
    }
    assertExactReferenceList(
      "manifest.parentOrAncestorRefs",
      manifest.parentOrAncestorRefs,
      [fixture.fork.sourceThreadRef],
    );
    assertForkBoundaryAgainstCanonicalEvents({
      originFixture: fixture,
      canonicalEvents: canonicalThreadEventsInTransaction(database, fixture.fork.sourceThreadRef),
      ErrorType: GenesisConflictError,
    });
    return fixture;
  }

  throw new GenesisConflictError(`unsupported source-derived origin mode ${manifest.originMode}`);
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

function normalizeBirthMemories(candidates, { manifest, threadId, lifeEventIds }) {
  if (!Array.isArray(candidates)) throw new TypeError("publishBirth memories must be an array");
  const normalized = candidates.map((candidate) => normalizeAutobiographicalMemory(candidate));
  const revisionKeys = new Set();
  for (const record of normalized) {
    if (record.recordFormat !== AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2) {
      throw new GenesisConflictError("Genesis birth may publish only explicit autobiographical_memory_v2 records");
    }
    if (record.threadId !== threadId) throw new GenesisConflictError("Genesis memory belongs to another Thread");
    if (record.authorship.kind !== "fibre_genesis_authored") {
      throw new GenesisConflictError("Genesis birth memory must use fibre_genesis_authored authorship");
    }
    if (record.recordedAt !== manifest.publication.publishedAt) {
      throw new GenesisConflictError("Genesis memory recordedAt must equal birth publication time");
    }
    if (Date.parse(record.asOf) > Date.parse(manifest.entry.chronologyEndsAt)) {
      throw new GenesisConflictError(`Genesis memory ${record.memoryId} asOf exceeds chronologyEndsAt`);
    }
    for (const ref of record.eventRefs) {
      if (!lifeEventIds.has(ref)) {
        throw new GenesisConflictError(
          `Genesis memory ${record.memoryId} subject event ${ref} is not an admitted Pass-A life event`,
        );
      }
    }
    const revisionKey = `${record.memoryId}:${record.revision}`;
    if (revisionKeys.has(revisionKey)) throw new GenesisConflictError(`duplicate Genesis memory revision ${revisionKey}`);
    revisionKeys.add(revisionKey);
  }

  normalized.sort((left, right) =>
    left.memoryId.localeCompare(right.memoryId) || left.revision - right.revision);
  const previousByMemory = new Map();
  for (const record of normalized) {
    const previous = previousByMemory.get(record.memoryId) ?? null;
    if (previous === null) {
      if (record.revision !== 1) throw new GenesisConflictError(`Genesis memory ${record.memoryId} must begin at revision 1`);
    } else {
      assertAutobiographicalMemoryRevisionCompatibility(previous, record, GenesisConflictError);
    }
    previousByMemory.set(record.memoryId, record);
  }
  return normalized;
}

export class GenesisStore {
  #database;
  #readOnly;

  constructor(storage, { readOnly = false } = {}) {
    this.#readOnly = readOnly;
    this.#database = openWorldStateDatabase(storage, {
      readOnly,
      storeName: "GenesisStore",
    });
    try {
      if (!readOnly) {
        migrateDatabase(this.#database);
        this.#database.transaction(() => {
          createGenesisTables(this.#database);
        });
      }
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() { this.#database.close(); }

  queryOnly() {
    return this.#readOnly;
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
      this.#database.transaction(() => {
        this.#database.prepare(`
          INSERT INTO genesis_world_specs(world_spec_id,record_json,record_digest,created_at)
          VALUES (?,?,?,?)
        `).run(record.worldSpecId, canonicalJson(record), digest, record.createdAt);
      });
    } catch (error) {
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
      this.#database.transaction(() => {
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
      });
    } catch (error) {
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

  #insertHistoricalEnvelopePlan(manifest, plan) {
    const recordDigest = genesisRecordDigest("historical_envelope_plan", plan);
    this.#database.prepare(`
      INSERT INTO genesis_historical_envelope_plans(
        genesis_id,thread_id,world_spec_id,plan_digest,record_json,record_digest
      ) VALUES (?,?,?,?,?,?)
    `).run(
      manifest.genesisId,
      manifest.threadId,
      manifest.worldSpecRef,
      plan.digest,
      canonicalJson(plan),
      recordDigest,
    );
    return recordDigest;
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
      const transactionResult = this.#database.transaction(() => {
        const digest = this.#insertManifest(manifest);
        return { manifest: structuredClone(manifest), manifestDigest: digest };
      });
      return transactionResult;
    } catch (error) {
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
      historicalEnvelopePlan: historicalEnvelopePlanCandidate = null,
      originFixture: originFixtureCandidate = null,
    },
    {
      failAfterSeedForTest = false,
      failAfterFirstMemoryForTest = false,
      failAfterLineageForTest = false,
      failAfterSituatedContinuityForTest = false,
      failAfterManifestForTest = false,
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
    const hasSituatedContinuity = initialRosterCandidate !== null || lifeContinuityCandidate !== null;
    if (hasSituatedContinuity && (initialRosterCandidate === null || lifeContinuityCandidate === null)) {
      throw new GenesisConflictError("Genesis situated continuity requires both initialRoster and lifeContinuity");
    }
    if (normalizedEpisodes.length > 0 && !hasSituatedContinuity) {
      throw new GenesisConflictError("Genesis prior-life birth requires initialRoster and lifeContinuity");
    }
    if (hasSituatedContinuity && normalizedEpisodes.length === 0) {
      throw new GenesisConflictError("Genesis situated continuity requires admitted life episodes");
    }

    const publicationRequest = {
      manifest: manifestCandidate,
      thread: threadCandidate,
      episodes: episodeCandidates,
      memories: memoryCandidates,
      lifeRelations: lifeRelationCandidates,
      initialRoster: initialRosterCandidate,
      lifeContinuity: lifeContinuityCandidate,
      historicalEnvelopePlan: historicalEnvelopePlanCandidate,
      originFixture: originFixtureCandidate,
    };
    const publicationRequestDigest = birthPublicationRequestDigest(publicationRequest);
    const replay = exactBirthPublicationReplay(this.#database, {
      genesisId: manifest.genesisId,
      threadId: seedSnapshot.threadId,
      requestDigest: publicationRequestDigest,
    });
    if (replay !== null) return replay;

    let historicalEnvelopePlan = null;
    if (normalizedEpisodes.length > 0) {
      if (historicalEnvelopePlanCandidate === null || historicalEnvelopePlanCandidate === undefined) {
        throw new GenesisConflictError("Genesis prior-life birth requires its authoritative historicalEnvelopePlan");
      }
      historicalEnvelopePlan = assertGenesisHistoricalEnvelopePublication({
        manifest,
        episodes: normalizedEpisodes.map(({ episode }) => episode),
        historicalEnvelopePlan: historicalEnvelopePlanCandidate,
        ErrorType: GenesisConflictError,
      });
    } else if (historicalEnvelopePlanCandidate !== null && historicalEnvelopePlanCandidate !== undefined) {
      throw new GenesisConflictError("Genesis birth without prior-life episodes cannot publish a historicalEnvelopePlan");
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
      const transactionResult = this.#database.transaction(() => {
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
        let historicalEnvelopeRecordDigest = null;
        if (historicalEnvelopePlan !== null) {
          historicalEnvelopeRecordDigest = this.#insertHistoricalEnvelopePlan(manifest, historicalEnvelopePlan);
        }
        const manifestDigest = this.#insertManifest(manifest);
        if (failAfterManifestForTest) {
          throw new GenesisConflictError("simulated post-manifest publication failure");
        }
        const result = {
          thread: structuredClone(publishedThread),
          manifest: structuredClone(manifest),
          manifestDigest,
          historicalEnvelopePlan: historicalEnvelopePlan === null ? null : structuredClone(historicalEnvelopePlan),
          historicalEnvelopeRecordDigest,
          situatedContinuity: situatedContinuity === null ? null : structuredClone(situatedContinuity),
        };
        this.#database.prepare(`
          INSERT INTO genesis_birth_publications(
            genesis_id,thread_id,request_digest,result_json,published_at
          ) VALUES (?,?,?,?,?)
        `).run(
          manifest.genesisId,
          seedSnapshot.threadId,
          publicationRequestDigest,
          canonicalJson(result),
          publishedAt,
        );
        return result;
      });
      return Object.freeze({ ...transactionResult, idempotent: false });
    } catch (error) {
      throw translateStorageError(error);
    }
  }

  getHistoricalEnvelopePlan(genesisId, { required = true } = {}) {
    assertId("genesisId", genesisId);
    if (!tableExists(this.#database, "genesis_historical_envelope_plans")) {
      if (!required) return null;
      throw new GenesisNotFoundError("Genesis historical-envelope storage is not present in this world");
    }
    const row = this.#database.prepare(
      "SELECT plan_digest,record_json,record_digest FROM genesis_historical_envelope_plans WHERE genesis_id=?",
    ).get(genesisId);
    if (row === undefined) {
      if (!required) return null;
      throw new GenesisNotFoundError(`Genesis historical-envelope plan ${genesisId} was not found`);
    }
    const plan = normalizeGenesisHistoricalEnvelopePlan(
      parseRecord(`Genesis historical-envelope plan ${genesisId}`, row.record_json),
      IntegrityError,
    );
    const recordDigest = genesisRecordDigest("historical_envelope_plan", plan);
    if (
      row.plan_digest !== plan.digest ||
      row.record_digest !== recordDigest ||
      row.record_json !== canonicalJson(plan)
    ) {
      throw new IntegrityError(`Genesis historical-envelope plan ${genesisId} failed canonical/digest verification`);
    }
    return { plan, planDigest: plan.digest, recordDigest };
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
      return {
        genesisId,
        manifest: null,
        worldSpec: null,
        historicalEnvelopePlan: null,
        attempts: [],
        threadPublished: false,
      };
    }
    const manifestRecord = this.getManifest(genesisId, { required: false });
    const attempts = this.listGenerationAttempts(genesisId);
    const historicalEnvelopePlan = this.getHistoricalEnvelopePlan(genesisId, { required: false });
    if (manifestRecord === null) {
      return { genesisId, manifest: null, worldSpec: null, historicalEnvelopePlan, attempts, threadPublished: false };
    }
    const worldSpec = this.getWorldSpec(manifestRecord.manifest.worldSpecRef);
    const threadPublished = this.#database.prepare(
      "SELECT 1 AS present FROM threads WHERE thread_id=?",
    ).get(manifestRecord.manifest.threadId) !== undefined;
    return {
      genesisId,
      manifest: manifestRecord,
      worldSpec,
      historicalEnvelopePlan,
      attempts,
      threadPublished,
    };
  }
}
