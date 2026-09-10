import assert from "node:assert/strict";
import test from "node:test";

import {
  closeThreadEditorServer,
  createThreadEditorServer,
  listenThreadEditorServer,
} from "./thread-editor-server.mjs";

const ACCESS_TOKEN = "fid-editor-test-token";

async function withEditor(run) {
  const calls = [];
  const fidService = {
    inspectThread(threadId) {
      calls.push({ method: "inspectThread", threadId });
      return {
        threadId,
        activeCredentialId: "fid_active_1",
        credentials: [{ credential: { credentialId: "fid_active_1" }, status: "active" }],
        workflows: [],
      };
    },
    issueFidCard(request) {
      calls.push({ method: "issueFidCard", request });
      return { accepted: true };
    },
    revokeFidCard(request) {
      calls.push({ method: "revokeFidCard", request });
      return { status: "revoked" };
    },
  };
  const server = createThreadEditorServer({
    worldKernelUrl: "http://127.0.0.1:8787",
    fidService,
    accessToken: ACCESS_TOKEN,
  });
  const address = await listenThreadEditorServer(server, { host: "127.0.0.1", port: 0 });
  try {
    await run({ baseUrl: `http://127.0.0.1:${address.port}`, calls });
  } finally {
    await closeThreadEditorServer(server);
  }
}

function post(baseUrl, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-fibre-editor-token": ACCESS_TOKEN,
    },
    body: JSON.stringify(body),
  });
}

test("Thread Editor requests FID lifecycle actions without acquiring identity authority", () => withEditor(async ({ baseUrl, calls }) => {
  const forbidden = await post(baseUrl, "/api/editor/threads/thr_mira/fid/issue", {
    reason: "initial",
    idempotencyKey: "issue_mira_1",
    fibreIdentityNumber: "8PKH-A4-VH5R",
  });
  assert.equal(forbidden.status, 400);
  assert.equal(calls.some((call) => call.method === "issueFidCard"), false);

  const issued = await post(baseUrl, "/api/editor/threads/thr_mira/fid/issue", {
    reason: "initial",
    idempotencyKey: "issue_mira_1",
  });
  assert.equal(issued.status, 200);
  assert.deepEqual(calls.find((call) => call.method === "issueFidCard").request, {
    threadId: "thr_mira",
    reason: "initial",
    idempotencyKey: "issue_mira_1",
  });

  const wrongThread = await post(baseUrl, "/api/editor/threads/thr_mira/fid/revoke", {
    credentialId: "fid_someone_else",
    reason: "operator_revocation",
  });
  assert.equal(wrongThread.status, 404);
  assert.equal(calls.some((call) => call.method === "revokeFidCard"), false);

  const revoked = await post(baseUrl, "/api/editor/threads/thr_mira/fid/revoke", {
    credentialId: "fid_active_1",
    reason: "operator_revocation",
  });
  assert.equal(revoked.status, 200);
  assert.deepEqual(calls.find((call) => call.method === "revokeFidCard").request, {
    credentialId: "fid_active_1",
    reason: "operator_revocation",
  });
}));
