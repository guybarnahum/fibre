import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { lifecycleOutcome } from "#apps/thread-editor/editor-model.js";
import { repoFile } from "#repo-root";

const fixture = JSON.parse(
  readFileSync(repoFile("fixtures/threads/mina.thread.json"), "utf8"),
);
const kernelProcessPath = fileURLToPath(new URL("./m1-demo-world-kernel.mjs", import.meta.url));
const editorProcessPath = fileURLToPath(new URL("./m1-demo-thread-editor.mjs", import.meta.url));
const OBLIGATION = fixture.currentState.unresolvedIntentions[0];

function token(label) {
  return `${label}_${randomBytes(24).toString("hex")}`;
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function waitForEvent(child, expectedEvent, stderr, timeoutMs = 15_000) {
  return await new Promise((resolvePromise, reject) => {
    let buffer = "";
    const timeout = setTimeout(
      () => finish(new Error(`Timed out waiting for ${expectedEvent}: ${stderr()}`)),
      timeoutMs,
    );
    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      while (buffer.includes("\n")) {
        const index = buffer.indexOf("\n");
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        try {
          const value = JSON.parse(line);
          if (value.event === expectedEvent) return finish(null, value);
        } catch {}
      }
    };
    const onExit = (code, signal) => {
      finish(new Error(`Process exited before ${expectedEvent}: code=${code} signal=${signal} ${stderr()}`));
    };
    const finish = (error, value) => {
      clearTimeout(timeout);
      child.stdout.off("data", onData);
      child.off("exit", onExit);
      if (error) reject(error);
      else resolvePromise(value);
    };
    child.stdout.on("data", onData);
    child.once("exit", onExit);
  });
}

async function startProcess(scriptPath, expectedEvent, environment) {
  let stderrText = "";
  const child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", scriptPath], {
    env: { ...process.env, ...environment },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", (chunk) => { stderrText += chunk.toString("utf8"); });
  const ready = await waitForEvent(child, expectedEvent, () => stderrText);
  return {
    child,
    ready,
    stderr: () => stderrText,
    async stop() {
      if (child.exitCode !== null) return;
      const exited = new Promise((resolvePromise, reject) => {
        const timeout = setTimeout(
          () => reject(new Error(`Process did not stop: ${stderrText}`)),
          10_000,
        );
        child.once("exit", (code, signal) => {
          clearTimeout(timeout);
          if (code === 0 || signal === "SIGTERM") resolvePromise();
          else reject(new Error(`Process exited ${code}/${signal}: ${stderrText}`));
        });
      });
      child.kill("SIGTERM");
      await exited;
    },
  };
}

async function requestJson(baseUrl, path, {
  method = "GET",
  body,
  headers = {},
  expectedStatus,
} = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json().catch(() => null);
  if (expectedStatus !== undefined) {
    assert.equal(
      response.status,
      expectedStatus,
      `${method} ${path}: ${JSON.stringify(payload)}`,
    );
  } else if (!response.ok) {
    throw new Error(`${method} ${path} failed ${response.status}: ${JSON.stringify(payload)}`);
  }
  return { status: response.status, body: payload, headers: response.headers };
}

function privateHeaders(privateToken) {
  return { "x-fibre-private-token": privateToken };
}

function adminHeaders(adminToken) {
  return { "x-fibre-admin-token": adminToken };
}

function editorHeaders(editorToken) {
  return { "x-fibre-editor-token": editorToken };
}

function requestRecord({ requestId, correlationId, objective, occurredAt }) {
  return {
    request: {
      requestId,
      trigger: "human_request",
      requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
      objective,
      statedNeed: "Prove Mina's persistent participation lifecycle through the M1 kernel.",
      permissions: ["read_design", "quote_findings"],
      acceptanceCriteria: "Return one bounded evidence-bearing result.",
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: [],
      knownAlternatives: [],
    },
    occurredAt,
    causationId: `cause_${requestId}`,
    correlationId,
  };
}

