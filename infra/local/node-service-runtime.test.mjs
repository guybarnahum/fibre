import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";

import { createServiceRuntime, readJsonRequest } from "../service-runtime/service-runtime.mjs";
import { createNodeServiceHandler } from "./node-service-runtime.mjs";

async function withServer(handler, run) {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("Node service adapter carries health and JSON routes through Fetch runtime", async () => {
  const runtime = createServiceRuntime({
    serviceName: "node-fixture",
    routes: [
      {
        method: "POST",
        path: "/echo",
        handler: async ({ request }) => ({ echo: await readJsonRequest(request) }),
      },
    ],
  });

  await withServer(createNodeServiceHandler({ runtime, maxBodyBytes: 1024 }), async (baseUrl) => {
    const health = await fetch(`${baseUrl}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true, service: "node-fixture" });

    const echo = await fetch(`${baseUrl}/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "hello" }),
    });
    assert.equal(echo.status, 200);
    assert.deepEqual(await echo.json(), { echo: { value: "hello" } });
  });
});

test("Node service adapter rejects oversized request bodies before service logic", async () => {
  const runtime = createServiceRuntime({
    serviceName: "node-fixture",
    routes: [{ method: "POST", path: "/echo", handler: async () => ({ ok: true }) }],
  });

  await withServer(createNodeServiceHandler({ runtime, maxBodyBytes: 8 }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/echo`, {
      method: "POST",
      body: "0123456789",
    });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: "request_too_large" });
  });
});
