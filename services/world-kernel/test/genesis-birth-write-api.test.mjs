import assert from "node:assert/strict";
import test from "node:test";

import { createGenesisBirthWriteApi } from "../src/genesis-birth-write-api.mjs";

const TOKEN = "slice-c-private-token-123";

function request({ method = "POST", path = "/internal/genesis/births", token = TOKEN, body = { hello: "world" }, contentType = "application/json" } = {}) {
  const headers = { "content-type": contentType, "x-request-id": "req_slice_c" };
  if (token !== null) headers["x-fibre-private-token"] = token;
  return new Request(`https://world.internal${path}`, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}

test("Fetch-native Genesis birth write API preserves private publication status and idempotency", async () => {
  const calls = [];
  const api = createGenesisBirthWriteApi({
    privateToken: TOKEN,
    birthPublisher: {
      async publishBirth(bundle) {
        calls.push(bundle);
        return { idempotent: calls.length > 1, thread: { threadId: "thr_slice_c" } };
      },
    },
  });

  const first = await api.fetch(request());
  assert.equal(first.status, 201);
  assert.equal((await first.json()).thread.threadId, "thr_slice_c");
  const second = await api.fetch(request());
  assert.equal(second.status, 200);
  assert.equal(calls.length, 2);
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
