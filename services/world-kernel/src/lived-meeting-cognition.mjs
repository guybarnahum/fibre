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
import { runInteriorCognition } from "./interior-cognition.mjs";

const DECISIONS = Object.freeze(["accept", "decline", "defer"]);
const INITIATION_DECISIONS = Object.freeze(["initiate", "not_initiate"]);
const MAX_MEMORIES = 6;

const SOCIAL_INITIATION_ADAPTER = Object.freeze({
  id:"social-initiation",
  instruction:`Decide whether this Thread genuinely wants to initiate a small social encounter with one or more co-present counterparties right now.
Co-presence creates an opportunity, not an obligation. Initiate only when the Thread actually wants something social from them now: attention, company, help, information, conversation, shared activity, or another concrete engagement grounded in the life already underway.
If initiating, write the short outward request the counterparties would actually hear. It must make the ask clear enough that they can meaningfully decide whether to engage.
Choose not_initiate when the Thread does not genuinely want to ask anything of them now.
reason is a concise private operator-facing explanation of the material considerations. Do not change location, rewrite the Flight Plan, invent a relationship, expose private records, or manufacture a motive merely to make an encounter happen.`,
  resultSchema:{
    type:"object",
    additionalProperties:false,
    required:["decision","requestText","reason"],
    properties:{
      decision:{ type:"string", enum:INITIATION_DECISIONS },
      requestText:{ anyOf:[{ type:"string", minLength:1, maxLength:500 },{ type:"null" }] },
      reason:{ type:"string", minLength:1, maxLength:500 },
    },
  },
});


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

function requestId(kind, input) {
  return `${kind}_${sha256(canonicalJson(input))}`;
}

function sharedWorldPlaceIdForRef(placeRef, episodes) {
  const episode = (episodes ?? []).find((candidate) => placeEpisodeRevisionRef(candidate) === placeRef);
  if (episode?.provenance !== "world_recorded") return null;
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
  const leftPlaceId = sharedWorldPlaceIdForRef(left.location.placeRef, leftPlaceEpisodes);
  const rightPlaceId = sharedWorldPlaceIdForRef(right.location.placeRef, rightPlaceEpisodes);
  return leftPlaceId !== null && leftPlaceId === rightPlaceId;
}

export async function formSocialEncounterRequest({
  threadId,
  at,
  situation,
  plan,
  counterparties,
  sourceStores,
  modelAdapter,
}) {
  assertId("social encounter initiator Thread.threadId", threadId);
  assertIsoTimestamp("social encounter at", at);
  assertPlainObject("social encounter initiator situation", situation);
  if (!Array.isArray(counterparties) || counterparties.length < 1) {
    throw new TypeError("social encounter request requires counterparties");
  }
  const counterpartySummaries = counterparties.map((counterparty) => {
    assertPlainObject("social encounter request counterparty", counterparty);
    assertId("social encounter request counterparty.threadId", counterparty.threadId);
    return Object.freeze({
      threadId:counterparty.threadId,
      name:counterparty.identity?.name ?? null,
      selfDescription:counterparty.identity?.selfDescription ?? "",
    });
  });

  const cognition = await runInteriorCognition({
    threadId,
    at,
    concern:{
      kind:"social_initiation",
      question:"Do I want to ask any of these co-present Threads for something now?",
      externalContext:{
        currentSituation:structuredClone(situation),
        remainingFlightPlan:plan === null ? null : structuredClone(plan),
        counterparties:counterpartySummaries,
      },
    },
    adapter:SOCIAL_INITIATION_ADAPTER,
    sourceStores,
    modelAdapter,
  });

  assertPlainObject("social encounter request output", cognition.result);
  assertExactKeys("social encounter request output", cognition.result, ["decision","requestText","reason"]);
  if (!INITIATION_DECISIONS.includes(cognition.result.decision)) {
    throw new TypeError("social encounter request decision is invalid");
  }
  assertNonEmpty("social encounter request reason", cognition.result.reason);
  if (cognition.result.decision === "initiate") {
    assertNonEmpty("social encounter request requestText", cognition.result.requestText);
  } else if (cognition.result.requestText !== null) {
    throw new TypeError("not_initiate cannot carry request text");
  }

  return Object.freeze({
    decision:cognition.result.decision,
    requestText:cognition.result.requestText,
    reason:cognition.result.reason,
    cognition:Object.freeze({
      provider:cognition.provenance.provider,
      modelId:cognition.provenance.modelId,
      providerRequestId:cognition.provenance.providerRequestId ?? null,
      implementationProfile:structuredClone(cognition.implementationProfile),
      sourceThreadVersion:cognition.provenance.sourceThreadVersion,
      selectedEvidenceRefs:Object.freeze([...cognition.provenance.selectedEvidenceRefs]),
      evidenceRefs:Object.freeze([...cognition.evidenceRefs]),
      contextDigest:cognition.provenance.contextDigest,
    }),
  });
}

export async function formMeetingStance({
  thread,
  situation,
  plan,
  request,
  counterparties,
  relationships = [],
  semanticStates = [],
  memories = [],
  modelAdapter,
}) {
  assertPlainObject("meeting Thread", thread);
  assertId("meeting Thread.threadId", thread.threadId);
  assertPlainObject("meeting situation", situation);
  assertPlainObject("social encounter request", request);
  assertId("social encounter request.initiatorThreadId", request.initiatorThreadId);
  assertNonEmpty("social encounter request.text", request.text);
  if (request.initiatorThreadId === thread.threadId) {
    throw new TypeError("meeting invitee cannot respond to their own request");
  }
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
    socialRequest:structuredClone(request),
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
    systemPrompt:`You are one persistent Fibre Thread deciding how to respond to a concrete social request from a co-present Thread right now.
The supplied socialRequest is what the other Thread actually asked for. The currentSituation is World truth and the Flight Plan is this Thread's own intended life. A request creates no obligation to engage.
Choose accept, decline, or defer from this particular Thread's point of view after weighing the request against the current situation and the totality of the actual relationship/history supplied here: what the Thread is doing, interruption cost, remaining intentions, needs/feelings, remembered interactions, trust, fondness, resentment, obligations and established relationship facts. No single label or memory mechanically decides the outcome.
Ordinary civility creates social pressure to acknowledge a direct request, especially from someone with whom the Thread has an ongoing relationship, but civility is pressure rather than consent. The Thread may still decline or defer when busy, unwilling or otherwise disinclined. Its outward expression may be warm, polite, terse, sharp, or absent when ignoring the request is what this Thread would actually do.
decline means not now without proposing a concrete later time. defer means not now but with a plausible later time inside the supplied Flight Plan horizon when one is genuinely supported.
expression is the outward response, if any, and need not reveal private reasons.
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
    clientRequestId:requestId("meeting-stance", input),
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
