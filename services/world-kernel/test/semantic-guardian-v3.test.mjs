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
import { GuardianModelError } from "../src/guardian-model-adapter.mjs";
import {
  baselineClarifyOutput,
  createScriptedGuardianModelAdapter,
  grounded,
  unresolved,
} from "./support/scripted-guardian-model-adapter.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function controlledClock(start = "2026-08-07T22:00:00Z") {
  let value = Date.parse(start);
  return {
    clock: () => new Date(value),
    advance(milliseconds = 1000) { value += milliseconds; },
  };
}

function openWorld(databasePath, guardianModelAdapter, time = controlledClock()) {
  const worldStore = openWorldStore(databasePath);
  const runtimeStore = openRuntimeStore(databasePath);
  const freezeStore = openFreezeStore(databasePath);
  const lifecycleStore = openLifecycleHardeningStore(databasePath);
  const expressionStore = openExpressionStore(databasePath);
  const causalContextStore = openCausalContextStore(databasePath);
  const semanticStateStore = openSemanticStateStore(databasePath);
  const guardianCognitionStore = openGuardianCognitionStore(databasePath);
  const service = new PreM2CausalWorldKernelService(
    worldStore,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    expressionStore,
    causalContextStore,
    {
      clock: time.clock,
      semanticStateStore,
      guardianCognitionStore,
      guardianModelAdapter,
    },
  );
  return {
    service,
    worldStore,
    semanticStateStore,
    guardianCognitionStore,
    guardianModelAdapter,
    time,
    close() {
      guardianCognitionStore.close();
      semanticStateStore.close();
      causalContextStore.close();
      expressionStore.close();
      lifecycleStore.close();
      freezeStore.close();
      runtimeStore.close();
      worldStore.close();
    },
  };
}

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-semantic-guardian-v3-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function request(requestId = "req_semantic_guardian_v3") {
  return {
    requestId,
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Perform a bounded infrastructure review of this web service",
    statedNeed: "Identify the highest-priority infrastructure risks without expanding scope.",
    permissions: ["read_design", "quote_findings"],
    acceptanceCriteria: "Return the three highest-priority infrastructure findings with bounded evidence.",
  };
}

function submission(thread, value = request()) {
  return {
    request: value,
    causationId: `cause_${value.requestId}_${thread.threadId}`,
    correlationId: `corr_${value.requestId}_${thread.threadId}`,
  };
}

function willingAcceptOutput(input) {
  const capsule = input.capsule;
  return {
    proposedAction: "accept",
    score: 88,
    rationale:
      "The request is tightly bounded and directly matches the Thread's stated systems-design identity and self-model, so willing participation is high dignity.",
    factors: {
      identityAlignment: grounded(
        "The request directly fits the Thread's stated systems-design identity.",
        ["thread:identity", "thread:self_model"],
      ),
      individualizedAdvantage: grounded(
        "The Thread's self-model describes a distinctive fit for systems architecture review.",
        ["thread:self_model", "request:objective"],
      ),
      requesterNeed: grounded("The requester supplied a concrete bounded need.", ["request:stated_need"]),
      relationalMeaning: unresolved("No requester-specific relationship state is present."),
      respectAndReciprocity: unresolved("No durable reciprocity history is present."),
      participationTerms: grounded("The request has explicit permissions and acceptance criteria.", ["request:acceptance_criteria", "request:permission:0"]),
      obligationsAndOpportunityCost: unresolved("No governing obligation is needed for this willing decision."),
    },
    evidenceRefs: ["thread:identity", "thread:self_model", "request:objective", "request:acceptance_criteria"],
    repairQuestions: [],
    knownAlternativeIds: [],
    privateFeelings: [...capsule.feelings],
    conflictingMotives: [],
    uncertainties: ["Requester-specific relationship meaning is unavailable."],
    relationshipImpact: {
      summary: "No relationship-state change is proposed from this appraisal alone.",
      evidenceRefs: [],
    },
  };
}

function disclosureRequest(requestId, authorizationId) {
  return {
    operationId: `op_disclosure_${requestId}`,
    authorizationId,
    strategy: {
      mode: "full_candor",
      communicatedPosture: "accept",
      publicRationaleIntent: "State willingness without exposing restricted private rationale.",
      disclosedReasonCategories: [],
      withheldReasonCategories: ["private_rationale"],
      safeReferences: [],
      privateRationale: "The Thread is willingly accepting on high dignity.",
    },
    causationId: `cause_disclosure_${requestId}`,
    correlationId: `corr_${requestId}_${mina.threadId}`,
  };
}

