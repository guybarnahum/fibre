import {
  formSocialEncounterRequest,
  formMeetingStance,
  meetingPresenceCompatible,
} from "./lived-meeting-cognition.mjs";
import {
  continueSocialEncounterStory,
} from "./lived-social-encounter-cognition.mjs";
import { appraiseEncounterAttention } from "./lived-encounter-attention.mjs";
import { internalizeThreadEncounterExperience } from "./lived-thread-experience-aftermath.mjs";
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
import { explorationRegulationForLivedContinuity } from "./lived-now-regulation.mjs";

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

function compatible(left, right, situatedLifeStore) {
  return meetingPresenceCompatible(left.situation, right.situation, {
    leftPlaceEpisodes:situatedLifeStore.listCurrentPlaceEpisodes(left.thread.threadId),
    rightPlaceEpisodes:situatedLifeStore.listCurrentPlaceEpisodes(right.thread.threadId),
  });
}

function participantSummary(context) {
  return Object.freeze({
    threadId:context.thread.threadId,
    name:context.thread.identity?.name ?? null,
    selfDescription:context.thread.identity?.selfDescription ?? "",
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
  journalBook = null,
  modelAdapter,
  activityRecorder = null,
}) {
  requireMethod("worldReader", worldReader, "getThread");
  requireMethod("livedNow", livedNow, "ensure");
  requireMethod("livedNowStore", livedNowStore, "getCurrentSituation");
  requireMethod("livedNowStore", livedNowStore, "getPreviousSituation");
  requireMethod("livedNowStore", livedNowStore, "listCurrentSituations");
  requireMethod("livedNowStore", livedNowStore, "latestPlan");
  requireMethod("identityStore", identityStore, "getCurrentIdentityView");
  requireMethod("situatedLifeStore", situatedLifeStore, "listCurrentLifeRelations");
  requireMethod("situatedLifeStore", situatedLifeStore, "listCurrentPlaceEpisodes");
  requireMethod("semanticStateStore", semanticStateStore, "listCurrentState");
  requireMethod("memoryStore", memoryStore, "listCurrentMemories");
  requireMethod("memoryStore", memoryStore, "recordMemory");
  requireMethod("experienceStore", experienceStore, "recordEncounterStory");
  requireMethod("experienceStore", experienceStore, "listEncounterStories");
  requireMethod("experienceStore", experienceStore, "recordSocialInteraction");
  requireMethod("experienceStore", experienceStore, "listSocialInteractions");
  requireMethod("experienceStore", experienceStore, "getThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "recordThreadEncounterAttention");
  requireMethod("experienceStore", experienceStore, "recordThreadExperienceJournalEntry");
  requireMethod("modelAdapter", modelAdapter, "invoke");
  if (activityRecorder !== null) requireMethod("activityRecorder", activityRecorder, "runStage");

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
      if (!compatible(initiator, candidate, situatedLifeStore)) continue;

      const refreshed = await currentContext(candidateSituation.threadId, at);
      if (compatible(initiator, refreshed, situatedLifeStore)) discovered.push(refreshed);
    }

    return Object.freeze(discovered);
  }

  async function witnessContexts(witnessThreadIds, initiator, counterparty, at) {
    const contexts = [];
    for (const threadId of witnessThreadIds) {
      if (threadId === initiator.thread.threadId || threadId === counterparty.thread.threadId) continue;
      const witness = await currentContext(threadId, at);
      if (compatible(initiator, witness, situatedLifeStore)
        && compatible(counterparty, witness, situatedLifeStore)) {
        contexts.push(witness);
      }
    }
    return Object.freeze(contexts);
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
    const story = {
      storyVersion:"encounter-story-v0.1",
      beats:[{
        actorThreadId:initiator.thread.threadId,
        kind:"utterance",
        text:request.text,
      }],
    };

    const reply = await continueSocialEncounterStory({
      thread:counterparty.thread,
      situation:counterparty.situation,
      counterparties:[initiator.thread],
      story,
      modelAdapter,
    });
    if (reply !== null) story.beats.push(reply);

    const closingBeat = await continueSocialEncounterStory({
      thread:initiator.thread,
      situation:initiator.situation,
      counterparties:[counterparty.thread],
      story,
      modelAdapter,
    });
    if (closingBeat !== null) story.beats.push(closingBeat);

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

    const presentThreadSummaries = allContexts.map(participantSummary);
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
      aftermath[context.thread.threadId] = await internalizeThreadEncounterExperience({
        livedContext:context,
        encounterStory,
        presentThreadSummaries,
        experienceRecord:attention.experience,
        experienceStore,
        memoryStore,
        journalBook,
        modelAdapter,
        activityRecorder,
      });
    }

    for (const context of witnesses) {
      const existing = experienceStore.getThreadEncounterAttention(
        context.thread.threadId,
        encounterStory.encounterId,
      );
      if (existing !== null) {
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
      aftermath[context.thread.threadId] = attention.outcome === "noticed"
        ? await internalizeThreadEncounterExperience({
            livedContext:context,
            encounterStory,
            presentThreadSummaries,
            experienceRecord:attention.experience,
            experienceStore,
            memoryStore,
            journalBook,
            modelAdapter,
            activityRecorder,
          })
        : null;
    }

    return Object.freeze({
      counterpartyThreadId:counterparty.thread.threadId,
      outcome:"met",
      salience,
      initiation,
      request,
      stance,
      encounterStory,
      aftermath:Object.freeze(aftermath),
    });
  }

  return Object.freeze({
    async meet(input) {
      assertPlainObject("social meeting input", input);
      const hasWitnesses = Object.hasOwn(input, "witnessThreadIds");
      assertExactKeys(
        "social meeting input",
        input,
        hasWitnesses
          ? ["initiatorThreadId","witnessThreadIds","at"]
          : ["initiatorThreadId","at"],
      );
      assertId("social meeting initiatorThreadId", input.initiatorThreadId);
      assertIsoTimestamp("social meeting at", input.at);
      const explicitWitnessIds = input.witnessThreadIds ?? [];
      if (!Array.isArray(explicitWitnessIds)) {
        throw new TypeError("social meeting witnessThreadIds must be an array");
      }
      for (const threadId of explicitWitnessIds) assertId("social meeting witnessThreadId", threadId);
      if (new Set(explicitWitnessIds).size !== explicitWitnessIds.length) {
        throw new TypeError("social meeting witnessThreadIds must be unique");
      }

      const initiator = await currentContext(input.initiatorThreadId, input.at);
      const discovered = await discoverCoPresent(initiator, input.at);
      const perceived = projectSituatedPercept({
        observerThreadId:initiator.thread.threadId,
        situation:initiator.situation,
        observedThreads:discovered.map(observedThread),
        situatedLifeStore,
        experienceStore,
      });
      const opportunities = perceived.opportunities.filter((opportunity) =>
        opportunity.kind === "actor_presence" && opportunity.actorKind === "thread");
      const explorationRegulation = explorationRegulationForLivedContinuity({
        thread:initiator.thread,
        previousSituation:livedNowStore.getPreviousSituation(
          initiator.thread.threadId,
          initiator.situation.establishedAt,
        ),
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
        const witnesses = await witnessContexts(
          explicitWitnessIds,
          initiator,
          pending.counterparty,
          input.at,
        );
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
