import { normalizeFibreCivilRegistration } from "#core/src/fibre-civil-identity.mjs";
import {
  requireInfraCapabilities,
  requireTransactionalStateGuarantees,
} from "#infra";

import {
  buildFidIssuanceWorkflowRecord,
  fidIssuanceRequestDigest,
  fidIssuanceRequestMatchesWorkflow,
  fidIssuanceWorkflowDigest,
  fidIssuanceWorkflowJson,
  normalizeFidIssuanceRequest,
  normalizeFidIssuanceWorkflowRecord,
  normalizeFidIssuanceWorkflowState,
} from "./fid-card-issuance-domain.mjs";

const FID_STATE_REQUIREMENTS = Object.freeze({
  relationalStatements: true,
  atomicWriteTransactions: true,
  serializedWriteTransactions: true,
  durableCommitBeforeAcknowledgement: true,
  transactionalReads: true,
  schemaMigrations: true,
  consistencyScope: "single_named_scope",
});

const REQUIRED_CREDENTIAL_TABLES = Object.freeze([
  "fid_card_credentials",
  "fid_card_active_credentials",
]);

export class FidIssuanceIdempotencyConflictError extends Error {}
export class FidIssuanceWorkflowIntegrityError extends Error {}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function openState(storage) {
  if (storage === null || typeof storage !== "object" || Array.isArray(storage)) {
    throw new TypeError("FID issuance storage must be an Infra state binding");
  }
  const { infraDriver, stateScopeId } = storage;
  nonEmpty("stateScopeId", stateScopeId);
  const infra = requireInfraCapabilities(infraDriver, "state");
  requireTransactionalStateGuarantees(infra.state, stateScopeId, FID_STATE_REQUIREMENTS);
  return infra.state.open(stateScopeId);
}

function requireCredentialRegistrySchema(database) {
  for (const table of REQUIRED_CREDENTIAL_TABLES) {
    const row = database.prepare(
      "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name=?",
    ).get(table);
    if (row === undefined) {
      throw new Error(`FID issuance requires FidCardRegistry table ${table}`);
    }
  }
}

function createSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS fid_card_issuance_workflows (
      workflow_id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      request_digest TEXT NOT NULL CHECK (request_digest LIKE 'sha256:%'),
      thread_id TEXT NOT NULL,
      fibre_identity_number TEXT NOT NULL,
      registration_id TEXT NOT NULL,
      civil_registration_digest TEXT NOT NULL CHECK (civil_registration_digest LIKE 'sha256:%'),
      reason TEXT NOT NULL CHECK (reason IN ('initial','renewal','replacement','correction')),
      proposed_credential_id TEXT NOT NULL UNIQUE,
      proposed_revision INTEGER NOT NULL CHECK (proposed_revision >= 1),
      prior_active_credential_id TEXT,
      requested_at TEXT NOT NULL,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      UNIQUE (fibre_identity_number, proposed_revision),
      FOREIGN KEY (prior_active_credential_id) REFERENCES fid_card_credentials(credential_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS fid_card_issuance_workflow_events (
      workflow_event_id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      sequence INTEGER NOT NULL CHECK (sequence >= 1),
      state TEXT NOT NULL CHECK (state IN ('identity_resolved')),
      occurred_at TEXT NOT NULL,
      reason TEXT NOT NULL,
      UNIQUE (workflow_id, sequence),
      FOREIGN KEY (workflow_id) REFERENCES fid_card_issuance_workflows(workflow_id)
    ) STRICT;

    CREATE TRIGGER IF NOT EXISTS fid_card_issuance_workflows_no_update
      BEFORE UPDATE ON fid_card_issuance_workflows
      BEGIN SELECT RAISE(ABORT, 'fid_card_issuance_workflows is immutable'); END;

    CREATE TRIGGER IF NOT EXISTS fid_card_issuance_workflows_no_delete
      BEFORE DELETE ON fid_card_issuance_workflows
      BEGIN SELECT RAISE(ABORT, 'fid_card_issuance_workflows is immutable'); END;

    CREATE TRIGGER IF NOT EXISTS fid_card_issuance_workflow_events_no_update
      BEFORE UPDATE ON fid_card_issuance_workflow_events
      BEGIN SELECT RAISE(ABORT, 'fid_card_issuance_workflow_events is immutable'); END;

    CREATE TRIGGER IF NOT EXISTS fid_card_issuance_workflow_events_no_delete
      BEFORE DELETE ON fid_card_issuance_workflow_events
      BEGIN SELECT RAISE(ABORT, 'fid_card_issuance_workflow_events is immutable'); END;
  `);
}

function workflowEventId(workflowId, state) {
  return `fidflow:${workflowId}:1:${state}`;
}

function parseWorkflow(row) {
  let parsed;
  try { parsed = JSON.parse(row.record_json); }
  catch { throw new FidIssuanceWorkflowIntegrityError(`FID issuance workflow ${row.workflow_id} has invalid JSON`); }
  let workflow;
  try { workflow = normalizeFidIssuanceWorkflowRecord(parsed); }
  catch (error) {
    throw new FidIssuanceWorkflowIntegrityError(
      `FID issuance workflow ${row.workflow_id} is invalid: ${error.message}`,
    );
  }
  if (fidIssuanceWorkflowJson(workflow) !== row.record_json
    || fidIssuanceWorkflowDigest(workflow) !== row.record_digest) {
    throw new FidIssuanceWorkflowIntegrityError(
      `FID issuance workflow ${row.workflow_id} failed digest verification`,
    );
  }
  if (workflow.workflowId !== row.workflow_id
    || workflow.idempotencyKey !== row.idempotency_key
    || workflow.requestDigest !== row.request_digest) {
    throw new FidIssuanceWorkflowIntegrityError(
      `FID issuance workflow ${row.workflow_id} failed relational binding verification`,
    );
  }
  return Object.freeze({
    workflow,
    state: normalizeFidIssuanceWorkflowState(row.state),
    recordDigest: row.record_digest,
  });
}

function assertHistoricalLinkage(database, registration) {
  const checks = [
    {
      row: database.prepare(`
        SELECT fibre_identity_number, registration_id
        FROM fid_card_credentials WHERE thread_id=? LIMIT 1
      `).get(registration.threadId),
      mismatch: (row) => row.fibre_identity_number !== registration.fibreIdentityNumber
        || row.registration_id !== registration.registrationId,
      message: `Thread ${registration.threadId} has different historical FID civil identity`,
    },
    {
      row: database.prepare(`
        SELECT thread_id, registration_id
        FROM fid_card_credentials WHERE fibre_identity_number=? LIMIT 1
      `).get(registration.fibreIdentityNumber),
      mismatch: (row) => row.thread_id !== registration.threadId
        || row.registration_id !== registration.registrationId,
      message: `FIN ${registration.fibreIdentityNumber} has different historical FID civil identity`,
    },
    {
      row: database.prepare(`
        SELECT fibre_identity_number, registration_id
        FROM fid_card_issuance_workflows WHERE thread_id=? LIMIT 1
      `).get(registration.threadId),
      mismatch: (row) => row.fibre_identity_number !== registration.fibreIdentityNumber
        || row.registration_id !== registration.registrationId,
      message: `Thread ${registration.threadId} has different historical FID issuance identity`,
    },
    {
      row: database.prepare(`
        SELECT thread_id, registration_id
        FROM fid_card_issuance_workflows WHERE fibre_identity_number=? LIMIT 1
      `).get(registration.fibreIdentityNumber),
      mismatch: (row) => row.thread_id !== registration.threadId
        || row.registration_id !== registration.registrationId,
      message: `FIN ${registration.fibreIdentityNumber} has different historical FID issuance identity`,
    },
  ];
  for (const check of checks) {
    if (check.row !== undefined && check.mismatch(check.row)) throw new TypeError(check.message);
  }
}

const WORKFLOW_READ_SELECT = `
  SELECT w.workflow_id, w.idempotency_key, w.request_digest, w.record_json, w.record_digest,
         e.state
  FROM fid_card_issuance_workflows w
  JOIN fid_card_issuance_workflow_events e
    ON e.workflow_id=w.workflow_id
   AND e.sequence=(SELECT MAX(sequence) FROM fid_card_issuance_workflow_events WHERE workflow_id=w.workflow_id)
`;

export class FidCardIssuanceStore {
  #database;

  constructor(storage) {
    this.#database = openState(storage);
    try {
      requireCredentialRegistrySchema(this.#database);
      createSchema(this.#database);
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() { this.#database.close(); }

  beginIssuanceWorkflow({ request, civilRegistration, requestedAt }) {
    const normalizedRequest = normalizeFidIssuanceRequest(request);
    const requestDigest = fidIssuanceRequestDigest(normalizedRequest);

    return this.#database.transaction(() => {
      const existing = this.getByIdempotencyKey(normalizedRequest.idempotencyKey, { required: false });
      if (existing !== null) {
        if (!fidIssuanceRequestMatchesWorkflow(normalizedRequest, existing.workflow)) {
          throw new FidIssuanceIdempotencyConflictError(
            `FID issuance idempotency key ${normalizedRequest.idempotencyKey} is already bound to a different request`,
          );
        }
        return Object.freeze({ ...existing, created: false });
      }

      const registration = normalizeFibreCivilRegistration(civilRegistration);
      if (registration.threadId !== normalizedRequest.threadId) {
        throw new TypeError("FID issuance Civil Registry registration belongs to a different Thread");
      }
      assertHistoricalLinkage(this.#database, registration);

      const active = this.#database.prepare(`
        SELECT credential_id, thread_id, registration_id
        FROM fid_card_active_credentials WHERE fibre_identity_number=?
      `).get(registration.fibreIdentityNumber);
      if (active !== undefined
        && (active.thread_id !== registration.threadId || active.registration_id !== registration.registrationId)) {
        throw new FidIssuanceWorkflowIntegrityError(
          `active FID credential for ${registration.fibreIdentityNumber} has different civil identity linkage`,
        );
      }

      const committedRevision = Number(this.#database.prepare(`
        SELECT COALESCE(MAX(revision), 0) AS revision
        FROM fid_card_credentials WHERE fibre_identity_number=?
      `).get(registration.fibreIdentityNumber).revision);
      const reservedRevision = Number(this.#database.prepare(`
        SELECT COALESCE(MAX(proposed_revision), 0) AS revision
        FROM fid_card_issuance_workflows WHERE fibre_identity_number=?
      `).get(registration.fibreIdentityNumber).revision);
      const proposedRevision = Math.max(committedRevision, reservedRevision) + 1;

      const workflow = buildFidIssuanceWorkflowRecord({
        request: normalizedRequest,
        civilRegistration: registration,
        proposedRevision,
        priorActiveCredentialId: active?.credential_id ?? null,
        requestedAt,
      });
      if (workflow.requestDigest !== requestDigest) {
        throw new FidIssuanceWorkflowIntegrityError("FID issuance request digest changed during workflow construction");
      }
      const recordJson = fidIssuanceWorkflowJson(workflow);
      const recordDigest = fidIssuanceWorkflowDigest(workflow);
      const state = normalizeFidIssuanceWorkflowState("identity_resolved");

      this.#database.prepare(`
        INSERT INTO fid_card_issuance_workflows(
          workflow_id, idempotency_key, request_digest, thread_id, fibre_identity_number,
          registration_id, civil_registration_digest, reason, proposed_credential_id,
          proposed_revision, prior_active_credential_id, requested_at, record_json, record_digest
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        workflow.workflowId,
        workflow.idempotencyKey,
        workflow.requestDigest,
        workflow.threadId,
        workflow.fibreIdentityNumber,
        workflow.registrationId,
        workflow.civilRegistrationDigest,
        workflow.reason,
        workflow.proposedCredentialId,
        workflow.proposedRevision,
        workflow.priorActiveCredentialId,
        workflow.requestedAt,
        recordJson,
        recordDigest,
      );
      this.#database.prepare(`
        INSERT INTO fid_card_issuance_workflow_events(
          workflow_event_id, workflow_id, sequence, state, occurred_at, reason
        ) VALUES (?,?,?,?,?,?)
      `).run(
        workflowEventId(workflow.workflowId, state),
        workflow.workflowId,
        1,
        state,
        workflow.requestedAt,
        "civil_identity_resolved",
      );
      return Object.freeze({ ...this.getByWorkflowId(workflow.workflowId), created: true });
    });
  }

  getByWorkflowId(workflowId, { required = true } = {}) {
    nonEmpty("workflowId", workflowId);
    const row = this.#database.prepare(`${WORKFLOW_READ_SELECT} WHERE w.workflow_id=?`).get(workflowId);
    if (row === undefined) {
      if (!required) return null;
      throw new Error(`FID issuance workflow ${workflowId} was not found`);
    }
    return parseWorkflow(row);
  }

  getByIdempotencyKey(idempotencyKey, { required = true } = {}) {
    nonEmpty("idempotencyKey", idempotencyKey);
    const row = this.#database.prepare(`${WORKFLOW_READ_SELECT} WHERE w.idempotency_key=?`).get(idempotencyKey);
    if (row === undefined) {
      if (!required) return null;
      throw new Error(`FID issuance idempotency key ${idempotencyKey} was not found`);
    }
    return parseWorkflow(row);
  }

  listByThreadId(threadId) {
    nonEmpty("threadId", threadId);
    return this.#database.prepare(`${WORKFLOW_READ_SELECT} WHERE w.thread_id=? ORDER BY w.proposed_revision ASC`)
      .all(threadId)
      .map(parseWorkflow);
  }
}