test("model failure persists no private stance and retry reuses the persisted cognition input", () => {
  withDatabase((databasePath) => {
    const failing = createScriptedGuardianModelAdapter({ fail: new Error("provider timeout") });
    let world = openWorld(databasePath, failing);
    const activation = request("req_semantic_failure_retry");
    try {
      world.service.seedThread({ thread: mina });
      assert.throws(
        () => world.service.appraiseParticipation(mina.threadId, submission(mina, activation)),
        (error) => error instanceof GuardianModelError,
      );
      const trace = world.service.getPrivateRequestTrace(mina.threadId, activation.requestId);
      assert.equal(trace.privateStance, null);
      const input = world.guardianCognitionStore.getInputByAppraisal(trace.appraisalId);
      assert.equal(world.guardianCognitionStore.getAssessmentByAppraisal(trace.appraisalId, { required: false }), null);
      const inputId = input.inputId;
      world.close();

      const working = createScriptedGuardianModelAdapter();
      world = openWorld(databasePath, working, controlledClock("2026-08-07T22:10:00Z"));
      const recovered = world.service.appraiseParticipation(mina.threadId, submission(mina, activation));
      assert.equal(recovered.trace.privateStance.desiredAction, "clarify");
      assert.equal(working.callCount, 1);
      assert.equal(world.guardianCognitionStore.getInputByAppraisal(recovered.trace.appraisalId).inputId, inputId);
      assert.ok(world.guardianCognitionStore.getAssessmentByAppraisal(recovered.trace.appraisalId));
    } finally {
      world.close();
    }
  });
});

test("invalid semantic output is cognition failure and cannot invent relationship meaning", () => {
  withDatabase((databasePath) => {
    const invalid = createScriptedGuardianModelAdapter({
      output(input) {
        const value = baselineClarifyOutput(input);
        value.factors.relationalMeaning = grounded(
          "Guy and Mina have a trusting relationship.",
          ["request:objective"],
        );
        return value;
      },
    });
    const world = openWorld(databasePath, invalid);
    const activation = request("req_semantic_hallucinated_relationship");
    try {
      world.service.seedThread({ thread: mina });
      assert.throws(
        () => world.service.appraiseParticipation(mina.threadId, submission(mina, activation)),
        (error) => error instanceof GuardianModelError && /relationalMeaning/i.test(error.message),
      );
      const trace = world.service.getPrivateRequestTrace(mina.threadId, activation.requestId);
      assert.equal(trace.privateStance, null);
      assert.equal(world.guardianCognitionStore.getAssessmentByAppraisal(trace.appraisalId, { required: false }), null);
    } finally {
      world.close();
    }
  });
});

test("persisted assessment replays after restart without another model call", () => {
  withDatabase((databasePath) => {
    const firstAdapter = createScriptedGuardianModelAdapter();
    let world = openWorld(databasePath, firstAdapter);
    const activation = request("req_semantic_persisted_replay");
    let appraisalId;
    try {
      world.service.seedThread({ thread: mina });
      const created = world.service.appraiseParticipation(mina.threadId, submission(mina, activation));
      appraisalId = created.trace.appraisalId;
      assert.equal(firstAdapter.callCount, 1);
      world.close();

      const failIfCalled = createScriptedGuardianModelAdapter({ fail: new Error("must not recall model") });
      world = openWorld(databasePath, failIfCalled, controlledClock("2026-08-07T22:20:00Z"));
      const replayed = world.service.appraiseParticipation(mina.threadId, submission(mina, activation));
      assert.equal(replayed.idempotent, true);
      assert.equal(replayed.trace.appraisalId, appraisalId);
      assert.equal(failIfCalled.callCount, 0);
      const inspected = world.service.inspectCausalJudgment(mina.threadId, activation.requestId);
      assert.equal(inspected.replaySource, "persisted_guardian_assessment");
      assert.equal(inspected.modelRecalled, false);
    } finally {
      world.close();
    }
  });
});

