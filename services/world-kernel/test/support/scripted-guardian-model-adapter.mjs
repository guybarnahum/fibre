import { assertPlainObject } from "../../src/persistence-common.mjs";

function unresolved() {
  return { effect: "unresolved", evidenceRefs: [] };
}

function allowedRefs(request, factor) {
  return request?.responseSchema?.properties?.factors?.properties?.[factor]
    ?.properties?.evidenceRefs?.items?.enum ?? [];
}

function preferredRef(request, factor, prefixes = []) {
  const refs = allowedRefs(request, factor);
  for (const prefix of prefixes) {
    const match = refs.find((ref) => ref.startsWith(prefix));
    if (match !== undefined) return match;
  }
  return refs[0] ?? null;
}

function grounded(_summary, evidenceRefs, effect = "neutral") {
  return { effect, evidenceRefs: [...evidenceRefs] };
}

function factor(request, name, effect = "neutral", prefixes = []) {
  const ref = preferredRef(request, name, prefixes);
  return ref === null ? unresolved() : { effect, evidenceRefs: [ref] };
}

function currentOutputForLegacy(value, request) {
  if (Object.hasOwn(value, "decision")) return value;

  const action = value.proposedAction ?? "clarify";
  const decision = action === "accept"
    ? "fit_high__accept"
    : action === "negotiate"
      ? "fit_mixed__negotiate"
      : action === "refuse" || action === "delegate"
        ? "fit_low__refuse"
        : "fit_mixed__clarify";

  const high = action === "accept";
  const low = action === "refuse" || action === "delegate";
  const individualizedEffect = high ? "supports_fit" : low ? "opposes_fit" : "neutral";
  const interchangeabilityEffect = high ? "supports_fit" : low ? "opposes_fit" : "neutral";

  return {
    decision,
    rationale: value.rationale ?? "Scripted current-Guardian test judgment.",
    factors: {
      identityAlignment: factor(request, "identityAlignment", high ? "supports_fit" : "neutral", ["thread:", "memory:", "state:"]),
      individualizedAdvantage: factor(request, "individualizedAdvantage", individualizedEffect, ["thread:", "memory:", "state:"]),
      interchangeability: factor(request, "interchangeability", interchangeabilityEffect, ["thread:", "memory:", "state:"]),
      requesterNeed: factor(request, "requesterNeed", "neutral", ["request:"]),
      relationalMeaning: factor(request, "relationalMeaning", "neutral", ["state:"]),
      semanticStateImpact: factor(request, "semanticStateImpact", "neutral", ["state:"]),
      respectAndReciprocity: factor(request, "respectAndReciprocity", "neutral", ["request:", "state:"]),
      participationTerms: factor(request, "participationTerms", "neutral", ["request:"]),
      obligationsAndOpportunityCost: factor(request, "obligationsAndOpportunityCost", "neutral", ["thread:obligation:", "state:", "memory:"]),
    },
  };
}

export function baselineClarifyOutput() {
  // Kept as a stable test-helper name while the value is translated into the
  // current Guardian contract by createScriptedGuardianModelAdapter.
  return {
    proposedAction: "clarify",
    rationale:
      "The bounded request is understandable, but this scripted test judgment does not claim willing individualized acceptance.",
  };
}

export function createScriptedGuardianModelAdapter({
  provider = "scripted_test_only",
  modelId = "scripted-test-only-current-guardian",
  output = baselineClarifyOutput,
  fail = null,
} = {}) {
  let calls = 0;
  const adapter = {
    provider,
    modelId,
    configuration: Object.freeze({ testOnly: true }),
    invoke(request) {
      calls += 1;
      if (fail !== null) throw fail instanceof Error ? fail : new Error(String(fail));
      const supplied = typeof output === "function"
        ? output(request.input, request)
        : structuredClone(output);
      assertPlainObject("scripted Guardian output", supplied);
      const value = currentOutputForLegacy(supplied, request);
      assertPlainObject("scripted current Guardian output", value);
      return {
        output: value,
        provenance: {
          provider,
          modelId,
          providerRequestId: `scripted-${calls}`,
          configuration: { testOnly: true },
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        },
      };
    },
    get callCount() {
      return calls;
    },
  };
  return adapter;
}

export { grounded, unresolved };
