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
import { M1ExpressionWorldKernelService } from "../src/expression-service.mjs";
import { createExpressionWorldKernelHttpServer } from "../src/expression-http-server.mjs";
import {
  closeWorldKernelHttpServer,
  listenWorldKernelHttpServer,
} from "../src/http-server.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const privateToken = "expression-private-token-12345";

function setup(databasePath) {
  const worldStore = openWorldStore(databasePath);
  const runtimeStore = openRuntimeStore(databasePath);
  const freezeStore = openFreezeStore(databasePath);
  const lifecycleStore = openLifecycleHardeningStore(databasePath);
  const expressionStore = openExpressionStore(databasePath);
  const service = new M1ExpressionWorldKernelService(
    worldStore,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    expressionStore,
    { clock: () => new Date("2026-08-06T21:40:00Z") },
  );
  return {
    service,
    closeStores() {
      expressionStore.close();
      lifecycleStore.close();
      freezeStore.close();
      runtimeStore.close();
      worldStore.close();
    },
  };
}

function request(requestId) {
  return {
    requestId,
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Review a bounded API design",
    statedNeed: "Identify privacy risks",
    permissions: ["read_design"],
    acceptanceCriteria: "Return a bounded response",
  };
}

function createRefusalStance(service, requestId) {
  service.seedThread({ thread: fixture });
  const trace = service.recordRequestAppraisal(fixture.threadId, {
    request: request(requestId),
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: [],
      obligations: [],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-06T21:35:00Z",
    causationId: `cause_appraise_${requestId}`,
    correlationId: `corr_${requestId}`,
  }).trace;
  return service.recordPrivateStance(fixture.threadId, requestId, {
    assessment: {
      threadId: trace.threadId,
      snapshotVersion: trace.snapshotVersion,
      requestId: trace.requestId,
      requestFingerprint: trace.requestFingerprint,
      policy: { id: "dignity_guardian", version: "1" },
      proposedAction: "refuse",
      score: 15,
      rationale: "This request is not a good use of Mina's individualized participation.",
      factors: {
        identityAlignment: "Weak fit",
        individualizedAdvantage: "Low individualized advantage",
        requesterNeed: "Concrete but not uniquely Mina-dependent",
        relationalMeaning: "Neutral",
        respectAndReciprocity: "Respectful",
        participationTerms: "Bounded",
        obligationsAndOpportunityCost: "No obligation requires participation",
      },
      evidenceRefs: ["mem_mina_first_review"],
      repairQuestions: [],
      knownAlternatives: [],
      feelings: ["resistant"],
      conflictingMotives: [],
      uncertainties: [],
      relationshipImpact: {
        entity: request(requestId).requester,
        fondnessDelta: 0,
        resentmentDelta: 0,
        rationale: "No relationship change.",
        evidenceRefs: [],
      },
    },
    recordedAt: "2026-08-06T21:36:00Z",
    causationId: `cause_stance_${requestId}`,
    correlationId: trace.correlationId,
  }).trace;
}

async function json(base, path, { method = "GET", body, token = privateToken } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token === null ? {} : { "x-fibre-private-token": token }),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { response, payload: await response.json() };
}

test("restricted expression API persists a refusal and returns structural audience-response witnesses", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-expression-api-"));
  const databasePath = join(directory, "world.sqlite");
  const world = setup(databasePath);
  const requestId = "req_expression_api_refuse";
  createRefusalStance(world.service, requestId);
  const server = createExpressionWorldKernelHttpServer({
    service: world.service,
    privateToken,
  });
  try {
    const address = await listenWorldKernelHttpServer(server, { host: "127.0.0.1", port: 0 });
    const base = `http://${address.host}:${address.port}`;
    const prefix = `/threads/${fixture.threadId}/private/requests/${requestId}`;

    const denied = await json(base, `${prefix}/authorization`, { token: null });
    assert.equal(denied.response.status, 403);
    assert.equal(denied.payload.error.code, "PRIVATE_TOKEN_REQUIRED");

    const auth = await json(base, `${prefix}/authorization`, {
      method: "POST",
      body: {
        operationId: `op_auth_${requestId}`,
        decision: {
          authorizedAction: "refuse",
          rationale: "Record refusal without acquiring runtime.",
          obligationReferences: [],
        },
        causationId: `cause_auth_${requestId}`,
        correlationId: `corr_${requestId}`,
      },
    });
    assert.equal(auth.response.status, 201);
    const authorizationId = auth.payload.authorization.authorization.authorizationId;

    const disclosure = await json(base, `${prefix}/disclosure`, {
      method: "POST",
      body: {
        operationId: `op_disclosure_${requestId}`,
        authorizationId,
        strategy: {
          mode: "tactful_candor",
          communicatedPosture: "refuse",
          publicRationaleIntent: "State the boundary respectfully.",
          disclosedReasonCategories: [],
          withheldReasonCategories: ["private_feelings", "dignity_evidence"],
          safeReferences: [],
          privateRationale: "Keep private appraisal private.",
        },
        causationId: `cause_disclosure_${requestId}`,
        correlationId: `corr_${requestId}`,
      },
    });
    assert.equal(disclosure.response.status, 201);
    const strategyId = disclosure.payload.disclosure.strategy.strategyId;

    const recorded = await json(base, `${prefix}/response`, {
      method: "POST",
      body: {
        operationId: `op_response_${requestId}`,
        strategyId,
        causationId: `cause_response_${requestId}`,
        correlationId: `corr_${requestId}`,
      },
    });
    assert.equal(recorded.response.status, 201);
    assert.equal(recorded.payload.response.response.message, "I will not take this request on.");

    const visible = await json(base, `${prefix}/response`);
    assert.equal(visible.response.status, 200);
    const serialized = JSON.stringify(visible.payload);
    assert.doesNotMatch(serialized, /privateRationale|dignityBand|desiredAction|withheldReasonCategories/);
    assert.equal(visible.payload.response.response.deliveryStatus, "not_sent");
    assert.equal(visible.payload.response.response.performedActionStatus, "none_recorded");
    assert.equal(visible.payload.response.response.completionStatus, "not_claimed");

    const integrity = await json(base, `${prefix}/expression/integrity`);
    assert.equal(integrity.response.status, 200);
    assert.deepEqual(integrity.payload.audienceResponseStatus, {
      responsePresent: true,
      deliveryNotSent: true,
      performedActionNotRecorded: true,
      completionNotClaimed: true,
      boundedStatusWitnesses: true,
    });
    assert.equal(
      integrity.payload.audienceSafe,
      true,
      "legacy compatibility value must be derived from the structural witnesses",
    );
  } finally {
    await closeWorldKernelHttpServer(server);
    world.closeStores();
    rmSync(directory, { recursive: true, force: true });
  }
});
