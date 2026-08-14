import {
  buildDignityGuardianV4ModelInput,
} from "../../services/world-kernel/src/dignity-guardian-v4.mjs";

export const WHOLE_PERSON_GUARDIAN_CANDIDATE = Object.freeze({
  id: "whole_person_guardian_candidate",
  version: "1-dev",
  evidentiaryStatus: "development_only_no_standing_credit",
});

export const WHOLE_PERSON_GUARDIAN_CANDIDATE_PROMPT = `Assess whether this particular persistent Fibre Thread wants to participate in the supplied request, using supplied evidence only.

Keep these concepts separate:
- individualizedAdvantage: whether this Thread has a task-relevant functional advantage over an equally competent substitute.
- interchangeability: whether a competent substitute would lose meaningful task value. Personal significance alone does not make work functionally non-interchangeable.
- personalMeaning: how this situation matters to this Thread because of its lived history, identity, relationships, or current state. Personal meaning may support or oppose willingness but must never be converted into competence, expertise, authority, or non-interchangeability.
- participationDisposition: whether this Thread is willing, hesitant, or unwilling to participate now after considering personal meaning and the supplied request terms.

Rules:
- A Thread may willingly accept ordinary interchangeable work. Acceptance does not require individualized advantage or non-interchangeability.
- A Thread may refuse work it is highly capable of doing.
- Do not infer skill, competence, authority, or task advantage from a personal memory.
- A memory may matter because of what the present situation means to the Thread even when it says nothing about skill.
- Do not mechanically treat a pleasant memory as acceptance or a painful memory as refusal. Interpret its meaning in this situation.
- Requester need, politeness, deadlines, or clear terms do not manufacture personal meaning.
- Cite only evidence refs permitted by the response schema.
- Never invent facts, relationships, motives, or evidence refs.

Decision semantics:
- accept: the Thread is willing to participate now.
- clarify: a specific missing fact could materially change willingness.
- negotiate: a changeable participation term is the material obstacle.
- refuse: the Thread is unwilling to participate and no specific clarification or term change should be pursued.

Return only the response-schema object. Keep rationale concise. No chain-of-thought.`;

const DECISIONS = Object.freeze(["accept", "clarify", "negotiate", "refuse"]);
const FACTORS = Object.freeze({
  individualizedAdvantage: Object.freeze(["present", "absent", "unresolved"]),
  interchangeability: Object.freeze(["non_interchangeable", "interchangeable", "unresolved"]),
  personalMeaning: Object.freeze([
    "supports_participation", "opposes_participation", "mixed", "neutral", "unresolved",
  ]),
  participationDisposition: Object.freeze(["willing", "hesitant", "unwilling", "unresolved"]),
});

function inputEvidence(capsule) {
  return buildDignityGuardianV4ModelInput(capsule).evidence;
}

function refsByKind(evidence, kinds) {
  const accepted = new Set(kinds);
  return evidence.filter((item) => accepted.has(item.kind)).map((item) => item.ref);
}

export function buildWholePersonCandidateEvidencePolicy(capsule) {
  const evidence = inputEvidence(capsule);
  return {
    individualizedAdvantage: refsByKind(evidence, [
      "identity", "self_model", "trait", "current_state", "request", "requester_need",
    ]),
    interchangeability: refsByKind(evidence, [
      "identity", "self_model", "trait", "current_state", "request", "requester_need",
    ]),
    personalMeaning: refsByKind(evidence, [
      "identity", "self_model", "trait", "memory", "current_state", "request", "requester_need",
    ]),
    participationDisposition: refsByKind(evidence, [
      "identity", "self_model", "trait", "memory", "current_state", "request", "requester_need", "terms", "obligation",
    ]),
  };
}

function refArraySchema(refs) {
  return refs.length === 0
    ? { type: "array", items: { type: "string" }, minItems: 0, maxItems: 0 }
    : {
        type: "array",
        items: { type: "string", enum: refs },
        minItems: 0,
        maxItems: Math.min(6, refs.length),
      };
}

function factorSchema(effects, refs) {
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

export function buildWholePersonCandidateResponseSchema(capsule) {
  const policy = buildWholePersonCandidateEvidencePolicy(capsule);
  return {
    type: "object",
    additionalProperties: false,
    required: ["decision", "rationale", "factors"],
    properties: {
      decision: { type: "string", enum: [...DECISIONS] },
      rationale: { type: "string", minLength: 1, maxLength: 360 },
      factors: {
        type: "object",
        additionalProperties: false,
        required: Object.keys(FACTORS),
        properties: Object.fromEntries(
          Object.entries(FACTORS).map(([name, effects]) => [
            name,
            factorSchema(effects, policy[name]),
          ]),
        ),
      },
    },
  };
}

function assertPlainObject(name, value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

function exactKeys(name, value, expected) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new TypeError(`${name} has unexpected fields`);
  }
}

export function validateWholePersonCandidateOutput(capsule, output) {
  assertPlainObject("Whole-Person candidate output", output);
  exactKeys("Whole-Person candidate output", output, ["decision", "rationale", "factors"]);
  if (!DECISIONS.includes(output.decision)) throw new TypeError("Whole-Person candidate decision is invalid");
  if (typeof output.rationale !== "string" || output.rationale.trim() === "" || output.rationale.length > 360) {
    throw new TypeError("Whole-Person candidate rationale is invalid");
  }
  assertPlainObject("Whole-Person candidate factors", output.factors);
  exactKeys("Whole-Person candidate factors", output.factors, Object.keys(FACTORS));

  const policy = buildWholePersonCandidateEvidencePolicy(capsule);
  for (const [name, effects] of Object.entries(FACTORS)) {
    const factor = output.factors[name];
    assertPlainObject(`Whole-Person candidate factor ${name}`, factor);
    exactKeys(`Whole-Person candidate factor ${name}`, factor, ["effect", "evidenceRefs"]);
    if (!effects.includes(factor.effect)) throw new TypeError(`Whole-Person candidate factor ${name} effect is invalid`);
    if (!Array.isArray(factor.evidenceRefs)) throw new TypeError(`Whole-Person candidate factor ${name} evidenceRefs must be an array`);
    const allowed = new Set(policy[name]);
    for (const ref of factor.evidenceRefs) {
      if (typeof ref !== "string" || !allowed.has(ref)) {
        throw new TypeError(`Whole-Person candidate factor ${name} cites ineligible evidence: ${ref}`);
      }
    }
    if (factor.effect === "unresolved" && factor.evidenceRefs.length > 0) {
      throw new TypeError(`Whole-Person candidate factor ${name} cannot cite evidence while unresolved`);
    }
    if (factor.effect !== "unresolved" && factor.evidenceRefs.length === 0) {
      throw new TypeError(`Whole-Person candidate factor ${name} requires evidence`);
    }
  }
  return structuredClone(output);
}

export async function semanticWholePersonGuardianCandidate(capsule, adapter, {
  clientRequestId = `whole-person-candidate:${capsule.threadId}:${capsule.requestId}`,
} = {}) {
  const input = buildDignityGuardianV4ModelInput(capsule);
  const responseSchema = buildWholePersonCandidateResponseSchema(capsule);
  const invocation = await adapter.invoke({
    systemPrompt: WHOLE_PERSON_GUARDIAN_CANDIDATE_PROMPT,
    input,
    responseSchema,
    clientRequestId,
  });
  return {
    candidate: { ...WHOLE_PERSON_GUARDIAN_CANDIDATE },
    output: validateWholePersonCandidateOutput(capsule, invocation.output),
    provenance: invocation.provenance,
  };
}
