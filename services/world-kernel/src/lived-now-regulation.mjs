import {DEFAULT_ORGANISM_POLICY,normalizeOrganismPolicy} from "../../../core/src/organism-policy.mjs";
import { evaluateIntrinsicRegulation } from "../../../core/src/intrinsic-regulation.mjs";
import { selectRegulationAttention } from "../../../core/src/regulation-attention.mjs";
import { fade } from "../../../core/src/body-level.mjs";
import {
  assessFlightPlanPresence,
  observationFromCurrentSituation,
} from "./flight-plan-regulation.mjs";
import {
  interpretIntrinsicRegulation,
  projectInteroception,
} from "./interoceptive-cognition.mjs";
import { regulationOrganismTrace } from "./regulation-cycle.mjs";
import { wearinessOf } from "./engagement.mjs";
import { bondOf, conversationDepletion, expectedRegard, longingOf, regardOf, regardShown, selfStanding,
  SLIGHT_GAP, stingHalfLife,
  socialEnergyEvidence } from "./social-body.mjs";

let organismPolicy=DEFAULT_ORGANISM_POLICY;
export function configureWorldOrganismPolicy(value){
  organismPolicy=normalizeOrganismPolicy(value);
}
const MIN_SUSTAINED_SAMENESS_MS = 20 * 60 * 1000;
const MAX_CONTINUITY_WITNESSES = 64;

function sameParticipants(left = [], right = []) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((value, index) => value === b[index]);
}

export function classifyExplorationContinuity(previousSituation, currentSituation) {
  if (previousSituation === null || currentSituation === null) {
    return Object.freeze({ grounded:false, reason:"missing_situation" });
  }
  if (previousSituation.location?.kind !== "place" || currentSituation.location?.kind !== "place") {
    return Object.freeze({ grounded:false, reason:"not_at_place" });
  }
  if (previousSituation.location.placeRef !== currentSituation.location.placeRef) {
    return Object.freeze({ grounded:false, reason:"place_changed" });
  }
  if ((previousSituation.mediatedContext ?? null) !== (currentSituation.mediatedContext ?? null)) {
    return Object.freeze({ grounded:false, reason:"mediated_context_changed" });
  }
  if (previousSituation.activity !== currentSituation.activity) {
    return Object.freeze({ grounded:false, reason:"activity_changed" });
  }
  if (!sameParticipants(previousSituation.participantRefs ?? [], currentSituation.participantRefs ?? [])) {
    return Object.freeze({ grounded:false, reason:"participants_changed" });
  }

  const elapsedMs = Date.parse(currentSituation.establishedAt) - Date.parse(previousSituation.establishedAt);
  if (!Number.isFinite(elapsedMs)) {
    return Object.freeze({ grounded:false, reason:"invalid_elapsed_time" });
  }
  if (elapsedMs < MIN_SUSTAINED_SAMENESS_MS) {
    return Object.freeze({ grounded:false, reason:"elapsed_too_short", elapsedMs });
  }
  return Object.freeze({
    grounded:true,
    reason:"sustained_sameness",
    elapsedMs,
    evidenceRefs:Object.freeze([
      previousSituation.situationId,
      currentSituation.situationId,
    ]),
  });
}

export function explorationContinuityForLivedHistory({
  livedNowStore,
  currentSituation,
  maxWitnesses=MAX_CONTINUITY_WITNESSES,
}) {
  if (!livedNowStore || typeof livedNowStore.getPreviousSituation !== "function") {
    throw new TypeError("exploration continuity requires livedNowStore.getPreviousSituation()");
  }
  if (currentSituation === null) {
    return Object.freeze({ grounded:false, reason:"missing_situation" });
  }
  if (!Number.isSafeInteger(maxWitnesses) || maxWitnesses < 1) {
    throw new TypeError("exploration continuity maxWitnesses must be positive");
  }

  let before=currentSituation.establishedAt;
  let last=Object.freeze({ grounded:false,reason:"missing_situation" });
  for(let index=0;index<maxWitnesses;index+=1){
    const previous=livedNowStore.getPreviousSituation(currentSituation.threadId,before);
    if(previous===null){
      return last.reason==="elapsed_too_short"
        ?Object.freeze({ ...last, reason:"history_exhausted" })
        :last;
    }
    const classified=classifyExplorationContinuity(previous,currentSituation);
    if(classified.grounded)return classified;
    if(classified.reason!=="elapsed_too_short")return classified;
    last=classified;
    before=previous.establishedAt;
  }
  return Object.freeze({ ...last,grounded:false,reason:"history_limit" });
}

