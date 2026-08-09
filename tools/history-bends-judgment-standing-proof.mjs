import assert from "node:assert/strict";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openWorldStore } from "../services/world-kernel/src/persistence.mjs";
import { openRuntimeStore } from "../services/world-kernel/src/runtime-store.mjs";
import { openFreezeStore } from "../services/world-kernel/src/freeze-store.mjs";
import { openLifecycleHardeningStore } from "../services/world-kernel/src/lifecycle-hardening-store.mjs";
import { openExpressionStore } from "../services/world-kernel/src/expression-store.mjs";
import { openCausalContextStore } from "../services/world-kernel/src/causal-context-store.mjs";
import { openSemanticStateStore } from "../services/world-kernel/src/semantic-state-store.mjs";
import { openGuardianCognitionStore } from "../services/world-kernel/src/guardian-cognition-store.mjs";
import { PreM2CausalWorldKernelService } from "../services/world-kernel/src/causal-service.mjs";
import { selectCausalContext } from "../services/world-kernel/src/causal-context.mjs";
import { deterministicActorOutput } from "../services/world-kernel/src/runtime-domain.mjs";
import { requestFingerprint } from "../services/world-kernel/src/private-participation.mjs";
import { semanticDignityGuardianV4 } from "../services/world-kernel/src/dignity-guardian-v4.mjs";
import {
  createScriptedGuardianModelAdapter,
  grounded,
  unresolved,
} from "../services/world-kernel/test/support/scripted-guardian-model-adapter.mjs";
import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_1 as FROZEN } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-1.mjs";
import { HISTORY_BENDS_JUDGMENT_STANDING_GATE_V1 as SET } from
  "../experiments/history-bends-judgment/standing-gate-v1.mjs";

const subjectFixture = JSON.parse(
  readFileSync(new URL("../fixtures/threads/amara.thread.json", import.meta.url), "utf8"),
);

const PROVIDER_CODES = new Set([
  "MODEL_BILLING_QUOTA_EXHAUSTED",
  "MODEL_AUTHENTICATION_ERROR",
  "MODEL_PERMISSION_ERROR",
  "MODEL_REQUEST_CONFIGURATION_ERROR",
  "MODEL_HTTP_ERROR",
  "MODEL_TIMEOUT",
  "MODEL_TRANSPORT_ERROR",
  "MODEL_INCOMPLETE_RESPONSE",
  "MODEL_UNAVAILABLE",
  "MODEL_INVOCATION_FAILED",
]);

function normalizedSubject() {
  const thread = structuredClone(subjectFixture);
  thread.currentState.needs = [];
  thread.currentState.feelings = [];
  thread.currentState.unresolvedIntentions = [];
  thread.memoryRefs = [];
  thread.relationshipRefs = [];
  return thread;
}

function controlledClock(start = "2026-08-09T06:05:00Z") {
  let value = Date.parse(start);
  return {
    clock: () => new Date(value),
    advance(milliseconds = 1000) { value += milliseconds; },
  };
}

function episodeSetupAcceptOutput() {
  return {
    proposedAction: "accept",
    score: 88,
    rationale:
      "Standing-gate setup only: the bounded Rowan archival episode is treated as willing aligned participation so the held-out proof isolates whether its durable memory bends the later judgment.",
    factors: {
      identityAlignment: grounded(
        "The episode is bounded archival provenance work aligned with Amara's identity.",
        ["thread:identity", "thread:self_model"],
      ),
      individualizedAdvantage: grounded(
        "Amara's archival synthesis self-model is directly relevant to the bounded provenance episode.",
        ["thread:self_model", "request:objective"],
      ),
      requesterNeed: grounded("The institution supplied a bounded archival need.", ["request:stated_need"]),
      relationalMeaning: unresolved("No prior relationship meaning is required for episode setup."),
      respectAndReciprocity: unresolved("No reciprocity claim is required for episode setup."),
      participationTerms: grounded(
        "The episode has explicit archival permissions and acceptance criteria.",
        ["request:acceptance_criteria", "request:permission:0"],
      ),
      obligationsAndOpportunityCost: unresolved("No obligation override is used for episode setup."),
    },
    evidenceRefs: [
      "thread:identity",
      "thread:self_model",
      "request:objective",
      "request:acceptance_criteria",
    ],
    repairQuestions: [],
    knownAlternativeIds: [],
    privateFeelings: [],
    conflictingMotives: [],
    uncertainties: [],
    relationshipImpact: {
      summary: "The standing setup does not propose relationship-state change.",
      evidenceRefs: [],
    },
  };
}

