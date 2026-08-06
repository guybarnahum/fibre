import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runM1MinaRoundTrip } from "./m1-mina-round-trip.mjs";
import { openWorldStore } from "../services/world-kernel/src/persistence.mjs";
import { openRuntimeStore } from "../services/world-kernel/src/runtime-store.mjs";
import { openFreezeStore } from "../services/world-kernel/src/freeze-store.mjs";
import { openLifecycleHardeningStore } from "../services/world-kernel/src/lifecycle-hardening-store.mjs";
import { M1LifecycleWorldKernelService } from "../services/world-kernel/src/lifecycle-hardening-service.mjs";
import { AuthorizationConsumedError } from "../services/world-kernel/src/freeze-domain.mjs";
import { ParticipationAuthorizationRejectedError } from "../services/world-kernel/src/runtime-domain.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const OBLIGATION = fixture.currentState.unresolvedIntentions[0];

function scalar(database, sql, ...parameters) {
  const row = database.prepare(sql).get(...parameters);
  return Number(row.value);
}

export function readActiveRuntimeCounts(database) {
  return {
    activeSessionRows: scalar(
      database,
      "SELECT count(*) AS value FROM runtime_sessions WHERE status='active'",
    ),
    activeLeaseRows: scalar(
      database,
      "SELECT count(*) AS value FROM thaw_leases WHERE status='active'",
    ),
  };
}

function acquireRecord() {
  return {
    operationId: "op_mina_historical_discharge_wiring",
    decision: {
      authorizedAction: "accept",
      rationale: "This attempt must be refused by the historical discharge ledger.",
      obligationReferences: [OBLIGATION],
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
    },
    causationId: "cause_mina_historical_discharge_wiring",
    correlationId: "corr_mina_obligation_reuse",
  };
}

function assertHistoricalDischargeGuard(databasePath) {
  const worldStore = openWorldStore(databasePath);
  const runtimeStore = openRuntimeStore(databasePath);
  const freezeStore = openFreezeStore(databasePath);
  const lifecycleStore = openLifecycleHardeningStore(databasePath);
  const service = new M1LifecycleWorldKernelService(
    worldStore,
    runtimeStore,
    freezeStore,
    lifecycleStore,
  );
  try {
    let rejection = null;
    try {
      service.acquireThawRuntime(
        fixture.threadId,
        "req_mina_obligation_reuse",
        acquireRecord(),
      );
    } catch (error) {
      rejection = error;
    }
    assert.ok(
      rejection instanceof ParticipationAuthorizationRejectedError,
      "historically discharged obligation must be rejected by the live acquire path",
    );
    assert.match(
      rejection.message,
      /authorization obligation was already discharged by/,
      "live acquisition must distinguish historical discharge from current absence",
    );
    return "historical_discharge_ledger_via_acquire_path";
  } finally {
    lifecycleStore.close();
    freezeStore.close();
    runtimeStore.close();
    worldStore.close();
  }
}

function expiredClockForSession(databasePath, sessionId) {
  const database = new DatabaseSync(databasePath, {
    enableForeignKeyConstraints: true,
  });
  try {
    const row = database.prepare(`
      SELECT lease.expires_at AS expiresAt
      FROM runtime_sessions session
      JOIN thaw_leases lease ON lease.lease_id=session.lease_id
      WHERE session.session_id=?
    `).get(sessionId);
    assert.ok(row, `runtime session ${sessionId} must have a lease`);
    return new Date(Date.parse(row.expiresAt) + 1);
  } finally {
    database.close();
  }
}

