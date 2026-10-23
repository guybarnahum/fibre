import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";
import { runInteriorCognition } from "./interior-cognition.mjs";

const DECISIONS = Object.freeze(["accept", "decline", "defer"]);
const SOCIAL_ACTS = Object.freeze(["none","acknowledge","greet","remark","invite_conversation"]);

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
  instruction:`How, if at all, does this person engage the other person right now?
The range of ordinary choices includes no outward act, a brief non-verbal acknowledgment,
a greeting, a remark about the shared situation, or an invitation to converse.
Neither manufacture nor suppress interest; this person's own life, state, history and the setting decide.
For none, there is no expression or immediate personal Experience.
For acknowledge, express a brief gesture as an observer would see it.
For greet and remark, supply the short words actually said.
For invite_conversation, use a short spoken invitation clear enough to accept or decline.
For greet, remark and invite_conversation, introducesSelf may be true only if the
actual outward words plainly say this speaker's own name. Never disclose a name
from another person's identity record or merely imply an introduction.
For an outward act, experienceText is this person's concise first-person immediate experience
of choosing and doing it, not a permanent Memory or knowledge of another's feelings.
Place affordances are grounded possibilities, not rules or obligations.
Body interoception may shape interest but does not assert loneliness, consent, or a duty to engage.
RecentPersonalExperiences are this person's own admitted interpretations; they may influence
but do not command this choice. PriorSocialChoicesThisVisit records this person's own
earlier voluntary acts or silence toward the same person in this shared visit.
They are lived history, not an obligation to repeat or reverse any choice.
Do not invent private motives, relationships or company.`,
  resultSchema:{
    type:"object",additionalProperties:false,
    required:["act","expression","experienceText","reason"],
    properties:{
      act:{type:"string",enum:SOCIAL_ACTS},
      expression:{anyOf:[{type:"string",minLength:1,maxLength:500},{type:"null"}]},
      experienceText:{anyOf:[{type:"string",minLength:1,maxLength:1200},{type:"null"}]},
      reason:{type:"string",minLength:1,maxLength:500},
      introducesSelf:{type:"boolean"},
    },
  },
});

export function meetingPresenceCompatible(left, right, {
  leftWorldPlaces = [],
  rightWorldPlaces = [],
} = {}) {
  assertPlainObject("left current situation", left);
  assertPlainObject("right current situation", right);
  if (typeof left.mediatedContext === "string"
    && left.mediatedContext.trim() !== ""
    && left.mediatedContext === right.mediatedContext) return true;
  if (left.location?.kind !== "place" || right.location?.kind !== "place") return false;

  const leftVenue=leftWorldPlaces.find((place)=>
    place.ref===left.location.placeRef)?.physicalVenue?.ref;
  const rightVenue=rightWorldPlaces.find((place)=>
    place.ref===right.location.placeRef)?.physicalVenue?.ref;
  // Historical place descriptions are not evidence of a physical meeting.
  return typeof leftVenue==="string"&&leftVenue===rightVenue;
}

