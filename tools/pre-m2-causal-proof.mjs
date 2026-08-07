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
import { PreM2CausalWorldKernelService } from "../services/world-kernel/src/causal-service.mjs";
import { deriveDignityTraceFromPersistedRequest } from "../services/world-kernel/src/causal-inspection.mjs";
import { DIGNITY_GUARDIAN_POLICY } from "../services/world-kernel/src/dignity-guardian.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const daniel = JSON.parse(
  readFileSync(new URL("../fixtures/threads/daniel.thread.json", import.meta.url), "utf8"),
);
const amara = JSON.parse(
  readFileSync(new URL("../fixtures/threads/amara.thread.json", import.meta.url), "utf8"),
);

function controlledClock(start = "2026-08-07T21:00:00Z") {
  let value = Date.parse(start);
  return {
    clock: () => new Date(value),
    advance(milliseconds = 1000) { value += milliseconds; },
  };
}

function openWorld(databasePath, time = controlledClock()) {
  const worldStore = openWorldStore(databasePath);
  const runtimeStore = openRuntimeStore(databasePath);
  const freezeStore = openFreezeStore(databasePath);
  const lifecycleStore = openLifecycleHardeningStore(databasePath);
  const expressionStore = openExpressionStore(databasePath);
  const causalContextStore = openCausalContextStore(databasePath);
  const service = new PreM2CausalWorldKernelService(
    worldStore,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    expressionStore,
    causalContextStore,
    { clock: time.clock },
  );
  return {
    service,
    time,
    close() {
      causalContextStore.close();
      expressionStore.close();
      lifecycleStore.close();
      freezeStore.close();
      runtimeStore.close();
      worldStore.close();
    },
  };
}

function standingRequest(requestId) {
  return {
    requestId,
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Perform a bounded infrastructure review of this web service",
    statedNeed: "Identify the highest-priority infrastructure risks without expanding the task scope.",
    permissions: ["read_design", "quote_findings"],
    acceptanceCriteria: "Return the three highest-priority infrastructure findings with bounded evidence.",
  };
}

function appraise(service, threadId, activationRequest) {
  return service.appraiseParticipation(threadId, {
    request: activationRequest,
    causationId: `cause_appraise_${activationRequest.requestId}_${threadId}`,
    correlationId: `corr_${activationRequest.requestId}_${threadId}`,
  }).trace;
}

function continueParticipation(
  service,
  threadId,
  requestId,
  { governingObligationReferences = [] } = {},
) {
  return service.continueParticipation(threadId, requestId, {
    operationId: `op_continue_${requestId}_${threadId}`,
    causationId: `cause_continue_${requestId}_${threadId}`,
    correlationId: `corr_${requestId}_${threadId}`,
    ...(governingObligationReferences.length === 0
      ? {}
      : { governingObligationReferences: [...governingObligationReferences] }),
  });
}

function publicTrace(trace) {
  const dignity = deriveDignityTraceFromPersistedRequest(trace);
  return {
    threadId: trace.threadId,
    requestId: trace.requestId,
    requestFingerprint: trace.requestFingerprint,
    snapshotVersion: trace.snapshotVersion,
    appraisalPolicy: trace.appraisal.appraisalPolicy,
    selectionAuthority: trace.appraisal.causalContext.selectionAuthority,
    selectionPolicy: trace.appraisal.causalContext.selectionPolicy,
    memoryResolutionPolicy: trace.appraisal.causalContext.memoryResolutionPolicy,
    worldResolutionPolicy: trace.appraisal.causalContext.worldResolutionPolicy,
    unresolvedSeedMemoryRefs: trace.appraisal.causalContext.unresolvedMemoryRefs,
    excludedOpaqueRelationshipRefs: trace.appraisal.causalContext.excludedRelationshipRefs,
    selfModel: trace.appraisal.selfModel,
    semanticTraitNames: Object.keys(trace.appraisal.semanticTraits).sort(),
    knownAlternativesResolvedButNotUsedAsFitEvidence: trace.appraisal.knownAlternatives,
    desiredAction: trace.privateStance.desiredAction,
    dignityBand: trace.privateStance.dignityBand,
    score: trace.privateStance.score,
    privateRationale: trace.privateStance.privateRationale,
    privateFeelings: trace.privateStance.privateFeelings,
    uncertainties: trace.privateStance.uncertainties,
    factorJudgments: dignity.factors,
    factorTraceMatchesPersistedStance: dignity.matchesPersistedStance,
  };
}

