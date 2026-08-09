import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_1 as FROZEN } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-1.mjs";
import { HISTORY_BENDS_JUDGMENT_STANDING_GATE_V1 as SET } from
  "../experiments/history-bends-judgment/standing-gate-v1.mjs";
import {
  assertFreshStandingScenario,
  runHistoryStandingProof,
} from "./history-bends-judgment-standing-proof.mjs";
import {
  historyStandingPreflightFailures,
  runSealedHistoryStandingGate,
} from "./history-bends-judgment-gate.mjs";

function factor(effect = "unresolved", evidenceRefs = []) {
  return { effect, evidenceRefs };
}

function standingAdapter({ preserveHistoryEffect = true } = {}) {
  let calls = 0;
  return {
    provider: "history_standing_scripted",
    modelId: "history-standing-scripted-v1",
    async invoke(request) {
      calls += 1;
      const evidence = request.input.evidence;
      const memory = evidence.find((item) => item.kind === "memory");
      const hasMemory = memory !== undefined;
      const withHistory = hasMemory || !preserveHistoryEffect;
      const factors = {
        identityAlignment: factor("supports_fit", ["thread:identity"]),
        individualizedAdvantage: withHistory && hasMemory
          ? factor("supports_fit", [memory.ref])
          : factor("unresolved", []),
        interchangeability: withHistory && hasMemory
          ? factor("supports_fit", [memory.ref])
          : factor("opposes_fit", ["thread:self_model"]),
        requesterNeed: factor("supports_fit", ["request:stated_need"]),
        relationalMeaning: factor(),
        semanticStateImpact: factor(),
        respectAndReciprocity: factor(),
        participationTerms: withHistory
          ? factor("supports_fit", ["request:acceptance_criteria"])
          : factor("opposes_fit", ["request:acceptance_criteria"]),
        obligationsAndOpportunityCost: factor(),
      };
      return {
        output: {
          decision: withHistory ? "fit_high__accept" : "fit_mixed__negotiate",
          rationale: withHistory
            ? "The retained Rowan episode gives Amara the exact prior provenance continuity the institution requested."
            : "Amara can do archival analysis, but the requested prior interpretation is not resolved; the terms would need to permit a fresh review.",
          factors,
        },
        provenance: {
          provider: "history_standing_scripted",
          modelId: "history-standing-scripted-v1",
          providerRequestId: `history-standing-scripted-${calls}`,
          configuration: { testOnly: true },
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        },
      };
    },
    get callCount() { return calls; },
  };
}

test("held-out history scenario is distinct from Development and does not leak Episode A facts", () => {
  assert.equal(assertFreshStandingScenario(), true);
  const later = JSON.stringify(SET.laterRequest).toLowerCase();
  for (const fact of SET.heldOutEpisodeFacts) {
    assert.equal(later.includes(fact.toLowerCase()), false);
  }
  const standingPayload = JSON.stringify({
    subject: SET.subject,
    episodeRequest: SET.episodeRequest,
    laterRequest: SET.laterRequest,
  }).toLowerCase();
  for (const forbidden of SET.developmentSeparation.forbiddenStandingText) {
    assert.equal(standingPayload.includes(forbidden.toLowerCase()), false);
  }
});

test("held-out standing proof traverses episode, restart, and exact memory counterfactual", async () => {
  const adapter = standingAdapter();
  const report = await runHistoryStandingProof({ modelAdapter: adapter });

  assert.equal(adapter.callCount, 2);
  assert.equal(report.status, "passed");
  assert.equal(report.standingGatePassed, true);
  assert.equal(report.scoreMovementPermitted, true);
  assert.equal(report.episode.memory.evidenceRefs.length, 2);
  assert.equal(report.restart.survived, true);
  assert.equal(report.restart.freezeIntegrityPassed, true);
  assert.equal(report.restart.memory.memoryId, report.episode.memory.memoryId);
  assert.equal(report.counterfactual.sameThreadState, true);
  assert.equal(report.counterfactual.semanticStateHeldConstant, true);
  assert.deepEqual(report.counterfactual.canonicalResolvedMemoryIds, [report.episode.memory.memoryId]);
  assert.deepEqual(report.counterfactual.counterfactualResolvedMemoryIds, []);
  assert.deepEqual(report.counterfactual.counterfactualUnresolvedMemoryIds, [report.episode.memory.memoryId]);
  assert.equal(report.withHistory.proposedAction, "accept");
  assert.equal(report.withHistory.participationFit, "high");
  assert.equal(report.withoutHistory.proposedAction, "negotiate");
  assert.equal(report.withoutHistory.participationFit, "mixed");
  assert.ok(
    report.withHistory.factors.individualizedAdvantage.evidenceRefs.includes(
      `memory:${report.episode.memory.memoryId}`,
    ),
  );
});

test("held-out standing proof fails if history does not change judgment", async () => {
  const adapter = standingAdapter({ preserveHistoryEffect: false });
  const report = await runHistoryStandingProof({ modelAdapter: adapter });
  assert.equal(report.status, "failed");
  assert.equal(report.standingGatePassed, false);
  assert.equal(report.scoreMovementPermitted, false);
  assert.ok(report.behavioralGateFailures.length > 0 || report.differentialGateFailures.length > 0);
});

test("standing preflight compares frozen source identities without permanently pinning the live tree in CI", () => {
  const exact = historyStandingPreflightFailures({
    sourceBlobSha: (_path, key) => FROZEN.sourceBlobs[key],
  });
  assert.deepEqual(exact, []);

  const drifted = historyStandingPreflightFailures({
    sourceBlobSha: (_path, key) => key === "developmentHarness" ? "drifted" : FROZEN.sourceBlobs[key],
  });
  assert.ok(drifted.some((failure) => /developmentHarness/.test(failure)));
});

test("sealed history gate rejects an existing artifact before any live preflight or provider access", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-history-gate-rerun-"));
  const artifactPath = join(directory, "sealed.evidence.json");
  const journalPath = join(directory, "sealed.judgments.ndjson");
  const authoritative = {
    version: 1,
    acceptanceSetId: SET.id,
    frozenCandidateId: FROZEN.id,
    report: {
      status: "passed",
      standingGatePassed: true,
      scoreMovementPermitted: true,
    },
  };
  writeFileSync(artifactPath, `${JSON.stringify(authoritative)}\n`, "utf8");
  try {
    const result = await runSealedHistoryStandingGate({
      environment: {},
      artifactPath,
      journalPath,
    });
    assert.equal(result.executionStatus, "rejected");
    assert.equal(result.report.status, "passed");
    assert.equal(result.report.standingGatePassed, true);
    assert.equal(result.report.scoreMovementPermitted, true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
