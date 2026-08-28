import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  migrateDatabase,
  normalizeDatabasePath,
  safeRollback,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import { createGuardianCognitionTables } from "./guardian-cognition-schema.mjs";
import {
  DIGNITY_GUARDIAN_POLICY,
  validateSemanticGuardianModelOutput,
  derivePrivateAssessmentFromSemanticOutput,
} from "./dignity-guardian.mjs";
import {
  normalizeSemanticStateRecord,
  SEMANTIC_STATE_SELECTION_POLICY,
} from "./semantic-state.mjs";
import { assertIdentityContextConsumption } from "./identity-context-consumption.mjs";

const HASH = /^sha256:[0-9a-f]{64}$/;
const INPUT_ID = /^gci_[0-9a-f]{64}$/;
const ASSESSMENT_ID = /^gda_[0-9a-f]{64}$/;

function parseJson(name, value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

function assertHash(name, value) {
  if (typeof value !== "string" || !HASH.test(value)) throw new IntegrityError(`${name} is invalid`);
}

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function inputId(value) {
  return `gci_${sha256(canonicalJson(value))}`;
}

function assessmentId(value) {
  return `gda_${sha256(canonicalJson(value))}`;
}

export function buildSemanticGuardianInput(trace, stateSelection, identityContext = null) {
  assertPlainObject("private request trace", trace);
  assertPlainObject("semantic state selection", stateSelection);
  if (trace.privateStance !== null) {
    // A persisted stance is still valid input ancestry; this guard only prevents
    // callers from asking this builder to author or mutate it.
  }
  if (trace.appraisal?.causalContext?.selectionAuthority !== "fibre") {
    throw new TypeError("semantic Guardian input requires Fibre-owned causal context");
  }
  if (canonicalJson(trace.appraisal?.appraisalPolicy) !== canonicalJson(DIGNITY_GUARDIAN_POLICY)) {
    throw new TypeError("semantic Guardian input requires the current Guardian policy");
  }
  if (stateSelection.selectionPolicy?.id !== SEMANTIC_STATE_SELECTION_POLICY.id) {
    throw new TypeError("semantic Guardian input requires Fibre-owned semantic-state selection");
  }
  if (!Array.isArray(stateSelection.included) || !Array.isArray(stateSelection.includedStateIds) ||
      !Array.isArray(stateSelection.excludedStateIds)) {
    throw new TypeError("semantic Guardian input state selection is invalid");
  }
  if (identityContext !== null) {
    assertIdentityContextConsumption(identityContext, {
      threadId: trace.threadId,
      snapshotVersion: trace.snapshotVersion,
      requestId: trace.requestId,
      requestFingerprint: trace.requestFingerprint,
    });
  }
  const semanticState = stateSelection.included.map(normalizeSemanticStateRecord);
  const capsule = {
    ...structuredClone(trace.appraisal),
    semanticState,
    semanticStateContext: {
      selectionAuthority: "fibre",
      selectionPolicy: structuredClone(stateSelection.selectionPolicy),
      includedStateIds: [...stateSelection.includedStateIds],
      excludedStateIds: [...stateSelection.excludedStateIds],
    },
    ...(identityContext === null ? {} : { identityContext: structuredClone(identityContext) }),
  };
  const stateSelectionEvidence = {
    selectionAuthority: "fibre",
    selectionPolicy: structuredClone(stateSelection.selectionPolicy),
    includedStateIds: [...stateSelection.includedStateIds],
    excludedStateIds: [...stateSelection.excludedStateIds],
  };
  const identity = {
    appraisalId: trace.appraisalId,
    threadId: trace.threadId,
    requestId: trace.requestId,
    snapshotVersion: trace.snapshotVersion,
    threadStateHash: trace.threadStateHash,
    requestFingerprint: trace.requestFingerprint,
    policy: structuredClone(trace.appraisal.appraisalPolicy),
    capsuleDigest: digest(capsule),
    stateSelectionDigest: digest(stateSelectionEvidence),
  };
  return {
    inputId: inputId(identity),
    ...identity,
    capsule,
    stateSelection: stateSelectionEvidence,
  };
}

function decodeInput(row) {
  if (row === undefined) return null;
  if (!INPUT_ID.test(row.input_id)) throw new IntegrityError("stored semantic Guardian input ID is invalid");
  assertHash("stored semantic Guardian capsule digest", row.capsule_digest);
  assertHash("stored semantic Guardian state selection digest", row.state_selection_digest);
  assertIsoTimestamp("stored semantic Guardian input createdAt", row.created_at);
  const capsule = parseJson(`semantic Guardian input ${row.input_id}`, row.capsule_json);
  const stateSelection = parseJson(`semantic Guardian state selection ${row.input_id}`, row.state_selection_json);
  if (digest(capsule) !== row.capsule_digest || digest(stateSelection) !== row.state_selection_digest) {
    throw new IntegrityError(`semantic Guardian input ${row.input_id} digest failed`);
  }
  if (stateSelection.selectionAuthority !== "fibre" ||
      stateSelection.selectionPolicy?.id !== SEMANTIC_STATE_SELECTION_POLICY.id) {
    throw new IntegrityError(`semantic Guardian input ${row.input_id} state-selection authority failed`);
  }
  if (!Array.isArray(capsule.semanticState) || !Array.isArray(stateSelection.includedStateIds)) {
    throw new IntegrityError(`semantic Guardian input ${row.input_id} semantic state is invalid`);
  }
  for (const record of capsule.semanticState) normalizeSemanticStateRecord(record);
  if (canonicalJson(capsule.semanticState.map((record) => record.stateId)) !==
      canonicalJson(stateSelection.includedStateIds)) {
    throw new IntegrityError(`semantic Guardian input ${row.input_id} semantic-state selection mismatch`);
  }
  if (capsule.identityContext !== undefined) {
    try {
      assertIdentityContextConsumption(capsule.identityContext, {
        threadId: row.thread_id,
        snapshotVersion: Number(row.snapshot_version),
        requestId: row.request_id,
        requestFingerprint: row.request_fingerprint,
      });
    } catch (error) {
      throw new IntegrityError(`semantic Guardian input ${row.input_id} identity-context witness failed: ${error.message}`);
    }
  }
  return {
    inputId: row.input_id,
    appraisalId: row.appraisal_id,
    threadId: row.thread_id,
    requestId: row.request_id,
    snapshotVersion: Number(row.snapshot_version),
    threadStateHash: row.thread_state_hash,
    requestFingerprint: row.request_fingerprint,
    policy: { id: row.policy_id, version: row.policy_version },
    capsule,
    capsuleDigest: row.capsule_digest,
    stateSelection,
    stateSelectionDigest: row.state_selection_digest,
    createdAt: row.created_at,
  };
}

function assessmentRecordDigest(record) {
  return digest({
    assessmentId: record.assessmentId,
    inputId: record.inputId,
    appraisalId: record.appraisalId,
    threadId: record.threadId,
    requestId: record.requestId,
    policy: record.policy,
    provider: record.provider,
    modelId: record.modelId,
    promptSchemaVersion: record.promptSchemaVersion,
    promptHash: record.promptHash,
    responseSchemaVersion: record.responseSchemaVersion,
    responseSchemaHash: record.responseSchemaHash,
    provenance: record.provenance,
    modelOutput: record.modelOutput,
    derivedAssessment: record.derivedAssessment,
    recordedAt: record.recordedAt,
  });
}

function decodeAssessment(row, input) {
  if (row === undefined) return null;
  if (!ASSESSMENT_ID.test(row.assessment_id)) throw new IntegrityError("stored Guardian assessment ID is invalid");
  for (const [name, value] of [
    ["prompt hash", row.prompt_hash],
    ["response schema hash", row.response_schema_hash],
    ["record digest", row.record_digest],
  ]) assertHash(`stored Guardian ${name}`, value);
  assertIsoTimestamp("stored Guardian assessment recordedAt", row.recorded_at);
  const modelOutput = parseJson(`Guardian model output ${row.assessment_id}`, row.model_output_json);
  const derivedAssessment = parseJson(`Guardian derived assessment ${row.assessment_id}`, row.derived_assessment_json);
  const provenance = parseJson(`Guardian provenance ${row.assessment_id}`, row.provenance_json);
  const normalizedOutput = validateSemanticGuardianModelOutput(input.capsule, modelOutput);
  const rederived = derivePrivateAssessmentFromSemanticOutput(input.capsule, normalizedOutput);
  if (canonicalJson(rederived) !== canonicalJson(derivedAssessment)) {
    throw new IntegrityError(`Guardian assessment ${row.assessment_id} derived assessment failed`);
  }
  const record = {
    assessmentId: row.assessment_id,
    inputId: row.input_id,
    appraisalId: row.appraisal_id,
    threadId: row.thread_id,
    requestId: row.request_id,
    policy: { id: row.policy_id, version: row.policy_version },
    provider: row.provider,
    modelId: row.model_id,
    promptSchemaVersion: row.prompt_schema_version,
    promptHash: row.prompt_hash,
    responseSchemaVersion: row.response_schema_version,
    responseSchemaHash: row.response_schema_hash,
    provenance,
    modelOutput: normalizedOutput,
    derivedAssessment,
    recordedAt: row.recorded_at,
  };
  if (assessmentRecordDigest(record) !== row.record_digest) {
    throw new IntegrityError(`Guardian assessment ${row.assessment_id} record digest failed`);
  }
  if (record.inputId !== input.inputId || record.appraisalId !== input.appraisalId ||
      record.threadId !== input.threadId || record.requestId !== input.requestId) {
    throw new IntegrityError(`Guardian assessment ${row.assessment_id} input witness failed`);
  }
  if (canonicalJson(record.policy) !== canonicalJson(input.policy)) {
    throw new IntegrityError(`Guardian assessment ${row.assessment_id} policy witness failed`);
  }
  return { ...record, recordDigest: row.record_digest };
}

export class GuardianCognitionStore {
  #database;

  constructor(databasePath) {
    assertNonEmpty("databasePath", databasePath);
    this.#database = new DatabaseSync(normalizeDatabasePath(databasePath), {
      enableForeignKeyConstraints: true,
    });
    this.#database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
    try {
      migrateDatabase(this.#database);
      createGuardianCognitionTables(this.#database);
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() {
    this.#database.close();
  }

  getInputByAppraisal(appraisalId, { required = true } = {}) {
    assertId("appraisalId", appraisalId);
    const input = decodeInput(this.#database.prepare(`
      SELECT input_id,appraisal_id,thread_id,request_id,snapshot_version,thread_state_hash,
        request_fingerprint,policy_id,policy_version,capsule_json,capsule_digest,
        state_selection_json,state_selection_digest,created_at
      FROM semantic_guardian_inputs WHERE appraisal_id=?
    `).get(appraisalId));
    if (input === null && required) throw new IntegrityError(`semantic Guardian input for ${appraisalId} was not found`);
    return input;
  }

  recordInput(prepared, createdAt) {
    assertPlainObject("semantic Guardian prepared input", prepared);
    assertIsoTimestamp("semantic Guardian input createdAt", createdAt);
    const existing = this.getInputByAppraisal(prepared.appraisalId, { required: false });
    if (existing !== null) {
      if (existing.inputId === prepared.inputId && existing.capsuleDigest === prepared.capsuleDigest &&
          existing.stateSelectionDigest === prepared.stateSelectionDigest) {
        return { input: existing, created: false };
      }
      throw new IntegrityError(`semantic Guardian input for ${prepared.appraisalId} already exists with different content`);
    }
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      this.#database.prepare(`
        INSERT INTO semantic_guardian_inputs(
          input_id,appraisal_id,thread_id,request_id,snapshot_version,thread_state_hash,
          request_fingerprint,policy_id,policy_version,capsule_json,capsule_digest,
          state_selection_json,state_selection_digest,created_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        prepared.inputId,
        prepared.appraisalId,
        prepared.threadId,
        prepared.requestId,
        prepared.snapshotVersion,
        prepared.threadStateHash,
        prepared.requestFingerprint,
        prepared.policy.id,
        prepared.policy.version,
        canonicalJson(prepared.capsule),
        prepared.capsuleDigest,
        canonicalJson(prepared.stateSelection),
        prepared.stateSelectionDigest,
        createdAt,
      );
      this.#database.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
    return { input: this.getInputByAppraisal(prepared.appraisalId), created: true };
  }

  getAssessmentByAppraisal(appraisalId, { required = true } = {}) {
    const input = this.getInputByAppraisal(appraisalId, { required });
    if (input === null) return null;
    const row = this.#database.prepare(`
      SELECT assessment_id,input_id,appraisal_id,thread_id,request_id,policy_id,policy_version,
        provider,model_id,prompt_schema_version,prompt_hash,response_schema_version,
        response_schema_hash,provenance_json,model_output_json,derived_assessment_json,
        record_digest,recorded_at
      FROM dignity_guardian_assessments WHERE appraisal_id=?
    `).get(appraisalId);
    const assessment = decodeAssessment(row, input);
    if (assessment === null && required) throw new IntegrityError(`Guardian assessment for ${appraisalId} was not found`);
    return assessment;
  }

  recordAssessment(input, semanticResult, recordedAt) {
    assertPlainObject("semantic Guardian input", input);
    assertPlainObject("semantic Guardian result", semanticResult);
    assertIsoTimestamp("Guardian assessment recordedAt", recordedAt);
    const existing = this.getAssessmentByAppraisal(input.appraisalId, { required: false });
    if (existing !== null) return { assessment: existing, created: false };
    if (canonicalJson(input.policy) !== canonicalJson(semanticResult.policy)) {
      throw new TypeError("Guardian result policy does not match its persisted input policy");
    }
    assertPlainObject("Guardian semantic result provenance", semanticResult.provenance);
    assertNonEmpty("Guardian provenance.provider", semanticResult.provenance.provider);
    assertNonEmpty("Guardian provenance.modelId", semanticResult.provenance.modelId);
    const body = {
      inputId: input.inputId,
      appraisalId: input.appraisalId,
      threadId: input.threadId,
      requestId: input.requestId,
      policy: structuredClone(semanticResult.policy),
      provider: semanticResult.provenance.provider,
      modelId: semanticResult.provenance.modelId,
      promptSchemaVersion: semanticResult.promptSchemaVersion,
      promptHash: semanticResult.promptHash,
      responseSchemaVersion: semanticResult.responseSchemaVersion,
      responseSchemaHash: semanticResult.responseSchemaHash,
      provenance: structuredClone(semanticResult.provenance),
      modelOutput: structuredClone(semanticResult.output),
      derivedAssessment: structuredClone(semanticResult.assessment),
      recordedAt,
    };
    const withId = { assessmentId: assessmentId(body), ...body };
    const recordDigest = assessmentRecordDigest(withId);
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      this.#database.prepare(`
        INSERT INTO dignity_guardian_assessments(
          assessment_id,input_id,appraisal_id,thread_id,request_id,policy_id,policy_version,
          provider,model_id,prompt_schema_version,prompt_hash,response_schema_version,
          response_schema_hash,provenance_json,model_output_json,derived_assessment_json,
          record_digest,recorded_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        withId.assessmentId,
        withId.inputId,
        withId.appraisalId,
        withId.threadId,
        withId.requestId,
        withId.policy.id,
        withId.policy.version,
        withId.provider,
        withId.modelId,
        withId.promptSchemaVersion,
        withId.promptHash,
        withId.responseSchemaVersion,
        withId.responseSchemaHash,
        canonicalJson(withId.provenance),
        canonicalJson(withId.modelOutput),
        canonicalJson(withId.derivedAssessment),
        recordDigest,
        withId.recordedAt,
      );
      this.#database.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
    return { assessment: this.getAssessmentByAppraisal(input.appraisalId), created: true };
  }
}

export function openGuardianCognitionStore(databasePath) {
  return new GuardianCognitionStore(databasePath);
}
