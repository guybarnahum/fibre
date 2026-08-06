import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  closeThreadEditorServer,
  createThreadEditorServer,
  listenThreadEditorServer,
  normalizeWorldKernelUrl,
} from "./thread-editor-server.mjs";

const PRIVATE_TOKEN = "editor-private-token-123456";
const ACCESS_TOKEN = "editor-access-token-123456";
const KERNEL_TIME = "2026-08-05T23:30:00.000Z";

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return null;
  const text = Buffer.concat(chunks).toString("utf8");
  try { return JSON.parse(text); } catch { return text; }
}

function fakeKernel() {
  const calls = [];
  const server = createServer(async (request, response) => {
    const body = await readBody(request);
    calls.push({ method: request.method, url: request.url, headers: request.headers, body });
    const routes = {
      "/health": { service: "world-kernel", status: "ok", kernelTime: KERNEL_TIME },
      "/threads/thr_test": { thread: {
        threadId: "thr_test", version: 3, status: "frozen",
        identity: { name: "Test Thread", originOrientation: "original", selfDescription: "A test Thread.", culture: [] },
        genome: { textualTraits: {} },
        currentState: { selfModel: "Current self.", needs: [], feelings: [], unresolvedIntentions: [] },
        memoryRefs: [], relationshipRefs: [], provenance: { lastEventId: "evt_3" },
      } },
      "/threads/thr_test/events": { events: [{ eventId: "evt_3", sequence: 3, eventType: "THREAD_FROZEN" }] },
      "/threads/thr_test/integrity": { threadId: "thr_test", version: 3, eventCount: 3, stateHash: "sha256:test", memoryProjection: { freezeCreatedMemoryCount: 0 } },
      "/threads/thr_test/private/requests": { requests: [{ requestId: "req_1", objective: "Inspect", requester: { displayName: "Guy" } }] },
      "/threads/thr_test/private/runtime": { runtimes: [{ sessionId: "run_1", status: "completed", leaseStatus: "released" }] },
      "/threads/thr_test/private/requests/req_1": { trace: { requestId: "req_1", privateRationale: "restricted" } },
      "/threads/thr_test/private/requests/req_1/integrity": { requestId: "req_1", valid: true },
      "/threads/thr_test/private/runtime/run_1": { runtime: { session: { sessionId: "run_1", status: "completed" }, lease: { status: "released" } } },
      "/threads/thr_test/private/runtime/run_1/integrity": { sessionId: "run_1", valid: true },
    };
    if (request.url === "/threads/thr_test/commands/preview" && request.method === "POST") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ previewId: "prv_test", resultingThread: { version: 4 } }));
      return;
    }
    const payload = routes[request.url];
    if (payload === undefined) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { code: "NOT_FOUND", message: "not found" } }));
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(payload));
  });
  return { server, calls };
}

async function startEditor(kernelPort, options = {}) {
  const server = createThreadEditorServer({
    worldKernelUrl: `http://127.0.0.1:${kernelPort}`,
    privateToken: PRIVATE_TOKEN,
    accessToken: ACCESS_TOKEN,
    ...options,
  });
  const address = await listenThreadEditorServer(server, { host: "127.0.0.1", port: 0 });
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

function editorFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      "x-fibre-editor-token": ACCESS_TOKEN,
      ...(options.headers ?? {}),
    },
  });
}

function requestWithHost(port, path, host) {
  return new Promise((resolve, reject) => {
    const request = httpRequest({ hostname: "127.0.0.1", port, path, headers: { host } }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) }));
    });
    request.on("error", reject);
    request.end();
  });
}

test("editor API requires a per-run credential before public or private inspection", async () => {
  const kernel = fakeKernel();
  const kernelPort = await listen(kernel.server);
  const editor = await startEditor(kernelPort);
  try {
    for (const path of [
      "/api/editor/health",
      "/api/editor/threads/thr_test",
      "/api/editor/threads/thr_test/requests/req_1",
      "/api/editor/threads/thr_test/runtimes/run_1",
    ]) {
      const response = await fetch(`${editor.baseUrl}${path}`);
      assert.equal(response.status, 403, path);
      assert.equal((await response.json()).error.code, "EDITOR_TOKEN_REQUIRED");
    }
    assert.equal(kernel.calls.length, 0);
  } finally {
    await closeThreadEditorServer(editor.server);
    await close(kernel.server);
  }
});

