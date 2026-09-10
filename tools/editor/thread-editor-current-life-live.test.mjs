import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import {
  closeThreadEditorServer,
  createThreadEditorServer,
  listenThreadEditorServer,
} from "./thread-editor-server.mjs";

const PRIVATE_TOKEN = "editor-private-token-123456";
const ACCESS_TOKEN = "editor-access-token-123456";

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

function kernelFixture() {
  const calls = [];
  const currentLife = {
    threadId: "thr_test",
    asOf: "2026-09-10T19:55:00Z",
    now: {
      activity: "Ride with Mom toward the dentist.",
      location: { kind: "transit", fromPlaceRef: "place_home", toPlaceRef: "place_dentist", progress: 0.35 },
      mediatedContext: null,
      reason: "World observation records the trip.",
      resolution: { observedDivergence: false },
    },
    flightPlan: { stops: [] },
    carePlan: null,
    planVsLived: { personal: { status: "delayed" }, careRequirement: { status: "moving", authority: { constraint: "required" } } },
    semanticStates: [{ stateId: "sem_1", dimension: "connection", state: "I still want the comfort of finishing this with Mom nearby." }],
    organismTrace: null,
    provenance: { situationId: "sit_1", planRefs: ["lplan_1"], worldEvidenceRefs: ["evt_world_trip"], semanticStateIds: ["sem_1"] },
  };
  const routes = {
    "/health": { service: "world-kernel", status: "ok", kernelTime: currentLife.asOf },
    "/threads/thr_test": { thread: {
      threadId: "thr_test", version: 1, status: "frozen",
      identity: { name: "Maya", originOrientation: "original", selfDescription: "A child with her own day.", culture: [] },
      genome: { textualTraits: {} },
      currentState: { selfModel: "I get absorbed in what I am learning.", needs: [], feelings: [], unresolvedIntentions: [] },
      memoryRefs: [], relationshipRefs: [], provenance: { lastEventId: "evt_seed" },
    } },
    "/threads/thr_test/events": { events: [{ eventId: "evt_seed", sequence: 1, eventType: "THREAD_SEEDED" }] },
    "/threads/thr_test/integrity": { threadId: "thr_test", version: 1, eventCount: 1, stateHash: "sha256:test" },
    "/threads/thr_test/private/requests": { requests: [] },
    "/threads/thr_test/private/runtime": { runtimes: [] },
    "/threads/thr_test/private/expression": { expressions: [] },
    "/threads/thr_test/private/current-life": { currentLife },
  };
  const server = createServer((request, response) => {
    calls.push({ method: request.method, url: request.url, privateToken: request.headers["x-fibre-private-token"] ?? null });
    const payload = routes[request.url];
    response.writeHead(payload === undefined ? 404 : 200, { "content-type": "application/json" });
    response.end(JSON.stringify(payload ?? { error: { code: "NOT_FOUND", message: "not found" } }));
  });
  return { server, calls, currentLife };
}

test("A3 live current-life projection reaches Thread Editor through private read-only inspection", async () => {
  const kernel = kernelFixture();
  const kernelPort = await listen(kernel.server);
  const editorServer = createThreadEditorServer({
    worldKernelUrl: `http://127.0.0.1:${kernelPort}`,
    privateToken: PRIVATE_TOKEN,
    accessToken: ACCESS_TOKEN,
  });
  const editorAddress = await listenThreadEditorServer(editorServer, { host: "127.0.0.1", port: 0 });
  try {
    const response = await fetch(`http://127.0.0.1:${editorAddress.port}/api/editor/threads/thr_test`, {
      headers: { "x-fibre-editor-token": ACCESS_TOKEN },
    });
    assert.equal(response.status, 200);
    const inspection = await response.json();
    assert.deepEqual(inspection.private.currentLife, kernel.currentLife);

    const currentLifeCall = kernel.calls.find((call) => call.url === "/threads/thr_test/private/current-life");
    assert.deepEqual(currentLifeCall, {
      method: "GET",
      url: "/threads/thr_test/private/current-life",
      privateToken: PRIVATE_TOKEN,
    });
  } finally {
    await closeThreadEditorServer(editorServer);
    await close(kernel.server);
  }
});
