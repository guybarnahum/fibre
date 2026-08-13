import {
  IntegrityError,
  canonicalJson,
} from "./persistence-common.mjs";
import {
  IDENTITY_ASSERTION_STATUSES,
  IDENTITY_AUTHORSHIP_KINDS,
  IDENTITY_BEHAVIORAL_STATUSES,
  IDENTITY_PROVENANCE_CLASSES,
  IDENTITY_VISIBILITIES,
  IDENTITY_DOMAIN_REGISTRY,
  IDENTITY_DOMAIN_REGISTRY_VERSION,
} from "./identity-domain-registry.mjs";
import {
  IDENTITY_DOMAIN_REGISTRY_V2,
  IDENTITY_DOMAIN_REGISTRY_V2_VERSION,
} from "./identity-domain-registry-v2.mjs";
import {
  identityAssertionDigest,
  identityAssertionId,
  legacySeedIdentityAssertions,
  normalizeIdentityAssertion,
} from "./identity-provenance-domain.mjs";
import {
  memoryVisualCompanionDigest,
  normalizeMemoryVisualCompanion,
  pendingMemoryVisualCompanion,
} from "./memory-visual-companion.mjs";

function sqlList(values) {
  return values.map((value) => `'${value.replaceAll("'", "''")}'`).join(",");
}

const DOMAIN_SQL = sqlList([...new Set([
  ...Object.keys(IDENTITY_DOMAIN_REGISTRY),
  ...Object.keys(IDENTITY_DOMAIN_REGISTRY_V2),
])]);
const REGISTRY_SQL = sqlList([
  IDENTITY_DOMAIN_REGISTRY_VERSION,
  IDENTITY_DOMAIN_REGISTRY_V2_VERSION,
]);
const PROVENANCE_SQL = sqlList(IDENTITY_PROVENANCE_CLASSES);
const AUTHORSHIP_SQL = sqlList(IDENTITY_AUTHORSHIP_KINDS);
const VISIBILITY_SQL = sqlList(IDENTITY_VISIBILITIES);
const STATUS_SQL = sqlList(IDENTITY_ASSERTION_STATUSES);
const BEHAVIORAL_SQL = sqlList(IDENTITY_BEHAVIORAL_STATUSES);

