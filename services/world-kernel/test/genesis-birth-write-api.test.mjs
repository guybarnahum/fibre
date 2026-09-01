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
} = {}) {
  const headers = { "content-type": contentType, "x-request-id": "req_slice_c" };
  if (token !== null) headers["x-fibre-private-token"] = token;
  if (activityRequestId !== null) headers["x-fibre-activity-request-id"] = activityRequestId;
  return new Request(`https://world.internal${path}`, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}

test("Fetch-native Genesis birth write API preserves private publication status, idempotency and activity correlation", async () => {
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

  const first = await api.fetch(request({ activityRequestId: "req_genesis_activity_001" }));
  assert.equal(first.status, 201);
  assert.equal((await first.json()).thread.threadId, "thr_slice_c");
  assert.deepEqual(calls[0].options, {
    activityContext: { requestId: "req_genesis_activity_001" },
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
  const response = await api.fetch(request({ activityRequestId: "not valid correlation" }));
  assert.equal(response.status, 201);
  assert.deepEqual(options, { activityContext: {} });
});

test("Fetch-native Genesis birth write API rejects unauthenticated and malformed writes without invoking World authority", async () => {
  let calls = 0;
  const api = createGenesisBirthWriteApi({
    privateToken: TOKEN,
    birthPublisher: { async publishBirth() { calls += 1; return {}; } },
  });
  assert.equal((await api.fetch(request({ token: null }))).status, 403);
  assert.equal((await api.fetch(request({ method: "GET" }))).status, 405);
  assert.equal((await api.fetch(request({ contentType: "text/plain" }))).status, 415);
  assert.equal(calls, 0);
  assert.equal(await api.fetch(new Request("https://world.internal/not-world")), null);
});
