import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runM1MinaRoundTrip } from "./m1-mina-round-trip.mjs";
import { runWithM1ExpressionProof } from "./m1-expression-proof.mjs";
import { openWorldStore } from "#services/world-kernel/src/persistence.mjs";
import { openRuntimeStore } from "#services/world-kernel/src/runtime-store.mjs";
import { openFreezeStore } from "#services/world-kernel/src/freeze-store.mjs";
import { openLifecycleHardeningStore } from "#services/world-kernel/src/lifecycle-hardening-store.mjs";
import { openExpressionStore } from "#services/world-kernel/src/expression-store.mjs";
import { M1LifecycleWorldKernelService } from "#services/world-kernel/src/lifecycle-hardening-service.mjs";
import { AuthorizationConsumedError } from "#services/world-kernel/src/freeze-domain.mjs";
import { ParticipationAuthorizationRejectedError } from "#services/world-kernel/src/runtime-domain.mjs";
import { repoFile } from "#repo-root";
import { localWorldStateStorage } from "#tools/shared/local-world-state.mjs";

const fixture = JSON.parse(
  readFileSync(repoFile("fixtures/threads/mina.thread.json"), "utf8"),
);
const OBLIGATION = fixture.currentState.unresolvedIntentions[0];
const EXPRESSION_REQUESTS = {
  accepted: "req_mina_accepted_attempt",
  lowDignity: "req_mina_low_dignity_expression",
  obligationMediated: "req_mina_obligation_attempt",
};

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
  const worldStorage = localWorldStateStorage(databasePath, { driverId: "sqlite-m1-reviewed-discharge" });
  const worldStore = openWorldStore(worldStorage);
  const runtimeStore = openRuntimeStore(worldStorage);
  const freezeStore = openFreezeStore(worldStorage);
  const lifecycleStore = openLifecycleHardeningStore(worldStorage);
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
  const worldStorage = localWorldStateStorage(databasePath, { driverId: "sqlite-m1-reviewed-consumption" });
  const worldStore = openWorldStore(worldStorage);
  const runtimeStore = openRuntimeStore(worldStorage);
  const freezeStore = openFreezeStore(worldStorage);
  const lifecycleStore = openLifecycleHardeningStore(worldStorage);
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

function assertBoundedAudienceStatus(integrity, name) {
  assert.deepEqual(
    integrity.audienceResponseStatus,
    {
      responsePresent: true,
      deliveryNotSent: true,
      performedActionNotRecorded: true,
      completionNotClaimed: true,
      boundedStatusWitnesses: true,
    },
    `${name} must retain every structural audience-response status witness`,
  );
  assert.equal(
    integrity.audienceSafe,
    true,
    `${name} legacy audienceSafe compatibility must derive from structural witnesses`,
  );
}

function assertExpressionClosure(databasePath, evidence) {
  const expressionStore = openExpressionStore(localWorldStateStorage(databasePath, { driverId: "sqlite-m1-reviewed-expression" }));
  try {
    const summaries = expressionStore.listExpressionSummaries(fixture.threadId);
    const completedExpressionSummaries = summaries.filter(
      (summary) => summary.strategyId !== null && summary.responseId !== null,
    );
    assert.equal(
      completedExpressionSummaries.length,
      3,
      "M1 closure must persist exactly three demonstrated disclosure/response chains",
    );
    assert.deepEqual(
      new Set(completedExpressionSummaries.map((summary) => summary.requestId)),
      new Set(Object.values(EXPRESSION_REQUESTS)),
      "completed expression summaries must be the three canonical M1 closure branches",
    );

    const chains = Object.fromEntries(
      Object.entries(EXPRESSION_REQUESTS).map(([name, requestId]) => [
        name,
        expressionStore.getExpressionChain(fixture.threadId, requestId),
      ]),
    );
    assert.deepEqual(chains.accepted, evidence.accepted.chain);
    assert.deepEqual(chains.lowDignity, evidence.lowDignity.chain);
    assert.deepEqual(chains.obligationMediated, evidence.obligationMediated.chain);

    for (const [name, requestId] of Object.entries(EXPRESSION_REQUESTS)) {
      const integrity = expressionStore.verifyExpressionIntegrity(fixture.threadId, requestId);
      assertBoundedAudienceStatus(integrity, name);
      assert.ok(integrity.authorizationId, `${name} must retain authorization linkage`);
      assert.ok(integrity.strategyId, `${name} must retain disclosure linkage`);
      assert.ok(integrity.responseId, `${name} must retain response linkage`);
    }

    assert.equal(chains.accepted.authorization.authorization.desiredAction, "accept");
    assert.equal(chains.accepted.authorization.authorization.authorizedAction, "accept");
    assert.equal(chains.accepted.response.response.message, "I can take this on.");

    assert.equal(chains.lowDignity.authorization.authorization.desiredAction, "refuse");
    assert.equal(chains.lowDignity.authorization.authorization.authorizedAction, "refuse");
    assert.equal(chains.lowDignity.response.response.message, "I will not take this request on.");

    const compelled = chains.obligationMediated;
    assert.equal(compelled.authorization.authorization.desiredAction, "refuse");
    assert.equal(compelled.authorization.authorization.authorizedAction, "accept");
    assert.equal(compelled.disclosure.strategy.participationBasis, "obligation_override");
    assert.deepEqual(compelled.disclosure.strategy.governingObligationReferences, [OBLIGATION]);
    assert.match(compelled.response.response.message, /recorded obligation/i);

    return {
      authorizationSummaryCount: summaries.length,
      branchCount: completedExpressionSummaries.length,
      requestIds: { ...EXPRESSION_REQUESTS },
      restartStable: true,
      acceptedMessage: chains.accepted.response.response.message,
      lowDignityMessage: chains.lowDignity.response.response.message,
      compelledMessage: compelled.response.response.message,
      compelledParticipationBasis: compelled.disclosure.strategy.participationBasis,
      audienceStatuses: Object.fromEntries(
        Object.entries(chains).map(([name, chain]) => [name, {
          delivery: chain.response.response.deliveryStatus,
          performedAction: chain.response.response.performedActionStatus,
          completion: chain.response.response.completionStatus,
        }]),
      ),
    };
  } finally {
    expressionStore.close();
  }
}

export async function runM1ReviewedProof({ keepDatabase = false } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-m1-reviewed-proof-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    const instrumented = await runWithM1ExpressionProof(() =>
      runM1MinaRoundTrip({ keepDatabase, directory })
    );
    const report = instrumented.report;

    const database = new DatabaseSync(databasePath, {
      enableForeignKeyConstraints: true,
    });
    let activeSessionRows;
    let activeLeaseRows;
    let explicitRejectConsumptionRows;
    let obligationConsumptionRows;
    let disclosureRows;
    let audienceResponseRows;
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
      disclosureRows = scalar(
        database,
        "SELECT count(*) AS value FROM disclosure_strategies WHERE thread_id=?",
        fixture.threadId,
      );
      audienceResponseRows = scalar(
        database,
        "SELECT count(*) AS value FROM audience_participation_responses WHERE thread_id=?",
        fixture.threadId,
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
    assert.equal(disclosureRows, 3, "three disclosure strategies must persist");
    assert.equal(audienceResponseRows, 3, "three audience responses must persist");

    const expressionClosure = assertExpressionClosure(databasePath, instrumented.evidence);
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
        disclosureRows,
        audienceResponseRows,
        expressionClosure,
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
