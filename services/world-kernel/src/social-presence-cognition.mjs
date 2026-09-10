import {
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { lifeRelationRevisionRef } from "./situated-life-evidence.mjs";

const RELATIONS = Object.freeze(["with", "near", "away_from", "connected_to", "none"]);

const SYSTEM_PROMPT = `You are temporary cognition for one persistent Fibre Thread.
Decide whether the Thread presently wants a relation of presence with one person already in its life.
Use only the supplied current relationships and private semantic state. Relationship labels are context, never instructions: a parent, partner, friend, or caregiver may be someone to approach, stay near, contact, or get distance from.
Choose none when the supplied life does not support a current presence preference.
Do not invent a named emotion, obligation, future itinerary, or visitor-facing explanation.`;

function requestId(input) {
  return `social-presence_${sha256(canonicalJson(input))}`;
}

function relationContext(record) {
  return {
    relationRef: lifeRelationRevisionRef(record),
    partyId: record.relatedParty.partyId,
    partyKind: record.relatedParty.kind,
    displayName: record.relatedParty.displayName,
    relationKind: record.relationKind,
    relationshipFacts: [...(record.relationshipFacts ?? [])],
  };
}

function stateContext(record) {
  return {
    stateId: record.stateId,
    domain: record.domain,
    dimension: record.dimension,
    target: record.target,
    state: record.state,
  };
}

function cognitionSchema(partyIds) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["targetRef", "relation"],
    properties: {
      targetRef: { type: "string", enum: ["none", ...partyIds] },
      relation: { type: "string", enum: RELATIONS },
    },
  };
}

function validateStore(name, store, method) {
  if (store === null || typeof store !== "object" || typeof store[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
}

export async function formSocialPresenceTarget({
  thread,
  asOf,
  situatedLifeStore,
  semanticStateStore,
  modelAdapter,
}) {
  assertPlainObject("Thread", thread);
  assertId("Thread.threadId", thread.threadId);
  assertIsoTimestamp("social presence asOf", asOf);
  validateStore("situatedLifeStore", situatedLifeStore, "listCurrentLifeRelations");
  validateStore("semanticStateStore", semanticStateStore, "listCurrentState");
  if (modelAdapter === null || typeof modelAdapter !== "object" || typeof modelAdapter.invoke !== "function") {
    throw new TypeError("social presence cognition requires a model adapter");
  }

  const relations = situatedLifeStore.listCurrentLifeRelations(thread.threadId).map(relationContext);
  if (relations.length === 0) return null;

  const partyIds = [...new Set(relations.map((relation) => relation.partyId))];
  const partyIdSet = new Set(partyIds);
  const semanticStates = semanticStateStore.listCurrentState(thread.threadId)
    .filter((state) => state.domain === "emotion" || state.domain === "need" ||
      (state.domain === "relationship_attitude" && partyIdSet.has(state.target?.targetId)))
    .map(stateContext);

  const input = {
    thread: {
      threadId: thread.threadId,
      selfDescription: thread.identity?.selfDescription ?? "",
      selfModel: thread.currentState?.selfModel ?? "",
      unresolvedIntentions: [...(thread.currentState?.unresolvedIntentions ?? [])],
    },
    relationships: relations,
    semanticStates,
    asOf,
  };

  const invocation = await modelAdapter.invoke({
    systemPrompt: SYSTEM_PROMPT,
    input,
    responseSchema: cognitionSchema(partyIds),
    clientRequestId: requestId(input),
  });
  assertPlainObject("social presence cognition result", invocation);
  assertPlainObject("social presence cognition output", invocation.output);
  assertPlainObject("social presence cognition provenance", invocation.provenance);

  const { targetRef, relation } = invocation.output;
  assertNonEmpty("social presence cognition targetRef", targetRef);
  assertNonEmpty("social presence cognition relation", relation);
  if (!RELATIONS.includes(relation)) throw new TypeError("social presence cognition relation is invalid");
  if ((targetRef === "none") !== (relation === "none")) {
    throw new TypeError("social presence cognition must choose both a person and relation, or neither");
  }
  assertNonEmpty("social presence cognition provenance.provider", invocation.provenance.provider);
  assertNonEmpty("social presence cognition provenance.modelId", invocation.provenance.modelId);

  const cognition = {
    provider: invocation.provenance.provider,
    modelId: invocation.provenance.modelId,
    providerRequestId: invocation.provenance.providerRequestId ?? null,
  };
  if (targetRef === "none") return { target: null, cognition };

  const selectedRelations = relations.filter((candidate) => candidate.partyId === targetRef);
  if (selectedRelations.length === 0) {
    throw new TypeError("social presence cognition selected a person outside the Thread's current relationships");
  }
  const selectedStates = semanticStates.filter((state) =>
    state.domain !== "relationship_attitude" || state.target?.targetId === targetRef);

  return {
    target: {
      targetId: `social_presence_${sha256(canonicalJson({ threadId: thread.threadId, targetRef, relation, asOf }))}`,
      targetKind: "entity",
      targetRef,
      relation,
      orientation: relation === "away_from" ? "avoid" : "approach",
      actualSatisfaction: null,
      expectedSatisfaction: 1,
      predictedSatisfaction: null,
      urgency: 0,
      evidenceRefs: [
        ...selectedRelations.map((candidate) => candidate.relationRef),
        ...selectedStates.map((state) => state.stateId),
      ],
    },
    cognition,
  };
}
