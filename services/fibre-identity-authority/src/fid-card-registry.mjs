import { createHash } from "node:crypto";

import { normalizeFibreIdentityNumber } from "#core/src/fibre-civil-identity.mjs";
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
const DIGEST = /^sha256:[0-9a-f]{64}$/;

export class FidActiveCredentialConflictError extends Error {}
export class FidCredentialIntegrityError extends Error {}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}
function iso(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new TypeError(`${name} must be an ISO timestamp`);
  return new Date(value).toISOString();
}
function digest(name, value) {
  if (typeof value !== "string" || !DIGEST.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}
function canonical(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}
function canonicalJson(value) { return JSON.stringify(canonical(value)); }
function canonicalDigest(value) { return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`; }

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

    CREATE TABLE IF NOT EXISTS fid_card_issuance_records (
      credential_id TEXT PRIMARY KEY,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
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

    CREATE TRIGGER IF NOT EXISTS fid_card_issuance_records_no_update
      BEFORE UPDATE ON fid_card_issuance_records
      BEGIN SELECT RAISE(ABORT, 'fid_card_issuance_records is immutable'); END;

    CREATE TRIGGER IF NOT EXISTS fid_card_issuance_records_no_delete
      BEFORE DELETE ON fid_card_issuance_records
      BEGIN SELECT RAISE(ABORT, 'fid_card_issuance_records is immutable'); END;
  `);
}

function parseCredential(row) {
  let record;
  try { record = JSON.parse(row.record_json); }
  catch { throw new FidCredentialIntegrityError(`FID credential ${row.credential_id} has invalid JSON`); }
  if (fidRecordJson(record) !== row.record_json || fidRecordDigest(record) !== row.record_digest) {
    throw new FidCredentialIntegrityError(`FID credential ${row.credential_id} failed digest verification`);
  }
  return Object.freeze({ credential: Object.freeze(record), status: row.status, recordDigest: row.record_digest });
}

function lifecycleEventId(credentialId, sequence, status) {
  return `fidlife:${credentialId}:${sequence}:${status}`;
}

