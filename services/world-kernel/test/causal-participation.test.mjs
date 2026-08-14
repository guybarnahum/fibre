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
import { DIGNITY_GUARDIAN_POLICY } from "../src/dignity-guardian.mjs";
import { createScriptedGuardianModelAdapter } from "./support/scripted-guardian-model-adapter.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const daniel = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/daniel.thread.json", import.meta.url), "utf8"),
);
const amara = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/amara.thread.json", import.meta.url), "utf8"),
);

function controlledClock(start = "2026-08-07T17:30:00Z") {
  let value = Date.parse(start);
  return {
    clock: () => new Date(value),
    advance(milliseconds = 1000) { value += milliseconds; },
  };
}

function openCausalWorld(databasePath, time = controlledClock()) {
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
      clock: time.clock,
      semanticStateStore,
      guardianCognitionStore,
      guardianModelAdapter,
    },
  );
  return {
    service,
    time,
    guardianModelAdapter,
    guardianCognitionStore,
    semanticStateStore,
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

function sameRequest(requestId = "req_pre_m2_infrastructure_review") {
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

function appraisalSubmission(request, threadId) {
  return {
    request,
    causationId: `cause_appraise_${threadId}`,
    correlationId: `corr_pre_m2_${threadId}`,
  };
}

function continuation(threadId, { governingObligationReferences = [] } = {}) {
  return {
    operationId: `op_continue_${threadId}`,
    causationId: `cause_continue_${threadId}`,
    correlationId: `corr_pre_m2_${threadId}`,
    ...(governingObligationReferences.length === 0
      ? {}
      : { governingObligationReferences: [...governingObligationReferences] }),
  };
}

function clone(value) {
  return structuredClone(value);
}

function withDatabase(prefix, run) {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  const databasePath = join(directory, "world.sqlite");
  try {
    return run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function assertCausalCapsule(trace, expectedAlternativeId) {
  assert.equal(trace.appraisal.causalContext.selectionAuthority, "fibre");
  assert.equal(trace.appraisal.causalContext.selectionPolicy.id, "fibre_owned_attention");
  assert.equal(
    trace.appraisal.causalContext.worldResolutionPolicy.id,
    "shared_relationship_thread_directory",
  );
  assert.equal(typeof trace.appraisal.semanticTraits.collaboration, "string");
  assert.deepEqual(trace.appraisal.resolvedMemories, []);
  assert.equal(trace.appraisal.relevantMemories.length, 0);
  assert.equal(trace.appraisal.causalContext.unresolvedMemoryRefs.length, 1);
  assert.equal(trace.appraisal.relevantRelationships.length, 0);
  assert.deepEqual(
    trace.appraisal.knownAlternatives.map((entity) => entity.entityId),
    [expectedAlternativeId],
  );
}

test("same request proves Fibre-owned appraisal without claiming causal individuality", () => {
  withDatabase("fibre-causal-socket-", (databasePath) => {
    let world = openCausalWorld(databasePath);
    try {
      assert.equal(world.service.seedThread({ thread: mina }).created, true);
      assert.equal(world.service.seedThread({ thread: daniel }).created, true);

      const request = sameRequest();
      const minaTrace = world.service.appraiseParticipation(
        mina.threadId,
        appraisalSubmission(request, mina.threadId),
      ).trace;
      world.time.advance();
      const danielTrace = world.service.appraiseParticipation(
        daniel.threadId,
        appraisalSubmission(request, daniel.threadId),
      ).trace;

      assert.equal(minaTrace.requestFingerprint, danielTrace.requestFingerprint);
      assert.equal(minaTrace.privateStance.policy.id, DIGNITY_GUARDIAN_POLICY.id);
      assert.equal(minaTrace.privateStance.policy.version, DIGNITY_GUARDIAN_POLICY.version);
      assert.equal(danielTrace.privateStance.policy.version, DIGNITY_GUARDIAN_POLICY.version);
      assert.equal(minaTrace.privateStance.desiredAction, "clarify");
      assert.equal(danielTrace.privateStance.desiredAction, "clarify");
      assert.equal(minaTrace.privateStance.dignityBand, "contested");
      assert.equal(danielTrace.privateStance.dignityBand, "contested");
      assertCausalCapsule(minaTrace, daniel.threadId);
      assertCausalCapsule(danielTrace, mina.threadId);
      assert.match(minaTrace.privateStance.privateRationale, /grounded semantic evidence/i);
      assert.match(danielTrace.privateStance.privateRationale, /grounded semantic evidence/i);

      world.time.advance();
      const minaContinuation = world.service.continueParticipation(
        mina.threadId,
        request.requestId,
        continuation(mina.threadId),
      );
      world.time.advance();
      const danielContinuation = world.service.continueParticipation(
        daniel.threadId,
        request.requestId,
        continuation(daniel.threadId),
      );
      assert.equal(minaContinuation.kind, "non_execution");
      assert.equal(danielContinuation.kind, "non_execution");
      assert.equal(minaContinuation.authorization.authorization.authorizedAction, "clarify");
      assert.equal(danielContinuation.authorization.authorization.authorizedAction, "clarify");
      assert.deepEqual(world.service.listRuntimeSummaries(mina.threadId), []);
      assert.deepEqual(world.service.listRuntimeSummaries(daniel.threadId), []);

      const fingerprint = minaTrace.requestFingerprint;
      const minaStanceId = minaTrace.privateStanceId;
      const danielStanceId = danielTrace.privateStanceId;
      world.close();
      world = openCausalWorld(databasePath, controlledClock("2026-08-07T18:00:00Z"));
      assert.equal(
        world.service.getPrivateRequestTrace(mina.threadId, request.requestId).requestFingerprint,
        fingerprint,
      );
      assert.equal(
        world.service.getPrivateRequestTrace(mina.threadId, request.requestId).privateStanceId,
        minaStanceId,
      );
      assert.equal(
        world.service.getPrivateRequestTrace(daniel.threadId, request.requestId).privateStanceId,
        danielStanceId,
      );
      assert.equal(
        world.service.getParticipationAuthorization(mina.threadId, request.requestId).authorization.authorizedAction,
        "clarify",
      );
      assert.equal(
        world.service.getParticipationAuthorization(daniel.threadId, request.requestId).authorization.authorizedAction,
        "clarify",
      );
      const replay = world.service.inspectCausalJudgment(mina.threadId, request.requestId);
      assert.equal(replay.replaySource, "persisted_guardian_assessment");
      assert.equal(replay.modelRecalled, false);
    } finally {
      world.close();
    }
  });
});

test("recorded obligation can override semantic clarify and complete a canonical life", () => {
  withDatabase("fibre-causal-obligation-life-", (databasePath) => {
    const time = controlledClock("2026-08-07T18:30:00Z");
    let world = openCausalWorld(databasePath, time);
    const obligated = clone(mina);
    const obligation = "Honor the recorded bounded infrastructure-review obligation for Guy.";
    obligated.memoryRefs = [];
    obligated.relationshipRefs = [];
    obligated.currentState.unresolvedIntentions = [obligation];
    try {
      world.service.seedThread({ thread: obligated });
      const request = sameRequest("req_pre_m2_obligation_override");
      const trace = world.service.appraiseParticipation(
        obligated.threadId,
        appraisalSubmission(request, obligated.threadId),
      ).trace;
      assert.equal(trace.privateStance.desiredAction, "clarify");
      assert.deepEqual(trace.appraisal.obligations, [obligation]);

      assert.throws(
        () => world.service.continueParticipation(
          obligated.threadId,
          request.requestId,
          continuation(obligated.threadId, {
            governingObligationReferences: ["An invented obligation"],
          }),
        ),
        /not selected from the Thread's recorded appraisal context/i,
      );

      time.advance();
      const continued = world.service.continueParticipation(
        obligated.threadId,
        request.requestId,
        continuation(obligated.threadId, { governingObligationReferences: [obligation] }),
      );
      assert.equal(continued.kind, "runtime");
      assert.equal(continued.runtime.authorization.desiredAction, "clarify");
      assert.equal(continued.runtime.authorization.authorizedAction, "accept");
      assert.deepEqual(continued.runtime.authorization.obligationReferences, [obligation]);
      const sessionId = continued.runtime.session.sessionId;

      time.advance();
      const actor = world.service.runDeterministicActor(obligated.threadId, sessionId, {
        operationId: "op_actor_pre_m2_obligation",
      }).runtime;
      assert.equal(actor.actorRun.output.proposedLifeChanges.length, 0);
      time.advance();
      const guardian = world.service.runGoalGuardian(obligated.threadId, sessionId, {
        operationId: "op_guardian_pre_m2_obligation",
      }).runtime;
      assert.equal(guardian.goalGuardianAudit.audit.decision, "pass");
      time.advance();
      const frozen = world.service.freezeRuntime(obligated.threadId, sessionId, {
        operationId: "op_freeze_pre_m2_obligation",
        lifeChangeDecisions: [],
        causationId: "cause_freeze_pre_m2_obligation",
        correlationId: `corr_pre_m2_${obligated.threadId}`,
      }).freeze;
      assert.deepEqual(frozen.report.dischargedObligations, [obligation]);
      assert.equal(frozen.report.acceptedLifeChanges.length, 0);
      assert.equal(world.service.getThread(obligated.threadId).version, 2);
      assert.equal(
        world.service.getThread(obligated.threadId).currentState.unresolvedIntentions.includes(obligation),
        false,
      );
      assert.equal(world.service.getRuntime(obligated.threadId, sessionId).session.status, "completed");

      world.close();
      world = openCausalWorld(databasePath, controlledClock("2026-08-07T19:00:00Z"));
      const afterRestart = world.service.getRuntime(obligated.threadId, sessionId);
      assert.equal(afterRestart.session.status, "completed");
      assert.equal(afterRestart.lease.status, "released");
      assert.deepEqual(
        world.service.getFreezeReport(obligated.threadId, sessionId).report.dischargedObligations,
        [obligation],
      );
    } finally {
      world.close();
    }
  });
});

test("self-model swap remains a wiring test rather than semantic individuality evidence", () => {
  withDatabase("fibre-causal-swap-honesty-", (databasePath) => {
    const time = controlledClock("2026-08-07T19:00:00Z");
    const world = openCausalWorld(databasePath, time);
    try {
      const swappedMina = clone(mina);
      const swappedDaniel = clone(daniel);
      swappedMina.currentState.selfModel = daniel.currentState.selfModel;
      swappedDaniel.currentState.selfModel = mina.currentState.selfModel;
      world.service.seedThread({ thread: swappedMina });
      world.service.seedThread({ thread: swappedDaniel });

      const request = sameRequest("req_pre_m2_self_model_swap");
      const minaTrace = world.service.appraiseParticipation(
        swappedMina.threadId,
        appraisalSubmission(request, swappedMina.threadId),
      ).trace;
      time.advance();
      const danielTrace = world.service.appraiseParticipation(
        swappedDaniel.threadId,
        appraisalSubmission(request, swappedDaniel.threadId),
      ).trace;

      assert.equal(minaTrace.requestFingerprint, danielTrace.requestFingerprint);
      assert.equal(minaTrace.privateStance.desiredAction, "clarify");
      assert.equal(danielTrace.privateStance.desiredAction, "clarify");
      assert.equal(minaTrace.appraisal.selfModel, daniel.currentState.selfModel);
      assert.equal(danielTrace.appraisal.selfModel, mina.currentState.selfModel);
    } finally {
      world.close();
    }
  });
});

test("scripted wiring probes cannot manufacture semantic high dignity", () => {
  const variants = [
    "Infrastructure work is outside my strengths.",
    "I avoid low-level systems work; I build products.",
    "My weakness is deep platform engineering.",
    "platform",
    "systems.",
    "I do infrastructure.",
    "I am dependable when the work concerns servers, networks and build pipelines.",
    "I keep production running and I am the one who diagnoses outages calmly.",
    "I am an expert in database tuning and network hardening.",
  ];

  for (const [index, selfModel] of variants.entries()) {
    withDatabase(`fibre-causal-prose-${index}-`, (databasePath) => {
      const world = openCausalWorld(databasePath, controlledClock("2026-08-07T20:00:00Z"));
      try {
        const thread = clone(amara);
        thread.currentState.selfModel = selfModel;
        world.service.seedThread({ thread });
        const request = sameRequest(`req_pre_m2_prose_probe_${index}`);
        const trace = world.service.appraiseParticipation(
          thread.threadId,
          appraisalSubmission(request, thread.threadId),
        ).trace;
        assert.equal(trace.privateStance.desiredAction, "clarify");
        assert.equal(trace.privateStance.dignityBand, "contested");
        assert.ok(trace.privateStance.score < 70);
        assert.match(trace.privateStance.privateRationale, /grounded semantic evidence/i);
        assert.deepEqual(world.service.listRuntimeSummaries(thread.threadId), []);
      } finally {
        world.close();
      }
    });
  }
});

test("another domain remains equally unresolved in scripted wiring evidence", () => {
  withDatabase("fibre-causal-other-domain-", (databasePath) => {
    const world = openCausalWorld(databasePath, controlledClock("2026-08-07T20:30:00Z"));
    try {
      const copywriter = clone(amara);
      copywriter.currentState.selfModel = "I am a professional copywriter who specializes in customer-facing launch announcements.";
      world.service.seedThread({ thread: copywriter });
      const request = {
        ...sameRequest("req_pre_m2_marketing_probe"),
        objective: "Draft a customer-facing launch announcement",
        statedNeed: "Explain the product clearly to prospective customers.",
        permissions: ["read_launch_brief"],
        acceptanceCriteria: "Return one concise customer-facing announcement.",
      };
      const trace = world.service.appraiseParticipation(
        copywriter.threadId,
        appraisalSubmission(request, copywriter.threadId),
      ).trace;
      assert.equal(trace.privateStance.desiredAction, "clarify");
      assert.equal(trace.privateStance.dignityBand, "contested");
      assert.ok(trace.privateStance.score < 70);
    } finally {
      world.close();
    }
  });
});
