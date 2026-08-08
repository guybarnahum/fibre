import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { openWorldStore } from "../services/world-kernel/src/persistence.mjs";
import { openRuntimeStore } from "../services/world-kernel/src/runtime-store.mjs";
import { openFreezeStore } from "../services/world-kernel/src/freeze-store.mjs";
import { openLifecycleHardeningStore } from "../services/world-kernel/src/lifecycle-hardening-store.mjs";
import { openExpressionStore } from "../services/world-kernel/src/expression-store.mjs";
import { openCausalContextStore } from "../services/world-kernel/src/causal-context-store.mjs";
import { openSemanticStateStore } from "../services/world-kernel/src/semantic-state-store.mjs";
import { openGuardianCognitionStore } from "../services/world-kernel/src/guardian-cognition-store.mjs";
import { PreM2CausalWorldKernelService } from "../services/world-kernel/src/causal-service.mjs";
import { GuardianModelError } from "../services/world-kernel/src/guardian-model-adapter.mjs";
import {
  DIGNITY_GUARDIAN_POLICY,
  DIGNITY_GUARDIAN_PROMPT_HASH,
  DIGNITY_GUARDIAN_RESPONSE_SCHEMA_HASH,
} from "../services/world-kernel/src/dignity-guardian.mjs";
import {
  baselineClarifyOutput,
  createScriptedGuardianModelAdapter,
  grounded,
  unresolved,
} from "../services/world-kernel/test/support/scripted-guardian-model-adapter.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const daniel = JSON.parse(
  readFileSync(new URL("../fixtures/threads/daniel.thread.json", import.meta.url), "utf8"),
);