function stanceRecord(trace, {
  action = "accept",
  score = 84,
  recordedAt,
}) {
  return {
    assessment: {
      threadId: trace.threadId,
      snapshotVersion: trace.snapshotVersion,
      requestId: trace.requestId,
      requestFingerprint: trace.requestFingerprint,
      policy: { id: "dignity_guardian", version: "1" },
      proposedAction: action,
      score,
      rationale: action === "accept"
        ? "The bounded request fits Mina's identity and selected evidence."
        : "Mina would not freely choose this request without honoring her recorded obligation.",
      factors: {
        identityAlignment: "Infrastructure and application-security review fit",
        individualizedAdvantage: "Uses Mina's durable review history",
        requesterNeed: "Concrete milestone evidence",
        relationalMeaning: "Known collaborator",
        respectAndReciprocity: "Scope and acceptance criteria are explicit",
        participationTerms: "Bounded and reversible until freeze",
        obligationsAndOpportunityCost: action === "accept"
          ? "No conflicting obligation"
          : "A recorded unresolved intention may govern the override",
      },
      evidenceRefs: ["mem_mina_first_review"],
      repairQuestions: [],
      knownAlternatives: [],
      feelings: action === "accept" ? ["careful confidence"] : ["reluctance"],
      conflictingMotives: action === "accept" ? [] : ["Decline", "Honor recorded obligation"],
      uncertainties: [],
      relationshipImpact: {
        entity: trace.request.requester,
        fondnessDelta: 0,
        resentmentDelta: 0,
        rationale: "The bounded demonstration does not change the relationship.",
        evidenceRefs: [],
      },
    },
    recordedAt,
    causationId: `cause_stance_${trace.requestId}`,
    correlationId: trace.correlationId,
  };
}

function acquireRecord({ operationId, correlationId, obligationReferences = [] }) {
  return {
    operationId,
    decision: {
      authorizedAction: "accept",
      rationale: obligationReferences.length === 0
        ? "Proceed with the bounded M1 demonstration."
        : "Honor the exact recorded obligation for this one participation episode.",
      obligationReferences,
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
    },
    causationId: `cause_${operationId}`,
    correlationId,
  };
}

function freezeRecord(operationId, correlationId) {
  return {
    operationId,
    lifeChangeDecisions: [{
      proposalIndex: 0,
      decision: "accept",
      rationale: "Retain the bounded memory proposed from selected Thread-owned evidence.",
    }],
    causationId: `cause_${operationId}`,
    correlationId,
  };
}

function abandonRecord(operationId, correlationId) {
  return {
    operationId,
    causationId: `cause_${operationId}`,
    correlationId,
  };
}

async function createTrace(kernelUrl, privateToken, {
  requestId,
  correlationId,
  objective,
  action = "accept",
  score = 84,
  index,
}) {
  const request = await requestJson(
    kernelUrl,
    `/threads/${fixture.threadId}/private/requests`,
    {
      method: "POST",
      headers: privateHeaders(privateToken),
      body: requestRecord({
        requestId,
        correlationId,
        objective,
        occurredAt: `2026-08-06T03:${String(index).padStart(2, "0")}:00.000Z`,
      }),
      expectedStatus: 201,
    },
  );
  const trace = request.body.trace;
  const stance = await requestJson(
    kernelUrl,
    `/threads/${fixture.threadId}/private/requests/${requestId}/stance`,
    {
      method: "POST",
      headers: privateHeaders(privateToken),
      body: stanceRecord(trace, {
        action,
        score,
        recordedAt: `2026-08-06T03:${String(index).padStart(2, "0")}:30.000Z`,
      }),
      expectedStatus: 201,
    },
  );
  return stance.body.trace;
}

async function acquireRuntime(kernelUrl, privateToken, trace, {
  operationId,
  obligationReferences = [],
  expectedStatus = 201,
}) {
  return await requestJson(
    kernelUrl,
    `/threads/${fixture.threadId}/private/requests/${trace.requestId}/runtime`,
    {
      method: "POST",
      headers: privateHeaders(privateToken),
      body: acquireRecord({
        operationId,
        correlationId: trace.correlationId,
        obligationReferences,
      }),
      expectedStatus,
    },
  );
}

