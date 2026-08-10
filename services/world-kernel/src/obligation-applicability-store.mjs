import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  normalizeActivationRequest,
  requestFingerprint,
  requestRecordDigest,
} from "./private-participation.mjs";
import {
  OBLIGATION_NOMINATION_SOURCES,
  STRUCTURED_OBLIGATION_POLICY,
  deterministicApplicability,
} from "./obligation-domain.mjs";
import { applicabilityDecisionDigest } from "./obligation-schema.mjs";
import {
  ObligationNotFoundError,
  openObligationStore,
} from "./obligation-store.mjs";
import {
  migrateDatabase,
  normalizeDatabasePath,
  safeRollback,
  translateStorageError,
} from "./persistence-sqlite.mjs";

const APPLICABILITY_ID_PATTERN = /^oba_[0-9a-f]{64}$/;
const OBLIGATION_ID_PATTERN = /^obl_[0-9a-f]{64}$/;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;

export class ApplicabilityNotFoundError extends Error {}
export class ApplicabilityConflictError extends Error {}
export class ApplicabilityRequestNotFoundError extends Error {}

function assertApplicabilityId(name, value) {
  assertNonEmpty(name, value);
  if (!APPLICABILITY_ID_PATTERN.test(value)) {
    throw new TypeError(`${name} must be oba_ followed by 64 lowercase hex characters`);
  }
}

function assertObligationId(name, value) {
  assertNonEmpty(name, value);
  if (!OBLIGATION_ID_PATTERN.test(value)) {
    throw new TypeError(`${name} must be obl_ followed by 64 lowercase hex characters`);
  }
}

function assertSha256(name, value) {
  assertNonEmpty(name, value);
  if (!SHA256_PATTERN.test(value)) throw new TypeError(`${name} must be a SHA-256 digest`);
}

function assertNominationSource(value) {
  if (!OBLIGATION_NOMINATION_SOURCES.has(value)) {
    throw new TypeError("nominationSource is invalid");
  }
}

