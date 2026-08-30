import test from "node:test";
import assert from "node:assert/strict";

import {
  WorldKernelBirthPublicationError,
  createWorldKernelBirthPublisher,
} from "../deployments/birth-center/local/world-kernel-birth-publisher.mjs";

test("local World Kernel birth publisher sends private publication request", async () => {
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

  const result = await publisher.publishBirth({ manifest: { threadId: "thr_test" } });
  assert.equal(observed.url, "http://127.0.0.1:8787/internal/genesis/births");
  assert.equal(observed.options.method, "POST");
  assert.equal(observed.options.headers["x-fibre-private-token"], "private-test-token");
  assert.deepEqual(JSON.parse(observed.options.body), { manifest: { threadId: "thr_test" } });
  assert.deepEqual(result, { idempotent: false, threadId: "thr_test" });
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
