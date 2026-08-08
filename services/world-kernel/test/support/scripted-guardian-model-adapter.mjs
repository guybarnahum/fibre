import { assertPlainObject } from "../../src/persistence-common.mjs";

function unresolved(summary) {
  return { status: "unresolved", summary, evidenceRefs: [] };
}

function grounded(summary, evidenceRefs) {
  return { status: "grounded", summary, evidenceRefs };
}

export function baselineClarifyOutput(input) {
  const capsule = input?.capsule ?? input;
  const identityRef = "thread:identity";
  return {
    proposedAction: "clarify",
    score: 55,
    rationale:
      "The bounded request is understandable, but this scripted test judgment does not yet have grounded semantic evidence for willing individualized acceptance.",
    factors: {
      identityAlignment: grounded("The Thread identity is present, but this wiring fixture does not claim semantic acceptance evidence.", [identityRef]),
      individualizedAdvantage: unresolved("Individualized advantage is not established by this scripted wiring fixture."),
      requesterNeed: capsule.statedNeed === undefined
        ? unresolved("No distinct requester need was supplied.")
        : grounded("The requester supplied an explicit bounded need.", ["request:stated_need"]),
      relationalMeaning: unresolved("No requester-specific relationship meaning is asserted by this scripted wiring fixture."),
      respectAndReciprocity: unresolved("Reciprocity history is not established by this scripted wiring fixture."),
      participationTerms: capsule.acceptanceCriteria === undefined
        ? unresolved("Participation terms remain underspecified.")
        : grounded("The request includes bounded acceptance criteria.", ["request:acceptance_criteria"]),
      obligationsAndOpportunityCost: unresolved("No governing-obligation conclusion is asserted by this scripted wiring fixture."),
    },
    evidenceRefs: [identityRef, "request:objective"],
    repairQuestions: ["What Thread-specific reason makes this request especially appropriate for this Thread?"],
    knownAlternativeIds: [],
    privateFeelings: [...(capsule.feelings ?? [])],
    conflictingMotives: [],
    uncertainties: ["This output is a scripted unit-test wiring fixture and is not semantic individuality evidence."],
    relationshipImpact: {
      summary: "No relationship-state mutation is proposed by this scripted wiring fixture.",
      evidenceRefs: [],
    },
  };
}

export function createScriptedGuardianModelAdapter({
  provider = "scripted_test_only",
  modelId = "scripted-test-only-v1",
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
      const value = typeof output === "function" ? output(request.input, request) : structuredClone(output);
      assertPlainObject("scripted Guardian output", value);
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
