import {EXPERIENCE_CONSOLIDATION_DELAY_MS} from "./lived-experience-consolidation-scheduler.mjs";
import {promptRequest} from "./cognition-prompts.mjs";
import {observablePerson} from "./world-observable-person.mjs";
import {assertDescriptiveSemanticState} from "./semantic-state.mjs";
import {writeMissingGists} from "./memory-gists.mjs";
import {
  INTEREST_CHANGE_LIMIT,INTEREST_CHANGE_SCHEMA,admitInterestChanges,
  formFormativeInterests,interestsInReflection,
} from "./thread-interests.mjs";
import {
  AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
  AUTOBIOGRAPHICAL_MEMORY_POLICY,
  autobiographicalMeaningPartId,
  autobiographicalMemoryId,
} from "./autobiographical-memory-domain.mjs";
import {
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

const DEFAULT_BATCH_LIMIT=4;
const DEFAULT_GROUP_LIMIT=8;
const DEFAULT_GROUP_WINDOW_MS=EXPERIENCE_CONSOLIDATION_DELAY_MS;
const MEMORY_LIMIT=6;
// The ways one Thread may regard another (registered relationship_attitude
// dimensions). The first-person description, not the aspect, carries meaning.
const STANCE_ASPECTS=Object.freeze(["fondness","trust","respect","attachment","resentment","guardedness"]);
const STANCE_LIMIT=2;

function requireMethod(name,value,method){
  if(!value||typeof value!=="object"||typeof value[method]!=="function"){
    throw new TypeError(`${name}.${method} is required`);
  }
}

function boundedMemories(memories){
  return [...memories]
    .sort((left,right)=>Date.parse(right.asOf)-Date.parse(left.asOf))
    .slice(0,MEMORY_LIMIT)
    .map((memory)=>({
      memoryId:memory.memoryId,
      rememberedContent:memory.rememberedContent??null,
      rememberedMeaning:memory.rememberedMeaning??null,
      salience:memory.salience,
      accessibility:memory.accessibility,
      asOf:memory.asOf,
    }));
}

function semanticContext(states){
  return states.map((state)=>({
    domain:state.domain,
    dimension:state.dimension,
    target:state.target??null,
    state:state.state,
  }));
}

function normalizeStances(stances){
  if(!Array.isArray(stances)||stances.length>STANCE_LIMIT){
    throw new TypeError(`experience consolidation stances must contain at most ${STANCE_LIMIT} items`);
  }
  return Object.freeze(stances.map((item,index)=>{
    assertPlainObject(`experience consolidation stances[${index}]`,item);
    assertNonEmpty(`experience consolidation stances[${index}].personRef`,item.personRef);
    if(!STANCE_ASPECTS.includes(item.aspect)){
      throw new TypeError("experience consolidation stance aspect is invalid");
    }
    assertNonEmpty(`experience consolidation stances[${index}].regard`,item.regard);
    return Object.freeze({personRef:item.personRef,aspect:item.aspect,regard:item.regard.trim()});
  }));
}

function normalizeDecision(output){
  assertPlainObject("experience consolidation decision",output);
  const journalEntry=output.journalEntry??null;
  if(journalEntry!==null)assertNonEmpty("experience consolidation journalEntry",journalEntry);
  if(!Array.isArray(output.afterthoughts)||output.afterthoughts.length>3){
    throw new TypeError("experience consolidation afterthoughts must contain at most 3 items");
  }
  const afterthoughts=output.afterthoughts.map((item,index)=>{
    assertPlainObject(`experience consolidation afterthoughts[${index}]`,item);
    if(!["insight","question","intention"].includes(item.kind)){
      throw new TypeError("experience consolidation afterthought kind is invalid");
    }
    assertNonEmpty(`experience consolidation afterthoughts[${index}].text`,item.text);
    return Object.freeze({kind:item.kind,text:item.text.trim()});
  });

  const stances=normalizeStances(output.stances??[]);
  // Decisions recorded before interests existed have none.
  const interests=Object.freeze((Array.isArray(output.interests)?output.interests:[])
    .slice(0,INTEREST_CHANGE_LIMIT)
    .filter(item=>item!==null&&typeof item==="object"
      &&["form","deepen","revise","let_go"].includes(item.change)
      &&(item.interestRef===null||typeof item.interestRef==="string"))
    .map(item=>Object.freeze({change:item.change,interestRef:item.interestRef,
      subject:item.subject,draw:item.draw,selfImage:item.selfImage,
      openQuestions:Object.freeze(Array.isArray(item.openQuestions)?[...item.openQuestions]:[])})));

  assertPlainObject("experience consolidation memory",output.memory);
  const memory=output.memory;
  if(!["not_remembered","retained"].includes(memory.outcome)){
    throw new TypeError("experience consolidation memory outcome is invalid");
  }
  assertStringArray("experience consolidation memory uncertainty",memory.uncertainty);
  if(memory.outcome==="not_remembered"){
    return Object.freeze({
      journalEntry,
      afterthoughts:Object.freeze(afterthoughts),
      stances,
      interests,
      memory:Object.freeze({
        outcome:"not_remembered",
        rememberedContent:null,
        rememberedMeaning:null,
        gist:null,
        confidence:null,
        salience:null,
        uncertainty:Object.freeze([...memory.uncertainty]),
      }),
    });
  }
  // A gist is optional (decisions recorded before gists have none); one too
  // slight to carry the memory is not kept, and the memory is held in full.
  const gist=typeof memory.gist==="string"&&memory.gist.trim().length>=12?memory.gist.trim():null;
  assertNonEmpty("experience consolidation rememberedContent",memory.rememberedContent);
  if(memory.rememberedMeaning!==null)assertNonEmpty(
    "experience consolidation rememberedMeaning",
    memory.rememberedMeaning,
  );
  assertFiniteNumber("experience consolidation confidence",memory.confidence,{minimum:0});
  assertFiniteNumber("experience consolidation salience",memory.salience,{minimum:0});
  if(memory.confidence>1||memory.salience>1){
    throw new TypeError("experience consolidation memory scores must be at most 1");
  }
  return Object.freeze({
    journalEntry,
    afterthoughts:Object.freeze(afterthoughts),
    stances,
    interests,
    memory:Object.freeze({
      outcome:"retained",
      rememberedContent:memory.rememberedContent,
      rememberedMeaning:memory.rememberedMeaning,
      gist,
      confidence:memory.confidence,
      salience:memory.salience,
      uncertainty:Object.freeze([...memory.uncertainty]),
    }),
  });
}

function decisionRequestId(input){
  return `experience-consolidation_${sha256(canonicalJson(input))}`;
}

async function formDecision({
  consolidation,
  thread,
  situation,
  experiences,
  encounterStories,
  semanticStates,
  memories,
  people,
  interests,
  modelAdapter,
}){
  const storyById=new Map(encounterStories.map((story)=>[story.encounterId,story]));
  // Stable self first, this cluster's evidence and identity last, so one
  // Thread's successive consolidations share a prompt prefix.
  const input={
    thread:{
      threadId:thread.threadId,
      name:thread.identity?.name??null,
      selfDescription:thread.identity?.selfDescription??"",
      selfModel:thread.currentState?.selfModel??"",
      stableTendencies:structuredClone(thread.genome?.textualTraits??{}),
      unresolvedIntentions:[...(thread.currentState?.unresolvedIntentions??[])],
    },
    semanticStates:semanticContext(semanticStates),
    interests:interestsInReflection(interests),
    priorMemories:boundedMemories(memories),
    experiencedSituation:structuredClone(situation),
    experiences:experiences.map((experience)=>({
      experienceId:experience.experienceId,
      occurredAt:experience.occurredAt,
      experiencedAs:experience.experienceText??null,
      encounterStory:structuredClone(storyById.get(experience.encounterRef)?.story??null),
    })),
    people:people.map(person=>({personRef:person.personRef,name:person.name,
      appearance:person.appearance})),
    consolidation:{
      consolidationId:consolidation.consolidationId,
      startedAt:consolidation.startedAt,
    },
  };

  const invocation=await modelAdapter.invoke({
    ...promptRequest("experience.consolidation",{threadId:thread.threadId}),
    input,
    responseSchema:{
      type:"object",
      additionalProperties:false,
      required:["journalEntry","memory","afterthoughts","stances","interests"],
      properties:{
        journalEntry:{anyOf:[{type:"string",minLength:1},{type:"null"}]},
        afterthoughts:{
          type:"array",
          maxItems:3,
          items:{
            type:"object",
            additionalProperties:false,
            required:["kind","text"],
            properties:{
              kind:{type:"string",enum:["insight","question","intention"]},
              text:{type:"string",minLength:1,maxLength:500},
            },
          },
        },
        interests:INTEREST_CHANGE_SCHEMA,
        stances:{
          type:"array",
          maxItems:STANCE_LIMIT,
          items:{
            type:"object",
            additionalProperties:false,
            required:["personRef","aspect","regard"],
            properties:{
              personRef:{type:"string",minLength:1},
              aspect:{type:"string",enum:[...STANCE_ASPECTS]},
              regard:{type:"string",minLength:1,maxLength:400},
            },
          },
        },
        memory:{
          type:"object",
          additionalProperties:false,
          required:[
            "outcome","rememberedContent","rememberedMeaning","gist",
            "confidence","salience","uncertainty",
          ],
          properties:{
            outcome:{type:"string",enum:["not_remembered","retained"]},
            rememberedContent:{anyOf:[{type:"string",minLength:1},{type:"null"}]},
            rememberedMeaning:{anyOf:[{type:"string",minLength:1},{type:"null"}]},
            gist:{anyOf:[{type:"string",minLength:12,maxLength:280},{type:"null"}]},
            confidence:{anyOf:[{type:"number",minimum:0,maximum:1},{type:"null"}]},
            salience:{anyOf:[{type:"number",minimum:0,maximum:1},{type:"null"}]},
            uncertainty:{type:"array",items:{type:"string",minLength:1}},
          },
        },
      },
    },
    clientRequestId:decisionRequestId(input),
  });
  return normalizeDecision(invocation.output);
}

// The others who acted in these experiences, as this Thread knows them, each
// with the experiences that are its evidence about them.
function peopleIn({threadId,experiences,encounterStories,situation,at,
  worldReader,situatedLifeStore,embodimentStore,experienceStore}){
  const evidence=new Map();
  experiences.forEach((experience,index)=>{
    for(const beat of encounterStories[index]?.story?.beats??[]){
      const other=beat.actorThreadId;
      if(typeof other!=="string"||other===threadId)continue;
      if(!evidence.has(other))evidence.set(other,new Set());
      evidence.get(other).add(experience.experienceId);
    }
  });
  return [...evidence].map(([personRef,refs])=>{
    const identity=worldReader.getThread(personRef,{required:false})?.identity??{};
    const person=observablePerson({
      threadId:personRef,situation,observerThreadId:threadId,at,
      name:identity.name??null,birthDate:identity.birthDate??null,sex:identity.sex??null,
      embodimentStore,situatedLifeStore,experienceStore,
    });
    return Object.freeze({personRef,name:person.name,
      appearance:person.observableDescription,evidenceRefs:Object.freeze([...refs])});
  });
}

// A stance is the Thread's own regard for a person, admitted as a private
// relationship_attitude that supersedes its earlier regard in that aspect.
// One naming no one who acted here, or prescribing instead of describing, is
// not admitted. Recording again after an interruption adds nothing.
function describes(regard){
  try{assertDescriptiveSemanticState("stance",regard);return true;}
  catch{return false;}
}

function admitStances({semanticStateStore,threadId,stances,people,asOf}){
  if(stances.length===0)return {admitted:[],dropped:0};
  if(typeof semanticStateStore.recordState!=="function"){
    throw new TypeError("semanticStateStore.recordState is required to admit stances");
  }
  const admitted=[];
  let dropped=0;
  for(const stance of stances){
    const person=people.find(item=>item.personRef===stance.personRef);
    if(person===undefined||!describes(stance.regard)){dropped+=1;continue;}
    const current=semanticStateStore.listCurrentState(threadId).find(state=>
      state.domain==="relationship_attitude"&&state.dimension===stance.aspect
      &&state.target?.targetId===person.personRef);
    if(current?.state===stance.regard
      &&canonicalJson(current.evidenceReferences)===canonicalJson(person.evidenceRefs)){
      admitted.push(current.stateId);
      continue;
    }
    admitted.push(semanticStateStore.recordState({
      threadId,domain:"relationship_attitude",dimension:stance.aspect,
      target:{kind:"thread",targetId:person.personRef,
        displayName:person.name??person.appearance},
      state:stance.regard,
      evidenceReferences:[...person.evidenceRefs],
      asOf,
      supersedes:current?.stateId??null,
      provenance:{
        author:threadId,authorType:"thread_cognition",
        policyId:"relationship_stance_formation",policyVersion:"1",
        validator:"semantic_state_validator",validatorVersion:"1",
      },
      visibility:"restricted",
      staleness:"current",
    }).state.stateId);
  }
  return {admitted,dropped};
}

function groupCandidates(candidates,{groupLimit,groupWindowMs}){
  const first=candidates[0];
  if(first===undefined)return [];
  const cutoff=Date.parse(first.occurredAt)+groupWindowMs;
  return candidates
    .filter((candidate)=>
      candidate.threadId===first.threadId
      &&candidate.situationId===first.situationId
      &&Date.parse(candidate.occurredAt)<=cutoff)
    .slice(0,groupLimit);
}

function consolidationMemoryRecord({
  consolidation,
  threadId,
  experiences,
  decision,
  recordedAt,
}){
  const first=experiences[0];
  const last=experiences.at(-1);
  const slot=`experience-consolidation-${consolidation.consolidationId.slice(-16)}`;
  const memoryId=autobiographicalMemoryId({
    threadId,
    originReference:first.experienceId,
    slot,
  });
  const durableMeaning=decision.rememberedMeaning!==null;
  return {
    recordFormat:AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
    memoryId,
    revision:1,
    threadId,
    subject:{originEventRef:first.experienceId,slot},
    subjectPeriod:{startAt:first.occurredAt,endAt:last.occurredAt},
    eventRefs:experiences.map((experience)=>experience.experienceId),
    rememberedContent:decision.rememberedContent,
    rememberedMeaning:decision.rememberedMeaning,
    ...(decision.gist===null?{}:{gist:decision.gist}),
    meaningOutcome:durableMeaning?"durable_meaning":"no_durable_meaning",
    meaningParts:durableMeaning?[{
      meaningPartId:autobiographicalMeaningPartId({memoryId,ordinal:1}),
      meaning:decision.rememberedMeaning,
    }]:[],
    asOf:recordedAt,
    confidence:decision.confidence,
    uncertainty:[...decision.uncertainty],
    salience:decision.salience,
    accessibility:"accessible",
    retentionState:"retained",
    authorship:{
      kind:"fibre_policy_derived",
      entityId:"fibre.world-kernel",
      policy:{...AUTOBIOGRAPHICAL_MEMORY_POLICY},
    },
    supportingEvidenceRefs:experiences.map((experience)=>experience.experienceId),
    contradictingEvidenceRefs:[],
    visibility:"private",
    status:"current",
    recordedAt,
  };
}

export function createExperienceConsolidationProcess({
  worldReader,
  livedNowStore,
  semanticStateStore,
  memoryStore,
  experienceStore,
  modelAdapter,
  situatedLifeStore=null,
  embodimentStore=null,
  journalBook=null,
  onAfterthoughts=null,
  now=()=>new Date().toISOString(),
  clock=Date.now,
  batchLimit=DEFAULT_BATCH_LIMIT,
  groupLimit=DEFAULT_GROUP_LIMIT,
  groupWindowMs=DEFAULT_GROUP_WINDOW_MS,
}={}){
  requireMethod("worldReader",worldReader,"getThread");
  requireMethod("livedNowStore",livedNowStore,"getSituation");
  requireMethod("semanticStateStore",semanticStateStore,"listCurrentState");
  requireMethod("memoryStore",memoryStore,"listCurrentMemories");
  requireMethod("memoryStore",memoryStore,"memoryHistory");
  requireMethod("memoryStore",memoryStore,"recordMemory");
  requireMethod("experienceStore",experienceStore,"listUnclaimedExperienceConsolidationCandidates");
  requireMethod("experienceStore",experienceStore,"createThreadExperienceConsolidation");
  requireMethod("experienceStore",experienceStore,"listPendingThreadExperienceConsolidations");
  requireMethod("experienceStore",experienceStore,"getThreadExperience");
  requireMethod("experienceStore",experienceStore,"getEncounterStory");
  requireMethod("experienceStore",experienceStore,"getThreadExperienceConsolidationStage");
  requireMethod("experienceStore",experienceStore,"recordThreadExperienceConsolidationStage");
  requireMethod("experienceStore",experienceStore,"recordThreadExperienceConsolidationJournal");
  requireMethod("experienceStore",experienceStore,"getThreadExperienceConsolidationJournal");
  requireMethod("experienceStore",experienceStore,"hasPendingExperienceConsolidation");
  requireMethod("modelAdapter",modelAdapter,"invoke");
  if(journalBook!==null)requireMethod("journalBook",journalBook,"ensureProfile");
  if(onAfterthoughts!==null&&typeof onAfterthoughts!=="function"){
    throw new TypeError("experience consolidation onAfterthoughts must be a function or null");
  }
  if(!Number.isSafeInteger(batchLimit)||batchLimit<1||batchLimit>16){
    throw new TypeError("experience consolidation batchLimit must be 1-16");
  }
  if(!Number.isSafeInteger(groupLimit)||groupLimit<1||groupLimit>16){
    throw new TypeError("experience consolidation groupLimit must be 1-16");
  }
  if(!Number.isSafeInteger(groupWindowMs)||groupWindowMs<1||groupWindowMs>3_600_000){
    throw new TypeError("experience consolidation groupWindowMs must be 1-3600000");
  }
  if(typeof now!=="function"||typeof clock!=="function")
    throw new TypeError("experience consolidation clocks must be functions");

  function claimGroups(limit,atMs){
    const claimed=[];
    while(claimed.length<limit){
      const candidates=experienceStore.listUnclaimedExperienceConsolidationCandidates({limit:64});
      const group=groupCandidates(candidates,{groupLimit,groupWindowMs});
      if(group.length===0)break;
      // Other World alarms may occur during the grouping window. Raw lived
      // Experience stays immediately readable; reflection waits until due.
      if(Date.parse(group[0].queuedAt)+groupWindowMs>atMs)break;
      const consolidation=experienceStore.createThreadExperienceConsolidation({
        threadId:group[0].threadId,
        experienceRefs:group.map((experience)=>experience.experienceId),
        startedAt:now(),
      });
      claimed.push(consolidation);
    }
    return claimed;
  }

  async function consolidate(consolidation){
    const experiences=consolidation.experienceRefs.map((ref)=>experienceStore.getThreadExperience(ref));
    if(experiences.some((experience)=>experience.threadId!==consolidation.threadId)){
      throw new TypeError("experience consolidation crossed Threads");
    }
    if(new Set(experiences.map((experience)=>experience.situationId)).size!==1){
      throw new TypeError("experience consolidation crossed enacted situations");
    }
    const situation=livedNowStore.getSituation(experiences[0].situationId);
    const thread=worldReader.getThread(consolidation.threadId,{required:false});
    if(thread===null)throw new TypeError(`Thread ${consolidation.threadId} was not found`);
    const encounterStories=experiences.map((experience)=>experienceStore.getEncounterStory(experience.encounterRef));
    const semanticStates=semanticStateStore.listCurrentState(consolidation.threadId);
    const memories=memoryStore.listCurrentMemories(consolidation.threadId,{
      newestFirst:true,
      limit:MEMORY_LIMIT,
    });
    const people=peopleIn({
      threadId:consolidation.threadId,experiences,encounterStories,situation,
      at:consolidation.startedAt,worldReader,situatedLifeStore,embodimentStore,experienceStore,
    });

    let decisionStage=experienceStore.getThreadExperienceConsolidationStage(
      consolidation.consolidationId,
      "decision",
    );
    const interestsHeld=typeof experienceStore.listCurrentInterests==="function";
    if(decisionStage===null){
      // Memories formed before gists existed gain the Thread's own gist, a
      // few per reflection, until every memory can be held by one.
      await writeMissingGists({thread,memoryStore,modelAdapter,now});
      // A Thread that has never held an interest first finds its own, once,
      // in its formative past; this reflection then sees them.
      if(interestsHeld){
        await formFormativeInterests({
          thread,memories:memoryStore.listCurrentMemories(consolidation.threadId),
          experienceStore,modelAdapter,asOf:consolidation.startedAt,
        });
      }
      const decision=await formDecision({
        consolidation,
        thread,
        situation,
        experiences,
        encounterStories,
        semanticStates,
        memories,
        people,
        interests:interestsHeld?experienceStore.listCurrentInterests(consolidation.threadId):[],
        modelAdapter,
      });
      decisionStage=experienceStore.recordThreadExperienceConsolidationStage({
        consolidationId:consolidation.consolidationId,
        stage:"decision",
        recordedAt:consolidation.startedAt,
        payload:decision,
      });
    }
    const decision=normalizeDecision(decisionStage.payload);

    let journalEntry=experienceStore.getThreadExperienceConsolidationJournal(
      consolidation.consolidationId,
    );
    if(decision.journalEntry!==null&&journalEntry===null){
      const writtenAt=now();
      journalEntry=experienceStore.recordThreadExperienceConsolidationJournal({
        consolidationId:consolidation.consolidationId,
        threadId:consolidation.threadId,
        writtenAt,
        entryText:decision.journalEntry,
      });
    }
    // Choosing a book is earned by a real Journal entry, once per Thread.
    // The book itself is a read-time view of this admitted World history.
    if(journalEntry!==null&&journalBook!==null){
      await journalBook.ensureProfile({thread,modelAdapter});
    }

    let memory=null;
    if(decision.memory.outcome==="retained"){
      const slot=`experience-consolidation-${consolidation.consolidationId.slice(-16)}`;
      const memoryId=autobiographicalMemoryId({
        threadId:consolidation.threadId,
        originReference:experiences[0].experienceId,
        slot,
      });
      const history=memoryStore.memoryHistory(
        consolidation.threadId,
        memoryId,
        {required:false},
      );
      if(history.length>0){
        memory=history[0];
      }else{
        const recordedAt=now();
        const candidate=consolidationMemoryRecord({
          consolidation,
          threadId:consolidation.threadId,
          experiences,
          decision:decision.memory,
          recordedAt,
        });
        memory=memoryStore.recordMemory(candidate);
      }
    }

    const stances=admitStances({
      semanticStateStore,threadId:consolidation.threadId,
      stances:decision.stances,people,asOf:consolidation.startedAt,
    });

    const interests=interestsHeld?admitInterestChanges({
      experienceStore,threadId:consolidation.threadId,changes:decision.interests,
      current:experienceStore.listCurrentInterests(consolidation.threadId),
      evidenceRefs:experiences.map(experience=>experience.experienceId),
      sourceRef:consolidation.consolidationId,asOf:consolidation.startedAt,
    }):{admitted:[],dropped:0};

    const completion=experienceStore.recordThreadExperienceConsolidationStage({
      consolidationId:consolidation.consolidationId,
      stage:"complete",
      recordedAt:now(),
      payload:{
        journalEntryId:journalEntry?.journalEntryId??null,
        memoryOutcome:decision.memory.outcome,
        memoryId:memory?.memoryId??null,
        afterthoughtCount:decision.afterthoughts.length,
        stanceRefs:stances.admitted,
        interestRefs:interests.admitted,
      },
    });

    let afterthoughtDelivery=Object.freeze({attempted:false,ok:true,result:null});
    if(decision.afterthoughts.length>0&&onAfterthoughts!==null){
      try{
        const result=await onAfterthoughts(Object.freeze({
          threadId:consolidation.threadId,
          consolidationId:consolidation.consolidationId,
          afterthoughts:decision.afterthoughts,
        }));
        afterthoughtDelivery=Object.freeze({
          attempted:true,
          ok:true,
          result:result===undefined?null:structuredClone(result),
        });
      }catch(error){
        afterthoughtDelivery=Object.freeze({
          attempted:true,
          ok:false,
          result:null,
          errorName:error?.constructor?.name??"Error",
          message:String(error?.message??error).slice(0,300),
        });
      }
    }

    return Object.freeze({
      consolidationId:consolidation.consolidationId,
      threadId:consolidation.threadId,
      experienceCount:experiences.length,
      journalEntryId:completion.payload.journalEntryId,
      memoryOutcome:completion.payload.memoryOutcome,
      memoryId:completion.payload.memoryId,
      afterthoughts:decision.afterthoughts,
      afterthoughtDelivery,
      stanceRefs:completion.payload.stanceRefs??[],
      stancesDropped:stances.dropped,
      interestRefs:completion.payload.interestRefs??[],
      interestsDropped:interests.dropped,
    });
  }

  return Object.freeze({
    async runOnce(){
      const atMs=clock();
      let pending=experienceStore.listPendingThreadExperienceConsolidations({
        limit:batchLimit,
      });
      let claimed=[];
      if(pending.length<batchLimit){
        claimed=claimGroups(batchLimit-pending.length,atMs);
        if(claimed.length>0){
          pending=experienceStore.listPendingThreadExperienceConsolidations({
            limit:batchLimit,
          });
        }
      }

      const results=[];
      let failed=0;
      for(const consolidation of pending){
        try{
          results.push(await consolidate(consolidation));
        }catch(error){
          failed+=1;
          results.push(Object.freeze({
            consolidationId:consolidation.consolidationId,
            threadId:consolidation.threadId,
            errorName:error?.constructor?.name??"Error",
            message:String(error?.message??error).slice(0,300),
          }));
        }
      }
      const next=experienceStore.listUnclaimedExperienceConsolidationCandidates({limit:1})[0];
      const nextDueAt=next
        ?new Date(Date.parse(next.queuedAt)+groupWindowMs).toISOString():null;
      const hasUnfinished=failed>0||
        experienceStore.listPendingThreadExperienceConsolidations({limit:1}).length>0;
      return Object.freeze({
        attempted:pending.length,
        completed:pending.length-failed,
        failed,
        // Future clusters need their deadline, not an immediate retry storm.
        hasPending:hasUnfinished||(nextDueAt!==null&&Date.parse(nextDueAt)<=atMs),
        nextDueAt,
        results:Object.freeze(results),
      });
    },
  });
}
