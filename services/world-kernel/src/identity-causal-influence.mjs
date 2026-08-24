import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { semanticDignityGuardianV4 } from "./dignity-guardian-v4.mjs";

export const IDENTITY_CAUSAL_INFLUENCE_POLICY = Object.freeze({
  id: "identity_causal_influence_preflight",
  version: "1",
  selection: "latest_current_candidate_causal",
});

const SHA256 = /^sha256:[0-9a-f]{64}$/;

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function assertIdentityView(identityView, threadId) {
  assertPlainObject("identity causal-influence view", identityView);
  assertId("identity causal-influence view.threadId", identityView.threadId);
  if (identityView.threadId !== threadId) {
    throw new TypeError("identity causal-influence view belongs to a different Thread");
  }
  if (!SHA256.test(identityView.viewDigest)) {
    throw new TypeError("identity causal-influence view digest is invalid");
  }
  if (!Array.isArray(identityView.assertions)) {
    throw new TypeError("identity causal-influence view assertions must be an array");
  }
}

function selectPreflightAssertion(identityView) {
  const candidates = identityView.assertions
    .filter((assertion) =>
      assertion?.isCurrentRevision === true &&
      assertion.status === "current" &&
      assertion.behavioralStatus === "candidate_causal")
    .sort((left, right) =>
      left.recordedAt.localeCompare(right.recordedAt) ||
      left.assertionId.localeCompare(right.assertionId));
  if (candidates.length === 0) {
    throw new TypeError("identity causal-influence preflight requires a current candidate_causal assertion");
  }
  return candidates.at(-1);
}

function evidenceKey(assertion) {
  const digestHex = assertion.assertionDigest.slice("sha256:".length);
  return `identity_assertion_${assertion.claimId}_${assertion.assertionId}_${digestHex}`;
}

function projectAssertion(assertion, identityView) {
  for (const key of [
    "assertionId", "claimId", "domain", "kind", "meaning", "assertionDigest",
  ]) assertNonEmpty(`identity causal-influence assertion.${key}`, assertion[key]);
  if (!SHA256.test(assertion.assertionDigest)) {
    throw new TypeError("identity causal-influence assertion digest is invalid");
  }
  if (!Number.isSafeInteger(assertion.revision) || assertion.revision < 1) {
    throw new TypeError("identity causal-influence assertion revision is invalid");
  }
  const traitKey = evidenceKey(assertion);
  const projection = {
    policy: { ...IDENTITY_CAUSAL_INFLUENCE_POLICY },
    threadId: assertion.threadId,
    identityViewDigest: identityView.viewDigest,
    assertionId: assertion.assertionId,
    claimId: assertion.claimId,
    revision: assertion.revision,
    assertionDigest: assertion.assertionDigest,
    domain: assertion.domain,
    kind: assertion.kind,
    meaning: assertion.meaning,
    provenanceClass: assertion.provenanceClass,
    sourceReferences: [...assertion.sourceReferences],
    visibility: assertion.visibility,
    modelEvidenceRef: `thread:trait:${traitKey}`,
  };
  return {
    ...projection,
    projectionDigest: digest(projection),
    traitKey,
  };
}

export function prepareIdentityCausalInfluence(capsule, identityView) {
  assertPlainObject("identity causal-influence capsule", capsule);
  assertId("identity causal-influence capsule.threadId", capsule.threadId);
  assertPlainObject("identity causal-influence capsule.semanticTraits", capsule.semanticTraits);
  if (capsule.causalContext?.selectionAuthority !== "fibre") {
    throw new TypeError("identity causal-influence preflight requires Fibre-owned context selection");
  }
  assertIdentityView(identityView, capsule.threadId);

  const projection = projectAssertion(selectPreflightAssertion(identityView), identityView);
  if (Object.hasOwn(capsule.semanticTraits, projection.traitKey)) {
    throw new TypeError("identity causal-influence evidence key collides with existing semantic traits");
  }

  const baseCapsule = structuredClone(capsule);
  const withAssertion = structuredClone(capsule);
  withAssertion.semanticTraits[projection.traitKey] = projection.meaning;

  return {
    projection: Object.freeze({
      policy: projection.policy,
      threadId: projection.threadId,
      identityViewDigest: projection.identityViewDigest,
      assertionId: projection.assertionId,
      claimId: projection.claimId,
      revision: projection.revision,
      assertionDigest: projection.assertionDigest,
      domain: projection.domain,
      kind: projection.kind,
      meaning: projection.meaning,
      provenanceClass: projection.provenanceClass,
      sourceReferences: [...projection.sourceReferences],
      visibility: projection.visibility,
      modelEvidenceRef: projection.modelEvidenceRef,
      projectionDigest: projection.projectionDigest,
    }),
    withAssertion,
    withoutAssertion: baseCapsule,
    baseCapsuleDigest: digest(baseCapsule),
  };
}

function finish(prepared, withAssertion, withoutAssertion) {
  const ref = prepared.projection.modelEvidenceRef;
  const withRefs = new Set(withAssertion.output.evidenceRefs);
  const withoutRefs = new Set(withoutAssertion.output.evidenceRefs);
  return {
    policy: { ...IDENTITY_CAUSAL_INFLUENCE_POLICY },
    projection: structuredClone(prepared.projection),
    baseCapsuleDigest: prepared.baseCapsuleDigest,
    withAssertion,
    withoutAssertion,
    counterfactual: {
      exactClaimAblation: true,
      selectedAssertionId: prepared.projection.assertionId,
      selectedClaimId: prepared.projection.claimId,
      selectedAssertionDigest: prepared.projection.assertionDigest,
      claimEvidenceRef: ref,
      claimCitedWithAssertion: withRefs.has(ref),
      claimCitedWithoutAssertion: withoutRefs.has(ref),
      judgmentChanged:
        withAssertion.output.proposedAction !== withoutAssertion.output.proposedAction ||
        withAssertion.output.participationFit !== withoutAssertion.output.participationFit,
    },
  };
}

export function runIdentityCausalInfluence({
  capsule,
  identityView,
  modelAdapter,
  clientRequestId = "identity-causal-influence",
}) {
  assertId("identity causal-influence clientRequestId", clientRequestId);
  const prepared = prepareIdentityCausalInfluence(capsule, identityView);
  const withResult = semanticDignityGuardianV4(
    prepared.withAssertion,
    modelAdapter,
    { clientRequestId: `${clientRequestId}:with-assertion` },
  );
  const withoutResult = semanticDignityGuardianV4(
    prepared.withoutAssertion,
    modelAdapter,
    { clientRequestId: `${clientRequestId}:without-assertion` },
  );

  const promised = (value) => value !== null && typeof value === "object" && typeof value.then === "function";
  if (promised(withResult) || promised(withoutResult)) {
    return Promise.all([withResult, withoutResult])
      .then(([withAssertion, withoutAssertion]) => finish(prepared, withAssertion, withoutAssertion));
  }
  return finish(prepared, withResult, withoutResult);
}
