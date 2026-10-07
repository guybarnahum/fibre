import { assertId } from "./persistence-common.mjs";

export const EXPERIENCE_CONSOLIDATION_DELAY_MS=30_000;

export function createExperienceConsolidationWakeScheduler({
  reconciliationRuntime,
  delayMs=EXPERIENCE_CONSOLIDATION_DELAY_MS,
  onScheduled=null,
}={}){
  if(!reconciliationRuntime||typeof reconciliationRuntime.requestWakeAfter!=="function"){
    throw new TypeError("experience consolidation scheduler requires World reconciliation runtime");
  }
  if(!Number.isSafeInteger(delayMs)||delayMs<0||delayMs>3_600_000){
    throw new TypeError("experience consolidation delayMs must be an integer from 0 through 3600000");
  }
  if(onScheduled!==null&&typeof onScheduled!=="function"){
    throw new TypeError("experience consolidation onScheduled must be a function or null");
  }

  return async function scheduleExperienceConsolidation(queued=null){
    if(queued!==null){
      if(typeof queued!=="object"||Array.isArray(queued)){
        throw new TypeError("queued consolidation must be an object or null");
      }
      assertId("queued consolidation experienceId",queued.experienceId);
      assertId("queued consolidation threadId",queued.threadId);
    }

    const wake=await reconciliationRuntime.requestWakeAfter(delayMs);
    await onScheduled?.(Object.freeze({
      queued:queued===null?null:Object.freeze(structuredClone(queued)),
      wake:Object.freeze(structuredClone(wake)),
      delayMs,
    }));
    return wake;
  };
}
