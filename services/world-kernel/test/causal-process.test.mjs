import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { openObligationStore } from "../src/obligation-store.mjs";
import { requestFingerprint } from "../src/private-participation.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const serverPath = fileURLToPath(new URL("./support/causal-test-server.mjs", import.meta.url));
const privateToken = "causal-process-private-token-012345";
const obligationId = `obl_${"c".repeat(64)}`;

async function waitForReady(child, stderr, timeoutMs = 10000) {
  return await new Promise((resolve, reject) => {
    let buffered = "";
    const timeout = setTimeout(() => finish(new Error(`Timed out: ${stderr()}`)), timeoutMs);
    const onData = (chunk) => {
      buffered += chunk.toString("utf8");
      while (buffered.includes("\n")) {
        const index = buffered.indexOf("\n");
        const line = buffered.slice(0, index);
        buffered = buffered.slice(index + 1);
        try {
          const value = JSON.parse(line);
          if (value.event === "world-kernel-listening") return finish(null, value);
        } catch {}
      }
    };
    const onExit = (code) => finish(new Error(`Exited ${code}: ${stderr()}`));
    const finish = (error, value) => {
      clearTimeout(timeout);
      child.stdout.off("data", onData);
      child.off("exit", onExit);
      if (error) reject(error); else resolve(value);
    };
    child.stdout.on("data", onData);
    child.once("exit", onExit);
  });
}

async function startProcess(databasePath) {
  let stderr = "";
  const child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", serverPath], {
    env: {
      ...process.env,
      FIBRE_WORLD_DATABASE: databasePath,
      FIBRE_WORLD_HOST: "127.0.0.1",
      FIBRE_WORLD_PORT: "0",
      FIBRE_PRIVATE_TOKEN: privateToken,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
  const ready = await waitForReady(child, () => stderr);
  assert.equal(ready.guardianProvider, "scripted_test_only");
  assert.equal(ready.causalParticipationProfileVersion, 4);
  assert.equal(ready.freezeProfileVersion, 2);
  assert.equal(ready.structuredObligationAuthorityEnabled, true);
  assert.equal(ready.structuredObligationDischargeEnabled, true);
  return {
    child,
    baseUrl: `http://127.0.0.1:${ready.port}`,
    async stop() {
      if (child.exitCode !== null) return;
      const exited = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Did not stop: ${stderr}`)), 10000);
        child.once("exit", (code, signal) => {
          clearTimeout(timeout);
          if (code === 0 || signal === "SIGTERM") resolve();
          else reject(new Error(`Exited ${code}: ${stderr}`));
        });
      });
      child.kill("SIGTERM");
      await exited;
    },
  };
}

async function json(url, options = {}) {
  const response = await fetch(url, options);
  return { response, body: await response.json() };
}

function privateHeaders() {
  return { "content-type": "application/json", "x-fibre-private-token": privateToken };
}

function structuredThread() {
  const thread = structuredClone(mina);
  thread.memoryRefs = [];
  thread.relationshipRefs = [];
  // Structured authority is deliberately independent of legacy unresolved-intention prose.
  thread.currentState.unresolvedIntentions = [];
  return thread;
}

function activationRequest() {
  return {
    requestId: "req_causal_process_obligation",
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Perform a bounded infrastructure review of this web service",
    statedNeed: "Identify the highest-priority infrastructure risks without expanding scope.",
    permissions: ["read_design"],
    acceptanceCriteria: "Return three bounded findings.",
  };
}

function structuredObligation(threadId, request) {
  return {
    obligationId,
    revision: 1,
    threadId,
    status: "active",
    issuer: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    parties: [{
      role: "beneficiary",
      entity: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    }],
    scope: {
      description: "Participate only in this exact Fibre-bound infrastructure-review request.",
      binding: {
        kind: "request_fingerprint",
        requestFingerprint: requestFingerprint(request),
      },
    },
    terms: "Perform one bounded infrastructure review while preserving the Thread's private dignity stance.",
    effectiveAt: "2026-08-10T00:00:00.000Z",
    expiresAt: "2027-08-10T00:00:00.000Z",
    recurrence: { kind: "none" },
    satisfaction: { criteria: "One authorized participation episode is later discharged by Fibre." },
    provenance: {
      createdBy: "causal_process_test",
      createdAt: "2026-08-10T00:00:00.000Z",
      evidenceReferences: ["test:canonical-structured-authority"],
    },
    visibility: { standing: "restricted", terms: "private" },
  };
}

async function seedAndAcquireCompelledRuntime(processHandle, databasePath, thread, request, suffix) {
  const seeded = await json(`${processHandle.baseUrl}/threads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ thread }),
  });
  assert.equal(seeded.response.status, 201);

  const obligationStore = openObligationStore(databasePath);
  try {
    const recorded = obligationStore.recordRevision(
      structuredObligation(thread.threadId, request),
      { recordedAt: "2026-08-10T00:00:01.000Z" },
    );
    assert.equal(recorded.created, true);
  } finally {
    obligationStore.close();
  }

  const appraisal = await json(`${processHandle.baseUrl}/threads/${thread.threadId}/private/requests`, {
    method: "POST",
    headers: privateHeaders(),
    body: JSON.stringify({
      request,
      causationId: `cause_causal_process_appraise${suffix}`,
      correlationId: `corr_causal_process${suffix}`,
    }),
  });
  assert.equal(appraisal.response.status, 201);
  assert.equal(appraisal.body.trace.privateStance.desiredAction, "clarify");
  assert.equal(appraisal.body.trace.privateStance.policy.version, "3");
  assert.deepEqual(appraisal.body.trace.appraisal.obligations, []);

  const continued = await json(
    `${processHandle.baseUrl}/threads/${thread.threadId}/private/requests/${request.requestId}/participation`,
    {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify({
        operationId: `op_causal_process_continue${suffix}`,
        causationId: `cause_causal_process_continue${suffix}`,
        correlationId: `corr_causal_process${suffix}`,
        governingObligationId: obligationId,
      }),
    },
  );
  assert.equal(continued.response.status, 201);
  assert.equal(continued.body.kind, "runtime");
  assert.equal(continued.body.applicability.decision.result, "applies");
  assert.equal(continued.body.runtime.authorization.desiredAction, "clarify");
  assert.equal(continued.body.runtime.authorization.authorizedAction, "accept");
  assert.equal(continued.body.runtime.authorization.participationBasis, "obligation_override");
  assert.deepEqual(continued.body.runtime.authorization.obligationReferences, []);
  assert.equal(
    continued.body.runtime.authorization.applicability.applicabilityId,
    continued.body.applicability.decision.applicabilityId,
  );
  assert.equal(
    continued.body.runtime.authorization.applicability.decisionDigest,
    continued.body.applicability.decisionDigest,
  );
  assert.equal(continued.body.runtime.authorization.applicability.obligationId, obligationId);
  const sessionId = continued.body.runtime.session.sessionId;

  const actor = await json(`${processHandle.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}/actor`, {
    method: "POST",
    headers: privateHeaders(),
    body: JSON.stringify({ operationId: `op_causal_process_actor${suffix}` }),
  });
  assert.equal(actor.response.status, 201);
  assert.equal(actor.body.runtime.actorRun.output.proposedLifeChanges.length, 0);

  const guardian = await json(`${processHandle.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}/goal-guardian`, {
    method: "POST",
    headers: privateHeaders(),
    body: JSON.stringify({ operationId: `op_causal_process_guardian${suffix}` }),
  });
  assert.equal(guardian.response.status, 201);
  assert.equal(guardian.body.runtime.goalGuardianAudit.audit.decision, "pass");

  return { appraisal, continued, sessionId };
}

