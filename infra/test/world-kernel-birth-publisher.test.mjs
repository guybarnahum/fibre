import test from "node:test";
import assert from "node:assert/strict";

import {
  WorldKernelBirthPublicationError,
  createWorldKernelBirthPublisher,
} from "../deployments/birth-center/local/world-kernel-birth-publisher.mjs";

test("local World Kernel birth publisher sends private publication request with side-channel activity correlation", async () => {
  let observed = null;
  const publisher = createWorldKernelBirthPublisher({
    endpoint: "http://127.0.0.1:8787",
    privateToken: "private-test-token",
    async fetchImpl(url, options) {
      observed = { url: String(url), options };
      return new Response(JSON.stringify({ idempotent: false, threadId: "thr_test" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const bundle = { manifest: { threadId: "thr_test" } };
  const result = await publisher.publishBirth(bundle, {
    activityContext: { requestId: "req_activity_world_001" },
  });
  assert.equal(observed.url, "http://127.0.0.1:8787/internal/genesis/births");
  assert.equal(observed.options.method, "POST");
  assert.equal(observed.options.headers["x-fibre-private-token"], "private-test-token");
  assert.equal(observed.options.headers["x-fibre-activity-request-id"], "req_activity_world_001");
  assert.deepEqual(JSON.parse(observed.options.body), bundle);
  assert.equal(JSON.stringify(bundle).includes("req_activity_world_001"), false);
  assert.deepEqual(result, { idempotent: false, threadId: "thr_test" });
});

test("invalid activity correlation is dropped without blocking World publication", async () => {
  let headers = null;
  const publisher = createWorldKernelBirthPublisher({
    privateToken: "private-test-token",
    async fetchImpl(_url, options) {
      headers = options.headers;
      return new Response(JSON.stringify({ idempotent: false }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    },
  });
  await publisher.publishBirth({ manifest: { threadId: "thr_test" } }, {
    activityContext: { requestId: "not a valid header id" },
  });
  assert.equal(headers["x-fibre-activity-request-id"], undefined);
});

test("local World Kernel birth publisher exposes concise remote failure", async () => {
  const publisher = createWorldKernelBirthPublisher({
    privateToken: "private-test-token",
    async fetchImpl() {
      return new Response(JSON.stringify({
        error: { code: "INVALID_REQUEST", message: "birth bundle is invalid" },
      }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    },
  });

  await assert.rejects(
    publisher.publishBirth({}),
    (error) => {
      assert.ok(error instanceof WorldKernelBirthPublicationError);
      assert.equal(error.status, 400);
      assert.equal(error.code, "INVALID_REQUEST");
      assert.equal(error.message, "birth bundle is invalid");
      return true;
    },
  );
});
