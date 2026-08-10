import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  assert.equal(ready.structuredObligationAuthorityEnabled, true);
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

test("canonical world-kernel process persists semantic judgment and structured obligation runtime authority", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-causal-process-"));
  const databasePath = join(directory, "world.sqlite");
  const thread = structuredThread();
  const request = activationRequest();
  let first;
  let second;
  try {
    first = await startProcess(databasePath);
    const seeded = await json(`${first.baseUrl}/threads`, {
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

    const appraisal = await json(`${first.baseUrl}/threads/${thread.threadId}/private/requests`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify({
        request,
        causationId: "cause_causal_process_appraise",
        correlationId: "corr_causal_process",
      }),
    });
    assert.equal(appraisal.response.status, 201);
    assert.equal(appraisal.body.trace.privateStance.desiredAction, "clarify");
    assert.equal(appraisal.body.trace.privateStance.policy.version, "3");
    assert.deepEqual(appraisal.body.trace.appraisal.obligations, []);

    const continued = await json(
      `${first.baseUrl}/threads/${thread.threadId}/private/requests/${request.requestId}/participation`,
      {
        method: "POST",
        headers: privateHeaders(),
        body: JSON.stringify({
          operationId: "op_causal_process_continue",
          causationId: "cause_causal_process_continue",
          correlationId: "corr_causal_process",
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
    const authorizationId = continued.body.runtime.authorization.authorizationId;

    const actor = await json(`${first.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}/actor`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify({ operationId: "op_causal_process_actor" }),
    });
    assert.equal(actor.response.status, 201);
    assert.equal(actor.body.runtime.actorRun.output.proposedLifeChanges.length, 0);

    const guardian = await json(`${first.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}/goal-guardian`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify({ operationId: "op_causal_process_guardian" }),
    });
    assert.equal(guardian.response.status, 201);
    assert.equal(guardian.body.runtime.goalGuardianAudit.audit.decision, "pass");

    // D ends at runtime authority. Structured discharge/status revision belongs to E.
    const stillCurrent = openObligationStore(databasePath);
    try {
      assert.equal(
        stillCurrent.getCurrentRevision(thread.threadId, obligationId).obligation.status,
        "active",
      );
    } finally {
      stillCurrent.close();
    }

    await first.stop();
    first = null;

    second = await startProcess(databasePath);
    const persisted = await json(`${second.baseUrl}/threads/${thread.threadId}`);
    assert.equal(persisted.response.status, 200);
    assert.equal(persisted.body.thread.version, 1);
    assert.deepEqual(persisted.body.thread.currentState.unresolvedIntentions, []);

    const runtime = await json(`${second.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}`, {
      headers: { "x-fibre-private-token": privateToken },
    });
    assert.equal(runtime.response.status, 200);
    assert.equal(runtime.body.runtime.authorization.authorizationId, authorizationId);
    assert.equal(runtime.body.runtime.authorization.desiredAction, "clarify");
    assert.equal(runtime.body.runtime.authorization.authorizedAction, "accept");
    assert.equal(runtime.body.runtime.authorization.participationBasis, "obligation_override");
    assert.equal(runtime.body.runtime.authorization.applicability.obligationId, obligationId);
  } finally {
    if (first) await first.stop().catch(() => {});
    if (second) await second.stop().catch(() => {});
    rmSync(directory, { recursive: true, force: true });
  }
});