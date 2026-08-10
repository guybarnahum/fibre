import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  canonicalJson,
} from "./persistence-common.mjs";
import {
  migrateDatabase,
  normalizeDatabasePath,
  safeRollback,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import {
  normalizeStructuredObligation,
  structuredObligationDigest,
} from "./obligation-domain.mjs";
import {
  createObligationTables,
  migrateLegacyConsumedObligations,
} from "./obligation-schema.mjs";

const OBLIGATION_ID_PATTERN = /^obl_[0-9a-f]{64}$/;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;

export class ObligationNotFoundError extends Error {}
export class ObligationConflictError extends Error {}
export class StaleObligationRevisionError extends Error {}

function assertObligationId(name, value) {
  assertNonEmpty(name, value);
  if (!OBLIGATION_ID_PATTERN.test(value)) {
    throw new TypeError(`${name} must be obl_ followed by 64 lowercase hex characters`);
  }
}

function assertSha256(name, value) {
  assertNonEmpty(name, value);
  if (!SHA256_PATTERN.test(value)) {
    throw new TypeError(`${name} must be a SHA-256 digest`);
  }
}

function parseJson(name, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

function nullable(value) {
  return value === undefined ? null : value;
}

function assertStoredColumn(name, actual, expected, obligationId, revision) {
  if (actual !== expected) {
    throw new IntegrityError(
      `obligation ${obligationId} revision ${revision} ${name} does not match obligation_json`,
    );
  }
}

function sameNullable(left, right) {
  return nullable(left) === nullable(right);
}

function sameEntityIdentity(left, right) {
  return left.entityId === right.entityId && left.kind === right.kind;
}

function rowToRevision(row) {
  const obligation = normalizeStructuredObligation(
    parseJson(
      `obligation ${row.obligation_id} revision ${row.revision}`,
      row.obligation_json,
    ),
  );
  const digest = structuredObligationDigest(obligation);
  if (digest !== row.obligation_digest) {
    throw new IntegrityError(
      `obligation ${row.obligation_id} revision ${row.revision} digest failed`,
    );
  }
  if (canonicalJson(obligation) !== row.obligation_json) {
    throw new IntegrityError(
      `obligation ${row.obligation_id} revision ${row.revision} is not stored as canonical JSON`,
    );
  }

  assertStoredColumn("obligation_id", row.obligation_id, obligation.obligationId, row.obligation_id, row.revision);
  assertStoredColumn("revision", row.revision, obligation.revision, row.obligation_id, row.revision);
  assertStoredColumn("thread_id", row.thread_id, obligation.threadId, row.obligation_id, row.revision);
  assertStoredColumn("status", row.status, obligation.status, row.obligation_id, row.revision);
  assertStoredColumn(
    "supersedes_revision",
    row.supersedes_revision,
    nullable(obligation.supersedesRevision),
    row.obligation_id,
    row.revision,
  );
  assertStoredColumn("effective_at", row.effective_at, obligation.effectiveAt, row.obligation_id, row.revision);
  assertStoredColumn(
    "expires_at",
    row.expires_at,
    nullable(obligation.expiresAt),
    row.obligation_id,
    row.revision,
  );
  assertStoredColumn(
    "standing_visibility",
    row.standing_visibility,
    obligation.visibility.standing,
    row.obligation_id,
    row.revision,
  );
  assertStoredColumn(
    "terms_visibility",
    row.terms_visibility,
    obligation.visibility.terms,
    row.obligation_id,
    row.revision,
  );
  assertStoredColumn(
    "legacy_source_digest",
    row.legacy_source_digest,
    nullable(obligation.legacySourceDigest),
    row.obligation_id,
    row.revision,
  );
  assertIsoTimestamp("obligation recordedAt", row.recorded_at);

  return {
    obligation,
    obligationDigest: digest,
    recordedAt: row.recorded_at,
  };
}

export class ObligationStore {
  #database;

  constructor(databasePath) {
    assertNonEmpty("databasePath", databasePath);
    this.#database = new DatabaseSync(normalizeDatabasePath(databasePath), {
      enableForeignKeyConstraints: true,
    });
    this.#database.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;",
    );
    try {
      migrateDatabase(this.#database);
      createObligationTables(this.#database);
      migrateLegacyConsumedObligations(this.#database);
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() {
    this.#database.close();
  }

  #ownerThreadId(obligationId) {
    const rows = this.#database.prepare(`
      SELECT DISTINCT thread_id
      FROM obligation_records
      WHERE obligation_id=?
      ORDER BY thread_id
    `).all(obligationId);
    if (rows.length > 1) {
      throw new IntegrityError(`obligation ${obligationId} has multiple Thread owners`);
    }
    return rows.length === 0 ? null : rows[0].thread_id;
  }

  #historyRows(threadId, obligationId) {
    return this.#database.prepare(`
      SELECT obligation_id,revision,thread_id,status,obligation_json,obligation_digest,
        supersedes_revision,effective_at,expires_at,standing_visibility,terms_visibility,
        legacy_source_digest,recorded_at
      FROM obligation_records
      WHERE thread_id=? AND obligation_id=?
      ORDER BY revision
    `).all(threadId, obligationId);
  }

  #validatedHistory(threadId, obligationId, { required = true } = {}) {
    const owner = this.#ownerThreadId(obligationId);
    if (owner !== null && owner !== threadId) {
      if (!required) return [];
      throw new ObligationNotFoundError(
        `obligation ${obligationId} was not found for Thread ${threadId}`,
      );
    }
    const history = this.#historyRows(threadId, obligationId).map(rowToRevision);
    if (history.length === 0) {
      if (!required) return [];
      throw new ObligationNotFoundError(
        `obligation ${obligationId} was not found for Thread ${threadId}`,
      );
    }

    const first = history[0];
    if (first.obligation.revision !== 1 || first.obligation.supersedesRevision !== undefined) {
      throw new IntegrityError(`obligation ${obligationId} history does not begin at revision 1`);
    }
    const legacySourceDigest = nullable(first.obligation.legacySourceDigest);
    const issuerIdentity = first.obligation.issuer;
    let terminalStatus = first.obligation.status === "active" ? null : first.obligation.status;
    for (let index = 0; index < history.length; index += 1) {
      const revision = history[index];
      const expectedRevision = index + 1;
      if (revision.obligation.obligationId !== obligationId) {
        throw new IntegrityError(`obligation ${obligationId} history contains a foreign obligation ID`);
      }
      if (revision.obligation.threadId !== threadId) {
        throw new IntegrityError(`obligation ${obligationId} history changes Thread owner`);
      }
      if (!sameEntityIdentity(revision.obligation.issuer, issuerIdentity)) {
        throw new IntegrityError(`obligation ${obligationId} changes issuer identity across revisions`);
      }
      if (revision.obligation.revision !== expectedRevision) {
        throw new IntegrityError(
          `obligation ${obligationId} history is not contiguous at revision ${expectedRevision}`,
        );
      }
      const expectedSupersedes = expectedRevision === 1 ? undefined : expectedRevision - 1;
      if (revision.obligation.supersedesRevision !== expectedSupersedes) {
        throw new IntegrityError(
          `obligation ${obligationId} revision ${expectedRevision} does not supersede the immediate predecessor`,
        );
      }
      if (!sameNullable(revision.obligation.legacySourceDigest, legacySourceDigest)) {
        throw new IntegrityError(`obligation ${obligationId} changes legacy source identity across revisions`);
      }
      if (index > 0 && Date.parse(revision.recordedAt) < Date.parse(history[index - 1].recordedAt)) {
        throw new IntegrityError(`obligation ${obligationId} recordedAt moves backwards across revisions`);
      }
      if (index > 0) {
        const previousStatus = history[index - 1].obligation.status;
        if (previousStatus !== "active") {
          if (revision.obligation.status !== previousStatus) {
            throw new IntegrityError(
              `obligation ${obligationId} changes terminal status ${previousStatus}`,
            );
          }
          terminalStatus = previousStatus;
        } else if (terminalStatus === null && revision.obligation.status !== "active") {
          terminalStatus = revision.obligation.status;
        }
      }
      if (terminalStatus !== null && revision.obligation.status !== terminalStatus) {
        throw new IntegrityError(`obligation ${obligationId} resurrects terminal status ${terminalStatus}`);
      }
    }
    return history;
  }

  getRevision(threadId, obligationId, revision, { required = true } = {}) {
    assertId("threadId", threadId);
    assertObligationId("obligationId", obligationId);
    assertFiniteNumber("revision", revision, { integer: true, minimum: 1 });
    const owner = this.#ownerThreadId(obligationId);
    if (owner !== null && owner !== threadId) {
      if (!required) return null;
      throw new ObligationNotFoundError(
        `obligation ${obligationId} was not found for Thread ${threadId}`,
      );
    }
    const row = this.#database.prepare(`
      SELECT obligation_id,revision,thread_id,status,obligation_json,obligation_digest,
        supersedes_revision,effective_at,expires_at,standing_visibility,terms_visibility,
        legacy_source_digest,recorded_at
      FROM obligation_records
      WHERE thread_id=? AND obligation_id=? AND revision=?
    `).get(threadId, obligationId, revision);
    if (row === undefined) {
      if (!required) return null;
      throw new ObligationNotFoundError(
        `obligation ${obligationId} revision ${revision} was not found for Thread ${threadId}`,
      );
    }
    return rowToRevision(row);
  }

  listHistory(threadId, obligationId) {
    assertId("threadId", threadId);
    assertObligationId("obligationId", obligationId);
    return this.#validatedHistory(threadId, obligationId, { required: false });
  }

  getCurrentRevision(threadId, obligationId, { required = true } = {}) {
    assertId("threadId", threadId);
    assertObligationId("obligationId", obligationId);
    const history = this.#validatedHistory(threadId, obligationId, { required });
    return history.length === 0 ? null : history[history.length - 1];
  }

  resolveCurrentRevision({
    threadId,
    obligationId,
    revision,
    obligationDigest,
  }) {
    assertId("threadId", threadId);
    assertObligationId("obligationId", obligationId);
    assertFiniteNumber("revision", revision, { integer: true, minimum: 1 });
    assertSha256("obligationDigest", obligationDigest);
    const current = this.getCurrentRevision(threadId, obligationId);
    if (
      current.obligation.revision !== revision ||
      current.obligationDigest !== obligationDigest
    ) {
      throw new StaleObligationRevisionError(
        `obligation ${obligationId} expected revision ${revision}/${obligationDigest} but current is ` +
        `${current.obligation.revision}/${current.obligationDigest}`,
      );
    }
    return current;
  }

  listCurrent(threadId) {
    assertId("threadId", threadId);
    const obligationIds = this.#database.prepare(`
      SELECT DISTINCT obligation_id
      FROM obligation_records
      WHERE thread_id=?
      ORDER BY obligation_id
    `).all(threadId).map((row) => row.obligation_id);
    return obligationIds.map((obligationId) =>
      this.getCurrentRevision(threadId, obligationId));
  }

  hasLegacyTombstone(threadId, legacySourceDigest) {
    assertId("threadId", threadId);
    assertSha256("legacySourceDigest", legacySourceDigest);
    return this.#database.prepare(`
      SELECT 1 AS present
      FROM legacy_obligation_tombstones
      WHERE thread_id=? AND legacy_reference_digest=?
    `).get(threadId, legacySourceDigest) !== undefined;
  }

  recordRevision(candidate, { recordedAt = new Date().toISOString() } = {}) {
    const obligation = normalizeStructuredObligation(structuredClone(candidate));
    assertIsoTimestamp("recordedAt", recordedAt);
    if (Date.parse(recordedAt) < Date.parse(obligation.provenance.createdAt)) {
      throw new TypeError("recordedAt cannot precede obligation provenance.createdAt");
    }

    try {
      this.#database.exec("BEGIN IMMEDIATE");

      const thread = this.#database.prepare(
        "SELECT thread_id FROM threads WHERE thread_id=?",
      ).get(obligation.threadId);
      if (thread === undefined) {
        throw new ObligationNotFoundError(
          `Thread ${obligation.threadId} must exist before recording an obligation`,
        );
      }

      const owner = this.#ownerThreadId(obligation.obligationId);
      if (owner !== null && owner !== obligation.threadId) {
        throw new ObligationConflictError(
          `obligation ${obligation.obligationId} already belongs to Thread ${owner}`,
        );
      }

      const history = this.#validatedHistory(
        obligation.threadId,
        obligation.obligationId,
        { required: false },
      );
      const existing = history.find(
        (item) => item.obligation.revision === obligation.revision,
      );
      if (existing !== undefined) {
        if (canonicalJson(existing.obligation) === canonicalJson(obligation)) {
          this.#database.exec("COMMIT");
          return { revision: existing, created: false };
        }
        throw new ObligationConflictError(
          `obligation ${obligation.obligationId} revision ${obligation.revision} already exists with different content`,
        );
      }

      if (obligation.revision === 1) {
        if (history.length !== 0) {
          throw new ObligationConflictError(
            `obligation ${obligation.obligationId} already has revision history`,
          );
        }
        if (obligation.legacySourceDigest !== undefined) {
          const duplicateLegacy = this.#database.prepare(`
            SELECT obligation_id
            FROM obligation_records
            WHERE thread_id=? AND revision=1 AND legacy_source_digest=?
            LIMIT 1
          `).get(obligation.threadId, obligation.legacySourceDigest);
          if (duplicateLegacy !== undefined) {
            throw new ObligationConflictError(
              `legacy source ${obligation.legacySourceDigest} already belongs to obligation ${duplicateLegacy.obligation_id}`,
            );
          }
        }
      } else {
        if (history.length === 0) {
          throw new StaleObligationRevisionError(
            `obligation ${obligation.obligationId} cannot append revision ${obligation.revision} without revision 1`,
          );
        }
        const current = history[history.length - 1];
        if (current.obligation.revision !== obligation.revision - 1) {
          throw new StaleObligationRevisionError(
            `obligation ${obligation.obligationId} cannot append revision ${obligation.revision}; ` +
            `current revision is ${current.obligation.revision}`,
          );
        }
        if (!sameEntityIdentity(current.obligation.issuer, obligation.issuer)) {
          throw new ObligationConflictError(
            `obligation ${obligation.obligationId} cannot change issuer identity`,
          );
        }
        if (!sameNullable(current.obligation.legacySourceDigest, obligation.legacySourceDigest)) {
          throw new ObligationConflictError(
            `obligation ${obligation.obligationId} cannot change legacy source identity`,
          );
        }
        if (
          current.obligation.status !== "active" &&
          obligation.status !== current.obligation.status
        ) {
          throw new ObligationConflictError(
            `obligation ${obligation.obligationId} cannot change terminal status ${current.obligation.status}`,
          );
        }
        if (Date.parse(recordedAt) < Date.parse(current.recordedAt)) {
          throw new ObligationConflictError(
            `obligation ${obligation.obligationId} recordedAt cannot move backwards`,
          );
        }
      }

      if (
        obligation.status === "active" &&
        obligation.legacySourceDigest !== undefined &&
        this.hasLegacyTombstone(obligation.threadId, obligation.legacySourceDigest)
      ) {
        throw new ObligationConflictError(
          `obligation ${obligation.obligationId} cannot reactivate spent legacy authority`,
        );
      }

      const digest = structuredObligationDigest(obligation);
      this.#database.prepare(`
        INSERT INTO obligation_records(
          obligation_id,revision,thread_id,status,obligation_json,obligation_digest,
          supersedes_revision,effective_at,expires_at,standing_visibility,terms_visibility,
          legacy_source_digest,recorded_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        obligation.obligationId,
        obligation.revision,
        obligation.threadId,
        obligation.status,
        canonicalJson(obligation),
        digest,
        nullable(obligation.supersedesRevision),
        obligation.effectiveAt,
        nullable(obligation.expiresAt),
        obligation.visibility.standing,
        obligation.visibility.terms,
        nullable(obligation.legacySourceDigest),
        recordedAt,
      );
      this.#database.exec("COMMIT");
      return {
        revision: this.getRevision(
          obligation.threadId,
          obligation.obligationId,
          obligation.revision,
        ),
        created: true,
      };
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
  }
}

export function openObligationStore(databasePath) {
  return new ObligationStore(databasePath);
}
