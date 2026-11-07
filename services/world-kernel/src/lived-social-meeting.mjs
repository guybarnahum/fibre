import {
  formSocialEncounterRequest,
  formMeetingStance,
  meetingPresenceCompatible,
} from "./lived-meeting-cognition.mjs";
import { runThreadLiveSocialEncounter } from "./lived-social-live-encounter.mjs";
import { assertExpressionModelAdapter } from "./guardian-model-adapter.mjs";
import { appraiseEncounterAttention,admitEncounterAttention } from "./lived-encounter-attention.mjs";
import { queueThreadExperienceConsolidation } from "./lived-experience-consolidation-queue.mjs";
import { formThreadEncounterExperience } from "./lived-thread-experience-cognition.mjs";
import { createEncounterVisualization } from "./lived-encounter-visualization.mjs";
import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
} from "./persistence-common.mjs";
import { projectSituatedPercept } from "./situated-percept.mjs";
import { evaluateSalience } from "./salience-gate.mjs";
import { livedRegulationForLivedHistory } from "./lived-now-regulation.mjs";
import { projectInteroception } from "./interoceptive-cognition.mjs";
import { observablePerson } from "./world-observable-person.mjs";
import { socialVenueVisitSince } from "./world-social-opportunity.mjs";
import { lifeRelationId } from "./situated-life-domain.mjs";
import { selectDevelopedSelfEvidence } from "./interior-cognition.mjs";

const MEMORY_LIMIT = 6;
// How many of the people present one social consideration can hold at once.
const COMPANY_LIMIT = 5;
// Conversations do not yet record how long they last in World time; until
// they do, a Thread that spoke in one within this span is still in it.
const CONVERSATION_ENGAGEMENT_MS = 10*60_000;

