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
const privateToken = "freeze-process-token-0123456789";

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

function requestRecord() {
  return {
    request: {
      requestId: "req_freeze_process",
      trigger: "human_request",
      requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
      objective: "Evaluate a bounded website security review",
      statedNeed: "Identify authorization and privacy risks",
      permissions: ["read_design"],
      acceptanceCriteria: "Return concise findings",
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: [],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-05T21:05:00Z",
    causationId: "cause_freeze_process_request",
    correlationId: "corr_freeze_process",
  };
}

function stance(trace) {
  return {
    assessment: {
      threadId: trace.threadId,
      snapshotVersion: trace.snapshotVersion,
      requestId: trace.requestId,
      requestFingerprint: trace.requestFingerprint,
      policy: { id: "dignity_guardian", version: "1" },
      proposedAction: "accept",
      score: 84,
      rationale: "The request is bounded and aligned.",
      factors: {
        identityAlignment: "Strong fit",
        individualizedAdvantage: "Uses durable review context",
        requesterNeed: "Concrete need",
        relationalMeaning: "Known requester",
        respectAndReciprocity: "Explicit terms",
        participationTerms: "Bounded",
        obligationsAndOpportunityCost: "No conflict",
      },
      evidenceRefs: ["mem_mina_first_review"],
      repairQuestions: [],
      knownAlternatives: [],
      feelings: ["careful"],
      conflictingMotives: [],
      uncertainties: [],
      relationshipImpact: {
        entity: requestRecord().request.requester,
        fondnessDelta: 0,
        resentmentDelta: 0,
        rationale: "No change.",
        evidenceRefs: [],
      },
    },
    recordedAt: "2026-08-05T21:06:00Z",
    causationId: "cause_freeze_process_stance",
    correlationId: "corr_freeze_process",
  };
}

function acquire() {
  return {
    operationId: "op_freeze_process_acquire",
    decision: {
      authorizedAction: "accept",
      rationale: "Proceed.",
      obligationReferences: [],
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
    },
    causationId: "cause_freeze_process_acquire",
    correlationId: "corr_freeze_process",
  };
}

function freeze(operationId = "op_freeze_process") {
  return {
    operationId,
    lifeChangeDecisions: [{
      proposalIndex: 0,
      decision: "accept",
      rationale: "Retain the evidence-bearing memory.",
    }],
    causationId: `cause_${operationId}`,
    correlationId: "corr_freeze_process",
  };
}

test("full freeze survives process restart with replay equality and no active runtime", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-freeze-process-"));
  const databasePath = join(directory, "world.sqlite");
  let first;
  let second;
  try {
    first = await startProcess(databasePath);
    assert.equal((await json(`${first.baseUrl}/threads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ thread: fixture }),
    })).response.status, 201);
    const request = await json(`${first.baseUrl}/threads/${fixture.threadId}/private/requests`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify(requestRecord()),
    });
    assert.equal(request.response.status, 201);
    const trace = request.body.trace;
    assert.equal((await json(`${first.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/stance`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify(stance(trace)),
    })).response.status, 201);
    const acquired = await json(`${first.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/runtime`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify(acquire()),
    });
    assert.equal(acquired.response.status, 201);
    const sessionId = acquired.body.runtime.session.sessionId;
    assert.equal((await json(`${first.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/actor`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify({ operationId: "op_freeze_process_actor" }),
    })).response.status, 201);
    assert.equal((await json(`${first.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/goal-guardian`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify({ operationId: "op_freeze_process_guardian" }),
    })).response.status, 201);
    const frozen = await json(`${first.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/freeze`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify(freeze()),
    });
    assert.equal(frozen.response.status, 201);
    const memoryId = frozen.body.freeze.memories[0].memoryId;
    const integrityBefore = await json(`${first.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/freeze/integrity`, {
      headers: { "x-fibre-private-token": privateToken },
    });
    await first.stop();
    first = null;

    second = await startProcess(databasePath);
    const thread = await json(`${second.baseUrl}/threads/${fixture.threadId}`);
    assert.equal(thread.body.thread.version, 2);
    assert.ok(thread.body.thread.memoryRefs.includes(memoryId));
    const events = await json(`${second.baseUrl}/threads/${fixture.threadId}/events`);
    assert.equal(events.body.events.length, 2);
    assert.equal(events.body.events[1].eventType, "THREAD_FROZEN");
    assert.equal(JSON.stringify(events.body).includes(sessionId), false);
    const runtime = await json(`${second.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}`, {
      headers: { "x-fibre-private-token": privateToken },
    });
    assert.equal(runtime.body.runtime.session.status, "completed");
    assert.equal(runtime.body.runtime.lease.status, "released");
    const summaries = await json(`${second.baseUrl}/threads/${fixture.threadId}/private/runtime`, {
      headers: { "x-fibre-private-token": privateToken },
    });
    assert.equal(summaries.body.runtimes.filter((item) => item.status === "active").length, 0);
    const integrityAfter = await json(`${second.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/freeze/integrity`, {
      headers: { "x-fibre-private-token": privateToken },
    });
    assert.deepEqual(integrityAfter.body, integrityBefore.body);
    const replay = await json(`${second.baseUrl}/threads/${fixture.threadId}/private/runtime/${sessionId}/freeze`, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify(freeze("op_freeze_process_replay")),
    });
    assert.equal(replay.response.status, 409);
    assert.equal(replay.body.error.code, "AUTHORIZATION_CONSUMED");
  } finally {
    if (first) await first.stop().catch(() => {});
    if (second) await second.stop().catch(() => {});
    rmSync(directory, { recursive: true, force: true });
  }
});
