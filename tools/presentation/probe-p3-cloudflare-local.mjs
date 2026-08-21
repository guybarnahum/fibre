import assert from "node:assert/strict";

const base = process.argv[2] ?? "http://127.0.0.1:8787";
const threadId = "thr_pr39_g2_04";

async function getJson(path) {
  const response = await fetch(`${base}${path}`);
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} failed (${response.status}): ${text}`);
  return JSON.parse(text);
}

const health = await getJson("/healthz");
assert.equal(health.ok, true);

const snapshot = await getJson(`/api/threads/${threadId}/snapshot`);
assert.equal(snapshot.pointer.threadId, threadId);
assert.equal(snapshot.snapshot.presentation.manifest.lifecycleStatus, "genesis_candidate");
assert.equal(snapshot.snapshot.presentation.manifest.fixture, true);

const replay = await getJson(`/api/threads/${threadId}/events?after=0&limit=100`);
assert.equal(replay.channelId, `presentation:${threadId}`);
assert.ok(Number.isSafeInteger(replay.head));
assert.ok(Array.isArray(replay.events));

const wsUrl = new URL(`/api/threads/${threadId}/stream?after=${replay.head}`, base);
wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
const ready = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("presentation WebSocket probe timed out")), 5000);
  const socket = new WebSocket(wsUrl);
  socket.addEventListener("error", () => {
    clearTimeout(timeout);
    reject(new Error("presentation WebSocket probe failed"));
  });
  socket.addEventListener("message", (event) => {
    let value;
    try { value = JSON.parse(String(event.data)); }
    catch { return; }
    if (value.type !== "stream.ready") return;
    clearTimeout(timeout);
    socket.close();
    resolve(value);
  });
});
assert.equal(ready.cursor, replay.head);

console.log(JSON.stringify({
  ok: true,
  threadId,
  lifecycleStatus: snapshot.snapshot.presentation.manifest.lifecycleStatus,
  fixture: snapshot.snapshot.presentation.manifest.fixture,
  snapshotVersion: snapshot.pointer.snapshotVersion,
  cursor: ready.cursor,
  replayEvents: replay.events.length,
}, null, 2));
