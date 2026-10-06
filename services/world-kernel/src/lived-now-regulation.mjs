import { evaluateIntrinsicRegulation } from "../../../core/src/intrinsic-regulation.mjs";
import { selectRegulationAttention } from "../../../core/src/regulation-attention.mjs";
import {
  assessFlightPlanPresence,
  observationFromCurrentSituation,
} from "./flight-plan-regulation.mjs";
import {
  interpretIntrinsicRegulation,
  projectInteroception,
} from "./interoceptive-cognition.mjs";
import { regulationOrganismTrace } from "./regulation-cycle.mjs";

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
  });
}

export function explorationInteroceptionForLivedContinuity(input) {
  const frame = explorationRegulationForLivedContinuity(input);
  return frame === null ? null : projectInteroception(frame);
}

export function explorationRegulationForLivedHistory({
  thread,
  livedNowStore,
  currentSituation,
}) {
  const continuity=explorationContinuityForLivedHistory({
    livedNowStore,
    currentSituation,
  });
  if(!continuity.grounded)return null;
  return evaluateIntrinsicRegulation({
    perceptFrame:{
      asOf:currentSituation.establishedAt,
      exploration:{ novelty:0 },
      evidenceRefs:[...continuity.evidenceRefs],
    },
    runtimeBaselines:thread.genome?.runtimeBaselines ?? {},
  });
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

function frameForSituation({ thread, situation, livedNowStore }) {
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
    },
    targets:[assessment.presenceTarget],
    runtimeBaselines:thread.genome?.runtimeBaselines ?? {},
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

  const currentFrame = frameForSituation({ thread, situation:currentSituation, livedNowStore });
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
    : frameForSituation({ thread, situation:previousSituation, livedNowStore });

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