function assertServiceConsumptionPrecheck(databasePath, sessionId) {
  const worldStore = openWorldStore(databasePath);
  const runtimeStore = openRuntimeStore(databasePath);
  const freezeStore = openFreezeStore(databasePath);
  const lifecycleStore = openLifecycleHardeningStore(databasePath);
  let storageReached = false;
  freezeStore.freezeRuntime = () => {
    storageReached = true;
    throw new Error("freeze storage must not be reached after service-level consumption rejection");
  };
  const expiredClock = expiredClockForSession(databasePath, sessionId);
  const service = new M1LifecycleWorldKernelService(
    worldStore,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    {
      clock: () => expiredClock,
      leaseDurationMs: 5000,
    },
  );
  try {
    let rejection = null;
    try {
      service.freezeRuntime(fixture.threadId, sessionId, {
        operationId: "op_mina_service_consumption_precheck",
        lifeChangeDecisions: [{
          proposalIndex: 0,
          decision: "accept",
          rationale: "This replay must be rejected before storage is called.",
        }],
        causationId: "cause_mina_service_consumption_precheck",
        correlationId: "corr_mina_service_consumption_precheck",
      });
    } catch (error) {
      rejection = error;
    }
    assert.ok(
      rejection instanceof AuthorizationConsumedError,
      "the lifecycle freeze service must reject an already consumed authorization",
    );
    assert.equal(
      storageReached,
      false,
      "the service-level consumed-authorization guard must fire before SQLite insertion",
    );
    return "consumed_rejection_precedes_expiry_and_storage";
  } finally {
    lifecycleStore.close();
    freezeStore.close();
    runtimeStore.close();
    worldStore.close();
  }
}

export async function runM1ReviewedProof({ keepDatabase = false } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-m1-reviewed-proof-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    const report = await runM1MinaRoundTrip({ keepDatabase, directory });

    const database = new DatabaseSync(databasePath, {
      enableForeignKeyConstraints: true,
    });
    let activeSessionRows;
    let activeLeaseRows;
    let explicitRejectConsumptionRows;
    let obligationConsumptionRows;
    try {
      ({ activeSessionRows, activeLeaseRows } = readActiveRuntimeCounts(database));
      explicitRejectConsumptionRows = scalar(
        database,
        `SELECT count(*) AS value
         FROM runtime_sessions session
         JOIN authorization_consumptions consumption
           ON consumption.authorization_id=session.authorization_id
         WHERE session.session_id=?`,
        report.sessions.explicitlyAbandoned,
      );
      obligationConsumptionRows = scalar(
        database,
        `SELECT count(*) AS value
         FROM authorization_consumptions consumption,
              json_each(consumption.obligation_refs_json) obligation
         WHERE consumption.thread_id=? AND obligation.value=?`,
        fixture.threadId,
        OBLIGATION,
      );
    } finally {
      database.close();
    }

    assert.equal(activeSessionRows, 0, "no runtime session may remain active");
    assert.equal(activeLeaseRows, 0, "no thaw lease may remain active");
    assert.equal(
      explicitRejectConsumptionRows,
      0,
      "explicit abandonment must have no authorization-consumption row",
    );
    assert.equal(
      obligationConsumptionRows,
      1,
      "the exact demonstrated obligation must have one historical consumption row",
    );

    const obligationReuseMechanism = assertHistoricalDischargeGuard(databasePath);
    const serviceConsumptionPrecheck = assertServiceConsumptionPrecheck(
      databasePath,
      report.sessions.obligationMediated,
    );
    const explicitRejectOutcome = explicitRejectConsumptionRows === 0
      ? "abandoned_without_consumption"
      : "abandonment_consumed_authority";

    return {
      ...report,
      databasePath: keepDatabase ? databasePath : null,
      final: {
        ...report.final,
        activeRuntimeCount: activeSessionRows + activeLeaseRows,
      },
      proofs: {
        ...report.proofs,
        explicitRejectOutcome,
        obligationReuseMechanism,
        obligationConsumptionRows,
        serviceConsumptionPrecheck,
        explicitRejectConsumptionRows,
        activeSessionRows,
        activeLeaseRows,
      },
    };
  } finally {
    if (!keepDatabase) rmSync(directory, { recursive: true, force: true });
  }
}

async function main() {
  const keepDatabase = process.argv.includes("--keep-database");
  const report = await runM1ReviewedProof({ keepDatabase });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
