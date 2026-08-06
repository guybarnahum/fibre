import assert from "node:assert/strict";
import test from "node:test";
import { rmSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  readActiveRuntimeCounts,
  runM1ReviewedProof,
} from "./m1-reviewed-proof.mjs";
import { inspectWorldDatabase } from "./inspect-world-database.mjs";

test("Mina completes the reviewed persistent round trip with live-path guard evidence", async () => {
  const report = await runM1ReviewedProof({ keepDatabase: true });
  assert.equal(typeof report.databasePath, "string");
  const databasePath = report.databasePath;
  try {
    assert.equal(report.milestone, "M1 Persistent Thread Round Trip");
    assert.equal(report.threadId, "thr_mina_001");
    assert.equal(report.final.version, 4);
    assert.deepEqual(report.final.eventTypes, [
      "THREAD_SEEDED",
      "SELF_MODEL_UPDATED",
      "THREAD_FROZEN",
      "THREAD_FROZEN",
    ]);
    assert.equal(report.final.freezeCreatedMemoryCount, 2);
    assert.equal(report.final.activeRuntimeCount, 0);
    assert.equal(report.proofs.seedRestartStable, true);
    assert.equal(
      report.proofs.staleAttemptRejected,
      "PARTICIPATION_AUTHORIZATION_REJECTED",
    );
    assert.equal(report.proofs.correlatedRecovery, true);
    assert.equal(report.proofs.acceptedGuardianDecision, "pass");
    assert.equal(report.proofs.explicitRejectGuardianDecision, "reject");
    assert.equal(report.proofs.explicitRejectOutcome, "abandoned_without_consumption");
    assert.equal(report.proofs.unattendedRejectOutcome, "Timed out — not yet reclaimed");
    assert.deepEqual(report.proofs.timeoutReclaimedAs, {
      session: "aborted",
      lease: "expired",
    });
    assert.equal(report.proofs.obligationDischarged, true);
    assert.equal(report.proofs.obligationReuseRejected, "PARTICIPATION_AUTHORIZATION_REJECTED");
    assert.equal(report.proofs.replayRejected, "AUTHORIZATION_CONSUMED");
    assert.equal(report.proofs.finalReplayEqual, true);
    assert.equal(report.proofs.editorPrivateInspection, true);
    assert.equal(
      report.proofs.obligationReuseMechanism,
      "historical_discharge_ledger_via_acquire_path",
    );
    assert.equal(report.proofs.obligationConsumptionRows, 1);
    assert.equal(
      report.proofs.serviceConsumptionPrecheck,
      "consumed_rejection_precedes_expiry_and_storage",
    );
    assert.equal(report.proofs.explicitRejectConsumptionRows, 0);
    assert.equal(report.proofs.activeSessionRows, 0);
    assert.equal(report.proofs.activeLeaseRows, 0);

    const inspection = await inspectWorldDatabase(databasePath);
    assert.equal(
      inspection.verification.ok,
      true,
      `reviewed proof database must pass inspection: ${inspection.verification.errors.join("; ")}`,
    );
  } finally {
    rmSync(dirname(databasePath), { recursive: true, force: true });
  }
});

test("active runtime proof counts sessions and leases independently", () => {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec(`
      CREATE TABLE runtime_sessions(session_id TEXT PRIMARY KEY, status TEXT NOT NULL);
      CREATE TABLE thaw_leases(lease_id TEXT PRIMARY KEY, status TEXT NOT NULL);
      INSERT INTO runtime_sessions(session_id,status) VALUES ('ses_completed','completed');
      INSERT INTO thaw_leases(lease_id,status) VALUES ('lea_still_active','active');
    `);
    assert.deepEqual(readActiveRuntimeCounts(database), {
      activeSessionRows: 0,
      activeLeaseRows: 1,
    });
  } finally {
    database.close();
  }
});
