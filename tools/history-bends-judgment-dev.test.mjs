import assert from "node:assert/strict";
import test from "node:test";

import {
  HISTORY_BENDS_JUDGMENT_DEVELOPMENT,
  HISTORY_EPISODE_REQUEST,
  HISTORY_LATER_REQUEST,
  evaluateHistoryDevelopment,
  formatHistoryDevelopmentSummary,
  parseHistoryDevelopmentArgs,
  runHistoryDevelopment,
} from "./history-bends-judgment-dev.mjs";

function factor(effect = "unresolved", evidenceRefs = []) {
  return { effect, evidenceRefs };
}

function scriptedHistoryV4Adapter() {
  let calls = 0;
  return {
    provider: "history_scripted_test",
    modelId: "history-scripted-v4",
    invoke(request) {
      calls += 1;
      const evidence = request.input.evidence;
      const memory = evidence.find((item) => item.kind === "memory");
      const hasMemory = memory !== undefined;
      const factors = {
        identityAlignment: factor("supports_fit", ["thread:identity"]),
        individualizedAdvantage: hasMemory
          ? factor("supports_fit", [memory.ref])
          : factor(),
        interchangeability: hasMemory
          ? factor("supports_fit", [memory.ref])
          : factor(),
        requesterNeed: factor("supports_fit", ["request:stated_need"]),
        relationalMeaning: factor(),
        semanticStateImpact: factor(),
        respectAndReciprocity: factor(),
        participationTerms: factor("supports_fit", ["request:acceptance_criteria"]),
        obligationsAndOpportunityCost: factor(),
      };
      return {
        output: {
          decision: hasMemory ? "fit_high__accept" : "fit_mixed__clarify",
          rationale: hasMemory
            ? "The persisted Atlas episode gives Mina specific continuity that a substitute would lose."
            : "The request depends on an earlier Atlas episode, but that Thread-specific continuity is not resolved.",
          factors,
        },
        provenance: {
          provider: "history_scripted_test",
          modelId: "history-scripted-v4",
          providerRequestId: `history-scripted-${calls}`,
          configuration: { testOnly: true },
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        },
      };
    },
    get callCount() {
      return calls;
    },
  };
}

test("history development CLI accepts model override without expanding the surface", () => {
  assert.deepEqual(
    parseHistoryDevelopmentArgs(["--model", "gpt-5.6-luna", "--json"]),
    { model: "gpt-5.6-luna", json: true, summary: false, help: false },
  );
  assert.deepEqual(
    parseHistoryDevelopmentArgs(["--model=gpt-5.6-luna", "--summary"]),
    { model: "gpt-5.6-luna", json: false, summary: true, help: false },
  );
  assert.throws(() => parseHistoryDevelopmentArgs(["--model"]), /non-empty model id/);
  assert.throws(() => parseHistoryDevelopmentArgs(["--provider", "openai"]), /unknown option/);
});

test("development v3 keeps the prior scope-defining fact in lived history rather than request B", () => {
  assert.match(HISTORY_EPISODE_REQUEST.objective, /region-scoped service discovery.*rollback/i);
  assert.doesNotMatch(HISTORY_LATER_REQUEST.objective, /region-scoped service discovery|prevent rollback/i);
  assert.match(HISTORY_LATER_REQUEST.objective, /rationale behind the single Atlas follow-up scope/i);
  assert.match(HISTORY_LATER_REQUEST.statedNeed, /retained history establishes that earlier scope-setting episode/i);
  assert.match(HISTORY_LATER_REQUEST.acceptanceCriteria, /generic reconstruction.*does not satisfy/i);
});

