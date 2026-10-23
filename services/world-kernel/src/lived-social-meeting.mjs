import {
  formSocialEncounterRequest,
  formMeetingStance,
  meetingPresenceCompatible,
} from "./lived-meeting-cognition.mjs";
import { runThreadLiveSocialEncounter } from "./lived-social-live-encounter.mjs";
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

const MEMORY_LIMIT = 6;

function requireMethod(name, value, method) {
  if (value === null || typeof value !== "object" || typeof value[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
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
    memories:Object.freeze(memoryStore.listCurrentMemories(threadId, {
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
    situation:context.situation,
  });
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
  requireMethod("experienceStore", experienceStore, "socialChoicesThisVisit");
  requireMethod("experienceStore", experienceStore, "reconsiderationCountForPair");
  requireMethod("experienceStore", experienceStore, "listSocialInteractions");
  requireMethod("experienceStore", experienceStore, "getThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "recordThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "queueThreadExperienceConsolidation");
  requireMethod("modelAdapter", modelAdapter, "invoke");
  requireMethod("modelAdapter", modelAdapter, "streamExpression");
  if (liveEncounterRegistry !== null && (
    typeof liveEncounterRegistry.register !== "function"
    || typeof liveEncounterRegistry.publishAfterthoughts !== "function"
  )) {
    throw new TypeError("social meeting liveEncounterRegistry must be null or expose register() and publishAfterthoughts()");
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

  async function discoverCoPresent(initiator, at, counterpartyThreadId=null) {
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
    const situations=counterpartyThreadId!==null
      ?target!==null&&target.wakefulness!=="asleep"&&venue!==null&&venue===targetVenue
        ?[target]:[]
      :boundedVenueDiscovery
        ?venue===null?[]:livedNowStore.listCurrentVenueSituations({
          venueRef:venue,at,limit:8,excludeThreadId:initiator.thread.threadId,
        })
        :livedNowStore.listCurrentSituations({at});
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

      const refreshed = await currentContext(candidateSituation.threadId, at);
      if (refreshed!==null&&compatible(initiator, refreshed, livedNowStore)) {
        discovered.push(refreshed);
        if(boundedVenueDiscovery)break; // One candidate, one bounded social decision.
      }
    }

    return Object.freeze(discovered);
  }

  // A shared visit starts when the second person entered this uninterrupted
  // venue stay. Beyond the bounded situation history we cannot prove the
  // beginning, so decline to create further reply opportunities.
  function sharedVisitSince(left,right,venue,at){
    const start=context=>{
      let cursor=context.situation;
      for(let i=0;i<16;i++){
        const prior=livedNowStore.getPreviousSituation(
          context.thread.threadId,cursor.establishedAt,
        );
        if(prior===null)return cursor.establishedAt;
        if(prior.location?.kind!=="place"||prior.wakefulness==="asleep"
          ||livedNowStore.getWorldPlace(context.thread.threadId,
            prior.location.placeRef,{required:false})?.physicalVenue?.ref!==venue){
          return cursor.establishedAt;
        }
        cursor=prior;
      }
      return null;
    };
    const a=start(left),b=start(right);
    if(a===null||b===null)return null;
    return new Date(Math.max(Date.parse(a),Date.parse(b))).toISOString();
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
      name:currentLeft.thread.identity?.name??null,embodimentStore,
    }).observableDescription.replace(/; Currently:.*$/u,"");
    const story={storyVersion:"encounter-story-v0.1",beats:[{
      actorThreadId:currentLeft.thread.threadId,
      kind:gesture?"action":"utterance",
      text:gesture?description+" "+initiation.expression
        :description+' says: "'+initiation.expression+'"',
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

    const participantContexts = [latestInitiator, latestCounterparty];
    const allContexts = [...participantContexts, ...witnesses];
    const liveResult=await runThreadLiveSocialEncounter({
      initiator:latestInitiator,
      counterparty:latestCounterparty,
      request,
      stance,
      modelAdapter,
      liveEncounterRegistry,
    });
    const story=liveResult.story;

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
        sourceReferences:threadPresence.map((presence) => presence.situationId),
        depictedThreadRefs,
      }),
    });

    const aftermath = {};
    for (const context of participantContexts) {
      const experienceText = await formThreadEncounterExperience({
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
      const visitSince=input.reconsiderationVisitSince??null;
      assertExactKeys("social meeting input", input,
        visitSince!==null
          ?["initiatorThreadId","at","counterpartyThreadId","reconsiderationVisitSince"]
          :counterpartyThreadId===null
            ?["initiatorThreadId","at"]
            :["initiatorThreadId","at","counterpartyThreadId"]);
      if(visitSince!==null)assertIsoTimestamp("social revisit start",visitSince);
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
        initiator,input.at,counterpartyThreadId,
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

        const initiation = await formSocialEncounterRequest({
          threadId:initiator.thread.threadId,
          at:input.at,
          recentPersonalExperiences:recentPersonalExperiences(
            initiator.thread.threadId,situatedPercept,experienceStore,
          ),
          priorSocialChoicesThisVisit:visitSince===null?[]
            :experienceStore.socialChoicesThisVisit({
              threadId:initiator.thread.threadId,
              counterpartyThreadId:counterparty.thread.threadId,
              visitSince,
            }),
          plan:livedNowStore.latestPlan(initiator.thread.threadId, "personal", { at:input.at }),
          situatedPercept,
          interoception:regulationFrame===null?null:projectInteroception(regulationFrame),
          sourceStores:{
            worldStore:worldReader,
            identityStore,
            semanticStateStore,
            memoryStore,
            situatedLifeStore,
          },
          modelAdapter,
        });

        if (initiation.act === "none") {
          attemptByActor.set(counterparty.thread.threadId, Object.freeze({
            counterpartyThreadId:counterparty.thread.threadId,
            outcome:"not_initiated",
            salience,
            initiation,
            request:null,
            stance:null,
            encounterStory:null,
            aftermath:null,
          }));
          continue;
        }

        if(initiation.act!=="invite_conversation"){
          attemptByActor.set(counterparty.thread.threadId,
            await enactSmallSocialAct({
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
          },
          modelAdapter,
        });

        experienceStore.recordSocialInteraction({
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
          attemptByActor.set(counterparty.thread.threadId, Object.freeze({
            counterpartyThreadId:counterparty.thread.threadId,
            outcome:"not_met",
            salience,
            initiation,
            request,
            stance,
            encounterStory:null,
            aftermath:null,
          }));
          continue;
        }

        accepted.push(Object.freeze({
          counterparty,
          salience,
          initiation,
          request,
          stance,
        }));
      }

      for (const pending of accepted) {
        const witnesses = discovered.filter((context) =>
          context.thread.threadId !== pending.counterparty.thread.threadId
          && compatible(pending.counterparty, context, livedNowStore));
        attemptByActor.set(
          pending.counterparty.thread.threadId,
          await formAcceptedEncounter({
            initiator,
            counterparty:pending.counterparty,
            witnesses,
            at:input.at,
            salience:pending.salience,
            initiation:pending.initiation,
            request:pending.request,
            stance:pending.stance,
          }),
        );
      }

      const attempts = opportunities
        .map((opportunity) => attemptByActor.get(opportunity.actorRef))
        .filter((attempt) => attempt !== undefined);
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
