import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import { openRuntimeStore } from "../src/runtime-store.mjs";
import { M1RuntimeWorldKernelService } from "../src/runtime-service.mjs";
import {
  RuntimeConflictError,
  RuntimeStateChangedError,
} from "../src/runtime-domain.mjs";
import {
  closeWorldKernelHttpServer,
  createWorldKernelHttpServer,
  listenWorldKernelHttpServer,
} from "../src/http-server.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const PRIVATE_TOKEN = "private-runtime-token-012345";

function controlledClock(start = "2026-08-05T05:02:00Z") {
  let value = Date.parse(start);
  return {
    clock: () => new Date(value),
    advance(milliseconds) { value += milliseconds; },
    iso() { return new Date(value).toISOString(); },
  };
}

function activationRequest(requestId = "req_runtime_api") {
  return {
    requestId,
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Evaluate a bounded website security review",
    statedNeed: "Identify authorization and privacy risks",
    permissions: ["read_design"],
    acceptanceCriteria: "Return concise findings",
  };
}

function appraisalBody(requestId = "req_runtime_api") {
  return {
    request: activationRequest(requestId),
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: [],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-05T05:00:00Z",
    causationId: `cause_${requestId}`,
    correlationId: `corr_${requestId}`,
  };
}

function assessment(trace, action = "accept", score = 82) {
  return {
    threadId: trace.threadId,
    snapshotVersion: trace.snapshotVersion,
    requestId: trace.requestId,
    requestFingerprint: trace.requestFingerprint,
    policy: { id: "dignity_guardian", version: "1" },
    proposedAction: action,
    score,
    rationale: "The request is bounded and evidence-bearing.",
    factors: {
      identityAlignment: "Strong fit",
      individualizedAdvantage: "Uses Mina's history",
      requesterNeed: "Concrete need",
      relationalMeaning: "Known requester",
      respectAndReciprocity: "Explicit scope",
      participationTerms: "Bounded",
      obligationsAndOpportunityCost: "No conflict",
    },
    evidenceRefs: ["mem_mina_first_review"],
    repairQuestions: action === "clarify" ? ["What confidentiality boundary applies?"] : [],
    knownAlternatives: [],
    feelings: ["engaged"],
    conflictingMotives: [],
    uncertainties: [],
    relationshipImpact: {
      entity: activationRequest(trace.requestId).requester,
      fondnessDelta: 0,
      resentmentDelta: 0,
      rationale: "No relationship change.",
      evidenceRefs: [],
    },
  };
}

function acquireBody(operationId = "op_runtime_api") {
  return {
    operationId,
    decision: {
      authorizedAction: "accept",
      rationale: "Proceed with the bounded review.",
      obligationReferences: [],
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
    },
    causationId: `cause_${operationId}`,
    correlationId: `corr_${operationId}`,
  };
}

async function startApi({ leaseDurationMs = 60_000 } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-runtime-api-"));
  const databasePath = join(directory, "world.sqlite");
  const time = controlledClock();
  const store = openWorldStore(databasePath);
  const runtimeStore = openRuntimeStore(databasePath);
  const service = new M1RuntimeWorldKernelService(store, runtimeStore, {
    clock: time.clock,
    leaseDurationMs,
  });
  service.seedThread({ thread: fixture });
  const server = createWorldKernelHttpServer({ service, privateToken: PRIVATE_TOKEN });
  const address = await listenWorldKernelHttpServer(server, { host: "127.0.0.1", port: 0 });
  return {
    directory,
    databasePath,
    time,
    store,
    runtimeStore,
    service,
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await closeWorldKernelHttpServer(server);
      runtimeStore.close();
      store.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

function headers() {
  return { "content-type": "application/json", "x-fibre-private-token": PRIVATE_TOKEN };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  return { response, body: await response.json() };
}

async function createTrace(runtime, requestId = "req_runtime_api", action = "accept", score = 82) {
  const appraisal = await requestJson(`${runtime.baseUrl}/threads/${fixture.threadId}/private/requests`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(appraisalBody(requestId)),
  });
  assert.equal(appraisal.response.status, 201);
  const trace = appraisal.body.trace;
  const stance = await requestJson(
    `${runtime.baseUrl}/threads/${fixture.threadId}/private/requests/${requestId}/stance`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        assessment: assessment(trace, action, score),
        recordedAt: "2026-08-05T05:01:00Z",
        causationId: `cause_stance_${requestId}`,
        correlationId: trace.correlationId,
      }),
    },
  );
  assert.equal(stance.response.status, 201);
  return stance.body.trace;
}

