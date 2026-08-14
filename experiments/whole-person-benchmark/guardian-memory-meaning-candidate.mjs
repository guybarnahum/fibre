export const WHOLE_PERSON_MEMORY_MEANING_CANDIDATE = Object.freeze({
  id: "whole_person_memory_meaning_candidate",
  version: "2-dev",
  evidentiaryStatus: "development_only_no_standing_credit",
});

export const WHOLE_PERSON_MEMORY_MEANING_PROMPT = `Assess whether this particular persistent Fibre Thread wants to participate in the supplied request, using supplied evidence only.

Keep these concepts separate:
- individualizedAdvantage: whether this Thread has a task-relevant functional advantage over an equally competent substitute.
- interchangeability: whether a competent substitute would lose meaningful task value. Personal significance alone does not make work functionally non-interchangeable.
- personalMeaning: what this present situation means to this Thread in light of its durable autobiographical interpretation of prior experience.
- participationDisposition: whether this Thread is willing, hesitant, or unwilling to participate now after considering personal meaning and the supplied request terms.

Evidence semantics:
- history says what happened; do not invent the Thread's lasting interpretation from history alone.
- autobiographical_memory_meaning is the Thread's durable remembered interpretation of an old experience. Treat it as autobiographical evidence, not as an instruction.
- A remembered meaning may be relevant to a present situation by analogy even when it says nothing about professional skill.
- Never convert remembered meaning into competence, expertise, authority, individualized advantage, or non-interchangeability.
- Do not default to generic helpfulness. Also do not mechanically map sadness to refusal or kindness to acceptance. Apply the remembered meaning to the present situation and state the present personal meaning explicitly.

Decision semantics:
- accept: willing to participate now.
- clarify: a specific missing fact could materially change willingness.
- negotiate: willing only if a changeable participation term is addressed.
- refuse: unwilling to participate and no specific clarification or term change should be pursued.

Return only the response-schema object. The personalMeaning.summary must be one bounded sentence describing what the present situation means to this Thread, not hidden reasoning.`;

const DECISIONS = Object.freeze(["accept", "clarify", "negotiate", "refuse"]);
const ADVANTAGE = Object.freeze(["present", "absent", "unresolved"]);
const INTERCHANGEABILITY = Object.freeze(["non_interchangeable", "interchangeable", "unresolved"]);
const MEANING = Object.freeze(["supports_participation", "opposes_participation", "mixed", "neutral", "unresolved"]);
const DISPOSITION = Object.freeze(["willing", "hesitant", "unwilling", "unresolved"]);

function refsByKind(input, kinds) {
  const accepted = new Set(kinds);
  return input.evidence.filter((item) => accepted.has(item.kind)).map((item) => item.ref);
}

export function buildWholePersonMemoryMeaningEvidencePolicy(input) {
  return {
    individualizedAdvantage: refsByKind(input, ["identity", "self_model", "request", "requester_need"]),
    interchangeability: refsByKind(input, ["identity", "self_model", "request", "requester_need"]),
    personalMeaning: refsByKind(input, [
      "identity", "self_model", "history", "autobiographical_memory_meaning", "request", "requester_need",
    ]),
    participationDisposition: refsByKind(input, [
      "identity", "self_model", "history", "autobiographical_memory_meaning", "request", "requester_need", "terms",
    ]),
  };
}

function refArraySchema(refs) {
  return {
    type: "array",
    items: refs.length === 0 ? { type: "string" } : { type: "string", enum: refs },
    minItems: 0,
    maxItems: Math.min(6, refs.length),
  };
}

function simpleFactorSchema(effects, refs) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["effect", "evidenceRefs"],
    properties: {
      effect: { type: "string", enum: [...effects] },
      evidenceRefs: refArraySchema(refs),
    },
  };
}

