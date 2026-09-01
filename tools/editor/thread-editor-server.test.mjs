import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  closeThreadEditorServer,
  createThreadEditorServer,
  listenThreadEditorServer,
  normalizeWorldKernelUrl,
} from "./thread-editor-server.mjs";

const ACCESS_TOKEN = "editor-access-token-123456";

function boundaryFixture() {
  const calls = [];
  return {
    calls,
    boundary: {
      async health() {
        calls.push(["health"]);
        return { ok: true, service: "world-kernel", provider: "local" };
      },
      async listThreads() {
        calls.push(["listThreads"]);
        return {
          ok: true,
          threadCount: 1,
          threads: [{
            threadId: "thr_modern_001",
            name: "Mina",
            originOrientation: "original",
            status: "active",
            version: 12,
            fibreIdentityNumber: "1234-56-7890",
          }],
        };
      },
      async inspectThread(threadId) {
        calls.push(["inspectThread", threadId]);
        return {
          ok: true,
          inspection: {
            threadId,
            thread: {
              threadId,
              version: 12,
              status: "active",
              identity: { name: "Mina", originOrientation: "original", selfDescription: "A modern Thread." },
            },
            events: [],
            integrity: { world: { threadId, version: 12 }, identity: { threadId, ok: true } },
            civilRegistration: { fibreIdentityNumber: "1234-56-7890" },
            identity: { passport: { canonicalName: "Mina" }, current: {}, memoryVisualCompanions: [] },
            autobiographicalMemories: [],
            situatedLife: { relations: [], places: [] },
            symbolicGenomes: [],
            embodiment: { current: [] },
          },
        };
      },
    },
  };
}

async function startEditor(options = {}) {
  const server = createThreadEditorServer({ accessToken: ACCESS_TOKEN, ...options });
  const address = await listenThreadEditorServer(server, { host: "127.0.0.1", port: 0 });
  return { server, baseUrl: `http://127.0.0.1:${address.port}`, port: address.port };
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
      response.on("end", () => resolve({
        status: response.statusCode,
        body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
      }));
    });
    request.on("error", reject);
    request.end();
  });
}

test("editor API requires the per-run credential before any World inspection", async () => {
  const fixture = boundaryFixture();
  const editor = await startEditor({ worldBoundary: fixture.boundary });
  try {
    for (const path of ["/api/editor/health", "/api/editor/threads", "/api/editor/threads/thr_modern_001"]) {
      const response = await fetch(`${editor.baseUrl}${path}`);
      assert.equal(response.status, 403, path);
      assert.equal((await response.json()).error.code, "EDITOR_TOKEN_REQUIRED");
    }
    assert.deepEqual(fixture.calls, []);
  } finally {
    await closeThreadEditorServer(editor.server);
  }
});

test("editor directory and detail routes expose only modern World inspection results", async () => {
  const fixture = boundaryFixture();
  const editor = await startEditor({ worldBoundary: fixture.boundary });
  try {
    const directory = await (await editorFetch(`${editor.baseUrl}/api/editor/threads`)).json();
    assert.equal(directory.mode, "modern-thread-inspection");
    assert.equal(directory.threadCount, 1);
    assert.equal(directory.threads[0].fibreIdentityNumber, "1234-56-7890");

    const detail = await (await editorFetch(`${editor.baseUrl}/api/editor/threads/thr_modern_001`)).json();
    assert.equal(detail.mode, "modern-thread-inspection");
    assert.equal(detail.inspection.identity.passport.canonicalName, "Mina");
    assert.equal(detail.capabilities.worldInspection, true);
    assert.equal(detail.capabilities.semanticMutation, false);
    assert.equal(detail.capabilities.directStateAccess, false);
    assert.deepEqual(fixture.calls, [
      ["listThreads"],
      ["inspectThread", "thr_modern_001"],
    ]);
  } finally {
    await closeThreadEditorServer(editor.server);
  }
});

test("editor inspection surface is GET-only and removed M1 preview/private drill-down routes do not forward", async () => {
  const fixture = boundaryFixture();
  const editor = await startEditor({ worldBoundary: fixture.boundary });
  try {
    const post = await editorFetch(`${editor.baseUrl}/api/editor/threads/thr_modern_001`, { method: "POST" });
    assert.equal(post.status, 405);
    assert.equal((await post.json()).error.code, "METHOD_NOT_ALLOWED");

    for (const path of [
      "/api/editor/threads/thr_modern_001/preview-self-model",
      "/api/editor/threads/thr_modern_001/requests",
      "/api/editor/threads/thr_modern_001/runtimes",
    ]) {
      const response = await editorFetch(`${editor.baseUrl}${path}`);
      assert.equal(response.status, 404, path);
      assert.equal((await response.json()).error.code, "EDITOR_ROUTE_NOT_FOUND");
    }
    assert.deepEqual(fixture.calls, []);
  } finally {
    await closeThreadEditorServer(editor.server);
  }
});

test("editor health reports application boundary without exposing provider state access", async () => {
  const fixture = boundaryFixture();
  const editor = await startEditor({ worldBoundary: fixture.boundary });
  try {
    const response = await editorFetch(`${editor.baseUrl}/api/editor/health`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.editor.mode, "modern-thread-inspection");
    assert.equal(payload.editor.providerKnowledge, false);
    assert.equal(payload.editor.semanticMutation, false);
    assert.equal(payload.world.provider, "local");
    assert.deepEqual(fixture.calls, [["health"]]);
  } finally {
    await closeThreadEditorServer(editor.server);
  }
});

test("editor remains loopback-only and rejects non-loopback World targets", async () => {
  assert.equal(normalizeWorldKernelUrl("http://127.0.0.1:8787").hostname, "127.0.0.1");
  assert.throws(() => normalizeWorldKernelUrl("http://example.com:8787"), /loopback/);

  const fixture = boundaryFixture();
  const editor = await startEditor({ worldBoundary: fixture.boundary });
  try {
    const result = await requestWithHost(editor.port, "/api/editor/health", "evil.example");
    assert.equal(result.status, 421);
    assert.equal(result.body.error.code, "MISDIRECTED_REQUEST");
    assert.deepEqual(fixture.calls, []);
  } finally {
    await closeThreadEditorServer(editor.server);
  }
});

test("editor static serving rejects symlink escapes", async () => {
  const root = mkdtempSync(join(tmpdir(), "fibre-editor-static-"));
  const outside = join(root, "..", `outside-${Date.now()}.txt`);
  writeFileSync(join(root, "index.html"), "<h1>safe</h1>");
  writeFileSync(outside, "secret");
  symlinkSync(outside, join(root, "leak.txt"));
  const fixture = boundaryFixture();
  const editor = await startEditor({ rootDirectory: root, worldBoundary: fixture.boundary });
  try {
    const safe = await fetch(`${editor.baseUrl}/`);
    assert.equal(safe.status, 200);
    assert.equal(await safe.text(), "<h1>safe</h1>");
    const leak = await fetch(`${editor.baseUrl}/leak.txt`);
    assert.equal(leak.status, 403);
  } finally {
    await closeThreadEditorServer(editor.server);
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { force: true });
  }
});