function parseJson(name, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

function assertDecisionBody(decision) {
  assertPlainObject("applicability decision", decision);
  assertExactKeys("applicability decision", decision, [
    "applicabilityId",
    "operationId",
    "inputDigest",
    "threadId",
    "snapshotVersion",
    "threadStateHash",
    "requestId",
    "requestFingerprint",
    "obligationId",
    "obligationRevision",
    "obligationDigest",
    "nominationSource",
    "result",
    "reasonCode",
    "policy",
    "evidenceReferences",
    "decidedAt",
    "causationId",
    "correlationId",
  ]);
  assertApplicabilityId("applicabilityId", decision.applicabilityId);
  assertId("operationId", decision.operationId);
  assertSha256("inputDigest", decision.inputDigest);
  assertId("threadId", decision.threadId);
  assertFiniteNumber("snapshotVersion", decision.snapshotVersion, { integer: true, minimum: 1 });
  assertSha256("threadStateHash", decision.threadStateHash);
  assertId("requestId", decision.requestId);
  assertSha256("requestFingerprint", decision.requestFingerprint);
  assertObligationId("obligationId", decision.obligationId);
  assertFiniteNumber("obligationRevision", decision.obligationRevision, { integer: true, minimum: 1 });
  assertSha256("obligationDigest", decision.obligationDigest);
  assertNominationSource(decision.nominationSource);
  if (decision.result !== "applies" && decision.result !== "does_not_apply") {
    throw new TypeError("applicability result is invalid");
  }
  assertNonEmpty("reasonCode", decision.reasonCode);
  assertPlainObject("policy", decision.policy);
  assertExactKeys("policy", decision.policy, ["id", "version"]);
  if (
    decision.policy.id !== STRUCTURED_OBLIGATION_POLICY.id ||
    decision.policy.version !== STRUCTURED_OBLIGATION_POLICY.version
  ) {
    throw new TypeError("applicability policy is not Structured Obligation v1");
  }
  if (!Array.isArray(decision.evidenceReferences)) {
    throw new TypeError("evidenceReferences must be an array");
  }
  decision.evidenceReferences.forEach((reference, index) =>
    assertNonEmpty(`evidenceReferences[${index}]`, reference));
  if (new Set(decision.evidenceReferences).size !== decision.evidenceReferences.length) {
    throw new TypeError("evidenceReferences must not contain duplicates");
  }
  assertIsoTimestamp("decidedAt", decision.decidedAt);
  assertId("causationId", decision.causationId);
  assertId("correlationId", decision.correlationId);
}

function inputFields({ operationId, threadId, requestId, obligationId, nominationSource, causationId, correlationId }) {
  return {
    operationId,
    threadId,
    requestId,
    obligationId,
    nominationSource,
    causationId,
    correlationId,
  };
}

export function applicabilityInputDigest(input) {
  return `sha256:${sha256(canonicalJson(inputFields(input)))}`;
}

export function applicabilityIdForInput(input) {
  return `oba_${sha256(canonicalJson({
    operationId: input.operationId,
    inputDigest: applicabilityInputDigest(input),
  }))}`;
}

function installApplicabilityBackstops(database) {
  database.exec(`
    CREATE TRIGGER IF NOT EXISTS obligation_applicability_match_request
      BEFORE INSERT ON obligation_applicability_decisions
      WHEN NOT EXISTS (
        SELECT 1
        FROM activation_requests request
        WHERE request.thread_id=NEW.thread_id
          AND request.request_id=NEW.request_id
          AND request.snapshot_version=NEW.snapshot_version
          AND request.thread_state_hash=NEW.thread_state_hash
          AND request.request_fingerprint=NEW.request_fingerprint
      )
      BEGIN SELECT RAISE(ABORT,'applicability decision does not match activation request'); END;

    CREATE TRIGGER IF NOT EXISTS obligation_applicability_match_current_obligation
      BEFORE INSERT ON obligation_applicability_decisions
      WHEN NOT EXISTS (
        SELECT 1
        FROM obligation_records obligation
        WHERE obligation.obligation_id=NEW.obligation_id
          AND obligation.revision=NEW.obligation_revision
          AND obligation.thread_id=NEW.thread_id
          AND obligation.obligation_digest=NEW.obligation_digest
      ) OR EXISTS (
        SELECT 1
        FROM obligation_records newer
        WHERE newer.obligation_id=NEW.obligation_id
          AND newer.revision>NEW.obligation_revision
      )
      BEGIN SELECT RAISE(ABORT,'applicability decision does not bind the current obligation revision'); END;

    CREATE TRIGGER IF NOT EXISTS obligation_applicability_policy_v1
      BEFORE INSERT ON obligation_applicability_decisions
      WHEN NEW.policy_id<>'structured_obligation_applicability' OR NEW.policy_version<>'1'
      BEGIN SELECT RAISE(ABORT,'applicability decision policy is not Structured Obligation v1'); END;
  `);
}

function requestEvidenceReference(request) {
  return `activation_request:${request.threadId}:${request.requestId}:${request.recordDigest}`;
}

function snapshotEvidenceReference(request) {
  return `thread_snapshot:${request.threadId}:${request.snapshotVersion}:${request.threadStateHash}`;
}

function obligationEvidenceReference(revision) {
  return `obligation_revision:${revision.obligation.obligationId}:${revision.obligation.revision}:${revision.obligationDigest}`;
}

function tombstoneEvidenceReference(legacySourceDigest) {
  return `legacy_obligation_tombstone:${legacySourceDigest}`;
}

export class ObligationApplicabilityStore {
  #database;
  #obligations;

  constructor(databasePath) {
    assertNonEmpty("databasePath", databasePath);
    const normalizedPath = normalizeDatabasePath(databasePath);
    this.#database = new DatabaseSync(normalizedPath, {
      enableForeignKeyConstraints: true,
    });
    this.#database.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;",
    );
    try {
      migrateDatabase(this.#database);
      installApplicabilityBackstops(this.#database);
      // A companion read connection reuses ObligationStore's full-chain validation. The
      // applicability writer takes BEGIN IMMEDIATE before consulting it, so no competing
      // writer can append a newer obligation revision between resolution and persistence.
      this.#obligations = openObligationStore(normalizedPath);
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() {
    this.#obligations?.close();
    this.#database.close();
  }

  #requestRow(threadId, requestId) {
    return this.#database.prepare(`
      SELECT thread_id,request_id,snapshot_version,thread_state_hash,request_fingerprint,
        request_json,record_digest,occurred_at,causation_id,correlation_id
      FROM activation_requests
      WHERE thread_id=? AND request_id=?
    `).get(threadId, requestId);
  }

  #verifiedRequest(threadId, requestId) {
    const row = this.#requestRow(threadId, requestId);
    if (row === undefined) {
      throw new ApplicabilityRequestNotFoundError(
        `activation request ${requestId} was not found for Thread ${threadId}`,
      );
    }
    const request = normalizeActivationRequest(
      parseJson(`activation request ${threadId}/${requestId}`, row.request_json),
    );
    if (request.requestId !== requestId || row.thread_id !== threadId || row.request_id !== requestId) {
      throw new IntegrityError(`activation request ${threadId}/${requestId} changes identity`);
    }
    if (canonicalJson(request) !== row.request_json) {
      throw new IntegrityError(`activation request ${threadId}/${requestId} is not canonical JSON`);
    }
    const fingerprint = requestFingerprint(request);
    if (fingerprint !== row.request_fingerprint) {
      throw new IntegrityError(`activation request ${threadId}/${requestId} fingerprint failed`);
    }
    const record = {
      threadId,
      snapshotVersion: Number(row.snapshot_version),
      threadStateHash: row.thread_state_hash,
      request,
      requestFingerprint: fingerprint,
      occurredAt: row.occurred_at,
      causationId: row.causation_id,
      correlationId: row.correlation_id,
    };
    if (requestRecordDigest(record) !== row.record_digest) {
      throw new IntegrityError(`activation request ${threadId}/${requestId} record digest failed`);
    }
    const witnesses = this.#database.prepare(`
      SELECT event_id,state_hash
      FROM thread_events
      WHERE thread_id=? AND resulting_version=?
      ORDER BY sequence
    `).all(threadId, record.snapshotVersion);
    if (witnesses.length !== 1 || witnesses[0].state_hash !== record.threadStateHash) {
      throw new IntegrityError(
        `activation request ${threadId}/${requestId} does not match its historical Thread snapshot`,
      );
    }
    return { ...record, recordDigest: row.record_digest };
  }

  #rowToDecision(row) {
    const decision = parseJson(`applicability decision ${row.applicability_id}`, row.decision_json);
    assertDecisionBody(decision);
    if (canonicalJson(decision) !== row.decision_json) {
      throw new IntegrityError(`applicability decision ${row.applicability_id} is not canonical JSON`);
    }
    const digest = applicabilityDecisionDigest(decision);
    if (digest !== row.decision_digest) {
      throw new IntegrityError(`applicability decision ${row.applicability_id} digest failed`);
    }
    const checks = [
      ["applicability_id", row.applicability_id, decision.applicabilityId],
      ["operation_id", row.operation_id, decision.operationId],
      ["thread_id", row.thread_id, decision.threadId],
      ["snapshot_version", Number(row.snapshot_version), decision.snapshotVersion],
      ["thread_state_hash", row.thread_state_hash, decision.threadStateHash],
      ["request_id", row.request_id, decision.requestId],
      ["request_fingerprint", row.request_fingerprint, decision.requestFingerprint],
      ["obligation_id", row.obligation_id, decision.obligationId],
      ["obligation_revision", Number(row.obligation_revision), decision.obligationRevision],
      ["obligation_digest", row.obligation_digest, decision.obligationDigest],
      ["nomination_source", row.nomination_source, decision.nominationSource],
      ["result", row.result, decision.result],
      ["reason_code", row.reason_code, decision.reasonCode],
      ["policy_id", row.policy_id, decision.policy.id],
      ["policy_version", row.policy_version, decision.policy.version],
      ["evidence_refs_json", row.evidence_refs_json, canonicalJson(decision.evidenceReferences)],
      ["decided_at", row.decided_at, decision.decidedAt],
      ["causation_id", row.causation_id, decision.causationId],
      ["correlation_id", row.correlation_id, decision.correlationId],
    ];
    for (const [name, actual, expected] of checks) {
      if (actual !== expected) {
        throw new IntegrityError(
          `applicability decision ${decision.applicabilityId} ${name} does not match decision_json`,
        );
      }
    }
    return { decision, decisionDigest: digest };
  }

  #decisionRowById(applicabilityId) {
    return this.#database.prepare(`
      SELECT applicability_id,operation_id,thread_id,snapshot_version,thread_state_hash,
        request_id,request_fingerprint,obligation_id,obligation_revision,obligation_digest,
        nomination_source,result,reason_code,policy_id,policy_version,evidence_refs_json,
        decision_json,decision_digest,decided_at,causation_id,correlation_id
      FROM obligation_applicability_decisions
      WHERE applicability_id=?
    `).get(applicabilityId);
  }

  #decisionRowByOperation(operationId) {
    return this.#database.prepare(`
      SELECT applicability_id,operation_id,thread_id,snapshot_version,thread_state_hash,
        request_id,request_fingerprint,obligation_id,obligation_revision,obligation_digest,
        nomination_source,result,reason_code,policy_id,policy_version,evidence_refs_json,
        decision_json,decision_digest,decided_at,causation_id,correlation_id
      FROM obligation_applicability_decisions
      WHERE operation_id=?
    `).get(operationId);
  }

  getDecision(applicabilityId, { required = true } = {}) {
    assertApplicabilityId("applicabilityId", applicabilityId);
    const row = this.#decisionRowById(applicabilityId);
    if (row === undefined) {
      if (!required) return null;
      throw new ApplicabilityNotFoundError(`applicability decision ${applicabilityId} was not found`);
    }
    return this.#rowToDecision(row);
  }

  getDecisionByOperation(operationId, { required = true } = {}) {
    assertId("operationId", operationId);
    const row = this.#decisionRowByOperation(operationId);
    if (row === undefined) {
      if (!required) return null;
      throw new ApplicabilityNotFoundError(`applicability operation ${operationId} was not found`);
    }
    return this.#rowToDecision(row);
  }

  listRequestDecisions(threadId, requestId) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    return this.#database.prepare(`
      SELECT applicability_id,operation_id,thread_id,snapshot_version,thread_state_hash,
        request_id,request_fingerprint,obligation_id,obligation_revision,obligation_digest,
        nomination_source,result,reason_code,policy_id,policy_version,evidence_refs_json,
        decision_json,decision_digest,decided_at,causation_id,correlation_id
      FROM obligation_applicability_decisions
      WHERE thread_id=? AND request_id=?
      ORDER BY decided_at,applicability_id
    `).all(threadId, requestId).map((row) => this.#rowToDecision(row));
  }

  decideApplicability(input) {
    assertPlainObject("applicability input", input);
    assertExactKeys("applicability input", input, [
      "operationId",
      "threadId",
      "requestId",
      "obligationId",
      "nominationSource",
      "decidedAt",
      "causationId",
      "correlationId",
    ]);
    assertId("operationId", input.operationId);
    assertId("threadId", input.threadId);
    assertId("requestId", input.requestId);
    assertObligationId("obligationId", input.obligationId);
    assertNominationSource(input.nominationSource);
    assertIsoTimestamp("decidedAt", input.decidedAt);
    assertId("causationId", input.causationId);
    const correlationId = input.correlationId ?? input.causationId;
    assertId("correlationId", correlationId);
    const normalizedInput = { ...input, correlationId };
    const inputDigest = applicabilityInputDigest(normalizedInput);

    try {
      this.#database.exec("BEGIN IMMEDIATE");

      const priorRow = this.#decisionRowByOperation(input.operationId);
      if (priorRow !== undefined) {
        const prior = this.#rowToDecision(priorRow);
        if (prior.decision.inputDigest !== inputDigest) {
          throw new ApplicabilityConflictError(
            `applicability operation ${input.operationId} was already used with different input`,
          );
        }
        this.#database.exec("COMMIT");
        return { ...prior, created: false };
      }

      const request = this.#verifiedRequest(input.threadId, input.requestId);
      if (Date.parse(input.decidedAt) < Date.parse(request.occurredAt)) {
        throw new TypeError("applicability decision cannot predate its activation request");
      }

      let revision;
      try {
        revision = this.#obligations.getCurrentRevision(input.threadId, input.obligationId);
      } catch (error) {
        if (error instanceof ObligationNotFoundError) throw error;
        throw error;
      }
      if (Date.parse(input.decidedAt) < Date.parse(revision.recordedAt)) {
        throw new TypeError("applicability decision cannot predate the current obligation revision");
      }

      const legacyTombstoned =
        revision.obligation.legacySourceDigest !== undefined &&
        this.#database.prepare(`
          SELECT 1 AS present
          FROM legacy_obligation_tombstones
          WHERE thread_id=? AND legacy_reference_digest=?
        `).get(input.threadId, revision.obligation.legacySourceDigest) !== undefined;

      const outcome = deterministicApplicability(revision.obligation, {
        threadId: input.threadId,
        requestFingerprint: request.requestFingerprint,
        decidedAt: input.decidedAt,
        legacyTombstoned,
      });
      const evidenceReferences = [
        requestEvidenceReference(request),
        snapshotEvidenceReference(request),
        obligationEvidenceReference(revision),
        ...(legacyTombstoned
          ? [tombstoneEvidenceReference(revision.obligation.legacySourceDigest)]
          : []),
      ];
      const applicabilityId = applicabilityIdForInput(normalizedInput);
      const decision = {
        applicabilityId,
        operationId: input.operationId,
        inputDigest,
        threadId: input.threadId,
        snapshotVersion: request.snapshotVersion,
        threadStateHash: request.threadStateHash,
        requestId: input.requestId,
        requestFingerprint: request.requestFingerprint,
        obligationId: revision.obligation.obligationId,
        obligationRevision: revision.obligation.revision,
        obligationDigest: revision.obligationDigest,
        nominationSource: input.nominationSource,
        result: outcome.result,
        reasonCode: outcome.reasonCode,
        policy: { ...STRUCTURED_OBLIGATION_POLICY },
        evidenceReferences,
        decidedAt: input.decidedAt,
        causationId: input.causationId,
        correlationId,
      };
      assertDecisionBody(decision);
      const decisionDigest = applicabilityDecisionDigest(decision);

      this.#database.prepare(`
        INSERT INTO obligation_applicability_decisions(
          applicability_id,operation_id,thread_id,snapshot_version,thread_state_hash,
          request_id,request_fingerprint,obligation_id,obligation_revision,obligation_digest,
          nomination_source,result,reason_code,policy_id,policy_version,evidence_refs_json,
          decision_json,decision_digest,decided_at,causation_id,correlation_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        decision.applicabilityId,
        decision.operationId,
        decision.threadId,
        decision.snapshotVersion,
        decision.threadStateHash,
        decision.requestId,
        decision.requestFingerprint,
        decision.obligationId,
        decision.obligationRevision,
        decision.obligationDigest,
        decision.nominationSource,
        decision.result,
        decision.reasonCode,
        decision.policy.id,
        decision.policy.version,
        canonicalJson(decision.evidenceReferences),
        canonicalJson(decision),
        decisionDigest,
        decision.decidedAt,
        decision.causationId,
        decision.correlationId,
      );
      this.#database.exec("COMMIT");
      return { decision, decisionDigest, created: true };
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
  }
}

export function openObligationApplicabilityStore(databasePath) {
  return new ObligationApplicabilityStore(databasePath);
}
