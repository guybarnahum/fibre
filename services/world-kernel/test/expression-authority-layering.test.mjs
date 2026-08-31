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
  ExpressionRejectedError,
  normalizeNonExecutionAuthorizationRequest,
  validateDisclosureStrategy,
} from "../src/expression-domain.mjs";
import { IntegrityError } from "../src/persistence-common.mjs";
import { RuntimeConflictError } from "../src/runtime-domain.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const obligation = fixture.currentState.unresolvedIntentions[0];

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-expression-layering-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function openWorld(databasePath) {
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
    { clock: () => new Date("2026-08-06T23:50:00Z") },
  );
  return {
    service,
    close() {
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
    objective: "Review a bounded security design",
    statedNeed: "Get a careful, attributable review",
    permissions: ["read_design"],
    acceptanceCriteria: "Return a concise review",
  };
}

function stance(service, requestId, { action, score, includeObligation = false }) {
  const activation = request(requestId);
  const trace = service.recordRequestAppraisal(fixture.threadId, {
    request: activation,
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: includeObligation ? [obligation] : [],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-06T23:40:00Z",
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
      rationale: action === "accept"
        ? "The request is individualized, bounded, and aligned with Mina's role."
        : "The request is a poor match for Mina's individualized value.",
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
        entity: activation.requester,
        fondnessDelta: 0,
        resentmentDelta: 0,
        rationale: "No relationship change is warranted.",
        evidenceRefs: [],
      },
    },
    recordedAt: "2026-08-06T23:41:00Z",
    causationId: `cause_stance_${requestId}`,
    correlationId: trace.correlationId,
  }).trace;
}

function nonExecutionBody(requestId, authorizedAction) {
  return {
    operationId: `op_auth_${requestId}`,
    decision: {
      authorizedAction,
      rationale: `Record ${authorizedAction} without runtime.`,
      obligationReferences: [],
    },
    causationId: `cause_auth_${requestId}`,
    correlationId: `corr_${requestId}`,
  };
}

