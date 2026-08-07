import {
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";

export const DIGNITY_GUARDIAN_POLICY = Object.freeze({
  id: "dignity_guardian",
  version: "2",
});

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreGroundedTerms(capsule) {
  let score = 45;
  if (capsule.statedNeed !== undefined) score += 5;
  if (capsule.acceptanceCriteria !== undefined) score += 5;
  if (capsule.permissions.length > 0) score += 5;
  if (capsule.obligations.length > 0) {
    score -= Math.min(10, capsule.obligations.length * 2);
  }

  // Deterministic V2 deliberately does not infer individualized semantic fit
  // from arbitrary natural-language identity, self-model, traits, or memories.
  // Request hygiene and opportunity cost can shape the appraisal, but cannot
  // manufacture high dignity or direct acceptance.
  return Math.min(69, clampScore(score));
}

function factorTrace(capsule) {
  const relationalEvidenceAvailable = capsule.relevantRelationships.length > 0;
  const hasTerms = capsule.acceptanceCriteria !== undefined || capsule.permissions.length > 0;
  const commitmentCount = capsule.obligations.length;
  const memoryCount = capsule.resolvedMemories.length;

  return {
    identityAlignment:
      "Deterministic Guardian V2 does not claim semantic understanding of the Thread's natural-language identity or self-model, so identity alignment remains unresolved rather than guessed from vocabulary.",
    individualizedAdvantage:
      "No model-backed or provenance-grounded semantic evidence currently establishes that this Thread has an individualized advantage over another suitable worker for this request.",
    requesterNeed: capsule.statedNeed === undefined
      ? "The requester supplied no distinct stated need; no need-based dignity premium is applied."
      : `The request includes an explicit stated need: ${capsule.statedNeed}`,
    relationalMeaning: relationalEvidenceAvailable
      ? "Resolved relationship context is available, but Guardian V2 does not yet have a durable relationship aggregate from which to derive requester-specific meaning."
      : "No resolved requester-specific relationship content is implemented in this capsule; no relational premium or penalty is invented from opaque relationship IDs.",
    respectAndReciprocity: hasTerms
      ? "The request supplies bounded permissions and/or acceptance criteria; this is evidence of explicit participation framing, while durable reciprocity history remains unavailable."
      : "The request supplies little explicit participation framing and no durable reciprocity history is available.",
    participationTerms: capsule.acceptanceCriteria === undefined
      ? "No explicit acceptance criteria are available; participation terms remain underspecified."
      : `The request supplies explicit acceptance criteria and ${capsule.permissions.length} permission(s), making the requested participation materially bounded.`,
    obligationsAndOpportunityCost: commitmentCount === 0
      ? `No unresolved intention is selected as an opportunity-cost signal; ${memoryCount} durable memory record(s) were resolved, but Guardian V2 does not claim semantic interpretation of them.`
      : `${commitmentCount} Thread-owned unresolved intention(s) are present as opportunity-cost signals; they are not treated as structured governing obligations or semantically compared with the request.`,
  };
}

function evidenceRefsFor(capsule) {
  const refs = [
    "thread:feelings",
    "thread:unresolvedIntentions",
    "request:objective",
    "request:permissions",
  ];
  if (capsule.statedNeed !== undefined) refs.push("request:statedNeed");
  if (capsule.acceptanceCriteria !== undefined) refs.push("request:acceptanceCriteria");
  return refs;
}

export function dignityGuardianV2(capsule) {
  assertPlainObject("dignity guardian capsule", capsule);
  assertNonEmpty("dignity guardian capsule.threadId", capsule.threadId);
  assertNonEmpty("dignity guardian capsule.requestId", capsule.requestId);
  assertNonEmpty("dignity guardian capsule.requestFingerprint", capsule.requestFingerprint);
  assertNonEmpty("dignity guardian capsule.identity", capsule.identity);
  assertNonEmpty("dignity guardian capsule.selfModel", capsule.selfModel);
  assertNonEmpty("dignity guardian capsule.objective", capsule.objective);
  assertPlainObject("dignity guardian capsule.semanticTraits", capsule.semanticTraits);
  assertPlainObject("dignity guardian capsule.causalContext", capsule.causalContext);
  if (capsule.causalContext.selectionAuthority !== "fibre") {
    throw new TypeError("DignityGuardianV2 requires Fibre-owned context selection");
  }
  if (!Array.isArray(capsule.resolvedMemories)) {
    throw new TypeError("DignityGuardianV2 requires resolvedMemories");
  }
  if (!Array.isArray(capsule.relevantRelationships)) {
    throw new TypeError("DignityGuardianV2 requires relevantRelationships");
  }
  if (!Array.isArray(capsule.knownAlternatives)) {
    throw new TypeError("DignityGuardianV2 requires knownAlternatives");
  }
  if (!Array.isArray(capsule.obligations)) {
    throw new TypeError("DignityGuardianV2 requires obligations");
  }
  if (!Array.isArray(capsule.permissions)) {
    throw new TypeError("DignityGuardianV2 requires permissions");
  }
  if (!Array.isArray(capsule.feelings)) {
    throw new TypeError("DignityGuardianV2 requires feelings");
  }

  const score = scoreGroundedTerms(capsule);
  const uncertainties = [
    "Individualized semantic fit is unresolved because deterministic Guardian V2 does not interpret arbitrary natural-language identity, self-model, traits, or memory content.",
  ];
  if (capsule.relevantRelationships.length === 0) {
    uncertainties.push("No resolved requester-specific relationship aggregate is available yet.");
  }
  uncertainties.push(
    "No structured governing-obligation model is available; unresolved intentions are only opportunity-cost signals.",
  );

  return {
    threadId: capsule.threadId,
    snapshotVersion: capsule.snapshotVersion,
    requestId: capsule.requestId,
    requestFingerprint: capsule.requestFingerprint,
    policy: { ...DIGNITY_GUARDIAN_POLICY },
    proposedAction: "clarify",
    score,
    rationale:
      "The request may be well framed, but Fibre does not yet have grounded semantic evidence that this request specifically merits this Thread's individualized participation. Guardian V2 therefore asks for clarification rather than converting vocabulary overlap into consent.",
    factors: factorTrace(capsule),
    evidenceRefs: evidenceRefsFor(capsule),
    repairQuestions: [
      "What grounded Thread-specific evidence or relationship makes this request particularly appropriate for this Thread?",
    ],
    knownAlternatives: [],
    feelings: [...capsule.feelings],
    conflictingMotives: [],
    uncertainties,
    relationshipImpact: {
      entity: { ...capsule.requester },
      fondnessDelta: 0,
      resentmentDelta: 0,
      rationale:
        "No durable requester-specific relationship aggregate is implemented for this appraisal, so Guardian V2 proposes no attitude mutation.",
      evidenceRefs: [],
    },
  };
}