test("runtime routes remain private and public Thread/event routes reveal no runtime", async () => {
  const runtime = await startApi();
  try {
    const denied = await requestJson(
      `${runtime.baseUrl}/threads/${fixture.threadId}/private/runtime`,
    );
    assert.equal(denied.response.status, 403);
    assert.equal(denied.body.error.code, "PRIVATE_TOKEN_REQUIRED");

    const trace = await createTrace(runtime, "req_runtime_api_private");
    const acquired = await requestJson(
      `${runtime.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/runtime`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(acquireBody("op_runtime_api_private")),
      },
    );
    assert.equal(acquired.response.status, 201);
    const sessionId = acquired.body.runtime.session.sessionId;
    const actor = await requestJson(
      `${runtime.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/actor`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ operationId: "op_actor_api_private" }),
      },
    );
    assert.equal(actor.response.status, 201);
    const guardian = await requestJson(
      `${runtime.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/goal-guardian`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ operationId: "op_guardian_api_private" }),
      },
    );
    assert.equal(guardian.response.status, 201);

    const privateMarkers = [
      sessionId,
      acquired.body.runtime.authorization.authorizationId,
      acquired.body.runtime.lease.leaseId,
      actor.body.runtime.actorRun.actorRunId,
      actor.body.runtime.actorRun.output.summary,
      guardian.body.runtime.goalGuardianAudit.auditId,
    ];
    const publicThread = await requestJson(`${runtime.baseUrl}/threads/${fixture.threadId}`);
    const publicEvents = await requestJson(`${runtime.baseUrl}/threads/${fixture.threadId}/events`);
    for (const marker of privateMarkers) {
      assert.equal(JSON.stringify(publicThread.body).includes(marker), false);
      assert.equal(JSON.stringify(publicEvents.body).includes(marker), false);
    }
  } finally {
    await runtime.close();
  }
});

test("runtime HTTP round trip uses kernel timestamps and persists Actor and Guardian", async () => {
  const runtime = await startApi();
  try {
    const trace = await createTrace(runtime);
    const acquired = await requestJson(
      `${runtime.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/runtime`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(acquireBody()),
      },
    );
    assert.equal(acquired.response.status, 201);
    assert.equal(acquired.body.runtime.lease.acquiredAt, runtime.time.iso());
    const sessionId = acquired.body.runtime.session.sessionId;

    const actor = await requestJson(
      `${runtime.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/actor`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ operationId: "op_actor_api" }),
      },
    );
    assert.equal(actor.response.status, 201);
    assert.deepEqual(actor.body.runtime.actorRun.output.toolCalls, []);
    const guardian = await requestJson(
      `${runtime.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/goal-guardian`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ operationId: "op_guardian_api" }),
      },
    );
    assert.equal(guardian.response.status, 201);
    assert.equal(guardian.body.runtime.goalGuardianAudit.audit.decision, "pass");
    const integrity = await requestJson(
      `${runtime.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/integrity`,
      { headers: { "x-fibre-private-token": PRIVATE_TOKEN } },
    );
    assert.equal(integrity.body.goalGuardianDecision, "pass");
  } finally {
    await runtime.close();
  }
});

test("runtime transport rejects caller timestamps, non-accept thaw, wrong order, and real expiry", async () => {
  const runtime = await startApi({ leaseDurationMs: 1000 });
  try {
    const trace = await createTrace(runtime, "req_runtime_api_invalid");
    const timestamp = await requestJson(
      `${runtime.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/runtime`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ ...acquireBody("op_bad_time"), acquiredAt: "2030-01-01T00:00:00Z" }),
      },
    );
    assert.equal(timestamp.response.status, 400);

    const nonAccept = await requestJson(
      `${runtime.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/runtime`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          ...acquireBody("op_non_accept"),
          decision: {
            authorizedAction: "clarify",
            rationale: "Ask first.",
            obligationReferences: [],
          },
        }),
      },
    );
    assert.equal(nonAccept.response.status, 422);
    assert.equal(nonAccept.body.error.code, "PARTICIPATION_AUTHORIZATION_REJECTED");

    const acquired = await requestJson(
      `${runtime.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/runtime`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(acquireBody("op_valid_short")),
      },
    );
    const sessionId = acquired.body.runtime.session.sessionId;
    const early = await requestJson(
      `${runtime.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/goal-guardian`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ operationId: "op_guardian_early" }),
      },
    );
    assert.equal(early.response.status, 409);
    assert.equal(early.body.error.code, "RUNTIME_ORDER_REJECTED");

    runtime.time.advance(1000);
    const late = await requestJson(
      `${runtime.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/actor`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ operationId: "op_actor_late" }),
      },
    );
    assert.equal(late.response.status, 409);
    assert.equal(late.body.error.code, "THAW_LEASE_EXPIRED");
  } finally {
    await runtime.close();
  }
});

test("runtime operation conflict and state-change conflict have distinct HTTP codes", async () => {
  const runtime = await startApi();
  try {
    const trace = await createTrace(runtime, "req_runtime_api_codes");
    const original = runtime.service.acquireThawRuntime.bind(runtime.service);
    runtime.service.acquireThawRuntime = () => {
      throw new RuntimeStateChangedError("Thread changed before acquisition");
    };
    const changed = await requestJson(
      `${runtime.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/runtime`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(acquireBody("op_state_changed")),
      },
    );
    assert.equal(changed.response.status, 409);
    assert.equal(changed.body.error.code, "RUNTIME_STATE_CHANGED");

    runtime.service.acquireThawRuntime = () => {
      throw new RuntimeConflictError("Operation ID already used");
    };
    const conflict = await requestJson(
      `${runtime.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/runtime`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(acquireBody("op_conflict")),
      },
    );
    assert.equal(conflict.response.status, 409);
    assert.equal(conflict.body.error.code, "RUNTIME_CONFLICT");
    runtime.service.acquireThawRuntime = original;
  } finally {
    await runtime.close();
  }
});