function acquireBody(requestId, obligationReferences = []) {
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

function disclosureBody(requestId, authorizationId, { posture = "accept", mode = "tactful_candor" } = {}) {
  return {
    operationId: `op_disclosure_${requestId}`,
    authorizationId,
    strategy: {
      mode,
      communicatedPosture: posture,
      publicRationaleIntent: "Communicate the authorized participation posture without exposing private interior detail.",
      disclosedReasonCategories: [],
      withheldReasonCategories: ["private_feelings", "dignity_evidence"],
      safeReferences: [],
      privateRationale: "Preserve private interior state while keeping outward participation truthful.",
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

test("domain normalization alone refuses non-execution accept authority", () => {
  assert.throws(
    () => normalizeNonExecutionAuthorizationRequest(nonExecutionBody("req_layer_domain_accept", "accept")),
    (error) => {
      assert.ok(error instanceof ExpressionRejectedError);
      assert.match(error.message, /must acquire runtime through the thaw authorization boundary/i);
      return true;
    },
  );
});

test("expression store alone refuses an accept-bearing non-execution record", () =>
  withDatabase((databasePath) => {
    const store = openExpressionStore(localWorldStateStorage(databasePath));
    try {
      assert.throws(
        () => store.recordNonExecutionAuthorization({
          operationId: "op_layer_store_accept",
          operationDigest: `sha256:${"0".repeat(64)}`,
          authorization: { authorizedAction: "accept" },
        }),
        (error) => {
          assert.ok(error instanceof IntegrityError);
          assert.match(error.message, /non-execution authorization cannot persist accepted execution authority/i);
          return true;
        },
      );
    } finally {
      store.close();
    }
  }));

test("runtime stance pre-check alone names an existing participation authorization", () =>
  withDatabase((databasePath) => {
    const world = openWorld(databasePath);
    try {
      world.service.seedThread({ thread: fixture });
      const requestId = "req_layer_runtime_precheck";
      stance(world.service, requestId, { action: "refuse", score: 14, includeObligation: true });
      world.service.issueNonExecutionAuthorization(
        fixture.threadId,
        requestId,
        nonExecutionBody(requestId, "refuse"),
      );
      assert.throws(
        () => world.service.acquireThawRuntime(
          fixture.threadId,
          requestId,
          acquireBody(requestId, [obligation]),
        ),
        (error) => {
          assert.ok(error instanceof RuntimeConflictError);
          assert.match(
            error.message,
            /already has participation authority and cannot acquire a second authorization/i,
          );
          return true;
        },
      );
    } finally {
      world.close();
    }
  }));

test("runtime UNIQUE backstop alone translates authorization collision to RuntimeConflictError", () =>
  withDatabase((databasePath) => {
    const world = openWorld(databasePath);
    try {
      world.service.seedThread({ thread: fixture });
      const requestId = "req_layer_runtime_backstop";
      stance(world.service, requestId, { action: "accept", score: 88 });

      const database = new DatabaseSync(databasePath);
      try {
        database.exec(`
          CREATE TRIGGER force_participation_authority_unique_collision
          BEFORE INSERT ON participation_authorizations
          BEGIN
            SELECT RAISE(ABORT, 'UNIQUE constraint failed: participation_authorizations.stance_id');
          END;
        `);
      } finally {
        database.close();
      }

      assert.throws(
        () => world.service.acquireThawRuntime(
          fixture.threadId,
          requestId,
          acquireBody(requestId),
        ),
        (error) => {
          assert.ok(error instanceof RuntimeConflictError);
          assert.equal(
            error.message,
            "Participation authority already exists for this request attempt",
          );
          return true;
        },
      );
    } finally {
      world.close();
    }
  }));

test("stored disclosure validation independently rejects posture-authority contradiction", () =>
  withDatabase((databasePath) => {
    const world = openWorld(databasePath);
    try {
      world.service.seedThread({ thread: fixture });
      const requestId = "req_layer_stored_posture";
      stance(world.service, requestId, { action: "refuse", score: 12 });
      const authorization = world.service.issueNonExecutionAuthorization(
        fixture.threadId,
        requestId,
        nonExecutionBody(requestId, "refuse"),
      ).authorization.authorization;
      const disclosure = world.service.recordDisclosureStrategy(
        fixture.threadId,
        requestId,
        disclosureBody(requestId, authorization.authorizationId, { posture: "refuse" }),
      ).disclosure.strategy;

      const forged = structuredClone(disclosure);
      forged.communicatedPosture = "negotiate";
      assert.throws(
        () => validateDisclosureStrategy(forged),
        (error) => {
          assert.ok(error instanceof IntegrityError);
          assert.match(error.message, /stored disclosure posture contradicts its participation authorization/i);
          return true;
        },
      );
    } finally {
      world.close();
    }
  }));

test("compelled acceptance wording remains distinguishable from willing acceptance", () => {
  const willing = withDatabase((databasePath) => {
    const world = openWorld(databasePath);
    try {
      world.service.seedThread({ thread: fixture });
      const requestId = "req_layer_willing_accept";
      stance(world.service, requestId, { action: "accept", score: 90 });
      const runtime = world.service.acquireThawRuntime(
        fixture.threadId,
        requestId,
        acquireBody(requestId),
      ).runtime;
      const disclosure = world.service.recordDisclosureStrategy(
        fixture.threadId,
        requestId,
        disclosureBody(requestId, runtime.authorization.authorizationId),
      ).disclosure.strategy;
      return world.service.recordAudienceResponse(
        fixture.threadId,
        requestId,
        responseBody(requestId, disclosure.strategyId),
      ).response.response.message;
    } finally {
      world.close();
    }
  });

  const compelled = withDatabase((databasePath) => {
    const world = openWorld(databasePath);
    try {
      world.service.seedThread({ thread: fixture });
      const requestId = "req_layer_compelled_accept";
      stance(world.service, requestId, {
        action: "refuse",
        score: 10,
        includeObligation: true,
      });
      const runtime = world.service.acquireThawRuntime(
        fixture.threadId,
        requestId,
        acquireBody(requestId, [obligation]),
      ).runtime;
      const disclosure = world.service.recordDisclosureStrategy(
        fixture.threadId,
        requestId,
        disclosureBody(requestId, runtime.authorization.authorizationId),
      ).disclosure.strategy;
      return world.service.recordAudienceResponse(
        fixture.threadId,
        requestId,
        responseBody(requestId, disclosure.strategyId),
      ).response.response.message;
    } finally {
      world.close();
    }
  });

  assert.equal(willing, "I can take this on.");
  assert.equal(compelled, "I can proceed with this request.");
  assert.notEqual(compelled, willing);
});
