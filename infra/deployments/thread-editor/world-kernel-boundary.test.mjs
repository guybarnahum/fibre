import assert from "node:assert/strict";
import test from "node:test";

import {
  createThreadEditorWorldBoundary,
  normalizeThreadEditorWorldUrl,
} from "./world-kernel-boundary.mjs";

const PRIVATE_TOKEN = "thread-editor-private-token-123";

function response(payload, status = 200) {
  return Response.json(payload, { status });
}

test("Thread Editor World boundary accepts only loopback local service origins", () => {
  assert.equal(normalizeThreadEditorWorldUrl("http://127.0.0.1:8787").href, "http://127.0.0.1:8787/");
  assert.throws(() => normalizeThreadEditorWorldUrl("https://127.0.0.1:8787"), /must use http/);
  assert.throws(() => normalizeThreadEditorWorldUrl("http://example.com:8787"), /must target loopback/);
  assert.throws(() => normalizeThreadEditorWorldUrl("http://127.0.0.1:8787/path"), /only scheme/);
});

test("Thread Editor World boundary calls only modern inspection contracts and keeps private token server-side", async () => {
  const calls = [];
  const boundary = createThreadEditorWorldBoundary({
    privateToken: PRIVATE_TOKEN,
    fetchImpl: async (input, init = {}) => {
      const request = input instanceof Request ? input : new Request(input, init);
      calls.push({ pathname: new URL(request.url).pathname, token: request.headers.get("x-fibre-private-token") });
      const pathname = new URL(request.url).pathname;
      if (pathname === "/healthz") return response({ ok: true, service: "world-kernel", provider: "local" });
      if (pathname === "/internal/threads") return response({ ok: true, threadCount: 1, threads: [{ threadId: "thr_modern_001" }] });
      if (pathname === "/internal/threads/thr_modern_001/inspection") {
        return response({ ok: true, inspection: { threadId: "thr_modern_001", thread: { threadId: "thr_modern_001" } } });
      }
      return response({ error: { code: "NOT_FOUND" } }, 404);
    },
  });

  const health = await boundary.health();
  const directory = await boundary.listThreads();
  const inspection = await boundary.inspectThread("thr_modern_001");
  assert.equal(health.provider, "local");
  assert.equal(directory.threads[0].threadId, "thr_modern_001");
  assert.equal(inspection.inspection.threadId, "thr_modern_001");
  assert.deepEqual(calls.map((call) => call.pathname), [
    "/healthz",
    "/internal/threads",
    "/internal/threads/thr_modern_001/inspection",
  ]);
  assert.equal(calls[0].token, null);
  assert.equal(calls[1].token, PRIVATE_TOKEN);
  assert.equal(calls[2].token, PRIVATE_TOKEN);
  assert.equal(calls.some((call) => call.pathname.startsWith("/threads/")), false);
});

test("Thread Editor World boundary rejects malformed identities and malformed upstream contracts", async () => {
  const boundary = createThreadEditorWorldBoundary({
    privateToken: PRIVATE_TOKEN,
    fetchImpl: async () => response({ ok: true, threads: "not-an-array" }),
  });
  await assert.rejects(() => boundary.inspectThread("../escape"), /Thread ID is invalid/);
  await assert.rejects(() => boundary.listThreads(), /directory response is invalid/);
});
