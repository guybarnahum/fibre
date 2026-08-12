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
import { openObligationStore } from "../src/obligation-store.mjs";
import { openObligationApplicabilityStore } from "../src/obligation-applicability-store.mjs";
import { requestFingerprint } from "../src/private-participation.mjs";
import { StructuredObligationCausalWorldKernelService } from "../src/structured-causal-service.mjs";
import { createScriptedGuardianModelAdapter } from "./support/scripted-guardian-model-adapter.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const OBLIGATION_ID = `obl_${"d".repeat(64)}`;
const OTHER_OBLIGATION_ID = `obl_${"e".repeat(64)}`;

function controlledClock(start = "2026-08-10T03:00:00.000Z") {
  let value = Date.parse(start);
  return {
    clock: () => new Date(value),
    advance(milliseconds = 1000) { value += milliseconds; },
  };
}

function request(requestId = "req_structured_runtime") {
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

function obligation({
  obligationId = OBLIGATION_ID,
  revision = 1,
  status = "active",
  boundRequest,
  expiresAt = "2026-09-10T03:00:00.000Z",
  supersedesRevision,
  createdAt = "2026-08-10T02:55:00.000Z",
} = {}) {
  return {
    obligationId,
    revision,
    threadId: mina.threadId,
    status,
    issuer: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    parties: [{
      role: "beneficiary",
      entity: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    }],
    scope: {
      description: "Participate only in the exact Fibre-bound infrastructure-review request.",
      binding: {
        kind: "request_fingerprint",
        requestFingerprint: boundRequest,
      },
    },
    terms: status === "active"
      ? "Perform one bounded infrastructure review while preserving private dignity state."
      : "The prior infrastructure-review commitment no longer governs participation.",
    effectiveAt: "2026-08-10T02:55:00.000Z",
    expiresAt,
    recurrence: { kind: "none" },
    satisfaction: { criteria: "One authorized participation episode is later discharged by Fibre." },
    provenance: {
      createdBy: "test_structured_runtime",
      createdAt,
      evidenceReferences: ["test:structured-runtime-authority"],
    },
    visibility: { standing: "restricted", terms: "private" },
    ...(supersedesRevision === undefined ? {} : { supersedesRevision }),
  };
}

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-structured-runtime-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function openStructuredWorld(databasePath, time = controlledClock()) {
  const worldStore = openWorldStore(databasePath);
  const runtimeStore = openRuntimeStore(databasePath);
  const freezeStore = openFreezeStore(databasePath);
  const lifecycleStore = openLifecycleHardeningStore(databasePath);
  const expressionStore = openExpressionStore(databasePath);
  const causalContextStore = openCausalContextStore(databasePath);
  const semanticStateStore = openSemanticStateStore(databasePath);
  const guardianCognitionStore = openGuardianCognitionStore(databasePath);
  const obligationStore = openObligationStore(databasePath);
  const applicabilityStore = openObligationApplicabilityStore(databasePath);
  let afterApplicability = null;
  const applicabilityAuthority = {
    decideApplicability(input) {
      const result = applicabilityStore.decideApplicability(input);
      afterApplicability?.(result);
      return result;
    },
    getDecision(...args) {
      return applicabilityStore.getDecision(...args);
    },
  };
  const service = new StructuredObligationCausalWorldKernelService(
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
      guardianModelAdapter: createScriptedGuardianModelAdapter(),
      applicabilityStore: applicabilityAuthority,
    },
  );
  return {
    service,
    time,
    obligationStore,
    applicabilityStore,
    setAfterApplicability(callback) { afterApplicability = callback; },
    close() {
      applicabilityStore.close();
      obligationStore.close();
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

function appraise(world, activationRequest) {
  return world.service.appraiseParticipation(mina.threadId, {
    request: activationRequest,
    causationId: `cause_appraise_${activationRequest.requestId}`,
    correlationId: `corr_${activationRequest.requestId}`,
  }).trace;
}

function continueRequest(activationRequest, governingObligationId) {
  return {
    operationId: `op_continue_${activationRequest.requestId}`,
    causationId: `cause_continue_${activationRequest.requestId}`,
    correlationId: `corr_${activationRequest.requestId}`,
    ...(governingObligationId === undefined ? {} : { governingObligationId }),
  };
}

test("canonical Structured Obligation applicability can compel runtime without rewriting private dignity", () => {
  withDatabase((databasePath) => {
    let world = openStructuredWorld(databasePath);
    const activationRequest = request("req_structured_compelled");
    try {
      world.service.seedThread({ thread: mina });
      world.obligationStore.recordRevision(obligation({
        boundRequest: requestFingerprint(activationRequest),
      }), { recordedAt: "2026-08-10T02:56:00.000Z" });
      const trace = appraise(world, activationRequest);
      assert.notEqual(trace.privateStance.desiredAction, "accept");

      const continued = world.service.continueParticipation(
        mina.threadId,
        activationRequest.requestId,
        continueRequest(activationRequest, OBLIGATION_ID),
      );
      assert.equal(continued.kind, "runtime");
      assert.equal(continued.applicability.decision.result, "applies");
      assert.equal(continued.runtime.authorization.participationBasis, "obligation_override");
      assert.equal(continued.runtime.authorization.desiredAction, trace.privateStance.desiredAction);
      assert.equal(continued.runtime.authorization.authorizedAction, "accept");
      assert.deepEqual(continued.runtime.authorization.obligationReferences, []);
      assert.equal(
        continued.runtime.authorization.applicability.applicabilityId,
        continued.applicability.decision.applicabilityId,
      );
      assert.equal(
        continued.runtime.authorization.applicability.decisionDigest,
        continued.applicability.decisionDigest,
      );
      assert.equal(
        continued.runtime.authorization.applicability.obligationId,
        OBLIGATION_ID,
      );

      const sessionId = continued.runtime.session.sessionId;
      world.time.advance();
      const actor = world.service.runDeterministicActor(mina.threadId, sessionId, {
        operationId: "op_actor_structured_compelled",
      }).runtime;
      assert.equal(actor.actorRun.output.proposedLifeChanges.length, 0);

      const authorizationId = continued.runtime.authorization.authorizationId;
      world.close();
      world = openStructuredWorld(databasePath, controlledClock("2026-08-10T03:05:00.000Z"));
      const replay = world.service.getRuntime(mina.threadId, sessionId);
      assert.equal(replay.authorization.authorizationId, authorizationId);
      assert.equal(replay.authorization.participationBasis, "obligation_override");
      assert.equal(replay.authorization.desiredAction, trace.privateStance.desiredAction);
      assert.equal(
        replay.authorization.applicability.obligationId,
        OBLIGATION_ID,
      );
    } finally {
      world.close();
    }
  });
});

test("caller prose is no longer an authority surface on the canonical structured service", () => {
  withDatabase((databasePath) => {
    const world = openStructuredWorld(databasePath);
    const activationRequest = request("req_structured_no_prose_authority");
    try {
      const thread = structuredClone(mina);
      thread.currentState.unresolvedIntentions = [
        "Honor the recorded bounded infrastructure-review obligation for Guy.",
      ];
      world.service.seedThread({ thread });
      const trace = appraise(world, activationRequest);
      assert.notEqual(trace.privateStance.desiredAction, "accept");
      assert.throws(
        () => world.service.continueParticipation(
          mina.threadId,
          activationRequest.requestId,
          {
            ...continueRequest(activationRequest),
            governingObligationReferences: [thread.currentState.unresolvedIntentions[0]],
          },
        ),
        /governingObligationReferences is not allowed/i,
      );
      assert.deepEqual(world.service.listRuntimeSummaries(mina.threadId), []);
    } finally {
      world.close();
    }
  });
});

test("irrelevant Structured Obligation nomination records does_not_apply and preserves private non-execution", () => {
  withDatabase((databasePath) => {
    const world = openStructuredWorld(databasePath);
    const activationRequest = request("req_structured_irrelevant");
    try {
      world.service.seedThread({ thread: mina });
      world.obligationStore.recordRevision(obligation({
        obligationId: OTHER_OBLIGATION_ID,
        boundRequest: `sha256:${"f".repeat(64)}`,
      }), { recordedAt: "2026-08-10T02:56:00.000Z" });
      const trace = appraise(world, activationRequest);
      assert.notEqual(trace.privateStance.desiredAction, "accept");

      const continued = world.service.continueParticipation(
        mina.threadId,
        activationRequest.requestId,
        continueRequest(activationRequest, OTHER_OBLIGATION_ID),
      );
      assert.equal(continued.kind, "non_execution");
      assert.equal(continued.applicability.decision.result, "does_not_apply");
      assert.equal(continued.authorization.authorization.authorizedAction, trace.privateStance.desiredAction);
      assert.deepEqual(continued.authorization.authorization.obligationReferences, []);
      assert.deepEqual(world.service.listRuntimeSummaries(mina.threadId), []);
    } finally {
      world.close();
    }
  });
});

test("an applies decision cannot survive a newer revoked obligation revision before runtime insertion", () => {
  withDatabase((databasePath) => {
    const world = openStructuredWorld(databasePath);
    const activationRequest = request("req_structured_stale_revision");
    try {
      world.service.seedThread({ thread: mina });
      const fingerprint = requestFingerprint(activationRequest);
      world.obligationStore.recordRevision(obligation({ boundRequest: fingerprint }), {
        recordedAt: "2026-08-10T02:56:00.000Z",
      });
      const trace = appraise(world, activationRequest);
      assert.notEqual(trace.privateStance.desiredAction, "accept");

      world.setAfterApplicability((applicability) => {
        assert.equal(applicability.decision.result, "applies");
        world.time.advance(2000);
        world.obligationStore.recordRevision(obligation({
          revision: 2,
          status: "revoked",
          boundRequest: fingerprint,
          supersedesRevision: 1,
          createdAt: "2026-08-10T03:00:01.000Z",
        }), { recordedAt: "2026-08-10T03:00:01.000Z" });
      });

      assert.throws(
        () => world.service.continueParticipation(
          mina.threadId,
          activationRequest.requestId,
          continueRequest(activationRequest, OBLIGATION_ID),
        ),
        /structured obligation applicability is not current execution authority/i,
      );
      assert.equal(
        world.applicabilityStore.listRequestDecisions(mina.threadId, activationRequest.requestId)[0].decision.result,
        "applies",
      );
      assert.deepEqual(world.service.listRuntimeSummaries(mina.threadId), []);
    } finally {
      world.close();
    }
  });
});

test("an applies decision cannot authorize after the obligation expires before runtime insertion", () => {
  withDatabase((databasePath) => {
    const world = openStructuredWorld(databasePath);
    const activationRequest = request("req_structured_expired_at_thaw");
    try {
      world.service.seedThread({ thread: mina });
      world.obligationStore.recordRevision(obligation({
        boundRequest: requestFingerprint(activationRequest),
        expiresAt: "2026-08-10T03:00:01.000Z",
      }), { recordedAt: "2026-08-10T02:56:00.000Z" });
      const trace = appraise(world, activationRequest);
      assert.notEqual(trace.privateStance.desiredAction, "accept");

      world.setAfterApplicability((applicability) => {
        assert.equal(applicability.decision.result, "applies");
        world.time.advance(2000);
      });
      assert.throws(
        () => world.service.continueParticipation(
          mina.threadId,
          activationRequest.requestId,
          continueRequest(activationRequest, OBLIGATION_ID),
        ),
        /structured obligation applicability is not current execution authority/i,
      );
      assert.deepEqual(world.service.listRuntimeSummaries(mina.threadId), []);
    } finally {
      world.close();
    }
  });
});

test("unknown Structured Obligation nomination creates no execution authority", () => {
  withDatabase((databasePath) => {
    const world = openStructuredWorld(databasePath);
    const activationRequest = request("req_structured_unknown");
    try {
      world.service.seedThread({ thread: mina });
      appraise(world, activationRequest);
      assert.throws(
        () => world.service.continueParticipation(
          mina.threadId,
          activationRequest.requestId,
          continueRequest(activationRequest, OBLIGATION_ID),
        ),
        /nominated Structured Obligation .* was not found/i,
      );
      assert.deepEqual(world.service.listRuntimeSummaries(mina.threadId), []);
      assert.deepEqual(
        world.applicabilityStore.listRequestDecisions(mina.threadId, activationRequest.requestId),
        [],
      );
    } finally {
      world.close();
    }
  });
});

test("structured service advertises Fibre-owned applicability rather than recorded prose authority", () => {
  withDatabase((databasePath) => {
    const world = openStructuredWorld(databasePath);
    try {
      const health = world.service.health();
      assert.equal(health.causalParticipationProfileVersion, 4);
      assert.equal(health.obligationOverrideAuthority, "fibre_structured_applicability");
      assert.equal(health.obligationNominationAuthority, "attention_only");
      assert.equal(health.obligationConsentSemantics, "compulsion_preserves_private_stance");
    } finally {
      world.close();
    }
  });
});
