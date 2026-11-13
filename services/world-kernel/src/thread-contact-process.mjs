import {
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
} from "./persistence-common.mjs";
import {
  decideLaterContact,
  expressLaterContact,
} from "./lived-contact-cognition.mjs";
import { feltSocialBody, feltTowardPeople } from "./interoceptive-cognition.mjs";
import { bodyTowardPeople, livedRegulationForLivedHistory } from "./lived-now-regulation.mjs";
import { sameGroundNow } from "./engagement.mjs";
import { socialVenueVisitSince } from "./world-social-opportunity.mjs";
import { bookInHand } from "./scene-glance.mjs";
import { observablePerson } from "./world-observable-person.mjs";

const APPROACHES_PER_VISIT=3;

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
        relationRef:relation.relationId,
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
  livedNow,
  situatedLifeStore,
  semanticStateStore,
  memoryStore,
  experienceStore,
  contactStore,
  livedNowStore,
  modelAdapter,
  // Going over to someone here (presence) is the ordinary approach; without
  // a meeting service, a Thread can only write.
  meetingService=null,
  embodimentStore=null,
  now=()=>new Date().toISOString(),
  batchLimit=4,
}={}){
  requireMethod("contact worldReader",worldReader,"getThread");
  requireMethod("contact livedNow",livedNow,"ensure");
  requireMethod("contact livedNowStore",livedNowStore,"getPreviousSituation");
  requireMethod("contact situatedLifeStore",situatedLifeStore,"listCurrentLifeRelations");
  requireMethod("contact semanticStateStore",semanticStateStore,"listCurrentState");
  requireMethod("contact memoryStore",memoryStore,"listCurrentMemories");
  requireMethod("contact experienceStore",experienceStore,"getThreadExperienceConsolidation");
  requireMethod("contact experienceStore",experienceStore,"getThreadExperienceConsolidationStage");
  requireMethod("contact contactStore",contactStore,"getAttemptByConsolidation");
  requireMethod("contact contactStore",contactStore,"claimAttempt");
  requireMethod("contact contactStore",contactStore,"listUnconsideredAfterthoughtSources");
  requireMethod("contact contactStore",contactStore,"dismissUnroutableAfterthoughtSource");
  requireMethod("contact contactStore",contactStore,"listPendingAttempts");
  requireMethod("contact contactStore",contactStore,"recordStage");
  requireMethod("contact contactStore",contactStore,"getStage");
  requireMethod("contact contactStore",contactStore,"recordMessage");
  requireMethod("contact contactStore",contactStore,"getPersonCapability");
  requireMethod("contact contactStore",contactStore,"hasPendingAttempts");
  requireMethod("contact modelAdapter",modelAdapter,"invoke");
  if(meetingService!==null){
    requireMethod("contact meetingService",meetingService,"meet");
    for(const method of ["getCurrentSituation","getWorldPlace","listCurrentVenueSituations"])
      requireMethod("contact livedNowStore",livedNowStore,method);
    requireMethod("contact experienceStore",experienceStore,"listSeenSince");
    requireMethod("contact contactStore",contactStore,"countApproaches");
  }
  if(typeof now!=="function")throw new TypeError("contact now must be a function");
  if(!Number.isSafeInteger(batchLimit)||batchLimit<1||batchLimit>16){
    throw new TypeError("contact batchLimit must be 1-16");
  }
  function currentCandidates(threadId){
    return routeCandidates({
      threadId,
      relations:situatedLifeStore.listCurrentLifeRelations(threadId),
      worldReader,
      contactStore,
    });
  }

  // Who is here (presence): people at the same place now whom this Thread
  // has seen during this visit, in a Story they were both in. Going over to
  // someone needs no door, and happens at most three times a visit.
  function peopleHere(threadId,at,{capped=true}={}){
    if(meetingService===null)return [];
    const situation=livedNowStore.getCurrentSituation(threadId);
    if(situation?.location?.kind!=="place"||situation.wakefulness==="asleep")return [];
    const venueRef=livedNowStore.getWorldPlace(threadId,situation.location.placeRef,
      {required:false})?.physicalVenue?.ref??null;
    const since=venueRef===null?null:socialVenueVisitSince(livedNowStore,situation,venueRef);
    if(since===null)return [];
    const seen=new Set(experienceStore.listSeenSince(threadId,{since}));
    if(seen.size===0)return [];
    return livedNowStore.listCurrentVenueSituations({venueRef,at,limit:8,excludeThreadId:threadId})
      .filter(other=>seen.has(other.threadId)&&(!capped||contactStore.countApproaches({
        threadId,recipientPartyId:other.threadId,since})<APPROACHES_PER_VISIT))
      .map(other=>({situation:other,venueRef}));
  }
  // What anyone can see of someone here: a book in hand, or what they are doing.
  function hereLine({situation,venueRef},at){
    const book=bookInHand({experienceStore,threadId:situation.threadId,venueRef,at});
    return book!==null?`They are here, reading "${book.title}" by ${book.by}.`
      :situation.outwardActivity?`They are here, ${situation.outwardActivity}.`:"They are here.";
  }

  // Everyone it could reach: whom it can write to, and whom it could go over to.
  function candidatesFor(threadId,at){
    const routes=currentCandidates(threadId);
    const here=peopleHere(threadId,at);
    const hereOf=(partyId)=>here.find(person=>person.situation.threadId===partyId);
    const reachable=routes.map(candidate=>{
      const person=candidate.recipientKind==="thread"?hereOf(candidate.partyId):undefined;
      return Object.freeze({...candidate,canWrite:true,
        ...(person===undefined?{}:{here:hereLine(person,at)})});
    });
    for(const person of here){
      const partyId=person.situation.threadId;
      if(reachable.some(candidate=>candidate.recipientKind==="thread"&&candidate.partyId===partyId))continue;
      const identity=worldReader.getThread(partyId,{required:false})?.identity;
      if(!identity)continue;
      const seen=observablePerson({threadId:partyId,situation:person.situation,observerThreadId:threadId,
        name:identity.name??null,birthDate:identity.birthDate??null,sex:identity.sex??null,
        embodimentStore,situatedLifeStore,experienceStore,at});
      reachable.push(Object.freeze({partyId,recipientKind:"thread",
        displayName:seen.name??seen.observableDescription,relationKind:"here",
        factualRoleRefs:[],relationshipFacts:[],capabilityRef:null,
        canWrite:false,here:hereLine(person,at)}));
    }
    return Object.freeze(reachable.sort((left,right)=>left.partyId.localeCompare(right.partyId)));
  }

  function unconsideredSources(limit){
    return contactStore.listUnconsideredAfterthoughtSources({limit})
      .map((source)=>Object.freeze({
        source,
        candidates:candidatesFor(source.threadId,meetingService===null?null:now()),
      }));
  }

  // Going over in person to someone here, with what it had on its mind: the
  // ordinary approach, where the Thread chooses how to open and the other how
  // to answer. Made at most once: an approach begun is not made again.
  async function goOver(attempt,decisionStage,afterthoughts){
    const id=attempt.contactAttemptId;
    const recipientPartyId=decisionStage.payload.recipientPartyId;
    const finish=(payload)=>{
      const complete=contactStore.getStage(id,"complete")??contactStore.recordStage({
        contactAttemptId:id,stage:"complete",recordedAt:now(),
        payload:{recipientPartyId,messageId:null,...payload}});
      return Object.freeze({contactAttemptId:id,consolidationId:attempt.consolidationId,
        outcome:complete.payload.outcome,completed:true});
    };
    if(contactStore.getStage(id,"complete")!==null)return finish({});
    if(contactStore.getStage(id,"expression")!==null)return finish({outcome:"went_over_interrupted"});
    const at=now();
    if(meetingService===null||!peopleHere(attempt.threadId,at,{capped:false})
      .some(person=>person.situation.threadId===recipientPartyId))return finish({outcome:"no_longer_here"});
    // Neither life may be mid-change; the attempt waits until both are settled.
    const unsettled=(threadId)=>{
      const boundary=livedNowStore.inspectLivedBoundary?.(threadId)??null;
      return (boundary?.failedAttempts??0)>0
        ||(boundary?.dueAt!=null&&Date.parse(boundary.dueAt)<=Date.parse(at));
    };
    if(unsettled(attempt.threadId)||unsettled(recipientPartyId))return Object.freeze({
      contactAttemptId:id,consolidationId:attempt.consolidationId,outcome:"waiting",completed:false});
    contactStore.recordStage({contactAttemptId:id,stage:"expression",recordedAt:at,
      payload:{recipientPartyId,recipientKind:"thread",wentOver:true}});
    const met=await meetingService.meet({initiatorThreadId:attempt.threadId,at,
      counterpartyThreadId:recipientPartyId,sourceKind:"intention",
      cameOverToSay:afterthoughts.map(item=>structuredClone(item))});
    const first=met.attempts?.[0]??null;
    return finish({outcome:"went_over",approach:first?.outcome??met.outcome,
      encounterRef:first?.encounterStory?.encounterId??null});
  }

  async function runAttempt(attempt,cachedCandidates=null){
    const {consolidation,afterthoughts}=sourceFromConsolidation(
      experienceStore,
      attempt.consolidationId,
    );
    const thread=worldReader.getThread(attempt.threadId,{required:false});
    if(thread===null)throw new TypeError(`contact Thread ${attempt.threadId} was not found`);
    let candidates=cachedCandidates??candidatesFor(attempt.threadId,meetingService===null?null:now());
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
      const contactAt=now();
      const currentSituation=await livedNow.ensure({
        threadId:attempt.threadId,
        at:contactAt,
      });
      // Who is here may have changed while its life caught up.
      const settled=candidatesFor(attempt.threadId,contactAt);
      if(settled.length>0)candidates=settled;
      const semanticStates=semanticStateStore.listCurrentState(attempt.threadId);
      const memories=memoryStore.listCurrentMemories(attempt.threadId,{inMind:"background",
        limit:8,
        newestFirst:true,
      });
      // The social Body at the moment of choosing: how spent by talk and
      // messages, and how much it wants company.
      const body=feltSocialBody(livedRegulationForLivedHistory({
        thread,livedNowStore,currentSituation,experienceStore,asOf:contactAt,
      }));
      // How the Body takes each Thread it could reach: at ease or guarded,
      // missing them or with them here.
      const toward=feltTowardPeople(bodyTowardPeople({thread,experienceStore,asOf:contactAt,
        people:candidates.filter(candidate=>candidate.recipientKind==="thread")
          .map(candidate=>({threadId:candidate.partyId,evidenceRef:candidate.relationRef??candidate.partyId,
            present:typeof candidate.here==="string"}))}));
      // Whether what it would write about goes over ground covered lately.
      const ground=sameGroundNow({experienceStore,threadId:thread.threadId,at:contactAt,
        text:afterthoughts.map(item=>item.text).join(" ")});
      const decision=await decideLaterContact({
        thread,
        afterthoughts,
        currentSituation,
        semanticStates,
        memories,
        candidates:candidates.map(candidate=>toward.has(candidate.partyId)
          ?{...candidate,felt:toward.get(candidate.partyId).join(" ")}:candidate),
        body,
        sameGround:ground,
        modelAdapter,
      });
      decisionStage=contactStore.recordStage({
        contactAttemptId:attempt.contactAttemptId,
        stage:"decision",
        recordedAt:contactAt,
        payload:{
          decision:decision.decision,
          recipientPartyId:decision.recipientPartyId,
          reason:decision.reason,
          provenance:decision.provenance,
          // What the Body said at this choice, in the words the Thread read:
          // for operators reading why it wrote or did not. Never read back.
          felt:{body:[...body],toward:Object.fromEntries([...toward].map(([party,lines])=>[party,[...lines]])),
            sameGround:ground},
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

    if(decisionStage.payload.decision==="go_over")return goOver(attempt,decisionStage,afterthoughts);

    const recipientPartyId=decisionStage.payload.recipientPartyId;
    const candidate=candidates.find((item)=>item.partyId===recipientPartyId&&item.canWrite!==false)??null;
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
      const contactAt=now();
      const currentSituation=await livedNow.ensure({
        threadId:attempt.threadId,
        at:contactAt,
      });
      const semanticStates=semanticStateStore.listCurrentState(attempt.threadId);
      const memories=memoryStore.listCurrentMemories(attempt.threadId,{inMind:"background",
        limit:8,
        newestFirst:true,
      });
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
        recordedAt:contactAt,
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
      let sourcesExhausted=false;
      if(remaining>0){
        const sources=unconsideredSources(remaining);
        sourcesExhausted=sources.length===0;
        for(const {source,candidates} of sources){
          attempted+=1;
          let attempt=null;
          try{
            if(candidates.length===0){
              contactStore.dismissUnroutableAfterthoughtSource(source.consolidationId);
              results.push(Object.freeze({
                contactAttemptId:null,
                consolidationId:source.consolidationId,
                outcome:"no_route",
                completed:true,
              }));
              continue;
            }
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
        // An entirely quiet pass has already checked both durable queues,
        // without yielding to another request; do not scan them twice.
        hasPending:attempted===0&&sourcesExhausted?false:hasPending(),
        results:Object.freeze(results),
      });
    },
  });
}