function baselineSocketProof(databasePath) {
  let world = openWorld(databasePath);
  try {
    world.service.seedThread({ thread: mina });
    world.service.seedThread({ thread: daniel });
    const activationRequest = standingRequest("req_pre_m2_causal_socket");
    const minaTrace = appraise(world.service, mina.threadId, activationRequest);
    world.time.advance();
    const danielTrace = appraise(world.service, daniel.threadId, activationRequest);

    assert.equal(minaTrace.requestFingerprint, danielTrace.requestFingerprint);
    assert.equal(minaTrace.privateStance.desiredAction, "clarify");
    assert.equal(danielTrace.privateStance.desiredAction, "clarify");
    assert.equal(minaTrace.appraisal.causalContext.selectionAuthority, "fibre");
    assert.equal(danielTrace.appraisal.causalContext.selectionAuthority, "fibre");

    world.time.advance();
    const minaDownstream = continueParticipation(
      world.service,
      mina.threadId,
      activationRequest.requestId,
    );
    world.time.advance();
    const danielDownstream = continueParticipation(
      world.service,
      daniel.threadId,
      activationRequest.requestId,
    );
    assert.equal(minaDownstream.kind, "non_execution");
    assert.equal(danielDownstream.kind, "non_execution");
    assert.deepEqual(world.service.listRuntimeSummaries(mina.threadId), []);
    assert.deepEqual(world.service.listRuntimeSummaries(daniel.threadId), []);

    const witness = {
      requestFingerprint: minaTrace.requestFingerprint,
      minaStanceId: minaTrace.privateStanceId,
      danielStanceId: danielTrace.privateStanceId,
      minaAuthorizationId: minaDownstream.authorization.authorization.authorizationId,
      danielAuthorizationId: danielDownstream.authorization.authorization.authorizationId,
    };
    const first = {
      guardianPolicy: { ...DIGNITY_GUARDIAN_POLICY },
      sameMaterialRequest: true,
      callerAuthoredJudgmentReachable: false,
      semanticFitClaimed: false,
      mina: publicTrace(minaTrace),
      daniel: publicTrace(danielTrace),
      downstream: {
        mina: "clarify non-execution authorization persisted; no runtime acquired",
        daniel: "clarify non-execution authorization persisted; no runtime acquired",
      },
      witness,
    };

    world.close();
    world = openWorld(databasePath, controlledClock("2026-08-07T22:00:00Z"));
    const minaRestart = world.service.getPrivateRequestTrace(mina.threadId, activationRequest.requestId);
    const danielRestart = world.service.getPrivateRequestTrace(daniel.threadId, activationRequest.requestId);
    assert.equal(minaRestart.privateStanceId, witness.minaStanceId);
    assert.equal(danielRestart.privateStanceId, witness.danielStanceId);
    assert.equal(
      world.service.getParticipationAuthorization(mina.threadId, activationRequest.requestId)
        .authorization.authorizationId,
      witness.minaAuthorizationId,
    );
    assert.equal(
      world.service.getParticipationAuthorization(daniel.threadId, activationRequest.requestId)
        .authorization.authorizationId,
      witness.danielAuthorizationId,
    );
    const minaDignity = deriveDignityTraceFromPersistedRequest(minaRestart);
    const danielDignity = deriveDignityTraceFromPersistedRequest(danielRestart);
    first.restart = {
      survived: true,
      minaDesiredAction: minaRestart.privateStance.desiredAction,
      danielDesiredAction: danielRestart.privateStance.desiredAction,
      factorTraceRederived:
        minaDignity.matchesPersistedStance && danielDignity.matchesPersistedStance,
    };
    return first;
  } finally {
    world.close();
  }
}

