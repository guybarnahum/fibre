import {
  requireInfraCapabilities,
  requireTransactionalStateGuarantees,
} from "#infra";

import {
  fidRecordDigest,
  fidRecordJson,
  normalizeFidCredentialRecord,
  normalizeFidLifecycleStatus,
} from "./fid-card-domain.mjs";

const FID_STATE_REQUIREMENTS = Object.freeze({
  relationalStatements: true,
  atomicWriteTransactions: true,
  serializedWriteTransactions: true,
  durableCommitBeforeAcknowledgement: true,
  transactionalReads: true,
  schemaMigrations: true,
  consistencyScope: "single_named_scope",
});

export class FidActiveCredentialConflictError extends Error {}
export class FidCredentialIntegrityError extends Error {}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function openState(storage) {
  if (storage === null || typeof storage !== "object" || Array.isArray(storage)) {
    throw new TypeError("FID registry storage must be an Infra state binding");
  }
  const { infraDriver, stateScopeId } = storage;
  nonEmpty("stateScopeId", stateScopeId);
  const infra = requireInfraCapabilities(infraDriver, "state");
  requireTransactionalStateGuarantees(infra.state, stateScopeId, FID_STATE_REQUIREMENTS);
  return infra.state.open(stateScopeId);
}

function createSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS fid_card_credentials (
      credential_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      fibre_identity_number TEXT NOT NULL,
      registration_id TEXT NOT NULL,
      revision INTEGER NOT NULL CHECK (revision >= 1),
      supersedes_credential_id TEXT,
      issued_at TEXT NOT NULL,
      expires_at TEXT,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      UNIQUE (fibre_identity_number, revision),
      UNIQUE (thread_id, revision),
      FOREIGN KEY (supersedes_credential_id) REFERENCES fid_card_credentials(credential_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS fid_card_lifecycle_events (
      lifecycle_event_id TEXT PRIMARY KEY,
      credential_id TEXT NOT NULL,
      sequence INTEGER NOT NULL CHECK (sequence >= 1),
      status TEXT NOT NULL CHECK (status IN ('active','superseded','revoked','expired')),
      occurred_at TEXT NOT NULL,
      reason TEXT NOT NULL,
      UNIQUE (credential_id, sequence),
      FOREIGN KEY (credential_id) REFERENCES fid_card_credentials(credential_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS fid_card_active_credentials (
      fibre_identity_number TEXT PRIMARY KEY,
      credential_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL UNIQUE,
      registration_id TEXT NOT NULL,
      FOREIGN KEY (credential_id) REFERENCES fid_card_credentials(credential_id)
    ) STRICT;

    CREATE TRIGGER IF NOT EXISTS fid_card_credentials_no_update
      BEFORE UPDATE ON fid_card_credentials
      BEGIN SELECT RAISE(ABORT, 'fid_card_credentials is immutable'); END;

    CREATE TRIGGER IF NOT EXISTS fid_card_credentials_no_delete
      BEFORE DELETE ON fid_card_credentials
      BEGIN SELECT RAISE(ABORT, 'fid_card_credentials is immutable'); END;

    CREATE TRIGGER IF NOT EXISTS fid_card_lifecycle_events_no_update
      BEFORE UPDATE ON fid_card_lifecycle_events
      BEGIN SELECT RAISE(ABORT, 'fid_card_lifecycle_events is immutable'); END;

    CREATE TRIGGER IF NOT EXISTS fid_card_lifecycle_events_no_delete
      BEFORE DELETE ON fid_card_lifecycle_events
      BEGIN SELECT RAISE(ABORT, 'fid_card_lifecycle_events is immutable'); END;
  `);
}

function parseCredential(row) {
  let record;
  try { record = JSON.parse(row.record_json); }
  catch { throw new FidCredentialIntegrityError(`FID credential ${row.credential_id} has invalid JSON`); }
  if (fidRecordJson(record) !== row.record_json || fidRecordDigest(record) !== row.record_digest) {
    throw new FidCredentialIntegrityError(`FID credential ${row.credential_id} failed digest verification`);
  }
  return Object.freeze({
    credential: Object.freeze(record),
    status: row.status,
    recordDigest: row.record_digest,
  });
}

function lifecycleEventId(credentialId, status) {
  return `fidlife:${credentialId}:1:${status}`;
}

function assertHistoricalLinkage(database, record) {
  const byThread = database.prepare(`
    SELECT fibre_identity_number, registration_id
    FROM fid_card_credentials WHERE thread_id=? LIMIT 1
  `).get(record.threadId);
  if (byThread !== undefined
    && (byThread.fibre_identity_number !== record.fibreIdentityNumber
      || byThread.registration_id !== record.registrationId)) {
    throw new TypeError(`Thread ${record.threadId} has different historical FID civil identity`);
  }

  const byFin = database.prepare(`
    SELECT thread_id, registration_id
    FROM fid_card_credentials WHERE fibre_identity_number=? LIMIT 1
  `).get(record.fibreIdentityNumber);
  if (byFin !== undefined
    && (byFin.thread_id !== record.threadId || byFin.registration_id !== record.registrationId)) {
    throw new TypeError(`FIN ${record.fibreIdentityNumber} has different historical FID civil identity`);
  }

  const byRegistration = database.prepare(`
    SELECT thread_id, fibre_identity_number
    FROM fid_card_credentials WHERE registration_id=? LIMIT 1
  `).get(record.registrationId);
  if (byRegistration !== undefined
    && (byRegistration.thread_id !== record.threadId
      || byRegistration.fibre_identity_number !== record.fibreIdentityNumber)) {
    throw new TypeError(`Registration ${record.registrationId} has different historical FID civil identity`);
  }
}

function assertSupersedes(database, record) {
  if (record.supersedesCredentialId === null) return;
  const prior = database.prepare(`
    SELECT thread_id, fibre_identity_number, registration_id, revision
    FROM fid_card_credentials WHERE credential_id=?
  `).get(record.supersedesCredentialId);
  if (prior === undefined) throw new TypeError(`superseded FID credential ${record.supersedesCredentialId} was not found`);
  if (prior.thread_id !== record.threadId
    || prior.fibre_identity_number !== record.fibreIdentityNumber
    || prior.registration_id !== record.registrationId
    || Number(prior.revision) >= record.revision) {
    throw new TypeError("superseded FID credential does not belong to the same earlier civil identity revision");
  }
}

const READ_SELECT = `
  SELECT c.credential_id, c.record_json, c.record_digest,
         e.status
  FROM fid_card_credentials c
  JOIN fid_card_lifecycle_events e
    ON e.credential_id=c.credential_id
   AND e.sequence=(SELECT MAX(sequence) FROM fid_card_lifecycle_events WHERE credential_id=c.credential_id)
`;

export class FidCardRegistry {
  #database;

  constructor(storage) {
    this.#database = openState(storage);
    try { createSchema(this.#database); }
    catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() { this.#database.close(); }

  registerCredential({ credential, civilIdentity, initialStatus, reason = "registered" }) {
    const record = normalizeFidCredentialRecord(credential, { civilIdentity });
    const status = normalizeFidLifecycleStatus(initialStatus);
    nonEmpty("reason", reason);
    const recordJson = fidRecordJson(record);
    const recordDigest = fidRecordDigest(record);

    return this.#database.transaction(() => {
      const existing = this.#database.prepare(
        "SELECT record_json, record_digest FROM fid_card_credentials WHERE credential_id=?",
      ).get(record.credentialId);
      if (existing !== undefined) {
        if (existing.record_json !== recordJson || existing.record_digest !== recordDigest) {
          throw new TypeError(`FID credential ${record.credentialId} already exists with different content`);
        }
        return { ...this.getByCredentialId(record.credentialId), created: false };
      }

      assertHistoricalLinkage(this.#database, record);
      assertSupersedes(this.#database, record);

      if (status === "active") {
        const active = this.#database.prepare(
          "SELECT credential_id FROM fid_card_active_credentials WHERE fibre_identity_number=?",
        ).get(record.fibreIdentityNumber);
        if (active !== undefined) {
          throw new FidActiveCredentialConflictError(
            `FIN ${record.fibreIdentityNumber} already has active FID credential ${active.credential_id}`,
          );
        }
      }

      this.#database.prepare(`
        INSERT INTO fid_card_credentials(
          credential_id, thread_id, fibre_identity_number, registration_id, revision,
          supersedes_credential_id, issued_at, expires_at, record_json, record_digest
        ) VALUES (?,?,?,?,?,?,?,?,?,?)
      `).run(
        record.credentialId,
        record.threadId,
        record.fibreIdentityNumber,
        record.registrationId,
        record.revision,
        record.supersedesCredentialId,
        record.issuedAt,
        record.expiresAt,
        recordJson,
        recordDigest,
      );
      this.#database.prepare(`
        INSERT INTO fid_card_lifecycle_events(
          lifecycle_event_id, credential_id, sequence, status, occurred_at, reason
        ) VALUES (?,?,?,?,?,?)
      `).run(
        lifecycleEventId(record.credentialId, status),
        record.credentialId,
        1,
        status,
        record.issuedAt,
        reason.trim(),
      );
      if (status === "active") {
        this.#database.prepare(`
          INSERT INTO fid_card_active_credentials(
            fibre_identity_number, credential_id, thread_id, registration_id
          ) VALUES (?,?,?,?)
        `).run(
          record.fibreIdentityNumber,
          record.credentialId,
          record.threadId,
          record.registrationId,
        );
      }
      return { ...this.getByCredentialId(record.credentialId), created: true };
    });
  }

  getByCredentialId(credentialId, { required = true } = {}) {
    nonEmpty("credentialId", credentialId);
    const row = this.#database.prepare(`${READ_SELECT} WHERE c.credential_id=?`).get(credentialId);
    if (row === undefined) {
      if (!required) return null;
      throw new Error(`FID credential ${credentialId} was not found`);
    }
    return parseCredential(row);
  }

  listByFin(fin) {
    const normalized = normalizeFidCivilIdentity({
      threadId: "lookup",
      fibreIdentityNumber: fin,
      registrationId: "lookup",
    }).fibreIdentityNumber;
    return this.#database.prepare(`${READ_SELECT} WHERE c.fibre_identity_number=? ORDER BY c.revision ASC`)
      .all(normalized)
      .map(parseCredential);
  }

  listByThreadId(threadId) {
    nonEmpty("threadId", threadId);
    return this.#database.prepare(`${READ_SELECT} WHERE c.thread_id=? ORDER BY c.revision ASC`)
      .all(threadId)
      .map(parseCredential);
  }

  getActiveByFin(fin, { required = false } = {}) {
    const normalized = normalizeFidCivilIdentity({
      threadId: "lookup",
      fibreIdentityNumber: fin,
      registrationId: "lookup",
    }).fibreIdentityNumber;
    const pointer = this.#database.prepare(
      "SELECT credential_id FROM fid_card_active_credentials WHERE fibre_identity_number=?",
    ).get(normalized);
    if (pointer === undefined) {
      if (!required) return null;
      throw new Error(`FIN ${normalized} has no active FID credential`);
    }
    return this.getByCredentialId(pointer.credential_id);
  }
}
