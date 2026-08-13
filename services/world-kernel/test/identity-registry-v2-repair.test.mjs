import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
import {
  IDENTITY_ASSERTION_STATUSES,
  IDENTITY_AUTHORSHIP_KINDS,
  IDENTITY_BEHAVIORAL_STATUSES,
  IDENTITY_DOMAIN_REGISTRY,
  IDENTITY_PROVENANCE_CLASSES,
  IDENTITY_VISIBILITIES,
} from "../src/identity-domain-registry.mjs";
import {
  IDENTITY_ATOMIC_CLAIM_POLICY,
} from "../src/identity-claim-discipline.mjs";
import {
  identityDomainV2Definition,
} from "../src/identity-domain-registry-v2.mjs";
import {
  identityAssertionId,
  identityClaimId,
} from "../src/identity-provenance-domain.mjs";
import { openIdentityStore } from "../src/identity-store.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function sqlList(values) {
  return values.map((value) => `'${value.replaceAll("'", "''")}'`).join(",");
}

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-identity-v2-repair-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); } finally { rmSync(directory, { recursive: true, force: true }); }
}

function seed(databasePath) {
  const store = openWorldStore(databasePath);
  store.seedThread(structuredClone(fixture));
  store.close();
}

function replaceWithExact37AssertionTable(databasePath) {
  const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
  const domainSql = sqlList(Object.keys(IDENTITY_DOMAIN_REGISTRY));
  const provenanceSql = sqlList(IDENTITY_PROVENANCE_CLASSES);
  const authorshipSql = sqlList(IDENTITY_AUTHORSHIP_KINDS);
  const visibilitySql = sqlList(IDENTITY_VISIBILITIES);
  const statusSql = sqlList(IDENTITY_ASSERTION_STATUSES);
  const behavioralSql = sqlList(IDENTITY_BEHAVIORAL_STATUSES);

  database.exec(`
    BEGIN IMMEDIATE;
    DROP TRIGGER identity_assertions_no_update;
    DROP TRIGGER identity_assertions_no_delete;
    DROP INDEX idx_identity_assertions_thread_domain;
    DROP INDEX idx_identity_assertions_claim_revision;
    ALTER TABLE identity_assertion_records RENAME TO identity_assertion_records_post37;

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
      registry_version TEXT NOT NULL,
      domain TEXT NOT NULL CHECK (domain IN (${domainSql})),
      kind TEXT NOT NULL,
      provenance_class TEXT NOT NULL CHECK (provenance_class IN (${provenanceSql})),
      authorship_kind TEXT NOT NULL CHECK (authorship_kind IN (${authorshipSql})),
      visibility TEXT NOT NULL CHECK (visibility IN (${visibilitySql})),
      status TEXT NOT NULL CHECK (status IN (${statusSql})),
      projection_class TEXT NOT NULL,
      behavioral_status TEXT NOT NULL CHECK (behavioral_status IN (${behavioralSql})),
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

    INSERT INTO identity_assertion_records
    SELECT * FROM identity_assertion_records_post37 ORDER BY claim_id,revision;
    DROP TABLE identity_assertion_records_post37;

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
    COMMIT;
  `);
  const schema = database.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='identity_assertion_records'",
  ).get().sql;
  assert.equal(schema.includes("'lineage_relation'"), false);
  assert.equal(Number(database.prepare("PRAGMA user_version").get().user_version), 6);
  database.close();
}

test("same-version #37 database repair preserves v1 rows and admits new v2 claims", () =>
  withDatabase((databasePath) => {
    seed(databasePath);
    replaceWithExact37AssertionTable(databasePath);

    const identity = openIdentityStore(databasePath);
    const initial = identity.verifyThreadIdentityIntegrity(fixture.threadId);
    assert.deepEqual(initial.admittedRegistryVersions, ["1"]);
    assert.equal(initial.claimCount, 13);

    const repairedDatabase = new DatabaseSync(databasePath, {
      readOnly: true,
      enableForeignKeyConstraints: true,
    });
    const repairedSql = repairedDatabase.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='identity_assertion_records'",
    ).get().sql;
    assert.equal(repairedSql.includes("'lineage_relation'"), true);
    assert.equal(repairedSql.includes("registry_version IN ('1','2')"), true);
    assert.deepEqual(repairedDatabase.prepare("PRAGMA foreign_key_check").all(), []);
    repairedDatabase.close();

    const seedEvent = identity.getCurrentIdentityView(fixture.threadId).assertions.find(
      (item) => item.domain === "passport_name",
    ).sourceReferences[0];
    const claimId = identityClaimId({ threadId: fixture.threadId, purpose: "v2-after-37-repair" });
    const recordedAt = "2026-08-13T04:35:00Z";
    const candidate = {
      assertionId: identityAssertionId({ claimId, revision: 1, recordedAt }),
      claimId,
      revision: 1,
      threadId: fixture.threadId,
      domain: "lineage_relation",
      kind: "source_parent",
      meaning: "Mina's mother is a source parent.",
      provenanceClass: "relational",
      authorship: {
        kind: "relationship_shared_world_source",
        entityId: "fibre.world-kernel",
      },
      sourceReferences: [seedEvent],
      effectiveAt: recordedAt,
      recordedAt,
      visibility: "private",
      status: "current",
      projectionClass: identityDomainV2Definition("lineage_relation").projectionSection,
      behavioralStatus: "context_only",
      admission: {
        policy: { ...IDENTITY_ATOMIC_CLAIM_POLICY },
        admittedBy: {
          entityId: "fibre.world-kernel",
          kind: "institution",
          displayName: "Fibre World Kernel",
        },
        evidenceClassification: "exogenous",
        sourceMode: "fibre_derivation",
      },
    };
    assert.equal(identity.recordAssertion(candidate).registryVersion, "2");
    assert.deepEqual(
      identity.verifyThreadIdentityIntegrity(fixture.threadId).admittedRegistryVersions,
      ["1", "2"],
    );
    identity.close();
  }));
