import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { canonicalJson } from "../src/persistence-common.mjs";
import { applicabilityDecisionDigest } from "../src/obligation-schema.mjs";
import { openFreezeStore } from "../src/freeze-store.mjs";
import { openObligationStore } from "../src/obligation-store.mjs";
import { requestFingerprint } from "../src/private-participation.mjs";
import {
  structuredObligationDischargeDigest,
} from "../src/structured-obligation-discharge.mjs";
import { inspectStructuredObligations } from "#tools/inspect/inspect-structured-obligations.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const serverPath = fileURLToPath(new URL("./support/causal-test-server.mjs", import.meta.url));
const privateToken = "structured-inspection-private-token-012345";
const obligationId = `obl_${"d".repeat(64)}`;
const privateTerms = "Perform exactly one bounded private infrastructure review for the named request.";

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
  assert.equal(ready.structuredObligationInspectionEnabled, true);
  assert.equal(ready.structuredObligationInspectionProfileVersion, 1);
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

function privateHeaders(jsonBody = false) {
  return {
    ...(jsonBody ? { "content-type": "application/json" } : {}),
    "x-fibre-private-token": privateToken,
  };
}

function threadFixture() {
  const thread = structuredClone(mina);
  thread.memoryRefs = [];
  thread.relationshipRefs = [];
  thread.currentState.unresolvedIntentions = [];
  return thread;
}

function activationRequest() {
  return {
    requestId: "req_structured_inspection",
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Perform a bounded infrastructure review of this web service",
    statedNeed: "Identify the highest-priority infrastructure risks without expanding scope.",
    permissions: ["read_design"],
    acceptanceCriteria: "Return three bounded findings.",
  };
}

function obligation(threadId, request) {
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
      description: "Participate only in this exact request.",
      binding: { kind: "request_fingerprint", requestFingerprint: requestFingerprint(request) },
    },
    terms: privateTerms,
    effectiveAt: "2026-08-10T00:00:00.000Z",
    expiresAt: "2027-08-10T00:00:00.000Z",
    recurrence: { kind: "none" },
    satisfaction: { criteria: "One guarded participation episode." },
    provenance: {
      createdBy: "structured_inspection_test",
      createdAt: "2026-08-10T00:00:00.000Z",
      evidenceReferences: ["test:structured-inspection"],
    },
    visibility: { standing: "restricted", terms: "private" },
  };
}