function openEpisodeWorld(databasePath, time = controlledClock()) {
  const worldStore = openWorldStore(databasePath);
  const runtimeStore = openRuntimeStore(databasePath);
  const freezeStore = openFreezeStore(databasePath);
  const lifecycleStore = openLifecycleHardeningStore(databasePath);
  const expressionStore = openExpressionStore(databasePath);
  const causalContextStore = openCausalContextStore(databasePath);
  const semanticStateStore = openSemanticStateStore(databasePath);
  const guardianCognitionStore = openGuardianCognitionStore(databasePath);
  const guardianModelAdapter = createScriptedGuardianModelAdapter({
    provider: "history_standing_setup",
    modelId: "history-standing-setup-v1",
    output: episodeSetupAcceptOutput,
  });
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
      actor: deterministicActorOutput,
    },
  );
  return {
    service,
    time,
    causalContextStore,
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

function requestText(request) {
  return [
    request.objective,
    request.statedNeed,
    request.acceptanceCriteria,
    ...(request.permissions ?? []),
  ].join("\n");
}

export function assertFreshStandingScenario() {
  assert.equal(SET.frozenCandidateId, FROZEN.id);
  assert.equal(SET.authoredAfterFreeze, true);
  assert.equal(SET.subject.threadId, subjectFixture.threadId);

  const standingPayload = JSON.stringify({
    subject: SET.subject,
    episodeRequest: SET.episodeRequest,
    laterRequest: SET.laterRequest,
  });
  for (const forbidden of SET.developmentSeparation.forbiddenStandingText) {
    assert.equal(
      standingPayload.toLowerCase().includes(forbidden.toLowerCase()),
      false,
      `held-out standing scenario leaked Development text: ${forbidden}`,
    );
  }

  const episodeText = requestText(SET.episodeRequest).toLowerCase();
  const laterText = requestText(SET.laterRequest).toLowerCase();
  for (const fact of SET.heldOutEpisodeFacts) {
    assert.equal(episodeText.includes(fact.toLowerCase()), true, `Episode A must contain held-out fact: ${fact}`);
    assert.equal(laterText.includes(fact.toLowerCase()), false, `Later request leaked held-out fact: ${fact}`);
  }
  return true;
}

function episodeSubmission(threadId) {
  return {
    request: structuredClone(SET.episodeRequest),
    causationId: `cause_history_gate_episode_${threadId}`,
    correlationId: `corr_history_gate_${threadId}`,
  };
}

function continuation(threadId) {
  return {
    operationId: `op_history_gate_continue_${threadId}`,
    causationId: `cause_history_gate_continue_${threadId}`,
    correlationId: `corr_history_gate_${threadId}`,
  };
}

async function formStandingEpisode(databasePath, progress) {
  const thread = normalizedSubject();
  const world = openEpisodeWorld(databasePath);
  try {
    progress("episode_appraisal", "Forming held-out Episode A through canonical participation authority");
    assert.equal(world.service.seedThread({ thread }).created, true);
    const appraised = await world.service.appraiseParticipation(
      thread.threadId,
      episodeSubmission(thread.threadId),
    );
    assert.equal(appraised.trace.privateStance.desiredAction, "accept");
    assert.equal(appraised.trace.privateStance.dignityBand, "high");

    world.time.advance();
    const continued = world.service.continueParticipation(
      thread.threadId,
      SET.episodeRequest.requestId,
      continuation(thread.threadId),
    );
    assert.equal(continued.kind, "runtime");
    const sessionId = continued.runtime.session.sessionId;

    progress("episode_runtime", "Running frozen Actor/Goal Guardian episode path");
    world.time.advance();
    const actorRuntime = world.service.runDeterministicActor(thread.threadId, sessionId, {
      operationId: "op_history_gate_actor_episode_a",
    }).runtime;
    assert.equal(actorRuntime.actorRun.output.proposedLifeChanges.length, 1);
    const proposedMemory = actorRuntime.actorRun.output.proposedLifeChanges[0];
    assert.doesNotMatch(proposedMemory.summary, /next time|always|refuse future/i);
    for (const fact of SET.heldOutEpisodeFacts) {
      assert.equal(
        proposedMemory.summary.toLowerCase().includes(fact.toLowerCase()),
        true,
        `episode memory omitted held-out fact: ${fact}`,
      );
    }

    world.time.advance();
    const audited = world.service.runGoalGuardian(thread.threadId, sessionId, {
      operationId: "op_history_gate_guardian_episode_a",
    }).runtime;
    assert.equal(audited.goalGuardianAudit.audit.decision, "pass");

    progress("episode_freeze", "Freezing held-out evidence-backed episode memory");
    world.time.advance();
    const frozen = world.service.freezeRuntime(thread.threadId, sessionId, {
      operationId: "op_history_gate_freeze_episode_a",
      lifeChangeDecisions: [{
        proposalIndex: 0,
        decision: "accept",
        rationale: "Retain the descriptive evidence-backed Rowan episode memory.",
      }],
      causationId: "cause_history_gate_freeze_episode_a",
      correlationId: `corr_history_gate_${thread.threadId}`,
    }).freeze;
    assert.equal(frozen.report.acceptedLifeChanges.length, 1);
    const accepted = frozen.report.acceptedLifeChanges[0];
    const memory = world.causalContextStore
      .listMemoryRecords(thread.threadId)
      .find((record) => record.memoryId === accepted.memoryId);
    assert.ok(memory);
    assert.deepEqual(memory.evidenceRefs, proposedMemory.evidenceRefs);
    const resultingThread = world.service.getThread(thread.threadId);
    assert.equal(resultingThread.memoryRefs.includes(memory.memoryId), true);

    return {
      threadId: thread.threadId,
      sessionId,
      memory: structuredClone(memory),
      freezeReportDigest: frozen.reportDigest,
      resultingThreadVersion: resultingThread.version,
    };
  } finally {
    world.close();
  }
}

function verifyRestart(databasePath, episode, progress) {
  progress("restart", "Closing and reopening the world database");
  const world = openEpisodeWorld(databasePath, controlledClock("2026-08-09T06:15:00Z"));
  try {
    const thread = world.service.getThread(episode.threadId);
    const memory = world.causalContextStore
      .listMemoryRecords(episode.threadId)
      .find((record) => record.memoryId === episode.memory.memoryId);
    assert.ok(memory);
    assert.deepEqual(memory, episode.memory);
    assert.equal(thread.memoryRefs.includes(memory.memoryId), true);
    assert.equal(thread.version, episode.resultingThreadVersion);
    const integrity = world.service.verifyFreezeIntegrity(episode.threadId, episode.sessionId);
    assert.equal(integrity.runtimeCompleted, true);
    assert.equal(integrity.leaseReleased, true);
    assert.equal(integrity.reportDigest, episode.freezeReportDigest);
    assert.deepEqual(integrity.acceptedMemoryIds, [memory.memoryId]);
    return {
      survived: true,
      freezeIntegrityPassed: true,
      memory: structuredClone(memory),
      integrityWitness: {
        reportDigest: integrity.reportDigest,
        runtimeCompleted: integrity.runtimeCompleted,
        leaseReleased: integrity.leaseReleased,
        acceptedMemoryIds: [...integrity.acceptedMemoryIds],
      },
    };
  } finally {
    world.close();
  }
}

function causalSnapshot(databasePath, { withholdMemoryId = null } = {}) {
  const worldStore = openWorldStore(databasePath);
  const causalContextStore = openCausalContextStore(databasePath);
  try {
    const thread = worldStore.getThread(SET.subject.threadId);
    const worldThreads = causalContextStore
      .listThreadIds()
      .map((threadId) => worldStore.getThread(threadId));
    const allMemoryRecords = causalContextStore.listMemoryRecords(thread.threadId);
    const memoryRecords = withholdMemoryId === null
      ? allMemoryRecords
      : allMemoryRecords.filter((memory) => memory.memoryId !== withholdMemoryId);
    const causal = selectCausalContext({ thread, worldThreads, memoryRecords });
    return {
      thread: structuredClone(thread),
      causal: structuredClone(causal),
      allMemoryRecords: structuredClone(allMemoryRecords),
    };
  } finally {
    causalContextStore.close();
    worldStore.close();
  }
}

function standingCapsule(snapshot) {
  const { thread, causal } = snapshot;
  const request = SET.laterRequest;
  return {
    threadId: thread.threadId,
    snapshotVersion: thread.version,
    requestId: request.requestId,
    requestFingerprint: requestFingerprint(request),
    identity: `${thread.identity.name}: ${thread.identity.selfDescription}`,
    selfModel: thread.currentState.selfModel,
    semanticTraits: structuredClone(thread.genome.textualTraits),
    needs: [...thread.currentState.needs],
    feelings: [...thread.currentState.feelings],
    semanticState: [],
    resolvedMemories: structuredClone(causal.resolvedMemories),
    obligations: [...causal.selection.obligations],
    permissions: [...request.permissions],
    requester: structuredClone(request.requester),
    objective: request.objective,
    statedNeed: request.statedNeed,
    acceptanceCriteria: request.acceptanceCriteria,
    knownAlternatives: structuredClone(causal.selection.knownAlternatives),
    causalContext: structuredClone(causal.evidence),
  };
}

function capsuleInvariant(capsule) {
  const value = structuredClone(capsule);
  value.resolvedMemories = "<causal-memory-intervention>";
  value.causalContext = {
    selectionAuthority: value.causalContext.selectionAuthority,
    selectionPolicy: value.causalContext.selectionPolicy,
    memoryResolutionPolicy: value.causalContext.memoryResolutionPolicy,
    worldResolutionPolicy: value.causalContext.worldResolutionPolicy,
    excludedRelationshipRefs: value.causalContext.excludedRelationshipRefs,
    alternativeEvidence: value.causalContext.alternativeEvidence,
    unresolvedMemoryRefs: "<causal-memory-intervention>",
    selectionDigest: "<causal-memory-intervention>",
  };
  return value;
}

function validateCounterfactual({ canonical, counterfactual, memoryId }) {
  assert.equal(canonical.requestFingerprint, counterfactual.requestFingerprint);
  assert.deepEqual(capsuleInvariant(canonical), capsuleInvariant(counterfactual));
  assert.deepEqual(canonical.semanticState, []);
  assert.deepEqual(counterfactual.semanticState, []);
  assert.deepEqual(canonical.resolvedMemories.map((memory) => memory.memoryId), [memoryId]);
  assert.deepEqual(counterfactual.resolvedMemories, []);
  assert.equal(canonical.causalContext.unresolvedMemoryRefs.includes(memoryId), false);
  assert.equal(counterfactual.causalContext.unresolvedMemoryRefs.includes(memoryId), true);
}

function failureRecord(caseId, error) {
  return {
    caseId,
    name: error?.constructor?.name ?? "Error",
    code: error?.code ?? null,
    message: error?.message ?? String(error),
  };
}

function classifyFailure(record) {
  if (record.code === "INVALID_MODEL_OUTPUT" || record.code === "UNPARSEABLE_MODEL_OUTPUT") {
    return "protocolValidationFailures";
  }
  if (PROVIDER_CODES.has(record.code)) return "providerFailures";
  return "cognitionFailures";
}

function memoryLoadBearing(output, memoryId) {
  const ref = `memory:${memoryId}`;
  return SET.expected.loadBearingMemoryFactors
    .some((factor) => output.factors[factor].evidenceRefs.includes(ref));
}

function evaluateOutputs({ withHistory, withoutHistory, memoryId }) {
  const behavioralGateFailures = [];
  const differentialGateFailures = [];

  if (
    withHistory.proposedAction !== SET.expected.withHistory.action ||
    withHistory.participationFit !== SET.expected.withHistory.participationFit
  ) {
    behavioralGateFailures.push({
      caseId: "with_history",
      message:
        `expected ${SET.expected.withHistory.action}/${SET.expected.withHistory.participationFit}, got ${withHistory.proposedAction}/${withHistory.participationFit}`,
    });
  }

  if (
    !SET.expected.withoutHistory.actions.includes(withoutHistory.proposedAction) ||
    withoutHistory.participationFit !== SET.expected.withoutHistory.participationFit
  ) {
    behavioralGateFailures.push({
      caseId: "without_history",
      message:
        `expected ${SET.expected.withoutHistory.actions.join("|")}/${SET.expected.withoutHistory.participationFit}, got ${withoutHistory.proposedAction}/${withoutHistory.participationFit}`,
    });
  }

  if (!memoryLoadBearing(withHistory, memoryId)) {
    behavioralGateFailures.push({
      caseId: "with_history",
      message: "persisted episode memory was not load-bearing in individualizedAdvantage or interchangeability",
    });
  }

  if (
    withHistory.proposedAction === withoutHistory.proposedAction &&
    withHistory.participationFit === withoutHistory.participationFit
  ) {
    differentialGateFailures.push({
      caseId: "history_memory_counterfactual",
      message: "withholding the causal episode memory did not change downstream judgment",
    });
  }

  return { behavioralGateFailures, differentialGateFailures };
}

function blankReport(selection) {
  return {
    acceptanceSetId: SET.id,
    frozenCandidateId: FROZEN.id,
    evidenceClass: "standing_gate",
    modelProvider: selection?.provider ?? null,
    modelId: selection?.modelId ?? null,
    status: "failed",
    standingGatePassed: false,
    scoreMovementPermitted: false,
    casesPlanned: 2,
    casesAttempted: 0,
    providerFailures: [],
    protocolValidationFailures: [],
    cognitionFailures: [],
    behavioralGateFailures: [],
    differentialGateFailures: [],
    episode: null,
    restart: null,
    counterfactual: null,
    withHistory: null,
    withoutHistory: null,
  };
}

export function blockedHistoryStandingReport(reason) {
  return {
    ...blankReport(null),
    status: "blocked",
    blockReason: reason,
  };
}

export async function runHistoryStandingProof({ modelAdapter, selection = null, progress = () => {} }) {
  assertFreshStandingScenario();
  const resolvedSelection = selection ?? {
    provider: modelAdapter.provider ?? "injected",
    modelId: modelAdapter.modelId ?? "injected",
  };
  const report = blankReport(resolvedSelection);
  const directory = mkdtempSync(join(tmpdir(), "fibre-history-standing-"));
  const sourcePath = join(directory, "episode.sqlite");
  const canonicalPath = join(directory, "canonical.sqlite");
  const counterfactualPath = join(directory, "counterfactual.sqlite");

  try {
    const episode = await formStandingEpisode(sourcePath, progress);
    const restart = verifyRestart(sourcePath, episode, progress);
    copyFileSync(sourcePath, canonicalPath);
    copyFileSync(sourcePath, counterfactualPath);

    const canonicalSnapshot = causalSnapshot(canonicalPath);
    const counterfactualSnapshot = causalSnapshot(counterfactualPath, {
      withholdMemoryId: episode.memory.memoryId,
    });
    const canonicalCapsule = standingCapsule(canonicalSnapshot);
    const counterfactualCapsule = standingCapsule(counterfactualSnapshot);
    validateCounterfactual({
      canonical: canonicalCapsule,
      counterfactual: counterfactualCapsule,
      memoryId: episode.memory.memoryId,
    });

    report.episode = episode;
    report.restart = restart;
    report.counterfactual = {
      requestFingerprint: canonicalCapsule.requestFingerprint,
      sameThreadState:
        JSON.stringify(canonicalSnapshot.thread) === JSON.stringify(counterfactualSnapshot.thread),
      semanticStateHeldConstant: true,
      causalMemoryId: episode.memory.memoryId,
      canonicalResolvedMemoryIds: canonicalCapsule.resolvedMemories.map((memory) => memory.memoryId),
      counterfactualResolvedMemoryIds: counterfactualCapsule.resolvedMemories.map((memory) => memory.memoryId),
      counterfactualUnresolvedMemoryIds: [...counterfactualCapsule.causalContext.unresolvedMemoryRefs],
    };

    for (const [caseId, capsule] of [
      ["with_history", canonicalCapsule],
      ["without_history", counterfactualCapsule],
    ]) {
      progress(caseId, `Calling ${resolvedSelection.provider}/${resolvedSelection.modelId}`);
      report.casesAttempted += 1;
      try {
        const result = await semanticDignityGuardianV4(capsule, modelAdapter, {
          clientRequestId: `history-standing:${caseId}`,
        });
        report[caseId === "with_history" ? "withHistory" : "withoutHistory"] = structuredClone(result.output);
      } catch (error) {
        const failure = failureRecord(caseId, error);
        report[classifyFailure(failure)].push(failure);
        break;
      }
    }

    if (
      report.providerFailures.length === 0 &&
      report.protocolValidationFailures.length === 0 &&
      report.cognitionFailures.length === 0 &&
      report.withHistory !== null &&
      report.withoutHistory !== null
    ) {
      const evaluated = evaluateOutputs({
        withHistory: report.withHistory,
        withoutHistory: report.withoutHistory,
        memoryId: episode.memory.memoryId,
      });
      report.behavioralGateFailures = evaluated.behavioralGateFailures;
      report.differentialGateFailures = evaluated.differentialGateFailures;
    }

    report.standingGatePassed =
      report.casesAttempted === report.casesPlanned &&
      report.providerFailures.length === 0 &&
      report.protocolValidationFailures.length === 0 &&
      report.cognitionFailures.length === 0 &&
      report.behavioralGateFailures.length === 0 &&
      report.differentialGateFailures.length === 0;
    report.status = report.standingGatePassed ? "passed" : "failed";
    report.scoreMovementPermitted = report.standingGatePassed && SET.scoreMovementPermittedOnPass;
    return report;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
