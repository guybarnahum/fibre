import {
  IDENTITY_ASSERTION_STATUSES,
  IDENTITY_AUTHORSHIP_KINDS,
  IDENTITY_BEHAVIORAL_STATUSES,
  IDENTITY_DOMAIN_REGISTRY,
  IDENTITY_DOMAIN_REGISTRY_VERSION,
  IDENTITY_PROVENANCE_CLASSES,
  IDENTITY_VISIBILITIES,
} from "./identity-domain-registry.mjs";
import {
  IDENTITY_DOMAIN_REGISTRY_V2,
  IDENTITY_DOMAIN_REGISTRY_V2_VERSION,
} from "./identity-domain-registry-v2.mjs";

function sqlList(values) {
  return values.map((value) => `'${value.replaceAll("'", "''")}'`).join(",");
}

const DOMAIN_SQL = sqlList([...new Set([
  ...Object.keys(IDENTITY_DOMAIN_REGISTRY),
  ...Object.keys(IDENTITY_DOMAIN_REGISTRY_V2),
])]);
const REGISTRY_SQL = sqlList([
  IDENTITY_DOMAIN_REGISTRY_VERSION,
  IDENTITY_DOMAIN_REGISTRY_V2_VERSION,
]);
const PROVENANCE_SQL = sqlList(IDENTITY_PROVENANCE_CLASSES);
const AUTHORSHIP_SQL = sqlList(IDENTITY_AUTHORSHIP_KINDS);
const VISIBILITY_SQL = sqlList(IDENTITY_VISIBILITIES);
const STATUS_SQL = sqlList(IDENTITY_ASSERTION_STATUSES);
const BEHAVIORAL_SQL = sqlList(IDENTITY_BEHAVIORAL_STATUSES);

function needsRegistryV2Repair(database) {
  const row = database.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='identity_assertion_records'",
  ).get();
  if (row === undefined) return false;
  return !row.sql.includes("'lineage_relation'") ||
    !row.sql.includes("registry_version IN ('1','2')");
}

function createRegistryV2AssertionTable(database) {
  database.exec(`
    CREATE TABLE identity_assertion_records (
      assertion_id TEXT PRIMARY KEY CHECK (
        length(assertion_id)=68 AND substr(assertion_id,1,4)='ias_' AND
        substr(assertion_id,5) NOT GLOB '*[^0-9a-f]*'
      ),
      claim_id TEXT NOT NULL CHECK (
        length(claim_id)=68 AND substr(claim_id,1,4)='icl_' AND
        substr(claim_id,5) NOT GLOB '*[^0-9a-f]*'
      ),
      revision INTEGER NOT NULL CHECK (revision >= 1),
      thread_id TEXT NOT NULL,
      registry_version TEXT NOT NULL CHECK (registry_version IN (${REGISTRY_SQL})),
      domain TEXT NOT NULL CHECK (domain IN (${DOMAIN_SQL})),
      kind TEXT NOT NULL,
      provenance_class TEXT NOT NULL CHECK (provenance_class IN (${PROVENANCE_SQL})),
      authorship_kind TEXT NOT NULL CHECK (authorship_kind IN (${AUTHORSHIP_SQL})),
      visibility TEXT NOT NULL CHECK (visibility IN (${VISIBILITY_SQL})),
      status TEXT NOT NULL CHECK (status IN (${STATUS_SQL})),
      projection_class TEXT NOT NULL,
      behavioral_status TEXT NOT NULL CHECK (behavioral_status IN (${BEHAVIORAL_SQL})),
      effective_at TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      supersedes_assertion_id TEXT,
      assertion_json TEXT NOT NULL CHECK (json_valid(assertion_json)),
      assertion_digest TEXT NOT NULL CHECK (
        length(assertion_digest)=71 AND substr(assertion_digest,1,7)='sha256:' AND
        substr(assertion_digest,8) NOT GLOB '*[^0-9a-f]*'
      ),
      UNIQUE (claim_id, revision),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (supersedes_assertion_id) REFERENCES identity_assertion_records(assertion_id),
      CHECK (
        (revision=1 AND supersedes_assertion_id IS NULL) OR
        (revision>1 AND supersedes_assertion_id IS NOT NULL)
      )
    ) STRICT;

    CREATE INDEX idx_identity_assertions_thread_domain
      ON identity_assertion_records(thread_id,domain,recorded_at,assertion_id);
    CREATE INDEX idx_identity_assertions_claim_revision
      ON identity_assertion_records(claim_id,revision);

    CREATE TRIGGER identity_assertions_no_update
      BEFORE UPDATE ON identity_assertion_records
      BEGIN SELECT RAISE(ABORT,'identity_assertion_records is append-only'); END;
    CREATE TRIGGER identity_assertions_no_delete
      BEFORE DELETE ON identity_assertion_records
      BEGIN SELECT RAISE(ABORT,'identity_assertion_records is append-only'); END;
  `);
}

export function repairIdentityAssertionRegistryV2Schema(database) {
  if (!needsRegistryV2Repair(database)) return { repaired: false };

  const columns = database.prepare(
    "PRAGMA table_info(identity_assertion_records)",
  ).all();
  const hasRegistryVersion = columns.some((column) => column.name === "registry_version");

  database.exec(`
    DROP TRIGGER IF EXISTS identity_assertions_no_update;
    DROP TRIGGER IF EXISTS identity_assertions_no_delete;
    DROP INDEX IF EXISTS idx_identity_assertions_thread_domain;
    DROP INDEX IF EXISTS idx_identity_assertions_claim_revision;
    ALTER TABLE identity_assertion_records RENAME TO identity_assertion_records_pre_v2;
  `);

  createRegistryV2AssertionTable(database);

  const registryExpression = hasRegistryVersion
    ? "registry_version"
    : `'${IDENTITY_DOMAIN_REGISTRY_VERSION}'`;
  database.exec(`
    INSERT INTO identity_assertion_records(
      assertion_id,claim_id,revision,thread_id,registry_version,domain,kind,provenance_class,
      authorship_kind,visibility,status,projection_class,behavioral_status,
      effective_at,recorded_at,supersedes_assertion_id,assertion_json,assertion_digest
    )
    SELECT
      assertion_id,claim_id,revision,thread_id,${registryExpression},domain,kind,provenance_class,
      authorship_kind,visibility,status,projection_class,behavioral_status,
      effective_at,recorded_at,supersedes_assertion_id,assertion_json,assertion_digest
    FROM identity_assertion_records_pre_v2
    ORDER BY claim_id,revision;

    DROP TABLE identity_assertion_records_pre_v2;
  `);

  return { repaired: true };
}