function requireMethod(name, value, method) {
  if (value === null || typeof value !== "object" || typeof value[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
}

function rethrowSocialFailure(cause,counterpartyThreadId,salience){
  if(cause&&typeof cause==="object"){
    cause.fibreSocialCounterpartyThreadId=counterpartyThreadId;
    cause.fibreSocialSalience={
      outcome:salience.outcome,anchors:[...salience.anchors],
      sourceReferences:[...salience.sourceReferences],
      bodyAtGate:salience.bodyAtGate??null,
    };
  }
  throw cause;
}

// Several salient people: one combined witness of what made them material.
function companySalience(people){
  return Object.freeze({
    outcome:"salient",
    anchors:Object.freeze([...new Set(people.flatMap(person=>person.salience.anchors))]),
    sourceReferences:Object.freeze([...new Set(
      people.flatMap(person=>person.salience.sourceReferences))]),
    bodyAtGate:people[0].salience.bodyAtGate??null,
  });
}

function contextFor({ threadId, worldReader, livedNowStore, semanticStateStore, memoryStore }) {
  const thread = worldReader.getThread(threadId, { required:false });
  if (thread === null) throw new TypeError(`Thread ${threadId} was not found`);
  const situation = livedNowStore.getCurrentSituation(threadId);
  if (situation === null) throw new TypeError("social encounter requires LivedNow");
  return Object.freeze({
    thread:structuredClone(thread),
    situation:structuredClone(situation),
    semanticStates:Object.freeze(semanticStateStore.listCurrentState(threadId).map((state) => structuredClone(state))),
    memories:Object.freeze(memoryStore.listCurrentMemories(threadId,{inMind:"background",
      limit:MEMORY_LIMIT,
      newestFirst:true,
    }).map((memory) => structuredClone(memory))),
  });
}

function compatible(left, right, livedNowStore) {
  return meetingPresenceCompatible(left.situation, right.situation, {
    leftWorldPlaces:livedNowStore.listWorldPlaces(left.thread.threadId),
    rightWorldPlaces:livedNowStore.listWorldPlaces(right.thread.threadId),
  });
}

function recentPersonalExperiences(observerThreadId,percept,experienceStore){
  return percept.recentEvents.filter(event=>event.kind==="encounter")
    .flatMap(event=>{
      const attention=experienceStore.getThreadEncounterAttention(
        observerThreadId,event.ref,
      );
      if(attention?.outcome!=="noticed"
        ||typeof attention.experience?.experienceText!=="string")return [];
      return [{
        experienceId:attention.experience.experienceId,
        encounterRef:event.ref,occurredAt:event.occurredAt,
        experienceText:attention.experience.experienceText,
      }];
    });
}

function observedThread(context) {
  return Object.freeze({
    threadId:context.thread.threadId,
    name:context.thread.identity?.name ?? null,
    birthDate:context.thread.identity?.birthDate??null,
    sex:context.thread.identity?.sex??null,
    situation:context.situation,
  });
}

// A consented, actually recorded conversation can establish an acquaintance.
 // The LLM neither supplies a relation nor writes a subjective judgment here.
export function recordWorldAcquaintance({
  situatedLifeStore,worldReader,encounterStory,interaction=null,
  initiatorThreadId,counterpartyThreadId,at,venue=null,
}){
  if(!situatedLifeStore?.recordLifeRelation
    ||!situatedLifeStore?.lifeRelationHistory){
    throw new TypeError("World acquaintance requires situated life relation authority");
  }
  const participants=[initiatorThreadId,counterpartyThreadId];
  if(interaction?.responseDecision!=="accept"
    ||typeof interaction.interactionId!=="string"
    ||interaction.initiatorThreadId!==initiatorThreadId
    ||interaction.recipientThreadId!==counterpartyThreadId
    ||interaction.occurredAt!==encounterStory.occurredAt
    ||!encounterStory.story?.beats?.some(beat=>
      beat.kind==="utterance"&&beat.actorThreadId===initiatorThreadId)){
    throw new TypeError("acquaintance requires admitted accepted and spoken contact");
  }
  if(!participants.every(threadId=>encounterStory.threadPresence.some(
    item=>item.threadId===threadId))){
    throw new TypeError("acquaintance requires both participants in admitted Story");
  }
  for(const [threadId,otherId] of [
    [initiatorThreadId,counterpartyThreadId],
    [counterpartyThreadId,initiatorThreadId],
  ]){
    const relationId=lifeRelationId({
      threadId,relatedThreadId:otherId,relationKind:"social_contact",
    });
    const history=situatedLifeStore.lifeRelationHistory(
      threadId,relationId,{required:false},
    );
    const previous=history.at(-1)??null;
    if(previous?.sourceReferences.includes(encounterStory.encounterId))continue;
    const related=worldReader.getThread(otherId,{required:false});
    if(related===null)throw new TypeError("acquaintance counterpart was not found");
    const revision=(previous?.revision??0)+1;
    const sourceReferences=[...new Set([
      ...(previous?.sourceReferences??[]),
      encounterStory.encounterId,
      ...(interaction?.interactionId?[interaction.interactionId]:[]),
    ])];
    const factualRoleRefs=[...new Set([
      ...(previous?.factualRoleRefs??[]),encounterStory.encounterId,
      ...(venue===null?[]:[venue.ref]),
    ])];
    situatedLifeStore.recordLifeRelation({
      relationId,revision,
      ...(previous===null?{}:{supersedesRevision:previous.revision}),
      threadId,
      relatedParty:{partyId:otherId,kind:"thread",
        displayName:related.identity?.name??otherId},
      relationKind:"social_contact",geneticContributionRole:"none",
      factualRoleRefs,
      relationshipFacts:[
        "Met in conversation at "+(venue?.displayName??"a shared setting")+
          " on "+at.slice(0,10)+".",
        "Recorded conversations: "+revision+".",
        "Last met: "+at+".",
      ],
      sourceReferences,
      validFrom:previous?.validFrom??at,validTo:null,
      visibility:"private",status:"current",
      provenance:"world_recorded",recordedAt:at,
    });
  }
}

export function createSocialMeetingService({
  worldReader,
  livedNow,
  livedNowStore,
  identityStore,
  situatedLifeStore,
  semanticStateStore,
  memoryStore,
  experienceStore,
  embodimentStore=null,
  modelAdapter,
  liveEncounterRegistry = null,
  onExperienceQueued = null,
  onConversationEnded = null,
  boundedVenueDiscovery = false,
}) {
  requireMethod("worldReader", worldReader, "getThread");
  requireMethod("livedNow", livedNow, "ensure");
  requireMethod("livedNowStore", livedNowStore, "getCurrentSituation");
  requireMethod("livedNowStore", livedNowStore, "getPreviousSituation");
  requireMethod("livedNowStore", livedNowStore, "listCurrentSituations");
  if(boundedVenueDiscovery){
    requireMethod("livedNowStore",livedNowStore,"getWorldPlace");
    requireMethod("livedNowStore",livedNowStore,"listCurrentVenueSituations");
    requireMethod("livedNowStore",livedNowStore,"inspectLivedBoundary");
  }
  requireMethod("livedNowStore", livedNowStore, "listWorldPlaces");
  requireMethod("livedNowStore", livedNowStore, "latestPlan");
  requireMethod("identityStore", identityStore, "getCurrentIdentityView");
  requireMethod("situatedLifeStore", situatedLifeStore, "listCurrentLifeRelations");
  requireMethod("situatedLifeStore", situatedLifeStore, "listCurrentPlaceEpisodes");
  requireMethod("semanticStateStore", semanticStateStore, "listCurrentState");
  requireMethod("memoryStore", memoryStore, "listCurrentMemories");
  requireMethod("experienceStore", experienceStore, "recordEncounterStory");
  requireMethod("experienceStore", experienceStore, "listEncounterStories");
  requireMethod("experienceStore", experienceStore, "recordSocialInteraction");
  requireMethod("experienceStore", experienceStore, "enqueueObservedSocialOpportunity");
   requireMethod("experienceStore", experienceStore, "listSocialInteractions");
  requireMethod("experienceStore", experienceStore, "getThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "recordThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "queueThreadExperienceConsolidation");
  // Fail at composition, not silently mid-conversation: live speech streams
  // through this adapter and requires its provenance metadata.
  assertExpressionModelAdapter(modelAdapter);
  if (liveEncounterRegistry !== null && (
    typeof liveEncounterRegistry.register !== "function"
    || typeof liveEncounterRegistry.publishAfterthoughts !== "function"
  )) {
    throw new TypeError("social meeting liveEncounterRegistry must be null or expose register() and publishAfterthoughts()");
  }
  if (onConversationEnded !== null && typeof onConversationEnded !== "function") {
    throw new TypeError("social meeting onConversationEnded must be a function or null");
  }
  if (onExperienceQueued !== null && typeof onExperienceQueued !== "function") {
    throw new TypeError("social meeting onExperienceQueued must be a function or null");
  }

  function dueLife(threadId,at){
    if(!boundedVenueDiscovery)return false;
    const obligation=livedNowStore.inspectLivedBoundary(threadId);
    const dueAt=obligation?.dueAt??null;
    return (obligation?.failedAttempts??0)>0
      ||(dueAt!==null&&Date.parse(dueAt)<=Date.parse(at));
  }

  async function currentContext(threadId, at) {
    if(boundedVenueDiscovery){
      // Social judgment reads World. A party with unprocessed life is not
      // eligible; the separate life engine alone authors the next situation.
      if(dueLife(threadId,at))return null;
    }else{
      await livedNow.ensure({ threadId, at });
    }
    return contextFor({
      threadId,
      worldReader,
      livedNowStore,
      semanticStateStore,
      memoryStore,
    });
  }

  // Someone who has just been talking with another person is still in that
  // conversation; they cannot hold a second private one meanwhile.
  function inConversation(threadId,at){
    if(!boundedVenueDiscovery)return false;
    const instant=Date.parse(at);
    return experienceStore.listEncounterStories(threadId,{limit:8}).some(story=>{
      const elapsed=instant-Date.parse(story.occurredAt);
      if(elapsed<0||elapsed>CONVERSATION_ENGAGEMENT_MS)return false;
      const speakers=new Set(story.story.beats
        .filter(beat=>beat.kind==="utterance"&&beat.actorThreadId!==null)
        .map(beat=>beat.actorThreadId));
      return speakers.has(threadId)&&speakers.size>1;
    });
  }

  // The Thread's own earlier choices this visit toward anyone now in view.
  function priorChoices(threadId,companyIds,visitSince){
    const seen=new Map();
    for(const counterpartyThreadId of companyIds){
      for(const choice of experienceStore.socialChoicesThisVisit({
        threadId,counterpartyThreadId,visitSince,
      }))seen.set(choice.at+"|"+(choice.towardThreadId??""),choice);
    }
    return [...seen.values()].sort((a,b)=>a.at.localeCompare(b.at)).slice(-6);
  }

  async function discoverCoPresent(initiator, at, counterpartyThreadId=null, companyThreadIds=null) {
    // Indexed venue authority finds current people, including long-stayers.
    // Explicit /meet retains its existing general discovery semantics.
    const venue=boundedVenueDiscovery&&initiator.situation.location?.kind==="place"
      ?livedNowStore.getWorldPlace(
        initiator.thread.threadId,initiator.situation.location.placeRef,
        {required:false},
      )?.physicalVenue?.ref??null:null;
    // An arrival actually noticed by someone earns consideration of that
    // specific other person, not an arbitrary first person at the venue.
    // Confirm actual present place again: observation does not grant contact.
    const target=counterpartyThreadId===null?null
      :livedNowStore.getCurrentSituation(counterpartyThreadId);
    const targetVenue=target?.location?.kind==="place"
      ?livedNowStore.getWorldPlace(
        counterpartyThreadId,target.location.placeRef,{required:false},
      )?.physicalVenue?.ref??null:null;
    const atVenue=situation=>situation!==null&&situation.wakefulness!=="asleep"
      &&situation.location?.kind==="place"&&venue!==null
      &&livedNowStore.getWorldPlace(situation.threadId,situation.location.placeRef,
        {required:false})?.physicalVenue?.ref===venue;
    const situations=companyThreadIds!==null
      // The company present when this chance was earned, still here now.
      ?companyThreadIds.map(threadId=>livedNowStore.getCurrentSituation(threadId))
        .filter(atVenue)
      :counterpartyThreadId!==null
      ?target!==null&&target.wakefulness!=="asleep"&&venue!==null&&venue===targetVenue
        ?[target]:[]
      :boundedVenueDiscovery
        ?venue===null?[]:livedNowStore.listCurrentVenueSituations({
          venueRef:venue,at,limit:8,excludeThreadId:initiator.thread.threadId,
        })
        :livedNowStore.listCurrentSituations({at,livingOnly:true});
    const candidates = situations
      .filter((situation) => situation.threadId !== initiator.thread.threadId
        &&situation.wakefulness!=="asleep");
    if(boundedVenueDiscovery&&counterpartyThreadId===null&&candidates.length>1){
      // The arriver already noticed this objective scene. Consider captured
      // witnesses before other nearby people, not arbitrary Thread ID order.
      // Noticing the scene does not mean the observer chose to engage anyone.
      const noticed=new Set(experienceStore.listEncounterStories(
        initiator.thread.threadId,{limit:8},
      ).filter(story=>Date.parse(story.occurredAt)<=Date.parse(at)
        &&Date.parse(at)-Date.parse(story.occurredAt)<=60*60_000
        &&story.threadPresence.some(person=>person.threadId===initiator.thread.threadId
          &&person.situationId===initiator.situation.situationId)
        &&story.story.beats.some(beat=>beat.kind==="action"
          &&beat.actorThreadId===initiator.thread.threadId)
        &&experienceStore.getThreadEncounterAttention(
          initiator.thread.threadId,story.encounterId,
        )?.outcome==="noticed")
        .flatMap(story=>story.story.beats.filter(beat=>beat.kind==="occurrence")
          .map(beat=>beat.actorThreadId)));
      candidates.sort((a,b)=>Number(noticed.has(b.threadId))
        -Number(noticed.has(a.threadId)));
    }
    const discovered = [];

    for (const candidateSituation of candidates) {
      const candidateThread = worldReader.getThread(candidateSituation.threadId, { required:false });
      if (candidateThread === null) continue;
      const candidate = Object.freeze({
        thread:structuredClone(candidateThread),
        situation:structuredClone(candidateSituation),
        semanticStates:Object.freeze([]),
        memories:Object.freeze([]),
      });
      if (!compatible(initiator, candidate, livedNowStore)) continue;

      // People already talking with someone else are occupied, not company
      // to be approached; a specific person who addressed this Thread stays.
      if(boundedVenueDiscovery&&counterpartyThreadId===null
        &&inConversation(candidateSituation.threadId,at))continue;
      const refreshed = await currentContext(candidateSituation.threadId, at);
      if (refreshed!==null&&compatible(initiator, refreshed, livedNowStore)) {
        discovered.push(refreshed);
        // The Thread considers the people present together, a bounded few.
        if(boundedVenueDiscovery&&(counterpartyThreadId!==null
          ||discovered.length>=COMPANY_LIMIT))break;
      }
    }

    return Object.freeze(discovered);
  }

  // A shared visit starts when the second person entered this uninterrupted
  // venue stay. Beyond the bounded situation history we cannot prove the
  // beginning, so decline to create further reply opportunities.
  function sharedVisitSince(left,right,venue){
    const a=socialVenueVisitSince(livedNowStore,left.situation,venue);
    const b=socialVenueVisitSince(livedNowStore,right.situation,venue);
    return a===null||b===null?null
      :new Date(Math.max(Date.parse(a),Date.parse(b))).toISOString();
  }

  // One bounded look at actual spoken World Stories. A response alone is
  // never consent; only this Thread's earlier speech makes continuation a
  // possible choice within the same proven shared visit.
  function ongoingExchange({initiator,counterparty,at,sourceKind,sourceEncounterRef}){
    if(sourceKind!=="social_act"||sourceEncounterRef===null
      ||!experienceStore.isClaimedSpokenSocialOpportunity?.({
        encounterRef:sourceEncounterRef,
        threadId:initiator.thread.threadId,
        counterpartyThreadId:counterparty.thread.threadId,
      }))return null;
    const venue=initiator.situation.location?.kind==="place"
      ?livedNowStore.getWorldPlace(initiator.thread.threadId,
        initiator.situation.location.placeRef,{required:false})?.physicalVenue?.ref??null
      :null;
    const since=venue===null?null:sharedVisitSince(initiator,counterparty,venue);
    if(since===null)return null;
    const first=initiator.thread.threadId,second=counterparty.thread.threadId;
    const pairStory=story=>story.threadPresence.length===2
      &&[first,second].every(id=>story.threadPresence.some(p=>p.threadId===id))
      &&story.story.beats.length===1&&story.story.beats[0].kind==="utterance"
      &&typeof story.story.beats[0].spokenText==="string"
      &&story.story.beats[0].spokenText.trim()!==""
      &&[first,second].includes(story.story.beats[0].actorThreadId)
      &&Date.parse(story.occurredAt)>=Date.parse(since)
      &&Date.parse(story.occurredAt)<=Date.parse(at);
    const source=experienceStore.getEncounterStory(sourceEncounterRef);
    if(!source||!pairStory(source)
      ||source.story.beats[0].actorThreadId!==second
      ||experienceStore.getThreadEncounterAttention(first,sourceEncounterRef)
        ?.outcome!=="noticed")return null;
    // Only inspect the tiny recent exchange when the incoming act actually
    // qualifies; gestures and unrelated World events cost a single lookup.
    const stories=experienceStore.listEncounterStories(first,{limit:12})
      .filter(pairStory).reverse();
    if(!stories.some(story=>story.story.beats[0].actorThreadId===first
      &&Date.parse(story.occurredAt)<Date.parse(source.occurredAt)))return null;
    return Object.freeze({
      utterance:source.story.beats[0].spokenText,
      storyRefs:Object.freeze(stories.filter(story=>
        Date.parse(story.occurredAt)<=Date.parse(source.occurredAt))
        .map(story=>story.encounterId)),
    });
  }

  async function enactSmallSocialAct({initiator,counterparty,at,salience,initiation}){
    const currentLeft=contextFor({
      threadId:initiator.thread.threadId,worldReader,livedNowStore,
      semanticStateStore,memoryStore,
    });
    const currentRight=contextFor({
      threadId:counterparty.thread.threadId,worldReader,livedNowStore,
      semanticStateStore,memoryStore,
    });
    if((boundedVenueDiscovery&&(dueLife(initiator.thread.threadId,at)
      ||dueLife(counterparty.thread.threadId,at)))
      ||currentLeft.situation.situationId!==initiator.situation.situationId
      ||currentRight.situation.situationId!==counterparty.situation.situationId
      ||!compatible(currentLeft,currentRight,livedNowStore)){
      return Object.freeze({
        counterpartyThreadId:counterparty.thread.threadId,
        outcome:"scene_changed",salience,initiation,
        request:null,stance:null,encounterStory:null,aftermath:null,
      });
    }
    const place=currentLeft.situation.location?.kind==="place"
      ?livedNowStore.getWorldPlace(currentLeft.thread.threadId,
        currentLeft.situation.location.placeRef,{required:false}):null;
    const venue=place?.physicalVenue?.ref??null;
    const gesture=initiation.act==="acknowledge";
    const description=observablePerson({
      threadId:currentLeft.thread.threadId,situation:currentLeft.situation,
      name:currentLeft.thread.identity?.name??null,
      birthDate:currentLeft.thread.identity?.birthDate??null,
      sex:currentLeft.thread.identity?.sex??null,at,embodimentStore,
    }).observableDescription;
    const described=description[0].toUpperCase()+description.slice(1);
    const story={storyVersion:"encounter-story-v0.1",beats:[{
      actorThreadId:currentLeft.thread.threadId,
      kind:gesture?"action":"utterance",
      // The cognition result is the observable act, not a conditional
      // intention attributed to the actor by a narrative wrapper.
      text:gesture?described+" "+initiation.expression[0].toLowerCase()+initiation.expression.slice(1)
        :described+' says: "'+initiation.expression+'"',
      ...(gesture?{}:{spokenText:initiation.expression}),
      ...(initiation.disclosedName?{
        disclosesSpeakerName:true,disclosedName:initiation.disclosedName,
      }:{}),
    }]};
    const encounterStory=experienceStore.recordEncounterStory({
      occurredAt:at,
      threadPresence:[currentLeft,currentRight].map(person=>({
        threadId:person.thread.threadId,situationId:person.situation.situationId,
      })).sort((a,b)=>a.threadId.localeCompare(b.threadId)),
      story,
      visualization:createEncounterVisualization({
        occurredAt:at,story,
        scene:place?.physicalVenue?.displayName
          ?"At "+place.physicalVenue.displayName+"."
          :currentLeft.situation.mediatedContext
            ?"During "+currentLeft.situation.mediatedContext+"."
            :"Within the shared observed situation.",
        sourceReferences:[
          currentLeft.situation.situationId,currentRight.situation.situationId,
          ...(venue===null?[]:[venue]),
        ],
        depictedThreadRefs:[],
      }),
    });
    const own=experienceStore.recordThreadEncounterAttention({
      threadId:currentLeft.thread.threadId,
      encounterRef:encounterStory.encounterId,
      situationId:currentLeft.situation.situationId,
      occurredAt:at,outcome:"noticed",
      experienceText:initiation.experienceText,
    });
    await queueThreadExperienceConsolidation({
      experienceStore,experienceRecord:own.experience,queuedAt:at,
      onQueued:onExperienceQueued,
    });
    const attention=await admitEncounterAttention({
      thread:currentRight.thread,situation:currentRight.situation,encounterStory,
      semanticStates:currentRight.semanticStates,
      memories:currentRight.memories,
      experienceStore,modelAdapter,onExperienceQueued,
    });
    if(attention.outcome==="noticed"&&venue!==null){
      const since=sharedVisitSince(currentLeft,currentRight,venue,at);
      if(since!==null){
        experienceStore.enqueueObservedSocialOpportunity({
          encounterRef:encounterStory.encounterId,
          threadId:currentRight.thread.threadId,
          situationId:currentRight.situation.situationId,
          counterpartyThreadId:currentLeft.thread.threadId,
          venueRef:venue,dueAt:at,sourceKind:"social_act",visitSince:since,
        });
      }
    }
    return Object.freeze({
      counterpartyThreadId:counterparty.thread.threadId,
      outcome:"acted",salience,initiation,
      request:null,stance:null,encounterStory,aftermath:null,
    });
  }

  async function formAcceptedEncounter({
    initiator,
    counterparty,
    witnesses,
    at,
    salience,
    initiation,
    request,
    stance,
    interaction,
    continuation=null,
  }) {
    const latestInitiator=contextFor({
      threadId:initiator.thread.threadId,
      worldReader,
      livedNowStore,
      semanticStateStore,
      memoryStore,
    });
    const latestCounterparty=contextFor({
      threadId:counterparty.thread.threadId,
      worldReader,
      livedNowStore,
      semanticStateStore,
      memoryStore,
    });
    const sceneMoved=(boundedVenueDiscovery&&(dueLife(initiator.thread.threadId,at)
      ||dueLife(counterparty.thread.threadId,at)))
      ||latestInitiator.situation.situationId!==initiator.situation.situationId
      ||latestCounterparty.situation.situationId!==counterparty.situation.situationId
      ||!compatible(latestInitiator,latestCounterparty,livedNowStore);
    if(sceneMoved){
      return Object.freeze({
        counterpartyThreadId:counterparty.thread.threadId,
        outcome:"scene_changed",
        salience,
        initiation,
        request,
        stance,
        encounterStory:null,
        live:null,
        aftermath:null,
      });
    }

    // Each participant speaks from its own developed self, oriented toward the
    // person in front of it, and perceives that person only as it can.
    const personAsPerceivedBy=(observer,other)=>{
      const person=observablePerson({
        ...observedThread(other),observerThreadId:observer.thread.threadId,at,
        embodimentStore,situatedLifeStore,experienceStore,
      });
      const noticed=experienceStore.listNoticedSharedHistory?.(
        observer.thread.threadId,other.thread.threadId,{before:at,limit:2},
      )??[];
      return Object.freeze({
        threadId:other.thread.threadId,
        name:person.name,
        appearance:person.observableDescription,
        noticedBefore:noticed.map(item=>({occurredAt:item.occurredAt,experiencedAs:item.experienceText})),
      });
    };
    const speakerFacing=(self,other)=>Object.freeze({
      ...self,
      perspective:Object.freeze({
        developedSelfEvidence:selectDevelopedSelfEvidence({
          threadId:self.thread.threadId,at,focusPartyId:other.thread.threadId,
          sourceStores:{
            worldStore:worldReader,identityStore,semanticStateStore,
            memoryStore,situatedLifeStore,experienceStore,
          },
        }),
        placeName:self.situation.location?.kind==="place"
          ?livedNowStore.getWorldPlace?.(self.thread.threadId,self.situation.location.placeRef,
            {required:false})?.displayName??null:null,
        counterparts:Object.freeze([personAsPerceivedBy(self,other)]),
      }),
    });
    const participantContexts = [
      speakerFacing(latestInitiator,latestCounterparty),
      speakerFacing(latestCounterparty,latestInitiator),
    ];
    const allContexts = [...participantContexts, ...witnesses];
    const liveResult=await runThreadLiveSocialEncounter({
      initiator:participantContexts[continuation===null?0:1],
      counterparty:participantContexts[continuation===null?1:0],
      request,
      stance,
      modelAdapter,
      liveEncounterRegistry,
    });
    // How the conversation ended (by quiet, a turn limit, a changed scene),
    // for operators; no words.
    onConversationEnded?.(Object.freeze({endedBy:liveResult.live.endedBy,
      opportunities:liveResult.live.opportunityAppraisals,
      contributions:liveResult.live.contributionCount}));
    const story=initiation.disclosedName?{
      ...liveResult.story,
      beats:liveResult.story.beats.map(beat=>
        beat.actorThreadId===initiator.thread.threadId
        &&beat.kind==="utterance"
        &&beat.text===(continuation===null?request.text:stance.expression)
          ?{...beat,disclosesSpeakerName:true,
            disclosedName:initiation.disclosedName}:beat),
    }:liveResult.story;

    const threadPresence = allContexts.map((context) => ({
      threadId:context.thread.threadId,
      situationId:context.situation.situationId,
    }));
    const depictedThreadRefs = [...new Set(
      story.beats.map((beat) => beat.actorThreadId).filter((threadId) => threadId !== null),
    )];
    const encounterStory = experienceStore.recordEncounterStory({
      occurredAt:at,
      threadPresence,
      story,
      visualization:createEncounterVisualization({
        occurredAt:at,
        story,
        scene:"A small social encounter among people whose independent World-owned current situations establish compatible presence.",
        sourceReferences:[...threadPresence.map((presence) => presence.situationId),
          ...(continuation?.storyRefs??[])],
        depictedThreadRefs,
      }),
    });

    experienceStore.supersedePairSocialOpportunities?.({
      threadIds:[initiator.thread.threadId,counterparty.thread.threadId],
      at,encounterRef:encounterStory.encounterId,
    });
    const place=latestInitiator.situation.location?.kind==="place"
      ?livedNowStore.getWorldPlace?.(
        initiator.thread.threadId,latestInitiator.situation.location.placeRef,
        {required:false},
      )??null:null;
    if(continuation===null)recordWorldAcquaintance({
      situatedLifeStore,worldReader,encounterStory,interaction,
      initiatorThreadId:initiator.thread.threadId,
      counterpartyThreadId:counterparty.thread.threadId,at,
      venue:place?.physicalVenue??null,
    });

    const aftermath = {};
    for (const context of participantContexts) {
      const experienceText = await formThreadEncounterExperience({
        thread:context.thread,
        situation:context.situation,
        encounterStory,
        others:context.perspective.counterparts,
        semanticStates:context.semanticStates,
        memories:context.memories,
        modelAdapter,
      });
      const attention = experienceStore.recordThreadEncounterAttention({
        threadId:context.thread.threadId,
        encounterRef:encounterStory.encounterId,
        situationId:context.situation.situationId,
        occurredAt:encounterStory.occurredAt,
        outcome:"noticed",
        experienceText,
      });
      await queueThreadExperienceConsolidation({
        experienceStore,
        experienceRecord:attention.experience,
        queuedAt:encounterStory.occurredAt,
        onQueued:onExperienceQueued,
      });
      aftermath[context.thread.threadId] = null;
    }

    for (const context of witnesses) {
      const existing = experienceStore.getThreadEncounterAttention(
        context.thread.threadId,
        encounterStory.encounterId,
      );
      if (existing !== null) {
        if(existing.outcome==="noticed"){
          await queueThreadExperienceConsolidation({
            experienceStore,
            experienceRecord:existing.experience,
            queuedAt:existing.occurredAt,
            onQueued:onExperienceQueued,
          });
        }
        aftermath[context.thread.threadId] = null;
        continue;
      }

      const appraisal = await appraiseEncounterAttention({
        thread:context.thread,
        situation:context.situation,
        encounterStory,
        semanticStates:context.semanticStates,
        memories:context.memories,
        modelAdapter,
      });
      const attention = experienceStore.recordThreadEncounterAttention({
        threadId:context.thread.threadId,
        encounterRef:encounterStory.encounterId,
        situationId:context.situation.situationId,
        occurredAt:encounterStory.occurredAt,
        outcome:appraisal.outcome,
        experienceText:appraisal.experienceText,
        passedReason:appraisal.passedReason,
      });
      if(attention.outcome==="noticed"){
        await queueThreadExperienceConsolidation({
          experienceStore,
          experienceRecord:attention.experience,
          queuedAt:encounterStory.occurredAt,
          onQueued:onExperienceQueued,
        });
      }
      aftermath[context.thread.threadId] = null;
    }

    return Object.freeze({
      counterpartyThreadId:counterparty.thread.threadId,
      outcome:"met",
      salience,
      initiation,
      request,
      stance,
      encounterStory,
      live:liveResult.live,
      aftermath:Object.freeze(aftermath),
    });
  }

  return Object.freeze({
    async meet(input) {
      assertPlainObject("social meeting input", input);
      const counterpartyThreadId=input.counterpartyThreadId??null;
      const companyThreadIds=input.companyThreadIds??null;
      const visitSince=input.reconsiderationVisitSince??null;
      const sourceKind=input.sourceKind??null;
      const sourceEncounterRef=input.sourceEncounterRef??null;
      assertExactKeys("social meeting input", input,
        sourceKind!==null
          ?["initiatorThreadId","at","counterpartyThreadId","sourceKind","sourceEncounterRef"]
          :visitSince!==null
            ?["initiatorThreadId","at",
              companyThreadIds!==null?"companyThreadIds":"counterpartyThreadId",
              "reconsiderationVisitSince"]
            :counterpartyThreadId===null
              ?["initiatorThreadId","at"]
              :["initiatorThreadId","at","counterpartyThreadId"]);
      if(visitSince!==null)assertIsoTimestamp("social revisit start",visitSince);
      if(companyThreadIds!==null){
        if(!boundedVenueDiscovery||!Array.isArray(companyThreadIds)
          ||companyThreadIds.length===0)
          throw new TypeError("a social company is the people present at a venue");
        for(const threadId of companyThreadIds){
          assertId("social company member",threadId);
          if(threadId===input.initiatorThreadId)
            throw new TypeError("a Thread cannot socially meet itself");
        }
      }
      assertId("social meeting initiatorThreadId", input.initiatorThreadId);
      assertIsoTimestamp("social meeting at", input.at);
      if(counterpartyThreadId!==null){
        assertId("observed counterparty",counterpartyThreadId);
        if(counterpartyThreadId===input.initiatorThreadId){
          throw new TypeError("a Thread cannot socially meet itself");
        }
      }

      const initiator = await currentContext(input.initiatorThreadId, input.at);
      if(initiator===null)return Object.freeze({
        outcome:"not_met",discoveredThreadIds:Object.freeze([]),
        attempts:Object.freeze([]),encounterCount:0,
      });
      const discovered = await discoverCoPresent(
        initiator,input.at,counterpartyThreadId,companyThreadIds,
      );
      const perceived = projectSituatedPercept({
        observerThreadId:initiator.thread.threadId,
        situation:initiator.situation,
        at:input.at,
        observedThreads:discovered.map(observedThread),
        situatedLifeStore,
        livedNowStore,
        embodimentStore,
        experienceStore,
      });
      const opportunities = perceived.opportunities.filter((opportunity) =>
        opportunity.kind === "actor_presence" && opportunity.actorKind === "thread");
      const regulationFrame = livedRegulationForLivedHistory({
        thread:initiator.thread,
        livedNowStore,
        currentSituation:initiator.situation,
        experienceStore,asOf:boundedVenueDiscovery?input.at:initiator.situation.establishedAt,
      });

      const discoveredById = new Map(discovered.map((context) => [
        context.thread.threadId,
        context,
      ]));
      const attemptByActor = new Map();
      const accepted = [];
      // Facing a whole scene, the Thread considers the salient people
      // together and itself chooses whom, if anyone, to engage.
      const scene=boundedVenueDiscovery&&counterpartyThreadId===null;
      const initiatorTalking=inConversation(initiator.thread.threadId,input.at);

      const salient=[];
      for (const opportunity of opportunities) {
        const counterparty = discoveredById.get(opportunity.actorRef);
        if (counterparty === undefined) continue;
        const situatedPercept = projectSituatedPercept({
          observerThreadId:initiator.thread.threadId,
          situation:initiator.situation,
          at:input.at,
          observedThreads:[observedThread(counterparty)],
          situatedLifeStore,
          livedNowStore,
          embodimentStore,
          experienceStore,
        });
        const actorOpportunity = situatedPercept.opportunities[0];
        const salience = evaluateSalience({
          opportunity:actorOpportunity,
          situatedPercept,
          regulationFrame,
        });

        if (salience.outcome === "background") {
          attemptByActor.set(counterparty.thread.threadId, Object.freeze({
            counterpartyThreadId:counterparty.thread.threadId,
            outcome:"background",
            salience,
            initiation:null,
            request:null,
            stance:null,
            encounterStory:null,
            aftermath:null,
          }));
          continue;
        }
        salient.push(Object.freeze({counterparty,situatedPercept,salience}));
      }

      const considerations=scene&&salient.length>1
        ?[salient.slice(0,COMPANY_LIMIT)]:salient.map(person=>[person]);
      for (const consideration of considerations) {
        const single=consideration.length===1?consideration[0]:null;
        const company=consideration.map(person=>person.counterparty);
        const companyIds=company.map(person=>person.thread.threadId);
        let salience=single?.salience??companySalience(consideration);
        try{
        // An observed arrival or small act is a new opportunity inside
        // the same shared visit; the observer owns their earlier choices.
        // Explicit reconsideration already supplies its witnessed start.
        const venue=boundedVenueDiscovery&&counterpartyThreadId!==null
          &&initiator.situation.location?.kind==="place"
          ?livedNowStore.getWorldPlace(
            initiator.thread.threadId,initiator.situation.location.placeRef,
            {required:false},
          )?.physicalVenue?.ref??null:null;
        const decisionVisitSince=visitSince??(venue===null||single===null?null
          :sharedVisitSince(initiator,single.counterparty,venue));
        // Neither person may already be in a conversation with someone else.
        const conversationAvailable=!initiatorTalking
          &&!(single!==null&&inConversation(single.counterparty.thread.threadId,input.at));
        const continuation=single===null||!conversationAvailable?null:ongoingExchange({
          initiator,counterparty:single.counterparty,at:input.at,
          sourceKind,sourceEncounterRef,
        });
        const situatedPercept=single?.situatedPercept??projectSituatedPercept({
          observerThreadId:initiator.thread.threadId,
          situation:initiator.situation,
          at:input.at,
          observedThreads:company.map(observedThread),
          situatedLifeStore,
          livedNowStore,
          embodimentStore,
          experienceStore,
        });
        const initiation = await formSocialEncounterRequest({
          threadId:initiator.thread.threadId,
          at:input.at,
          recentPersonalExperiences:recentPersonalExperiences(
            initiator.thread.threadId,situatedPercept,experienceStore,
          ),
          priorSocialChoicesThisVisit:decisionVisitSince===null?[]
            :priorChoices(initiator.thread.threadId,companyIds,decisionVisitSince),
          plan:livedNowStore.latestPlan(initiator.thread.threadId, "personal", { at:input.at }),
          situatedPercept,
          interoception:regulationFrame===null?null:projectInteroception(regulationFrame),
          sourceStores:{
            worldStore:worldReader,
            identityStore,
            semanticStateStore,
            memoryStore,
            situatedLifeStore,
            experienceStore,
          },
          modelAdapter,
          continuationEligible:continuation!==null,
          conversationAvailable,
        });
        const chosen=initiation.towardThreadId===null?null
          :consideration.find(person=>
            person.counterparty.thread.threadId===initiation.towardThreadId);
        const counterparty=chosen?.counterparty??null;
        salience=chosen?.salience??salience;
        // Whom this Thread had in view, so its later choices remember all of it.
        const considered=single===null?{consideredThreadIds:Object.freeze(companyIds)}:{};
        const record=attempt=>attemptByActor.set(
          counterparty?.thread.threadId??companyIds[0],
          Object.freeze({...attempt,...considered}));

        if (initiation.act === "none") {
          record({
            counterpartyThreadId:single?.counterparty.thread.threadId??null,
            outcome:"not_initiated",
            salience,
            initiation,
            request:null,
            stance:null,
            encounterStory:null,
            aftermath:null,
          });
          continue;
        }

        if(initiation.act==="continue_conversation"){
          const request=Object.freeze({
            initiatorThreadId:counterparty.thread.threadId,
            text:continuation.utterance,
          });
          const stance=Object.freeze({
            decision:"accept",expression:initiation.expression,
            suggestedAt:null,reason:initiation.reason,
            cognition:initiation.cognition,
          });
          record(await formAcceptedEncounter({
              initiator,counterparty,witnesses:[],at:input.at,
              salience,initiation,request,stance,interaction:null,continuation,
            }));
          continue;
        }

        if(initiation.act!=="invite_conversation"){
          record(await enactSmallSocialAct({
              initiator,counterparty,at:input.at,salience,initiation,
            }));
          continue;
        }

        const request = Object.freeze({
          initiatorThreadId:initiator.thread.threadId,
          text:initiation.expression,
        });
        const inviteePercept = projectSituatedPercept({
          observerThreadId:counterparty.thread.threadId,
          situation:counterparty.situation,
          at:input.at,
          observedThreads:[observedThread(initiator)],
          situatedLifeStore,
          livedNowStore,
          embodimentStore,
          experienceStore,
        });
        const stance = await formMeetingStance({
          threadId:counterparty.thread.threadId,
          at:input.at,
          plan:livedNowStore.latestPlan(counterparty.thread.threadId, "personal", { at:input.at }),
          request,
          situatedPercept:inviteePercept,
          sourceStores:{
            worldStore:worldReader,
            identityStore,
            semanticStateStore,
            memoryStore,
            situatedLifeStore,
            experienceStore,
          },
          modelAdapter,
        });

        const interaction=experienceStore.recordSocialInteraction({
          occurredAt:input.at,
          initiatorThreadId:initiator.thread.threadId,
          recipientThreadId:counterparty.thread.threadId,
          initiatorSituationId:initiator.situation.situationId,
          recipientSituationId:counterparty.situation.situationId,
          requestText:request.text,
          responseDecision:stance.decision,
          responseExpression:stance.expression,
          suggestedAt:stance.suggestedAt,
        });

        if (stance.decision !== "accept") {
          record({
            counterpartyThreadId:counterparty.thread.threadId,
            outcome:"not_met",
            salience,
            initiation,
            request,
            stance,
            encounterStory:null,
            aftermath:null,
          });
          continue;
        }

        accepted.push(Object.freeze({
          counterparty,
          salience,
          initiation,
          request,
          stance,
          interaction,
          considered,
        }));
        }catch(cause){
          rethrowSocialFailure(cause,single?.counterparty.thread.threadId??null,salience);
        }
      }

      for (const pending of accepted) {
        const witnesses = discovered.filter((context) =>
          context.thread.threadId !== pending.counterparty.thread.threadId
          && compatible(pending.counterparty, context, livedNowStore));
        try{
          attemptByActor.set(
            pending.counterparty.thread.threadId,
            {...pending.considered,...await formAcceptedEncounter({
              initiator,
              counterparty:pending.counterparty,
              witnesses,
              at:input.at,
              salience:pending.salience,
              initiation:pending.initiation,
              request:pending.request,
              stance:pending.stance,
              interaction:pending.interaction,
            })},
          );
        }catch(cause){
          rethrowSocialFailure(cause,pending.counterparty.thread.threadId,
            pending.salience);
        }
      }

      // The Thread's own decision leads; people who stayed background follow.
      const attempts = opportunities
        .map((opportunity) => attemptByActor.get(opportunity.actorRef))
        .filter((attempt) => attempt !== undefined)
        .sort((a,b)=>Number(a.outcome==="background")-Number(b.outcome==="background"));
      const encounterCount = attempts.filter((attempt) => attempt.outcome === "met").length;
      return Object.freeze({
        outcome:encounterCount > 0 ? "met" : "not_met",
        discoveredThreadIds:Object.freeze(discovered.map((context) => context.thread.threadId)),
        attempts:Object.freeze(attempts),
        encounterCount,
      });
    },
  });
}
