import { createServer } from "node:http";
import test from "node:test";
import assert from "node:assert/strict";

import { attachGenesisBirthPublicationHttpServer } from "../src/genesis-birth-http-server.mjs";

async function listeningServer({ privateToken = "test-private-token" } = {}) {
  let published = null;
  const server = createServer((request, response) => {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "base_not_found" }));
  });
  attachGenesisBirthPublicationHttpServer({
    server,
    privateToken,
    birthPublisher: {
      async publishBirth(bundle) {
        published = structuredClone(bundle);
        return { idempotent: false, threadId: bundle.manifest.threadId };
      },
    },
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  const close = () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return { server, published: () => published, url: `http://127.0.0.1:${address.port}`, close };
}

test("World Kernel private birth boundary publishes through injected authority", async () => {
  const fixture = await listeningServer();
  try {
    const response = await fetch(`${fixture.url}/internal/genesis/births`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-fibre-private-token": "test-private-token",
      },
      body: JSON.stringify({ manifest: { threadId: "thr_test" } }),
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { idempotent: false, threadId: "thr_test" });
    assert.deepEqual(fixture.published(), { manifest: { threadId: "thr_test" } });
  } finally {
    await fixture.close();
  }
});

test("World Kernel private birth boundary rejects missing private token without publishing", async () => {
  const fixture = await listeningServer();
  try {
    const response = await fetch(`${fixture.url}/internal/genesis/births`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ manifest: { threadId: "thr_test" } }),
    });
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.equal(body.error.code, "PRIVATE_TOKEN_REQUIRED");
    assert.equal(fixture.published(), null);
  } finally {
    await fixture.close();
  }
});