function parseJson(name, value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

export function createIdentityTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS identity_assertion_records (
      assertion_id TEXT PRIMARY KEY CHECK (
        length(assertion_id)=68 AND substr(assertion_id,1,4)='ias_' AND
        substr(assertion_id,5) NOT GLOB '*[^0-9a-f]*'
      ),
      claim_id TEXT NOT NULL CHECK (
        length(claim_id)=68 AND substr(claim_id,1,4)='icl_' AND
        substr(claim_id,5) NOT GLOB '*[^0-9a-f]*'
      ),
      revision INTEGER NOT NULL CHECK (revision >= 1),
      thread_id TEXT NOT NULL,
      registry_version TEXT NOT NULL CHECK (registry_version IN (${REGISTRY_SQL})),
      domain TEXT NOT NULL CHECK (domain IN (${DOMAIN_SQL})),
      kind TEXT NOT NULL,
      provenance_class TEXT NOT NULL CHECK (provenance_class IN (${PROVENANCE_SQL})),
      authorship_kind TEXT NOT NULL CHECK (authorship_kind IN (${AUTHORSHIP_SQL})),
      visibility TEXT NOT NULL CHECK (visibility IN (${VISIBILITY_SQL})),
      status TEXT NOT NULL CHECK (status IN (${STATUS_SQL})),
      projection_class TEXT NOT NULL,
      behavioral_status TEXT NOT NULL CHECK (behavioral_status IN (${BEHAVIORAL_SQL})),
      effective_at TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      supersedes_assertion_id TEXT,
      assertion_json TEXT NOT NULL CHECK (json_valid(assertion_json)),
      assertion_digest TEXT NOT NULL CHECK (
        length(assertion_digest)=71 AND substr(assertion_digest,1,7)='sha256:' AND
        substr(assertion_digest,8) NOT GLOB '*[^0-9a-f]*'
      ),
      UNIQUE (claim_id, revision),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (supersedes_assertion_id) REFERENCES identity_assertion_records(assertion_id),
      CHECK (
        (revision=1 AND supersedes_assertion_id IS NULL) OR
        (revision>1 AND supersedes_assertion_id IS NOT NULL)
      )
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_identity_assertions_thread_domain
      ON identity_assertion_records(thread_id,domain,recorded_at,assertion_id);
    CREATE INDEX IF NOT EXISTS idx_identity_assertions_claim_revision
      ON identity_assertion_records(claim_id,revision);

    CREATE TRIGGER IF NOT EXISTS identity_assertions_no_update
      BEFORE UPDATE ON identity_assertion_records
      BEGIN SELECT RAISE(ABORT,'identity_assertion_records is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS identity_assertions_no_delete
      BEFORE DELETE ON identity_assertion_records
      BEGIN SELECT RAISE(ABORT,'identity_assertion_records is append-only'); END;

    CREATE TABLE IF NOT EXISTS memory_visual_companion_records (
      companion_id TEXT NOT NULL CHECK (
        length(companion_id)=69 AND substr(companion_id,1,5)='mvis_' AND
        substr(companion_id,6) NOT GLOB '*[^0-9a-f]*'
      ),
      revision INTEGER NOT NULL CHECK (revision >= 1),
      memory_ref TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending_generation','available','unavailable_with_reason')),
      representation_kind TEXT NOT NULL CHECK (representation_kind IN ('synthetic_reconstruction','captured_photo')),
      truth_status TEXT NOT NULL CHECK (truth_status IN ('synthetic_representation_not_historical_evidence','captured_source_evidence')),
      asset_ref TEXT,
      visibility TEXT NOT NULL CHECK (visibility IN ('public','restricted','private')),
      supersedes_revision INTEGER,
      companion_json TEXT NOT NULL CHECK (json_valid(companion_json)),
      companion_digest TEXT NOT NULL CHECK (
        length(companion_digest)=71 AND substr(companion_digest,1,7)='sha256:' AND
        substr(companion_digest,8) NOT GLOB '*[^0-9a-f]*'
      ),
      recorded_at TEXT NOT NULL,
      PRIMARY KEY (companion_id, revision),
      UNIQUE (thread_id, memory_ref, revision),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      CHECK (
        (revision=1 AND supersedes_revision IS NULL) OR
        (revision>1 AND supersedes_revision=revision-1)
      )
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_memory_visual_thread_memory
      ON memory_visual_companion_records(thread_id,memory_ref,revision);

    CREATE TRIGGER IF NOT EXISTS memory_visual_companions_no_update
      BEFORE UPDATE ON memory_visual_companion_records
      BEGIN SELECT RAISE(ABORT,'memory_visual_companion_records is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS memory_visual_companions_no_delete
      BEFORE DELETE ON memory_visual_companion_records
      BEGIN SELECT RAISE(ABORT,'memory_visual_companion_records is append-only'); END;
  `);

  const identityColumns = database.prepare(
    "PRAGMA table_info(identity_assertion_records)",
  ).all();
  if (!identityColumns.some((column) => column.name === "registry_version")) {
    database.exec(
      `ALTER TABLE identity_assertion_records ADD COLUMN registry_version TEXT NOT NULL DEFAULT '${IDENTITY_DOMAIN_REGISTRY_VERSION}'`,
    );
  }
}

export function persistIdentityAssertionRow(
  database,
  candidate,
  {
    allowAcceptedCausal = false,
    allowEndogenous = false,
    registryVersion = IDENTITY_DOMAIN_REGISTRY_VERSION,
  } = {},
) {
  const assertion = normalizeIdentityAssertion(candidate, {
    allowAcceptedCausal,
    allowEndogenous,
    registryVersion,
  });
  const digest = identityAssertionDigest(assertion, { registryVersion });
  database.prepare(`
    INSERT INTO identity_assertion_records(
      assertion_id,claim_id,revision,thread_id,registry_version,domain,kind,provenance_class,
      authorship_kind,visibility,status,projection_class,behavioral_status,
      effective_at,recorded_at,supersedes_assertion_id,assertion_json,assertion_digest
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    assertion.assertionId,
    assertion.claimId,
    assertion.revision,
    assertion.threadId,
    registryVersion,
    assertion.domain,
    assertion.kind,
    assertion.provenanceClass,
    assertion.authorship.kind,
    assertion.visibility,
    assertion.status,
    assertion.projectionClass,
    assertion.behavioralStatus,
    assertion.effectiveAt,
    assertion.recordedAt,
    assertion.supersedesAssertionId ?? null,
    canonicalJson(assertion),
    digest,
  );
  return { assertion, assertionDigest: digest, registryVersion };
}

export function persistLegacySeedIdentity(database, thread, { sourceEventId } = {}) {
  const assertions = legacySeedIdentityAssertions(thread, { sourceEventId });
  for (const assertion of assertions) {
    const existing = database.prepare(`
      SELECT registry_version,assertion_json,assertion_digest
      FROM identity_assertion_records WHERE assertion_id=?
    `).get(assertion.assertionId);
    if (existing === undefined) {
      persistIdentityAssertionRow(database, assertion, { registryVersion: "1" });
      continue;
    }
    const registryVersion = existing.registry_version;
    const normalized = normalizeIdentityAssertion(
      parseJson(`identity assertion ${assertion.assertionId}`, existing.assertion_json),
      {
        allowAcceptedCausal: true,
        allowEndogenous: true,
        registryVersion,
      },
    );
    if (
      existing.assertion_digest !== identityAssertionDigest(normalized, { registryVersion }) ||
      canonicalJson(normalized) !== canonicalJson(assertion)
    ) {
      throw new IntegrityError(
        `legacy identity bootstrap assertion ${assertion.assertionId} conflicts with persisted identity`,
      );
    }
  }
  return assertions;
}

function legacyProjectionObservation(seedAssertion, projectedAssertion, recordedAt) {
  const base = {
    ...seedAssertion,
    revision: 2,
    meaning: projectedAssertion.meaning,
    provenanceClass: "fibre_derived",
    authorship: {
      kind: "fibre_policy_derived",
      entityId: "fibre.world-kernel",
      policy: { id: "legacy_projection_drift_migration", version: "2" },
    },
    sourceReferences: [seedAssertion.assertionId],
    effectiveAt: recordedAt,
    recordedAt,
    visibility: projectedAssertion.visibility,
    status: "disputed",
    supersedesAssertionId: seedAssertion.assertionId,
    disputeCorrection: {
      kind: "dispute",
      reason: "Observed pre-#37 mutable projection state differed from immutable THREAD_SEEDED genesis. Migration preserves the observed state without asserting who authorized it or when it became effective.",
      evidenceReferences: [seedAssertion.assertionId],
    },
    behavioralStatus: "context_only",
    admission: {
      policy: { id: "legacy_projection_drift_migration", version: "2" },
      admittedBy: {
        entityId: "fibre.world-kernel",
        kind: "institution",
        displayName: "Fibre World Kernel",
      },
      evidenceClassification: "exogenous",
      sourceMode: "fibre_derivation",
    },
  };
  return normalizeIdentityAssertion({
    ...base,
    assertionId: identityAssertionId({
      claimId: seedAssertion.claimId,
      revision: 2,
      meaning: projectedAssertion.meaning,
      recordedAt,
      migrationPolicy: "legacy_projection_drift_migration:2",
    }),
  }, { registryVersion: "1" });
}

function persistLegacyProjectionDrift(database, seedThread, currentThread, {
  sourceEventId,
  recordedAt,
}) {
  const seedAssertions = legacySeedIdentityAssertions(seedThread, { sourceEventId });
  const currentAssertions = legacySeedIdentityAssertions(currentThread, { sourceEventId });
  const seedByClaim = new Map(seedAssertions.map((assertion) => [assertion.claimId, assertion]));
  let corrections = 0;
  let droppedPostSeedAdditions = 0;
  for (const projected of currentAssertions) {
    const seedAssertion = seedByClaim.get(projected.claimId);
    if (seedAssertion === undefined) {
      droppedPostSeedAdditions += 1;
      continue;
    }
    if (
      projected.meaning === seedAssertion.meaning &&
      projected.visibility === seedAssertion.visibility
    ) {
      continue;
    }
    const observation = legacyProjectionObservation(seedAssertion, projected, recordedAt);
    const existing = database.prepare(`
      SELECT registry_version,assertion_json,assertion_digest FROM identity_assertion_records
      WHERE assertion_id=?
    `).get(observation.assertionId);
    if (existing === undefined) {
      persistIdentityAssertionRow(database, observation, { registryVersion: "1" });
      corrections += 1;
      continue;
    }
    const registryVersion = existing.registry_version;
    const normalized = normalizeIdentityAssertion(
      parseJson(`identity assertion ${observation.assertionId}`, existing.assertion_json),
      {
        allowAcceptedCausal: true,
        allowEndogenous: true,
        registryVersion,
      },
    );
    if (
      existing.assertion_digest !== identityAssertionDigest(normalized, { registryVersion }) ||
      canonicalJson(normalized) !== canonicalJson(observation)
    ) {
      throw new IntegrityError(
        `legacy projection observation ${observation.assertionId} conflicts with persisted identity`,
      );
    }
  }
  return { corrections, droppedPostSeedAdditions };
}

export function backfillLegacyThreadIdentity(database) {
  const rows = database.prepare(`
    SELECT t.thread_id,t.state_json,t.updated_at,
      (SELECT e.event_id FROM thread_events e
       WHERE e.thread_id=t.thread_id AND e.event_type='THREAD_SEEDED'
       ORDER BY e.sequence LIMIT 1) AS seed_event_id,
      (SELECT e.payload_json FROM thread_events e
       WHERE e.thread_id=t.thread_id AND e.event_type='THREAD_SEEDED'
       ORDER BY e.sequence LIMIT 1) AS seed_payload_json
    FROM threads t ORDER BY t.thread_id
  `).all();
  let assertions = 0;
  let corrections = 0;
  let droppedPostSeedAdditions = 0;
  for (const row of rows) {
    if (row.seed_event_id === null || row.seed_payload_json === null) {
      throw new IntegrityError(`Thread ${row.thread_id} has no seed event for identity provenance`);
    }
    const seedPayload = parseJson(`Thread ${row.thread_id} seed event payload`, row.seed_payload_json);
    if (seedPayload === null || typeof seedPayload !== "object" || Array.isArray(seedPayload)) {
      throw new IntegrityError(`Thread ${row.thread_id} seed event payload is invalid`);
    }
    const seedThread = seedPayload.snapshot;
    if (seedThread === undefined) {
      throw new IntegrityError(`Thread ${row.thread_id} seed event has no snapshot`);
    }
    const currentThread = parseJson(`Thread ${row.thread_id}`, row.state_json);
    assertions += persistLegacySeedIdentity(database, seedThread, {
      sourceEventId: row.seed_event_id,
    }).length;
    const drift = persistLegacyProjectionDrift(database, seedThread, currentThread, {
      sourceEventId: row.seed_event_id,
      recordedAt: row.updated_at,
    });
    corrections += drift.corrections;
    droppedPostSeedAdditions += drift.droppedPostSeedAdditions;
  }
  return {
    threads: rows.length,
    assertions,
    corrections,
    droppedPostSeedAdditions,
  };
}

function memoryRow(database, threadId, memoryRef) {
  return database.prepare(`
    SELECT memory_id,thread_id,event_id,session_id,summary,evidence_refs_json,created_at
    FROM thread_memories WHERE thread_id=? AND memory_id=?
  `).get(threadId, memoryRef);
}

function pendingFromReference(database, threadId, memoryRef, fallbackRecordedAt) {
  const row = memoryRow(database, threadId, memoryRef);
  if (row !== undefined) {
    return pendingMemoryVisualCompanion({
      threadId,
      memoryRef,
      recordedAt: row.created_at,
      eventId: row.event_id,
      evidenceRefs: parseJson(`memory ${memoryRef} evidence`, row.evidence_refs_json),
      memorySummary: row.summary,
      createdFrom: "persisted_autobiographical_memory",
    });
  }
  return pendingMemoryVisualCompanion({
    threadId,
    memoryRef,
    recordedAt: fallbackRecordedAt,
    createdFrom: "legacy_memory_reference",
  });
}

export function persistMemoryVisualCompanionRow(database, candidate) {
  const companion = normalizeMemoryVisualCompanion(candidate);
  const digest = memoryVisualCompanionDigest(companion);
  database.prepare(`
    INSERT INTO memory_visual_companion_records(
      companion_id,revision,memory_ref,thread_id,status,representation_kind,
      truth_status,asset_ref,visibility,supersedes_revision,companion_json,
      companion_digest,recorded_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    companion.companionId,
    companion.revision,
    companion.memoryRef,
    companion.threadId,
    companion.status,
    companion.representationKind,
    companion.truthStatus,
    companion.assetRef,
    companion.visibility,
    companion.supersedesRevision ?? null,
    canonicalJson(companion),
    digest,
    companion.recordedAt,
  );
  return { companion, companionDigest: digest };
}

export function ensureMemoryVisualCompanion(database, {
  threadId,
  memoryRef,
  recordedAt,
  eventId,
  evidenceRefs = [],
  memorySummary,
  createdFrom = "persisted_autobiographical_memory",
}) {
  const persistedMemory = memoryRow(database, threadId, memoryRef);
  const candidate = pendingMemoryVisualCompanion({
    threadId,
    memoryRef,
    recordedAt,
    ...(eventId === undefined ? {} : { eventId }),
    evidenceRefs,
    memorySummary: memorySummary ?? persistedMemory?.summary,
    createdFrom,
  });
  const existing = database.prepare(`
    SELECT companion_json,companion_digest
    FROM memory_visual_companion_records
    WHERE companion_id=? AND revision=1
  `).get(candidate.companionId);
  if (existing === undefined) return persistMemoryVisualCompanionRow(database, candidate);
  const persisted = normalizeMemoryVisualCompanion(
    parseJson(`memory visual companion ${candidate.companionId}`, existing.companion_json),
  );
  if (
    existing.companion_digest !== memoryVisualCompanionDigest(persisted) ||
    canonicalJson(persisted) !== canonicalJson(candidate)
  ) {
    throw new IntegrityError(
      `memory ${memoryRef} visual companion bootstrap conflicts with persisted evidence`,
    );
  }
  return { companion: persisted, companionDigest: existing.companion_digest };
}

export function backfillMemoryVisualCompanions(database) {
  const threadRows = database.prepare(`
    SELECT thread_id,state_json,created_at FROM threads ORDER BY thread_id
  `).all();
  let memoryReferences = 0;
  for (const threadRow of threadRows) {
    const thread = parseJson(`Thread ${threadRow.thread_id}`, threadRow.state_json);
    const refs = new Set(Array.isArray(thread.memoryRefs) ? thread.memoryRefs : []);
    const storedRows = database.prepare(`
      SELECT memory_id FROM thread_memories WHERE thread_id=?
    `).all(threadRow.thread_id);
    for (const row of storedRows) refs.add(row.memory_id);
    for (const memoryRef of refs) {
      const pending = pendingFromReference(
        database,
        threadRow.thread_id,
        memoryRef,
        threadRow.created_at,
      );
      ensureMemoryVisualCompanion(database, {
        threadId: pending.threadId,
        memoryRef: pending.memoryRef,
        recordedAt: pending.recordedAt,
        eventId: pending.sourceReferences.find((reference) => reference.startsWith("evt_")),
        evidenceRefs: pending.sourceReferences.filter(
          (reference) => reference !== pending.memoryRef && !reference.startsWith("evt_"),
        ),
        createdFrom: pending.provenance.createdFrom,
      });
      memoryReferences += 1;
    }
  }
  return { threads: threadRows.length, memoryReferences };
}

export function decodeMemoryVisualCompanionRow(row) {
  if (row === undefined || row === null) return null;
  const companion = normalizeMemoryVisualCompanion(
    parseJson(`memory visual companion ${row.companion_id} revision ${row.revision}`, row.companion_json),
  );
  const digest = memoryVisualCompanionDigest(companion);
  if (digest !== row.companion_digest || canonicalJson(companion) !== row.companion_json) {
    throw new IntegrityError(
      `memory visual companion ${row.companion_id} revision ${row.revision} failed digest/canonical JSON verification`,
    );
  }
  for (const [name, actual, expected] of [
    ["companion ID", row.companion_id, companion.companionId],
    ["revision", Number(row.revision), companion.revision],
    ["memory", row.memory_ref, companion.memoryRef],
    ["Thread", row.thread_id, companion.threadId],
    ["status", row.status, companion.status],
    ["representation kind", row.representation_kind, companion.representationKind],
    ["truth status", row.truth_status, companion.truthStatus],
    ["asset ref", row.asset_ref, companion.assetRef],
    ["visibility", row.visibility, companion.visibility],
    ["supersedes revision", row.supersedes_revision, companion.supersedesRevision ?? null],
    ["recordedAt", row.recorded_at, companion.recordedAt],
  ]) {
    if (actual !== expected) {
      throw new IntegrityError(`memory visual companion ${companion.companionId} ${name} column mismatch`);
    }
  }
  return { companion, companionDigest: digest };
}

export function verifyMemoryVisualCompanion(database, threadId, memoryRef) {
  const row = database.prepare(`
    SELECT companion_id,revision,memory_ref,thread_id,status,representation_kind,
      truth_status,asset_ref,visibility,supersedes_revision,companion_json,
      companion_digest,recorded_at
    FROM memory_visual_companion_records
    WHERE thread_id=? AND memory_ref=?
    ORDER BY revision DESC LIMIT 1
  `).get(threadId, memoryRef);
  if (row === undefined) {
    throw new IntegrityError(`memory ${memoryRef} has no visual companion lineage`);
  }
  return decodeMemoryVisualCompanionRow(row);
}