function sustainedLivedSameness(previousSituation, currentSituation) {
  return classifyExplorationContinuity(previousSituation, currentSituation).grounded;
}

export function explorationRegulationForLivedContinuity({
  thread,
  previousSituation,
  currentSituation,
}) {
  if (!thread || typeof thread !== "object" || typeof thread.threadId !== "string") {
    throw new TypeError("Thread is required for exploration regulation");
  }
  if (currentSituation?.threadId !== thread.threadId) {
    throw new TypeError("current situation must belong to the exploration-regulated Thread");
  }
  if (previousSituation !== null && previousSituation?.threadId !== thread.threadId) {
    throw new TypeError("previous situation must belong to the exploration-regulated Thread");
  }
  if (!sustainedLivedSameness(previousSituation, currentSituation)) return null;

  return evaluateIntrinsicRegulation({
    perceptFrame:{
      asOf:currentSituation.establishedAt,
      exploration:{ novelty:0 },
      evidenceRefs:[previousSituation.situationId, currentSituation.situationId],
    },
    runtimeBaselines:thread.genome?.runtimeBaselines ?? {},
    urgeProjection:thread.genome?.urgeProjection??null,
    organismPolicy,
  });
}

export function explorationInteroceptionForLivedContinuity(input) {
  const frame = explorationRegulationForLivedContinuity(input);
  return frame === null ? null : projectInteroception(frame);
}

export function explorationRegulationForLivedHistory(input) {
  return livedRegulationForLivedHistory({ ...input, experienceStore:null });
}

export function explorationInteroceptionForLivedHistory(input) {
  const frame=explorationRegulationForLivedHistory(input);
  return frame===null?null:projectInteroception(frame);
}

function requireMethod(owner, name) {
  if (!owner || typeof owner[name] !== "function") {
    throw new TypeError(`${name} is required for LivedNow regulation`);
  }
}

// What eases the need for company between real contact (presence), by what
// this Body inherited to want: time among people, and each message, as the
// share of what had built up that it takes away. "Known" means someone it
// knows must be there (any door open between them).
const EASE=Object.freeze({
  ambient_company:Object.freeze({company:1,message:0,known:false}),
  familiar_person:Object.freeze({company:1,message:0.5,known:true}),
  conversation:Object.freeze({company:0.25,message:0.5,known:false}),
  closeness:Object.freeze({company:1,message:0.25,known:true}),
});
const SPECIES_EASE=Object.freeze({company:0.5,message:0.5,known:true});
const easeOf=(thread)=>thread===null?SPECIES_EASE:EASE[locusOf(thread,"social_contact")?.orientation]??SPECIES_EASE;

