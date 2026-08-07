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
  audienceResponseDigest,
  disclosureStrategyDigest,
} from "../src/expression-domain.mjs";
import { canonicalJson, sha256 } from "../src/persistence-common.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const obligation = fixture.currentState.unresolvedIntentions[0];
const requestId = "req_expression_resigned_message_tamper";

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-expression-message-integrity-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function openExpressionWorld(databasePath) {
  const worldStore = openWorldStore(databasePath);
  const runtimeStore = openRuntimeStore(databasePath);
  const freezeStore = openFreezeStore(databasePath);
  const lifecycleStore = openLifecycleHardeningStore(databasePath);
  const expressionStore = openExpressionStore(databasePath);
  const service = new M1ExpressionWorldKernelService(
    worldStore,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    expressionStore,
    { clock: () => new Date("2026-08-06T22:00:00Z") },
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

function seedObligationExpression(service) {
  service.seedThread({ thread: fixture });
  const request = {
    requestId,
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Complete the bounded security review",
    statedNeed: "Honor the existing review obligation",
    permissions: ["read_design", "quote_findings"],
    acceptanceCriteria: "Return the promised review",
  };
  const trace = service.recordRequestAppraisal(fixture.threadId, {
    request,
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: [obligation],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-06T21:55:00Z",
    causationId: "cause_expression_message_tamper_request",
    correlationId: "corr_expression_message_tamper",
  }).trace;
  service.recordPrivateStance(fixture.threadId, requestId, {
    assessment: {
      threadId: trace.threadId,
      snapshotVersion: trace.snapshotVersion,
      requestId: trace.requestId,
      requestFingerprint: trace.requestFingerprint,
      policy: { id: "dignity_guardian", version: "1" },
      proposedAction: "refuse",
      score: 16,
      rationale: "Mina does not privately want this request, but a recorded obligation may govern participation.",
      factors: {
        identityAlignment: "The review is related to Mina's systems identity.",
        individualizedAdvantage: "Mina has relevant durable review history.",
        requesterNeed: "The requester has a concrete need.",
        relationalMeaning: "The request is attributable.",
        respectAndReciprocity: "Terms are explicit.",
        participationTerms: "The task is bounded.",
        obligationsAndOpportunityCost: "One exact recorded obligation applies.",
      },
      evidenceRefs: ["mem_mina_first_review"],
      repairQuestions: [],
      knownAlternatives: [],
      feelings: ["resistant"],
      conflictingMotives: ["Honor commitments", "Preserve private refusal"],
      uncertainties: [],
      relationshipImpact: {
        entity: request.requester,
        fondnessDelta: 0,
        resentmentDelta: 0,
        rationale: "No relationship update is required for this integrity test.",
        evidenceRefs: [],
      },
    },
    recordedAt: "2026-08-06T21:56:00Z",
    causationId: "cause_expression_message_tamper_stance",
    correlationId: "corr_expression_message_tamper",
  });
  const runtime = service.acquireThawRuntime(fixture.threadId, requestId, {
    operationId: "op_expression_message_tamper_runtime",
    decision: {
      authorizedAction: "accept",
      rationale: "Proceed only because Mina is honoring the exact recorded obligation.",
      obligationReferences: [obligation],
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
    },
    causationId: "cause_expression_message_tamper_runtime",
    correlationId: "corr_expression_message_tamper",
  });
  const disclosure = service.recordDisclosureStrategy(fixture.threadId, requestId, {
    operationId: "op_expression_message_tamper_disclosure",
    authorizationId: runtime.runtime.authorization.authorizationId,
    strategy: {
      mode: "full_candor",
      communicatedPosture: "accept",
      publicRationaleIntent: "State the obligation-mediated participation basis without exposing the obligation text.",
      disclosedReasonCategories: ["recorded_obligation"],
      withheldReasonCategories: ["private_feelings", "dignity_evidence"],
      safeReferences: [],
      privateRationale: "Preserve compulsion as distinct from consent.",
    },
    causationId: "cause_expression_message_tamper_disclosure",
    correlationId: "corr_expression_message_tamper",
  });
  service.recordAudienceResponse(fixture.threadId, requestId, {
    operationId: "op_expression_message_tamper_response",
    strategyId: disclosure.disclosure.strategy.strategyId,
    causationId: "cause_expression_message_tamper_response",
    correlationId: "corr_expression_message_tamper",
  });
}

test("re-signed audience wording substitution fails disclosure-derived integrity", () =>
  withDatabase((databasePath) => {
    let world = openExpressionWorld(databasePath);
    seedObligationExpression(world.service);
    const original = world.service.getAudienceResponse(fixture.threadId, requestId).response;
    assert.match(original.message, /recorded obligation/i);
    world.close();

    const database = new DatabaseSync(databasePath);
    try {
      database.exec("DROP TRIGGER audience_participation_responses_no_update");
      const row = database.prepare(
        "SELECT response_json FROM audience_participation_responses WHERE request_id=?",
      ).get(requestId);
      const tampered = JSON.parse(row.response_json);
      tampered.message = "I am glad to help with this and I want to do it.";
      database.prepare(`
        UPDATE audience_participation_responses
        SET response_json=?,response_digest=?
        WHERE request_id=?
      `).run(JSON.stringify(tampered), audienceResponseDigest(tampered), requestId);
    } finally {
      database.close();
    }

    // Reopening the expression store restores the additive append-only trigger before verification.
    const restored = openExpressionStore(databasePath);
    restored.close();

    world = openExpressionWorld(databasePath);
    assert.throws(
      () => world.service.verifyExpressionIntegrity(fixture.threadId, requestId),
      /response message does not match its witness/i,
    );
    world.close();
  }));

test("re-signed participation-basis substitution cannot turn compulsion into willing acceptance", () =>
  withDatabase((databasePath) => {
    let world = openExpressionWorld(databasePath);
    seedObligationExpression(world.service);
    const original = world.service.getExpressionChain(fixture.threadId, requestId);
    assert.equal(original.authorization.authorization.desiredAction, "refuse");
    assert.equal(original.authorization.authorization.authorizedAction, "accept");
    assert.equal(original.disclosure.strategy.participationBasis, "obligation_override");
    world.close();

    const database = new DatabaseSync(databasePath);
    try {
      database.exec(`
        DROP TRIGGER disclosure_strategies_no_update;
        DROP TRIGGER audience_participation_responses_no_update;
      `);
      const strategyRow = database.prepare(
        "SELECT strategy_json FROM disclosure_strategies WHERE request_id=?",
      ).get(requestId);
      const responseRow = database.prepare(
        "SELECT response_json FROM audience_participation_responses WHERE request_id=?",
      ).get(requestId);
      const tamperedStrategy = JSON.parse(strategyRow.strategy_json);
      tamperedStrategy.participationBasis = "aligned";
      assert.throws(
        () => disclosureStrategyDigest(tamperedStrategy),
        /participationBasis must derive from desired and authorized action/i,
        "the domain digest must refuse to sign an inconsistent derived basis",
      );
      const rawStrategyDigest = `sha256:${sha256(canonicalJson(tamperedStrategy))}`;
      database.prepare(`
        UPDATE disclosure_strategies
        SET strategy_json=?,strategy_digest=?
        WHERE request_id=?
      `).run(JSON.stringify(tamperedStrategy), rawStrategyDigest, requestId);

      const tamperedResponse = JSON.parse(responseRow.response_json);
      tamperedResponse.message = "I can take this on.";
      database.prepare(`
        UPDATE audience_participation_responses
        SET response_json=?,response_digest=?
        WHERE request_id=?
      `).run(
        JSON.stringify(tamperedResponse),
        audienceResponseDigest(tamperedResponse),
        requestId,
      );
    } finally {
      database.close();
    }

    // Restore append-only protection, then prove the incoherent re-signed chain still fails on read.
    const restored = openExpressionStore(databasePath);
    restored.close();

    world = openExpressionWorld(databasePath);
    assert.throws(
      () => world.service.verifyExpressionIntegrity(fixture.threadId, requestId),
      /participationBasis must derive from desired and authorized action/i,
    );
    world.close();
  }));
