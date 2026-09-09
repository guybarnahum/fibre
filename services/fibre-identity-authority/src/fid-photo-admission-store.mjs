import {
  requireInfraCapabilities,
  requireTransactionalStateGuarantees,
} from "#infra";

import {
  assertFidPhotoAdmissionReceipt,
  fidPhotoAdmissionDigest,
} from "./fid-photo-admission.mjs";

const REQUIREMENTS = Object.freeze({
  relationalStatements: true,
  atomicWriteTransactions: true,
  serializedWriteTransactions: true,
  durableCommitBeforeAcknowledgement: true,
  transactionalReads: true,
  schemaMigrations: true,
  consistencyScope: "single_named_scope",
});

function openState(storage) {
  const infra = requireInfraCapabilities(storage?.infraDriver, "state");
  requireTransactionalStateGuarantees(infra.state, storage?.stateScopeId, REQUIREMENTS);
  return infra.state.open(storage.stateScopeId);
}

function schema(database) {
  if (database.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='fid_card_issuance_workflows'").get() === undefined) {
    throw new Error("FID photo admission requires FidCardIssuanceStore state");
  }
  database.exec(`
    CREATE TABLE IF NOT EXISTS fid_photo_admissions (
      admission_id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      decision TEXT NOT NULL CHECK (decision IN ('accepted','rejected')),
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (workflow_id) REFERENCES fid_card_issuance_workflows(workflow_id)
    ) STRICT;
    CREATE UNIQUE INDEX IF NOT EXISTS fid_photo_one_accepted_per_workflow
      ON fid_photo_admissions(workflow_id) WHERE decision='accepted';
    CREATE TRIGGER IF NOT EXISTS fid_photo_admissions_no_update BEFORE UPDATE ON fid_photo_admissions
      BEGIN SELECT RAISE(ABORT, 'fid_photo_admissions is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS fid_photo_admissions_no_delete BEFORE DELETE ON fid_photo_admissions
      BEGIN SELECT RAISE(ABORT, 'fid_photo_admissions is immutable'); END;
  `);
}

function parse(row) {
  let receipt;
  try { receipt = assertFidPhotoAdmissionReceipt(JSON.parse(row.record_json)); }
  catch (error) { throw new Error(`FID photo admission ${row.admission_id} is invalid: ${error.message}`); }
  if (receipt.admissionId !== row.admission_id
    || receipt.workflowId !== row.workflow_id
    || receipt.decision !== row.decision
    || fidPhotoAdmissionDigest(receipt) !== row.record_digest) {
    throw new Error(`FID photo admission ${row.admission_id} failed integrity verification`);
  }
  return Object.freeze({ receipt, recordDigest: row.record_digest });
}

export class FidPhotoAdmissionStore {
  #database;

  constructor(storage) {
    this.#database = openState(storage);
    try { schema(this.#database); }
    catch (error) { this.#database.close(); throw error; }
  }

  close() { this.#database.close(); }

  record(candidate) {
    const receipt = assertFidPhotoAdmissionReceipt(candidate);
    const recordJson = JSON.stringify(receipt);
    const recordDigest = fidPhotoAdmissionDigest(receipt);
    return this.#database.transaction(() => {
      const workflow = this.#database.prepare(
        "SELECT thread_id FROM fid_card_issuance_workflows WHERE workflow_id=?",
      ).get(receipt.workflowId);
      if (workflow === undefined) throw new Error(`FID issuance workflow ${receipt.workflowId} was not found`);
      if (workflow.thread_id !== receipt.threadId) throw new TypeError("FID photo admission Thread does not match issuance workflow");

      const existing = this.getByAdmissionId(receipt.admissionId, { required: false });
      if (existing !== null) return Object.freeze({ ...existing, created: false });

      this.#database.prepare(`
        INSERT INTO fid_photo_admissions(admission_id, workflow_id, decision, record_json, record_digest)
        VALUES (?,?,?,?,?)
      `).run(receipt.admissionId, receipt.workflowId, receipt.decision, recordJson, recordDigest);
      return Object.freeze({ receipt, recordDigest, created: true });
    });
  }

  getByAdmissionId(admissionId, { required = true } = {}) {
    const row = this.#database.prepare("SELECT * FROM fid_photo_admissions WHERE admission_id=?").get(admissionId);
    if (row === undefined) {
      if (!required) return null;
      throw new Error(`FID photo admission ${admissionId} was not found`);
    }
    return parse(row);
  }

  getAcceptedByWorkflowId(workflowId, { required = false } = {}) {
    const row = this.#database.prepare(
      "SELECT * FROM fid_photo_admissions WHERE workflow_id=? AND decision='accepted'",
    ).get(workflowId);
    if (row === undefined) {
      if (!required) return null;
      throw new Error(`FID issuance workflow ${workflowId} has no accepted photo admission`);
    }
    return parse(row);
  }
}
