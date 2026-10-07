import {
  formSocialEncounterRequest,
  formMeetingStance,
  meetingPresenceCompatible,
} from "./lived-meeting-cognition.mjs";
import { runThreadLiveSocialEncounter } from "./lived-social-live-encounter.mjs";
import { appraiseEncounterAttention } from "./lived-encounter-attention.mjs";
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
import { explorationRegulationForLivedHistory } from "./lived-now-regulation.mjs";

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
  modelAdapter,
  onExperienceQueued = null,
}) {
  requireMethod("worldReader", worldReader, "getThread");
  requireMethod("livedNow", livedNow, "ensure");
  requireMethod("livedNowStore", livedNowStore, "getCurrentSituation");
  requireMethod("livedNowStore", livedNowStore, "getPreviousSituation");
  requireMethod("livedNowStore", livedNowStore, "listCurrentSituations");
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
  requireMethod("experienceStore", experienceStore, "listSocialInteractions");
  requireMethod("experienceStore", experienceStore, "getThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "recordThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "queueThreadExperienceConsolidation");
  requireMethod("modelAdapter", modelAdapter, "invoke");
  requireMethod("modelAdapter", modelAdapter, "streamExpression");
  if (onExperienceQueued !== null && typeof onExperienceQueued !== "function") {
    throw new TypeError("social meeting onExperienceQueued must be a function or null");
  }

  async function currentContext(threadId, at) {
    await livedNow.ensure({ threadId, at });
    return contextFor({
      threadId,
      worldReader,
      livedNowStore,
      semanticStateStore,
      memoryStore,
    });
  }

  async function discoverCoPresent(initiator, at) {
    const candidates = livedNowStore.listCurrentSituations({ at })
      .filter((situation) => situation.threadId !== initiator.thread.threadId);
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
      if (compatible(initiator, refreshed, livedNowStore)) discovered.push(refreshed);
    }

    return Object.freeze(discovered);
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
    const participantContexts = [initiator, counterparty];
    const allContexts = [...participantContexts, ...witnesses];
    const liveResult=await runThreadLiveSocialEncounter({
      initiator,
      counterparty,
      request,
      stance,
      modelAdapter,
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
      assertExactKeys("social meeting input", input, ["initiatorThreadId","at"]);
      assertId("social meeting initiatorThreadId", input.initiatorThreadId);
      assertIsoTimestamp("social meeting at", input.at);

      const initiator = await currentContext(input.initiatorThreadId, input.at);
      const discovered = await discoverCoPresent(initiator, input.at);
      const perceived = projectSituatedPercept({
        observerThreadId:initiator.thread.threadId,
        situation:initiator.situation,
        observedThreads:discovered.map(observedThread),
        situatedLifeStore,
        livedNowStore,
        experienceStore,
      });
      const opportunities = perceived.opportunities.filter((opportunity) =>
        opportunity.kind === "actor_presence" && opportunity.actorKind === "thread");
      const explorationRegulation = explorationRegulationForLivedHistory({
        thread:initiator.thread,
        livedNowStore,
        currentSituation:initiator.situation,
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
          observedThreads:[observedThread(counterparty)],
          situatedLifeStore,
          livedNowStore,
          experienceStore,
        });
        const actorOpportunity = situatedPercept.opportunities[0];
        const salience = evaluateSalience({
          opportunity:actorOpportunity,
          situatedPercept,
          regulationFrame:explorationRegulation,
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
          plan:livedNowStore.latestPlan(initiator.thread.threadId, "personal", { at:input.at }),
          situatedPercept,
          sourceStores:{
            worldStore:worldReader,
            identityStore,
            semanticStateStore,
            memoryStore,
            situatedLifeStore,
          },
          modelAdapter,
        });

        if (initiation.decision !== "initiate") {
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

        const request = Object.freeze({
          initiatorThreadId:initiator.thread.threadId,
          text:initiation.requestText,
        });
        const inviteePercept = projectSituatedPercept({
          observerThreadId:counterparty.thread.threadId,
          situation:counterparty.situation,
          observedThreads:[observedThread(initiator)],
          situatedLifeStore,
          livedNowStore,
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