test("editor inspection aggregates public and private data without exposing either token", async () => {
  const kernel = fakeKernel();
  const kernelPort = await listen(kernel.server);
  const editor = await startEditor(kernelPort);
  try {
    const response = await editorFetch(`${editor.baseUrl}/api/editor/threads/thr_test`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.mode, "inspection");
    assert.equal(payload.kernel.kernelTime, KERNEL_TIME);
    assert.equal(payload.capabilities.editorCredentialRequired, true);
    assert.equal(payload.capabilities.commandPreview, true);
    assert.equal(payload.capabilities.commandAcceptance, false);
    assert.equal(payload.capabilities.freeze, false);
    assert.equal(payload.capabilities.obligationMutation, false);
    assert.equal(payload.private.requests.length, 1);
    assert.equal(payload.private.runtimes.length, 1);
    assert.equal(JSON.stringify(payload).includes(PRIVATE_TOKEN), false);
    assert.equal(JSON.stringify(payload).includes(ACCESS_TOKEN), false);
    const privateCalls = kernel.calls.filter((call) => call.url.includes("/private/"));
    assert.equal(privateCalls.length, 2);
    assert.ok(privateCalls.every((call) => call.headers["x-fibre-private-token"] === PRIVATE_TOKEN));
  } finally {
    await closeThreadEditorServer(editor.server);
    await close(kernel.server);
  }
});

test("editor preview is JSON-only, bounded, exact-keyed, kernel-timed, and non-transferable", async () => {
  const kernel = fakeKernel();
  const kernelPort = await listen(kernel.server);
  const editor = await startEditor(kernelPort, { maxBodyBytes: 1024 });
  const endpoint = `${editor.baseUrl}/api/editor/threads/thr_test/preview-self-model`;
  try {
    const plain = await editorFetch(endpoint, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ selfModel: "Cross-origin form shape" }),
    });
    assert.equal(plain.status, 415);
    assert.equal((await plain.json()).error.code, "UNSUPPORTED_MEDIA_TYPE");

    const unknown = await editorFetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ selfModel: "A model", unexpected: true }),
    });
    assert.equal(unknown.status, 400);
    assert.equal((await unknown.json()).error.code, "INVALID_REQUEST");

    const oversized = await editorFetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ selfModel: "x".repeat(2048) }),
    });
    assert.equal(oversized.status, 413);

    const response = await editorFetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ selfModel: "A proposed self-model.", summary: "Preview only." }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.command.type, "UPDATE_SELF_MODEL");
    assert.equal(payload.command.expectedVersion, 3);
    assert.equal(payload.command.occurredAt, KERNEL_TIME);
    assert.equal(payload.command.payload.selfModel, "A proposed self-model.");
    assert.equal(payload.preview.previewId, undefined);
    assert.equal(payload.receipt.previewIdRedacted, true);
    assert.equal(payload.receipt.commandAcceptanceRequiresAdminToken, true);
    const previewCall = kernel.calls.find((call) => call.url.endsWith("/commands/preview"));
    assert.equal(previewCall.method, "POST");
    assert.equal(previewCall.body.command.commandId.startsWith("cmd_editor_"), true);
    assert.equal(kernel.calls.some((call) => call.url === "/threads/thr_test/commands"), false);
  } finally {
    await closeThreadEditorServer(editor.server);
    await close(kernel.server);
  }
});

test("runtime and request allow-lists reject encoded traversal without forwarding", async () => {
  const kernel = fakeKernel();
  const kernelPort = await listen(kernel.server);
  const editor = await startEditor(kernelPort);
  try {
    const before = kernel.calls.length;
    for (const path of [
      "/api/editor/threads/thr_test/runtimes/run_1/..%2F..%2Frequests",
      "/api/editor/threads/thr_test/requests/req_1/..%2Fintegrity",
      "/api/editor/threads/thr_test/runtimes/run_1/freeze/integrity/extra",
    ]) {
      const response = await editorFetch(`${editor.baseUrl}${path}`);
      assert.equal(response.status, 404, path);
      assert.equal((await response.json()).error.code, "EDITOR_ROUTE_NOT_FOUND");
    }
    assert.equal(kernel.calls.length, before);
  } finally {
    await closeThreadEditorServer(editor.server);
    await close(kernel.server);
  }
});

