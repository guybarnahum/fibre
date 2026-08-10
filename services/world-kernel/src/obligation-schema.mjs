import {
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  legacyObligationReferenceDigest,
  legacyObligationTombstoneId,
} from "./obligation-domain.mjs";

export function createObligationTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS obligation_records (
      obligation_id TEXT NOT NULL CHECK (length(obligation_id)=68 AND substr(obligation_id,1,4)='obl_' AND substr(obligation_id,5) NOT GLOB '*[^0-9a-f]*'),
      revision INTEGER NOT NULL CHECK (revision >= 1),
      thread_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active','satisfied','expired','revoked','discharged')),
      obligation_json TEXT NOT NULL CHECK (json_valid(obligation_json)),
      obligation_digest TEXT NOT NULL CHECK (length(obligation_digest)=71 AND substr(obligation_digest,1,7)='sha256:' AND substr(obligation_digest,8) NOT GLOB '*[^0-9a-f]*'),
      supersedes_revision INTEGER,
      effective_at TEXT NOT NULL,
      expires_at TEXT,
      standing_visibility TEXT NOT NULL CHECK (standing_visibility IN ('public','restricted','private')),
      terms_visibility TEXT NOT NULL CHECK (terms_visibility IN ('public','restricted','private')),
      legacy_source_digest TEXT CHECK (legacy_source_digest IS NULL OR (length(legacy_source_digest)=71 AND substr(legacy_source_digest,1,7)='sha256:' AND substr(legacy_source_digest,8) NOT GLOB '*[^0-9a-f]*')),
      recorded_at TEXT NOT NULL,
      PRIMARY KEY (obligation_id, revision),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (obligation_id, supersedes_revision)
        REFERENCES obligation_records(obligation_id, revision),
      CHECK (
        (revision=1 AND supersedes_revision IS NULL)
        OR
        (revision>1 AND supersedes_revision=revision-1)
      ),
      CHECK (
        (standing_visibility='public')
        OR (standing_visibility='restricted' AND terms_visibility IN ('restricted','private'))
        OR (standing_visibility='private' AND terms_visibility='private')
      )
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_obligation_records_thread_current
      ON obligation_records(thread_id,obligation_id,revision DESC);
    CREATE INDEX IF NOT EXISTS idx_obligation_records_legacy_source
      ON obligation_records(thread_id,legacy_source_digest)
      WHERE legacy_source_digest IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_obligation_records_legacy_origin
      ON obligation_records(thread_id,legacy_source_digest)
      WHERE revision=1 AND legacy_source_digest IS NOT NULL;

    CREATE TABLE IF NOT EXISTS obligation_applicability_decisions (
      applicability_id TEXT PRIMARY KEY CHECK (length(applicability_id)=68 AND substr(applicability_id,1,4)='oba_' AND substr(applicability_id,5) NOT GLOB '*[^0-9a-f]*'),
      operation_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      snapshot_version INTEGER NOT NULL CHECK (snapshot_version >= 1),
      thread_state_hash TEXT NOT NULL CHECK (length(thread_state_hash)=71 AND substr(thread_state_hash,1,7)='sha256:' AND substr(thread_state_hash,8) NOT GLOB '*[^0-9a-f]*'),
      request_id TEXT NOT NULL,
      request_fingerprint TEXT NOT NULL CHECK (length(request_fingerprint)=71 AND substr(request_fingerprint,1,7)='sha256:' AND substr(request_fingerprint,8) NOT GLOB '*[^0-9a-f]*'),
      obligation_id TEXT NOT NULL,
      obligation_revision INTEGER NOT NULL CHECK (obligation_revision >= 1),
      obligation_digest TEXT NOT NULL CHECK (length(obligation_digest)=71 AND substr(obligation_digest,1,7)='sha256:' AND substr(obligation_digest,8) NOT GLOB '*[^0-9a-f]*'),
      nomination_source TEXT NOT NULL CHECK (nomination_source IN ('caller','fibre','both')),
      result TEXT NOT NULL CHECK (result IN ('applies','does_not_apply')),
      reason_code TEXT NOT NULL,
      policy_id TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      evidence_refs_json TEXT NOT NULL CHECK (json_valid(evidence_refs_json)),
      decision_json TEXT NOT NULL CHECK (json_valid(decision_json)),
      decision_digest TEXT NOT NULL CHECK (length(decision_digest)=71 AND substr(decision_digest,1,7)='sha256:' AND substr(decision_digest,8) NOT GLOB '*[^0-9a-f]*'),
      decided_at TEXT NOT NULL,
      causation_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (thread_id, request_id)
        REFERENCES activation_requests(thread_id, request_id),
      FOREIGN KEY (obligation_id, obligation_revision)
        REFERENCES obligation_records(obligation_id, revision)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_obligation_applicability_request
      ON obligation_applicability_decisions(thread_id,request_id,applicability_id);
    CREATE INDEX IF NOT EXISTS idx_obligation_applicability_obligation
      ON obligation_applicability_decisions(obligation_id,obligation_revision,applicability_id);

    CREATE TABLE IF NOT EXISTS legacy_obligation_tombstones (
      tombstone_id TEXT PRIMARY KEY CHECK (length(tombstone_id)=68 AND substr(tombstone_id,1,4)='olt_' AND substr(tombstone_id,5) NOT GLOB '*[^0-9a-f]*'),
      thread_id TEXT NOT NULL,
      legacy_reference TEXT NOT NULL,
      legacy_reference_digest TEXT NOT NULL CHECK (length(legacy_reference_digest)=71 AND substr(legacy_reference_digest,1,7)='sha256:' AND substr(legacy_reference_digest,8) NOT GLOB '*[^0-9a-f]*'),
      source_authorization_id TEXT NOT NULL,
      source_consumption_digest TEXT NOT NULL CHECK (length(source_consumption_digest)=71 AND substr(source_consumption_digest,1,7)='sha256:' AND substr(source_consumption_digest,8) NOT GLOB '*[^0-9a-f]*'),
      consumed_at TEXT NOT NULL,
      UNIQUE (thread_id, legacy_reference_digest),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (source_authorization_id)
        REFERENCES authorization_consumptions(authorization_id)
    ) STRICT;

    CREATE TRIGGER IF NOT EXISTS obligation_records_no_update
      BEFORE UPDATE ON obligation_records
      BEGIN SELECT RAISE(ABORT,'obligation_records is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS obligation_records_no_delete
      BEFORE DELETE ON obligation_records
      BEGIN SELECT RAISE(ABORT,'obligation_records is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS obligation_applicability_decisions_no_update
      BEFORE UPDATE ON obligation_applicability_decisions
      BEGIN SELECT RAISE(ABORT,'obligation_applicability_decisions is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS obligation_applicability_decisions_no_delete
      BEFORE DELETE ON obligation_applicability_decisions
      BEGIN SELECT RAISE(ABORT,'obligation_applicability_decisions is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS legacy_obligation_tombstones_no_update
      BEFORE UPDATE ON legacy_obligation_tombstones
      BEGIN SELECT RAISE(ABORT,'legacy_obligation_tombstones is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS legacy_obligation_tombstones_no_delete
      BEFORE DELETE ON legacy_obligation_tombstones
      BEGIN SELECT RAISE(ABORT,'legacy_obligation_tombstones is append-only'); END;

    CREATE TRIGGER IF NOT EXISTS obligation_records_revision_stable_identity
      BEFORE INSERT ON obligation_records
      WHEN NEW.revision>1 AND EXISTS (
        SELECT 1
        FROM obligation_records prior
        WHERE prior.obligation_id=NEW.obligation_id
          AND prior.revision=NEW.revision-1
          AND (
            prior.thread_id<>NEW.thread_id
            OR NOT (prior.legacy_source_digest IS NEW.legacy_source_digest)
            OR json_extract(prior.obligation_json,'$.issuer.entityId')<>json_extract(NEW.obligation_json,'$.issuer.entityId')
            OR json_extract(prior.obligation_json,'$.issuer.kind')<>json_extract(NEW.obligation_json,'$.issuer.kind')
          )
      )
      BEGIN SELECT RAISE(ABORT,'obligation revision changes stable identity'); END;

    CREATE TRIGGER IF NOT EXISTS obligation_records_terminal_status_stable
      BEFORE INSERT ON obligation_records
      WHEN NEW.revision>1 AND EXISTS (
        SELECT 1
        FROM obligation_records prior
        WHERE prior.obligation_id=NEW.obligation_id
          AND prior.revision=NEW.revision-1
          AND prior.status<>'active'
          AND NEW.status<>prior.status
      )
      BEGIN SELECT RAISE(ABORT,'terminal obligation status cannot change'); END;

    CREATE TRIGGER IF NOT EXISTS obligation_records_reject_spent_legacy_authority
      BEFORE INSERT ON obligation_records
      WHEN NEW.status='active' AND NEW.legacy_source_digest IS NOT NULL AND EXISTS (
        SELECT 1 FROM legacy_obligation_tombstones spent
        WHERE spent.thread_id=NEW.thread_id
          AND spent.legacy_reference_digest=NEW.legacy_source_digest
      )
      BEGIN SELECT RAISE(ABORT,'legacy obligation authority was already spent'); END;
  `);
}

export function legacyConsumptionRowsToTombstones(rows) {
  const tombstones = new Map();
  for (const row of rows) {
    const references = JSON.parse(row.obligation_refs_json);
    if (!Array.isArray(references)) {
      throw new TypeError(`authorization consumption ${row.authorization_id} obligation refs must be an array`);
    }
    for (const reference of references) {
      if (typeof reference !== "string" || reference.trim().length === 0) {
        throw new TypeError(`authorization consumption ${row.authorization_id} has invalid obligation ref`);
      }
      const digest = legacyObligationReferenceDigest(row.thread_id, reference);
      const key = `${row.thread_id}:${digest}`;
      const candidate = {
        tombstoneId: legacyObligationTombstoneId(row.thread_id, reference),
        threadId: row.thread_id,
        legacyReference: reference,
        legacyReferenceDigest: digest,
        sourceAuthorizationId: row.authorization_id,
        sourceConsumptionDigest: row.consumption_digest,
        consumedAt: row.consumed_at,
      };
      const prior = tombstones.get(key);
      if (prior === undefined || candidate.consumedAt < prior.consumedAt) {
        tombstones.set(key, candidate);
      }
    }
  }
  return [...tombstones.values()].sort((left, right) =>
    `${left.threadId}:${left.legacyReferenceDigest}`.localeCompare(
      `${right.threadId}:${right.legacyReferenceDigest}`,
    ));
}

export function migrateLegacyConsumedObligations(database) {
  const table = database.prepare(
    "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='authorization_consumptions'",
  ).get();
  if (table === undefined) return { inserted: 0, tombstones: [] };

  const rows = database.prepare(`
    SELECT authorization_id,thread_id,consumed_at,obligation_refs_json,consumption_digest
    FROM authorization_consumptions
    ORDER BY consumed_at,authorization_id
  `).all();
  const tombstones = legacyConsumptionRowsToTombstones(rows);
  const insert = database.prepare(`
    INSERT OR IGNORE INTO legacy_obligation_tombstones(
      tombstone_id,thread_id,legacy_reference,legacy_reference_digest,
      source_authorization_id,source_consumption_digest,consumed_at
    ) VALUES (?,?,?,?,?,?,?)
  `);
  let inserted = 0;
  for (const tombstone of tombstones) {
    const result = insert.run(
      tombstone.tombstoneId,
      tombstone.threadId,
      tombstone.legacyReference,
      tombstone.legacyReferenceDigest,
      tombstone.sourceAuthorizationId,
      tombstone.sourceConsumptionDigest,
      tombstone.consumedAt,
    );
    inserted += Number(result.changes ?? 0);
  }
  return { inserted, tombstones };
}

export function applicabilityDecisionDigest(decision) {
  return `sha256:${sha256(canonicalJson(decision))}`;
}
