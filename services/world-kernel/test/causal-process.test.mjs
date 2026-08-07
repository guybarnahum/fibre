import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const serverPath = fileURLToPath(new URL("../src/server.mjs", import.meta.url));
const privateToken = "causal-process-private-token-012345";

async function waitForReady(child, stderr, timeoutMs = 10000) {
  return await new Promise((resolve, reject) => {
    let buffered = "";
    const timeout = setTimeout(() => finish(new Error(`Timed out: ${stderr()}`)), timeoutMs);
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
    const onExit = (code) => finish(new Error(`Exited ${code}: ${stderr()}`));
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
      FIBRE_PRIVATE_TOKEN: privateToken,
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
        const timeout = setTimeout(() => reject(new Error(`Did not stop: ${stderr}`)), 10000);
        child.once("exit", (code, signal) => {
          clearTimeout(timeout);
          if (code === 0 || signal === "SIGTERM") resolve();
          else reject(new Error(`Exited ${code}: ${stderr}`));
        });
      });
      child.kill("SIGTERM");
      await exited;
    },
  };
}

async function json(url, options = {}) {
  const response = await fetch(url, options);
  return { response, body: await response.json() };
}

function privateHeaders() {
  return { "content-type": "application/json", "x-fibre-private-token": privateToken };
}

function obligatedThread() {
  const thread = structuredClone(mina);
  thread.memoryRefs = [];
  thread.relationshipRefs = [];
  thread.currentState.unresolvedIntentions = [
    "Honor the recorded bounded infrastructure-review obligation for Guy.",
  ];
  return thread;
}

function activationRequest() {
  return {
    requestId: "req_causal_process_obligation",
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Perform a bounded infrastructure review of this web service",
    statedNeed: "Identify the highest-priority infrastructure risks without expanding scope.",
    permissions: ["read_design"],
    acceptanceCriteria: "Return three bounded findings.",
  };
}

test("canonical world-kernel completes and restarts an obligation-mediated life", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-causal-process-"));
  const databasePath = join(directory, "world.sqlite");
  const thread = obligatedThread();
  const obligation = thread.currentState.unresolvedIntentions[0];
  let first;
  let second;
  try {
    first = await startProcess(databasePath);
    const seeded = await json(`${first.baseUrl}/threads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ thread }),
    });
    assert.equal(seeded.response.status, 201);

    const appraisal = await json(`${first.baseUrl}/threads/${thread.threadId}/private/requests`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify({
        request: activationRequest(),
        causationId: "cause_causal_process_appraise",
        correlationId: "corr_causal_process",
      }),
    });
    assert.equal(appraisal.response.status, 201);
    assert.equal(appraisal.body.trace.privateStance.desiredAction, "clarify");
    assert.deepEqual(appraisal.body.trace.appraisal.obligations, [obligation]);

    const continued = await json(
      `${first.baseUrl}/threads/${thread.threadId}/private/requests/${activationRequest().requestId}/participation`,
      {
        method: "POST",
        headers: privateHeaders(),
        body: JSON.stringify({
          operationId: "op_causal_process_continue",
          causationId: "cause_causal_process_continue",
          correlationId: "corr_causal_process",
          governingObligationReferences: [obligation],
        }),
      },
    );
    assert.equal(continued.response.status, 201);
    assert.equal(continued.body.kind, "runtime");
    assert.equal(continued.body.runtime.authorization.desiredAction, "clarify");
    assert.equal(continued.body.runtime.authorization.authorizedAction, "accept");
    assert.deepEqual(continued.body.runtime.authorization.obligationReferences, [obligation]);
    const sessionId = continued.body.runtime.session.sessionId;

    assert.equal((await json(`${first.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}/actor`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify({ operationId: "op_causal_process_actor" }),
    })).response.status, 201);
    assert.equal((await json(`${first.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}/goal-guardian`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify({ operationId: "op_causal_process_guardian" }),
    })).response.status, 201);
    const frozen = await json(`${first.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}/freeze`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify({
        operationId: "op_causal_process_freeze",
        lifeChangeDecisions: [],
        causationId: "cause_causal_process_freeze",
        correlationId: "corr_causal_process",
      }),
    });
    assert.equal(frozen.response.status, 201);
    assert.deepEqual(frozen.body.freeze.report.dischargedObligations, [obligation]);
    assert.equal(frozen.body.freeze.report.acceptedLifeChanges.length, 0);

    await first.stop();
    first = null;

    second = await startProcess(databasePath);
    const persisted = await json(`${second.baseUrl}/threads/${thread.threadId}`);
    assert.equal(persisted.response.status, 200);
    assert.equal(persisted.body.thread.version, 2);
    assert.equal(persisted.body.thread.currentState.unresolvedIntentions.includes(obligation), false);

    const runtime = await json(`${second.baseUrl}/threads/${thread.threadId}/private/runtime/${sessionId}`, {
      headers: { "x-fibre-private-token": privateToken },
    });
    assert.equal(runtime.response.status, 200);
    assert.equal(runtime.body.runtime.session.status, "completed");
    assert.equal(runtime.body.runtime.lease.status, "released");
    assert.equal(runtime.body.runtime.authorization.desiredAction, "clarify");
    assert.equal(runtime.body.runtime.authorization.authorizedAction, "accept");
  } finally {
    if (first) await first.stop().catch(() => {});
    if (second) await second.stop().catch(() => {});
    rmSync(directory, { recursive: true, force: true });
  }
});
