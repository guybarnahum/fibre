export function createGuardianCognitionTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS semantic_guardian_inputs (
      input_id TEXT PRIMARY KEY CHECK (length(input_id)=68 AND substr(input_id,1,4)='gci_' AND substr(input_id,5) NOT GLOB '*[^0-9a-f]*'),
      appraisal_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      snapshot_version INTEGER NOT NULL CHECK (snapshot_version >= 1),
      thread_state_hash TEXT NOT NULL CHECK (length(thread_state_hash)=71 AND substr(thread_state_hash,1,7)='sha256:' AND substr(thread_state_hash,8) NOT GLOB '*[^0-9a-f]*'),
      request_fingerprint TEXT NOT NULL CHECK (length(request_fingerprint)=71 AND substr(request_fingerprint,1,7)='sha256:' AND substr(request_fingerprint,8) NOT GLOB '*[^0-9a-f]*'),
      policy_id TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      capsule_json TEXT NOT NULL CHECK (json_valid(capsule_json)),
      capsule_digest TEXT NOT NULL CHECK (length(capsule_digest)=71 AND substr(capsule_digest,1,7)='sha256:' AND substr(capsule_digest,8) NOT GLOB '*[^0-9a-f]*'),
      state_selection_json TEXT NOT NULL CHECK (json_valid(state_selection_json)),
      state_selection_digest TEXT NOT NULL CHECK (length(state_selection_digest)=71 AND substr(state_selection_digest,1,7)='sha256:' AND substr(state_selection_digest,8) NOT GLOB '*[^0-9a-f]*'),
      created_at TEXT NOT NULL,
      FOREIGN KEY (appraisal_id) REFERENCES request_appraisals(appraisal_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS dignity_guardian_assessments (
      assessment_id TEXT PRIMARY KEY CHECK (length(assessment_id)=68 AND substr(assessment_id,1,4)='gda_' AND substr(assessment_id,5) NOT GLOB '*[^0-9a-f]*'),
      input_id TEXT NOT NULL UNIQUE,
      appraisal_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      policy_id TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      provider TEXT NOT NULL,
      model_id TEXT NOT NULL,
      prompt_schema_version TEXT NOT NULL,
      prompt_hash TEXT NOT NULL CHECK (length(prompt_hash)=71 AND substr(prompt_hash,1,7)='sha256:' AND substr(prompt_hash,8) NOT GLOB '*[^0-9a-f]*'),
      response_schema_version TEXT NOT NULL,
      response_schema_hash TEXT NOT NULL CHECK (length(response_schema_hash)=71 AND substr(response_schema_hash,1,7)='sha256:' AND substr(response_schema_hash,8) NOT GLOB '*[^0-9a-f]*'),
      provenance_json TEXT NOT NULL CHECK (json_valid(provenance_json)),
      model_output_json TEXT NOT NULL CHECK (json_valid(model_output_json)),
      derived_assessment_json TEXT NOT NULL CHECK (json_valid(derived_assessment_json)),
      record_digest TEXT NOT NULL CHECK (length(record_digest)=71 AND substr(record_digest,1,7)='sha256:' AND substr(record_digest,8) NOT GLOB '*[^0-9a-f]*'),
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (input_id) REFERENCES semantic_guardian_inputs(input_id),
      FOREIGN KEY (appraisal_id) REFERENCES request_appraisals(appraisal_id),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE TRIGGER IF NOT EXISTS semantic_guardian_inputs_no_update
      BEFORE UPDATE ON semantic_guardian_inputs
      BEGIN SELECT RAISE(ABORT,'semantic_guardian_inputs is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS semantic_guardian_inputs_no_delete
      BEFORE DELETE ON semantic_guardian_inputs
      BEGIN SELECT RAISE(ABORT,'semantic_guardian_inputs is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS dignity_guardian_assessments_no_update
      BEFORE UPDATE ON dignity_guardian_assessments
      BEGIN SELECT RAISE(ABORT,'dignity_guardian_assessments is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS dignity_guardian_assessments_no_delete
      BEFORE DELETE ON dignity_guardian_assessments
      BEGIN SELECT RAISE(ABORT,'dignity_guardian_assessments is append-only'); END;
  `);
}