// Bounded, provenance-bearing evidence of life without recorded reciprocal contact.
// This is not proof of subjective loneliness or a complete account of a person's social life.
export function socialContactEvidenceForLivedHistory({
  threadId,currentSituation,livedNowStore,experienceStore,asOf=currentSituation?.establishedAt,
  thread=null,
}) {
  if(currentSituation===null||experienceStore===null||experienceStore===undefined)return null;
  if(currentSituation.threadId!==threadId)throw new TypeError("social contact situation belongs to another Thread");
  requireMethod(livedNowStore,"getPreviousSituation");
  requireMethod(experienceStore,"listSocialInteractions");
  requireMethod(experienceStore,"listAcceptedHumanMeetings");
  requireMethod(experienceStore,"listReciprocalConversations");
  requireMethod(experienceStore,"listSocialExposures");
  const end=Date.parse(asOf);
  if(!Number.isFinite(end)||end<Date.parse(currentSituation.establishedAt))
    throw new TypeError("regulation asOf precedes the enacted present");
  let before=currentSituation.establishedAt;
  let observedStart=end;
  let firstRef=currentSituation.situationId;
  // The situations lived in the window, newest first, each until the next.
  const segments=[{situation:currentSituation,start:Date.parse(currentSituation.establishedAt),until:end}];
  // An unobserved long gap cannot be silently counted as deprivation.
  for(let i=0;i<8;i++){
    const prior=livedNowStore.getPreviousSituation(threadId,before);
    if(prior===null)break;
    const at=Date.parse(prior.establishedAt);
    if(!Number.isFinite(at)||at>=observedStart||observedStart-at>12*3600_000)break;
    segments.push({situation:prior,start:at,until:segments.at(-1).start});
    observedStart=at;
    firstRef=prior.situationId;
    before=prior.establishedAt;
  }
  if(end-observedStart<2*3600_000)return null;
  const recent=experienceStore.listSocialInteractions(threadId,{limit:8})
    .filter(item=>item.responseDecision==="accept")
    .map(item=>({ref:item.interactionId,occurredAt:item.occurredAt}));
  const window={since:new Date(observedStart).toISOString(),until:asOf};
  const human=experienceStore.listAcceptedHumanMeetings(threadId,{...window,limit:8})
    .map(item=>({ref:item.encounterRef,occurredAt:item.occurredAt}));
  // A conversation the Thread actually took part in is lived reciprocal contact,
  // whether it began by invitation or by choosing to continue an exchange.
  const conversed=experienceStore.listReciprocalConversations(threadId,{...window,limit:1})
    .map(item=>({ref:item.encounterRef,occurredAt:item.occurredAt}));
  const contact=[...recent,...human,...conversed].filter(item=>
    Date.parse(item.occurredAt)>=observedStart
    &&Date.parse(item.occurredAt)<=end)
    .sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt))[0]??null;
  const since=contact===null?observedStart:Date.parse(contact.occurredAt);
  const ease=easeOf(thread);
  // Since then the need builds hour by hour, more slowly among people for a
  // Body that is eased by them; each message sent or received takes away its
  // share of what had built up.
  const company=(segment)=>{
    const {situation}=segment;
    if(situation.location?.kind!=="place"||situation.wakefulness==="asleep")return false;
    const venueRef=livedNowStore.getWorldPlace?.(threadId,situation.location.placeRef,{required:false})
      ?.physicalVenue?.ref??null;
    if(venueRef===null||typeof livedNowStore.listCurrentVenueSituations!=="function")return false;
    const at=new Date(segment.until-1).toISOString();
    const others=livedNowStore.listCurrentVenueSituations({venueRef,at,limit:8,excludeThreadId:threadId});
    return ease.known
      ?others.some(other=>(experienceStore.listOpenDoors?.(threadId,other.threadId,{before:at})?.length??0)>0)
      :others.length>0;
  };
  const lived=segments.filter(segment=>segment.until>since).reverse()
    .map(segment=>({start:Math.max(since,segment.start),until:segment.until,
      rate:company(segment)?1-ease.company:1}));
  const messages=experienceStore.listSocialExposures(threadId,{...window,limit:16})
    .filter(item=>item.kind==="message"&&Date.parse(item.at)>since)
    .sort((a,b)=>a.at.localeCompare(b.at));
  let unmetMs=0,clock=since;
  const advance=(to)=>{
    for(const segment of lived)
      unmetMs+=Math.max(0,Math.min(to,segment.until)-Math.max(clock,segment.start))*segment.rate;
    clock=Math.max(clock,to);
  };
  for(const message of messages){
    advance(Date.parse(message.at));
    unmetMs*=1-ease.message;
  }
  advance(end);
  return Object.freeze({
    observedUnmetHours:Math.min(96,Math.max(0,unmetMs/3600_000)),
    // How fast it builds now, where this Thread is (1: as if alone).
    buildRate:lived.at(-1)?.rate??1,
    evidenceRefs:Object.freeze([...new Set([
      firstRef,currentSituation.situationId,
      ...(contact===null?[]:[contact.ref]),
      ...messages.slice(-2).map(message=>message.ref),
    ])]),
  });
}

