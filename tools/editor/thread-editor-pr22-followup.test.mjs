import assert from "node:assert/strict";
import test from "node:test";

import {
  filterThreads,
  inspectionCounts,
  publicIdentityFacts,
} from "#apps/thread-editor/thread-inspection-model.js";
import {
  closeThreadEditorServer,
  createThreadEditorServer,
  listenThreadEditorServer,
} from "./thread-editor-server.mjs";

const ACCESS_TOKEN = "editor-access-token-123456";

function boundaryFixture() {
  const calls = [];
  return {
    calls,
    boundary: {
      async health() { calls.push("health"); return { ok: true, service: "world-kernel" }; },
      async listThreads() { calls.push("list"); return { ok: true, threadCount: 0, threads: [] }; },
      async inspectThread(threadId) { calls.push(`inspect:${threadId}`); return { ok: true, inspection: { threadId, thread: { threadId } } }; },
    },
  };
}

async function startEditor(boundary) {
  const server = createThreadEditorServer({ worldBoundary: boundary, accessToken: ACCESS_TOKEN });
  const address = await listenThreadEditorServer(server, { host: "127.0.0.1", port: 0 });
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

test("wrong, prefix, suffix, and case-variant editor credentials are refused before World calls", async () => {
  const fixture = boundaryFixture();
  const editor = await startEditor(fixture.boundary);
  try {
    const variants = [
      "0".repeat(ACCESS_TOKEN.length),
      ACCESS_TOKEN.slice(0, 20),
      `x${ACCESS_TOKEN}`,
      ACCESS_TOKEN.toUpperCase(),
    ];
    for (const token of variants) {
      const response = await fetch(`${editor.baseUrl}/api/editor/threads`, {
        headers: { "x-fibre-editor-token": token },
      });
      assert.equal(response.status, 403, token);
      assert.equal((await response.json()).error.code, "EDITOR_TOKEN_REQUIRED");
    }
    assert.deepEqual(fixture.calls, []);
  } finally {
    await closeThreadEditorServer(editor.server);
  }
});

test("modern Thread directory filtering covers name, FIN, identity orientation and Thread ID", () => {
  const threads = [
    { threadId: "thr_mina_001", name: "Mina", fibreIdentityNumber: "1111-11-1111", originOrientation: "original", status: "active" },
    { threadId: "thr_homage_002", name: "Ada", fibreIdentityNumber: "2222-22-2222", originOrientation: "homage", status: "active" },
  ];
  assert.deepEqual(filterThreads(threads, "Mina").map((item) => item.threadId), ["thr_mina_001"]);
  assert.deepEqual(filterThreads(threads, "2222-22").map((item) => item.threadId), ["thr_homage_002"]);
  assert.deepEqual(filterThreads(threads, "homage").map((item) => item.threadId), ["thr_homage_002"]);
  assert.deepEqual(filterThreads(threads, "thr_mina").map((item) => item.threadId), ["thr_mina_001"]);
});

test("modern inspection view model counts independent Thread authorities rather than M1 runtime traces", () => {
  const inspection = {
    events: [{}, {}],
    autobiographicalMemories: [{}, {}, {}],
    situatedLife: { relations: [{}], places: [{}, {}] },
    symbolicGenomes: [{}],
    embodiment: { current: [{}] },
    identity: { current: { claims: [{}, {}], assertions: [{}] } },
  };
  assert.deepEqual(inspectionCounts(inspection), {
    events: 2,
    memories: 3,
    relations: 1,
    places: 2,
    genomes: 1,
    embodiments: 1,
    identityClaims: 2,
    identityAssertions: 1,
  });
});

test("overview facts preserve Thread and Civil Registry identity as separate witnesses", () => {
  const facts = Object.fromEntries(publicIdentityFacts({
    threadId: "thr_modern_001",
    thread: {
      threadId: "thr_modern_001",
      version: 9,
      status: "active",
      identity: {
        name: "Mina",
        originOrientation: "original",
        birthDate: "2004-01-01",
        languages: ["English", "Hebrew"],
        culture: ["desert city", "bookish household"],
      },
    },
    civilRegistration: { fibreIdentityNumber: "1234-56-7890" },
  }));
  assert.equal(facts["Thread ID"], "thr_modern_001");
  assert.equal(facts["Fibre Identity Number"], "1234-56-7890");
  assert.equal(facts.Origin, "original");
  assert.equal(facts.Version, 9);
});
