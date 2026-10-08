import {
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
} from "./persistence-common.mjs";
import {
  decideLaterContact,
  expressLaterContact,
} from "./lived-contact-cognition.mjs";

const CONTACTABLE_RELATION_KINDS=new Set([
  "biological_parent",
  "adoptive_parent",
  "social_parent",
  "child",
  "sibling",
  "sponsor",
  "social_contact",
]);

function requireMethod(name,value,method){
  if(!value||typeof value[method]!=="function"){
    throw new TypeError(`${name} must expose ${method}()`);
  }
}

function candidateKey(candidate){
  return `${candidate.recipientKind}:${candidate.partyId}`;
}

function routeCandidates({
  threadId,
  relations,
  worldReader,
  contactStore,
}){
  const byKey=new Map();
  for(const relation of relations){
    if(!CONTACTABLE_RELATION_KINDS.has(relation.relationKind))continue;
    const party=relation.relatedParty;
    if(party?.kind==="thread"){
      const target=worldReader.getThread(party.partyId,{required:false});
      if(target===null||target.status==="retired")continue;
      const candidate={
        partyId:party.partyId,
        recipientKind:"thread",
        displayName:party.displayName,
        relationKind:relation.relationKind,
        factualRoleRefs:[...(relation.factualRoleRefs??[])],
        relationshipFacts:[...(relation.relationshipFacts??[])],
        capabilityRef:null,
      };
      byKey.set(candidateKey(candidate),candidate);
      continue;
    }
    if(party?.kind!=="human_source")continue;
    const capability=contactStore.getPersonCapability(party.partyId,{required:false});
    if(capability===null||capability.active!==true)continue;
    const candidate={
      partyId:party.partyId,
      recipientKind:"person",
      displayName:capability.displayName,
      relationKind:relation.relationKind,
      factualRoleRefs:[...(relation.factualRoleRefs??[])],
      relationshipFacts:[...(relation.relationshipFacts??[])],
      capabilityRef:capability.capabilityId,
    };
    byKey.set(candidateKey(candidate),candidate);
  }
  return Object.freeze([...byKey.values()]
    .sort((left,right)=>left.partyId.localeCompare(right.partyId))
    .map((item)=>Object.freeze(item)));
}

function sourceFromConsolidation(experienceStore,consolidationId){
  const consolidation=experienceStore.getThreadExperienceConsolidation(consolidationId);
  const decision=experienceStore.getThreadExperienceConsolidationStage(
    consolidationId,
    "decision",
  );
  const complete=experienceStore.getThreadExperienceConsolidationStage(
    consolidationId,
    "complete",
  );
  if(decision===null||complete===null){
    throw new TypeError("later contact requires completed consolidation");
  }
  const afterthoughts=Array.isArray(decision.payload?.afterthoughts)
    ?decision.payload.afterthoughts:[];
  if(afterthoughts.length<1){
    throw new TypeError("later contact source has no delayed private residue");
  }
  return Object.freeze({
    consolidation,
    afterthoughts:Object.freeze(afterthoughts.map((item)=>Object.freeze(structuredClone(item)))),
  });
}