// What this Body inherited in one family (its locus): the orientation, and
// the persistence that sets, for trust, how fast it forgives and, for
// attachment, how long longing lasts; nothing when inherited differences are
// switched off.
function locusOf(thread,family){
  if(organismPolicy.inheritedSpread===0)return null;
  const gene=(thread.genome?.urgeProjection??[]).find(item=>item.family===family)??null;
  return gene===null?null:{orientation:gene.orientation,
    persistence:(gene.positions?.persistence??0)*organismPolicy.inheritedSpread,
    selfRegard:(gene.positions?.selfRegard??0)*organismPolicy.inheritedSpread,
    stubbornness:(gene.positions?.stubbornness??0)*organismPolicy.inheritedSpread};
}
// The loci the social Body reads, for an operator's view of it.
export function socialBodyLoci(thread){
  return Object.freeze({trust:locusOf(thread,"trust"),standing:locusOf(thread,"standing"),
    exploration:locusOf(thread,"exploration")});
}
const trustLocus=(thread)=>locusOf(thread,"trust");
const standingLocus=(thread)=>locusOf(thread,"standing");
// How weary this Body is of what it has been going over (S5b).
const wearyOf=({thread,experienceStore,at})=>wearinessOf({experienceStore,threadId:thread.threadId,at,
  persistence:locusOf(thread,"exploration")?.persistence??0});
const selfOf=({thread,experienceStore,at})=>selfStanding({experienceStore,threadId:thread.threadId,at,
  standingLocus:standingLocus(thread)});

// Status felt toward each person (ADR-0037): where they stand, and the
// regard their latest acts showed against what this Body expected of them.
// A slight is less than expected, recognition more. Being corrected before
// others, left out, or refused by someone close stings at once.
// Each sting or warmth fades back at the Body's standing persistence (body
// levels B2): the gap an act opened, faded by the time since.
const STING=Object.freeze({corrected_publicly:"public_correction",left_out:"exclusion"});
function standingPercept({regards,bonds,self,at,standingLocus=null}){
  const bondFor=(personRef)=>bonds.find(item=>item.personRef===personRef)?.bond??0;
  const halfLife=stingHalfLife(standingLocus);
  const since=(when)=>Math.max(0,Date.parse(at)-Date.parse(when));
  const people=[],triggers=[];
  for(const {person,regard} of regards){
    const bond=bondFor(person.threadId);
    const expected=expectedRegard({status:regard.expectedFrom??regard.status??0,bond,self:self?.self??0});
    const acts=(regard.lately??[]).map(item=>({act:item.act,witnesses:item.witnesses??0,
      gap:rounded(fade(regardShown(item.act)-expected,since(item.at??at),halfLife))}));
    const slight=acts.filter(item=>item.gap< -SLIGHT_GAP).sort((a,b)=>a.gap-b.gap)[0]??null;
    const recognition=acts.filter(item=>item.gap>SLIGHT_GAP).sort((a,b)=>b.gap-a.gap)[0]??null;
    const evidenceRefs=[person.evidenceRef];
    if(slight!==null&&STING[slight.act])triggers.push({family:"standing_flare",kind:STING[slight.act],
      personRef:person.threadId,pressure:Math.min(1,-slight.gap),evidenceRefs});
    const refusal=regard.refusedAt?fade(bond,since(regard.refusedAt),halfLife):0;
    if(bond>0.3&&refusal>SLIGHT_GAP)triggers.push({family:"standing_flare",kind:"refusal_by_close_person",
      personRef:person.threadId,pressure:refusal,evidenceRefs});
    if((regard.status??0)!==0||slight!==null||recognition!==null)
      people.push({personRef:person.threadId,status:regard.status??0,slight,recognition,evidenceRefs});
  }
  return {people,triggers};
}

// The regard, and the doors open between them, that the Body's bond reads.
function regardWithDoors({thread,otherThreadId,experienceStore,at}){
  return {...regardOf({experienceStore,threadId:thread.threadId,otherThreadId,at,trustLocus:trustLocus(thread),
    standingLocus:standingLocus(thread)}),
    doors:experienceStore.listOpenDoors?.(thread.threadId,otherThreadId,{before:at})??[]};
}