test("canonical world-kernel completes and persists a compelled Structured Obligation life", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-causal-process-"));
  const databasePath = join(directory, "world.sqlite");
  const thread = structuredThread();
  const request = activationRequest();
  let first;
  let second;
  try {
    first = await startProcess(databasePath);
    const { continued, sessionId } = await seedAndAcquireCompelledRuntime(
      first,
      databasePath,
      thread,
      request,
      "",
    );
    const authorizationId = continued.body.runtime.authorization.authorizationId;
    const applicabilityId = continued.body.applicability.decision.applicabilityId;

    const frozen = await json(`${first.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}/freeze`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify({
        operationId: "op_causal_process_freeze",
        lifeChangeDecisions: [],
        causationId: "cause_causal_process_freeze",
        correlationId: "corr_causal_process",
      }),
    });
    assert.equal(frozen.response.status, 201);
    assert.equal(frozen.body.idempotent, false);
    assert.deepEqual(frozen.body.freeze.report.dischargedObligations, []);
    assert.deepEqual(frozen.body.freeze.consumption.obligationReferences, []);
    assert.equal(frozen.body.freeze.report.authorizationId, authorizationId);

    const discharged = openObligationStore(databasePath);
    try {
      const history = discharged.listHistory(thread.threadId, obligationId);
      assert.equal(history.length, 2);
      assert.equal(history[0].obligation.status, "active");
      assert.equal(history[1].obligation.status, "discharged");
      assert.equal(history[1].obligation.revision, 2);
      assert.equal(history[1].obligation.supersedesRevision, 1);
      assert.equal(
        discharged.getCurrentRevision(thread.threadId, obligationId).obligation.status,
        "discharged",
      );
    } finally {
      discharged.close();
    }

    const evidenceDb = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    try {
      const discharge = evidenceDb.prepare(`
        SELECT discharge_id,obligation_id,prior_revision,terminal_revision,applicability_id,
          authorization_id,authorization_consumption_digest,session_id,freeze_operation_id,
          freeze_report_id,freeze_report_digest,event_id,reason_code,discharge_digest
        FROM structured_obligation_discharges
        WHERE authorization_id=?
      `).get(authorizationId);
      assert.ok(discharge);
      assert.equal(discharge.obligation_id, obligationId);
      assert.equal(Number(discharge.prior_revision), 1);
      assert.equal(Number(discharge.terminal_revision), 2);
      assert.equal(discharge.applicability_id, applicabilityId);
      assert.equal(discharge.authorization_id, authorizationId);
      assert.equal(discharge.session_id, sessionId);
      assert.equal(discharge.freeze_operation_id, "op_causal_process_freeze");
      assert.equal(discharge.freeze_report_id, frozen.body.freeze.report.reportId);
      assert.equal(discharge.freeze_report_digest, frozen.body.freeze.reportDigest);
      assert.equal(discharge.event_id, frozen.body.freeze.event.eventId);
      assert.equal(discharge.authorization_consumption_digest, frozen.body.freeze.consumptionDigest);
      assert.equal(discharge.reason_code, "runtime_completed_guardian_pass");
      assert.match(discharge.discharge_id, /^obd_[0-9a-f]{64}$/);
      assert.match(discharge.discharge_digest, /^sha256:[0-9a-f]{64}$/);
    } finally {
      evidenceDb.close();
    }

    await first.stop();
    first = null;

    second = await startProcess(databasePath);
    const persisted = await json(`${second.baseUrl}/threads/${thread.threadId}`);
    assert.equal(persisted.response.status, 200);
    assert.equal(persisted.body.thread.version, 2);
    assert.deepEqual(persisted.body.thread.currentState.unresolvedIntentions, []);

    const runtime = await json(`${second.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}`, {
      headers: { "x-fibre-private-token": privateToken },
    });
    assert.equal(runtime.response.status, 200);
    assert.equal(runtime.body.runtime.session.status, "completed");
    assert.equal(runtime.body.runtime.lease.status, "released");
    assert.equal(runtime.body.runtime.authorization.authorizationId, authorizationId);
    assert.equal(runtime.body.runtime.authorization.desiredAction, "clarify");
    assert.equal(runtime.body.runtime.authorization.authorizedAction, "accept");
    assert.equal(runtime.body.runtime.authorization.participationBasis, "obligation_override");
    assert.equal(runtime.body.runtime.authorization.applicability.obligationId, obligationId);

    const restartedObligations = openObligationStore(databasePath);
    try {
      const current = restartedObligations.getCurrentRevision(thread.threadId, obligationId);
      assert.equal(current.obligation.revision, 2);
      assert.equal(current.obligation.status, "discharged");
    } finally {
      restartedObligations.close();
    }
  } finally {
    if (first) await first.stop().catch(() => {});
    if (second) await second.stop().catch(() => {});
    rmSync(directory, { recursive: true, force: true });
  }
});

