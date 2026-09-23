import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";
import { placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";
import { runInteriorCognition } from "./interior-cognition.mjs";

const DECISIONS = Object.freeze(["accept", "decline", "defer"]);
const INITIATION_DECISIONS = Object.freeze(["initiate", "not_initiate"]);

const SOCIAL_RESPONSE_ADAPTER = Object.freeze({
  id:"social-response",
  instruction:`Decide how this Thread genuinely wants to respond to the concrete social request it just received.
The request is an actual outward social act and therefore warrants appraisal, but it creates no obligation to engage.
Choose accept, decline, or defer from this Thread's point of view after reconciling the observable situation, current life, developed self, relevant history and any genuine social or cultural pressure.
Ordinary civility, hospitality, reciprocity or relationship expectations may matter when grounded in this Thread's life, but they are pressures rather than consent rules.
decline means not now without proposing a concrete later time. defer means not now but with a plausible later time supported by the supplied Flight Plan.
expression is the outward reply, if any, and need not reveal private reasons.
reason is a concise private operator-facing explanation of the material considerations.
Do not change location, rewrite the Flight Plan, invent a relationship, expose private records, infer another person's private state, or accept merely to make an encounter happen.`,
  resultSchema:{
    type:"object",
    additionalProperties:false,
    required:["decision","expression","suggestedAt","reason"],
    properties:{
      decision:{ type:"string", enum:DECISIONS },
      expression:{ anyOf:[{ type:"string", minLength:1, maxLength:500 },{ type:"null" }] },
      suggestedAt:{ anyOf:[{ type:"string" },{ type:"null" }] },
      reason:{ type:"string", minLength:1, maxLength:500 },
    },
  },
});

const SOCIAL_INITIATION_ADAPTER = Object.freeze({
  id:"social-initiation",
  instruction:`Decide whether this Thread genuinely wants to initiate a small social encounter with this one co-present actor right now.
Co-presence creates an opportunity, not an obligation. Initiate only when the Thread actually wants something social from this actor now: attention, company, help, information, conversation, shared activity, or another concrete engagement grounded in the life already underway.
If initiating, write the short outward request this actor would actually hear. It must make the ask clear enough that they can meaningfully decide whether to engage.
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
  plan,
  situatedPercept,
  sourceStores,
  modelAdapter,
}) {
  assertId("social encounter initiator Thread.threadId", threadId);
  assertIsoTimestamp("social encounter at", at);
  assertPlainObject("social encounter Situated Percept", situatedPercept);
  if (situatedPercept.observerThreadId !== threadId) {
    throw new TypeError("social encounter Situated Percept belongs to another Thread");
  }
  if (!Array.isArray(situatedPercept.observed) || situatedPercept.observed.length !== 1) {
    throw new TypeError("social encounter initiation requires exactly one observed actor opportunity");
  }

  const cognition = await runInteriorCognition({
    threadId,
    at,
    concern:{
      kind:"social_initiation",
      question:"Do I want to ask this co-present actor for something now?",
      externalContext:{
        situatedPercept:structuredClone(situatedPercept),
        remainingFlightPlan:plan === null ? null : structuredClone(plan),
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
  threadId,
  at,
  plan,
  request,
  situatedPercept,
  sourceStores,
  modelAdapter,
}) {
  assertId("meeting stance Thread.threadId", threadId);
  assertIsoTimestamp("meeting stance at", at);
  assertPlainObject("social encounter request", request);
  assertId("social encounter request.initiatorThreadId", request.initiatorThreadId);
  assertNonEmpty("social encounter request.text", request.text);
  if (request.initiatorThreadId === threadId) {
    throw new TypeError("meeting invitee cannot respond to their own request");
  }
  assertPlainObject("meeting stance Situated Percept", situatedPercept);
  if (situatedPercept.observerThreadId !== threadId) {
    throw new TypeError("meeting stance Situated Percept belongs to another Thread");
  }
  if (!Array.isArray(situatedPercept.observed)
    || !situatedPercept.observed.some((candidate) => candidate.threadId === request.initiatorThreadId)) {
    throw new TypeError("meeting stance must observe the requesting Thread");
  }

  const cognition = await runInteriorCognition({
    threadId,
    at,
    concern:{
      kind:"social_response",
      question:"How do I want to respond to this concrete social request now?",
      externalContext:{
        socialRequest:structuredClone(request),
        situatedPercept:structuredClone(situatedPercept),
        remainingFlightPlan:plan === null ? null : structuredClone(plan),
      },
    },
    adapter:SOCIAL_RESPONSE_ADAPTER,
    sourceStores,
    modelAdapter,
  });

  assertPlainObject("meeting stance output", cognition.result);
  assertExactKeys("meeting stance output", cognition.result, [
    "decision","expression","suggestedAt","reason",
  ]);
  if (!DECISIONS.includes(cognition.result.decision)) {
    throw new TypeError("meeting stance decision is invalid");
  }
  if (cognition.result.expression !== null) {
    assertNonEmpty("meeting stance expression", cognition.result.expression);
  }
  assertNonEmpty("meeting stance reason", cognition.result.reason);
  if (cognition.result.suggestedAt !== null) {
    assertIsoTimestamp("meeting stance suggestedAt", cognition.result.suggestedAt);
    if (cognition.result.decision !== "defer") {
      throw new TypeError("only deferred meetings may suggest a time");
    }
    if (plan === null
      || Date.parse(cognition.result.suggestedAt) < Date.parse(at)
      || Date.parse(cognition.result.suggestedAt) > Date.parse(plan.horizonEnd)) {
      throw new TypeError("meeting stance suggested time must fit the current Flight Plan");
    }
  }
  if (cognition.result.decision === "defer" && cognition.result.suggestedAt === null) {
    throw new TypeError("deferred meeting requires a suggested time");
  }

  return Object.freeze({
    decision:cognition.result.decision,
    expression:cognition.result.expression,
    suggestedAt:cognition.result.suggestedAt,
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
