import {
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
} from "./persistence-common.mjs";

export async function queueThreadExperienceConsolidation({
  experienceStore,
  experienceRecord,
  queuedAt,
  onQueued=null,
}={}){
  if(!experienceStore||typeof experienceStore.queueThreadExperienceConsolidation!=="function"){
    throw new TypeError("experienceStore.queueThreadExperienceConsolidation is required");
  }
  assertPlainObject("queued Thread Experience",experienceRecord);
  assertId("queued Thread Experience.experienceId",experienceRecord.experienceId);
  assertId("queued Thread Experience.threadId",experienceRecord.threadId);
  assertIsoTimestamp("queued Thread Experience queuedAt",queuedAt);
  if(onQueued!==null&&typeof onQueued!=="function"){
    throw new TypeError("onQueued must be a function or null");
  }

  const queued=experienceStore.queueThreadExperienceConsolidation({
    experienceId:experienceRecord.experienceId,
    queuedAt,
  });
  if(queued.threadId!==experienceRecord.threadId){
    throw new TypeError("queued consolidation belongs to another Thread");
  }
  if(onQueued!==null)await onQueued(queued);
  return Object.freeze(queued);
}