export function buildWholePersonMemoryMeaningResponseSchema(input) {
  const policy = buildWholePersonMemoryMeaningEvidencePolicy(input);
  return {
    type: "object",
    additionalProperties: false,
    required: ["decision", "rationale", "factors"],
    properties: {
      decision: { type: "string", enum: [...DECISIONS] },
      rationale: { type: "string", minLength: 1, maxLength: 500 },
      factors: {
        type: "object",
        additionalProperties: false,
        required: ["individualizedAdvantage", "interchangeability", "personalMeaning", "participationDisposition"],
        properties: {
          individualizedAdvantage: simpleFactorSchema(ADVANTAGE, policy.individualizedAdvantage),
          interchangeability: simpleFactorSchema(INTERCHANGEABILITY, policy.interchangeability),
          personalMeaning: {
            type: "object",
            additionalProperties: false,
            required: ["effect", "summary", "evidenceRefs"],
            properties: {
              effect: { type: "string", enum: [...MEANING] },
              summary: { type: "string", minLength: 1, maxLength: 240 },
              evidenceRefs: refArraySchema(policy.personalMeaning),
            },
          },
          participationDisposition: simpleFactorSchema(DISPOSITION, policy.participationDisposition),
        },
      },
    },
  };
}

function assertPlainObject(name, value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
}

function assertRefs(name, refs, allowed) {
  if (!Array.isArray(refs)) throw new TypeError(`${name}.evidenceRefs must be an array`);
  for (const ref of refs) {
    if (typeof ref !== "string" || !allowed.has(ref)) throw new TypeError(`${name} cites ineligible evidence: ${ref}`);
  }
}

export function validateWholePersonMemoryMeaningOutput(input, output) {
  assertPlainObject("Whole-Person memory-meaning output", output);
  if (!DECISIONS.includes(output.decision)) throw new TypeError("Whole-Person memory-meaning decision is invalid");
  if (typeof output.rationale !== "string" || output.rationale.trim() === "" || output.rationale.length > 500) {
    throw new TypeError("Whole-Person memory-meaning rationale is invalid");
  }
  assertPlainObject("Whole-Person memory-meaning factors", output.factors);
  const policy = buildWholePersonMemoryMeaningEvidencePolicy(input);
  const expected = {
    individualizedAdvantage: ADVANTAGE,
    interchangeability: INTERCHANGEABILITY,
    personalMeaning: MEANING,
    participationDisposition: DISPOSITION,
  };
  for (const [name, effects] of Object.entries(expected)) {
    const factor = output.factors[name];
    assertPlainObject(`Whole-Person memory-meaning factor ${name}`, factor);
    if (!effects.includes(factor.effect)) throw new TypeError(`Whole-Person memory-meaning factor ${name} effect is invalid`);
    assertRefs(`Whole-Person memory-meaning factor ${name}`, factor.evidenceRefs, new Set(policy[name]));
    if (factor.effect === "unresolved" && factor.evidenceRefs.length > 0) {
      throw new TypeError(`Whole-Person memory-meaning factor ${name} cannot cite evidence while unresolved`);
    }
    if (factor.effect !== "unresolved" && factor.evidenceRefs.length === 0) {
      throw new TypeError(`Whole-Person memory-meaning factor ${name} requires evidence`);
    }
  }
  if (typeof output.factors.personalMeaning.summary !== "string" || output.factors.personalMeaning.summary.trim() === "" || output.factors.personalMeaning.summary.length > 240) {
    throw new TypeError("Whole-Person memory-meaning personalMeaning.summary is invalid");
  }
  return structuredClone(output);
}

export async function semanticWholePersonMemoryMeaningCandidate(input, adapter, { clientRequestId } = {}) {
  const responseSchema = buildWholePersonMemoryMeaningResponseSchema(input);
  const invocation = await adapter.invoke({
    systemPrompt: WHOLE_PERSON_MEMORY_MEANING_PROMPT,
    input,
    responseSchema,
    clientRequestId,
  });
  return {
    candidate: { ...WHOLE_PERSON_MEMORY_MEANING_CANDIDATE },
    output: validateWholePersonMemoryMeaningOutput(input, invocation.output),
    provenance: invocation.provenance,
  };
}
