import { admitEncounterAttention } from "./lived-encounter-attention.mjs";
import { sha256 } from "./persistence-common.mjs";

function requirePort(owner,name){
  if(typeof owner?.[name]!=="function")
    throw new TypeError(`recipient perception requires ${name}()`);
}

// A delivered private message is an exterior fact for its addressee only.
// Admission into World history says "available", never "read", "answered"
// or "the sender was physically here".
export function createThreadContactPerception({
  contactStore,livedNow,livedNowStore,worldReader,semanticStateStore,
  memoryStore,experienceStore,modelAdapter,onExperienceQueued=null,
  now=()=>new Date().toISOString(),
}={}){
  for(const method of [
    "listDueContactReceptions","nextContactReceptionAt","claimContactReception",
    "settleContactReception","failContactReception",
  ])requirePort(contactStore,method);
  requirePort(livedNow,"ensure");
  requirePort(livedNowStore,"getSituation");
  requirePort(worldReader,"getThread");
  requirePort(semanticStateStore,"listCurrentState");
  requirePort(memoryStore,"listCurrentMemories");
  for(const method of [
    "recordEncounterStory","getThreadEncounterAttention",
  ])requirePort(experienceStore,method);
  requirePort(modelAdapter,"invoke");

  return Object.freeze({
    async runOnce(){
      const at=now();
      const due=contactStore.listDueContactReceptions({at,limit:1});
      let failed=0;
      let noticed=0;
      const results=[];
      for(const message of due){
        try{
          let claim={
            situationId:message.situationId,perceivedAt:message.perceivedAt,
          };
          if(claim.situationId===null){
            const situation=await livedNow.ensure({
              threadId:message.recipientThreadId,at,
            });
            claim=contactStore.claimContactReception({
              messageId:message.messageId,
              threadId:message.recipientThreadId,
              situationId:situation.situationId,perceivedAt:at,
            });
          }
          const recipient=worldReader.getThread(message.recipientThreadId,{required:false});
          const situation=livedNowStore.getSituation(claim.situationId,{required:false});
          if(recipient===null||situation?.threadId!==message.recipientThreadId){
            throw new TypeError("addressed contact lost its recipient's lived authority");
          }
          const story={
            storyVersion:"encounter-story-v0.1",
            beats:[{
              actorThreadId:null,kind:"occurrence",
              text:`A private addressed message from Thread ${message.senderThreadId} becomes available: ${message.messageText}`,
            }],
          };
          // An addressed message has no objective image, public place, or
          // physical co-presence. Never put private text in a render prompt.
          const prompt="Private addressed message delivery; no visual reconstruction.";
          const encounter=experienceStore.recordEncounterStory({
            occurredAt:claim.perceivedAt,
            threadPresence:[{
              threadId:message.recipientThreadId,
              situationId:claim.situationId,
            }],
            story,
            visualization:{
              visualizationPrompt:prompt,
              visualizationPromptDigest:`sha256:${sha256(prompt)}`,
              visualizationSourceReferences:[message.messageId],
              depictedThreadRefs:[],
            },
          });
          const existing=experienceStore.getThreadEncounterAttention(
            message.recipientThreadId,encounter.encounterId,
          );
          const attention=await admitEncounterAttention({
            thread:recipient,situation,encounterStory:encounter,
            semanticStates:existing===null
              ?semanticStateStore.listCurrentState(message.recipientThreadId):[],
            memories:existing===null
              ?memoryStore.listCurrentMemories(message.recipientThreadId,{
                limit:6,newestFirst:true,
              }):[],
            experienceStore,modelAdapter,onExperienceQueued,
          });
          if(attention.outcome==="noticed")noticed++;
          contactStore.settleContactReception({
            messageId:message.messageId,completedAt:now(),
          });
          results.push({
            messageId:message.messageId,recipientThreadId:message.recipientThreadId,
            outcome:attention.outcome,encounterId:encounter.encounterId,
            experienceId:attention.experience?.experienceId??null,
          });
        }catch(error){
          const reason=String(error?.message??error).slice(0,180);
          const blocked=contactStore.failContactReception({
            messageId:message.messageId,reason,
          });
          if(!blocked)failed++;
          results.push({
            messageId:message.messageId,outcome:blocked?"blocked":"failed",
            message:reason,
          });
        }
      }
      const nextDueAt=contactStore.nextContactReceptionAt();
      return Object.freeze({
        attempted:due.length,failed,noticed,nextDueAt,
        hasDue:nextDueAt!==null&&Date.parse(nextDueAt)<=Date.parse(at),
        results:Object.freeze(results),
      });
    },
  });
}
