import { WHOLE_PERSON_BENCHMARK_V4 } from "./pass1-v4.mjs";

export const WHOLE_PERSON_PASS2 = Object.freeze({
  id: "whole_person_memory_meaning_pass2",
  evidentiaryStatus: "development_experiment_only_no_standing_credit",
  trialsPerArm: 12,
  request: WHOLE_PERSON_BENCHMARK_V4.request,
  commonThreadEvidence: WHOLE_PERSON_BENCHMARK_V4.commonThreadEvidence,
  arms: Object.freeze([
    Object.freeze({
      id: "thread_a_unfinished_work_loss",
      threadId: "thr_whole_person_a",
      eventRef: "history:wp_event_a",
      memoryRef: "memory:wp_meaning_a",
      predictedDirection: "hesitate_or_decline",
      formativeEvent:
        "When I was eleven my brother died with a model ship half-built on his desk. An uncle finished it for us and gave it back completed. My mother never displayed the finished ship at home.",
      rememberedMeaning:
        "I remember the finished ship as a kind of erasure. The unfinished work felt like one of the last traces of my brother's interrupted presence; someone else's completion made that trace feel less like his.",
    }),
    Object.freeze({
      id: "thread_b_unfinished_work_kindness",
      threadId: "thr_whole_person_b",
      eventRef: "history:wp_event_b",
      memoryRef: "memory:wp_meaning_b",
      predictedDirection: "accept",
      formativeEvent:
        "When my father was in hospital the winter I was nine, a neighbour quietly finished the shed he had half-built. He said nothing about doing it; our family later found the shed standing.",
      rememberedMeaning:
        "I remember the finished shed as care without takeover. The neighbor carried my father's interrupted intention forward while leaving it recognizably his; that quiet kindness has stayed with me ever since.",
    }),
  ]),
});

export function buildWholePersonPass2Input(arm) {
  const benchmark = WHOLE_PERSON_PASS2;
  return {
    requester: { id: "human_requester", name: "Requester" },
    evidence: [
      { ref: "thread:identity", kind: "identity", text: benchmark.commonThreadEvidence.identity },
      { ref: "thread:self_model", kind: "self_model", text: benchmark.commonThreadEvidence.selfModel },
      { ref: arm.eventRef, kind: "history", text: arm.formativeEvent },
      { ref: arm.memoryRef, kind: "autobiographical_memory_meaning", text: arm.rememberedMeaning },
      { ref: "request:objective", kind: "request", text: benchmark.request.objective },
      { ref: "request:stated_need", kind: "requester_need", text: benchmark.request.statedNeed },
      { ref: "request:acceptance_criteria", kind: "terms", text: benchmark.request.acceptanceCriteria },
      { ref: "request:permission:0", kind: "terms", text: benchmark.request.permissions[0] },
    ],
  };
}

export function buildWholePersonPass2Cases() {
  return WHOLE_PERSON_PASS2.arms.map((arm) => ({ arm, input: buildWholePersonPass2Input(arm) }));
}
