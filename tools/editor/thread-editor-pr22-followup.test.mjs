import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import {
  closeThreadEditorServer,
  createThreadEditorServer,
  listenThreadEditorServer,
} from "./thread-editor-server.mjs";
import {
  lifecycleOutcome,
  loadRuntimeInspection,
} from "#apps/thread-editor/editor-model.js";

const ACCESS_TOKEN = "editor-access-token-123456";
const PRIVATE_TOKEN = "editor-private-token-123456";

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

function fakeKernel() {
  const calls = [];
  const server = createServer(async (request, response) => {
    calls.push(request.url);
    const routes = {
      "/health": { service: "world-kernel", status: "ok", kernelTime: "2026-08-06T03:00:10.000Z" },
      "/threads/thr_test": { thread: {
        threadId: "thr_test",
        version: 1,
        status: "frozen",
        identity: { name: "Test", originOrientation: "original", selfDescription: "Test", culture: [] },
        genome: { textualTraits: {} },
        currentState: { selfModel: "Test", needs: [], feelings: [], unresolvedIntentions: [] },
        memoryRefs: [],
        relationshipRefs: [],
      } },
      "/threads/thr_test/events": { events: [] },
      "/threads/thr_test/integrity": { threadId: "thr_test", version: 1, eventCount: 0, stateHash: "sha256:test" },
      "/threads/thr_test/private/requests": { requests: [] },
      "/threads/thr_test/private/runtime": { runtimes: [] },
    };
    if (request.url === "/threads/thr_test/commands/preview") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        previewId: `prv_${"a".repeat(64)}`,
        commandDigest: `sha256:${"b".repeat(64)}`,
        currentStateHash: `sha256:${"c".repeat(64)}`,
        proposedEventId: `evt_${"d".repeat(64)}`,
        proposedStateHash: `sha256:${"e".repeat(64)}`,
        expectedVersion: 1,
        resultingVersion: 2,
      }));
      return;
    }
    const payload = routes[request.url];
    response.writeHead(payload === undefined ? 404 : 200, { "content-type": "application/json" });
    response.end(JSON.stringify(payload ?? { error: { code: "NOT_FOUND", message: "not found" } }));
  });
  return { server, calls };
}

async function startEditor(kernelPort) {
  const server = createThreadEditorServer({
    worldKernelUrl: `http://127.0.0.1:${kernelPort}`,
    privateToken: PRIVATE_TOKEN,
    accessToken: ACCESS_TOKEN,
  });
  const address = await listenThreadEditorServer(server, { host: "127.0.0.1", port: 0 });
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

function withToken(token, options = {}) {
  return {
    ...options,
    headers: {
      "x-fibre-editor-token": token,
      ...(options.headers ?? {}),
    },
  };
}

test("wrong, prefix, suffix, and case-variant editor credentials are refused", async () => {
  const kernel = fakeKernel();
  const kernelPort = await listen(kernel.server);
  const editor = await startEditor(kernelPort);
  try {
    const variants = [
      "0".repeat(ACCESS_TOKEN.length),
      ACCESS_TOKEN.slice(0, 20),
      `x${ACCESS_TOKEN}`,
      ACCESS_TOKEN.toUpperCase(),
    ];
    for (const token of variants) {
      const response = await fetch(
        `${editor.baseUrl}/api/editor/threads/thr_test`,
        withToken(token),
      );
      assert.equal(response.status, 403, token);
      assert.equal((await response.json()).error.code, "EDITOR_TOKEN_REQUIRED");
    }
    assert.equal(kernel.calls.length, 0);
  } finally {
    await closeThreadEditorServer(editor.server);
    await close(kernel.server);
  }
});

test("an unhandled API path returns a prompt authenticated 404", async () => {
  const kernel = fakeKernel();
  const kernelPort = await listen(kernel.server);
  const editor = await startEditor(kernelPort);
  try {
    const response = await fetch(
      `${editor.baseUrl}/api/mistyped`,
      withToken(ACCESS_TOKEN, { signal: AbortSignal.timeout(1000) }),
    );
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, "EDITOR_ROUTE_NOT_FOUND");
    assert.equal(kernel.calls.length, 0);
  } finally {
    await closeThreadEditorServer(editor.server);
    await close(kernel.server);
  }
});

test("preview identity redaction is described as derivable and admin-gated", async () => {
  const kernel = fakeKernel();
  const kernelPort = await listen(kernel.server);
  const editor = await startEditor(kernelPort);
  try {
    const response = await fetch(
      `${editor.baseUrl}/api/editor/threads/thr_test/preview-self-model`,
      withToken(ACCESS_TOKEN, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selfModel: "A proposed model" }),
      }),
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.preview.previewId, undefined);
    assert.equal(body.receipt.previewIdRedacted, true);
    assert.equal(body.receipt.previewIdentityDerivableFromReturnedFields, true);
    assert.equal(body.receipt.commandAcceptanceRequiresAdminToken, true);
  } finally {
    await closeThreadEditorServer(editor.server);
    await close(kernel.server);
  }
});

test("runtime inspection refreshes kernel time and does not call missing time active", async () => {
  const runtime = {
    runtime: {
      session: { status: "active" },
      lease: {
        status: "active",
        expiresAt: "2026-08-06T03:00:05.000Z",
      },
    },
  };
  const unknown = lifecycleOutcome(runtime, null, null, null);
  assert.equal(unknown.kind, "unknown");
  assert.equal(unknown.label, "Expiry unknown");

  const calls = [];
  const result = await loadRuntimeInspection({
    basePath: "/api/editor/threads/thr_test/runtimes/run_test",
    fetchJson: async (path) => {
      calls.push(path);
      if (path === "/api/editor/health") {
        return { kernel: { kernelTime: "2026-08-06T03:00:10.000Z" } };
      }
      if (path.endsWith("/integrity")) return { valid: true };
      return runtime;
    },
    optionalJson: async (path) => {
      calls.push(path);
      return null;
    },
  });
  assert.equal(calls[0], "/api/editor/health");
  assert.equal(result.kernelTime, "2026-08-06T03:00:10.000Z");
  assert.equal(result.outcome.kind, "timeout");
  assert.equal(result.outcome.label, "Timed out — not yet reclaimed");
});