test("freeze cannot consume Structured Obligation authority after a newer revocation", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-causal-revoked-before-freeze-"));
  const databasePath = join(directory, "world.sqlite");
  const thread = structuredThread();
  const request = activationRequest();
  let processHandle;
  try {
    processHandle = await startProcess(databasePath);
    const { continued, sessionId } = await seedAndAcquireCompelledRuntime(
      processHandle,
      databasePath,
      thread,
      request,
      "_revoked",
    );
    const authorizationId = continued.body.runtime.authorization.authorizationId;

    const obligations = openObligationStore(databasePath);
    try {
      const revoked = {
        ...structuredObligation(thread.threadId, request),
        revision: 2,
        status: "revoked",
        supersedesRevision: 1,
      };
      const result = obligations.recordRevision(revoked, { recordedAt: new Date().toISOString() });
      assert.equal(result.created, true);
      assert.equal(result.revision.obligation.status, "revoked");
    } finally {
      obligations.close();
    }

    const frozen = await json(
      `${processHandle.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}/freeze`,
      {
        method: "POST",
        headers: privateHeaders(),
        body: JSON.stringify({
          operationId: "op_causal_process_freeze_revoked",
          lifeChangeDecisions: [],
          causationId: "cause_causal_process_freeze_revoked",
          correlationId: "corr_causal_process_revoked",
        }),
      },
    );
    assert.equal(frozen.response.status, 409);
    assert.equal(frozen.body.error.code, "FREEZE_STATE_CHANGED");
    assert.match(frozen.body.error.message, /advanced to revision 2 before freeze/);

    const evidenceDb = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    try {
      assert.equal(
        Number(evidenceDb.prepare(
          "SELECT COUNT(*) AS count FROM freeze_reports WHERE authorization_id=?",
        ).get(authorizationId).count),
        0,
      );
      assert.equal(
        Number(evidenceDb.prepare(
          "SELECT COUNT(*) AS count FROM authorization_consumptions WHERE authorization_id=?",
        ).get(authorizationId).count),
        0,
      );
      assert.equal(
        Number(evidenceDb.prepare(
          "SELECT COUNT(*) AS count FROM structured_obligation_discharges WHERE authorization_id=?",
        ).get(authorizationId).count),
        0,
      );
    } finally {
      evidenceDb.close();
    }

    const persisted = await json(`${processHandle.baseUrl}/threads/${thread.threadId}`);
    assert.equal(persisted.response.status, 200);
    assert.equal(persisted.body.thread.version, 1);

    const runtime = await json(
      `${processHandle.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}`,
      { headers: { "x-fibre-private-token": privateToken } },
    );
    assert.equal(runtime.response.status, 200);
    assert.equal(runtime.body.runtime.session.status, "active");
    assert.equal(runtime.body.runtime.authorization.desiredAction, "clarify");

    const closed = await json(
      `${processHandle.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}/authority-withdrawal`,
      {
        method: "POST",
        headers: privateHeaders(),
        body: JSON.stringify({
          operationId: "op_causal_process_authority_withdrawal",
          causationId: "cause_causal_process_authority_withdrawal",
          correlationId: "corr_causal_process_revoked",
        }),
      },
    );
    assert.equal(closed.response.status, 201);
    assert.equal(closed.body.closure.reasonCode, "governing_authority_withdrawn");
    assert.equal(closed.body.closure.withdrawalCause, "superseded");
    assert.equal(closed.body.closure.guardianDecision, "pass");

    const closedRuntime = await json(
      `${processHandle.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}`,
      { headers: { "x-fibre-private-token": privateToken } },
    );
    assert.equal(closedRuntime.response.status, 200);
    assert.equal(closedRuntime.body.runtime.session.status, "aborted");
    assert.equal(closedRuntime.body.runtime.lease.status, "released");
    assert.equal(closedRuntime.body.runtime.lease.releaseReason, "governing_authority_withdrawn");
    assert.equal(closedRuntime.body.runtime.authorization.desiredAction, "clarify");

    const inspectedClosure = await json(
      `${processHandle.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}/authority-withdrawal`,
      { headers: { "x-fibre-private-token": privateToken } },
    );
    assert.equal(inspectedClosure.response.status, 200);
    assert.equal(inspectedClosure.body.authorityWithdrawal.causalChainVerified, true);
    assert.equal(inspectedClosure.body.authorityWithdrawal.closure.closureId, closed.body.closure.closureId);

    const currentStore = openObligationStore(databasePath);
    try {
      const current = currentStore.getCurrentRevision(thread.threadId, obligationId);
      assert.equal(current.obligation.revision, 2);
      assert.equal(current.obligation.status, "revoked");
    } finally {
      currentStore.close();
    }

    const closureDb = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    try {
      assert.equal(Number(closureDb.prepare(
        "SELECT COUNT(*) AS count FROM structured_authority_withdrawal_closures WHERE session_id=?",
      ).get(sessionId).count), 1);
      assert.equal(Number(closureDb.prepare(
        "SELECT COUNT(*) AS count FROM authorization_consumptions WHERE authorization_id=?",
      ).get(authorizationId).count), 0);
      assert.equal(Number(closureDb.prepare(
        "SELECT COUNT(*) AS count FROM freeze_reports WHERE session_id=?",
      ).get(sessionId).count), 0);
    } finally {
      closureDb.close();
    }

    await processHandle.stop();
    processHandle = await startProcess(databasePath);
    const restartedClosure = await json(
      `${processHandle.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}/authority-withdrawal`,
      { headers: { "x-fibre-private-token": privateToken } },
    );
    assert.equal(restartedClosure.response.status, 200);
    assert.deepEqual(restartedClosure.body.authorityWithdrawal, inspectedClosure.body.authorityWithdrawal);
    const restartedRuntime = await json(
      `${processHandle.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}`,
      { headers: { "x-fibre-private-token": privateToken } },
    );
    assert.equal(restartedRuntime.body.runtime.session.status, "aborted");
    assert.equal(restartedRuntime.body.runtime.authorization.desiredAction, "clarify");
  } finally {
    if (processHandle) await processHandle.stop().catch(() => {});
    rmSync(directory, { recursive: true, force: true });
  }
});