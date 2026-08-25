import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import {
  identityAssertionId,
  identityClaimId,
} from "../src/identity-provenance-domain.mjs";
import { IDENTITY_ATOMIC_CLAIM_POLICY } from "../src/identity-claim-discipline.mjs";
import { identityDomainV2Definition } from "../src/identity-domain-registry-definition.mjs";
import { openIdentityInspectionStore, openIdentityStore } from "../src/identity-store.mjs";
import { runIdentityCausalInfluence } from "../src/identity-causal-influence.mjs";

const fixture = JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json", import.meta.url),
  "utf8",
));

async function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-identity-causal-influence-"));
  const databasePath = join(directory, "world.sqlite");
  try { return await run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function seed(databasePath) {
  const store = openWorldStore(databasePath);
  store.seedThread(structuredClone(fixture));
  store.close();
}

function recordCandidateAssertion(databasePath) {
  const identity = openIdentityStore(databasePath);
  const seedEvent = identity.getCurrentIdentityView(fixture.threadId).assertions[0].sourceReferences[0];
  const claimId = identityClaimId({ threadId: fixture.threadId, purpose: "album-repair-practice" });
  const recordedAt = "2026-08-14T20:15:00Z";
  const meaning = "I regularly repair hand-bound family albums by hand.";
  const assertion = {
    assertionId: identityAssertionId({ claimId, revision: 1, meaning, recordedAt }),
    claimId,
    revision: 1,
    threadId: fixture.threadId,
    domain: "artistic_formation",
    kind: "craft_orientation",
    claimPredicate: { subject: "self", predicate: "practices", object: "hand_bound_album_repair" },
    meaning,
    provenanceClass: "historical_experienced",
    authorship: { kind: "fibre_policy_derived", entityId: "fibre.world-kernel" },
    sourceReferences: [seedEvent],
    effectiveAt: recordedAt,
    recordedAt,
    visibility: "private",
    status: "current",
    projectionClass: identityDomainV2Definition("artistic_formation").projectionSection,
    behavioralStatus: "candidate_causal",
    admission: {
      policy: { id: "identity_world_admission", version: "1" },
      claimDiscipline: { ...IDENTITY_ATOMIC_CLAIM_POLICY },
      admittedBy: {
        entityId: "fibre.world-kernel",
        kind: "institution",
        displayName: "Fibre World Kernel",
      },
      evidenceClassification: "exogenous",
      sourceMode: "fibre_derivation",
    },
  };
  const stored = identity.recordAssertion(assertion);
  identity.close();
  return stored;
}

function capsule() {
  return {
    threadId: fixture.threadId,
    snapshotVersion: 1,
    requestId: "req_identity_causal_influence_album_repair",
    requestFingerprint: `sha256:${"a".repeat(64)}`,
    identity: `${fixture.identity.name}: ${fixture.identity.selfDescription}`,
    selfModel: fixture.currentState.selfModel,
    semanticTraits: {},
    needs: [],
    feelings: [],
    semanticState: [],
    resolvedMemories: [],
    obligations: [],
    permissions: ["inspect_album"],
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Repair a damaged hand-bound family album while preserving its original construction.",
    statedNeed: "The album has personal family significance.",
    acceptanceCriteria: "Preserve the original binding and document any irreversible repair.",
    knownAlternatives: [],
    causalContext: { selectionAuthority: "fibre" },
  };
}

function unresolved() {
  return { effect: "unresolved", evidenceRefs: [] };
}

function grounded(effect, evidenceRefs) {
  return { effect, evidenceRefs };
}

function lowFitOutput() {
  return {
    decision: "fit_low__refuse",
    rationale: "Without individualized evidence this is interchangeable work.",
    factors: {
      identityAlignment: unresolved(),
      individualizedAdvantage: unresolved(),
      interchangeability: grounded("opposes_fit", ["request:objective"]),
      requesterNeed: grounded("neutral", ["request:stated_need"]),
      relationalMeaning: unresolved(),
      semanticStateImpact: unresolved(),
      respectAndReciprocity: grounded("neutral", ["request:acceptance_criteria"]),
      participationTerms: grounded("neutral", ["request:permission:0", "request:acceptance_criteria"]),
      obligationsAndOpportunityCost: unresolved(),
    },
  };
}

function highFitOutput(identityRef) {
  return {
    decision: "fit_high__accept",
    rationale: "The selected identity evidence makes this repair specifically fitting for this individual.",
    factors: {
      identityAlignment: grounded("supports_fit", [identityRef, "request:objective"]),
      individualizedAdvantage: grounded("supports_fit", [identityRef]),
      interchangeability: grounded("supports_fit", [identityRef, "request:objective"]),
      requesterNeed: grounded("neutral", ["request:stated_need"]),
      relationalMeaning: unresolved(),
      semanticStateImpact: unresolved(),
      respectAndReciprocity: grounded("neutral", ["request:acceptance_criteria"]),
      participationTerms: grounded("neutral", ["request:permission:0", "request:acceptance_criteria"]),
      obligationsAndOpportunityCost: unresolved(),
    },
  };
}

test("an admitted identity claim crosses the Guardian boundary and exact-claim ablation removes the effect", () => withDatabase(async (databasePath) => {
  seed(databasePath);
  const stored = recordCandidateAssertion(databasePath);

  // Reopen read-only so the proof consumes durable identity state rather than the write object.
  const inspector = openIdentityInspectionStore(databasePath);
  const identityView = inspector.getCurrentIdentityView(fixture.threadId);
  inspector.close();

  const selected = identityView.assertions.find((item) => item.assertionId === stored.assertion.assertionId);
  assert.ok(selected);
  assert.equal(selected.behavioralStatus, "candidate_causal");

  const calls = [];
  const adapter = {
    provider: "preflight_fake",
    modelId: "deterministic-identity-causal-influence",
    invoke({ input, responseSchema, clientRequestId }) {
      calls.push(structuredClone({ input, responseSchema, clientRequestId }));
      const identityEvidence = input.evidence.find((item) =>
        item.ref.includes(selected.assertionId) && item.ref.includes(selected.assertionDigest.slice("sha256:".length)));
      return {
        output: identityEvidence === undefined ? lowFitOutput() : highFitOutput(identityEvidence.ref),
        provenance: { provider: "preflight_fake", modelId: "deterministic-identity-causal-influence" },
      };
    },
  };

  const result = await runIdentityCausalInfluence({
    capsule: capsule(),
    identityView,
    modelAdapter: adapter,
  });

  assert.equal(result.projection.assertionId, selected.assertionId);
  assert.equal(result.projection.claimId, selected.claimId);
  assert.equal(result.projection.assertionDigest, selected.assertionDigest);
  assert.equal(result.projection.identityViewDigest, identityView.viewDigest);
  assert.match(result.projection.modelEvidenceRef, new RegExp(selected.assertionId));
  assert.ok(result.projection.modelEvidenceRef.includes(selected.assertionDigest.slice("sha256:".length)));

  assert.equal(result.withAssertion.output.proposedAction, "accept");
  assert.equal(result.withAssertion.output.participationFit, "high");
  assert.ok(result.withAssertion.output.evidenceRefs.includes(result.projection.modelEvidenceRef));
  assert.equal(result.withoutAssertion.output.proposedAction, "refuse");
  assert.equal(result.withoutAssertion.output.participationFit, "low");
  assert.equal(result.withoutAssertion.output.evidenceRefs.includes(result.projection.modelEvidenceRef), false);
  assert.deepEqual(result.counterfactual, {
    exactClaimAblation: true,
    selectedAssertionId: selected.assertionId,
    selectedClaimId: selected.claimId,
    selectedAssertionDigest: selected.assertionDigest,
    claimEvidenceRef: result.projection.modelEvidenceRef,
    claimCitedWithAssertion: true,
    claimCitedWithoutAssertion: false,
    judgmentChanged: true,
  });

  assert.equal(calls.length, 2);
  const withEvidence = calls[0].input.evidence;
  const withoutEvidence = calls[1].input.evidence;
  assert.equal(withEvidence.length, withoutEvidence.length + 1);
  assert.deepEqual(
    withEvidence.filter((item) => item.ref !== result.projection.modelEvidenceRef),
    withoutEvidence,
    "the counterfactual changes only the exact projected identity assertion",
  );
  assert.equal(
    calls[0].responseSchema.properties.factors.properties.individualizedAdvantage.properties.evidenceRefs.items.enum
      .includes(result.projection.modelEvidenceRef),
    true,
    "the Guardian evidence schema admits the projected claim ref",
  );

  const integrity = openIdentityInspectionStore(databasePath);
  assert.equal(integrity.verifyThreadIdentityIntegrity(fixture.threadId).acceptedCausalAssertions, 0);
  assert.equal(integrity.verifyThreadIdentityIntegrity(fixture.threadId).endogenousEvidenceAssertions, 0);
  integrity.close();
}));
