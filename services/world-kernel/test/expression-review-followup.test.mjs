import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

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
import { ExpressionRejectedError } from "../src/expression-domain.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const obligation = fixture.currentState.unresolvedIntentions[0];
const privateToken = "expression-review-private-token-12345";

async function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-expression-review-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return await run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function controlledClock(start = "2026-08-06T22:10:00Z") {
  let value = Date.parse(start);
  return {
    clock: () => new Date(value),
    advance(milliseconds = 1000) {
      value += milliseconds;
    },
  };
}

function openWorld(databasePath, time = controlledClock()) {
  const worldStore = openWorldStore(localWorldStateStorage(databasePath));
  const runtimeStore = openRuntimeStore(localWorldStateStorage(databasePath));
  const freezeStore = openFreezeStore(localWorldStateStorage(databasePath));
  const lifecycleStore = openLifecycleHardeningStore(localWorldStateStorage(databasePath));
  const expressionStore = openExpressionStore(localWorldStateStorage(databasePath));
  const service = new M1ExpressionWorldKernelService(
    worldStore,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    expressionStore,
    { clock: time.clock },
  );
  return {
    service,
    time,
    close() {
      expressionStore.close();
      lifecycleStore.close();
      freezeStore.close();
      runtimeStore.close();
      worldStore.close();
    },
  };
}

function activationRequest(requestId) {
  return {
    requestId,
    trigger: "human_request",
    requester: {
      entityId: "human_guy",
      kind: "human",
      displayName: "Guy",
    },
    objective: "Review a bounded security design",
    statedNeed: "Get a careful, attributable review",
    permissions: ["read_design"],
    acceptanceCriteria: "Return a concise review",
  };
}

function createStance(
  service,
  requestId,
  { action = "refuse", score = 15, includeObligation = false } = {},
) {
  const request = activationRequest(requestId);
  const trace = service.recordRequestAppraisal(fixture.threadId, {
    request,
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: includeObligation ? [obligation] : [],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-06T22:00:00Z",
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
      proposedAction: action,
      score,
      rationale:
        action === "accept"
          ? "This request is individualized, bounded, and aligned with Mina's role."
          : "This request is a poor match for Mina's individualized value.",
      factors: {
        identityAlignment: action === "accept" ? "Strong fit" : "Weak fit",
        individualizedAdvantage: action === "accept" ? "High" : "Low",
        requesterNeed: "Concrete requester need",
        relationalMeaning: "Known requester",
        respectAndReciprocity: "Respectful terms",
        participationTerms: "Bounded request",
        obligationsAndOpportunityCost: includeObligation
          ? "One recorded obligation may govern participation."
          : "No selected obligation governs participation.",
      },
      evidenceRefs: ["mem_mina_first_review"],
      repairQuestions: [],
      knownAlternatives: [],
      feelings: action === "accept" ? ["engaged"] : ["resistant"],
      conflictingMotives: [],
      uncertainties: [],
      relationshipImpact: {
        entity: request.requester,
        fondnessDelta: 0,
        resentmentDelta: 0,
        rationale: "No relationship change is warranted.",
        evidenceRefs: [],
      },
    },
    recordedAt: "2026-08-06T22:01:00Z",
    causationId: `cause_stance_${requestId}`,
    correlationId: trace.correlationId,
  }).trace;
}

function nonExecutionBody(
  requestId,
  authorizedAction,
  { obligationReferences = [] } = {},
) {
  return {
    operationId: `op_auth_${requestId}`,
    decision: {
      authorizedAction,
      rationale: `Record ${authorizedAction} without acquiring runtime.`,
      obligationReferences,
    },
    causationId: `cause_auth_${requestId}`,
    correlationId: `corr_${requestId}`,
  };
}

function acquireBody(requestId, { obligationReferences = [] } = {}) {
  return {
    operationId: `op_runtime_${requestId}`,
    decision: {
      authorizedAction: "accept",
      rationale: obligationReferences.length
        ? "Proceed under the exact recorded obligation while preserving the private refusal."
        : "Proceed with the bounded request.",
      obligationReferences,
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
    },
    causationId: `cause_runtime_${requestId}`,
    correlationId: `corr_${requestId}`,
  };
}

function disclosureBody(requestId, authorizationId, posture) {
  return {
    operationId: `op_disclosure_${requestId}_${posture}`,
    authorizationId,
    strategy: {
      mode: "tactful_candor",
      communicatedPosture: posture,
      publicRationaleIntent: "Communicate only the authorized participation posture.",
      disclosedReasonCategories: [],
      withheldReasonCategories: ["private_feelings", "dignity_evidence"],
      safeReferences: [],
      privateRationale: "Preserve private interior state while avoiding a contradictory outward claim.",
    },
    causationId: `cause_disclosure_${requestId}_${posture}`,
    correlationId: `corr_${requestId}`,
  };
}

