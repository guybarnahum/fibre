import assert from "node:assert/strict";
import test from "node:test";

import { createGenesisBirthWriteApi } from "../src/genesis-birth-write-api.mjs";

const TOKEN = "slice-c-private-token-123";

function request({
  method = "POST",
  path = "/internal/genesis/births",
  token = TOKEN,
  body = { hello: "world" },
  contentType = "application/json",
  activityRequestId = null,
  activityParentOperationId = null,
} = {}) {
  const headers = { "content-type": contentType, "x-request-id": "req_slice_c" };
  if (token !== null) headers["x-fibre-private-token"] = token;
  if (activityRequestId !== null) headers["x-fibre-activity-request-id"] = activityRequestId;
  if (activityParentOperationId !== null) headers["x-fibre-activity-parent-operation-id"] = activityParentOperationId;
  return new Request(`https://world.internal${path}`, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}

test("birth publication keeps Activity correlation outside the authoritative birth bundle", async () => {
  const calls = [];
  const api = createGenesisBirthWriteApi({
    privateToken: TOKEN,
    birthPublisher: {
      async publishBirth(bundle, options) {
        calls.push({ bundle, options });
        return { idempotent: calls.length > 1, thread: { threadId: "thr_slice_c" } };
      },
    },
  });

  const first = await api.fetch(request({
    activityRequestId: "req_genesis_activity_001",
    activityParentOperationId: "op_birth_world_submit_001",
  }));
  assert.equal(first.status, 201);
  assert.equal((await first.json()).thread.threadId, "thr_slice_c");
  assert.deepEqual(calls[0].options, {
    activityContext: {
      requestId: "req_genesis_activity_001",
      parentOperationId: "op_birth_world_submit_001",
    },
  });
  assert.deepEqual(calls[0].bundle, { hello: "world" });
  assert.equal(JSON.stringify(calls[0].bundle).includes("req_genesis_activity_001"), false);

  const second = await api.fetch(request());
  assert.equal(second.status, 200);
  assert.deepEqual(calls[1].options, { activityContext: {} });
  assert.equal(calls.length, 2);
});

test("malformed activity correlation is ignored rather than blocking authoritative birth", async () => {
  let options = null;
  const api = createGenesisBirthWriteApi({
    privateToken: TOKEN,
    birthPublisher: {
      async publishBirth(_bundle, supplied) {
        options = supplied;
        return { idempotent: false };
      },
    },
  });
  const response = await api.fetch(request({
    activityRequestId: "not valid correlation",
    activityParentOperationId: "not valid parent",
  }));
  assert.equal(response.status, 201);
  assert.deepEqual(options, { activityContext: {} });
});

