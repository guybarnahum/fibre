import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const serverPath = fileURLToPath(new URL("../src/server.mjs", import.meta.url));

function command(overrides = {}) {
  return {
    commandId: "cmd_mina_api_001",
    threadId: fixture.threadId,
    expectedVersion: 1,
    type: "UPDATE_SELF_MODEL",
    payload: {
      selfModel: "I remain reliable in systems work and now explicitly preview durable changes before accepting them.",
      summary: "Mina added command-preview discipline to her self-model.",
    },
    actor: { entityId: "human_guy", kind: "human", displayName: "Guy Bar-Nahum" },
    occurredAt: "2026-08-04T23:50:00Z",
    ...overrides,
  };
}

async function waitForReady(child, stderr, timeoutMs = 10000) {
  return await new Promise((resolve, reject) => {
    let buffered = "";
    const timeout = setTimeout(() => finish(new Error(`Timed out waiting for world-kernel: ${stderr()}`)), timeoutMs);
    const onData = (chunk) => {
      buffered += chunk.toString("utf8");
      while (buffered.includes("\n")) {
        const index = buffered.indexOf("\n");
        const line = buffered.slice(0, index);
        buffered = buffered.slice(index + 1);
        try {
          const value = JSON.parse(line);
          if (value.event === "world-kernel-listening") return finish(null, value);
        } catch {}
      }
    };
    const onExit = (code) => finish(new Error(`world-kernel exited ${code}: ${stderr()}`));
    const finish = (error, value) => {
      clearTimeout(timeout);
      child.stdout.off("data", onData);
      child.off("exit", onExit);
      if (error) reject(error); else resolve(value);
    };
    child.stdout.on("data", onData);
    child.once("exit", onExit);
  });
}

async function startProcess(databasePath) {
  let stderr = "";
  const child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", serverPath], {
    env: {
      ...process.env,
      FIBRE_WORLD_DATABASE: databasePath,
      FIBRE_WORLD_HOST: "127.0.0.1",
      FIBRE_WORLD_PORT: "0",
      FIBRE_ADMIN_TOKEN: "0123456789abcdef",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
  const ready = await waitForReady(child, () => stderr);
  return {
    child,
    baseUrl: `http://127.0.0.1:${ready.port}`,
    async stop() {
      if (child.exitCode !== null) return;
      const exited = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`world-kernel did not stop: ${stderr}`)), 10000);
        child.once("exit", (code, signal) => {
          clearTimeout(timeout);
          if (code === 0 || signal === "SIGTERM") resolve();
          else reject(new Error(`world-kernel exited ${code}: ${stderr}`));
        });
      });
      child.kill("SIGTERM");
      await exited;
    },
  };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  return { response, body: await response.json() };
}

test("independent world-kernel survives restart with preview-bound command history", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-world-kernel-api-"));
  const databasePath = join(directory, "world.sqlite");
  let first;
  let second;
  try {
    first = await startProcess(databasePath);
    const seeded = await requestJson(`${first.baseUrl}/threads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ thread: fixture }),
    });
    assert.equal(seeded.response.status, 201);

    const preview = await requestJson(`${first.baseUrl}/threads/${fixture.threadId}/commands/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ command: command() }),
    });
    assert.equal(preview.response.status, 200);
    assert.match(preview.body.previewId, /^prv_[0-9a-f]{64}$/);
    assert.equal((await requestJson(`${first.baseUrl}/threads/${fixture.threadId}`)).body.thread.version, 1);

    const changed = await requestJson(`${first.baseUrl}/threads/${fixture.threadId}/commands`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        previewId: preview.body.previewId,
        command: command({ payload: { selfModel: "Changed after preview", summary: "Must not persist" } }),
      }),
    });
    assert.equal(changed.body.error.code, "PREVIEW_MISMATCH");

    const applied = await requestJson(`${first.baseUrl}/threads/${fixture.threadId}/commands`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ previewId: preview.body.previewId, command: command() }),
    });
    assert.equal(applied.response.status, 201);
    assert.equal(applied.body.thread.version, 2);
    const beforeRestart = await requestJson(`${first.baseUrl}/threads/${fixture.threadId}/integrity`);
    assert.equal(beforeRestart.body.eventCount, 2);

    const stale = await requestJson(`${first.baseUrl}/threads/${fixture.threadId}/commands/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ command: command({ commandId: "cmd_mina_stale_002" }) }),
    });
    assert.equal(stale.body.error.code, "STALE_THREAD_VERSION");

    await first.stop();
    first = null;
    second = await startProcess(databasePath);
    const afterRestart = await requestJson(`${second.baseUrl}/threads/${fixture.threadId}/integrity`);
    assert.deepEqual(afterRestart.body, beforeRestart.body);
    const retry = await requestJson(`${second.baseUrl}/threads/${fixture.threadId}/commands`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ previewId: preview.body.previewId, command: command() }),
    });
    assert.equal(retry.response.status, 200);
    assert.equal(retry.body.idempotent, true);
    assert.equal((await requestJson(`${second.baseUrl}/threads/${fixture.threadId}/events`)).body.events.length, 2);
  } finally {
    if (first) await first.stop().catch(() => {});
    if (second) await second.stop().catch(() => {});
    rmSync(directory, { recursive: true, force: true });
  }
});
