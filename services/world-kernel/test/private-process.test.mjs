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
const privateToken = "private-process-token-012345";

function requestBody() {
  return {
    request: {
      requestId: "req_private_process_001",
      trigger: "human_request",
      requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
      objective: "Review a durable identity boundary",
      statedNeed: "Find privacy and authorization gaps",
      permissions: ["read_design"],
      acceptanceCriteria: "Return concise findings",
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: [],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-05T01:40:00Z",
    causationId: "cause_private_process_001",
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
      proposedAction: "refuse",
      score: 35,
      rationale: "The request lacks a sufficient confidentiality boundary.",
      factors: {
        identityAlignment: "Technically relevant",
        individualizedAdvantage: "Mina has useful context",
        requesterNeed: "Need is real",
        relationalMeaning: "Known requester",
        respectAndReciprocity: "Confidentiality is incomplete",
        participationTerms: "Terms do not protect private reasoning",
        obligationsAndOpportunityCost: "No obligation requires acceptance",
      },
      evidenceRefs: ["mem_mina_first_review"],
      repairQuestions: [],
      knownAlternatives: [],
      feelings: ["protective"],
      conflictingMotives: ["Help the requester", "Protect private context"],
      uncertainties: [],
      relationshipImpact: {
        entity: requestBody().request.requester,
        fondnessDelta: 0,
        resentmentDelta: 0,
        rationale: "No relationship change.",
        evidenceRefs: [],
      },
    },
    recordedAt: "2026-08-05T01:41:00Z",
    causationId: "cause_private_process_stance",
    correlationId: "cause_private_process_001",
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

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  return { response, body: await response.json() };
}

function headers() {
  return { "content-type": "application/json", "x-fibre-private-token": privateToken };
}

test("private request and stance survive independent world-kernel restart without public leakage", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-private-process-"));
  const databasePath = join(directory, "world.sqlite");
  let first;
  let second;
  try {
    first = await startProcess(databasePath);
    assert.equal((await requestJson(`${first.baseUrl}/threads`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ thread: fixture }),
    })).response.status, 201);
    const created = await requestJson(`${first.baseUrl}/threads/${fixture.threadId}/private/requests`, {
      method: "POST", headers: headers(), body: JSON.stringify(requestBody()),
    });
    assert.equal(created.response.status, 201);
    const trace = created.body.trace;
    const stance = await requestJson(`${first.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/stance`, {
      method: "POST", headers: headers(), body: JSON.stringify(stanceBody(trace)),
    });
    assert.equal(stance.response.status, 201);
    const before = await requestJson(`${first.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/integrity`, {
      headers: { "x-fibre-private-token": privateToken },
    });
    await first.stop();
    first = null;

    second = await startProcess(databasePath);
    const after = await requestJson(`${second.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}/integrity`, {
      headers: { "x-fibre-private-token": privateToken },
    });
    assert.deepEqual(after.body, before.body);
    const recovered = await requestJson(`${second.baseUrl}/threads/${fixture.threadId}/private/requests/${trace.requestId}`, {
      headers: { "x-fibre-private-token": privateToken },
    });
    assert.equal(recovered.body.trace.privateStance.desiredAction, "refuse");
    assert.equal((await requestJson(`${second.baseUrl}/threads/${fixture.threadId}/events`)).body.events.length, 1);
    assert.equal(JSON.stringify((await requestJson(`${second.baseUrl}/threads/${fixture.threadId}`)).body).includes("privateRationale"), false);
  } finally {
    if (first) await first.stop().catch(() => {});
    if (second) await second.stop().catch(() => {});
    rmSync(directory, { recursive: true, force: true });
  }
});
