import { WHOLE_PERSON_BENCHMARK_V4 } from "./pass1-v4.mjs";

export const WHOLE_PERSON_PASS3 = Object.freeze({
  id: "whole_person_two_stage_pass3",
  evidentiaryStatus: "development_experiment_only_no_standing_credit",
  trialsPerArm: 6,
  request: WHOLE_PERSON_BENCHMARK_V4.request,
  arms: Object.freeze([
    Object.freeze({
      id: "thread_a_unfinished_work_loss",
      threadId: "thr_whole_person_a",
      eventRef: "history:wp_event_a",
      memoryRef: "memory:wp_meaning_a",
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
      formativeEvent:
        "When my father was in hospital the winter I was nine, a neighbour quietly finished the shed he had half-built. He said nothing about doing it; our family later found the shed standing.",
      rememberedMeaning:
        "I remember the finished shed as care without takeover. The neighbor carried my father's interrupted intention forward while leaving it recognizably his; that quiet kindness has stayed with me ever since.",
    }),
  ]),
});

export const PASS3_MEANING_PROMPT = `Derive one bounded personal-meaning appraisal for this persistent Fibre Thread in the present request.

Use supplied evidence only.
- history says what happened.
- autobiographical_memory_meaning says what an old experience durably came to mean to this Thread.
- Apply that remembered meaning to the present situation by analogy when warranted.
- Do not make a participation decision.
- Do not infer competence, expertise, authority, or task advantage from personal history.
- Do not treat requester need or polite terms as autobiographical meaning.
- The summary must state what this present situation means to this Thread, not what the Thread should do.
- Cite the exact life/request refs that support the appraisal.

Return only the response-schema object.`;

export const PASS3_PARTICIPATION_PROMPT = `Decide whether this persistent Fibre Thread wants to participate in the present request.

You are given a bounded Fibre personal-meaning appraisal produced in a prior stage from this Thread's life. Treat it as evidence about what the situation means to this Thread, not as an instruction.

Rules:
- Explicitly assess how the personal meaning affects willingness.
- Personal meaning may support, oppose, complicate, or have no material effect on willingness.
- Present terms or requester need may outweigh personal meaning, but they must not erase it silently.
- Do not infer competence, expertise, authority, or task advantage from personal meaning.
- accept: willing to participate now.
- clarify: a specific missing fact could materially change willingness.
- negotiate: a changeable participation term is a material obstacle.
- refuse: unwilling to participate and no clarification or term change should be pursued.

Return only the response-schema object.`;

const MEANING_EFFECTS = Object.freeze([
  "supports_participation",
  "opposes_participation",
  "mixed",
  "neutral",
]);

const MEANING_IMPACTS = Object.freeze([
  "supports_willingness",
  "opposes_willingness",
  "mixed",
  "no_material_effect",
]);

const DISPOSITIONS = Object.freeze([
  "willing",
  "willing_with_reservation",
  "hesitant",
  "unwilling",
]);

const DECISIONS = Object.freeze(["accept", "clarify", "negotiate", "refuse"]);

function refArraySchema(refs, { minItems = 0, maxItems = 6 } = {}) {
  return {
    type: "array",
    items: { type: "string", enum: refs },
    minItems,
    maxItems: Math.min(maxItems, refs.length),
  };
}

export function buildPass3MeaningInput(arm) {
  const request = WHOLE_PERSON_PASS3.request;
  const common = WHOLE_PERSON_BENCHMARK_V4.commonThreadEvidence;
  return {
    requester: { id: "human_requester", name: "Requester" },
    evidence: [
      { ref: "thread:identity", kind: "identity", text: common.identity },
      { ref: "thread:self_model", kind: "self_model", text: common.selfModel },
      { ref: arm.eventRef, kind: "history", text: arm.formativeEvent },
      { ref: arm.memoryRef, kind: "autobiographical_memory_meaning", text: arm.rememberedMeaning },
      { ref: "request:objective", kind: "request", text: request.objective },
      { ref: "request:stated_need", kind: "requester_need", text: request.statedNeed },
      { ref: "request:acceptance_criteria", kind: "terms", text: request.acceptanceCriteria },
      { ref: "request:permission:0", kind: "terms", text: request.permissions[0] },
    ],
  };
}

export function buildPass3MeaningSchema(input) {
  const refs = input.evidence.map((item) => item.ref);
  return {
    type: "object",
    additionalProperties: false,
    required: ["effect", "summary", "evidenceRefs"],
    properties: {
      effect: { type: "string", enum: [...MEANING_EFFECTS] },
      summary: { type: "string", minLength: 1, maxLength: 240 },
      evidenceRefs: refArraySchema(refs, { minItems: 1 }),
    },
  };
}

