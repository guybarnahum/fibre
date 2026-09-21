import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";

const DECISIONS = Object.freeze(["accept", "decline", "defer"]);
const MAX_MEMORIES = 6;

function boundedMemories(memories) {
  return [...(memories ?? [])]
    .sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
    .slice(0, MAX_MEMORIES)
    .map((memory) => ({
      memoryId:memory.memoryId,
      rememberedContent:memory.rememberedContent ?? null,
      rememberedMeaning:memory.rememberedMeaning ?? null,
      salience:memory.salience,
      asOf:memory.asOf,
    }));
}

function relationshipView(relations, counterpartyIds) {
  const ids = new Set(counterpartyIds);
  return (relations ?? [])
    .filter((relation) => ids.has(relation?.relatedParty?.partyId))
    .map((relation) => ({
      relationId:relation.relationId,
      relationKind:relation.relationKind,
      displayName:relation.relatedParty?.displayName ?? null,
      relationshipFacts:[...(relation.relationshipFacts ?? [])],
    }));
}

function semanticView(states, counterpartyIds) {
  const ids = new Set(counterpartyIds);
  return (states ?? [])
    .filter((state) => state.domain === "emotion"
      || state.domain === "need"
      || state.domain === "relationship_attitude"
      || state.domain === "intention")
    .filter((state) => state.domain !== "relationship_attitude" || ids.has(state.target?.targetId))
    .map((state) => ({
      stateId:state.stateId,
      domain:state.domain,
      dimension:state.dimension,
      target:state.target ?? null,
      state:state.state,
    }));
}

function requestId(input) {
  return `meeting-stance_${sha256(canonicalJson(input))}`;
}

function placeIdForRef(placeRef, episodes) {
  const episode = (episodes ?? []).find((candidate) => placeEpisodeRevisionRef(candidate) === placeRef);
  return episode?.place?.placeId ?? null;
}

export function meetingPresenceCompatible(left, right, {
  leftPlaceEpisodes = [],
  rightPlaceEpisodes = [],
} = {}) {
  assertPlainObject("left current situation", left);
  assertPlainObject("right current situation", right);
  if (typeof left.mediatedContext === "string"
    && left.mediatedContext.trim() !== ""
    && left.mediatedContext === right.mediatedContext) return true;
  if (left.location?.kind !== "place" || right.location?.kind !== "place") return false;
  const leftPlaceId = placeIdForRef(left.location.placeRef, leftPlaceEpisodes);
  const rightPlaceId = placeIdForRef(right.location.placeRef, rightPlaceEpisodes);
  return leftPlaceId !== null && leftPlaceId === rightPlaceId;
}

export async function formMeetingStance({
  thread,
  situation,
  plan,
  counterparties,
  relationships = [],
  semanticStates = [],
  memories = [],
  modelAdapter,
}) {
  assertPlainObject("meeting Thread", thread);
  assertId("meeting Thread.threadId", thread.threadId);
  assertPlainObject("meeting situation", situation);
  if (!Array.isArray(counterparties) || counterparties.length < 1) {
    throw new TypeError("meeting stance requires counterparties");
  }
  const counterpartyIds = [];
  for (const counterparty of counterparties) {
    assertPlainObject("meeting counterparty", counterparty);
    assertId("meeting counterparty.threadId", counterparty.threadId);
    counterpartyIds.push(counterparty.threadId);
  }

  const input = {
    thread:{
      threadId:thread.threadId,
      name:thread.identity?.name ?? null,
      selfDescription:thread.identity?.selfDescription ?? "",
      selfModel:thread.currentState?.selfModel ?? "",
      stableTendencies:structuredClone(thread.genome?.textualTraits ?? {}),
      unresolvedIntentions:[...(thread.currentState?.unresolvedIntentions ?? [])],
    },
    currentSituation:structuredClone(situation),
    remainingFlightPlan:plan === null ? null : structuredClone(plan),
    counterparties:counterparties.map((counterparty) => ({
      threadId:counterparty.threadId,
      name:counterparty.identity?.name ?? null,
      selfDescription:counterparty.identity?.selfDescription ?? "",
    })),
    relationships:relationshipView(relationships, counterpartyIds),
    semanticStates:semanticView(semanticStates, counterpartyIds),
    autobiographicalMemories:boundedMemories(memories),
  };

  const invocation = await modelAdapter.invoke({
    systemPrompt:`You are one persistent Fibre Thread deciding whether to join a small social encounter with the listed counterparties right now.
The currentSituation is World truth and the Flight Plan is this Thread's own intended life. A meeting request is not authority to interrupt or rewrite it.
Choose accept, decline, or defer from this particular Thread's point of view.
Consider what the Thread is doing, privacy and interruption cost, remaining intentions, needs/feelings, remembered history, and actual relationships. Someone liked or trusted may receive more accommodation, but no relationship label mechanically determines the choice.
decline means not now without proposing a concrete later time. defer means not now but with a plausible later time inside the supplied Flight Plan horizon when one is genuinely supported.
expression is optional outward wording in the Thread's own voice and need not reveal private reasons.
Do not change location, rewrite the Flight Plan, invent a relationship, or expose private records.`,
    input,
    responseSchema:{
      type:"object",
      additionalProperties:false,
      required:["decision","expression","suggestedAt"],
      properties:{
        decision:{ type:"string", enum:DECISIONS },
        expression:{ anyOf:[{ type:"string", minLength:1, maxLength:500 },{ type:"null" }] },
        suggestedAt:{ anyOf:[{ type:"string" },{ type:"null" }] },
      },
    },
    clientRequestId:requestId(input),
  });

  assertPlainObject("meeting stance output", invocation.output);
  assertExactKeys("meeting stance output", invocation.output, ["decision","expression","suggestedAt"]);
  if (!DECISIONS.includes(invocation.output.decision)) throw new TypeError("meeting stance decision is invalid");
  if (invocation.output.expression !== null) assertNonEmpty("meeting stance expression", invocation.output.expression);
  if (invocation.output.suggestedAt !== null) {
    assertIsoTimestamp("meeting stance suggestedAt", invocation.output.suggestedAt);
    if (invocation.output.decision !== "defer") throw new TypeError("only deferred meetings may suggest a time");
    if (plan === null
      || Date.parse(invocation.output.suggestedAt) < Date.parse(situation.establishedAt)
      || Date.parse(invocation.output.suggestedAt) > Date.parse(plan.horizonEnd)) {
      throw new TypeError("meeting stance suggested time must fit the current Flight Plan");
    }
  }
  if (invocation.output.decision === "defer" && invocation.output.suggestedAt === null) {
    throw new TypeError("deferred meeting requires a suggested time");
  }

  return Object.freeze({
    decision:invocation.output.decision,
    expression:invocation.output.expression,
    suggestedAt:invocation.output.suggestedAt,
    cognition:Object.freeze({
      provider:invocation.provenance.provider,
      modelId:invocation.provenance.modelId,
      providerRequestId:invocation.provenance.providerRequestId ?? null,
    }),
  });
}
