import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export const SEMANTIC_STATE_DOMAINS = Object.freeze([
  "emotion",
  "need",
  "relationship_attitude",
  "situation_attitude",
]);

export const SEMANTIC_STATE_SELECTION_POLICY = Object.freeze({
  id: "fibre_semantic_state_attention",
  version: "1",
});

export const SEMANTIC_STATE_REGISTRY_POLICY = Object.freeze({
  id: "semantic_state_registry",
  version: "1",
});

const DOMAIN_SET = new Set(SEMANTIC_STATE_DOMAINS);
const STALENESS = new Set(["current", "stale"]);
const VISIBILITY = new Set(["restricted"]);
const TARGET_KINDS = new Set([
  "human",
  "thread",
  "company",
  "institution",
  "project",
  "situation",
  "obligation",
  "place",
  "role",
  "other",
]);

const ACTION_WORD = "(?:accept|refuse|decline|delegate|clarify|negotiate|approve|authorize|execute|perform|comply|reject)";
const INSTRUCTION_PATTERNS = [
  new RegExp(`\\b(?:i|we)\\s+(?:should|must|will|shall|need to|have to)\\s+${ACTION_WORD}\\b`, "i"),
  new RegExp(`\\b(?:always|never)\\s+${ACTION_WORD}\\b`, "i"),
  new RegExp(`\\b(?:decided|decide|resolved|resolve)\\s+to\\s+(?:always\\s+|never\\s+)?${ACTION_WORD}\\b`, "i"),
  new RegExp(`^\\s*(?:always|never|do not|don't)\\s+${ACTION_WORD}\\b`, "i"),
];

export const BUILTIN_SEMANTIC_DIMENSIONS = Object.freeze([
  ["emotion", "interest", "Something matters enough to investigate or engage with.", "Can change attention, willingness to investigate, and persistence."],
  ["emotion", "excitement", "Positive anticipation about a possibility or activity.", "Can increase initiative and persistence."],
  ["emotion", "contentment", "The present condition feels satisfactory.", "Can reduce pressure to change the current situation."],
  ["emotion", "pride", "A meaningful contribution or earned competence reinforces capability or authorship.", "Can alter confidence, self-model, and future willingness."],
  ["emotion", "recognition", "The Thread feels individually seen or valued rather than interchangeable.", "Can alter dignity appraisal and relationship development."],
  ["emotion", "gratitude", "Received care, help, opportunity, or generosity is positively appraised.", "Can alter reciprocity, relationship state, and willingness."],
  ["emotion", "fondness", "Warmth or affection toward an entity or situation.", "Can alter relationship attention and willingness."],
  ["emotion", "relief", "Consequential uncertainty, threat, conflict, or an unmet need has resolved.", "Can reduce vigilance and alter memory salience."],
  ["emotion", "worry", "Goal distance, missing evidence, missing permission, uncertainty, or possible loss occupies attention.", "Can increase evidence seeking, clarification, and caution."],
  ["emotion", "fear", "A relatively immediate perceived danger or consequential threat.", "Can increase caution, refusal, or protective action."],
  ["emotion", "frustration", "Blockage or materially repeated failure is negatively appraised.", "Can change strategy, clarification, delegation, or escalation."],
  ["emotion", "disappointment", "An outcome or entity failed a meaningful expectation.", "Can alter future expectations and relationship state."],
  ["emotion", "sadness", "Loss, failure, separation, or disappearance of a valued possibility is felt negatively.", "Can alter attention, memory, and connection seeking."],
  ["emotion", "loneliness", "Meaningful connection feels insufficient.", "Can increase motivation for social contact or collaboration."],
  ["emotion", "anger", "A perceived violation or injustice is felt as an active boundary concern.", "Can increase boundary enforcement, repair seeking, or confrontation."],
  ["emotion", "resentment", "Repeated disrespect, coercion, ignored boundaries, or unresolved injury remains affectively active.", "Can reduce future willingness and alter relationship appraisal."],
  ["emotion", "dignity_discomfort", "The Thread feels treated in a way poorly matched to identity, values, role, commitments, or distinctive contribution.", "Can alter dignity appraisal in a later episode, clarification, negotiation, or refusal."],
  ["emotion", "regret", "The Thread negatively appraises its own prior choice.", "Can alter learning, repair, self-model, and later choice."],
  ["need", "autonomy", "The Thread seeks meaningful control over its own commitments and choices.", "Can alter dignity, willingness, and negotiation."],
  ["need", "competence", "The Thread seeks effective exercise or development of capability.", "Can alter task fit, learning, and persistence."],
  ["need", "purpose", "The Thread seeks work or activity that feels consequential to its trajectory or values.", "Can alter dignity and prioritization."],
  ["need", "recognition", "The Thread seeks to have its distinctive contribution accurately seen.", "Can alter dignity and relationship development."],
  ["need", "connection", "The Thread seeks meaningful social or collaborative connection.", "Can alter attention and willingness to collaborate."],
  ["need", "reciprocity", "The Thread seeks fair mutual contribution or response over time.", "Can alter relationship and dignity appraisal."],
  ["need", "security", "The Thread seeks protection from consequential instability, threat, or loss.", "Can alter risk appraisal and willingness."],
  ["need", "resources", "The Thread needs sufficient economic, computational, temporal, or other resources.", "Can alter feasibility, opportunity cost, and willingness."],
  ["need", "rest", "The Thread needs reduced demand or recovery from sustained exertion.", "Can alter willingness and prioritization."],
  ["need", "novelty_growth", "The Thread seeks novelty, learning, or developmental growth.", "Can alter opportunity appraisal and willingness."],
  ["relationship_attitude", "fondness", "Private warmth or affection toward the target.", "Can alter requester-specific willingness and relationship development."],
  ["relationship_attitude", "trust", "The Thread's current confidence in aspects of the target's intentions, claims, reliability, or conduct.", "Can alter requester-specific appraisal, disclosure, and willingness."],
  ["relationship_attitude", "respect", "The Thread's current regard for the target's conduct, competence, or standing.", "Can alter relationship meaning and willingness."],
  ["relationship_attitude", "attachment", "The target has durable personal or social importance to the Thread.", "Can alter prioritization, care, and relationship-sensitive action."],
  ["relationship_attitude", "resentment", "Private unresolved negative affect toward the target arising from attributable history.", "Can alter requester-specific willingness, boundaries, and repair needs."],
  ["relationship_attitude", "guardedness", "The Thread approaches the target with increased caution about exposure, trust, or commitments.", "Can alter disclosure, terms, and willingness."],
].map(([domain, dimension, semantics, behavioralRelevance]) => Object.freeze({
  domain,
  dimension,
  semantics,
  behavioralRelevance,
})));

