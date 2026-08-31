import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import { WorldKernelService } from "../src/kernel-service.mjs";
import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import {
  closeWorldKernelHttpServer,
  createWorldKernelHttpServer,
  listenWorldKernelHttpServer,
} from "../src/http-server.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const PRIVATE_TOKEN = "private-token-0123456789";

function activationRequest(overrides = {}) {
  return {
    requestId: "req_api_private_001",
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Review identity-service authorization",
    statedNeed: "Find unsafe authorization boundaries",
    permissions: ["read_design"],
    acceptanceCriteria: "Return a concise review",
    ...overrides,
  };
}

function appraisalBody(overrides = {}) {
  return {
    request: activationRequest(),
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: [],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-05T01:30:00Z",
    causationId: "cause_api_request_001",
    correlationId: "corr_api_request_001",
    ...overrides,
  };
}

function assessment(trace, overrides = {}) {
  return {
    threadId: trace.threadId,
    snapshotVersion: trace.snapshotVersion,
    requestId: trace.requestId,
    requestFingerprint: trace.requestFingerprint,
    policy: { id: "dignity_guardian", version: "1" },
    proposedAction: "clarify",
    score: 65,
    rationale: "The request is promising but its data-retention boundary needs clarification.",
    factors: {
      identityAlignment: "Strong review fit",
      individualizedAdvantage: "Mina has relevant review history",
      requesterNeed: "The request has a concrete need",
      relationalMeaning: "Known collaborator",
      respectAndReciprocity: "Scope is respectful",
      participationTerms: "Retention terms are incomplete",
      obligationsAndOpportunityCost: "No obligation conflict",
    },
    evidenceRefs: ["mem_mina_first_review"],
    repairQuestions: ["What data-retention window applies?"],
    knownAlternatives: [],
    feelings: ["interested", "cautious"],
    conflictingMotives: ["Help quickly", "Protect privacy boundaries"],
    uncertainties: ["Retention policy is absent"],
    relationshipImpact: {
      entity: activationRequest().requester,
      fondnessDelta: 0,
      resentmentDelta: 0,
      rationale: "No relationship change yet.",
      evidenceRefs: [],
    },
    ...overrides,
  };
}

async function startApi({ privateToken = PRIVATE_TOKEN, thread = fixture } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-private-api-"));
  const store = openWorldStore(localWorldStateStorage(join(directory, "world.sqlite")));
  const service = new WorldKernelService(store);
  service.seedThread({ thread });
  const server = createWorldKernelHttpServer({ service, privateToken });
  const address = await listenWorldKernelHttpServer(server, { host: "127.0.0.1", port: 0 });
  return {
    store,
    service,
    server,
    directory,
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await closeWorldKernelHttpServer(server);
      store.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

async function json(url, options = {}) {
  const response = await fetch(url, options);
  return { response, body: await response.json() };
}

function privateHeaders(token = PRIVATE_TOKEN) {
  return { "content-type": "application/json", "x-fibre-private-token": token };
}

test("private routes fail closed while public Thread and event routes reveal no private trace", async () => {
  const disabled = await startApi({ privateToken: null });
  try {
    const unavailable = await json(`${disabled.baseUrl}/threads/${fixture.threadId}/private/requests`, {
      headers: { "x-fibre-private-token": PRIVATE_TOKEN },
    });
    assert.equal(unavailable.response.status, 503);
    assert.equal(unavailable.body.error.code, "PRIVATE_ACCESS_DISABLED");
  } finally { await disabled.close(); }

  const runtime = await startApi();
  try {
    const denied = await json(`${runtime.baseUrl}/threads/${fixture.threadId}/private/requests`, {
      headers: { "x-fibre-private-token": "wrong-private-token" },
    });
    assert.equal(denied.response.status, 403);
    assert.equal(denied.body.error.code, "PRIVATE_TOKEN_REQUIRED");

    const unknownDenied = await json(`${runtime.baseUrl}/threads/${fixture.threadId}/private/unknown`);
    assert.equal(unknownDenied.response.status, 403);
    assert.equal(unknownDenied.body.error.code, "PRIVATE_TOKEN_REQUIRED");
    const unknownAuthorized = await json(`${runtime.baseUrl}/threads/${fixture.threadId}/private/unknown`, {
      headers: { "x-fibre-private-token": PRIVATE_TOKEN },
    });
    assert.equal(unknownAuthorized.response.status, 404);

    const health = await json(`${runtime.baseUrl}/health`);
    assert.equal("privateAccessEnabled" in health.body, false);
    assert.equal("privateRequestSchemaVersion" in health.body, false);

    const publicThread = await json(`${runtime.baseUrl}/threads/${fixture.threadId}`);
    const publicEvents = await json(`${runtime.baseUrl}/threads/${fixture.threadId}/events`);
    assert.equal(JSON.stringify(publicThread.body).includes("privateStance"), false);
    assert.equal(JSON.stringify(publicThread.body).includes("requestFingerprint"), false);
    assert.equal(publicEvents.body.events.length, 1);
  } finally { await runtime.close(); }
});

test("private API persists request, appraisal trace, stance, and integrity with exact retry", async () => {
  const runtime = await startApi();
  try {
    const created = await json(`${runtime.baseUrl}/threads/${fixture.threadId}/private/requests`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify(appraisalBody()),
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.idempotent, false);
    const trace = created.body.trace;
    assert.match(trace.requestFingerprint, /^sha256:[0-9a-f]{64}$/);

    const retry = await json(`${runtime.baseUrl}/threads/${fixture.threadId}/private/requests`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify(appraisalBody()),
    });
    assert.equal(retry.response.status, 200);
    assert.equal(retry.body.idempotent, true);

    const stance = await json(`${runtime.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/stance`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify({
        assessment: assessment(trace),
        recordedAt: "2026-08-05T01:31:00Z",
        causationId: "cause_api_stance_001",
        correlationId: trace.correlationId,
      }),
    });
    assert.equal(stance.response.status, 201);
    assert.equal(stance.body.trace.privateStance.desiredAction, "clarify");
    assert.equal(
      stance.body.trace.privateStanceThreadStateHash,
      stance.body.trace.threadStateHash,
    );

    const listed = await json(`${runtime.baseUrl}/threads/${fixture.threadId}/private/requests`, {
      headers: { "x-fibre-private-token": PRIVATE_TOKEN },
    });
    assert.equal(listed.body.requests.length, 1);
    assert.equal(listed.body.requests[0].desiredAction, "clarify");

    const integrity = await json(`${runtime.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/integrity`, {
      headers: { "x-fibre-private-token": PRIVATE_TOKEN },
    });
    assert.equal(integrity.body.hasPrivateStance, true);
    assert.match(integrity.body.appraisalId, /^app_[0-9a-f]{64}$/);
    assert.match(integrity.body.privateStanceId, /^pst_[0-9a-f]{64}$/);
    assert.equal(integrity.body.privateStanceThreadStateHash, integrity.body.threadStateHash);
    assert.equal((await json(`${runtime.baseUrl}/threads/${fixture.threadId}/events`)).body.events.length, 1);
  } finally { await runtime.close(); }
});

