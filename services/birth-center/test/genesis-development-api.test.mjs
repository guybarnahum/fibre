import assert from "node:assert/strict";
import test from "node:test";

import { createGenesisDevelopmentApi } from "../src/genesis-development-api.mjs";

const TOKEN = "development-private-token-123";

function request(url = "https://birth.internal/internal/births/develop", options = {}) {
  const { body, headers, ...rest } = options;
  return new Request(url, {
    method: "POST",
    ...rest,
    headers: {
      "content-type": "application/json",
      "x-fibre-private-token": TOKEN,
      ...(headers ?? {}),
    },
    body: JSON.stringify(body ?? { requestVersion: "fibre-genesis-development-request-v1", requestId: "request-1" }),
  });
}

test("private Genesis development API forwards only the request body to Birth Center development service", async () => {
  let received = null;
  const api = createGenesisDevelopmentApi({
    privateToken: TOKEN,
    developmentService: {
      async develop(value) {
        received = structuredClone(value);
        return { status: "published", genesisId: "genesis_test", threadId: "thr_test" };
      },
    },
  });
  const body = { requestVersion: "fibre-genesis-development-request-v1", requestId: "request-api-001", worldSpec: { worldSpecId: "world_api" } };
  const response = await api.fetch(request(undefined, { body }));
  assert.equal(response.status, 200);
  assert.deepEqual(received, body);
  assert.deepEqual(await response.json(), {
    ok: true,
    development: { status: "published", genesisId: "genesis_test", threadId: "thr_test" },
  });
});

test("Genesis development API exposes only the birth-development route and requires private authorization", async () => {
  const api = createGenesisDevelopmentApi({
    privateToken: TOKEN,
    developmentService: { async develop() { throw new Error("must not run"); } },
  });
  assert.equal(await api.fetch(request("https://birth.internal/internal/developments")), null);

  const unauthorized = await api.fetch(request(undefined, {
    headers: { "x-fibre-private-token": "wrong-token-value-123" },
  }));
  assert.equal(unauthorized.status, 403);
  assert.deepEqual(await unauthorized.json(), { error: { code: "PRIVATE_TOKEN_REQUIRED" } });
});