async function runActorAndGuardian(kernelUrl, privateToken, sessionId, prefix) {
  const actor = await requestJson(
    kernelUrl,
    `/threads/${fixture.threadId}/private/runtime/${sessionId}/actor`,
    {
      method: "POST",
      headers: privateHeaders(privateToken),
      body: { operationId: `op_${prefix}_actor` },
      expectedStatus: 201,
    },
  );
  const guardian = await requestJson(
    kernelUrl,
    `/threads/${fixture.threadId}/private/runtime/${sessionId}/goal-guardian`,
    {
      method: "POST",
      headers: privateHeaders(privateToken),
      body: { operationId: `op_${prefix}_guardian` },
      expectedStatus: 201,
    },
  );
  return { actor: actor.body.runtime.actorRun, guardian: guardian.body.runtime.goalGuardianAudit };
}

async function editorJson(editorUrl, editorToken, path, options = {}) {
  return await requestJson(editorUrl, path, {
    ...options,
    headers: {
      ...editorHeaders(editorToken),
      ...(options.headers ?? {}),
    },
  });
}

async function waitForKernelExpiry(kernelUrl, expiresAt) {
  const expiry = Date.parse(expiresAt);
  assert.equal(Number.isFinite(expiry), true, "lease expiry must parse");
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const health = await requestJson(kernelUrl, "/health");
    if (Date.parse(health.body.kernelTime) >= expiry) return health.body.kernelTime;
    await sleep(20);
  }
  throw new Error(`Kernel time did not reach lease expiry ${expiresAt}`);
}

async function startKernel({
  databasePath,
  port,
  privateToken,
  adminToken,
  actorMode,
  leaseDurationMs,
}) {
  const processRuntime = await startProcess(
    kernelProcessPath,
    "m1-demo-world-kernel-listening",
    {
      FIBRE_WORLD_DATABASE: databasePath,
      FIBRE_WORLD_HOST: "127.0.0.1",
      FIBRE_WORLD_PORT: String(port),
      FIBRE_PRIVATE_TOKEN: privateToken,
      FIBRE_ADMIN_TOKEN: adminToken,
      FIBRE_DEMO_ACTOR_MODE: actorMode,
      FIBRE_DEMO_LEASE_DURATION_MS: String(leaseDurationMs),
    },
  );
  return {
    ...processRuntime,
    port: processRuntime.ready.port,
    baseUrl: `http://127.0.0.1:${processRuntime.ready.port}`,
  };
}

async function startEditor({ kernelPort, privateToken, editorToken }) {
  const processRuntime = await startProcess(
    editorProcessPath,
    "thread-editor-listening",
    {
      FIBRE_EDITOR_HOST: "127.0.0.1",
      FIBRE_EDITOR_PORT: "0",
      FIBRE_WORLD_URL: `http://127.0.0.1:${kernelPort}`,
      FIBRE_PRIVATE_TOKEN: privateToken,
      FIBRE_EDITOR_ACCESS_TOKEN: editorToken,
    },
  );
  return {
    ...processRuntime,
    baseUrl: `http://127.0.0.1:${processRuntime.ready.port}`,
  };
}