test("private API maps conflicting request reuse and records a historical stance after Thread advancement", async () => {
  const runtime = await startApi();
  try {
    const created = await json(`${runtime.baseUrl}/threads/${fixture.threadId}/private/requests`, {
      method: "POST", headers: privateHeaders(), body: JSON.stringify(appraisalBody()),
    });
    const conflict = await json(`${runtime.baseUrl}/threads/${fixture.threadId}/private/requests`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify(appraisalBody({
        request: activationRequest({ objective: "A different objective under the same request ID" }),
      })),
    });
    assert.equal(conflict.response.status, 409);
    assert.equal(conflict.body.error.code, "PRIVATE_REQUEST_CONFLICT");

    const command = {
      commandId: "cmd_private_api_advance",
      threadId: fixture.threadId,
      expectedVersion: 1,
      type: "UPDATE_SELF_MODEL",
      payload: { selfModel: "I preserve historical appraisals after durable changes.", summary: "Advance." },
      actor: { entityId: "human_guy", kind: "human", displayName: "Guy" },
      occurredAt: "2026-08-05T01:32:00Z",
    };
    const preview = runtime.service.previewCommand(command);
    runtime.service.applyPreviewedCommand({ previewId: preview.previewId, command });

    const historical = await json(`${runtime.baseUrl}/threads/${fixture.threadId}/private/requests/${created.body.trace.requestId}/stance`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify({
        assessment: assessment(created.body.trace),
        recordedAt: "2026-08-05T01:33:00Z",
        causationId: "cause_api_historical_stance",
      }),
    });
    assert.equal(historical.response.status, 201);
    assert.equal(historical.body.trace.snapshotVersion, 1);
    assert.equal(runtime.service.getThread(fixture.threadId).version, 2);
    assert.equal(historical.body.trace.privateStance.desiredAction, "clarify");
  } finally { await runtime.close(); }
});

test("private transport rejects unknown envelope fields and lifecycle-invalid appraisal with 422", async () => {
  const runtime = await startApi();
  try {
    const unknownRequestField = await json(`${runtime.baseUrl}/threads/${fixture.threadId}/private/requests`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify({ ...appraisalBody(), sneaky: true }),
    });
    assert.equal(unknownRequestField.response.status, 400);
    assert.equal(unknownRequestField.body.error.code, "INVALID_REQUEST");
  } finally { await runtime.close(); }

  const activeRuntime = await startApi({
    thread: { ...fixture, status: "active" },
  });
  try {
    const lifecycle = await json(`${activeRuntime.baseUrl}/threads/${fixture.threadId}/private/requests`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify(appraisalBody()),
    });
    assert.equal(lifecycle.response.status, 422);
    assert.equal(lifecycle.body.error.code, "LIFECYCLE_COMMAND_REJECTED");
  } finally { await activeRuntime.close(); }
});