async function createCompletedCompelledLife(processHandle, databasePath) {
  const thread = threadFixture();
  const request = activationRequest();
  const seeded = await json(`${processHandle.baseUrl}/threads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ thread }),
  });
  assert.equal(seeded.response.status, 201);

  const obligations = openObligationStore(localWorldStateStorage(databasePath));
  try {
    obligations.recordRevision(obligation(thread.threadId, request), {
      recordedAt: "2026-08-10T00:00:01.000Z",
    });
  } finally {
    obligations.close();
  }

  const appraisal = await json(`${processHandle.baseUrl}/threads/${thread.threadId}/private/requests`, {
    method: "POST",
    headers: privateHeaders(true),
    body: JSON.stringify({
      request,
      causationId: "cause_structured_inspection_appraise",
      correlationId: "corr_structured_inspection",
    }),
  });
  assert.equal(appraisal.response.status, 201);
  assert.equal(appraisal.body.trace.privateStance.desiredAction, "clarify");

  const continued = await json(
    `${processHandle.baseUrl}/threads/${thread.threadId}/private/requests/${request.requestId}/participation`,
    {
      method: "POST",
      headers: privateHeaders(true),
      body: JSON.stringify({
        operationId: "op_structured_inspection_continue",
        causationId: "cause_structured_inspection_continue",
        correlationId: "corr_structured_inspection",
        governingObligationId: obligationId,
      }),
    },
  );
  assert.equal(continued.response.status, 201);
  assert.equal(continued.body.runtime.authorization.participationBasis, "obligation_override");
  assert.equal(continued.body.runtime.authorization.desiredAction, "clarify");
  const sessionId = continued.body.runtime.session.sessionId;
  const applicabilityId = continued.body.applicability.decision.applicabilityId;

  const disclosure = await json(
    `${processHandle.baseUrl}/threads/${thread.threadId}/private/requests/${request.requestId}/disclosure`,
    {
      method: "POST",
      headers: privateHeaders(true),
      body: JSON.stringify({
        operationId: "op_structured_inspection_disclosure",
        authorizationId: continued.body.runtime.authorization.authorizationId,
        strategy: {
          mode: "full_candor",
          communicatedPosture: "accept",
          publicRationaleIntent: "State the compelled participation boundary without claiming consent.",
          disclosedReasonCategories: ["recorded_obligation"],
          withheldReasonCategories: ["private_feelings", "dignity_evidence"],
          safeReferences: [],
          privateRationale: "Preserve the Thread's private clarify stance while accurately disclosing compelled authority.",
        },
        causationId: "cause_structured_inspection_disclosure",
        correlationId: "corr_structured_inspection",
      }),
    },
  );
  assert.equal(disclosure.response.status, 201);
  assert.equal(disclosure.body.disclosure.strategy.participationBasis, "obligation_override");
  assert.deepEqual(disclosure.body.disclosure.strategy.governingObligationReferences, []);

  const response = await json(
    `${processHandle.baseUrl}/threads/${thread.threadId}/private/requests/${request.requestId}/response`,
    {
      method: "POST",
      headers: privateHeaders(true),
      body: JSON.stringify({
        operationId: "op_structured_inspection_response",
        strategyId: disclosure.body.disclosure.strategy.strategyId,
        causationId: "cause_structured_inspection_response",
        correlationId: "corr_structured_inspection",
      }),
    },
  );
  assert.equal(response.response.status, 201);
  assert.match(response.body.response.response.message, /recorded obligation/i);

  const actor = await json(`${processHandle.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}/actor`, {
    method: "POST",
    headers: privateHeaders(true),
    body: JSON.stringify({ operationId: "op_structured_inspection_actor" }),
  });
  assert.equal(actor.response.status, 201);

  const guardian = await json(`${processHandle.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}/goal-guardian`, {
    method: "POST",
    headers: privateHeaders(true),
    body: JSON.stringify({ operationId: "op_structured_inspection_guardian" }),
  });
  assert.equal(guardian.response.status, 201);
  assert.equal(guardian.body.runtime.goalGuardianAudit.audit.decision, "pass");

  const frozen = await json(`${processHandle.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}/freeze`, {
    method: "POST",
    headers: privateHeaders(true),
    body: JSON.stringify({
      operationId: "op_structured_inspection_freeze",
      lifeChangeDecisions: [],
      causationId: "cause_structured_inspection_freeze",
      correlationId: "corr_structured_inspection",
    }),
  });
  assert.equal(frozen.response.status, 201);
  return {
    thread,
    request,
    sessionId,
    applicabilityId,
    authorizationId: continued.body.runtime.authorization.authorizationId,
  };
}

async function collectPrivateInspection(baseUrl, threadId, requestId, sessionId) {
  const headers = privateHeaders();
  const [list, detail, applicability, discharge, integrity] = await Promise.all([
    json(`${baseUrl}/threads/${threadId}/private/obligations`, { headers }),
    json(`${baseUrl}/threads/${threadId}/private/obligations/${obligationId}`, { headers }),
    json(`${baseUrl}/threads/${threadId}/private/requests/${requestId}/obligation-applicability`, { headers }),
    json(`${baseUrl}/threads/${threadId}/private/runtime/${sessionId}/obligation-discharge`, { headers }),
    json(`${baseUrl}/threads/${threadId}/private/obligations/integrity`, { headers }),
  ]);
  for (const item of [list, detail, applicability, discharge, integrity]) {
    assert.equal(item.response.status, 200);
    assert.equal(item.response.headers.get("cache-control"), "no-store");
  }
  return {
    list: list.body,
    detail: detail.body,
    applicability: applicability.body,
    discharge: discharge.body,
    integrity: integrity.body,
  };
}

test("F inspection is private, read-only, restart-stable, and cross-chain verified", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-structured-inspection-"));
  const databasePath = join(directory, "world.sqlite");
  let first;
  let second;
  try {
    first = await startProcess(databasePath);
    const life = await createCompletedCompelledLife(first, databasePath);

    const forbidden = await json(`${first.baseUrl}/threads/${life.thread.threadId}/private/obligations`);
    assert.equal(forbidden.response.status, 403);
    assert.equal(forbidden.body.error.code, "PRIVATE_TOKEN_REQUIRED");

    const publicRoute = await json(`${first.baseUrl}/threads/${life.thread.threadId}/obligations`);
    assert.equal(publicRoute.response.status, 404);

    const mutation = await json(`${first.baseUrl}/threads/${life.thread.threadId}/private/obligations`, {
      method: "POST",
      headers: privateHeaders(true),
      body: JSON.stringify({}),
    });
    assert.equal(mutation.response.status, 405);
    assert.equal(mutation.body.error.code, "METHOD_NOT_ALLOWED");

    const beforeRestart = await collectPrivateInspection(
      first.baseUrl,
      life.thread.threadId,
      life.request.requestId,
      life.sessionId,
    );
    assert.equal(beforeRestart.list.obligations.length, 1);
    assert.equal(beforeRestart.list.obligations[0].status, "discharged");
    assert.equal(beforeRestart.detail.obligation.current.obligation.status, "discharged");
    assert.equal(beforeRestart.detail.obligation.current.obligation.terms, privateTerms);
    assert.equal(beforeRestart.detail.obligation.history.length, 2);
    assert.equal(beforeRestart.applicability.applicability.length, 1);
    assert.equal(beforeRestart.applicability.applicability[0].decision.result, "applies");
    assert.equal(beforeRestart.discharge.discharge.causalChainVerified, true);
    assert.equal(beforeRestart.integrity.ok, true);
    assert.equal(beforeRestart.integrity.queryOnly, true);
    assert.equal(beforeRestart.integrity.obligations, 1);
    assert.equal(beforeRestart.integrity.applicabilityDecisions, 1);
    assert.equal(beforeRestart.integrity.discharges, 1);

    const admin = inspectStructuredObligations(databasePath, { threadId: life.thread.threadId });
    assert.equal(admin.ok, true);
    assert.equal(admin.sourceReadOnly, true);
    assert.equal(admin.threads[0].integrity.dischargeCausalChainsVerified, true);

    const freezeStore = openFreezeStore(localWorldStateStorage(databasePath));
    try {
      const freezeIntegrity = freezeStore.verifyFreezeIntegrity(
        life.thread.threadId,
        life.sessionId,
      );
      assert.ok(freezeIntegrity.structuredDischarge);
      assert.match(freezeIntegrity.structuredDischarge.dischargeId, /^obd_/);
      assert.equal(freezeIntegrity.structuredDischarge.terminalRevision, 2);
    } finally {
      freezeStore.close();
    }

    const publicThread = await json(`${first.baseUrl}/threads/${life.thread.threadId}`);
    const publicEvents = await json(`${first.baseUrl}/threads/${life.thread.threadId}/events`);
    const publicHealth = await json(`${first.baseUrl}/health`);
    const privateIdentifiers = [
      obligationId,
      life.applicabilityId,
      privateTerms,
      beforeRestart.discharge.discharge.discharge.dischargeId,
    ];
    for (const payload of [publicThread.body, publicEvents.body, publicHealth.body]) {
      const serialized = JSON.stringify(payload);
      for (const secret of privateIdentifiers) assert.equal(serialized.includes(secret), false);
    }

    await first.stop();
    first = null;
    second = await startProcess(databasePath);
    const afterRestart = await collectPrivateInspection(
      second.baseUrl,
      life.thread.threadId,
      life.request.requestId,
      life.sessionId,
    );
    assert.deepEqual(afterRestart, beforeRestart);

    const runtime = await json(
      `${second.baseUrl}/threads/${life.thread.threadId}/private/runtime/${life.sessionId}`,
      { headers: privateHeaders() },
    );
    assert.equal(runtime.response.status, 200);
    assert.equal(runtime.body.runtime.session.status, "completed");
    assert.equal(runtime.body.runtime.authorization.desiredAction, "clarify");
    assert.equal(runtime.body.runtime.authorization.authorizedAction, "accept");
  } finally {
    if (first) await first.stop().catch(() => {});
    if (second) await second.stop().catch(() => {});
    rmSync(directory, { recursive: true, force: true });
  }
});

test("F inspection detects coherently re-signed discharge tampering after append-only guards are bypassed", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-structured-inspection-tamper-"));
  const databasePath = join(directory, "world.sqlite");
  let processHandle;
  try {
    processHandle = await startProcess(databasePath);
    const life = await createCompletedCompelledLife(processHandle, databasePath);
    const clean = await collectPrivateInspection(
      processHandle.baseUrl,
      life.thread.threadId,
      life.request.requestId,
      life.sessionId,
    );
    assert.equal(clean.integrity.ok, true);
    await processHandle.stop();
    processHandle = null;

    const db = new DatabaseSync(databasePath, { enableForeignKeyConstraints: false });
    try {
      db.exec("DROP TRIGGER structured_obligation_discharges_no_update");
      const row = db.prepare(`
        SELECT discharge_id,discharge_json FROM structured_obligation_discharges WHERE session_id=?
      `).get(life.sessionId);
      const forged = JSON.parse(row.discharge_json);
      forged.freezeReportDigest = `sha256:${"f".repeat(64)}`;
      const forgedDigest = structuredObligationDischargeDigest(forged);
      db.prepare(`
        UPDATE structured_obligation_discharges
        SET freeze_report_digest=?,discharge_json=?,discharge_digest=?
        WHERE discharge_id=?
      `).run(forged.freezeReportDigest, canonicalJson(forged), forgedDigest, row.discharge_id);
    } finally {
      db.close();
    }

    processHandle = await startProcess(databasePath);
    const inspected = await json(
      `${processHandle.baseUrl}/threads/${life.thread.threadId}/private/runtime/${life.sessionId}/obligation-discharge`,
      { headers: privateHeaders() },
    );
    assert.equal(inspected.response.status, 503);
    assert.equal(inspected.body.error.code, "INTEGRITY_FAILURE");
    assert.equal(inspected.body.error.message, "Structured Obligation evidence failed integrity validation");

    assert.throws(
      () => inspectStructuredObligations(databasePath, { threadId: life.thread.threadId }),
      /discharge freeze report digest does not match persisted evidence/,
    );
  } finally {
    if (processHandle) await processHandle.stop().catch(() => {});
    rmSync(directory, { recursive: true, force: true });
  }
});

test("F inspection rejects a discharged terminal revision whose causal witness is missing", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-structured-inspection-missing-witness-"));
  const databasePath = join(directory, "world.sqlite");
  let processHandle;
  try {
    processHandle = await startProcess(databasePath);
    const life = await createCompletedCompelledLife(processHandle, databasePath);
    await processHandle.stop();
    processHandle = null;

    const db = new DatabaseSync(databasePath, { enableForeignKeyConstraints: false });
    try {
      db.exec("DROP TRIGGER structured_obligation_discharges_no_delete");
      db.prepare("DELETE FROM structured_obligation_discharges WHERE session_id=?").run(life.sessionId);
    } finally {
      db.close();
    }

    processHandle = await startProcess(databasePath);
    const inspected = await json(
      `${processHandle.baseUrl}/threads/${life.thread.threadId}/private/obligations/integrity`,
      { headers: privateHeaders() },
    );
    assert.equal(inspected.response.status, 503);
    assert.equal(inspected.body.error.code, "INTEGRITY_FAILURE");
    assert.throws(
      () => inspectStructuredObligations(databasePath, { threadId: life.thread.threadId }),
      /must have exactly one discharge witness/,
    );
  } finally {
    if (processHandle) await processHandle.stop().catch(() => {});
    rmSync(directory, { recursive: true, force: true });
  }
});

test("F inspection re-derives deterministic applicability instead of trusting a re-signed outcome", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-structured-inspection-applicability-tamper-"));
  const databasePath = join(directory, "world.sqlite");
  let processHandle;
  try {
    processHandle = await startProcess(databasePath);
    const life = await createCompletedCompelledLife(processHandle, databasePath);
    await processHandle.stop();
    processHandle = null;

    const db = new DatabaseSync(databasePath, { enableForeignKeyConstraints: false });
    try {
      db.exec("DROP TRIGGER obligation_applicability_decisions_no_update");
      const row = db.prepare(
        "SELECT decision_json FROM obligation_applicability_decisions WHERE applicability_id=?",
      ).get(life.applicabilityId);
      const forged = JSON.parse(row.decision_json);
      forged.result = "does_not_apply";
      forged.reasonCode = "request_binding_mismatch";
      const digest = applicabilityDecisionDigest(forged);
      db.prepare(`
        UPDATE obligation_applicability_decisions
        SET result=?,reason_code=?,decision_json=?,decision_digest=?
        WHERE applicability_id=?
      `).run(forged.result, forged.reasonCode, canonicalJson(forged), digest, life.applicabilityId);
    } finally {
      db.close();
    }

    processHandle = await startProcess(databasePath);
    const inspected = await json(
      `${processHandle.baseUrl}/threads/${life.thread.threadId}/private/obligations/integrity`,
      { headers: privateHeaders() },
    );
    assert.equal(inspected.response.status, 503);
    assert.equal(inspected.body.error.code, "INTEGRITY_FAILURE");
    assert.throws(
      () => inspectStructuredObligations(databasePath, { threadId: life.thread.threadId }),
      /(?:discharge applicability digest|applicability derived result) does not match persisted evidence/,
    );
  } finally {
    if (processHandle) await processHandle.stop().catch(() => {});
    rmSync(directory, { recursive: true, force: true });
  }
});