// The standing part of a percept frame: self-status, status toward each
// person, and the stings a slight fires.
function standingFrame({self=null,people=null}){
  const frame={};
  if(self!==null&&(self.gap!==null||self.self!==0||(self.frustration?.level??0)>0)||(people?.standingPeople??[]).length>0){
    frame.standing={...(self===null?{}:{self:{self:self.self,gap:self.gap,acts:self.acts,
      ...(self.frustration?{frustration:{...self.frustration}}:{}),
      evidenceRefs:self.evidenceRefs.length>0?[...self.evidenceRefs]:["self:standing"]}}),
      people:people?.standingPeople??[]};
  }
  if((people?.urgeTriggers??[]).length>0)frame.urgeTriggers=people.urgeTriggers;
  return frame;
}

// How this Thread's Body takes the people it perceives now, each citing the
// World record of their presence: how far it trusts each one and what they
// did to it, curiosity toward anyone it hardly knows or has lost touch with
// (more than half unknown, now), and, toward someone it is bonded to, longing
// while apart and its relief on seeing them (a person is present unless
// marked otherwise, as a party one might write to is not).
const UNKNOWN_NOW_ABOVE=0.5;
const unknownNow=(regard)=>(1-regard.knowing)+0.5*regard.staleness;
const rounded=(value)=>Math.round(value*1e6)/1e6;
function peoplePercept({thread,people=[],experienceStore,at,known=null,self=null}){
  const regards=people.slice(0,4).filter(person=>person.threadId!==thread.threadId).map(person=>({person,
    regard:known??regardWithDoors({thread,otherThreadId:person.threadId,experienceStore,at})}));
  if(regards.length===0)return null;
  const attachment=locusOf(thread,"attachment_proximity");
  const bonds=regards.map(({person,regard})=>{
    const bond=bondOf({regard,doors:regard.doors??[]});
    return {personRef:person.threadId,bond,present:person.present!==false,
      longing:longingOf({bond,regard,orientation:attachment?.orientation??null,persistence:attachment?.persistence??0}),
      evidenceRefs:[person.evidenceRef]};
  }).filter(item=>item.bond>0);
  const standing=standingPercept({regards,bonds,self,at,standingLocus:standingLocus(thread)});
  const unfamiliarPeople=regards.filter(({regard})=>unknownNow(regard)>UNKNOWN_NOW_ABOVE)
    .map(({person,regard})=>({personRef:person.threadId,unfamiliarity:rounded(1-regard.knowing),
      staleness:regard.staleness,evidenceRefs:[person.evidenceRef]}));
  return {
    evidenceRefs:[...new Set(regards.map(({person})=>person.evidenceRef))],
    trust:regards.map(({person,regard})=>({personRef:person.threadId,trust:regard.trust,
      hurt:regard.hurt,revived:regard.revived,evidenceRefs:[person.evidenceRef]})),
    ...(bonds.length===0?{}:{bonds}),
    ...(standing.people.length===0?{}:{standingPeople:standing.people}),
    ...(standing.triggers.length===0?{}:{urgeTriggers:standing.triggers}),
    ...(unfamiliarPeople.length===0?{}:{
      exploration:{unfamiliarPeople},
      urgeAvailability:{exploration:{people:{state:"available",
        evidenceRefs:[...new Set(unfamiliarPeople.flatMap(person=>person.evidenceRefs))]}}},
    }),
  };
}