export async function formSocialEncounterRequest({
  threadId,
  at,
  plan,
  situatedPercept,
  interoception=null,
  recentPersonalExperiences=[],
  priorSocialChoicesThisVisit=[],
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
      focusPartyId:situatedPercept.observed[0].threadId,
      question:"How, if at all, do I engage this person right now?",
      externalContext:{
        situatedPercept:structuredClone(situatedPercept),
        recentPersonalExperiences:structuredClone(recentPersonalExperiences),
        priorSocialChoicesThisVisit:structuredClone(priorSocialChoicesThisVisit),
        ...(interoception===null?{}:{interoception:structuredClone(interoception)}),
        remainingFlightPlan:plan === null ? null : structuredClone(plan),
      },
    },
    adapter:SOCIAL_INITIATION_ADAPTER,
    sourceStores,
    modelAdapter,
  });

  assertPlainObject("social encounter request output", cognition.result);
  assertExactKeys("social act output",cognition.result,
    ["act","expression","experienceText","reason"]);
  if(!SOCIAL_ACTS.includes(cognition.result.act)){
    throw new TypeError("social act is invalid");
  }
  assertNonEmpty("social act reason",cognition.result.reason);
  const introducesSelf=cognition.result.introducesSelf??false;
  if(typeof introducesSelf!=="boolean"
    ||(introducesSelf&&!["greet","remark","invite_conversation"]
      .includes(cognition.result.act))){
    throw new TypeError("only a spoken social act can disclose the speaker's name");
  }
  if(introducesSelf){
    const name=sourceStores.worldStore.getThread(threadId)?.identity?.name;
    if(typeof name!=="string"||!name.trim()
      ||!cognition.result.expression?.toLocaleLowerCase()
        .includes(name.trim().toLocaleLowerCase())){
      throw new TypeError("self-introduction must audibly disclose the speaker's actual name");
    }
  }
  if(cognition.result.act==="none"){
    if(cognition.result.expression!==null||cognition.result.experienceText!==null){
      throw new TypeError("no social act cannot create outward speech or Experience");
    }
  }else{
    assertNonEmpty("social act expression",cognition.result.expression);
    assertNonEmpty("social act experience",cognition.result.experienceText);
  }

  return Object.freeze({
    act:cognition.result.act,
    introducesSelf,
    expression:cognition.result.expression,
    experienceText:cognition.result.experienceText,
    reason:cognition.result.reason,
    decisionContext:Object.freeze({
      interoception:interoception===null?null:structuredClone(interoception),
      observedThreadId:situatedPercept.observed[0]?.threadId??null,
      recentPersonalExperienceRefs:Object.freeze(recentPersonalExperiences
        .map(experience=>experience.experienceId).filter(Boolean)),
      priorSocialChoicesThisVisit:Object.freeze(
        structuredClone(priorSocialChoicesThisVisit)),
    }),
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

async function formSocialResponse({
  threadId,
  at,
  plan,
  socialRequest,
  observedContext,
  sourceStores,
  modelAdapter,
}) {
  const cognition = await runInteriorCognition({
    threadId,
    at,
    concern:{
      kind:"social_response",
      ...(observedContext.situatedPercept?.observed?.some(person=>
        person.threadId===socialRequest.initiatorThreadId)
        ?{focusPartyId:socialRequest.initiatorThreadId}:{}),
      question:"How do I want to respond to this concrete social request now?",
      externalContext:{
        socialRequest:structuredClone(socialRequest),
        ...structuredClone(observedContext),
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

  return formSocialResponse({
    threadId,
    at,
    plan,
    socialRequest:request,
    observedContext:{ situatedPercept },
    sourceStores,
    modelAdapter,
  });
}

export async function formVisitorMeetingStance({
  threadId,
  at,
  plan,
  situation,
  requestText,
  recentEncounterStories = [],
  sourceStores,
  modelAdapter,
}) {
  assertId("visitor meeting stance Thread.threadId", threadId);
  assertIsoTimestamp("visitor meeting stance at", at);
  assertPlainObject("visitor meeting current situation", situation);
  assertId("visitor meeting current situation.situationId", situation.situationId);
  if (situation.threadId !== threadId) {
    throw new TypeError("visitor meeting current situation belongs to another Thread");
  }
  assertNonEmpty("visitor social request", requestText);
  if (!Array.isArray(recentEncounterStories)) {
    throw new TypeError("visitor meeting recent Encounter Stories must be an array");
  }

  return formSocialResponse({
    threadId,
    at,
    plan,
    socialRequest:{
      requesterKind:"person",
      text:requestText.trim(),
    },
    observedContext:{
      currentSituation:structuredClone(situation),
      recentEncounterStories:structuredClone(recentEncounterStories),
    },
    sourceStores,
    modelAdapter,
  });
}