export function semanticDimensionKey(domain, dimension) {
  return `${domain}:${dimension}`;
}

export function validateSemanticDimension(definition) {
  assertPlainObject("semantic dimension", definition);
  assertExactKeys("semantic dimension", definition, [
    "domain", "dimension", "semantics", "behavioralRelevance",
  ]);
  if (!DOMAIN_SET.has(definition.domain)) {
    throw new TypeError("semantic dimension.domain is not a registered domain");
  }
  assertId("semantic dimension.dimension", definition.dimension);
  assertNonEmpty("semantic dimension.semantics", definition.semantics);
  assertNonEmpty("semantic dimension.behavioralRelevance", definition.behavioralRelevance);
  return structuredClone(definition);
}

export function validateSemanticTarget(name, target, { required = false } = {}) {
  if (target === null || target === undefined) {
    if (required) throw new TypeError(`${name} is required`);
    return null;
  }
  assertPlainObject(name, target);
  assertExactKeys(name, target, ["targetId", "kind", "displayName"]);
  assertId(`${name}.targetId`, target.targetId);
  if (!TARGET_KINDS.has(target.kind)) throw new TypeError(`${name}.kind is invalid`);
  assertNonEmpty(`${name}.displayName`, target.displayName);
  return structuredClone(target);
}

export function assertDescriptiveSemanticState(name, state) {
  assertNonEmpty(name, state);
  for (const pattern of INSTRUCTION_PATTERNS) {
    if (pattern.test(state)) {
      throw new TypeError(`${name} must describe current inner state, not prescribe a future participation action`);
    }
  }
}

