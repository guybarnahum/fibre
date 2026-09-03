import assert from "node:assert/strict";
import test from "node:test";

import { createThreadVisualPublicationRecoveryApi } from "../src/thread-visual-publication-recovery-api.mjs";

const TOKEN = "0123456789abcdef";

function request({ token = TOKEN, recoveryKey = "recover-bfl-shard-20260903", method = "POST" } = {}) {
  return new Request("https://world.example/internal/threads/thr_recover/visual-publication/recover", {
    method,
    headers: {
      "content-type": "application/json",
      ...(token === null ? {} : { "x-fibre-private-token": token }),
    },
    body: method === "POST" ? JSON.stringify({ recoveryKey }) : undefined,
  });
}

test("Thread visual recovery API forwards one regeneration key through authoritative World reconciler", async () => {
  const calls = [];
  const api = createThreadVisualPublicationRecoveryApi({
    privateToken: TOKEN,
    reconciler: {
      async reconcileThread(input) {
        calls.push(input);
        return { complete: false, stage: "official_photo_pending", jobId: "assetjob_retry" };
      },
    },
  });
  const response = await api.fetch(request());
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].threadId, "thr_recover");
  assert.equal(calls[0].regenerationKey, "recover-bfl-shard-20260903");
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.recoveryKey, "recover-bfl-shard-20260903");
});

test("Thread visual recovery API requires private authentication", async () => {
  const api = createThreadVisualPublicationRecoveryApi({
    privateToken: TOKEN,
    reconciler: { async reconcileThread() { throw new Error("must not run"); } },
  });
  const response = await api.fetch(request({ token: null }));
  assert.equal(response.status, 403);
});

test("Thread visual recovery API rejects empty recovery keys before reconciliation", async () => {
  let called = false;
  const api = createThreadVisualPublicationRecoveryApi({
    privateToken: TOKEN,
    reconciler: { async reconcileThread() { called = true; } },
  });
  const response = await api.fetch(request({ recoveryKey: "" }));
  assert.equal(response.status, 400);
  assert.equal(called, false);
});
