import {
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
} from "./persistence-common.mjs";

function requireMethod(owner,name,method){
  if(!owner||typeof owner!=="object"||typeof owner[method]!=="function"){
    throw new TypeError(`${name} must expose ${method}()`);
  }
}

export function observeAdmittedWorldEncounter({
  liveEncounter,
  experienceStore,
  encounterId,
}={}){
  requireMethod(liveEncounter,"live encounter","pushWorldEvent");
  requireMethod(liveEncounter,"live encounter","snapshot");
  requireMethod(experienceStore,"experienceStore","getEncounterStory");
  requireMethod(experienceStore,"experienceStore","getThreadEncounterAttention");
  assertId("admitted World encounterId",encounterId);

  const story=experienceStore.getEncounterStory(encounterId,{required:false});
  if(story===null)throw new TypeError(`admitted World encounter ${encounterId} was not found`);
  assertIsoTimestamp("admitted World encounter occurredAt",story.occurredAt);
  if(!Array.isArray(story.threadPresence)||!Array.isArray(story.story?.beats)){
    throw new TypeError("admitted World encounter is incomplete");
  }

  const liveParticipants=new Set(liveEncounter.snapshot().participantIds);
  const perceivedBy=[];
  for(const presence of story.threadPresence){
    if(!liveParticipants.has(presence.threadId))continue;
    const attention=experienceStore.getThreadEncounterAttention(
      presence.threadId,
      story.encounterId,
    );
    if(attention?.outcome==="noticed")perceivedBy.push(presence.threadId);
  }

  return liveEncounter.pushWorldEvent({
    eventRef:story.encounterId,
    occurredAt:story.occurredAt,
    beats:story.story.beats,
    perceivedBy,
  });
}

export async function reconcileLiveEncounterScene({
  liveEncounter,
  livedNow,
  participantId,
  threadId,
  expectedSituationId,
  at,
}={}){
  requireMethod(liveEncounter,"live encounter","pushSceneChange");
  requireMethod(livedNow,"livedNow","validateDisplayedSituation");
  assertId("live encounter participantId",participantId);
  assertId("live encounter threadId",threadId);
  assertId("live encounter expectedSituationId",expectedSituationId);
  assertIsoTimestamp("live encounter reconciliation at",at);

  const validation=await livedNow.validateDisplayedSituation({
    threadId,
    situationId:expectedSituationId,
    at,
  });
  assertPlainObject("live encounter scene validation",validation);
  assertPlainObject("live encounter currentSituation",validation.currentSituation);

  if(validation.applies===true){
    return Object.freeze({
      outcome:"same_scene",
      currentSituation:structuredClone(validation.currentSituation),
    });
  }
  if(validation.applies!==false){
    throw new TypeError("live encounter scene validation applies must be boolean");
  }

  liveEncounter.pushSceneChange({
    participantId,
    previousSituationId:expectedSituationId,
    currentSituation:validation.currentSituation,
  });
  return Object.freeze({
    outcome:"scene_changed",
    currentSituation:structuredClone(validation.currentSituation),
  });
}
