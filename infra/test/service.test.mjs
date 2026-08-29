import test from "node:test";
import assert from "node:assert/strict";

import {
  ServiceHttpError,
  bearerAuth,
  createService,
  readJsonRequest,
} from "../service.mjs";

test("service owns public health and exact not-found behavior", async () => {
  const service = createService({
    serviceName: "asset-generator",
    health: { role: "workflow-host" },
  });

  const health = await service.fetch(new Request("https://service.test/healthz"));
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    ok: true,
    service: "asset-generator",
    role: "workflow-host",
  });

  const missing = await service.fetch(new Request("https://service.test/generate", { method: "POST" }));
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "not_found" });
});

test("service bearer auth is fail-closed and accepts configured service tokens", async () => {
  const service = createService({
    serviceName: "c2pa",
    routes: [
      {
        method: "POST",
        path: "/embed",
        auth: bearerAuth("asset-generator-token", "operator-token"),
        handler: async () => ({ ok: true }),
      },
    ],
  });

  const missing = await service.fetch(new Request("https://service.test/embed", { method: "POST" }));
  assert.equal(missing.status, 401);
  assert.equal(missing.headers.get("www-authenticate"), "Bearer");

  const wrong = await service.fetch(new Request("https://service.test/embed", {
    method: "POST",
    headers: { Authorization: "Bearer wrong-token" },
  }));
  assert.equal(wrong.status, 401);

  for (const token of ["asset-generator-token", "operator-token"]) {
    const accepted = await service.fetch(new Request("https://service.test/embed", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }));
    assert.equal(accepted.status, 200);
    assert.deepEqual(await accepted.json(), { ok: true });
  }
});

test("service standardizes JSON and safe request errors", async () => {
  const service = createService({
    serviceName: "c2pa",
    routes: [
      {
        method: "POST",
        path: "/verify",
        handler: async ({ request }) => {
          const body = await readJsonRequest(request);
          if (body.reject === true) throw new ServiceHttpError(422, "rejected", { detail: "fixture rejection" });
          if (typeof body.value !== "string") throw new TypeError("value must be a string");
          return { value: body.value };
        },
      },
    ],
  });

  const invalidJson = await service.fetch(new Request("https://service.test/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  }));
  assert.equal(invalidJson.status, 400);
  assert.deepEqual(await invalidJson.json(), { error: "invalid_json" });

  const invalidRequest = await service.fetch(new Request("https://service.test/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }));
  assert.equal(invalidRequest.status, 400);
  assert.deepEqual(await invalidRequest.json(), { error: "invalid_request", detail: "value must be a string" });

  const rejected = await service.fetch(new Request("https://service.test/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reject: true }),
  }));
  assert.equal(rejected.status, 422);
  assert.deepEqual(await rejected.json(), { error: "rejected", detail: "fixture rejection" });
});