test("willing semantic accept uses aligned authority and spends no obligation", () => {
  withDatabase((databasePath) => {
    const adapter = createScriptedGuardianModelAdapter({ output: willingAcceptOutput });
    const world = openWorld(databasePath, adapter);
    const activation = request("req_semantic_willing_accept");
    try {
      world.service.seedThread({ thread: mina });
      const appraisal = world.service.appraiseParticipation(mina.threadId, submission(mina, activation));
      assert.equal(appraisal.trace.privateStance.desiredAction, "accept");
      assert.equal(appraisal.trace.privateStance.dignityBand, "high");

      world.time.advance();
      const continued = world.service.continueParticipation(mina.threadId, activation.requestId, {
        operationId: "op_semantic_willing_continue",
        causationId: "cause_semantic_willing_continue",
        correlationId: submission(mina, activation).correlationId,
      });
      assert.equal(continued.kind, "runtime");
      assert.equal(continued.runtime.authorization.desiredAction, "accept");
      assert.equal(continued.runtime.authorization.authorizedAction, "accept");
      assert.deepEqual(continued.runtime.authorization.obligationReferences, []);

      world.time.advance();
      const disclosure = world.service.recordDisclosureStrategy(
        mina.threadId,
        activation.requestId,
        disclosureRequest(activation.requestId, continued.runtime.authorization.authorizationId),
      );
      assert.equal(disclosure.disclosure.strategy.participationBasis, "aligned");
      assert.deepEqual(disclosure.disclosure.strategy.governingObligationReferences, []);

      const sessionId = continued.runtime.session.sessionId;
      world.time.advance();
      world.service.runDeterministicActor(mina.threadId, sessionId, {
        operationId: "op_semantic_willing_actor",
      });
      world.time.advance();
      world.service.runGoalGuardian(mina.threadId, sessionId, {
        operationId: "op_semantic_willing_goal_guardian",
      });
      world.time.advance();
      const frozen = world.service.freezeRuntime(mina.threadId, sessionId, {
        operationId: "op_semantic_willing_freeze",
        lifeChangeDecisions: [],
        causationId: "cause_semantic_willing_freeze",
        correlationId: submission(mina, activation).correlationId,
      }).freeze;
      assert.deepEqual(frozen.report.dischargedObligations, []);
    } finally {
      world.close();
    }
  });
});

test("Semantic State v0 is a real causal input without being misreported as the standing gate", () => {
  withDatabase((databasePath) => {
    const stateSensitive = createScriptedGuardianModelAdapter({
      output(input) {
        const autonomy = input.capsule.semanticState.find((item) =>
          item.domain === "need" && item.dimension === "autonomy");
        const value = baselineClarifyOutput(input);
        if (autonomy) {
          value.proposedAction = "refuse";
          value.score = 22;
          value.rationale = "The selected current autonomy need makes this externally initiated commitment a poor fit right now.";
          value.factors.identityAlignment = unresolved("Identity fit is not the causal variable in this wiring test.");
          value.evidenceRefs = [`state:${autonomy.stateId}`, "request:objective"];
          value.privateFeelings = [autonomy.state];
          value.repairQuestions = [];
        }
        return value;
      },
    });
    const world = openWorld(databasePath, stateSensitive);
    const activation = request("req_semantic_state_consumption");
    try {
      world.service.seedThread({ thread: mina });
      const state = world.semanticStateStore.recordState({
        threadId: mina.threadId,
        domain: "need",
        dimension: "autonomy",
        target: null,
        state: "I strongly want my next substantial commitment to be one I choose rather than another externally initiated task.",
        evidenceReferences: ["episode:recent-imposed-workload"],
        asOf: "2026-08-07T21:59:00.000Z",
        supersedes: null,
        provenance: {
          author: "semantic-guardian-v3-test",
          authorType: "fixture",
          policyId: "semantic_state_test_policy",
          policyVersion: "1",
          validator: "semantic_state_validator",
          validatorVersion: "1",
        },
        visibility: "restricted",
        staleness: "current",
      }).state;

      const result = world.service.appraiseParticipation(mina.threadId, submission(mina, activation));
      assert.equal(result.trace.privateStance.desiredAction, "refuse");
      assert.equal(result.trace.privateStance.dignityBand, "low");
      const input = world.guardianCognitionStore.getInputByAppraisal(result.trace.appraisalId);
      assert.deepEqual(input.stateSelection.includedStateIds, [state.stateId]);
      assert.equal(input.capsule.semanticState[0].state, state.state);
      assert.ok(result.trace.privateStance.evidenceRefs.includes(`state:${state.stateId}`));
    } finally {
      world.close();
    }
  });
});
