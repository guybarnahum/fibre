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
import {
  ExpressionConflictError,
  ExpressionRejectedError,
} from "../src/expression-domain.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const obligation = fixture.currentState.unresolvedIntentions[0];

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-expression-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function controlledClock(start = "2026-08-06T21:30:00Z") {
  let value = Date.parse(start);
  return {
    clock: () => new Date(value),
    advance(milliseconds = 1000) { value += milliseconds; },
  };
}

function openExpressionWorld(databasePath, time = controlledClock()) {
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
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Review a bounded security design",
    statedNeed: "Get a careful, attributable review",
    permissions: ["read_design", "quote_findings"],
    acceptanceCriteria: "Return a concise review",
  };
}

function appraisalSubmission(requestId, { includeObligation = false } = {}) {
  return {
    request: activationRequest(requestId),
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: includeObligation ? [obligation] : [],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-06T21:20:00Z",
    causationId: `cause_appraise_${requestId}`,
    correlationId: `corr_${requestId}`,
  };
}

function assessment(trace, { action = "accept", score = 82 } = {}) {
  return {
    threadId: trace.threadId,
    snapshotVersion: trace.snapshotVersion,
    requestId: trace.requestId,
    requestFingerprint: trace.requestFingerprint,
    policy: { id: "dignity_guardian", version: "1" },
    proposedAction: action,
    score,
    rationale: action === "refuse"
      ? "The request is a poor match for Mina's individualized value in this context."
      : "The request is individualized, bounded, respectful, and aligned with Mina's growth.",
    factors: {
      identityAlignment: "The request has a clear relationship to Mina's systems identity.",
      individualizedAdvantage: action === "refuse" ? "Little individualized advantage." : "Uses Mina's durable review history.",
      requesterNeed: "The requester has a concrete need.",
      relationalMeaning: "The requester is identifiable and attributable.",
      respectAndReciprocity: "Terms are explicit.",
      participationTerms: "The request is bounded.",
      obligationsAndOpportunityCost: "Any governing obligation is evaluated separately.",
    },
    evidenceRefs: ["mem_mina_first_review"],
    repairQuestions: [],
    knownAlternatives: [],
    feelings: action === "refuse" ? ["resistant"] : ["engaged", "careful"],
    conflictingMotives: ["Help where useful", "Preserve individualized agency"],
    uncertainties: [],
    relationshipImpact: {
      entity: activationRequest(trace.requestId).requester,
      fondnessDelta: 0,
      resentmentDelta: 0,
      rationale: "No relationship change is warranted from this request alone.",
      evidenceRefs: [],
    },
  };
}

function seedAndStance(service, requestId, options = {}) {
  service.seedThread({ thread: fixture });
  const trace = service.recordRequestAppraisal(
    fixture.threadId,
    appraisalSubmission(requestId, options),
  ).trace;
  return service.recordPrivateStance(fixture.threadId, requestId, {
    assessment: assessment(trace, options),
    recordedAt: "2026-08-06T21:21:00Z",
    causationId: `cause_stance_${requestId}`,
    correlationId: trace.correlationId,
  }).trace;
}

function nonExecutionAuthorizationBody(requestId, action) {
  return {
    operationId: `op_auth_${requestId}`,
    decision: {
      authorizedAction: action,
      rationale: `Record the Thread's ${action} participation decision without acquiring runtime.`,
      obligationReferences: [],
    },
    causationId: `cause_auth_${requestId}`,
    correlationId: `corr_${requestId}`,
  };
}

function disclosureBody(requestId, authorizationId, { posture, mode = "tactful_candor" } = {}) {
  return {
    operationId: `op_disclosure_${requestId}`,
    authorizationId,
    strategy: {
      mode,
      communicatedPosture: posture,
      publicRationaleIntent: "Communicate the participation boundary without exposing private interior detail.",
      disclosedReasonCategories: [],
      withheldReasonCategories: ["private_feelings", "dignity_evidence"],
      safeReferences: [],
      privateRationale: "Preserve the distinction between interior appraisal and outward expression.",
    },
    causationId: `cause_disclosure_${requestId}`,
    correlationId: `corr_${requestId}`,
  };
}

function responseBody(requestId, strategyId) {
  return {
    operationId: `op_response_${requestId}`,
    strategyId,
    causationId: `cause_response_${requestId}`,
    correlationId: `corr_${requestId}`,
  };
}