async function requestJson(baseUrl, path, { method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "x-fibre-private-token": privateToken,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

test("both authorization-writer orderings return stable conflicts instead of SQLite 500s", async () =>
  withDatabase(async (databasePath) => {
    const world = openWorld(databasePath);
    world.service.seedThread({ thread: fixture });

    const firstRequest = "req_review_nonexec_then_runtime";
    createStance(world.service, firstRequest, {
      action: "refuse",
      score: 14,
      includeObligation: true,
    });
    world.service.issueNonExecutionAuthorization(
      fixture.threadId,
      firstRequest,
      nonExecutionBody(firstRequest, "refuse"),
    );

    const server = createExpressionWorldKernelHttpServer({
      service: world.service,
      privateToken,
    });
    try {
      const address = await listenWorldKernelHttpServer(server, {
        host: "127.0.0.1",
        port: 0,
      });
      const baseUrl = `http://${address.host}:${address.port}`;
      const first = await requestJson(
        baseUrl,
        `/threads/${fixture.threadId}/private/requests/${firstRequest}/runtime`,
        {
          method: "POST",
          body: acquireBody(firstRequest, { obligationReferences: [obligation] }),
        },
      );
      assert.equal(first.status, 409);
      assert.equal(first.body.error.code, "RUNTIME_CONFLICT");
      assert.match(first.body.error.message, /participation authority/i);

      const secondRequest = "req_review_runtime_then_nonexec";
      createStance(world.service, secondRequest, {
        action: "refuse",
        score: 13,
        includeObligation: true,
      });
      const runtime = await requestJson(
        baseUrl,
        `/threads/${fixture.threadId}/private/requests/${secondRequest}/runtime`,
        {
          method: "POST",
          body: acquireBody(secondRequest, { obligationReferences: [obligation] }),
        },
      );
      assert.equal(runtime.status, 201);

      const reverse = await requestJson(
        baseUrl,
        `/threads/${fixture.threadId}/private/requests/${secondRequest}/authorization`,
        {
          method: "POST",
          body: nonExecutionBody(secondRequest, "refuse"),
        },
      );
      assert.equal(reverse.status, 409);
      assert.equal(reverse.body.error.code, "EXPRESSION_CONFLICT");
    } finally {
      await closeWorldKernelHttpServer(server);
      world.close();
    }
  }));

test("outward posture cannot contradict participation authority in either direction", async () =>
  withDatabase((databasePath) => {
    const world = openWorld(databasePath);
    world.service.seedThread({ thread: fixture });

    const refuseRequest = "req_review_posture_refuse";
    createStance(world.service, refuseRequest, { action: "refuse", score: 12 });
    const refusal = world.service.issueNonExecutionAuthorization(
      fixture.threadId,
      refuseRequest,
      nonExecutionBody(refuseRequest, "refuse"),
    ).authorization.authorization;

    assert.throws(
      () =>
        world.service.recordDisclosureStrategy(
          fixture.threadId,
          refuseRequest,
          disclosureBody(refuseRequest, refusal.authorizationId, "negotiate"),
        ),
      ExpressionRejectedError,
    );
    assert.doesNotThrow(() =>
      world.service.recordDisclosureStrategy(
        fixture.threadId,
        refuseRequest,
        disclosureBody(refuseRequest, refusal.authorizationId, "noncommittal"),
      ));

    const acceptRequest = "req_review_posture_accept";
    createStance(world.service, acceptRequest, { action: "accept", score: 86 });
    const runtime = world.service.acquireThawRuntime(
      fixture.threadId,
      acceptRequest,
      acquireBody(acceptRequest),
    );
    const authorizationId = runtime.runtime.authorization.authorizationId;
    for (const posture of ["refuse", "clarify", "negotiate", "delegate", "noncommittal"]) {
      assert.throws(
        () =>
          world.service.recordDisclosureStrategy(
            fixture.threadId,
            acceptRequest,
            disclosureBody(acceptRequest, authorizationId, posture),
          ),
        ExpressionRejectedError,
      );
    }
    assert.doesNotThrow(() =>
      world.service.recordDisclosureStrategy(
        fixture.threadId,
        acceptRequest,
        disclosureBody(acceptRequest, authorizationId, "accept"),
      ));
    world.close();
  }));

test("non-execution authority consults the historical discharge ledger before current obligation text", async () =>
  withDatabase((databasePath) => {
    let world = openWorld(databasePath);
    world.service.seedThread({ thread: fixture });

    const spentRequest = "req_review_spent_source";
    createStance(world.service, spentRequest, {
      action: "refuse",
      score: 11,
      includeObligation: true,
    });
    const runtime = world.service.acquireThawRuntime(
      fixture.threadId,
      spentRequest,
      acquireBody(spentRequest, { obligationReferences: [obligation] }),
    ).runtime;

    const targetRequest = "req_review_spent_target";
    createStance(world.service, targetRequest, {
      action: "refuse",
      score: 10,
      includeObligation: true,
    });
    const seedEventId = world.service.listEvents(fixture.threadId)[0].eventId;
    world.close();

    const database = new DatabaseSync(databasePath, {
      enableForeignKeyConstraints: true,
    });
    const zeroDigest = `sha256:${"0".repeat(64)}`;
    const oneDigest = `sha256:${"1".repeat(64)}`;
    database.prepare(`
      INSERT INTO authorization_consumptions(
        authorization_id,operation_id,operation_digest,session_id,thread_id,
        request_id,event_id,consumed_at,obligation_refs_json,consumption_digest
      ) VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(
      runtime.authorization.authorizationId,
      "op_review_consumption",
      zeroDigest,
      runtime.session.sessionId,
      fixture.threadId,
      spentRequest,
      seedEventId,
      "2026-08-06T22:05:00Z",
      JSON.stringify([obligation]),
      oneDigest,
    );
    database.close();

    world = openWorld(databasePath);
    const override = nonExecutionBody(targetRequest, "clarify", {
      obligationReferences: [obligation],
    });
    assert.throws(
      () =>
        world.service.issueNonExecutionAuthorization(
          fixture.threadId,
          targetRequest,
          override,
        ),
      (error) => {
        assert.ok(error instanceof ExpressionRejectedError);
        assert.match(error.message, /already discharged by op_review_consumption/i);
        return true;
      },
    );
    world.close();
  }));
