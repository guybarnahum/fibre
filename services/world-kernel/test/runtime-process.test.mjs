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
const serverPath = fileURLToPath(new URL("../../../tools/m1-demo-world-kernel.mjs", import.meta.url));
const privateToken = "private-runtime-process-012345";

function appraisalBody() {
  return {
    request: {
      requestId: "req_runtime_process",
      trigger: "human_request",
      requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
      objective: "Evaluate a bounded identity-service review",
      statedNeed: "Find authorization weaknesses",
      permissions: ["read_design"],
      acceptanceCriteria: "Return concise findings",
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: [],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-05T05:00:00Z",
    causationId: "cause_runtime_process",
    correlationId: "corr_runtime_process",
  };
}

function stanceBody(trace) {
  return {
    assessment: {
      threadId: trace.threadId,
      snapshotVersion: trace.snapshotVersion,
      requestId: trace.requestId,
      requestFingerprint: trace.requestFingerprint,
      policy: { id: "dignity_guardian", version: "1" },
      proposedAction: "accept",
      score: 82,
      rationale: "The request is bounded and evidence-bearing.",
      factors: {
        identityAlignment: "Strong fit",
        individualizedAdvantage: "Uses Mina's history",
        requesterNeed: "Concrete need",
        relationalMeaning: "Known requester",
        respectAndReciprocity: "Explicit scope",
        participationTerms: "Bounded",
        obligationsAndOpportunityCost: "No conflict",
      },
      evidenceRefs: ["mem_mina_first_review"],
      repairQuestions: [],
      knownAlternatives: [],
      feelings: ["engaged"],
      conflictingMotives: [],
      uncertainties: [],
      relationshipImpact: {
        entity: appraisalBody().request.requester,
        fondnessDelta: 0,
        resentmentDelta: 0,
        rationale: "No relationship change.",
        evidenceRefs: [],
      },
    },
    recordedAt: "2026-08-05T05:01:00Z",
    causationId: "cause_runtime_process_stance",
    correlationId: trace.correlationId,
  };
}

function acquireBody() {
  return {
    operationId: "op_runtime_process",
    decision: {
      authorizedAction: "accept",
      rationale: "Proceed with the bounded review.",
      obligationReferences: [],
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
    },
    causationId: "cause_runtime_process_acquire",
    correlationId: "corr_runtime_process",
  };
}

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
          if (value.event === "m1-demo-world-kernel-listening") return finish(null, value);
        } catch {}
      }
    };
    const onExit = (code) => finish(new Error(`Exited ${code}: ${stderr()}`));
    const finish = (error, value) => {
      clearTimeout(timeout);
      child.stdout.off("data", onData);
      child.off("exit", onExit);
      if (error) reject(error);
      else resolve(value);
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

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  return { response, body: await response.json() };
}

function headers() {
  return { "content-type": "application/json", "x-fibre-private-token": privateToken };
}

test("thaw runtime survives independent world-kernel restart without public leakage", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-runtime-process-"));
  const databasePath = join(directory, "world.sqlite");
  let first;
  let second;
  try {
    first = await startProcess(databasePath);
    assert.equal((await requestJson(`${first.baseUrl}/threads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ thread: fixture }),
    })).response.status, 201);
    const appraisal = await requestJson(
      `${first.baseUrl}/threads/${fixture.threadId}/private/requests`,
      { method: "POST", headers: headers(), body: JSON.stringify(appraisalBody()) },
    );
    const trace = appraisal.body.trace;
    assert.equal((await requestJson(
      `${first.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/stance`,
      { method: "POST", headers: headers(), body: JSON.stringify(stanceBody(trace)) },
    )).response.status, 201);
    const acquired = await requestJson(
      `${first.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/runtime`,
      { method: "POST", headers: headers(), body: JSON.stringify(acquireBody()) },
    );
    assert.equal(acquired.response.status, 201);
    const sessionId = acquired.body.runtime.session.sessionId;
    assert.equal((await requestJson(
      `${first.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/actor`,
      { method: "POST", headers: headers(), body: JSON.stringify({ operationId: "op_actor_process" }) },
    )).response.status, 201);
    assert.equal((await requestJson(
      `${first.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/goal-guardian`,
      { method: "POST", headers: headers(), body: JSON.stringify({ operationId: "op_guardian_process" }) },
    )).response.status, 201);
    const before = await requestJson(
      `${first.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/integrity`,
      { headers: { "x-fibre-private-token": privateToken } },
    );
    await first.stop();
    first = null;

    second = await startProcess(databasePath);
    const after = await requestJson(
      `${second.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/integrity`,
      { headers: { "x-fibre-private-token": privateToken } },
    );
    assert.deepEqual(after.body, before.body);
    assert.equal(after.body.goalGuardianDecision, "pass");
    const publicEvents = await requestJson(`${second.baseUrl}/threads/${fixture.threadId}/events`);
    assert.equal(publicEvents.body.events.length, 1);
    assert.equal(JSON.stringify(publicEvents.body).includes(sessionId), false);
  } finally {
    if (first) await first.stop().catch(() => {});
    if (second) await second.stop().catch(() => {});
    rmSync(directory, { recursive: true, force: true });
  }
});