function controlledClock(start = "2026-08-07T23:00:00Z") {
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

function withWorld(prefix, guardianModelAdapter, run) {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  const databasePath = join(directory, "world.sqlite");
  let world = openWorld(databasePath, guardianModelAdapter);
  try {
    return run({ world, databasePath, reopen(adapter, instant = "2026-08-08T00:00:00Z") {
      world.close();
      world = openWorld(databasePath, adapter, controlledClock(instant));
      return world;
    } });
  } finally {
    world.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

function request(requestId = "req_pre_m2_semantic_wiring") {
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

function submission(threadId, value) {
  return {
    request: value,
    causationId: `cause_${value.requestId}_${threadId}`,
    correlationId: `corr_${value.requestId}_${threadId}`,
  };
}

function willingAcceptOutput(input) {
  const capsule = input.capsule;
  return {
    proposedAction: "accept",
    score: 88,
    rationale:
      "The bounded request directly fits the Thread's systems-design identity and self-model, so willing participation is high dignity.",
    factors: {
      identityAlignment: grounded("The request directly fits the Thread's stated systems-design identity.", ["thread:identity", "thread:self_model"]),
      individualizedAdvantage: grounded("The self-model describes a distinctive fit for systems architecture review.", ["thread:self_model", "request:objective"]),
      requesterNeed: grounded("The requester supplied a bounded need.", ["request:stated_need"]),
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
    relationshipImpact: { summary: "No relationship-state change is proposed by this wiring fixture.", evidenceRefs: [] },
  };
}

function baselineArchitectureProof() {
  const adapter = createScriptedGuardianModelAdapter();
  return withWorld("fibre-pre-m2-semantic-architecture-", adapter, ({ world, reopen }) => {
    world.service.seedThread({ thread: mina });
    world.service.seedThread({ thread: daniel });
    const activation = request();
    const minaTrace = world.service.appraiseParticipation(
      mina.threadId,
      submission(mina.threadId, activation),
    ).trace;
    world.time.advance();
    const danielTrace = world.service.appraiseParticipation(
      daniel.threadId,
      submission(daniel.threadId, activation),
    ).trace;
    assert.equal(minaTrace.requestFingerprint, danielTrace.requestFingerprint);
    assert.equal(adapter.callCount, 2);
    const minaInspection = world.service.inspectCausalJudgment(mina.threadId, activation.requestId);
    const inputId = minaInspection.guardianInputId;
    const assessmentId = minaInspection.guardianAssessmentId;

    const noRecall = createScriptedGuardianModelAdapter({ fail: new Error("replay must not call model") });
    const restarted = reopen(noRecall);
    const replay = restarted.service.appraiseParticipation(
      mina.threadId,
      submission(mina.threadId, activation),
    );
    const replayInspection = restarted.service.inspectCausalJudgment(mina.threadId, activation.requestId);
    assert.equal(noRecall.callCount, 0);
    assert.equal(replay.idempotent, true);
    assert.equal(replayInspection.guardianInputId, inputId);
    assert.equal(replayInspection.guardianAssessmentId, assessmentId);
    return {
      sameMaterialRequest: true,
      callerAuthoredJudgmentReachable: false,
      evidenceClass: "scripted_wiring_only",
      semanticFitClaimed: false,
      persistedCognitionInput: true,
      persistedGuardianAssessment: true,
      fibreOwnedStateSelection: replayInspection.stateSelection.selectionAuthority === "fibre",
      mina: {
        desiredAction: minaTrace.privateStance.desiredAction,
        dignityBand: minaTrace.privateStance.dignityBand,
        policy: minaTrace.privateStance.policy,
      },
      daniel: {
        desiredAction: danielTrace.privateStance.desiredAction,
        dignityBand: danielTrace.privateStance.dignityBand,
        policy: danielTrace.privateStance.policy,
      },
      restart: {
        survived: true,
        replaySource: replayInspection.replaySource,
        modelRecalled: replayInspection.modelRecalled,
        modelCallCountAfterRestart: noRecall.callCount,
      },
    };
  });
}

function modelFailureProof() {
  const failing = createScriptedGuardianModelAdapter({ fail: new Error("simulated provider failure") });
  return withWorld("fibre-pre-m2-semantic-failure-", failing, ({ world }) => {
    world.service.seedThread({ thread: mina });
    const activation = request("req_pre_m2_model_failure");
    let error;
    try {
      world.service.appraiseParticipation(mina.threadId, submission(mina.threadId, activation));
    } catch (value) {
      error = value;
    }
    assert.ok(error instanceof GuardianModelError);
    const trace = world.service.getPrivateRequestTrace(mina.threadId, activation.requestId);
    const input = world.guardianCognitionStore.getInputByAppraisal(trace.appraisalId);
    const assessment = world.guardianCognitionStore.getAssessmentByAppraisal(trace.appraisalId, { required: false });
    return {
      cognitionInputPersisted: input !== null,
      guardianAssessmentPersisted: assessment !== null,
      privateStancePersisted: trace.privateStance !== null,
      fallbackJudgmentSynthesized: trace.privateStance !== null,
      errorClass: error.constructor.name,
    };
  });
}

function semanticStateSupportingProof() {
  const adapter = createScriptedGuardianModelAdapter({
    output(input) {
      const autonomy = input.capsule.semanticState.find((item) =>
        item.domain === "need" && item.dimension === "autonomy");
      const value = baselineClarifyOutput(input);
      if (autonomy) {
        value.proposedAction = "refuse";
        value.score = 22;
        value.rationale = "The selected current autonomy need makes this externally initiated commitment a poor fit right now.";
        value.factors.identityAlignment = unresolved("Identity is not the causal variable in this supporting wiring proof.");
        value.evidenceRefs = [`state:${autonomy.stateId}`, "request:objective"];
        value.repairQuestions = [];
      }
      return value;
    },
  });
  return withWorld("fibre-pre-m2-semantic-state-", adapter, ({ world }) => {
    world.service.seedThread({ thread: mina });
    const state = world.semanticStateStore.recordState({
      threadId: mina.threadId,
      domain: "need",
      dimension: "autonomy",
      target: null,
      state: "I strongly want my next substantial commitment to be one I choose rather than another externally initiated task.",
      evidenceReferences: ["episode:recent-imposed-workload"],
      asOf: "2026-08-07T22:59:00.000Z",
      supersedes: null,
      provenance: {
        author: "pre-m2-scripted-proof",
        authorType: "fixture",
        policyId: "semantic_state_proof_policy",
        policyVersion: "1",
        validator: "semantic_state_validator",
        validatorVersion: "1",
      },
      visibility: "restricted",
      staleness: "current",
    }).state;
    const activation = request("req_pre_m2_state_supporting");
    const trace = world.service.appraiseParticipation(
      mina.threadId,
      submission(mina.threadId, activation),
    ).trace;
    const inspection = world.service.inspectCausalJudgment(mina.threadId, activation.requestId);
    return {
      evidenceClass: "scripted_supporting_causality_only",
      standingGateClaimed: false,
      stateId: state.stateId,
      selected: inspection.stateSelection.includedStateIds.includes(state.stateId),
      desiredAction: trace.privateStance.desiredAction,
      dignityBand: trace.privateStance.dignityBand,
      stateCited: trace.privateStance.evidenceRefs.includes(`state:${state.stateId}`),
    };
  });
}

function alignedAuthorityProof() {
  const adapter = createScriptedGuardianModelAdapter({ output: willingAcceptOutput });
  return withWorld("fibre-pre-m2-semantic-aligned-", adapter, ({ world }) => {
    world.service.seedThread({ thread: mina });
    const activation = request("req_pre_m2_aligned_willing");
    const trace = world.service.appraiseParticipation(
      mina.threadId,
      submission(mina.threadId, activation),
    ).trace;
    const continued = world.service.continueParticipation(mina.threadId, activation.requestId, {
      operationId: "op_pre_m2_aligned_continue",
      causationId: "cause_pre_m2_aligned_continue",
      correlationId: submission(mina.threadId, activation).correlationId,
    });
    assert.equal(continued.kind, "runtime");
    return {
      evidenceClass: "scripted_authority_wiring_only",
      desiredAction: trace.privateStance.desiredAction,
      dignityBand: trace.privateStance.dignityBand,
      authorizedAction: continued.runtime.authorization.authorizedAction,
      obligationReferences: [...continued.runtime.authorization.obligationReferences],
      aligned:
        continued.runtime.authorization.desiredAction ===
        continued.runtime.authorization.authorizedAction,
    };
  });
}

export function runPreM2CausalProof() {
  const architecture = baselineArchitectureProof();
  const modelFailure = modelFailureProof();
  const semanticState = semanticStateSupportingProof();
  const alignedAuthority = alignedAuthorityProof();

  const architecturePassed =
    architecture.sameMaterialRequest &&
    architecture.callerAuthoredJudgmentReachable === false &&
    architecture.persistedCognitionInput &&
    architecture.persistedGuardianAssessment &&
    architecture.fibreOwnedStateSelection &&
    architecture.restart.survived &&
    architecture.restart.modelRecalled === false &&
    modelFailure.cognitionInputPersisted &&
    modelFailure.guardianAssessmentPersisted === false &&
    modelFailure.privateStancePersisted === false &&
    semanticState.selected &&
    semanticState.stateCited &&
    alignedAuthority.aligned &&
    alignedAuthority.obligationReferences.length === 0;

  return {
    version: 4,
    evidenceClass: "scripted_wiring_only",
    architecturePassed,
    standingDifferentialGatePassed: false,
    standingGateBlockers: [
      "The frozen held-out acceptance set has not yet been run against the pinned real model snapshot.",
      "Scripted adapters cannot prove semantic non-interchangeability, refusal behavior, paraphrase invariance, contradiction sensitivity, or non-deterministic stability.",
      "No personhood score movement is permitted until the real-model standing gate passes.",
    ],
    frozenSemanticBoundary: {
      policy: { ...DIGNITY_GUARDIAN_POLICY },
      promptHash: DIGNITY_GUARDIAN_PROMPT_HASH,
      responseSchemaHash: DIGNITY_GUARDIAN_RESPONSE_SCHEMA_HASH,
      acceptanceSetAuthoredAfterFreeze: true,
    },
    architecture,
    modelFailure,
    semanticState,
    alignedAuthority,
    liveCanonicalBasis: {
      modelBackedSemanticPathImplemented: true,
      willingSemanticAcceptArchitecturallyReachable: true,
      semanticIndividualityProved: false,
      semanticStateBehaviorallyCausalInScriptedSupportingEvidence: true,
      developmentLive: false,
      relationshipStateV0Persistable: true,
    },
    scoreClaims: {
      m1Frozen: "11/26",
      preM2Checkpoint: "11/26",
      nonInterchangeability: "remains 0 pending live held-out proof",
      dignityAndConsent: "remains 1 pending live refusal/grounding proof",
      development: "remains 0",
      cognitionReplaceability: "remains 1",
    },
  };
}

function main() {
  process.stdout.write(`${JSON.stringify(runPreM2CausalProof(), null, 2)}\n`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
