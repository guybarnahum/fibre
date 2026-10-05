import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { attachThreadDirectoryBoundary } from "./thread-directory-boundary.mjs";

const EDITOR_TOKEN = "editor-access-token-123456";
const PRIVATE_TOKEN = "fibre-private-token-123456";

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

test("Thread Editor sends operator search to World only", async () => {
  const worldCalls = [];
  const world = createServer((request, response) => {
    worldCalls.push({ url: request.url, privateToken: request.headers["x-fibre-private-token"] });
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({
      threads: [{ threadId: "thr_private_mira", displayName: "Mira Vale", fibreIdentityNumber: "7K3M-2Q-8W5R" }],
    }));
  });
  const worldPort = await listen(world);

  const editor = createServer((_request, response) => {
    response.writeHead(418, { "content-type": "application/json" });
    response.end(JSON.stringify({ delegated: true }));
  });
  editor.editorAccessToken = EDITOR_TOKEN;
  attachThreadDirectoryBoundary(editor, {
    worldKernelBaseUrl: `http://127.0.0.1:${worldPort}`,
    privateToken: PRIVATE_TOKEN,
  });
  const editorPort = await listen(editor);

  try {
    const denied = await fetch(`http://127.0.0.1:${editorPort}/api/editor/directory/search?q=Mira`);
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error.code, "EDITOR_TOKEN_REQUIRED");
    assert.equal(worldCalls.length, 0);

    const headers = { "x-fibre-editor-token": EDITOR_TOKEN };
    const search = await fetch(
      `http://127.0.0.1:${editorPort}/api/editor/directory/search?q=Mira&fin=7K3M-2Q-8W5R&language=English`,
      { headers },
    );
    assert.equal(search.status, 200);
    assert.equal((await search.json()).threads[0].threadId, "thr_private_mira");
    assert.equal(worldCalls[0].url, "/internal/thread-directory/search?q=Mira&fin=7K3M-2Q-8W5R");
    assert.equal(worldCalls[0].privateToken, PRIVATE_TOKEN);
    assert.equal(presentationCalls.length, 0);

    const delegated = await fetch(`http://127.0.0.1:${editorPort}/anything-else`);
    assert.equal(delegated.status, 418);
    assert.deepEqual(await delegated.json(), { delegated: true });
  } finally {
    await close(editor);
    await close(world);
  }
});