export function createThreadContactProcess({
  worldReader,
  livedNowStore,
  situatedLifeStore,
  semanticStateStore,
  memoryStore,
  experienceStore,
  contactStore,
  modelAdapter,
  now=()=>new Date().toISOString(),
  batchLimit=4,
  sourceScanLimit=64,
}={}){
  requireMethod("contact worldReader",worldReader,"getThread");
  requireMethod("contact livedNowStore",livedNowStore,"getCurrentSituation");
  requireMethod("contact situatedLifeStore",situatedLifeStore,"listCurrentLifeRelations");
  requireMethod("contact semanticStateStore",semanticStateStore,"listCurrentState");
  requireMethod("contact memoryStore",memoryStore,"listCurrentMemories");
  requireMethod("contact experienceStore",experienceStore,"getThreadExperienceConsolidation");
  requireMethod("contact experienceStore",experienceStore,"getThreadExperienceConsolidationStage");
  requireMethod("contact contactStore",contactStore,"getAttemptByConsolidation");
  requireMethod("contact contactStore",contactStore,"claimAttempt");
  requireMethod("contact contactStore",contactStore,"listUnconsideredAfterthoughtSources");
  requireMethod("contact contactStore",contactStore,"listPendingAttempts");
  requireMethod("contact contactStore",contactStore,"recordStage");
  requireMethod("contact contactStore",contactStore,"getStage");
  requireMethod("contact contactStore",contactStore,"recordMessage");
  requireMethod("contact contactStore",contactStore,"getPersonCapability");
  requireMethod("contact contactStore",contactStore,"hasPendingAttempts");
  requireMethod("contact modelAdapter",modelAdapter,"invoke");
  if(typeof now!=="function")throw new TypeError("contact now must be a function");
  if(!Number.isSafeInteger(batchLimit)||batchLimit<1||batchLimit>16){
    throw new TypeError("contact batchLimit must be 1-16");
  }
  if(!Number.isSafeInteger(sourceScanLimit)||sourceScanLimit<batchLimit||sourceScanLimit>256){
    throw new TypeError("contact sourceScanLimit must be batchLimit-256");
  }

  function currentCandidates(threadId){
    return routeCandidates({
      threadId,
      relations:situatedLifeStore.listCurrentLifeRelations(threadId),
      worldReader,
      contactStore,
    });
  }

  function unconsideredSources(){
    return contactStore.listUnconsideredAfterthoughtSources({
      limit:sourceScanLimit,
    }).map((source)=>Object.freeze({
      source,
      candidates:currentCandidates(source.threadId),
    }));
  }

  async function runAttempt(attempt,cachedCandidates=null){
    const {consolidation,afterthoughts}=sourceFromConsolidation(
      experienceStore,
      attempt.consolidationId,
    );
    const thread=worldReader.getThread(attempt.threadId,{required:false});
    if(thread===null)throw new TypeError(`contact Thread ${attempt.threadId} was not found`);
    const currentSituation=livedNowStore.getCurrentSituation(attempt.threadId);
    const semanticStates=semanticStateStore.listCurrentState(attempt.threadId);
    const memories=memoryStore.listCurrentMemories(attempt.threadId,{
      limit:8,
      newestFirst:true,
    });
    const candidates=cachedCandidates??currentCandidates(attempt.threadId);
    let decisionStage=contactStore.getStage(attempt.contactAttemptId,"decision");

    if(decisionStage===null){
      if(candidates.length===0){
        const complete=contactStore.getStage(attempt.contactAttemptId,"complete")
          ??contactStore.recordStage({
            contactAttemptId:attempt.contactAttemptId,
            stage:"complete",
            recordedAt:now(),
            payload:{
              outcome:"no_route",
              recipientPartyId:null,
              messageId:null,
            },
          });
        return Object.freeze({
          contactAttemptId:attempt.contactAttemptId,
          consolidationId:attempt.consolidationId,
          outcome:complete.payload.outcome,
          completed:true,
        });
      }
      const decision=await decideLaterContact({
        thread,
        afterthoughts,
        currentSituation,
        semanticStates,
        memories,
        candidates,
        modelAdapter,
      });
      decisionStage=contactStore.recordStage({
        contactAttemptId:attempt.contactAttemptId,
        stage:"decision",
        recordedAt:now(),
        payload:{
          decision:decision.decision,
          recipientPartyId:decision.recipientPartyId,
          reason:decision.reason,
          provenance:decision.provenance,
        },
      });
    }

    if(decisionStage.payload.decision==="keep_private"){
      const complete=contactStore.getStage(attempt.contactAttemptId,"complete")
        ??contactStore.recordStage({
          contactAttemptId:attempt.contactAttemptId,
          stage:"complete",
          recordedAt:now(),
          payload:{
            outcome:"kept_private",
            recipientPartyId:null,
            messageId:null,
          },
        });
      return Object.freeze({
        contactAttemptId:attempt.contactAttemptId,
        consolidationId:attempt.consolidationId,
        outcome:complete.payload.outcome,
        completed:true,
      });
    }

    const recipientPartyId=decisionStage.payload.recipientPartyId;
    const candidate=candidates.find((item)=>item.partyId===recipientPartyId)??null;
    if(candidate===null){
      const complete=contactStore.getStage(attempt.contactAttemptId,"complete")
        ??contactStore.recordStage({
          contactAttemptId:attempt.contactAttemptId,
          stage:"complete",
          recordedAt:now(),
          payload:{
            outcome:"route_unavailable",
            recipientPartyId,
            messageId:null,
          },
        });
      return Object.freeze({
        contactAttemptId:attempt.contactAttemptId,
        consolidationId:attempt.consolidationId,
        outcome:complete.payload.outcome,
        completed:true,
      });
    }

    let expressionStage=contactStore.getStage(attempt.contactAttemptId,"expression");
    if(expressionStage===null){
      const expression=await expressLaterContact({
        thread,
        afterthoughts,
        currentSituation,
        semanticStates,
        memories,
        candidate,
        privateDecision:decisionStage.payload,
        modelAdapter,
      });
      expressionStage=contactStore.recordStage({
        contactAttemptId:attempt.contactAttemptId,
        stage:"expression",
        recordedAt:now(),
        payload:{
          recipientPartyId,
          recipientKind:candidate.recipientKind,
          messageText:expression.messageText,
          provenance:expression.provenance,
        },
      });
    }

    const routeNow=currentCandidates(attempt.threadId)
      .find((item)=>item.partyId===recipientPartyId)??null;
    if(routeNow===null){
      const complete=contactStore.getStage(attempt.contactAttemptId,"complete")
        ??contactStore.recordStage({
          contactAttemptId:attempt.contactAttemptId,
          stage:"complete",
          recordedAt:now(),
          payload:{
            outcome:"route_unavailable",
            recipientPartyId,
            messageId:null,
          },
        });
      return Object.freeze({
        contactAttemptId:attempt.contactAttemptId,
        consolidationId:attempt.consolidationId,
        outcome:complete.payload.outcome,
        completed:true,
      });
    }

    const message=contactStore.recordMessage({
      contactAttemptId:attempt.contactAttemptId,
      senderThreadId:attempt.threadId,
      recipientPartyId,
      recipientKind:routeNow.recipientKind,
      sentAt:expressionStage.recordedAt,
      messageText:expressionStage.payload.messageText,
      sourceConsolidationId:consolidation.consolidationId,
    });
    const complete=contactStore.getStage(attempt.contactAttemptId,"complete")
      ??contactStore.recordStage({
        contactAttemptId:attempt.contactAttemptId,
        stage:"complete",
        recordedAt:now(),
        payload:{
          outcome:"delivered",
          recipientPartyId,
          messageId:message.messageId,
        },
      });
    return Object.freeze({
      contactAttemptId:attempt.contactAttemptId,
      consolidationId:attempt.consolidationId,
      outcome:complete.payload.outcome,
      completed:true,
      messageId:message.messageId,
    });
  }

  function hasPending(){
    if(contactStore.hasPendingAttempts())return true;
    return contactStore.listUnconsideredAfterthoughtSources({limit:1}).length>0;
  }

  return Object.freeze({
    hasPending,

    async runOnce(){
      const results=[];
      let failed=0;
      let attempted=0;

      const pending=contactStore.listPendingAttempts({limit:batchLimit});
      for(const attempt of pending){
        attempted+=1;
        try{
          results.push(await runAttempt(attempt));
        }catch(error){
          failed+=1;
          results.push(Object.freeze({
            contactAttemptId:attempt.contactAttemptId,
            consolidationId:attempt.consolidationId,
            outcome:"failed",
            completed:false,
            errorName:error?.constructor?.name??"Error",
            message:String(error?.message??error).slice(0,300),
          }));
        }
      }

      const remaining=batchLimit-attempted;
      if(remaining>0){
        const sources=unconsideredSources().slice(0,remaining);
        for(const {source,candidates} of sources){
          attempted+=1;
          let attempt=null;
          try{
            attempt=contactStore.claimAttempt({
              threadId:source.threadId,
              consolidationId:source.consolidationId,
              startedAt:now(),
            });
            results.push(await runAttempt(attempt,candidates));
          }catch(error){
            failed+=1;
            results.push(Object.freeze({
              contactAttemptId:attempt?.contactAttemptId??null,
              consolidationId:source.consolidationId,
              outcome:"failed",
              completed:false,
              errorName:error?.constructor?.name??"Error",
              message:String(error?.message??error).slice(0,300),
            }));
          }
        }
      }

      return Object.freeze({
        attempted,
        completed:results.filter((item)=>item.completed===true).length,
        failed,
        hasPending:hasPending(),
        results:Object.freeze(results),
      });
    },
  });
}
