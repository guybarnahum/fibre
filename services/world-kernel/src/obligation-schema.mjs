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

    CREATE TABLE IF NOT EXISTS structured_obligation_discharges (
      discharge_id TEXT PRIMARY KEY CHECK (length(discharge_id)=68 AND substr(discharge_id,1,4)='obd_' AND substr(discharge_id,5) NOT GLOB '*[^0-9a-f]*'),
      thread_id TEXT NOT NULL,
      obligation_id TEXT NOT NULL,
      prior_revision INTEGER NOT NULL CHECK (prior_revision >= 1),
      prior_obligation_digest TEXT NOT NULL CHECK (length(prior_obligation_digest)=71 AND substr(prior_obligation_digest,1,7)='sha256:' AND substr(prior_obligation_digest,8) NOT GLOB '*[^0-9a-f]*'),
      terminal_revision INTEGER NOT NULL CHECK (terminal_revision=prior_revision+1),
      terminal_obligation_digest TEXT NOT NULL CHECK (length(terminal_obligation_digest)=71 AND substr(terminal_obligation_digest,1,7)='sha256:' AND substr(terminal_obligation_digest,8) NOT GLOB '*[^0-9a-f]*'),
      applicability_id TEXT NOT NULL UNIQUE,
      applicability_decision_digest TEXT NOT NULL CHECK (length(applicability_decision_digest)=71 AND substr(applicability_decision_digest,1,7)='sha256:' AND substr(applicability_decision_digest,8) NOT GLOB '*[^0-9a-f]*'),
      authorization_id TEXT NOT NULL UNIQUE,
      authorization_digest TEXT NOT NULL CHECK (length(authorization_digest)=71 AND substr(authorization_digest,1,7)='sha256:' AND substr(authorization_digest,8) NOT GLOB '*[^0-9a-f]*'),
      authorization_consumption_digest TEXT NOT NULL CHECK (length(authorization_consumption_digest)=71 AND substr(authorization_consumption_digest,1,7)='sha256:' AND substr(authorization_consumption_digest,8) NOT GLOB '*[^0-9a-f]*'),
      session_id TEXT NOT NULL UNIQUE,
      request_id TEXT NOT NULL,
      freeze_operation_id TEXT NOT NULL UNIQUE,
      freeze_report_id TEXT NOT NULL UNIQUE,
      freeze_report_digest TEXT NOT NULL CHECK (length(freeze_report_digest)=71 AND substr(freeze_report_digest,1,7)='sha256:' AND substr(freeze_report_digest,8) NOT GLOB '*[^0-9a-f]*'),
      event_id TEXT NOT NULL UNIQUE,
      discharged_at TEXT NOT NULL,
      reason_code TEXT NOT NULL CHECK (reason_code='runtime_completed_guardian_pass'),
      discharge_json TEXT NOT NULL CHECK (json_valid(discharge_json)),
      discharge_digest TEXT NOT NULL CHECK (length(discharge_digest)=71 AND substr(discharge_digest,1,7)='sha256:' AND substr(discharge_digest,8) NOT GLOB '*[^0-9a-f]*'),
      UNIQUE (obligation_id, terminal_revision),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (obligation_id, prior_revision)
        REFERENCES obligation_records(obligation_id, revision),
      FOREIGN KEY (obligation_id, terminal_revision)
        REFERENCES obligation_records(obligation_id, revision),
      FOREIGN KEY (applicability_id)
        REFERENCES obligation_applicability_decisions(applicability_id),
      FOREIGN KEY (authorization_id)
        REFERENCES participation_authorizations(authorization_id),
      FOREIGN KEY (authorization_id)
        REFERENCES authorization_consumptions(authorization_id),
      FOREIGN KEY (session_id)
        REFERENCES runtime_sessions(session_id),
      FOREIGN KEY (freeze_report_id)
        REFERENCES freeze_reports(report_id),
      FOREIGN KEY (event_id)
        REFERENCES thread_events(event_id),
      FOREIGN KEY (thread_id, request_id)
        REFERENCES activation_requests(thread_id, request_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_structured_obligation_discharges_obligation
      ON structured_obligation_discharges(thread_id,obligation_id,discharged_at);

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
    CREATE TRIGGER IF NOT EXISTS structured_obligation_discharges_no_update
      BEFORE UPDATE ON structured_obligation_discharges
      BEGIN SELECT RAISE(ABORT,'structured_obligation_discharges is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS structured_obligation_discharges_no_delete
      BEFORE DELETE ON structured_obligation_discharges
      BEGIN SELECT RAISE(ABORT,'structured_obligation_discharges is append-only'); END;

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

    CREATE TRIGGER IF NOT EXISTS structured_obligation_discharge_guard
      BEFORE INSERT ON structured_obligation_discharges
      WHEN NOT EXISTS (
        SELECT 1
        FROM obligation_records prior
        JOIN obligation_records terminal
          ON terminal.obligation_id=prior.obligation_id
         AND terminal.revision=prior.revision+1
        JOIN obligation_applicability_decisions applicability
          ON applicability.applicability_id=NEW.applicability_id
        JOIN participation_authorizations authorization
          ON authorization.authorization_id=NEW.authorization_id
        JOIN authorization_consumptions consumption
          ON consumption.authorization_id=NEW.authorization_id
        JOIN runtime_sessions runtime
          ON runtime.session_id=NEW.session_id
        JOIN freeze_reports freeze
          ON freeze.report_id=NEW.freeze_report_id
        WHERE prior.obligation_id=NEW.obligation_id
          AND prior.revision=NEW.prior_revision
          AND prior.thread_id=NEW.thread_id
          AND prior.status='active'
          AND prior.obligation_digest=NEW.prior_obligation_digest
          AND terminal.revision=NEW.terminal_revision
          AND terminal.thread_id=NEW.thread_id
          AND terminal.status='discharged'
          AND terminal.supersedes_revision=NEW.prior_revision
          AND terminal.obligation_digest=NEW.terminal_obligation_digest
          AND terminal.recorded_at=NEW.discharged_at
          AND applicability.result='applies'
          AND applicability.thread_id=NEW.thread_id
          AND applicability.request_id=NEW.request_id
          AND applicability.obligation_id=NEW.obligation_id
          AND applicability.obligation_revision=NEW.prior_revision
          AND applicability.obligation_digest=NEW.prior_obligation_digest
          AND applicability.decision_digest=NEW.applicability_decision_digest
          AND authorization.thread_id=NEW.thread_id
          AND authorization.request_id=NEW.request_id
          AND authorization.authorization_digest=NEW.authorization_digest
          AND json_extract(authorization.authorization_json,'$.participationBasis')='obligation_override'
          AND json_extract(authorization.authorization_json,'$.applicability.applicabilityId')=NEW.applicability_id
          AND json_extract(authorization.authorization_json,'$.applicability.decisionDigest')=NEW.applicability_decision_digest
          AND json_extract(authorization.authorization_json,'$.applicability.obligationId')=NEW.obligation_id
          AND json_extract(authorization.authorization_json,'$.applicability.obligationRevision')=NEW.prior_revision
          AND json_extract(authorization.authorization_json,'$.applicability.obligationDigest')=NEW.prior_obligation_digest
          AND consumption.operation_id=NEW.freeze_operation_id
          AND consumption.session_id=NEW.session_id
          AND consumption.thread_id=NEW.thread_id
          AND consumption.request_id=NEW.request_id
          AND consumption.consumption_digest=NEW.authorization_consumption_digest
          AND runtime.authorization_id=NEW.authorization_id
          AND runtime.thread_id=NEW.thread_id
          AND runtime.request_id=NEW.request_id
          AND runtime.status='completed'
          AND freeze.operation_id=NEW.freeze_operation_id
          AND freeze.session_id=NEW.session_id
          AND freeze.thread_id=NEW.thread_id
          AND freeze.request_id=NEW.request_id
          AND freeze.authorization_id=NEW.authorization_id
          AND freeze.event_id=NEW.event_id
          AND freeze.report_digest=NEW.freeze_report_digest
          AND freeze.completed_at=NEW.discharged_at
      )
      BEGIN SELECT RAISE(ABORT,'structured obligation discharge evidence is not causally bound'); END;

    CREATE TRIGGER IF NOT EXISTS structured_obligation_discharge_json_guard
      BEFORE INSERT ON structured_obligation_discharges
      WHEN json_extract(NEW.discharge_json,'$.dischargeId')<>NEW.discharge_id
        OR json_extract(NEW.discharge_json,'$.threadId')<>NEW.thread_id
        OR json_extract(NEW.discharge_json,'$.obligationId')<>NEW.obligation_id
        OR json_extract(NEW.discharge_json,'$.priorRevision')<>NEW.prior_revision
        OR json_extract(NEW.discharge_json,'$.priorObligationDigest')<>NEW.prior_obligation_digest
        OR json_extract(NEW.discharge_json,'$.terminalRevision')<>NEW.terminal_revision
        OR json_extract(NEW.discharge_json,'$.terminalObligationDigest')<>NEW.terminal_obligation_digest
        OR json_extract(NEW.discharge_json,'$.applicabilityId')<>NEW.applicability_id
        OR json_extract(NEW.discharge_json,'$.applicabilityDecisionDigest')<>NEW.applicability_decision_digest
        OR json_extract(NEW.discharge_json,'$.authorizationId')<>NEW.authorization_id
        OR json_extract(NEW.discharge_json,'$.authorizationDigest')<>NEW.authorization_digest
        OR json_extract(NEW.discharge_json,'$.authorizationConsumptionDigest')<>NEW.authorization_consumption_digest
        OR json_extract(NEW.discharge_json,'$.sessionId')<>NEW.session_id
        OR json_extract(NEW.discharge_json,'$.requestId')<>NEW.request_id
        OR json_extract(NEW.discharge_json,'$.freezeOperationId')<>NEW.freeze_operation_id
        OR json_extract(NEW.discharge_json,'$.freezeReportId')<>NEW.freeze_report_id
        OR json_extract(NEW.discharge_json,'$.freezeReportDigest')<>NEW.freeze_report_digest
        OR json_extract(NEW.discharge_json,'$.eventId')<>NEW.event_id
        OR json_extract(NEW.discharge_json,'$.dischargedAt')<>NEW.discharged_at
        OR json_extract(NEW.discharge_json,'$.reasonCode')<>NEW.reason_code
      BEGIN SELECT RAISE(ABORT,'structured obligation discharge JSON does not match columns'); END;
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
