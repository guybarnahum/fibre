import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import test from "node:test";

import {
  IntegrityError,
  StaleThreadVersionError,
  ThreadNotFoundError,
  threadStateHash,
} from "../src/persistence-common.mjs";
import {
  applyCommandToThread,
  commandDigest,
  eventIdForCommand,
} from "../src/persistence-domain.mjs";
import {
  PreviewMismatchError,
  RouteThreadMismatchError,
  WorldKernelService,
  assertRouteThread,
} from "../src/kernel-service.mjs";
import {
  closeWorldKernelHttpServer,
  createWorldKernelHttpServer,
  listenWorldKernelHttpServer,
} from "../src/http-server.mjs";

const seed = {
  threadId: "thr_mina_001",
  version: 1,
  status: "frozen",
  identity: { name: "Mina Park", selfDescription: "Careful infrastructure reviewer" },
  genome: { textualTraits: {}, runtimeBaselines: {} },
  currentState: { needs: [], feelings: [], selfModel: "Initial", unresolvedIntentions: [] },
  relationshipRefs: [],
  memoryRefs: [],
  provenance: { createdAt: "2026-08-02T17:00:00Z", createdBy: "fixture", lastEventId: "evt_seed" },
};

function command(overrides = {}) {
  return {
    commandId: "cmd_mina_self_model_001",
    threadId: seed.threadId,
    expectedVersion: 1,
    type: "UPDATE_SELF_MODEL",
    payload: { selfModel: "Updated", summary: "Mina revised her self-model." },
    actor: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    occurredAt: "2026-08-04T23:45:00Z",
    ...overrides,
  };
}

function seedEvent() {
  return {
    eventId: "evt_seed",
    threadId: seed.threadId,
    sequence: 1,
    expectedVersion: 0,
    resultingVersion: 1,
    eventType: "THREAD_SEEDED",
    commandId: null,
    commandDigest: null,
    payload: { snapshot: structuredClone(seed) },
    actor: { entityId: "fixture", kind: "other", displayName: "fixture" },
    occurredAt: seed.provenance.createdAt,
    stateHash: threadStateHash(seed),
  };
}

class FakeStore {
  constructor() {
    this.thread = structuredClone(seed);
    this.events = [seedEvent()];
    this.repairs = 0;
  }
  storageMetadata() { return { schemaVersion: 1, busyTimeoutMs: 5000 }; }
  seedThread(thread) { return { thread: structuredClone(thread), created: false }; }
  getThread(threadId) {
    if (threadId !== this.thread.threadId) throw new ThreadNotFoundError("not found");
    return structuredClone(this.thread);
  }
  listEvents(threadId) { return threadId === this.thread.threadId ? structuredClone(this.events) : []; }
  applyCommand(input) {
    const prior = this.events.find((event) => event.commandId === input.commandId);
    if (prior) return { thread: this.getThread(input.threadId), event: prior, idempotent: true };
    if (this.thread.version !== input.expectedVersion) throw new StaleThreadVersionError("stale");
    const digest = commandDigest(input);
    const eventId = eventIdForCommand(input, digest);
    const next = applyCommandToThread(this.thread, input, eventId);
    const event = {
      eventId,
      threadId: input.threadId,
      sequence: this.events.length + 1,
      expectedVersion: input.expectedVersion,
      resultingVersion: next.version,
      eventType: "SELF_MODEL_UPDATED",
      commandId: input.commandId,
      commandDigest: digest,
      payload: input.payload,
      actor: input.actor,
      occurredAt: input.occurredAt,
      stateHash: threadStateHash(next),
    };
    this.thread = next;
    this.events.push(event);
    return { thread: structuredClone(next), event: structuredClone(event), idempotent: false };
  }
  verifyThreadIntegrity(threadId) {
    return { threadId, version: this.thread.version, stateHash: threadStateHash(this.thread), eventCount: this.events.length };
  }
  repairThreadProjection() {
    this.repairs += 1;
    return { thread: this.getThread(seed.threadId), repaired: true, eventCount: this.events.length };
  }
}

async function startApi(options = {}) {
  const store = options.store ?? new FakeStore();
  const service = new WorldKernelService(store);
  const server = createWorldKernelHttpServer({
    service,
    adminToken: options.adminToken ?? null,
    onError: options.onError ?? (() => {}),
    ...(options.maxBodyBytes === undefined ? {} : { maxBodyBytes: options.maxBodyBytes }),
  });
  const address = await listenWorldKernelHttpServer(server, { host: "127.0.0.1", port: 0 });
  return { store, server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function json(url, options = {}) {
  const response = await fetch(url, options);
  return { response, body: await response.json() };
}

async function rawHostRequest(url, host) {
  const target = new URL(url);
  return await new Promise((resolve, reject) => {
    const request = httpRequest({ hostname: target.hostname, port: target.port, path: target.pathname, headers: { host } }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode, body: JSON.parse(Buffer.concat(chunks)) }));
    });
    request.on("error", reject);
    request.end();
  });
}

