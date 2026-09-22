import { formCommonsEntryChoice } from "./lived-commons-cognition.mjs";
import { runLivedNowRegulationPulse } from "./lived-now-regulation.mjs";
import {
  livedPlanId,
  livedSituationId,
  normalizeLivedPlan,
} from "./lived-now.mjs";
import {
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
} from "./persistence-common.mjs";

export const FIBRE_COMMONS_CONTEXT = "fibre:commons:open-room";
const COMMONS_ENTRY_OFFSET_MS = 10;
const COMMONS_WINDOW_MS = 45 * 60 * 1000;
const MIN_COMMONS_WINDOW_MS = 10 * 60 * 1000;
const MAX_THREADS = 6;

function requireMethod(owner, method) {
  if (!owner || typeof owner[method] !== "function") {
    throw new TypeError(`${method} is required for Fibre Commons`);
  }
}

function commonsPlan({ threadId, at, endAt, physicalPlaceRef, sourceReferences, choice }) {
  const stop = {
    startAt:at,
    endAt,
    physicalPlaceRef,
    mediatedContext:FIBRE_COMMONS_CONTEXT,
    activity:choice.activity,
    purpose:choice.purpose,
    companionRefs:[],
    travelFromPrevious:null,
  };
  return normalizeLivedPlan({
    planId:livedPlanId({
      kind:"commons_presence_v1",
      threadId,
      at,
      endAt,
      physicalPlaceRef,
      mediatedContext:FIBRE_COMMONS_CONTEXT,
      activity:choice.activity,
      purpose:choice.purpose,
      provider:choice.cognition.provider,
      modelId:choice.cognition.modelId,
      providerRequestId:choice.cognition.providerRequestId,
      contextDigest:choice.cognition.contextDigest,
    }),
    kind:"personal",
    subjectThreadId:threadId,
    owner:{ partyId:threadId, kind:"thread" },
    authoredAt:at,
    horizonStart:at,
    horizonEnd:endAt,
    stops:[stop],
    sourceReferences:[...new Set([...sourceReferences, physicalPlaceRef])],
    cognition:structuredClone(choice.cognition),
  });
}

export function createLivedCommonsService({
  worldReader,
  livedNow,
  livedNowStore,
  identityStore,
  semanticStateStore,
  memoryStore,
  situatedLifeStore,
  modelAdapter,
}) {
  requireMethod(worldReader, "getThread");
  requireMethod(livedNow, "ensure");
  requireMethod(livedNowStore, "latestPlan");
  requireMethod(livedNowStore, "recordPlan");
  requireMethod(livedNowStore, "enactCurrentSituation");
  requireMethod(identityStore, "getCurrentIdentityView");
  requireMethod(semanticStateStore, "listCurrentState");
  requireMethod(semanticStateStore, "recordState");
  requireMethod(memoryStore, "listCurrentMemories");
  requireMethod(situatedLifeStore, "listCurrentLifeRelations");
  requireMethod(modelAdapter, "invoke");

  return Object.freeze({
    async gather(input) {
      assertPlainObject("Fibre Commons input", input);
      assertIsoTimestamp("Fibre Commons at", input.at);
      if (!Array.isArray(input.threadIds)
        || input.threadIds.length < 1
        || input.threadIds.length > MAX_THREADS
        || new Set(input.threadIds).size !== input.threadIds.length) {
        throw new TypeError(`Fibre Commons requires 1-${MAX_THREADS} unique threadIds`);
      }
      for (const threadId of input.threadIds) assertId("Fibre Commons threadId", threadId);

      const entries = [];
      for (const threadId of input.threadIds) {
        const situation = await livedNow.ensure({ threadId, at:input.at });
        if (
          situation.phase !== "at_place"
          || situation.location?.kind !== "place"
          || situation.resolution?.kind !== "personal_plan"
        ) {
          entries.push(Object.freeze({ threadId, outcome:"unavailable", situationId:situation.situationId }));
          continue;
        }

        const plan = livedNowStore.latestPlan(threadId, "personal", { at:input.at });
        if (plan === null) {
          throw new Error(`Fibre Commons requires personal Flight Plan for ${threadId}`);
        }
        const remainingMs = Date.parse(plan.horizonEnd) - Date.parse(input.at);
        if (remainingMs < MIN_COMMONS_WINDOW_MS) {
          entries.push(Object.freeze({ threadId, outcome:"unavailable", situationId:situation.situationId }));
          continue;
        }

        const thread = worldReader.getThread(threadId, { required:false });
        if (thread === null) throw new Error(`Thread ${threadId} was not found`);
        const choice = await formCommonsEntryChoice({
          threadId,
          at:input.at,
          situation,
          plan,
          sourceStores:{
            worldStore:worldReader,
            identityStore,
            semanticStateStore,
            memoryStore,
            situatedLifeStore,
          },
          modelAdapter,
        });
        const diagnostics = Object.freeze({
          name:thread.identity?.name ?? null,
          currentActivity:situation.activity,
          currentReason:situation.reason,
          decisionReason:choice.reason,
          cognitionProfile:choice.cognition.implementationProfile.id,
          selectedEvidenceRefs:Object.freeze([...choice.cognition.selectedEvidenceRefs]),
          evidenceRefs:Object.freeze([...choice.cognition.evidenceRefs]),
          contextDigest:choice.cognition.contextDigest,
        });
        if (choice.decision !== "enter") {
          entries.push(Object.freeze({ threadId, outcome:"stayed_out", situationId:situation.situationId, diagnostics }));
          continue;
        }

        const entryAt = new Date(Date.parse(input.at) + COMMONS_ENTRY_OFFSET_MS).toISOString();
        const endAt = new Date(Math.min(
          Date.parse(plan.horizonEnd),
          Date.parse(entryAt) + COMMONS_WINDOW_MS,
        )).toISOString();
        const nextPlan = livedNowStore.recordPlan(commonsPlan({
          threadId,
          at:entryAt,
          endAt,
          physicalPlaceRef:situation.location.placeRef,
          sourceReferences:plan.sourceReferences,
          choice,
        }));
        const current = livedNowStore.enactCurrentSituation({
          threadId,
          situationId:livedSituationId({
            kind:"commons_presence_v1",
            threadId,
            at:entryAt,
            planId:nextPlan.planId,
          }),
          establishedAt:entryAt,
          observation:{
            phase:"at_place",
            location:{ kind:"place", placeRef:situation.location.placeRef },
            mediatedContext:FIBRE_COMMONS_CONTEXT,
            activity:choice.activity,
            reason:choice.purpose,
            participantRefs:[],
            evidenceRefs:[...nextPlan.sourceReferences],
          },
        });
        await runLivedNowRegulationPulse({
          threadId,
          previousSituation:situation,
          currentSituation:current,
          worldStore:worldReader,
          livedNowStore,
          semanticStateStore,
          modelAdapter,
        });
        entries.push(Object.freeze({
          threadId,
          outcome:"entered",
          situationId:current.situationId,
          planId:nextPlan.planId,
          diagnostics,
        }));
      }

      return Object.freeze({
        commonsContext:FIBRE_COMMONS_CONTEXT,
        entries:Object.freeze(entries),
      });
    },
  });
}