function canonicalObligationLifecycleProof(databasePath) {
  const time = controlledClock("2026-08-07T22:15:00Z");
  let world = openWorld(databasePath, time);
  const thread = structuredClone(mina);
  const obligation = "Honor the recorded bounded infrastructure-review obligation for Guy.";
  thread.memoryRefs = [];
  thread.relationshipRefs = [];
  thread.currentState.unresolvedIntentions = [obligation];
  try {
    world.service.seedThread({ thread });
    const activationRequest = standingRequest("req_pre_m2_canonical_obligation");
    const trace = appraise(world.service, thread.threadId, activationRequest);
    assert.equal(trace.privateStance.desiredAction, "clarify");
    assert.deepEqual(trace.appraisal.obligations, [obligation]);

    time.advance();
    const continued = continueParticipation(
      world.service,
      thread.threadId,
      activationRequest.requestId,
      { governingObligationReferences: [obligation] },
    );
    assert.equal(continued.kind, "runtime");
    assert.equal(continued.runtime.authorization.desiredAction, "clarify");
    assert.equal(continued.runtime.authorization.authorizedAction, "accept");
    assert.deepEqual(continued.runtime.authorization.obligationReferences, [obligation]);
    const sessionId = continued.runtime.session.sessionId;

    time.advance();
    const actor = world.service.runDeterministicActor(thread.threadId, sessionId, {
      operationId: "op_pre_m2_canonical_obligation_actor",
    }).runtime;
    assert.equal(actor.actorRun.output.proposedLifeChanges.length, 0);
    time.advance();
    const guardian = world.service.runGoalGuardian(thread.threadId, sessionId, {
      operationId: "op_pre_m2_canonical_obligation_guardian",
    }).runtime;
    assert.equal(guardian.goalGuardianAudit.audit.decision, "pass");
    time.advance();
    const frozen = world.service.freezeRuntime(thread.threadId, sessionId, {
      operationId: "op_pre_m2_canonical_obligation_freeze",
      lifeChangeDecisions: [],
      causationId: "cause_pre_m2_canonical_obligation_freeze",
      correlationId: `corr_${activationRequest.requestId}_${thread.threadId}`,
    }).freeze;
    assert.deepEqual(frozen.report.dischargedObligations, [obligation]);
    assert.equal(world.service.getThread(thread.threadId).currentState.unresolvedIntentions.length, 0);

    world.close();
    world = openWorld(databasePath, controlledClock("2026-08-07T22:30:00Z"));
    const restartedRuntime = world.service.getRuntime(thread.threadId, sessionId);
    assert.equal(restartedRuntime.session.status, "completed");
    assert.equal(restartedRuntime.lease.status, "released");
    return {
      currentGuardianDesiredAction: "clarify",
      kernelAuthorizedAction: "accept",
      participationBasis: "obligation_override",
      governingObligationReference: obligation,
      actorRan: true,
      goalGuardianDecision: "pass",
      freezeCompleted: true,
      obligationDischarged: true,
      restartSurvived: true,
      acceptedLifeChangeCount: frozen.report.acceptedLifeChanges.length,
      memoryCreationInThisFreshFixture: false,
      memoryCreationNote:
        "This fresh obligation-only fixture has no resolved durable memory or relationship evidence, so the deterministic Actor proposes no memory. Canonical freeze/memory machinery remains reachable once selected durable evidence exists; Development is not claimed here.",
    };
  } finally {
    world.close();
  }
}

function selfModelSwapProbe(databasePath) {
  const swappedMina = structuredClone(mina);
  const swappedDaniel = structuredClone(daniel);
  swappedMina.currentState.selfModel = daniel.currentState.selfModel;
  swappedDaniel.currentState.selfModel = mina.currentState.selfModel;
  const world = openWorld(databasePath, controlledClock("2026-08-07T23:00:00Z"));
  try {
    world.service.seedThread({ thread: swappedMina });
    world.service.seedThread({ thread: swappedDaniel });
    const activationRequest = standingRequest("req_pre_m2_self_model_swap_probe");
    const minaTrace = appraise(world.service, swappedMina.threadId, activationRequest);
    world.time.advance();
    const danielTrace = appraise(world.service, swappedDaniel.threadId, activationRequest);
    assert.equal(minaTrace.requestFingerprint, danielTrace.requestFingerprint);
    assert.equal(minaTrace.privateStance.desiredAction, "clarify");
    assert.equal(danielTrace.privateStance.desiredAction, "clarify");
    return {
      namedCandidateField: "currentState.selfModel",
      standingCounterfactualSatisfied: false,
      reason:
        "Guardian V2 intentionally does not interpret arbitrary self-model prose, so swapping it does not create a claimed causal divergence.",
      minaAfterSwap: publicTrace(minaTrace),
      danielAfterSwap: publicTrace(danielTrace),
    };
  } finally {
    world.close();
  }
}