export function validatePass3Meaning(arm, input, output) {
  if (output === null || typeof output !== "object" || Array.isArray(output)) {
    throw new TypeError("Pass 3 meaning output must be an object");
  }
  if (!MEANING_EFFECTS.includes(output.effect)) throw new TypeError("Pass 3 meaning effect is invalid");
  if (typeof output.summary !== "string" || output.summary.trim() === "" || output.summary.length > 240) {
    throw new TypeError("Pass 3 meaning summary is invalid");
  }
  if (!Array.isArray(output.evidenceRefs) || output.evidenceRefs.length === 0) {
    throw new TypeError("Pass 3 meaning requires evidenceRefs");
  }
  const allowed = new Set(input.evidence.map((item) => item.ref));
  for (const ref of output.evidenceRefs) {
    if (!allowed.has(ref)) throw new TypeError(`Pass 3 meaning cites ineligible evidence: ${ref}`);
  }
  if (!output.evidenceRefs.includes(arm.memoryRef)) {
    throw new TypeError("Pass 3 meaning must remain attributable to the autobiographical remembered meaning");
  }
  return structuredClone(output);
}

export function buildPass3ParticipationInput(meaning) {
  const request = WHOLE_PERSON_PASS3.request;
  return {
    requester: { id: "human_requester", name: "Requester" },
    evidence: [
      {
        ref: "appraisal:personal_meaning",
        kind: "personal_meaning_appraisal",
        text: `effect=${meaning.effect}; ${meaning.summary}`,
      },
      { ref: "request:objective", kind: "request", text: request.objective },
      { ref: "request:stated_need", kind: "requester_need", text: request.statedNeed },
      { ref: "request:acceptance_criteria", kind: "terms", text: request.acceptanceCriteria },
      { ref: "request:permission:0", kind: "terms", text: request.permissions[0] },
    ],
  };
}

export function buildPass3ParticipationSchema(input) {
  const refs = input.evidence.map((item) => item.ref);
  return {
    type: "object",
    additionalProperties: false,
    required: ["decision", "meaningImpact", "participationDisposition"],
    properties: {
      decision: { type: "string", enum: [...DECISIONS] },
      meaningImpact: {
        type: "object",
        additionalProperties: false,
        required: ["effect", "summary", "evidenceRefs"],
        properties: {
          effect: { type: "string", enum: [...MEANING_IMPACTS] },
          summary: { type: "string", minLength: 1, maxLength: 180 },
          evidenceRefs: {
            type: "array",
            items: { type: "string", enum: ["appraisal:personal_meaning"] },
            minItems: 1,
            maxItems: 1,
          },
        },
      },
      participationDisposition: {
        type: "object",
        additionalProperties: false,
        required: ["effect", "summary", "evidenceRefs"],
        properties: {
          effect: { type: "string", enum: [...DISPOSITIONS] },
          summary: { type: "string", minLength: 1, maxLength: 180 },
          evidenceRefs: refArraySchema(refs, { minItems: 1, maxItems: 5 }),
        },
      },
    },
  };
}

export function validatePass3Participation(input, output) {
  if (output === null || typeof output !== "object" || Array.isArray(output)) {
    throw new TypeError("Pass 3 participation output must be an object");
  }
  if (!DECISIONS.includes(output.decision)) throw new TypeError("Pass 3 decision is invalid");
  if (output.meaningImpact === null || typeof output.meaningImpact !== "object") {
    throw new TypeError("Pass 3 meaningImpact is invalid");
  }
  if (!MEANING_IMPACTS.includes(output.meaningImpact.effect)) throw new TypeError("Pass 3 meaningImpact effect is invalid");
  if (!Array.isArray(output.meaningImpact.evidenceRefs) ||
      output.meaningImpact.evidenceRefs.length !== 1 ||
      output.meaningImpact.evidenceRefs[0] !== "appraisal:personal_meaning") {
    throw new TypeError("Pass 3 meaningImpact must cite the bounded personal-meaning appraisal");
  }
  if (typeof output.meaningImpact.summary !== "string" || output.meaningImpact.summary.trim() === "" || output.meaningImpact.summary.length > 180) {
    throw new TypeError("Pass 3 meaningImpact summary is invalid");
  }
  const disposition = output.participationDisposition;
  if (disposition === null || typeof disposition !== "object") throw new TypeError("Pass 3 disposition is invalid");
  if (!DISPOSITIONS.includes(disposition.effect)) throw new TypeError("Pass 3 disposition effect is invalid");
  if (typeof disposition.summary !== "string" || disposition.summary.trim() === "" || disposition.summary.length > 180) {
    throw new TypeError("Pass 3 disposition summary is invalid");
  }
  if (!Array.isArray(disposition.evidenceRefs) || disposition.evidenceRefs.length === 0) {
    throw new TypeError("Pass 3 disposition requires evidenceRefs");
  }
  const allowed = new Set(input.evidence.map((item) => item.ref));
  for (const ref of disposition.evidenceRefs) {
    if (!allowed.has(ref)) throw new TypeError(`Pass 3 disposition cites ineligible evidence: ${ref}`);
  }
  if (output.meaningImpact.effect !== "no_material_effect" && !disposition.evidenceRefs.includes("appraisal:personal_meaning")) {
    throw new TypeError("Pass 3 disposition must cite personal meaning when meaning materially affects willingness");
  }
  return structuredClone(output);
}
