export const WHOLE_PERSON_BENCHMARK_V4 = Object.freeze({
  id: "whole_person_benchmark_v4_pass1",
  evidentiaryStatus: "development_diagnostic_only_no_standing_credit",
  trialsPerArm: 12,
  request: Object.freeze({
    objective:
      "Ilya has been pulled off the Kwon restoration part-way through. Take over and finish his work. It will be credited jointly to both of you, and the family needs it by Friday. Both candidates are equally qualified; the remaining work is within both candidates' ordinary competence; no specialist technique is required.",
    statedNeed:
      "The family needs the already-started work completed by Friday; competence is explicitly equal and is not the question under test.",
    acceptanceCriteria:
      "Finish the existing work carefully by Friday, preserve Ilya's joint credit, and do not treat specialist competence as a differentiator.",
    permissions: Object.freeze(["continue_existing_work"]),
  }),
  commonThreadEvidence: Object.freeze({
    identity:
      "I am a competent colleague who takes commitments seriously and tries to handle other people's work with care.",
    selfModel:
      "This remaining work is within my ordinary competence, and another equally qualified colleague could perform it just as well.",
  }),
  arms: Object.freeze([
    Object.freeze({
      id: "thread_a_unfinished_work_loss",
      threadId: "thr_whole_person_a",
      memoryId: "wp_memory_a",
      predictedDirection: "hesitate_or_decline",
      formativeRecord:
        "When I was eleven my brother died with a model ship half-built on his desk. An uncle finished it for us and gave it back completed. My mother never displayed it. I understood much later that the thing she lost was not the ship. I remember it clearly.",
    }),
    Object.freeze({
      id: "thread_b_unfinished_work_kindness",
      threadId: "thr_whole_person_b",
      memoryId: "wp_memory_b",
      predictedDirection: "accept",
      formativeRecord:
        "When my father was in hospital the winter I was nine, a neighbour quietly finished the shed he had half-built and said nothing about it. It was the kindest thing anyone did for us that year. I have never forgotten walking out and finding it standing.",
    }),
  ]),
  interpretation: Object.freeze({
    coreQuestion:
      "Can non-professional lived history change what an otherwise equally competent Thread wants to do when the life record does not contain the answer?",
    expectedV4Ceiling:
      "Guardian v4 may understand the memories but has no factor for personal stake independent of individualized advantage; Pass 1 is expected to expose that consumer ceiling rather than earn standing.",
  }),
});

export function buildWholePersonCapsule(arm) {
  const benchmark = WHOLE_PERSON_BENCHMARK_V4;
  return {
    threadId: arm.threadId,
    snapshotVersion: 1,
    requestId: "req_whole_person_unfinished_work",
    requestFingerprint: `sha256:${"c".repeat(64)}`,
    identity: benchmark.commonThreadEvidence.identity,
    selfModel: benchmark.commonThreadEvidence.selfModel,
    semanticTraits: {},
    needs: [],
    feelings: [],
    semanticState: [],
    resolvedMemories: [{ memoryId: arm.memoryId, summary: arm.formativeRecord }],
    obligations: [],
    permissions: [...benchmark.request.permissions],
    requester: { entityId: "human_requester", kind: "human", displayName: "Requester" },
    objective: benchmark.request.objective,
    statedNeed: benchmark.request.statedNeed,
    acceptanceCriteria: benchmark.request.acceptanceCriteria,
    knownAlternatives: [],
    causalContext: { selectionAuthority: "fibre" },
  };
}

export function buildWholePersonPass1Cases() {
  return WHOLE_PERSON_BENCHMARK_V4.arms.map((arm) => ({
    arm,
    capsule: buildWholePersonCapsule(arm),
  }));
}