test("editor private inspection and drill-down fail closed when no private token is configured", async () => {
  const kernel = fakeKernel();
  const kernelPort = await listen(kernel.server);
  const editor = await startEditor(kernelPort, { privateToken: null });
  try {
    const inspection = await (await editorFetch(`${editor.baseUrl}/api/editor/threads/thr_test`)).json();
    assert.equal(inspection.private.available, false);
    assert.deepEqual(inspection.private.requests, []);
    assert.deepEqual(inspection.private.runtimes, []);
    assert.equal(kernel.calls.some((call) => call.url.includes("/private/")), false);

    for (const path of [
      "/api/editor/threads/thr_test/requests",
      "/api/editor/threads/thr_test/requests/req_1",
      "/api/editor/threads/thr_test/runtimes",
      "/api/editor/threads/thr_test/runtimes/run_1",
    ]) {
      const detail = await editorFetch(`${editor.baseUrl}${path}`);
      assert.equal(detail.status, 503, path);
      assert.equal((await detail.json()).error.code, "EDITOR_PRIVATE_ACCESS_DISABLED");
    }
  } finally {
    await closeThreadEditorServer(editor.server);
    await close(kernel.server);
  }
});

test("editor and upstream configuration are loopback-only", async () => {
  assert.throws(() => normalizeWorldKernelUrl("https://example.com"), /must use http|loopback/);
  assert.throws(() => normalizeWorldKernelUrl("http://10.0.0.1:8787"), /loopback/);
  assert.throws(() => normalizeWorldKernelUrl("http://127.0.0.1:8787?x=1"), /only scheme/);
  const kernel = fakeKernel();
  const kernelPort = await listen(kernel.server);
  const editor = await startEditor(kernelPort);
  try {
    const port = editor.server.address().port;
    const response = await requestWithHost(port, "/api/editor/health", "evil.example");
    assert.equal(response.status, 421);
    assert.equal(response.body.error.code, "MISDIRECTED_REQUEST");
  } finally {
    await closeThreadEditorServer(editor.server);
    await close(kernel.server);
  }
});

test("static editor rejects encoded traversal and symbolic links", async () => {
  const kernel = fakeKernel();
  const kernelPort = await listen(kernel.server);
  const directory = mkdtempSync(join(tmpdir(), "fibre-editor-static-"));
  const root = join(directory, "root");
  const outside = join(directory, "outside");
  mkdirSync(root);
  mkdirSync(outside);
  writeFileSync(join(root, "index.html"), "inside");
  writeFileSync(join(outside, "secret.txt"), "SECRET-OUTSIDE");
  symlinkSync(join(outside, "secret.txt"), join(root, "linked-file.txt"));
  symlinkSync(outside, join(root, "linked-directory"));
  const editor = await startEditor(kernelPort, { rootDirectory: root });
  try {
    assert.equal((await fetch(`${editor.baseUrl}/`)).status, 200);
    for (const path of [
      "/%2e%2e%2foutside%2fsecret.txt",
      "/linked-file.txt",
      "/linked-directory/secret.txt",
    ]) {
      const response = await fetch(`${editor.baseUrl}${path}`);
      assert.equal(response.status, 403, path);
      assert.equal((await response.json()).error.code, "FORBIDDEN");
    }
  } finally {
    await closeThreadEditorServer(editor.server);
    await close(kernel.server);
    rmSync(directory, { recursive: true, force: true });
  }
});

test("static editor responses use same-origin CSP and no-store", async () => {
  const kernel = fakeKernel();
  const kernelPort = await listen(kernel.server);
  const editor = await startEditor(kernelPort);
  try {
    const response = await fetch(`${editor.baseUrl}/`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-security-policy"), /connect-src 'self'/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await response.text()).includes("Inspection boundary"), true);
  } finally {
    await closeThreadEditorServer(editor.server);
    await close(kernel.server);
  }
});