function insertCredential(database, record, recordJson, recordDigest) {
  database.prepare(`
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
}

function appendLifecycle(database, credentialId, status, occurredAt, reason) {
  const sequence = Number(database.prepare(`
    SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence
    FROM fid_card_lifecycle_events WHERE credential_id=?
  `).get(credentialId).sequence);
  database.prepare(`
    INSERT INTO fid_card_lifecycle_events(
      lifecycle_event_id, credential_id, sequence, status, occurred_at, reason
    ) VALUES (?,?,?,?,?,?)
  `).run(
    lifecycleEventId(credentialId, sequence, status),
    credentialId,
    sequence,
    normalizeFidLifecycleStatus(status),
    iso("FID lifecycle occurredAt", occurredAt),
    nonEmpty("FID lifecycle reason", reason).trim(),
  );
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

function normalizedSide(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`FID issuance ${name} is required`);
  return Object.freeze({
    objectRef: nonEmpty(`FID issuance ${name}.objectRef`, value.objectRef),
    finalDigest: digest(`FID issuance ${name}.finalDigest`, value.finalDigest),
    manifestDigest: digest(`FID issuance ${name}.manifestDigest`, value.manifestDigest),
  });
}

function normalizeIssuanceRecord(value, credential) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("verified FID issuance record is required");
  if (value.credentialId !== credential.credentialId || value.revision !== credential.revision) {
    throw new TypeError("verified FID issuance record identifies a different credential");
  }
  if (value.c2pa?.validationStatus !== "verified") throw new TypeError("FID issuance must have verified C2PA status");
  return Object.freeze({
    credentialId: credential.credentialId,
    revision: credential.revision,
    workflowId: nonEmpty("FID issuance workflowId", value.workflowId),
    reason: nonEmpty("FID issuance reason", value.reason),
    photoAdmissionId: nonEmpty("FID issuance photoAdmissionId", value.photoAdmissionId),
    photoDigest: digest("FID issuance photoDigest", value.photoDigest),
    canonicalVisualReferenceDigest: digest("FID issuance canonicalVisualReferenceDigest", value.canonicalVisualReferenceDigest),
    photoProvenanceDigest: digest("FID issuance photoProvenanceDigest", value.photoProvenanceDigest),
    photoAdmissionReceiptDigest: digest("FID issuance photoAdmissionReceiptDigest", value.photoAdmissionReceiptDigest),
    identitySnapshotDigest: digest("FID issuance identitySnapshotDigest", value.identitySnapshotDigest),
    issuer: Object.freeze({
      authorityId: nonEmpty("FID issuance issuer.authorityId", value.issuer?.authorityId),
      keyId: nonEmpty("FID issuance issuer.keyId", value.issuer?.keyId),
      publicKeyRef: value.issuer?.publicKeyRef == null ? null : nonEmpty("FID issuance issuer.publicKeyRef", value.issuer.publicKeyRef),
      trustPolicy: nonEmpty("FID issuance issuer.trustPolicy", value.issuer?.trustPolicy),
    }),
    credentialPayloadDigest: digest("FID issuance credentialPayloadDigest", value.credentialPayloadDigest),
    encryptedCredentialDigest: digest("FID issuance encryptedCredentialDigest", value.encryptedCredentialDigest),
    machineCredentialDigest: digest("FID issuance machineCredentialDigest", value.machineCredentialDigest),
    front: normalizedSide("front", value.front),
    back: normalizedSide("back", value.back),
    c2pa: Object.freeze({
      signerId: nonEmpty("FID issuance c2pa.signerId", value.c2pa?.signerId),
      trustPolicy: nonEmpty("FID issuance c2pa.trustPolicy", value.c2pa?.trustPolicy),
      validationStatus: "verified",
    }),
  });
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
        const current = this.getByCredentialId(record.credentialId);
        if (current.status !== status) {
          throw new TypeError(`FID credential ${record.credentialId} already exists with lifecycle ${current.status}`);
        }
        return { ...current, created: false };
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

      insertCredential(this.#database, record, recordJson, recordDigest);
      appendLifecycle(this.#database, record.credentialId, status, record.issuedAt, reason);
      if (status === "active") {
        this.#database.prepare(`
          INSERT INTO fid_card_active_credentials(
            fibre_identity_number, credential_id, thread_id, registration_id
          ) VALUES (?,?,?,?)
        `).run(record.fibreIdentityNumber, record.credentialId, record.threadId, record.registrationId);
      }
      return { ...this.getByCredentialId(record.credentialId), created: true };
    });
  }

  finalizeVerifiedCredential({
    credential,
    civilIdentity,
    issuance,
    expectedPriorActiveCredentialId = null,
    activatedAt,
  }) {
    const record = normalizeFidCredentialRecord(credential, { civilIdentity });
    const verifiedIssuance = normalizeIssuanceRecord(issuance, record);
    const expectedPrior = expectedPriorActiveCredentialId == null
      ? null
      : nonEmpty("expectedPriorActiveCredentialId", expectedPriorActiveCredentialId);
    const activationTime = iso("FID activatedAt", activatedAt);
    if (record.supersedesCredentialId !== expectedPrior) {
      throw new TypeError("FID credential supersedes link does not match issuance expectation");
    }
    const recordJson = fidRecordJson(record);
    const recordDigest = fidRecordDigest(record);
    const issuanceJson = canonicalJson(verifiedIssuance);
    const issuanceRecordDigest = canonicalDigest(verifiedIssuance);

    return this.#database.transaction(() => {
      const existing = this.#database.prepare(
        "SELECT record_json, record_digest FROM fid_card_credentials WHERE credential_id=?",
      ).get(record.credentialId);
      if (existing !== undefined) {
        if (existing.record_json !== recordJson || existing.record_digest !== recordDigest) {
          throw new TypeError(`FID credential ${record.credentialId} already exists with different content`);
        }
        const priorIssuance = this.#database.prepare(
          "SELECT record_json, record_digest FROM fid_card_issuance_records WHERE credential_id=?",
        ).get(record.credentialId);
        if (priorIssuance === undefined
          || priorIssuance.record_json !== issuanceJson
          || priorIssuance.record_digest !== issuanceRecordDigest) {
          throw new TypeError(`FID credential ${record.credentialId} already exists with different issuance evidence`);
        }
        return Object.freeze({
          ...this.getByCredentialId(record.credentialId),
          issuance: verifiedIssuance,
          issuanceRecordDigest,
          created: false,
        });
      }

      assertHistoricalLinkage(this.#database, record);
      assertSupersedes(this.#database, record);
      const active = this.#database.prepare(
        "SELECT credential_id FROM fid_card_active_credentials WHERE fibre_identity_number=?",
      ).get(record.fibreIdentityNumber);
      const activeId = active?.credential_id ?? null;
      if (activeId !== expectedPrior) {
        throw new FidActiveCredentialConflictError(
          `FID active credential changed while ${record.credentialId} was being issued`,
        );
      }
      if (expectedPrior !== null && this.getByCredentialId(expectedPrior).status !== "active") {
        throw new FidActiveCredentialConflictError(`FID credential ${expectedPrior} is no longer active`);
      }

      insertCredential(this.#database, record, recordJson, recordDigest);
      this.#database.prepare(`
        INSERT INTO fid_card_issuance_records(credential_id, record_json, record_digest)
        VALUES (?,?,?)
      `).run(record.credentialId, issuanceJson, issuanceRecordDigest);

      if (expectedPrior !== null) {
        appendLifecycle(this.#database, expectedPrior, "superseded", activationTime, `superseded_by:${record.credentialId}`);
        this.#database.prepare(
          "DELETE FROM fid_card_active_credentials WHERE credential_id=?",
        ).run(expectedPrior);
      }
      appendLifecycle(this.#database, record.credentialId, "active", activationTime, "verified_issuance");
      this.#database.prepare(`
        INSERT INTO fid_card_active_credentials(
          fibre_identity_number, credential_id, thread_id, registration_id
        ) VALUES (?,?,?,?)
      `).run(record.fibreIdentityNumber, record.credentialId, record.threadId, record.registrationId);

      return Object.freeze({
        ...this.getByCredentialId(record.credentialId),
        issuance: verifiedIssuance,
        issuanceRecordDigest,
        created: true,
      });
    });
  }

  revokeCredential({ credentialId, reason, occurredAt }) {
    nonEmpty("credentialId", credentialId);
    nonEmpty("FID revocation reason", reason);
    const revokedAt = iso("FID revocation occurredAt", occurredAt);
    return this.#database.transaction(() => {
      const current = this.getByCredentialId(credentialId);
      if (current.status === "revoked") return Object.freeze({ ...current, changed: false });
      appendLifecycle(this.#database, credentialId, "revoked", revokedAt, reason);
      this.#database.prepare(
        "DELETE FROM fid_card_active_credentials WHERE credential_id=?",
      ).run(credentialId);
      return Object.freeze({ ...this.getByCredentialId(credentialId), changed: true });
    });
  }

  getIssuanceByCredentialId(credentialId, { required = false } = {}) {
    nonEmpty("credentialId", credentialId);
    const row = this.#database.prepare(
      "SELECT record_json, record_digest FROM fid_card_issuance_records WHERE credential_id=?",
    ).get(credentialId);
    if (row === undefined) {
      if (!required) return null;
      throw new Error(`FID credential ${credentialId} has no verified issuance record`);
    }
    let record;
    try { record = JSON.parse(row.record_json); }
    catch { throw new FidCredentialIntegrityError(`FID issuance ${credentialId} has invalid JSON`); }
    if (canonicalJson(record) !== row.record_json || canonicalDigest(record) !== row.record_digest) {
      throw new FidCredentialIntegrityError(`FID issuance ${credentialId} failed digest verification`);
    }
    return Object.freeze({ record: Object.freeze(record), recordDigest: row.record_digest });
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
    const normalized = normalizeFibreIdentityNumber(fin);
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
    const normalized = normalizeFibreIdentityNumber(fin);
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