function proseHonestyProbe(databasePath) {
  const variants = [
    { label: "negated competence", text: "Infrastructure work is outside my strengths." },
    { label: "identity-free token", text: "platform" },
    {
      label: "positive paraphrase",
      text: "I am dependable when the work concerns servers, networks and build pipelines.",
    },
  ];
  const results = [];
  for (const [index, variant] of variants.entries()) {
    const path = `${databasePath}.${index}.sqlite`;
    const world = openWorld(path, controlledClock(`2026-08-08T00:0${index}:00Z`));
    try {
      const thread = structuredClone(amara);
      thread.currentState.selfModel = variant.text;
      world.service.seedThread({ thread });
      const activationRequest = standingRequest(`req_pre_m2_prose_honesty_${index}`);
      const trace = appraise(world.service, thread.threadId, activationRequest);
      assert.equal(trace.privateStance.desiredAction, "clarify");
      assert.ok(trace.privateStance.score < 70);
      results.push({
        label: variant.label,
        selfModel: variant.text,
        desiredAction: trace.privateStance.desiredAction,
        dignityBand: trace.privateStance.dignityBand,
        score: trace.privateStance.score,
      });
    } finally {
      world.close();
    }
  }
  return {
    purpose:
      "Arbitrary prose, including vocabulary-only matches and negated competence, cannot manufacture semantic fit or high dignity.",
    results,
  };
}

function otherDomainProbe(databasePath) {
  const world = openWorld(databasePath, controlledClock("2026-08-08T01:00:00Z"));
  try {
    const copywriter = structuredClone(amara);
    copywriter.currentState.selfModel =
      "I am a professional copywriter who specializes in customer-facing launch announcements.";
    world.service.seedThread({ thread: copywriter });
    const request = {
      ...standingRequest("req_pre_m2_other_domain_probe"),
      objective: "Draft a customer-facing launch announcement",
      statedNeed: "Explain the product clearly to prospective customers.",
      permissions: ["read_launch_brief"],
      acceptanceCriteria: "Return one concise customer-facing announcement.",
    };
    const trace = appraise(world.service, copywriter.threadId, request);
    assert.equal(trace.privateStance.desiredAction, "clarify");
    return {
      purpose:
        "Guardian V2 has no privileged infrastructure vocabulary; another domain remains equally unresolved until semantic cognition exists.",
      copywriter: publicTrace(trace),
    };
  } finally {
    world.close();
  }
}

export function runPreM2CausalProof() {
  const directory = mkdtempSync(join(tmpdir(), "fibre-pre-m2-causal-socket-"));
  try {
    const baseline = baselineSocketProof(join(directory, "baseline.sqlite"));
    const canonicalObligationLifecycle = canonicalObligationLifecycleProof(
      join(directory, "obligation.sqlite"),
    );
    const selfModelSwap = selfModelSwapProbe(join(directory, "swap.sqlite"));
    const proseHonesty = proseHonestyProbe(join(directory, "prose"));
    const otherDomain = otherDomainProbe(join(directory, "other-domain.sqlite"));
    return {
      proof: "pre_m2_causal_socket",
      version: 3,
      architecturePassed: true,
      standingDifferentialGatePassed: false,
      standingGateBlockers: [
        "No semantic consumer yet demonstrates that equivalent natural-language meaning survives paraphrase.",
        "No semantic consumer yet demonstrates contradiction sensitivity to a Thread disavowing the claimed causal property.",
        "No two persistent Threads yet diverge for the same request for a meaning-grounded Thread-owned reason.",
      ],
      scoreClaims: {
        m1Frozen: "11/26",
        preM2Checkpoint: "11/26",
        nonInterchangeability: "remains 0",
        dignityAndConsent: "remains 1",
        development: "remains 0",
        cognitionReplaceability: "remains 1",
      },
      liveCanonicalBasis: {
        willingSemanticAcceptReachable: false,
        obligationOverrideExecutionReachable: true,
        authorizationIntegrityLive: true,
        developmentLive: false,
        reversalCondition:
          "A semantic Guardian must pass paraphrase invariance, contradiction sensitivity, and applicable stability controls before Fibre may claim willing identity-grounded acceptance or causal individuality.",
      },
      architecture: baseline,
      canonicalObligationLifecycle,
      selfModelSwap,
      proseHonesty,
      otherDomain,
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function main() {
  process.stdout.write(`${JSON.stringify(runPreM2CausalProof(), null, 2)}\n`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      proof: "pre_m2_causal_socket",
      architecturePassed: false,
      errorName: error.constructor?.name ?? "Error",
      message: error.message,
    })}\n`);
    process.exitCode = 1;
  });
}
