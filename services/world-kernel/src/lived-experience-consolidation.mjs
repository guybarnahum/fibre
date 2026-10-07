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
import { formThreadJournalProfile } from "./thread-journal-book.mjs";

const DEFAULT_BATCH_LIMIT=4;
const DEFAULT_GROUP_LIMIT=8;
const DEFAULT_GROUP_WINDOW_MS=15*60*1000;
const MEMORY_LIMIT=6;

function requireMethod(name,value,method){
  if(!value||typeof value!=="object"||typeof value[method]!=="function"){
    throw new TypeError(`${name}.${method} is required`);
  }
}

function boundedMemories(memories){
  return [...memories]
    .sort((left,right)=>Date.parse(right.recordedAt)-Date.parse(left.recordedAt))
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

function normalizeDecision(output){
  assertPlainObject("experience consolidation decision",output);
  const journalEntry=output.journalEntry??null;
  if(journalEntry!==null)assertNonEmpty("experience consolidation journalEntry",journalEntry);

  assertPlainObject("experience consolidation memory",output.memory);
  const memory=output.memory;
  if(!["not_remembered","retained"].includes(memory.outcome)){
    throw new TypeError("experience consolidation memory outcome is invalid");
  }
  assertStringArray("experience consolidation memory uncertainty",memory.uncertainty);
  if(memory.outcome==="not_remembered"){
    return Object.freeze({
      journalEntry,
      memory:Object.freeze({
        outcome:"not_remembered",
        rememberedContent:null,
        rememberedMeaning:null,
        confidence:null,
        salience:null,
        uncertainty:Object.freeze([...memory.uncertainty]),
      }),
    });
  }
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
    memory:Object.freeze({
      outcome:"retained",
      rememberedContent:memory.rememberedContent,
      rememberedMeaning:memory.rememberedMeaning,
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
  modelAdapter,
}){
  const storyById=new Map(encounterStories.map((story)=>[story.encounterId,story]));
  const input={
    consolidation:{
      consolidationId:consolidation.consolidationId,
      startedAt:consolidation.startedAt,
    },
    thread:{
      threadId:thread.threadId,
      name:thread.identity?.name??null,
      selfDescription:thread.identity?.selfDescription??"",
      selfModel:thread.currentState?.selfModel??"",
      stableTendencies:structuredClone(thread.genome?.textualTraits??{}),
      unresolvedIntentions:[...(thread.currentState?.unresolvedIntentions??[])],
    },
    experiencedSituation:structuredClone(situation),
    experiences:experiences.map((experience)=>({
      experienceId:experience.experienceId,
      occurredAt:experience.occurredAt,
      experiencedAs:experience.experienceText??null,
      encounterStory:structuredClone(storyById.get(experience.encounterRef)?.story??null),
    })),
    semanticStates:semanticContext(semanticStates),
    priorMemories:boundedMemories(memories),
  };

  const invocation=await modelAdapter.invoke({
    systemPrompt:`You are delayed consolidation for one persistent Fibre Thread after a bounded cluster of lived experiences.
These experiences already happened and are durable evidence. They may include conversation, witnessed behavior, environmental occurrences, or several closely related moments from one continuing situation.
Treat the cluster as one reflective opportunity rather than one mandatory interpretation per experience.

Return two distinct private outcomes:
1. journalEntry: a first-person private journal reflection, or null. It may integrate several experiences when they belong together. It is subjective, contemporaneous reflection formed now, not objective history.
2. memory: decide whether anything from this bounded cluster is retained autobiographically. not_remembered is normal. If retained, write a selective first-person recollection of what mattered rather than a transcript.

Do not invent events, dialogue, relationships, obligations, or lasting meaning absent from the supplied evidence.
Do not force significance merely because multiple experiences were supplied.
rememberedMeaning may be null even when rememberedContent is retained.
Journal and memory are separate outcomes: either may exist without the other.
Do not describe this consolidation process, record IDs, system state, or hidden policy.`,
    input,
    responseSchema:{
      type:"object",
      additionalProperties:false,
      required:["journalEntry","memory"],
      properties:{
        journalEntry:{anyOf:[{type:"string",minLength:1},{type:"null"}]},
        memory:{
          type:"object",
          additionalProperties:false,
          required:[
            "outcome","rememberedContent","rememberedMeaning",
            "confidence","salience","uncertainty",
          ],
          properties:{
            outcome:{type:"string",enum:["not_remembered","retained"]},
            rememberedContent:{anyOf:[{type:"string",minLength:1},{type:"null"}]},
            rememberedMeaning:{anyOf:[{type:"string",minLength:1},{type:"null"}]},
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
    meaningOutcome:durableMeaning?"durable_meaning":"no_durable_meaning",
    meaningParts:durableMeaning?[{
      meaningPartId:autobiographicalMeaningPartId({memoryId,ordinal:1}),
      meaning:decision.rememberedMeaning,
    }]:[],
    asOf:consolidation.startedAt,
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
    recordedAt:consolidation.startedAt,
  };
}

export function createExperienceConsolidationProcess({
  worldReader,
  livedNowStore,
  semanticStateStore,
  memoryStore,
  experienceStore,
  journalBook=null,
  modelAdapter,
  now=()=>new Date().toISOString(),
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
  requireMethod("experienceStore",experienceStore,"hasPendingExperienceConsolidation");
  requireMethod("modelAdapter",modelAdapter,"invoke");
  if(journalBook!==null){
    requireMethod("journalBook",journalBook,"getProfile");
    requireMethod("journalBook",journalBook,"append");
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
  if(typeof now!=="function")throw new TypeError("experience consolidation now must be a function");

  function claimGroups(limit){
    const claimed=[];
    while(claimed.length<limit){
      const candidates=experienceStore.listUnclaimedExperienceConsolidationCandidates({limit:64});
      const group=groupCandidates(candidates,{groupLimit,groupWindowMs});
      if(group.length===0)break;
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

    let decisionStage=experienceStore.getThreadExperienceConsolidationStage(
      consolidation.consolidationId,
      "decision",
    );
    if(decisionStage===null){
      const decision=await formDecision({
        consolidation,
        thread,
        situation,
        experiences,
        encounterStories,
        semanticStates,
        memories,
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

    let journalEntry=null;
    if(decision.journalEntry!==null){
      journalEntry=experienceStore.recordThreadExperienceConsolidationJournal({
        consolidationId:consolidation.consolidationId,
        threadId:consolidation.threadId,
        writtenAt:consolidation.startedAt,
        entryText:decision.journalEntry,
      });
    }

    let memory=null;
    if(decision.memory.outcome==="retained"){
      const candidate=consolidationMemoryRecord({
        consolidation,
        threadId:consolidation.threadId,
        experiences,
        decision:decision.memory,
      });
      const history=memoryStore.memoryHistory(
        consolidation.threadId,
        candidate.memoryId,
        {required:false},
      );
      memory=history[0]??memoryStore.recordMemory(candidate);
    }

    const completion=experienceStore.recordThreadExperienceConsolidationStage({
      consolidationId:consolidation.consolidationId,
      stage:"complete",
      recordedAt:now(),
      payload:{
        journalEntryId:journalEntry?.journalEntryId??null,
        memoryOutcome:decision.memory.outcome,
        memoryId:memory?.memoryId??null,
      },
    });

    if(journalBook!==null&&journalEntry!==null){
      try{
        const profile=await journalBook.getProfile(consolidation.threadId)
          ??await formThreadJournalProfile({thread,modelAdapter});
        await journalBook.append({
          threadId:consolidation.threadId,
          profile,
          writtenAt:journalEntry.writtenAt,
          entryText:journalEntry.entryText,
        });
      }catch{}
    }

    return Object.freeze({
      consolidationId:consolidation.consolidationId,
      threadId:consolidation.threadId,
      experienceCount:experiences.length,
      journalEntryId:completion.payload.journalEntryId,
      memoryOutcome:completion.payload.memoryOutcome,
      memoryId:completion.payload.memoryId,
    });
  }

  return Object.freeze({
    async runOnce(){
      let pending=experienceStore.listPendingThreadExperienceConsolidations({
        limit:batchLimit,
      });
      if(pending.length<batchLimit){
        claimGroups(batchLimit-pending.length);
        pending=experienceStore.listPendingThreadExperienceConsolidations({
          limit:batchLimit,
        });
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
      return Object.freeze({
        attempted:pending.length,
        completed:pending.length-failed,
        failed,
        hasPending:experienceStore.hasPendingExperienceConsolidation(),
        results:Object.freeze(results),
      });
    },
  });
}
