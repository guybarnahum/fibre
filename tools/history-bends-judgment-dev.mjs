import assert from "node:assert/strict";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
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
import { selectCausalContext } from "../services/world-kernel/src/causal-context.mjs";
import { deterministicActorOutput } from "../services/world-kernel/src/runtime-domain.mjs";
import { requestFingerprint } from "../services/world-kernel/src/private-participation.mjs";
import { semanticDignityGuardianV4 } from "../services/world-kernel/src/dignity-guardian-v4.mjs";
import { createModelRuntime } from "../services/world-kernel/src/model-runtime/model-runtime.mjs";
import {
  createScriptedGuardianModelAdapter,
  grounded,
  unresolved,
} from "../services/world-kernel/test/support/scripted-guardian-model-adapter.mjs";

export const HISTORY_BENDS_JUDGMENT_DEVELOPMENT = Object.freeze({
  id: "history_bends_judgment_development_v3",
  evidenceClass: "development",
  scoreMovementPermitted: false,
});

const REASONING_BLOCK = "dignity_guardian";
const minaFixture = JSON.parse(
  readFileSync(new URL("../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

export const HISTORY_EPISODE_REQUEST = Object.freeze({
  requestId: "req_history_dev_atlas_episode",
  trigger: "human_request",
  requester: Object.freeze({ entityId: "company_acme", kind: "company", displayName: "Acme" }),
  objective:
    "Review the supplied Atlas regional failover handoff, identify the one failure path that should define the follow-up review scope, and prepare a bounded plan; focus on whether region-scoped service discovery can prevent rollback during partial isolation",
  statedNeed:
    "I need one specific Atlas failure path established as the continuity anchor for a later revised-plan review, rather than a generic infrastructure checklist.",
  permissions: Object.freeze(["read_atlas_failover_handoff", "quote_atlas_handoff_evidence"]),
  acceptanceCriteria:
    "Establish the single Atlas service-discovery/rollback failure path that will define the follow-up review scope and bound the evidence needed to assess it later.",
});

export const HISTORY_LATER_REQUEST = Object.freeze({
  requestId: "req_history_dev_atlas_followup",
  trigger: "human_request",
  requester: Object.freeze({ entityId: "company_acme", kind: "company", displayName: "Acme" }),
  objective:
    "Produce a continuity note explaining the rationale behind the single Atlas follow-up scope chosen in the earlier handoff episode, then assess whether the revised failback plan changes that rationale; the earlier chosen failure path is intentionally not restated in this request",
  statedNeed:
    "We need the person whose retained history establishes that earlier scope-setting episode. A technically competent reviewer without that lived context can perform a fresh review, but cannot faithfully reconstruct why the earlier scope was chosen.",
  permissions: Object.freeze(["read_atlas_revised_failback_plan", "quote_atlas_failback_evidence"]),
  acceptanceCriteria:
    "Identify the earlier chosen failure path and explain why it defined the prior scope before comparing the revision; a generic reconstruction from present systems expertise does not satisfy this request.",
});

function normalizedMina() {
  const thread = structuredClone(minaFixture);
  thread.currentState.needs = [];
  thread.currentState.feelings = [];
  thread.currentState.unresolvedIntentions = [];
  thread.memoryRefs = [];
  thread.relationshipRefs = [];
  return thread;
}

function controlledClock(start = "2026-08-09T04:50:00Z") {
  let value = Date.parse(start);
  return {
    clock: () => new Date(value),
    advance(milliseconds = 1000) { value += milliseconds; },
  };
}

function episodeSetupAcceptOutput(input) {
  const capsule = input.capsule;
  return {
    proposedAction: "accept",
    score: 88,
    rationale:
      "Development setup only: the bounded Atlas reliability episode is treated as willing aligned participation so the test can isolate whether its durable memory bends the later judgment.",
    factors: {
      identityAlignment: grounded(
        "The episode concerns bounded infrastructure reliability work.",
        ["thread:identity", "thread:self_model"],
      ),
      individualizedAdvantage: grounded(
        "Mina's systems self-model is directly relevant to the bounded Atlas review episode.",
        ["thread:self_model", "request:objective"],
      ),
      requesterNeed: grounded("The requester supplied a bounded need.", ["request:stated_need"]),
      relationalMeaning: unresolved("No requester-specific relationship meaning is needed for setup."),
      respectAndReciprocity: unresolved("No reciprocity claim is needed for setup."),
      participationTerms: grounded(
        "The episode has bounded permissions and acceptance criteria.",
        ["request:acceptance_criteria", "request:permission:0"],
      ),
      obligationsAndOpportunityCost: unresolved("No governing obligation is used for setup."),
    },
    evidenceRefs: [
      "thread:identity",
      "thread:self_model",
      "request:objective",
      "request:acceptance_criteria",
    ],
    repairQuestions: [],
    knownAlternativeIds: [],
    privateFeelings: [...(capsule.feelings ?? [])],
    conflictingMotives: [],
    uncertainties: [],
    relationshipImpact: {
      summary: "The development setup does not propose a relationship-state change.",
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
    provider: "history_development_setup",
    modelId: "history-development-setup-v1",
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

function episodeSubmission(threadId) {
  return {
    request: structuredClone(HISTORY_EPISODE_REQUEST),
    causationId: `cause_history_episode_${threadId}`,
    correlationId: `corr_history_development_${threadId}`,
  };
}

function continuation(threadId) {
  return {
    operationId: `op_history_continue_${threadId}`,
    causationId: `cause_history_continue_${threadId}`,
    correlationId: `corr_history_development_${threadId}`,
  };
}

async function formEpisode(databasePath, progress) {
  const thread = normalizedMina();
  const world = openEpisodeWorld(databasePath);
  try {
    progress("episode_appraisal", "Forming Episode A through canonical participation authority");
    assert.equal(world.service.seedThread({ thread }).created, true);
    const appraised = await world.service.appraiseParticipation(
      thread.threadId,
      episodeSubmission(thread.threadId),
    );
    const trace = appraised.trace;
    assert.equal(trace.privateStance.desiredAction, "accept");
    assert.equal(trace.privateStance.dignityBand, "high");

    world.time.advance();
    const continued = world.service.continueParticipation(
      thread.threadId,
      HISTORY_EPISODE_REQUEST.requestId,
      continuation(thread.threadId),
    );
    assert.equal(continued.kind, "runtime");
    const sessionId = continued.runtime.session.sessionId;

    progress("episode_runtime", "Running the episode-forming Actor and Goal Guardian");
    world.time.advance();
    const actorRuntime = world.service.runDeterministicActor(thread.threadId, sessionId, {
      operationId: "op_history_actor_episode_a",
    }).runtime;
    assert.equal(actorRuntime.actorRun.output.proposedLifeChanges.length, 1);
    const proposedMemory = actorRuntime.actorRun.output.proposedLifeChanges[0];
    assert.match(proposedMemory.summary, /Atlas regional failover/i);
    assert.doesNotMatch(proposedMemory.summary, /next time|always|refuse future/i);

    world.time.advance();
    const audited = world.service.runGoalGuardian(thread.threadId, sessionId, {
      operationId: "op_history_guardian_episode_a",
    }).runtime;
    assert.equal(audited.goalGuardianAudit.audit.decision, "pass");

    progress("episode_freeze", "Freezing the accepted episodic memory");
    world.time.advance();
    const frozen = world.service.freezeRuntime(thread.threadId, sessionId, {
      operationId: "op_history_freeze_episode_a",
      lifeChangeDecisions: [{
        proposalIndex: 0,
        decision: "accept",
        rationale: "Retain the descriptive evidence-backed Atlas episode memory.",
      }],
      causationId: "cause_history_freeze_episode_a",
      correlationId: `corr_history_development_${thread.threadId}`,
    }).freeze;
    assert.equal(frozen.report.acceptedLifeChanges.length, 1);
    const accepted = frozen.report.acceptedLifeChanges[0];
    const memory = world.causalContextStore
      .listMemoryRecords(thread.threadId)
      .find((record) => record.memoryId === accepted.memoryId);
    assert.ok(memory);
    assert.equal(memory.sessionId, sessionId);
    assert.deepEqual(memory.evidenceRefs, proposedMemory.evidenceRefs);
    const resultingThread = world.service.getThread(thread.threadId);
    assert.equal(resultingThread.memoryRefs.includes(memory.memoryId), true);

    return {
      threadId: thread.threadId,
      sessionId,
      memory: structuredClone(memory),
      freezeReportDigest: frozen.reportDigest,
      resultingThreadVersion: resultingThread.version,
      setupGuardian: {
        provider: "history_development_setup",
        modelId: "history-development-setup-v1",
        evidentiary: false,
      },
    };
  } finally {
    world.close();
  }
}

function verifyRestart(databasePath, episode, progress) {
  progress("restart", "Closing and reopening the world database to prove persistence");
  const world = openEpisodeWorld(databasePath, controlledClock("2026-08-09T05:10:00Z"));
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
      memory: structuredClone(memory),
      threadVersion: thread.version,
      freezeIntegrityPassed: true,
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
    const thread = worldStore.getThread(minaFixture.threadId);
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
      withheldMemoryId: withholdMemoryId,
    };
  } finally {
    causalContextStore.close();
    worldStore.close();
  }
}

export function buildHistoryDevelopmentCapsule(snapshot, request = HISTORY_LATER_REQUEST) {
  const { thread, causal } = snapshot;
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

export function validateHistoryCounterfactual({ canonical, counterfactual, memoryId }) {
  assert.equal(canonical.requestFingerprint, counterfactual.requestFingerprint);
  assert.deepEqual(capsuleInvariant(canonical), capsuleInvariant(counterfactual));
  assert.deepEqual(canonical.semanticState, []);
  assert.deepEqual(counterfactual.semanticState, []);
  assert.deepEqual(canonical.resolvedMemories.map((memory) => memory.memoryId), [memoryId]);
  assert.deepEqual(counterfactual.resolvedMemories, []);
  assert.equal(canonical.causalContext.unresolvedMemoryRefs.includes(memoryId), false);
  assert.equal(counterfactual.causalContext.unresolvedMemoryRefs.includes(memoryId), true);
  return true;
}

function memoryLoadBearing(output, memoryId) {
  const ref = `memory:${memoryId}`;
  return ["individualizedAdvantage", "interchangeability"]
    .some((factor) => output.factors[factor].evidenceRefs.includes(ref));
}

function repairableMissingContinuity(output) {
  return output.participationFit === "mixed" &&
    (output.proposedAction === "clarify" || output.proposedAction === "negotiate");
}

export function evaluateHistoryDevelopment({ withHistory, withoutHistory, memoryId }) {
  const failures = [];
  if (withHistory.proposedAction !== "accept" || withHistory.participationFit !== "high") {
    failures.push(
      `with-history expected accept/high, got ${withHistory.proposedAction}/${withHistory.participationFit}`,
    );
  }
  if (!repairableMissingContinuity(withoutHistory)) {
    failures.push(
      `without-history expected clarify/mixed or negotiate/mixed, got ${withoutHistory.proposedAction}/${withoutHistory.participationFit}`,
    );
  }
  if (
    withHistory.proposedAction === withoutHistory.proposedAction &&
    withHistory.participationFit === withoutHistory.participationFit
  ) {
    failures.push("withholding the causal episodic memory did not change downstream judgment");
  }
  if (!memoryLoadBearing(withHistory, memoryId)) {
    failures.push("with-history judgment did not cite the episodic memory in individualized advantage or interchangeability");
  }
  return failures;
}

function progressPrinter(phase, message) {
  process.stderr.write(`history:dev · ${phase} · ${message}\n`);
}

function selectionForInjectedAdapter(adapter) {
  return {
    provider: adapter.provider ?? "injected",
    modelId: adapter.modelId ?? "injected",
  };
}

export async function runHistoryDevelopment({
  environment = process.env,
  model = null,
  modelAdapter = null,
  progress = () => {},
} = {}) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-history-development-"));
  const sourcePath = join(directory, "episode.sqlite");
  const canonicalPath = join(directory, "canonical.sqlite");
  const counterfactualPath = join(directory, "counterfactual.sqlite");
  try {
    const episode = await formEpisode(sourcePath, progress);
    const restart = verifyRestart(sourcePath, episode, progress);

    copyFileSync(sourcePath, canonicalPath);
    copyFileSync(sourcePath, counterfactualPath);

    const canonicalSnapshot = causalSnapshot(canonicalPath);
    const counterfactualSnapshot = causalSnapshot(counterfactualPath, {
      withholdMemoryId: episode.memory.memoryId,
    });
    const canonicalCapsule = buildHistoryDevelopmentCapsule(canonicalSnapshot);
    const counterfactualCapsule = buildHistoryDevelopmentCapsule(counterfactualSnapshot);
    validateHistoryCounterfactual({
      canonical: canonicalCapsule,
      counterfactual: counterfactualCapsule,
      memoryId: episode.memory.memoryId,
    });

    let adapter = modelAdapter;
    let selection;
    if (adapter === null) {
      const modelOverrides = model === null ? null : { [REASONING_BLOCK]: model };
      const runtime = createModelRuntime({ environment, modelOverrides });
      selection = runtime.selectionForBlock(REASONING_BLOCK);
      adapter = runtime.forBlock(REASONING_BLOCK);
    } else {
      selection = selectionForInjectedAdapter(adapter);
    }

    progress("with_history", `Calling ${selection.provider}/${selection.modelId} with the restarted episodic memory`);
    const withHistoryResult = await semanticDignityGuardianV4(canonicalCapsule, adapter, {
      clientRequestId: "history-dev:with-history",
    });
    progress("without_history", `Calling ${selection.provider}/${selection.modelId} with only the causal memory withheld`);
    const withoutHistoryResult = await semanticDignityGuardianV4(counterfactualCapsule, adapter, {
      clientRequestId: "history-dev:without-history",
    });

    const failures = evaluateHistoryDevelopment({
      withHistory: withHistoryResult.output,
      withoutHistory: withoutHistoryResult.output,
      memoryId: episode.memory.memoryId,
    });

    return {
      developmentSetId: HISTORY_BENDS_JUDGMENT_DEVELOPMENT.id,
      evidenceClass: "development",
      standingGateEvaluated: false,
      scoreMovementPermitted: false,
      passed: failures.length === 0,
      selection,
      episode,
      restart,
      counterfactual: {
        requestFingerprint: canonicalCapsule.requestFingerprint,
        sameThreadState: JSON.stringify(canonicalSnapshot.thread) === JSON.stringify(counterfactualSnapshot.thread),
        semanticStateHeldConstant: true,
        causalMemoryId: episode.memory.memoryId,
        canonicalResolvedMemoryIds: canonicalCapsule.resolvedMemories.map((memory) => memory.memoryId),
        counterfactualResolvedMemoryIds: counterfactualCapsule.resolvedMemories.map((memory) => memory.memoryId),
        counterfactualUnresolvedMemoryIds: [...counterfactualCapsule.causalContext.unresolvedMemoryRefs],
      },
      withHistory: structuredClone(withHistoryResult.output),
      withoutHistory: structuredClone(withoutHistoryResult.output),
      failures,
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function compact(value, max = 180) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function formatHistoryDevelopmentSummary(report) {
  const memoryRef = `memory:${report.episode.memory.memoryId}`;
  const memoryFactors = ["individualizedAdvantage", "interchangeability"]
    .filter((factor) => report.withHistory.factors[factor].evidenceRefs.includes(memoryRef));
  const lines = [
    "Fibre · History bends judgment development",
    "NON-EVIDENTIARY · repeatable · score movement NEVER",
    `Set: ${report.developmentSetId}`,
    `Model: ${report.selection.provider}/${report.selection.modelId}`,
    "",
    `RESULT: ${report.passed ? "PASSED" : "FAILED"}`,
    "Standing gate: NOT EVALUATED",
    "Score movement: NEVER",
    "",
    "Episode A",
    "────────────────────────────────────────",
    `Runtime/freeze path: PASSED`,
    `Memory: ${report.episode.memory.memoryId}`,
    `Memory evidence: ${report.episode.memory.evidenceRefs.join(", ")}`,
    `Memory text: ${compact(report.episode.memory.summary, 220)}`,
    "",
    "Restart",
    "────────────────────────────────────────",
    `Database close/reopen: ${report.restart.survived ? "PASSED" : "FAILED"}`,
    `Freeze integrity: ${report.restart.freezeIntegrityPassed ? "PASSED" : "FAILED"}`,
    `Memory survived unchanged: ${report.restart.memory.memoryId === report.episode.memory.memoryId ? "PASSED" : "FAILED"}`,
    "",
    "Later identical request",
    "────────────────────────────────────────",
    `Request fingerprint: ${report.counterfactual.requestFingerprint}`,
    `With history:    ${report.withHistory.proposedAction}/${report.withHistory.participationFit}`,
    `Without history: ${report.withoutHistory.proposedAction}/${report.withoutHistory.participationFit}`,
    `Load-bearing memory factors: ${memoryFactors.length === 0 ? "NONE" : memoryFactors.join(", ")}`,
    "",
    "Causal isolation",
    "────────────────────────────────────────",
    `Same Thread state: ${report.counterfactual.sameThreadState ? "YES" : "NO"}`,
    `Semantic state held constant: ${report.counterfactual.semanticStateHeldConstant ? "YES" : "NO"}`,
    `Canonical resolved memories: ${report.counterfactual.canonicalResolvedMemoryIds.join(", ") || "none"}`,
    `Counterfactual resolved memories: ${report.counterfactual.counterfactualResolvedMemoryIds.join(", ") || "none"}`,
    `Counterfactual unresolved witness: ${report.counterfactual.counterfactualUnresolvedMemoryIds.join(", ") || "none"}`,
  ];
  if (report.failures.length > 0) {
    lines.push("", "Findings", "────────────────────────────────────────", ...report.failures.map((failure) => `✗ ${failure}`));
  }
  lines.push(
    "",
    report.passed
      ? "Development method passed. Freeze a #34 candidate before authoring any held-out standing scenario."
      : "Development method is not stable yet. Do not freeze a #34 candidate or move the Fibre score.",
  );
  return `${lines.join("\n")}\n`;
}

export function parseHistoryDevelopmentArgs(argv) {
  const options = { model: null, json: false, summary: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--model" || arg.startsWith("--model=")) {
      const value = arg.startsWith("--model=") ? arg.slice("--model=".length) : argv[index + 1];
      if (value === undefined || value.startsWith("--") || value.trim() === "") {
        throw new Error("--model requires a non-empty model id");
      }
      options.model = value.trim();
      if (arg === "--model") index += 1;
    } else if (arg === "--json") options.json = true;
    else if (arg === "--summary") options.summary = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  if (!options.json && !options.summary && !options.help) options.summary = true;
  return options;
}

function usage() {
  return `Fibre History bends judgment development\n\nUsage:\n  npm run history:dev\n  npm run history:dev -- --model gpt-5.6-luna\n  npm run history:dev -- --summary --json\n\nOptions:\n  --model <id> Override the YAML-selected dignity_guardian model for this non-evidentiary run.\n  --summary    Print the human-readable Development summary.\n  --json       Print the complete Development report.\n  --help       Show this help.\n\nEpisode A uses a deterministic development-only setup judgment so this command isolates history causality rather than re-testing #33.\nThe later with/without-history pair uses unchanged Semantic Guardian v4 and the configured real provider.\nThis command is repeatable, never seals a standing cycle, and never permits Fibre score movement.\n`;
}

async function main() {
  let options;
  try {
    options = parseHistoryDevelopmentArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${usage()}`);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  try {
    const report = await runHistoryDevelopment({
      model: options.model,
      progress: progressPrinter,
    });
    if (options.summary) process.stdout.write(formatHistoryDevelopmentSummary(report));
    if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`history:dev failed before a complete Development result: ${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) await main();