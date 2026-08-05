import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import { openRuntimeStore } from "../src/runtime-store.mjs";
import { openFreezeStore } from "../src/freeze-store.mjs";
import { M1FreezeWorldKernelService } from "../src/freeze-service.mjs";
import { createFreezeWorldKernelHttpServer } from "../src/freeze-http-server.mjs";
import {
  closeWorldKernelHttpServer,
  listenWorldKernelHttpServer,
} from "../src/http-server.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const PRIVATE_TOKEN = "freeze-private-token-0123456789";

function activationRequest(requestId) {
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

function assessment(trace) {
  return {
    threadId: trace.threadId,
    snapshotVersion: trace.snapshotVersion,
    requestId: trace.requestId,
    requestFingerprint: trace.requestFingerprint,
    policy: { id: "dignity_guardian", version: "1" },
    proposedAction: "accept",
    score: 82,
    rationale: "The request is bounded and aligned.",
    factors: {
      identityAlignment: "Strong fit",
      individualizedAdvantage: "Uses durable context",
      requesterNeed: "Concrete need",
      relationalMeaning: "Known requester",
      respectAndReciprocity: "Explicit terms",
      participationTerms: "Bounded",
      obligationsAndOpportunityCost: "No conflict",
    },
    evidenceRefs: ["mem_mina_first_review"],
    repairQuestions: [],
    knownAlternatives: [],
    feelings: ["careful"],
    conflictingMotives: [],
    uncertainties: [],
    relationshipImpact: {
      entity: activationRequest(trace.requestId).requester,
      fondnessDelta: 0,
      resentmentDelta: 0,
      rationale: "No change.",
      evidenceRefs: [],
    },
  };
}

function acquireBody(requestId) {
  return {
    operationId: `op_acquire_${requestId}`,
    decision: {
      authorizedAction: "accept",
      rationale: "Proceed.",
      obligationReferences: [],
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
    },
    causationId: `cause_acquire_${requestId}`,
    correlationId: `corr_${requestId}`,
  };
}

async function startApi() {
  const directory = mkdtempSync(join(tmpdir(), "fibre-freeze-api-"));
  const databasePath = join(directory, "world.sqlite");
  const store = openWorldStore(databasePath);
  const runtimeStore = openRuntimeStore(databasePath);
  const freezeStore = openFreezeStore(databasePath);
  const service = new M1FreezeWorldKernelService(store, runtimeStore, freezeStore, {
    clock: () => new Date("2026-08-05T21:00:00Z"),
  });
  service.seedThread({ thread: fixture });
  const requestId = "req_freeze_api";
  const trace = service.recordRequestAppraisal(fixture.threadId, {
    request: activationRequest(requestId),
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: [],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-05T20:55:00Z",
    causationId: "cause_freeze_api_request",
    correlationId: "corr_freeze_api",
  }).trace;
  service.recordPrivateStance(fixture.threadId, requestId, {
    assessment: assessment(trace),
    recordedAt: "2026-08-05T20:56:00Z",
    causationId: "cause_freeze_api_stance",
    correlationId: trace.correlationId,
  });
  const runtime = service.acquireThawRuntime(
    fixture.threadId,
    requestId,
    acquireBody(requestId),
  ).runtime;
  service.runDeterministicActor(fixture.threadId, runtime.session.sessionId, {
    operationId: "op_freeze_api_actor",
  });
  service.runGoalGuardian(fixture.threadId, runtime.session.sessionId, {
    operationId: "op_freeze_api_guardian",
  });

  const server = createFreezeWorldKernelHttpServer({ service, privateToken: PRIVATE_TOKEN });
  const address = await listenWorldKernelHttpServer(server, { host: "127.0.0.1", port: 0 });
  return {
    service,
    sessionId: runtime.session.sessionId,
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await closeWorldKernelHttpServer(server);
      freezeStore.close();
      runtimeStore.close();
      store.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  return { response, body: await response.json() };
}

function headers(token = PRIVATE_TOKEN) {
  return { "content-type": "application/json", "x-fibre-private-token": token };
}

function body(operationId = "op_freeze_api") {
  return {
    operationId,
    lifeChangeDecisions: [{
      proposalIndex: 0,
      decision: "accept",
      rationale: "Evidence-bearing memory.",
    }],
    causationId: `cause_${operationId}`,
    correlationId: "corr_freeze_api",
  };
}

test("freeze HTTP route is private, kernel-timed, idempotent, and publicly redacted", async () => {
  const api = await startApi();
  try {
    const route = `${api.baseUrl}/threads/${fixture.threadId}/private/runtime/${api.sessionId}/freeze`;
    const denied = await requestJson(route, {
      method: "POST",
      headers: headers("wrong-freeze-token"),
      body: JSON.stringify(body()),
    });
    assert.equal(denied.response.status, 403);
    assert.equal(denied.body.error.code, "PRIVATE_TOKEN_REQUIRED");

    const forged = await requestJson(route, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ ...body(), completedAt: "2099-01-01T00:00:00Z" }),
    });
    assert.equal(forged.response.status, 400);
    assert.equal(forged.body.error.code, "INVALID_REQUEST");

    const created = await requestJson(route, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body()),
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.idempotent, false);
    assert.equal(created.body.freeze.report.completedAt, "2026-08-05T21:00:00.000Z");

    const retry = await requestJson(route, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body()),
    });
    assert.equal(retry.response.status, 200);
    assert.equal(retry.body.idempotent, true);

    const replay = await requestJson(route, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body("op_freeze_api_replay")),
    });
    assert.equal(replay.response.status, 409);
    assert.equal(replay.body.error.code, "AUTHORIZATION_CONSUMED");

    const report = await requestJson(route, {
      headers: { "x-fibre-private-token": PRIVATE_TOKEN },
    });
    assert.equal(report.response.status, 200);
    assert.equal(report.body.freeze.report.reportId, created.body.freeze.report.reportId);

    const integrity = await requestJson(`${route}/integrity`, {
      headers: { "x-fibre-private-token": PRIVATE_TOKEN },
    });
    assert.equal(integrity.response.status, 200);
    assert.equal(integrity.body.runtimeCompleted, true);

    const publicEvents = await requestJson(`${api.baseUrl}/threads/${fixture.threadId}/events`);
    const serialized = JSON.stringify(publicEvents.body);
    assert.equal(serialized.includes(api.sessionId), false);
    assert.equal(serialized.includes(created.body.freeze.report.reportId), false);
    assert.equal(serialized.includes(created.body.freeze.consumption.authorizationId), false);
  } finally {
    await api.close();
  }
});