// One evidence-driven Body projection for planning and social attention.
// No extra model call, time tick, or family-specific consumer path.
export function livedRegulationForLivedHistory({
  thread,livedNowStore,currentSituation,experienceStore=null,
  asOf=currentSituation?.establishedAt,perceivedPeople=[],
}) {
  if(currentSituation===null)return null;
  if(thread?.threadId!==currentSituation.threadId){
    throw new TypeError("lived regulation situation belongs to another Thread");
  }
  if(!Number.isFinite(Date.parse(asOf))
    ||Date.parse(asOf)<Date.parse(currentSituation.establishedAt)){
    throw new TypeError("regulation asOf precedes the enacted present");
  }
  // A decision-time frame may evaluate elapsed life without authoring a
  // fictitious World situation. History lookup remains tied to real records.
  const decisionSituation=asOf===currentSituation.establishedAt
    ?currentSituation:{...currentSituation,establishedAt:asOf};
  const continuity=explorationContinuityForLivedHistory({
    livedNowStore,currentSituation:decisionSituation,
  });
  const contact=experienceStore===null?null:socialContactEvidenceForLivedHistory({
    threadId:thread.threadId,currentSituation,livedNowStore,experienceStore,asOf,thread,
  });
  const socialEnergy=experienceStore===null?null:socialEnergyEvidence({
    threadId:thread.threadId,experienceStore,asOf,trustLocus:trustLocus(thread),
  });
  // Where it feels it stands among the people it knows (ADR-0037), and how
  // weary it is of what it has been going over (S5b).
  const self=experienceStore===null?null:selfOf({thread,experienceStore,at:asOf});
  const weariness=experienceStore===null?0:wearyOf({thread,experienceStore,at:asOf});
  const people=experienceStore===null||perceivedPeople.length===0?null:peoplePercept({
    thread,people:perceivedPeople,experienceStore,at:asOf,self,
  });
  if(!continuity.grounded&&contact===null&&socialEnergy===null&&people===null&&self?.gap==null
    &&weariness===0)return null;
  return evaluateIntrinsicRegulation({
    perceptFrame:{
      asOf,
      evidenceRefs:[...new Set([
        ...(continuity.grounded?continuity.evidenceRefs:[]),
        ...(contact?.evidenceRefs??[]),
        ...(socialEnergy?.evidenceRefs??[]),
        ...(people?.evidenceRefs??[]),
      ])],
      exploration:{
        ...(continuity.grounded?{novelty:0}:{}),
        ...(people?.exploration??{}),
        ...(weariness>0?{weariness}:{}),
      },
      ...(people?.urgeAvailability===undefined?{}:{urgeAvailability:people.urgeAvailability}),
      ...(people===null?{}:{trust:people.trust}),
      ...(people?.bonds===undefined?{}:{bonds:people.bonds}),
      ...standingFrame({self,people}),
      ...(contact===null?{}:{contact}),
      ...(socialEnergy===null?{}:{socialEnergy}),
    },
    runtimeBaselines:thread.genome?.runtimeBaselines??{},
    urgeProjection:thread.genome?.urgeProjection??null,
    organismPolicy,
  });
}

// The social Body during a live conversation: the battery where it stood
// when the talk began, drained by each turn spoken or heard since, less as
// the other is known and trusted. How far it trusts them is felt too, and
// someone hardly known is a pull for a Body inherited to seek new people.
export function socialBodyInConversation({thread,start,regard,turns,asOf,other,self=null,talkedOverNow=0,
  heardNow=[],weariness=0}){
  const evidenceRefs=[...(start?.evidenceRefs??[]),`self:conversation-turns:${turns}`];
  // Being cut off in this very talk, and how the other's words just landed
  // (ADR-0037 C3b), are felt at once.
  const fresh=[...heardNow].reverse().map(item=>({act:item.act,by:"them",at:asOf,witnesses:item.witnesses??0}));
  const now=talkedOverNow===0&&fresh.length===0?regard:{...regard,lately:[...fresh,
    ...Array.from({length:talkedOverNow},()=>({act:"talked_over",by:"them",at:asOf,witnesses:0})),...(regard.lately??[])]};
  const {standingPeople,urgeTriggers,...people}=peoplePercept({thread,people:[other],at:asOf,known:now,self})??{};
  return evaluateIntrinsicRegulation({
    perceptFrame:{asOf,evidenceRefs,
      socialEnergy:{depletion:conversationDepletion({start,turns,...regard,weariness,
        frustration:self?.frustration?.level??0}),evidenceRefs},
      ...people,...standingFrame({self,people:{standingPeople,urgeTriggers}}),
      ...(weariness>0?{exploration:{...(people.exploration??{}),weariness}}:{})},
    runtimeBaselines:thread.genome?.runtimeBaselines??{},
    urgeProjection:thread.genome?.urgeProjection??null,
    organismPolicy,
  });
}

// Where a conversation's battery starts, and how known and trusted the other
// is, for this Thread's Body.
export function socialBodyBeforeTalk({thread,otherThreadId,experienceStore,asOf}){
  return {
    start:socialEnergyEvidence({threadId:thread.threadId,experienceStore,asOf,trustLocus:trustLocus(thread)}),
    regard:regardWithDoors({thread,otherThreadId,experienceStore,at:asOf}),
    self:selfOf({thread,experienceStore,at:asOf}),
    weariness:wearyOf({thread,experienceStore,at:asOf}),
  };
}