function acquireBody(requestId, { obligationReferences = [] } = {}) {
  return {
    operationId: `op_runtime_${requestId}`,
    decision: {
      authorizedAction: "accept",
      rationale: obligationReferences.length
        ? "Proceed because Mina is honoring the exact recorded obligation while preserving her refusal as private stance."
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

test("persists refusal, disclosure, and sanitized response across restart", () =>
  withDatabase((databasePath) => {
    const time = controlledClock();
    let world = openExpressionWorld(databasePath, time);
    const trace = seedAndStance(world.service, "req_expression_refuse", { action: "refuse", score: 18 });
    const auth = world.service.issueNonExecutionAuthorization(
      fixture.threadId,
      trace.requestId,
      nonExecutionAuthorizationBody(trace.requestId, "refuse"),
    );
    assert.equal(auth.authorization.authorization.authorizedAction, "refuse");
    const disclosure = world.service.recordDisclosureStrategy(
      fixture.threadId,
      trace.requestId,
      disclosureBody(trace.requestId, auth.authorization.authorization.authorizationId, { posture: "refuse" }),
    );
    const response = world.service.recordAudienceResponse(
      fixture.threadId,
      trace.requestId,
      responseBody(trace.requestId, disclosure.disclosure.strategy.strategyId),
    );
    assert.equal(response.response.response.message, "I will not take this request on.");
    assert.equal(response.response.response.deliveryStatus, "not_sent");
    assert.equal(response.response.response.performedActionStatus, "none_recorded");
    assert.equal(response.response.response.completionStatus, "not_claimed");
    for (const field of ["desiredAction", "dignityBand", "privateRationale", "withheldReasonCategories", "governingObligationReferences"]) {
      assert.equal(field in response.response.response, false);
    }
    assert.equal(world.service.verifyExpressionIntegrity(fixture.threadId, trace.requestId).audienceSafe, true);

    time.advance(60_000);
    assert.equal(world.service.issueNonExecutionAuthorization(fixture.threadId, trace.requestId, nonExecutionAuthorizationBody(trace.requestId, "refuse")).idempotent, true);
    assert.equal(world.service.recordDisclosureStrategy(fixture.threadId, trace.requestId, disclosureBody(trace.requestId, auth.authorization.authorization.authorizationId, { posture: "refuse" })).idempotent, true);
    assert.equal(world.service.recordAudienceResponse(fixture.threadId, trace.requestId, responseBody(trace.requestId, disclosure.disclosure.strategy.strategyId)).idempotent, true);

    const expected = world.service.getExpressionChain(fixture.threadId, trace.requestId);
    world.close();
    world = openExpressionWorld(databasePath, time);
    assert.deepEqual(world.service.getExpressionChain(fixture.threadId, trace.requestId), expected);
    world.close();
  }));

test("accepted runtime authorization drives expression without claiming performed work", () =>
  withDatabase((databasePath) => {
    const world = openExpressionWorld(databasePath);
    const trace = seedAndStance(world.service, "req_expression_accept", { action: "accept", score: 88 });
    const runtime = world.service.acquireThawRuntime(fixture.threadId, trace.requestId, acquireBody(trace.requestId));
    const disclosure = world.service.recordDisclosureStrategy(
      fixture.threadId,
      trace.requestId,
      disclosureBody(trace.requestId, runtime.runtime.authorization.authorizationId, { posture: "accept" }),
    );
    const response = world.service.recordAudienceResponse(
      fixture.threadId,
      trace.requestId,
      responseBody(trace.requestId, disclosure.disclosure.strategy.strategyId),
    ).response.response;
    assert.equal(response.message, "I can take this on.");
    assert.equal(response.performedActionStatus, "none_recorded");
    assert.equal(response.completionStatus, "not_claimed");
    assert.equal(world.service.listEvents(fixture.threadId).length, 1);
    world.close();
  }));

test("obligation-mediated refusal to accept remains compulsion in the private chain", () =>
  withDatabase((databasePath) => {
    const world = openExpressionWorld(databasePath);
    const trace = seedAndStance(world.service, "req_expression_obligation", { action: "refuse", score: 16, includeObligation: true });
    const runtime = world.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody(trace.requestId, { obligationReferences: [obligation] }),
    );
    assert.equal(runtime.runtime.authorization.desiredAction, "refuse");
    assert.equal(runtime.runtime.authorization.authorizedAction, "accept");
    const disclosure = world.service.recordDisclosureStrategy(
      fixture.threadId,
      trace.requestId,
      disclosureBody(trace.requestId, runtime.runtime.authorization.authorizationId, { posture: "accept", mode: "full_candor" }),
    );
    assert.equal(disclosure.disclosure.strategy.desiredAction, "refuse");
    assert.equal(disclosure.disclosure.strategy.authorizedAction, "accept");
    assert.equal(disclosure.disclosure.strategy.participationBasis, "obligation_override");
    assert.deepEqual(disclosure.disclosure.strategy.governingObligationReferences, [obligation]);
    const response = world.service.recordAudienceResponse(
      fixture.threadId,
      trace.requestId,
      responseBody(trace.requestId, disclosure.disclosure.strategy.strategyId),
    ).response.response;
    assert.match(response.message, /recorded obligation/i);
    assert.equal("desiredAction" in response, false);
    assert.equal("governingObligationReferences" in response, false);
    world.close();
  }));

test("expression guards reject false acceptance, unsafe references, and changed retries", () =>
  withDatabase((databasePath) => {
    const world = openExpressionWorld(databasePath);
    const trace = seedAndStance(world.service, "req_expression_guards", { action: "refuse", score: 12 });
    assert.throws(
      () => world.service.issueNonExecutionAuthorization(fixture.threadId, trace.requestId, nonExecutionAuthorizationBody(trace.requestId, "accept")),
      ExpressionRejectedError,
    );
    const auth = world.service.issueNonExecutionAuthorization(fixture.threadId, trace.requestId, nonExecutionAuthorizationBody(trace.requestId, "refuse"));
    assert.throws(
      () => world.service.recordDisclosureStrategy(fixture.threadId, trace.requestId, disclosureBody(trace.requestId, auth.authorization.authorization.authorizationId, { posture: "accept" })),
      ExpressionRejectedError,
    );
    const leaking = disclosureBody(trace.requestId, auth.authorization.authorization.authorizationId, { posture: "refuse" });
    leaking.strategy.safeReferences = [trace.privateStanceId];
    assert.throws(
      () => world.service.recordDisclosureStrategy(fixture.threadId, trace.requestId, leaking),
      ExpressionRejectedError,
    );
    const changed = nonExecutionAuthorizationBody(trace.requestId, "refuse");
    changed.decision.rationale = "Changed content under the same operation ID.";
    assert.throws(
      () => world.service.issueNonExecutionAuthorization(fixture.threadId, trace.requestId, changed),
      ExpressionConflictError,
    );
    world.close();
  }));

test("expression integrity detects response tampering after append-only protections are bypassed", () =>
  withDatabase((databasePath) => {
    let world = openExpressionWorld(databasePath);
    const trace = seedAndStance(world.service, "req_expression_tamper", { action: "refuse", score: 19 });
    const auth = world.service.issueNonExecutionAuthorization(fixture.threadId, trace.requestId, nonExecutionAuthorizationBody(trace.requestId, "refuse"));
    const disclosure = world.service.recordDisclosureStrategy(
      fixture.threadId,
      trace.requestId,
      disclosureBody(trace.requestId, auth.authorization.authorization.authorizationId, { posture: "refuse" }),
    );
    world.service.recordAudienceResponse(fixture.threadId, trace.requestId, responseBody(trace.requestId, disclosure.disclosure.strategy.strategyId));
    world.close();

    const database = new DatabaseSync(databasePath);
    database.exec("DROP TRIGGER audience_participation_responses_no_update");
    const row = database.prepare("SELECT response_json FROM audience_participation_responses WHERE request_id=?").get(trace.requestId);
    const tampered = JSON.parse(row.response_json);
    tampered.message = "I enthusiastically consented and completed the work.";
    database.prepare("UPDATE audience_participation_responses SET response_json=? WHERE request_id=?").run(JSON.stringify(tampered), trace.requestId);
    database.close();

    world = openExpressionWorld(databasePath);
    assert.throws(() => world.service.getAudienceResponse(fixture.threadId, trace.requestId), /digest|witness|match/i);
    world.close();
  }));