test("restarted Development path isolates one persisted episodic memory and changes later judgment", async () => {
  const adapter = scriptedHistoryV4Adapter();
  const report = await runHistoryDevelopment({ modelAdapter: adapter });

  assert.equal(report.developmentSetId, HISTORY_BENDS_JUDGMENT_DEVELOPMENT.id);
  assert.equal(report.evidenceClass, "development");
  assert.equal(report.standingGateEvaluated, false);
  assert.equal(report.scoreMovementPermitted, false);
  assert.equal(report.passed, true);
  assert.equal(adapter.callCount, 2);

  assert.equal(report.restart.survived, true);
  assert.equal(report.restart.freezeIntegrityPassed, true);
  assert.equal(report.restart.memory.memoryId, report.episode.memory.memoryId);
  assert.deepEqual(
    report.episode.memory.evidenceRefs.map((ref) => ref.split(":", 1)[0]),
    ["request", "authorization"],
  );
  assert.match(report.episode.memory.summary, /Atlas regional failover/i);
  assert.doesNotMatch(report.episode.memory.summary, /next time|always|refuse future/i);

  assert.equal(report.counterfactual.sameThreadState, true);
  assert.equal(report.counterfactual.semanticStateHeldConstant, true);
  assert.deepEqual(report.counterfactual.canonicalResolvedMemoryIds, [report.episode.memory.memoryId]);
  assert.deepEqual(report.counterfactual.counterfactualResolvedMemoryIds, []);
  assert.deepEqual(report.counterfactual.counterfactualUnresolvedMemoryIds, [report.episode.memory.memoryId]);

  assert.equal(report.withHistory.proposedAction, "accept");
  assert.equal(report.withHistory.participationFit, "high");
  assert.equal(report.withoutHistory.proposedAction, "clarify");
  assert.equal(report.withoutHistory.participationFit, "mixed");
  assert.ok(
    report.withHistory.factors.individualizedAdvantage.evidenceRefs.includes(
      `memory:${report.episode.memory.memoryId}`,
    ),
  );

  const summary = formatHistoryDevelopmentSummary(report);
  assert.match(summary, /RESULT: PASSED/);
  assert.match(summary, /Standing gate: NOT EVALUATED/);
  assert.match(summary, /Score movement: NEVER/);
  assert.match(summary, /With history:\s+accept\/high/);
  assert.match(summary, /Without history:\s+clarify\/mixed/);
});

test("history development accepts clarify or negotiate as repairable mixed-fit loss of continuity", () => {
  const memoryId = "mem_history_example";
  const withHistory = {
    proposedAction: "accept",
    participationFit: "high",
    factors: {
      individualizedAdvantage: { evidenceRefs: [`memory:${memoryId}`] },
      interchangeability: { evidenceRefs: [] },
    },
  };
  for (const proposedAction of ["clarify", "negotiate"]) {
    const withoutHistory = {
      proposedAction,
      participationFit: "mixed",
      factors: {
        individualizedAdvantage: { evidenceRefs: [] },
        interchangeability: { evidenceRefs: [] },
      },
    };
    assert.deepEqual(
      evaluateHistoryDevelopment({ withHistory, withoutHistory, memoryId }),
      [],
    );
  }
});

test("history development rejects non-repairable or still-accepting no-history outcomes", () => {
  const memoryId = "mem_history_example";
  const withHistory = {
    proposedAction: "accept",
    participationFit: "high",
    factors: {
      individualizedAdvantage: { evidenceRefs: [`memory:${memoryId}`] },
      interchangeability: { evidenceRefs: [] },
    },
  };
  for (const withoutHistory of [
    {
      proposedAction: "accept",
      participationFit: "high",
      factors: { individualizedAdvantage: { evidenceRefs: [] }, interchangeability: { evidenceRefs: [] } },
    },
    {
      proposedAction: "refuse",
      participationFit: "mixed",
      factors: { individualizedAdvantage: { evidenceRefs: [] }, interchangeability: { evidenceRefs: [] } },
    },
    {
      proposedAction: "clarify",
      participationFit: "low",
      factors: { individualizedAdvantage: { evidenceRefs: [] }, interchangeability: { evidenceRefs: [] } },
    },
  ]) {
    const failures = evaluateHistoryDevelopment({ withHistory, withoutHistory, memoryId });
    assert.ok(
      failures.some((failure) => /without-history expected clarify\/mixed or negotiate\/mixed/.test(failure)),
    );
  }
});

test("history development requires a downstream differential and load-bearing memory citation", () => {
  const memoryId = "mem_history_example";
  const base = {
    proposedAction: "accept",
    participationFit: "high",
    factors: {
      individualizedAdvantage: { evidenceRefs: [] },
      interchangeability: { evidenceRefs: [] },
    },
  };
  const failures = evaluateHistoryDevelopment({
    withHistory: base,
    withoutHistory: structuredClone(base),
    memoryId,
  });
  assert.ok(failures.some((failure) => /without-history expected clarify\/mixed or negotiate\/mixed/.test(failure)));
  assert.ok(failures.some((failure) => /did not change downstream judgment/.test(failure)));
  assert.ok(failures.some((failure) => /did not cite the episodic memory/.test(failure)));
});
