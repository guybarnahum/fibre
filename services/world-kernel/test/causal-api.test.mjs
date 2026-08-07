import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import { openRuntimeStore } from "../src/runtime-store.mjs";
import { openFreezeStore } from "../src/freeze-store.mjs";
import { openLifecycleHardeningStore } from "../src/lifecycle-hardening-store.mjs";
import { openExpressionStore } from "../src/expression-store.mjs";
import { openCausalContextStore } from "../src/causal-context-store.mjs";
import { openSemanticStateStore } from "../src/semantic-state-store.mjs";
import { openGuardianCognitionStore } from "../src/guardian-cognition-store.mjs";
import { PreM2CausalWorldKernelService } from "../src/causal-service.mjs";
import {
  closeWorldKernelHttpServer,
  listenWorldKernelHttpServer,
} from "../src/http-server.mjs";
import { createCausalWorldKernelHttpServer } from "../src/causal-http-server.mjs";
import { createScriptedGuardianModelAdapter } from "./support/scripted-guardian-model-adapter.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const daniel = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/daniel.thread.json", import.meta.url), "utf8"),
);
const PRIVATE_TOKEN = "causal-api-private-token-012345";

function request() {
  return {
    requestId: "req_causal_api_001",
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Perform a bounded infrastructure review of this web service",
    statedNeed: "Identify the highest-priority infrastructure risks.",
    permissions: ["read_design"],
    acceptanceCriteria: "Return three bounded findings.",
  };
}

async function json(url, options = {}) {
  const response = await fetch(url, options);
  return { response, body: await response.json() };
}

function headers() {
  return { "content-type": "application/json", "x-fibre-private-token": PRIVATE_TOKEN };
}

async function startCausalApi() {
  const directory = mkdtempSync(join(tmpdir(), "fibre-causal-api-"));
  const databasePath = join(directory, "world.sqlite");
  const worldStore = openWorldStore(databasePath);
  const runtimeStore = openRuntimeStore(databasePath);
  const freezeStore = openFreezeStore(databasePath);
  const lifecycleStore = openLifecycleHardeningStore(databasePath);
  const expressionStore = openExpressionStore(databasePath);
  const causalContextStore = openCausalContextStore(databasePath);
  const semanticStateStore = openSemanticStateStore(databasePath);
  const guardianCognitionStore = openGuardianCognitionStore(databasePath);
  const guardianModelAdapter = createScriptedGuardianModelAdapter();
  const service = new PreM2CausalWorldKernelService(
    worldStore,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    expressionStore,
    causalContextStore,
    {
      clock: () => new Date("2026-08-07T20:00:00Z"),
      semanticStateStore,
      guardianCognitionStore,
      guardianModelAdapter,
    },
  );
  service.seedThread({ thread: mina });
  service.seedThread({ thread: daniel });
  const server = createCausalWorldKernelHttpServer({ service, privateToken: PRIVATE_TOKEN });
  const address = await listenWorldKernelHttpServer(server, { host: "127.0.0.1", port: 0 });
  return {
    service,
    guardianModelAdapter,
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await closeWorldKernelHttpServer(server);
      guardianCognitionStore.close();
      semanticStateStore.close();
      causalContextStore.close();
      expressionStore.close();
      lifecycleStore.close();
      freezeStore.close();
      runtimeStore.close();
      worldStore.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("canonical private API derives a persisted v3 stance and rejects caller-authored private cognition", async () => {
  const runtime = await startCausalApi();
  try {
    assert.throws(
      () => runtime.service.recordRequestAppraisal(),
      /caller-authored request appraisal is disabled/i,
    );
    assert.throws(
      () => runtime.service.recordPrivateStance(),
      /caller-authored private stance is disabled/i,
    );
    assert.throws(
      () => runtime.service.acquireThawRuntime(),
      /caller-selected runtime acquisition is disabled/i,
    );

    const oldAppraisalShape = await json(
      `${runtime.baseUrl}/threads/${mina.threadId}/private/requests`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          request: request(),
          selection: { memoryRefs: [], relationshipRefs: [], obligations: [], knownAlternatives: [] },
          causationId: "cause_old_appraisal_shape",
        }),
      },
    );
    assert.equal(oldAppraisalShape.response.status, 400);
    assert.equal(oldAppraisalShape.body.error.code, "INVALID_REQUEST");

    const created = await json(
      `${runtime.baseUrl}/threads/${mina.threadId}/private/requests`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          request: request(),
          causationId: "cause_causal_api_appraise",
          correlationId: "corr_causal_api",
        }),
      },
    );
    assert.equal(created.response.status, 201);
    assert.equal(created.body.trace.privateStance.desiredAction, "clarify");
    assert.equal(created.body.trace.privateStance.dignityBand, "contested");
    assert.equal(created.body.trace.privateStance.policy.version, "3");
    assert.equal(created.body.trace.appraisal.causalContext.selectionAuthority, "fibre");
    assert.match(created.body.trace.privateStance.privateRationale, /does not yet have grounded semantic evidence/i);
    assert.equal(runtime.guardianModelAdapter.callCount, 1);

    const exactRetry = await json(
      `${runtime.baseUrl}/threads/${mina.threadId}/private/requests`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          request: request(),
          causationId: "cause_causal_api_appraise",
          correlationId: "corr_causal_api",
        }),
      },
    );
    assert.equal(exactRetry.response.status, 200);
    assert.equal(runtime.guardianModelAdapter.callCount, 1);

    const oldStance = await json(
      `${runtime.baseUrl}/threads/${mina.threadId}/private/requests/${request().requestId}/stance`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ assessment: { proposedAction: "refuse" } }),
      },
    );
    assert.equal(oldStance.response.status, 410);
    assert.equal(oldStance.body.error.code, "CALLER_AUTHORED_STANCE_DISABLED");

    const directRuntime = await json(
      `${runtime.baseUrl}/threads/${mina.threadId}/private/requests/${request().requestId}/runtime`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ decision: { authorizedAction: "accept" } }),
      },
    );
    assert.equal(directRuntime.response.status, 410);
    assert.equal(directRuntime.body.error.code, "CALLER_AUTHORED_PARTICIPATION_DISABLED");

    const continued = await json(
      `${runtime.baseUrl}/threads/${mina.threadId}/private/requests/${request().requestId}/participation`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          operationId: "op_causal_api_continue",
          causationId: "cause_causal_api_continue",
          correlationId: "corr_causal_api",
        }),
      },
    );
    assert.equal(continued.response.status, 201);
    assert.equal(continued.body.kind, "non_execution");
    assert.equal(continued.body.authorization.authorization.authorizedAction, "clarify");
    assert.deepEqual(runtime.service.listRuntimeSummaries(mina.threadId), []);
  } finally {
    await runtime.close();
  }
});
