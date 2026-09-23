import {
  IntegrityError,
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { migrateDatabase, translateStorageError } from "./persistence-sqlite.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

const WORK_KIND = "inside_fibre_visitor_availability";
const MEDIATED_CONTEXT = "insidefibre:visitor-work";

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function commitmentId({ threadId, offerId }) {
  return `work_${sha256(canonicalJson({ threadId, offerId })).slice(0, 48)}`;
}

function normalizeCognition(value) {
  assertPlainObject("work commitment cognition", value);
  assertExactKeys("work commitment cognition", value, [
    "provider",
    "modelId",
    "providerRequestId",
    "implementationProfile",
    "sourceThreadVersion",
    "selectedEvidenceRefs",
    "evidenceRefs",
    "contextDigest",
  ]);
  assertNonEmpty("work commitment cognition.provider", value.provider);
  assertNonEmpty("work commitment cognition.modelId", value.modelId);
  if (value.providerRequestId !== null) assertNonEmpty("work commitment cognition.providerRequestId", value.providerRequestId);
  assertPlainObject("work commitment cognition.implementationProfile", value.implementationProfile);
  assertNonEmpty("work commitment cognition.implementationProfile.id", value.implementationProfile.id);
  assertNonEmpty("work commitment cognition.implementationProfile.version", value.implementationProfile.version);
  if (!Number.isSafeInteger(value.sourceThreadVersion) || value.sourceThreadVersion < 0) {
    throw new TypeError("work commitment cognition.sourceThreadVersion must be a non-negative integer");
  }
  assertStringArray("work commitment cognition.selectedEvidenceRefs", value.selectedEvidenceRefs);
  assertStringArray("work commitment cognition.evidenceRefs", value.evidenceRefs);
  assertNonEmpty("work commitment cognition.contextDigest", value.contextDigest);
  if (!value.contextDigest.startsWith("sha256:")) {
    throw new TypeError("work commitment cognition.contextDigest must be a sha256 digest");
  }
  return structuredClone(value);
}

function normalizeCommitment(candidate) {
  assertPlainObject("Inside Fibre work commitment", candidate);
  assertExactKeys("Inside Fibre work commitment", candidate, [
    "commitmentId",
    "kind",
    "offerId",
    "threadId",
    "acceptedAt",
    "startAt",
    "endAt",
    "mediatedContext",
    "purpose",
    "compensation",
    "cognition",
  ]);
  assertId("work commitment commitmentId", candidate.commitmentId);
  if (candidate.kind !== WORK_KIND) throw new TypeError("work commitment kind is invalid");
  assertId("work commitment offerId", candidate.offerId);
  assertId("work commitment threadId", candidate.threadId);
  assertIsoTimestamp("work commitment acceptedAt", candidate.acceptedAt);
  assertIsoTimestamp("work commitment startAt", candidate.startAt);
  assertIsoTimestamp("work commitment endAt", candidate.endAt);
  if (Date.parse(candidate.startAt) < Date.parse(candidate.acceptedAt)) {
    throw new TypeError("work commitment cannot begin before acceptance");
  }
  if (Date.parse(candidate.endAt) <= Date.parse(candidate.startAt)) {
    throw new TypeError("work commitment must end after it starts");
  }
  if (candidate.mediatedContext !== MEDIATED_CONTEXT) {
    throw new TypeError("work commitment mediated context is invalid");
  }
  assertNonEmpty("work commitment purpose", candidate.purpose);
  assertPlainObject("work commitment compensation", candidate.compensation);
  assertExactKeys("work commitment compensation", candidate.compensation, ["fibreCredits"]);
  if (!Number.isSafeInteger(candidate.compensation.fibreCredits) || candidate.compensation.fibreCredits < 1) {
    throw new TypeError("work commitment compensation must be positive Fibre Credits");
  }
  const expectedId = commitmentId(candidate);
  if (candidate.commitmentId !== expectedId) {
    throw new TypeError("work commitment ID does not match its accepted offer");
  }
  return Object.freeze({
    ...structuredClone(candidate),
    cognition:normalizeCognition(candidate.cognition),
  });
}

function rowToCommitment(row) {
  let record;
  try {
    record = JSON.parse(row.record_json);
  } catch (error) {
    throw new IntegrityError(`work commitment ${row.commitment_id} is not valid JSON: ${error.message}`);
  }
  const normalized = normalizeCommitment(record);
  if (
    normalized.commitmentId !== row.commitment_id
    || normalized.offerId !== row.offer_id
    || normalized.threadId !== row.thread_id
    || normalized.acceptedAt !== row.accepted_at
    || normalized.startAt !== row.start_at
    || normalized.endAt !== row.end_at
  ) {
    throw new IntegrityError(`work commitment ${row.commitment_id} column witness mismatch`);
  }
  if (digest(normalized) !== row.record_digest) {
    throw new IntegrityError(`work commitment ${row.commitment_id} digest failed`);
  }
  return normalized;
}

export class InsideFibreWorkStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { storeName:"InsideFibreWorkStore" });
    try {
      migrateDatabase(this.#database);
      this.#database.exec(`
        CREATE TABLE IF NOT EXISTS inside_fibre_work_commitments (
          commitment_id TEXT PRIMARY KEY,
          offer_id TEXT NOT NULL,
          thread_id TEXT NOT NULL,
          accepted_at TEXT NOT NULL,
          start_at TEXT NOT NULL,
          end_at TEXT NOT NULL,
          record_json TEXT NOT NULL CHECK (json_valid(record_json)),
          record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
          UNIQUE(thread_id, offer_id),
          FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
        ) STRICT;

        CREATE INDEX IF NOT EXISTS idx_inside_fibre_work_thread_window
          ON inside_fibre_work_commitments(thread_id,start_at,end_at,commitment_id);

        CREATE TRIGGER IF NOT EXISTS inside_fibre_work_commitments_no_update
          BEFORE UPDATE ON inside_fibre_work_commitments BEGIN
            SELECT RAISE(ABORT, 'inside_fibre_work_commitments is append-only');
          END;
        CREATE TRIGGER IF NOT EXISTS inside_fibre_work_commitments_no_delete
          BEFORE DELETE ON inside_fibre_work_commitments BEGIN
            SELECT RAISE(ABORT, 'inside_fibre_work_commitments is append-only');
          END;
      `);
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() {
    this.#database.close();
  }

  getCommitment(commitmentIdValue, { required = true } = {}) {
    assertId("work commitment ID", commitmentIdValue);
    const row = this.#database.prepare(`
      SELECT commitment_id,offer_id,thread_id,accepted_at,start_at,end_at,record_json,record_digest
      FROM inside_fibre_work_commitments WHERE commitment_id=?
    `).get(commitmentIdValue);
    if (row === undefined) {
      if (!required) return null;
      throw new IntegrityError(`work commitment ${commitmentIdValue} was not found`);
    }
    return rowToCommitment(row);
  }

  getForOffer(threadId, offerId, { required = false } = {}) {
    assertId("work commitment Thread", threadId);
    assertId("work offer ID", offerId);
    const row = this.#database.prepare(`
      SELECT commitment_id FROM inside_fibre_work_commitments
      WHERE thread_id=? AND offer_id=?
    `).get(threadId, offerId);
    if (row === undefined) {
      if (!required) return null;
      throw new IntegrityError(`accepted work offer ${offerId} was not found for ${threadId}`);
    }
    return this.getCommitment(row.commitment_id);
  }

  listCommitments(threadId) {
    assertId("work commitment Thread", threadId);
    return this.#database.prepare(`
      SELECT commitment_id,offer_id,thread_id,accepted_at,start_at,end_at,record_json,record_digest
      FROM inside_fibre_work_commitments
      WHERE thread_id=? ORDER BY accepted_at,commitment_id
    `).all(threadId).map(rowToCommitment);
  }

  recordAcceptedCommitment(candidate) {
    const prepared = structuredClone(candidate);
    if (prepared.commitmentId === undefined) {
      prepared.commitmentId = commitmentId(prepared);
    }
    const record = normalizeCommitment(prepared);
    const existing = this.getForOffer(record.threadId, record.offerId);
    if (existing !== null) {
      if (canonicalJson(existing) !== canonicalJson(record)) {
        throw new IntegrityError(`work offer ${record.offerId} already has a different accepted commitment`);
      }
      return { commitment:existing, created:false };
    }

    const thread = this.#database.prepare(
      "SELECT 1 AS present FROM threads WHERE thread_id=?",
    ).get(record.threadId);
    if (thread === undefined) throw new TypeError(`Thread ${record.threadId} was not found`);

    try {
      this.#database.prepare(`
        INSERT INTO inside_fibre_work_commitments(
          commitment_id,offer_id,thread_id,accepted_at,start_at,end_at,record_json,record_digest
        ) VALUES (?,?,?,?,?,?,?,?)
      `).run(
        record.commitmentId,
        record.offerId,
        record.threadId,
        record.acceptedAt,
        record.startAt,
        record.endAt,
        canonicalJson(record),
        digest(record),
      );
      return { commitment:this.getCommitment(record.commitmentId), created:true };
    } catch (error) {
      throw translateStorageError(error);
    }
  }
}

export function openInsideFibreWorkStore(storage) {
  return new InsideFibreWorkStore(storage);
}