export async function runM1MinaRoundTrip({
  keepDatabase = false,
  directory: suppliedDirectory,
} = {}) {
  const directory = suppliedDirectory ?? mkdtempSync(join(tmpdir(), "fibre-m1-mina-round-trip-"));
  const databasePath = join(directory, "world.sqlite");
  const privateToken = token("private");
  const adminToken = token("admin");
  const editorToken = token("editor");
  let kernel = null;
  let editor = null;
  let kernelPort = 0;

  const restartKernel = async ({ actorMode = "normal", leaseDurationMs = 5000 } = {}) => {
    if (kernel !== null) {
      await kernel.stop();
      kernel = null;
      await sleep(25);
    }
    kernel = await startKernel({
      databasePath,
      port: kernelPort,
      privateToken,
      adminToken,
      actorMode,
      leaseDurationMs,
    });
    kernelPort = kernel.port;
    return kernel;
  };

  try {
    await restartKernel();
    editor = await startEditor({ kernelPort, privateToken, editorToken });

    await requestJson(kernel.baseUrl, "/threads", {
      method: "POST",
      body: { thread: fixture },
      expectedStatus: 201,
    });
    const seededInspection = await editorJson(
      editor.baseUrl,
      editorToken,
      `/api/editor/threads/${fixture.threadId}`,
    );
    assert.equal(seededInspection.body.thread.version, 1);
    const seededHash = seededInspection.body.integrity.stateHash;

    await restartKernel();
    const restartInspection = await editorJson(
      editor.baseUrl,
      editorToken,
      `/api/editor/threads/${fixture.threadId}`,
    );
    assert.equal(restartInspection.body.thread.version, 1);
    assert.equal(restartInspection.body.integrity.stateHash, seededHash);

    const correlation = "corr_mina_stale_recovery";
    const staleTrace = await createTrace(kernel.baseUrl, privateToken, {
      requestId: "req_mina_stale_attempt",
      correlationId: correlation,
      objective: "Review the M1 persistent-lifecycle evidence before Mina changes",
      index: 1,
    });

    const health = await requestJson(kernel.baseUrl, "/health");
    const command = {
      commandId: "cmd_mina_m1_self_model",
      threadId: fixture.threadId,
      expectedVersion: 1,
      type: "UPDATE_SELF_MODEL",
      payload: {
        selfModel: "I am a persistent infrastructure reviewer who distinguishes private stance, authorization, temporary cognition, and durable life change.",
        summary: "Mina recognized the M1 participation boundary.",
      },
      actor: { entityId: "human_guy", kind: "human", displayName: "Guy" },
      occurredAt: health.body.kernelTime,
    };
    const preview = await requestJson(
      kernel.baseUrl,
      `/threads/${fixture.threadId}/commands/preview`,
      { method: "POST", body: { command }, expectedStatus: 200 },
    );
    const noAdmin = await requestJson(
      kernel.baseUrl,
      `/threads/${fixture.threadId}/commands`,
      {
        method: "POST",
        body: { previewId: preview.body.previewId, command },
        expectedStatus: 403,
      },
    );
    assert.equal(noAdmin.body.error.code, "ADMIN_TOKEN_REQUIRED");
    const applied = await requestJson(
      kernel.baseUrl,
      `/threads/${fixture.threadId}/commands`,
      {
        method: "POST",
        headers: adminHeaders(adminToken),
        body: { previewId: preview.body.previewId, command },
        expectedStatus: 201,
      },
    );
    assert.equal(applied.body.thread.version, 2);

    const staleAcquisition = await acquireRuntime(kernel.baseUrl, privateToken, staleTrace, {
      operationId: "op_mina_stale_acquire",
      expectedStatus: 422,
    });
    assert.equal(
      staleAcquisition.body.error.code,
      "PARTICIPATION_AUTHORIZATION_REJECTED",
    );
    assert.match(
      staleAcquisition.body.error.message,
      /new requestId under the same correlationId/,
    );

    const acceptedTrace = await createTrace(kernel.baseUrl, privateToken, {
      requestId: "req_mina_accepted_attempt",
      correlationId: correlation,
      objective: "Review and preserve the M1 persistent-lifecycle evidence",
      index: 2,
    });
    assert.equal(acceptedTrace.correlationId, staleTrace.correlationId);
    const acceptedAcquisition = await acquireRuntime(kernel.baseUrl, privateToken, acceptedTrace, {
      operationId: "op_mina_accepted_acquire",
    });
    const acceptedSessionId = acceptedAcquisition.body.runtime.session.sessionId;
    const acceptedWorkers = await runActorAndGuardian(
      kernel.baseUrl,
      privateToken,
      acceptedSessionId,
      "mina_accepted",
    );
    assert.equal(acceptedWorkers.guardian.audit.decision, "pass");
    const acceptedFreeze = await requestJson(
      kernel.baseUrl,
      `/threads/${fixture.threadId}/private/runtime/${acceptedSessionId}/freeze`,
      {
        method: "POST",
        headers: privateHeaders(privateToken),
        body: freezeRecord("op_mina_accepted_freeze", acceptedTrace.correlationId),
        expectedStatus: 201,
      },
    );
    assert.equal(acceptedFreeze.body.freeze.report.resultingVersion, 3);

    await restartKernel({ actorMode: "divergent", leaseDurationMs: 5000 });
    const rejectedTrace = await createTrace(kernel.baseUrl, privateToken, {
      requestId: "req_mina_rejected_attempt",
      correlationId: "corr_mina_rejected",
      objective: "Attempt a deliberately divergent M1 cognition episode",
      index: 3,
    });
    const rejectedAcquisition = await acquireRuntime(kernel.baseUrl, privateToken, rejectedTrace, {
      operationId: "op_mina_rejected_acquire",
    });
    const rejectedSessionId = rejectedAcquisition.body.runtime.session.sessionId;
    const rejectedWorkers = await runActorAndGuardian(
      kernel.baseUrl,
      privateToken,
      rejectedSessionId,
      "mina_rejected",
    );
    assert.equal(rejectedWorkers.guardian.audit.decision, "reject");
    const rejectedBefore = await editorJson(
      editor.baseUrl,
      editorToken,
      `/api/editor/threads/${fixture.threadId}/runtimes/${rejectedSessionId}`,
    );
    assert.equal(rejectedBefore.body.runtime.goalGuardianAudit.audit.decision, "reject");
    const abandoned = await requestJson(
      kernel.baseUrl,
      `/threads/${fixture.threadId}/private/runtime/${rejectedSessionId}/abandon`,
      {
        method: "POST",
        headers: privateHeaders(privateToken),
        body: abandonRecord("op_mina_rejected_abandon", rejectedTrace.correlationId),
        expectedStatus: 201,
      },
    );
    assert.equal(abandoned.body.runtime.session.status, "aborted");
    assert.equal(abandoned.body.runtime.lease.status, "released");
    const abandonedThroughEditor = await editorJson(
      editor.baseUrl,
      editorToken,
      `/api/editor/threads/${fixture.threadId}/runtimes/${rejectedSessionId}/abandon`,
    );
    assert.equal(abandonedThroughEditor.body.abandonment.authorizationConsumed, false);
    const explicitRejectOutcome =
      abandoned.body.runtime.session.status === "aborted" &&
      abandoned.body.runtime.lease.status === "released" &&
      abandonedThroughEditor.body.abandonment.authorizationConsumed === false
        ? "abandoned_without_consumption"
        : "unexpected_abandonment_outcome";
    assert.equal(explicitRejectOutcome, "abandoned_without_consumption");

    await restartKernel({ actorMode: "divergent", leaseDurationMs: 1000 });
    const timeoutTrace = await createTrace(kernel.baseUrl, privateToken, {
      requestId: "req_mina_timeout_attempt",
      correlationId: "corr_mina_timeout",
      objective: "Leave a rejected episode unattended until its lease expires",
      index: 4,
    });
    const timeoutAcquisition = await acquireRuntime(kernel.baseUrl, privateToken, timeoutTrace, {
      operationId: "op_mina_timeout_acquire",
    });
    const timeoutSessionId = timeoutAcquisition.body.runtime.session.sessionId;
    const timeoutWorkers = await runActorAndGuardian(
      kernel.baseUrl,
      privateToken,
      timeoutSessionId,
      "mina_timeout",
    );
    assert.equal(timeoutWorkers.guardian.audit.decision, "reject");
    const timeoutExpiresAt = timeoutAcquisition.body.runtime.lease.expiresAt;
    await waitForKernelExpiry(kernel.baseUrl, timeoutExpiresAt);
    const [timeoutHealth, timeoutDetail] = await Promise.all([
      editorJson(editor.baseUrl, editorToken, "/api/editor/health"),
      editorJson(
        editor.baseUrl,
        editorToken,
        `/api/editor/threads/${fixture.threadId}/runtimes/${timeoutSessionId}`,
      ),
    ]);
    const timeoutOutcome = lifecycleOutcome(
      timeoutDetail.body,
      null,
      null,
      timeoutHealth.body.kernel.kernelTime,
    );
    assert.equal(timeoutOutcome.kind, "timeout");
    assert.equal(timeoutOutcome.label, "Timed out — not yet reclaimed");

    await restartKernel({ actorMode: "normal", leaseDurationMs: 5000 });
    const obligationTrace = await createTrace(kernel.baseUrl, privateToken, {
      requestId: "req_mina_obligation_attempt",
      correlationId: "corr_mina_obligation",
      objective: "Honor Mina's recorded identity-failure study obligation through one bounded review",
      action: "refuse",
      score: 8,
      index: 5,
    });
    const obligationAcquisition = await acquireRuntime(kernel.baseUrl, privateToken, obligationTrace, {
      operationId: "op_mina_obligation_acquire",
      obligationReferences: [OBLIGATION],
    });
    const obligationSessionId = obligationAcquisition.body.runtime.session.sessionId;
    const timeoutAfterReclaim = await requestJson(
      kernel.baseUrl,
      `/threads/${fixture.threadId}/private/runtime/${timeoutSessionId}`,
      { headers: privateHeaders(privateToken) },
    );
    assert.equal(timeoutAfterReclaim.body.runtime.session.status, "aborted");
    assert.equal(timeoutAfterReclaim.body.runtime.lease.status, "expired");
    const obligationWorkers = await runActorAndGuardian(
      kernel.baseUrl,
      privateToken,
      obligationSessionId,
      "mina_obligation",
    );
    assert.equal(obligationWorkers.guardian.audit.decision, "pass");
    const obligationFreeze = await requestJson(
      kernel.baseUrl,
      `/threads/${fixture.threadId}/private/runtime/${obligationSessionId}/freeze`,
      {
        method: "POST",
        headers: privateHeaders(privateToken),
        body: freezeRecord("op_mina_obligation_freeze", obligationTrace.correlationId),
        expectedStatus: 201,
      },
    );
    assert.equal(obligationFreeze.body.freeze.report.resultingVersion, 4);
    assert.deepEqual(
      obligationFreeze.body.freeze.report.dischargedObligations,
      [OBLIGATION],
    );

    const reuseTrace = await createTrace(kernel.baseUrl, privateToken, {
      requestId: "req_mina_obligation_reuse",
      correlationId: "corr_mina_obligation_reuse",
      objective: "Attempt to reuse Mina's discharged obligation",
      action: "refuse",
      score: 8,
      index: 6,
    });
    const reuse = await acquireRuntime(kernel.baseUrl, privateToken, reuseTrace, {
      operationId: "op_mina_obligation_reuse",
      obligationReferences: [OBLIGATION],
      expectedStatus: 422,
    });
    assert.equal(reuse.body.error.code, "PARTICIPATION_AUTHORIZATION_REJECTED");

    const beforeFinalRestart = await requestJson(
      kernel.baseUrl,
      `/threads/${fixture.threadId}/integrity`,
    );
    await restartKernel({ actorMode: "normal", leaseDurationMs: 5000 });

    const finalInspection = await editorJson(
      editor.baseUrl,
      editorToken,
      `/api/editor/threads/${fixture.threadId}`,
    );
    const finalThread = finalInspection.body.thread;
    const finalIntegrity = finalInspection.body.integrity;
    assert.equal(finalThread.version, 4);
    assert.equal(finalIntegrity.stateHash, beforeFinalRestart.body.stateHash);
    assert.deepEqual(
      finalInspection.body.events.map((event) => event.eventType),
      ["THREAD_SEEDED", "SELF_MODEL_UPDATED", "THREAD_FROZEN", "THREAD_FROZEN"],
    );
    assert.equal(finalThread.currentState.unresolvedIntentions.includes(OBLIGATION), false);
    assert.equal(finalIntegrity.memoryProjection.freezeCreatedMemoryCount, 2);
    const activeRuntimes = finalInspection.body.private.runtimes.filter(
      (runtime) => runtime.status === "active" || runtime.lease?.status === "active",
    );
    assert.equal(activeRuntimes.length, 0);

    const acceptedIntegrity = await editorJson(
      editor.baseUrl,
      editorToken,
      `/api/editor/threads/${fixture.threadId}/runtimes/${acceptedSessionId}/freeze/integrity`,
    );
    const obligationIntegrity = await editorJson(
      editor.baseUrl,
      editorToken,
      `/api/editor/threads/${fixture.threadId}/runtimes/${obligationSessionId}/freeze/integrity`,
    );
    assert.equal(acceptedIntegrity.body.threadId, fixture.threadId);
    assert.equal(acceptedIntegrity.body.sessionId, acceptedSessionId);
    assert.equal(acceptedIntegrity.body.resultingVersion, 3);
    assert.equal(acceptedIntegrity.body.runtimeCompleted, true);
    assert.equal(acceptedIntegrity.body.leaseReleased, true);
    assert.equal(obligationIntegrity.body.threadId, fixture.threadId);
    assert.equal(obligationIntegrity.body.sessionId, obligationSessionId);
    assert.equal(obligationIntegrity.body.resultingVersion, 4);
    assert.equal(obligationIntegrity.body.resultingStateHash, finalIntegrity.stateHash);
    assert.equal(obligationIntegrity.body.runtimeCompleted, true);
    assert.equal(obligationIntegrity.body.leaseReleased, true);

    const consumedReplay = await requestJson(
      kernel.baseUrl,
      `/threads/${fixture.threadId}/private/runtime/${obligationSessionId}/freeze`,
      {
        method: "POST",
        headers: privateHeaders(privateToken),
        body: freezeRecord("op_mina_obligation_replay", obligationTrace.correlationId),
        expectedStatus: 409,
      },
    );
    assert.equal(consumedReplay.body.error.code, "AUTHORIZATION_CONSUMED");

    const finalRuntimes = await requestJson(
      kernel.baseUrl,
      `/threads/${fixture.threadId}/private/runtime`,
      { headers: privateHeaders(privateToken) },
    );
    const bySession = new Map(finalRuntimes.body.runtimes.map((item) => [item.sessionId, item]));
    assert.equal(bySession.get(acceptedSessionId).status, "completed");
    assert.equal(bySession.get(rejectedSessionId).status, "aborted");
    assert.equal(bySession.get(timeoutSessionId).status, "aborted");
    assert.equal(bySession.get(obligationSessionId).status, "completed");

    return {
      milestone: "M1 Persistent Thread Round Trip",
      threadId: fixture.threadId,
      threadName: fixture.identity.name,
      databasePath: keepDatabase ? databasePath : null,
      final: {
        version: finalThread.version,
        stateHash: finalIntegrity.stateHash,
        eventTypes: finalInspection.body.events.map((event) => event.eventType),
        freezeCreatedMemoryCount: finalIntegrity.memoryProjection.freezeCreatedMemoryCount,
        unresolvedIntentions: finalThread.currentState.unresolvedIntentions,
        activeRuntimeCount: activeRuntimes.length,
      },
      proofs: {
        seedRestartStable: restartInspection.body.integrity.stateHash === seededHash,
        staleAttemptRejected: staleAcquisition.body.error.code,
        correlatedRecovery: acceptedTrace.correlationId === staleTrace.correlationId,
        acceptedGuardianDecision: acceptedWorkers.guardian.audit.decision,
        explicitRejectGuardianDecision: rejectedWorkers.guardian.audit.decision,
        explicitRejectOutcome,
        unattendedRejectOutcome: timeoutOutcome.label,
        timeoutReclaimedAs: {
          session: timeoutAfterReclaim.body.runtime.session.status,
          lease: timeoutAfterReclaim.body.runtime.lease.status,
        },
        obligationDischarged: !finalThread.currentState.unresolvedIntentions.includes(OBLIGATION),
        obligationReuseRejected: reuse.body.error.code,
        replayRejected: consumedReplay.body.error.code,
        finalReplayEqual: finalIntegrity.stateHash === beforeFinalRestart.body.stateHash,
        editorPrivateInspection: finalInspection.body.private.available,
      },
      sessions: {
        accepted: acceptedSessionId,
        explicitlyAbandoned: rejectedSessionId,
        timedOut: timeoutSessionId,
        obligationMediated: obligationSessionId,
      },
    };
  } finally {
    if (editor !== null) await editor.stop().catch(() => {});
    if (kernel !== null) await kernel.stop().catch(() => {});
    if (!keepDatabase && suppliedDirectory === undefined) {
      rmSync(directory, { recursive: true, force: true });
    }
  }
}

async function main() {
  const keepDatabase = process.argv.includes("--keep-database");
  const report = await runM1MinaRoundTrip({ keepDatabase });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
