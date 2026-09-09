import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import {
  attachThreadDirectoryBoundary,
} from "./thread-directory-boundary.mjs";

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

test("Thread Editor directory proxy preserves editor auth and modern Presentation boundary", async () => {
  const calls = [];
  const presentation = createServer((request, response) => {
    calls.push(request.url);
    response.writeHead(200, { "content-type": "application/json" });
    if (request.url.startsWith("/api/threads/meet")) {
      response.end(JSON.stringify({
        thread: { threadId: "thr_mira", displayName: "Mira Vale" },
        eligibleCount: 2,
        seed: "experience-42",
      }));
      return;
    }
    response.end(JSON.stringify({
      threads: [{ threadId: "thr_mira", displayName: "Mira Vale", fibreIdentityNumber: "7K3M-2Q-8W5R" }],
    }));
  });
  const presentationPort = await listen(presentation);

  const editor = createServer((_request, response) => {
    response.writeHead(418, { "content-type": "application/json" });
    response.end(JSON.stringify({ delegated: true }));
  });
  editor.editorAccessToken = "editor-access-token-123456";
  attachThreadDirectoryBoundary(editor, {
    presentationBaseUrl: `http://127.0.0.1:${presentationPort}`,
  });
  const editorPort = await listen(editor);

  try {
    const denied = await fetch(`http://127.0.0.1:${editorPort}/api/editor/directory/search?q=Mira`);
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error.code, "EDITOR_TOKEN_REQUIRED");
    assert.equal(calls.length, 0);

    const headers = { "x-fibre-editor-token": editor.editorAccessToken };
    const search = await fetch(
      `http://127.0.0.1:${editorPort}/api/editor/directory/search?q=Mira&language=English`,
      { headers },
    );
    assert.equal(search.status, 200);
    assert.equal((await search.json()).threads[0].threadId, "thr_mira");
    assert.equal(calls[0], "/api/threads/search?q=Mira&language=English");

    const meet = await fetch(
      `http://127.0.0.1:${editorPort}/api/editor/directory/meet?seed=experience-42`,
      { headers },
    );
    assert.equal(meet.status, 200);
    assert.equal((await meet.json()).thread.threadId, "thr_mira");
    assert.equal(calls[1], "/api/threads/meet?seed=experience-42");

    const delegated = await fetch(`http://127.0.0.1:${editorPort}/anything-else`);
    assert.equal(delegated.status, 418);
    assert.deepEqual(await delegated.json(), { delegated: true });
  } finally {
    await close(editor);
    await close(presentation);
  }
});