// How this Thread's Body takes the people it perceives now: how far it
// trusts each, and curiosity toward anyone it hardly knows.
export function bodyTowardPeople({thread,people,experienceStore,asOf}){
  const self=selfOf({thread,experienceStore,at:asOf});
  const percept=peoplePercept({thread,people,experienceStore,at:asOf,self});
  if(percept===null)return null;
  const {standingPeople,urgeTriggers,...rest}=percept;
  return evaluateIntrinsicRegulation({
    perceptFrame:{asOf,...rest,...standingFrame({self:null,people:{standingPeople,urgeTriggers}})},
    runtimeBaselines:thread.genome?.runtimeBaselines??{},
    urgeProjection:thread.genome?.urgeProjection??null,
    organismPolicy,
  });
}

export function livedInteroceptionForLivedHistory(input){
  const frame=livedRegulationForLivedHistory(input);
  return frame===null?null:projectInteroception(frame);
}

function frameForSituation({ thread, situation, livedNowStore, experienceStore }) {
  if (situation === null) return null;
  const plan = livedNowStore.latestPlan(thread.threadId, "personal", {
    at:situation.establishedAt,
  });
  if (plan === null) return null;

  const assessment = assessFlightPlanPresence({
    plan,
    at:situation.establishedAt,
    observation:observationFromCurrentSituation(situation),
  });
  if (assessment === null) return null;

  return evaluateIntrinsicRegulation({
    perceptFrame:{
      asOf:situation.establishedAt,
      evidenceRefs:[...situation.evidenceRefs],
      ...(experienceStore===null?{}:{
        contact:socialContactEvidenceForLivedHistory({
          threadId:thread.threadId,currentSituation:situation,livedNowStore,experienceStore,thread,
        })??undefined,
        socialEnergy:socialEnergyEvidence({
          threadId:thread.threadId,experienceStore,asOf:situation.establishedAt,
          trustLocus:trustLocus(thread),
        })??undefined,
      }),
    },
    targets:[assessment.presenceTarget],
    runtimeBaselines:thread.genome?.runtimeBaselines ?? {},
    urgeProjection:thread.genome?.urgeProjection??null,
    organismPolicy,
  });
}

export async function runLivedNowRegulationPulse({
  threadId,
  previousSituation,
  currentSituation,
  worldStore,
  livedNowStore,
  semanticStateStore,
  modelAdapter,
  experienceStore=null,
}) {
  requireMethod(worldStore, "getThread");
  requireMethod(livedNowStore, "latestPlan");
  requireMethod(semanticStateStore, "listCurrentState");
  requireMethod(semanticStateStore, "recordState");
  requireMethod(modelAdapter, "invoke");

  const thread = worldStore.getThread(threadId, { required:false });
  if (thread === null) throw new TypeError(`Thread ${threadId} was not found`);
  if (currentSituation?.threadId !== threadId) {
    throw new TypeError("current LivedNow situation must belong to the regulated Thread");
  }
  if (previousSituation !== null && previousSituation?.threadId !== threadId) {
    throw new TypeError("previous LivedNow situation must belong to the regulated Thread");
  }

  const currentFrame = frameForSituation({ thread, situation:currentSituation, livedNowStore, experienceStore });
  if (currentFrame === null) {
    return Object.freeze({
      attention:null,
      interpretation:null,
      organismTrace:null,
    });
  }

  // No prior lived state means there is no observed transition to interpret yet.
  const previousFrame = previousSituation === null
    ? structuredClone(currentFrame)
    : frameForSituation({ thread, situation:previousSituation, livedNowStore, experienceStore });

  const attention = selectRegulationAttention(previousFrame, currentFrame);
  if (attention === null) {
    return Object.freeze({
      attention:null,
      interpretation:null,
      organismTrace:null,
    });
  }

  const interpretation = await interpretIntrinsicRegulation({
    thread,
    regulationFrame:currentFrame,
    semanticStateStore,
    modelAdapter,
  });

  return Object.freeze({
    attention:structuredClone(attention),
    interpretation,
    organismTrace:regulationOrganismTrace({
      currentFrame,
      attention,
      interpretation,
      socialPresence:null,
    }),
  });
}
