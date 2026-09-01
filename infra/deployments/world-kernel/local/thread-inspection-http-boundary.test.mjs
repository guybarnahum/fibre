import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { attachThreadInspectionHttpBoundary } from "./thread-inspection-http-boundary.mjs";

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("test server did not bind");
  return `http://127.0.0.1:${address.port}`;
}

async function close(server) {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

test("local World routes Thread inspection through the portable Fetch API and preserves other routes", async () => {
  const calls = [];
  const server = createServer((request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ base: request.url }));
  });
  attachThreadInspectionHttpBoundary({
    server,
    inspectionApi: {
      async fetch(request) {
        calls.push({
          pathname: new URL(request.url).pathname,
          token: request.headers.get("x-fibre-private-token"),
        });
        return Response.json({ ok: true, source: "portable-thread-inspection" });
      },
    },
  });

  const baseUrl = await listen(server);
  try {
    const inspected = await fetch(`${baseUrl}/internal/threads`, {
      headers: { "x-fibre-private-token": "test-private-token" },
    });
    assert.equal(inspected.status, 200);
    assert.deepEqual(await inspected.json(), { ok: true, source: "portable-thread-inspection" });
    assert.deepEqual(calls, [{ pathname: "/internal/threads", token: "test-private-token" }]);

    const ordinary = await fetch(`${baseUrl}/health`);
    assert.equal(ordinary.status, 200);
    assert.deepEqual(await ordinary.json(), { base: "/health" });
    assert.equal(calls.length, 1);
  } finally {
    await close(server);
  }
});