test("preview is deterministic, read-only, exact, and restart-safe for idempotent retry", () => {
  const store = new FakeStore();
  const service = new WorldKernelService(store);
  const preview = service.previewCommand(command());
  assert.equal(preview.previewId, service.previewCommand(command()).previewId);
  assert.match(preview.previewId, /^prv_[0-9a-f]{64}$/);
  assert.equal(store.thread.version, 1);
  assert.equal(store.events.length, 1);
  assert.equal(service.applyPreviewedCommand({ previewId: preview.previewId, command: command() }).idempotent, false);
  assert.equal(service.applyPreviewedCommand({ previewId: preview.previewId, command: command() }).idempotent, true);
  assert.equal(store.events.length, 2);
});

test("modified, stale, cross-Thread, and divergent storage results fail visibly", () => {
  const store = new FakeStore();
  const service = new WorldKernelService(store);
  const preview = service.previewCommand(command());
  assert.throws(() => service.applyPreviewedCommand({
    previewId: preview.previewId,
    command: command({ payload: { selfModel: "Changed", summary: "Changed" } }),
  }), PreviewMismatchError);
  assert.throws(() => assertRouteThread("thr_other", command()), RouteThreadMismatchError);
  store.applyCommand(command());
  assert.throws(() => service.previewCommand(command({ commandId: "cmd_stale" })), StaleThreadVersionError);

  const divergent = new FakeStore();
  const original = divergent.applyCommand.bind(divergent);
  divergent.applyCommand = (input) => {
    const result = original(input);
    return { ...result, event: { ...result.event, stateHash: `sha256:${"0".repeat(64)}` } };
  };
  const guarded = new WorldKernelService(divergent);
  const guardedPreview = guarded.previewCommand(command());
  assert.throws(() => guarded.applyPreviewedCommand({ previewId: guardedPreview.previewId, command: command() }), IntegrityError);
});

test("HTTP exposes preview/apply with stable no-store responses and bounded contracts", async () => {
  const runtime = await startApi({ maxBodyBytes: 1024 });
  try {
    const health = await json(`${runtime.baseUrl}/health`);
    assert.equal(health.response.status, 200);
    assert.equal(health.response.headers.get("cache-control"), "no-store");
    assert.equal(health.response.headers.get("access-control-allow-origin"), null);

    const preview = await json(`${runtime.baseUrl}/threads/${seed.threadId}/commands/preview`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "test_request_1" },
      body: JSON.stringify({ command: command() }),
    });
    assert.equal(preview.response.status, 200);
    assert.equal(preview.response.headers.get("x-request-id"), "test_request_1");
    assert.equal(runtime.store.thread.version, 1);

    const applied = await json(`${runtime.baseUrl}/threads/${seed.threadId}/commands`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ previewId: preview.body.previewId, command: command() }),
    });
    assert.equal(applied.response.status, 201);
    assert.equal(applied.body.thread.version, 2);

    const method = await json(`${runtime.baseUrl}/health`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert.equal(method.response.status, 405);
    assert.equal(method.response.headers.get("allow"), "GET");
    const oversized = await json(`${runtime.baseUrl}/threads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ thread: { padding: "x".repeat(2048) } }),
    });
    assert.equal(oversized.response.status, 413);
  } finally {
    await closeWorldKernelHttpServer(runtime.server);
  }
});

test("administrative repair, loopback routing, and integrity errors keep protected boundaries", async () => {
  const disabled = await startApi();
  try {
    const repair = await json(`${disabled.baseUrl}/threads/${seed.threadId}/repair-projection`, {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}",
    });
    assert.equal(repair.body.error.code, "REPAIR_DISABLED");
    const host = await rawHostRequest(`${disabled.baseUrl}/health`, "attacker.example");
    assert.equal(host.status, 421);
    assert.equal(host.body.error.code, "MISDIRECTED_REQUEST");
  } finally { await closeWorldKernelHttpServer(disabled.server); }

  const store = new FakeStore();
  store.verifyThreadIntegrity = () => { throw new IntegrityError("secret database detail"); };
  const logged = [];
  const protectedRuntime = await startApi({ store, adminToken: "0123456789abcdef", onError: (error) => logged.push(error) });
  try {
    const denied = await json(`${protectedRuntime.baseUrl}/threads/${seed.threadId}/repair-projection`, {
      method: "POST", headers: { "content-type": "application/json", "x-fibre-admin-token": "wrong-wrong-wrong" }, body: "{}",
    });
    assert.equal(denied.response.status, 403);
    const accepted = await json(`${protectedRuntime.baseUrl}/threads/${seed.threadId}/repair-projection`, {
      method: "POST", headers: { "content-type": "application/json", "x-fibre-admin-token": "0123456789abcdef" }, body: "{}",
    });
    assert.equal(accepted.response.status, 200);
    const integrity = await json(`${protectedRuntime.baseUrl}/threads/${seed.threadId}/integrity`);
    assert.equal(integrity.response.status, 503);
    assert.equal(integrity.body.error.message, "Authoritative Thread data failed integrity validation");
    assert.equal(JSON.stringify(integrity.body).includes("secret database detail"), false);
    assert.equal(logged.length, 1);
  } finally { await closeWorldKernelHttpServer(protectedRuntime.server); }
});
