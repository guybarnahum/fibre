// How readily each of a Thread's memories comes to mind. This is availability
// policy over memory, never memory itself: the recollection, its meaning and
// World history are untouched, and nothing is deleted.
//
// - Anchored memories do not fade: those a current interest, stance or
//   identity statement rests on, formative Genesis memories that carry
//   durable meaning, and those the Thread marked very important.
// - A memory the Thread's cognition cites is recalled and so refreshed.
// - Others fade a step at a time, accessible → difficult → inaccessible,
//   after an interval set by the salience the Thread gave it.
// - Meeting the same person again can make a faded memory resurface a step.
// See docs/concepts/development-and-memory.md (recent availability).

const LEVELS=Object.freeze(["accessible","difficult","inaccessible"]);
const STEP_BASE_MS=3*86_400_000;
const ANCHOR_SALIENCE=0.8;
const RECALL_REFRESH_MS=86_400_000;

export function fadeIntervalMs(salience){
  const value=Math.min(1,Math.max(0,Number.isFinite(salience)?salience:0));
  return STEP_BASE_MS*2**(5*value);
}

function anchoredIds({memories,interests,semanticStates,identityAssertions}){
  const memoryIds=new Set(memories.map(memory=>memory.memoryId));
  const cited=new Set([
    ...interests.flatMap(interest=>[...(interest.evidenceRefs??[])]),
    ...semanticStates.filter(state=>state.domain==="relationship_attitude")
      .flatMap(state=>state.evidenceReferences??[]),
    ...identityAssertions.flatMap(assertion=>assertion.sourceReferences??[]),
  ]);
  return new Set(memories.filter(memory=>
    cited.has(memory.memoryId)
    ||(memory.eventRefs??[]).some(ref=>cited.has(ref))
    ||(memory.authorship?.kind==="fibre_genesis_authored"&&memory.meaningOutcome==="durable_meaning")
    ||(memory.salience??0)>=ANCHOR_SALIENCE,
  ).map(memory=>memory.memoryId).filter(id=>memoryIds.has(id)));
}

// One bounded, deterministic review of a Thread's memories; no model call.
// Writes only where a memory's availability actually changes.
export function reviewMemoryAvailability({threadId,memoryStore,experienceStore=null,
  semanticStateStore=null,identityStore=null,cuePersonIds=[],cueRef=null,at}){
  if(typeof memoryStore.memoryAvailability!=="function")return Object.freeze({faded:0,resurfaced:0});
  const instant=Date.parse(at);
  const memories=memoryStore.listCurrentMemories(threadId);
  const levels=memoryStore.memoryAvailability(threadId);
  const anchored=anchoredIds({
    memories,
    interests:experienceStore?.listCurrentInterests?.(threadId)??[],
    semanticStates:semanticStateStore?.listCurrentState?.(threadId)??[],
    identityAssertions:identityStore?.getCurrentIdentityView?.(threadId)?.assertions??[],
  });
  const cued=new Set(cueRef===null?[]:cuePersonIds.flatMap(personId=>
    experienceStore?.listSharedExperienceRefs?.(threadId,personId,{before:at,limit:64})??[]));
  let faded=0,resurfaced=0;
  for(const memory of memories){
    const held=levels.get(memory.memoryId)??null;
    const level=LEVELS.indexOf(held?.level??"accessible");
    const set=(index,reason,touchedAt)=>memoryStore.setMemoryAvailability({
      threadId,memoryId:memory.memoryId,level:LEVELS[index],touchedAt,reason,
      cueRef:reason==="cue"?cueRef:null,changedAt:at,
    });
    if(anchored.has(memory.memoryId)){
      if(level>0)set(0,"recalled",at);
      continue;
    }
    if(level>0&&(memory.eventRefs??[]).some(ref=>cued.has(ref))){
      set(level-1,"cue",at);resurfaced+=1;continue;
    }
    const since=Date.parse(held?.touchedAt??memory.asOf);
    const due=Math.min(2,Math.floor((instant-since)/fadeIntervalMs(memory.salience)));
    if(due>level){set(due,"faded",held?.touchedAt??memory.asOf);faded+=1;}
  }
  return Object.freeze({faded,resurfaced});
}

// A memory the Thread's own cognition cited in a judgment comes back to mind.
export function recallMemories({memoryStore,threadId,memoryIds,at}){
  if(typeof memoryStore?.memoryAvailability!=="function"||memoryIds.length===0
    ||memoryStore.queryOnly?.()===true)return;
  const levels=memoryStore.memoryAvailability(threadId);
  for(const memoryId of new Set(memoryIds)){
    const held=levels.get(memoryId);
    if(held!==undefined&&held.level==="accessible"
      &&Date.parse(at)-Date.parse(held.touchedAt)<RECALL_REFRESH_MS)continue;
    memoryStore.setMemoryAvailability({threadId,memoryId,level:"accessible",
      touchedAt:at,reason:"recalled",changedAt:at});
  }
}