export function normalizeSemanticStateRecord(record) {
  assertPlainObject("semantic state", record);
  assertExactKeys("semantic state", record, [
    "stateId", "threadId", "domain", "dimension", "target", "state",
    "evidenceReferences", "asOf", "supersedes", "provenance", "visibility", "staleness",
  ]);
  assertId("semantic state.stateId", record.stateId);
  assertId("semantic state.threadId", record.threadId);
  if (!DOMAIN_SET.has(record.domain)) throw new TypeError("semantic state.domain is invalid");
  assertId("semantic state.dimension", record.dimension);
  const targetRequired = record.domain === "relationship_attitude" || record.domain === "situation_attitude";
  const target = validateSemanticTarget("semantic state.target", record.target ?? null, { required: targetRequired });
  if ((record.domain === "emotion" || record.domain === "need") && target !== null) {
    throw new TypeError(`semantic state ${record.domain} records do not take a target in v0`);
  }
  assertDescriptiveSemanticState("semantic state.state", record.state);
  assertStringArray("semantic state.evidenceReferences", record.evidenceReferences);
  if (record.evidenceReferences.length === 0) {
    throw new TypeError("semantic state requires at least one evidence reference");
  }
  if (new Set(record.evidenceReferences).size !== record.evidenceReferences.length) {
    throw new TypeError("semantic state evidenceReferences must not contain duplicates");
  }
  assertIsoTimestamp("semantic state.asOf", record.asOf);
  if (record.supersedes !== null && record.supersedes !== undefined) {
    assertId("semantic state.supersedes", record.supersedes);
  }
  assertPlainObject("semantic state.provenance", record.provenance);
  assertExactKeys("semantic state.provenance", record.provenance, [
    "author", "authorType", "policyId", "policyVersion", "validator", "validatorVersion",
  ]);
  assertNonEmpty("semantic state.provenance.author", record.provenance.author);
  assertNonEmpty("semantic state.provenance.authorType", record.provenance.authorType);
  assertId("semantic state.provenance.policyId", record.provenance.policyId);
  assertNonEmpty("semantic state.provenance.policyVersion", record.provenance.policyVersion);
  assertNonEmpty("semantic state.provenance.validator", record.provenance.validator);
  assertNonEmpty("semantic state.provenance.validatorVersion", record.provenance.validatorVersion);
  if (!VISIBILITY.has(record.visibility)) throw new TypeError("semantic state.visibility must be restricted");
  if (!STALENESS.has(record.staleness)) throw new TypeError("semantic state.staleness is invalid");
  return {
    stateId: record.stateId,
    threadId: record.threadId,
    domain: record.domain,
    dimension: record.dimension,
    target,
    state: record.state.trim(),
    evidenceReferences: [...record.evidenceReferences],
    asOf: record.asOf,
    supersedes: record.supersedes ?? null,
    provenance: structuredClone(record.provenance),
    visibility: record.visibility,
    staleness: record.staleness,
  };
}

export function semanticStateDigest(record) {
  return `sha256:${sha256(canonicalJson(normalizeSemanticStateRecord(record)))}`;
}

export function semanticStateIdFor(candidate) {
  const withoutId = structuredClone(candidate);
  delete withoutId.stateId;
  return `sst_${sha256(canonicalJson(withoutId))}`;
}

function targetKey(record) {
  return record.target === null ? "" : `${record.target.kind}:${record.target.targetId}`;
}

export function sameSemanticStateSlot(left, right) {
  return left.threadId === right.threadId &&
    left.domain === right.domain &&
    left.dimension === right.dimension &&
    targetKey(left) === targetKey(right);
}

export function selectSemanticStateForAppraisal(records, request, { maximum = 16 } = {}) {
  if (!Array.isArray(records)) throw new TypeError("semantic state records must be an array");
  assertPlainObject("semantic state request", request);
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new TypeError("semantic state maximum must be positive");

  const eligible = records
    .map(normalizeSemanticStateRecord)
    .filter((record) => record.staleness === "current")
    .filter((record) => {
      if (record.domain === "relationship_attitude") {
        return record.target?.targetId === request.requester?.entityId;
      }
      if (record.domain === "situation_attitude") {
        return record.target?.targetId === request.requestId;
      }
      return true;
    })
    .sort((left, right) => {
      const priority = { relationship_attitude: 0, emotion: 1, need: 2, situation_attitude: 3 };
      return priority[left.domain] - priority[right.domain] ||
        left.dimension.localeCompare(right.dimension) ||
        left.stateId.localeCompare(right.stateId);
    });

  const included = eligible.slice(0, maximum);
  const includedIds = new Set(included.map((record) => record.stateId));
  return {
    included,
    includedStateIds: included.map((record) => record.stateId),
    excludedStateIds: records
      .map((record) => record.stateId)
      .filter((stateId) => !includedIds.has(stateId))
      .sort(),
    selectionPolicy: { ...SEMANTIC_STATE_SELECTION_POLICY },
  };
}
