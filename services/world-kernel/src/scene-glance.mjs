// A glance: what a Thread takes in on entering a place. World lists a few
// things it could take in now (people present, books within reach) in the
// order its eye falls on them; the Thread reads them in order and may take
// up one. Things before it were seen and passed; things after it were never
// reached. World orders the list by the scene and the moment, never by what
// this Thread cares about.
import { situationInMind } from "./situation-in-mind.mjs";
import { memoryInMind } from "./memory-in-mind.mjs";
import { promptRequest } from "./cognition-prompts.mjs";
import { queueThreadExperienceConsolidation } from "./lived-experience-consolidation-queue.mjs";
import { createEncounterVisualization } from "./lived-encounter-visualization.mjs";
import { assertPlainObject, canonicalJson, sha256 } from "./persistence-common.mjs";

const DISPLAY="display";
const BOOKS_IN_REACH=3;
const MAX_ITEMS=5;
const CATALOGUE_PAGES=60;

// A venue whose admitted affordances include reading has shelves.
export function holdsBooks(place){
  return typeof place?.physicalVenue?.ref==="string"&&(place.affordances??[]).includes("Reading");
}

// The display table near the entrance, filled once from the public-domain
// catalogue and then kept. Which catalogue page a venue shows is World's,
// fixed by the venue. If the catalogue cannot be reached, the shelf stays
// unfilled and nothing is invented; a later visitor fills it.
export async function displayHoldings({venueRef,catalogue,experienceStore,at,warn=console.warn}){
  const held=experienceStore.listVenueHoldings(venueRef,DISPLAY);
  if(held.length>0||catalogue===null)return held;
  const page=1+Number.parseInt(sha256(venueRef).slice(0,8),16)%CATALOGUE_PAGES;
  let works;
  try{works=await catalogue.listWorks({page,language:"en"});}
  catch(error){
    warn(JSON.stringify({event:"venue-holdings-unavailable",venueRef,
      message:String(error?.message??error).slice(0,160)}));
    return held;
  }
  return works.length===0?held:experienceStore.recordVenueHoldings({venueRef,section:DISPLAY,
    works:works.slice(0,32),at});
}

const order=(seed,key)=>sha256(canonicalJson([seed,key]));
const author=(work)=>work.authors.map(item=>item.name).join(" and ")||"an unknown author";

function bookItem(holding){
  return {kind:"book",ref:holding.holdingRef,where:"on the display table",
    title:holding.work.title,by:author(holding.work),about:holding.work.subjects.slice(0,3)};
}

// World's list for one entered scene: up to three books within reach from the
// display (which ones, by the scene and the moment) and the people present,
// interleaved where the eye falls.
export function glanceItems({people=[],holdings=[],venueRef,at}){
  const seed=[venueRef,at];
  const books=[...holdings].sort((a,b)=>order(seed,a.holdingRef).localeCompare(order(seed,b.holdingRef)))
    .slice(0,BOOKS_IN_REACH).map(bookItem);
  return [...people.slice(0,MAX_ITEMS-books.length),...books]
    .sort((a,b)=>order(seed,a.ref).localeCompare(order(seed,b.ref)));
}

export async function appraiseGlance({thread,situation,venueName,items,semanticStates=[],memories=[],modelAdapter}){
  assertPlainObject("glance Thread",thread);
  const input={
    thread:{
      threadId:thread.threadId,
      name:thread.identity?.name??null,
      selfDescription:thread.identity?.selfDescription??"",
      selfModel:thread.currentState?.selfModel??"",
      stableTendencies:structuredClone(thread.genome?.textualTraits??{}),
      unresolvedIntentions:[...(thread.currentState?.unresolvedIntentions??[])],
    },
    semanticStates:semanticStates.map(state=>({domain:state.domain,dimension:state.dimension,
      target:state.target??null,state:state.state})),
    autobiographicalMemories:[...memories].slice(0,6).map(memory=>({memoryId:memory.memoryId,
      ...memoryInMind(memory)})),
    currentSituation:situationInMind(situation,{placeName:venueName}),
    glance:{arrivedAt:venueName,items:items.map(({ref,...seen},index)=>({index,...seen}))},
  };
  const invocation=await modelAdapter.invoke({
    ...promptRequest("encounter.glance",{threadId:thread.threadId}),
    input,
    responseSchema:{type:"object",additionalProperties:false,required:["focus","experienceText","passedReason"],
      properties:{
        focus:{anyOf:[{type:"integer",minimum:0,maximum:items.length-1},{type:"null"}]},
        experienceText:{anyOf:[{type:"string",minLength:1,maxLength:1200},{type:"null"}]},
        passedReason:{anyOf:[{type:"string",minLength:1,maxLength:300},{type:"null"}]},
      }},
    clientRequestId:`encounter-glance_${sha256(canonicalJson(input)).slice(0,40)}`,
  });
  const output=invocation.output;
  assertPlainObject("glance output",output);
  const focus=Number.isSafeInteger(output.focus)&&output.focus>=0&&output.focus<items.length
    &&typeof output.experienceText==="string"&&output.experienceText.trim()?output.focus:null;
  const passedReason=typeof output.passedReason==="string"&&output.passedReason.trim()
    &&focus!==0?output.passedReason.trim().slice(0,300):null;
  return Object.freeze({focus,experienceText:focus===null?null:output.experienceText.trim(),passedReason});
}

// What a glance leaves behind. Toward the people present (the arrival Story):
// noticed when one of them is the focus; otherwise not noticed, with the
// Thread's reason when they came before its focus and none when they were
// never reached. Taking up a book is itself an observable act: World admits
// it as a Story, and the Thread's experience of meeting the book belongs to it.
export async function admitGlance({thread,situation,arrivalStory=null,items,appraisal,
  describeSelf,experienceStore,onExperienceQueued=null}){
  const at=situation.establishedAt;
  const focused=appraisal.focus===null?null:items[appraisal.focus];
  let focusEncounterRef=null;
  const remember=async(encounterRef,experienceText)=>{
    const attention=experienceStore.recordThreadEncounterAttention({threadId:thread.threadId,encounterRef,
      situationId:situation.situationId,occurredAt:at,outcome:"noticed",experienceText});
    await queueThreadExperienceConsolidation({experienceStore,experienceRecord:attention.experience,
      queuedAt:at,onQueued:onExperienceQueued});
    return attention;
  };
  if(arrivalStory!==null&&experienceStore.getThreadEncounterAttention(thread.threadId,arrivalStory.encounterId)===null){
    if(focused?.kind==="person"){
      await remember(arrivalStory.encounterId,appraisal.experienceText);
      focusEncounterRef=arrivalStory.encounterId;
    }else{
      const firstPerson=items.findIndex(item=>item.kind==="person");
      const passed=firstPerson>=0&&(appraisal.focus===null||firstPerson<appraisal.focus);
      experienceStore.recordThreadEncounterAttention({threadId:thread.threadId,
        encounterRef:arrivalStory.encounterId,situationId:situation.situationId,occurredAt:at,
        outcome:"not_noticed",experienceText:null,passedReason:passed?appraisal.passedReason:null});
    }
  }
  if(focused?.kind==="book"){
    const story={storyVersion:"encounter-story-v0.1",beats:[{actorThreadId:thread.threadId,kind:"action",
      text:`${describeSelf} takes "${focused.title}" by ${focused.by} from the display table.`,holdingRef:focused.ref}]};
    const encounter=experienceStore.recordEncounterStory({occurredAt:at,
      threadPresence:[{threadId:thread.threadId,situationId:situation.situationId}],
      story,visualization:createEncounterVisualization({occurredAt:at,story,
        scene:"At the display table of a library.",sourceReferences:[situation.situationId,focused.ref],
        depictedThreadRefs:[]})});
    if(experienceStore.getThreadEncounterAttention(thread.threadId,encounter.encounterId)===null){
      await remember(encounter.encounterId,appraisal.experienceText);
    }
    focusEncounterRef=encounter.encounterId;
  }
  return experienceStore.recordThreadGlance({threadId:thread.threadId,situationId:situation.situationId,
    occurredAt:at,items:items.map(({kind,ref})=>({kind,ref})),focus:appraisal.focus,focusEncounterRef});
}

const PASSAGE_CHARACTERS=1500;
const workRefOf=(work)=>`${work.source}:${work.sourceId}`;

// Reading a book one has taken up: World supplies the actual pages it reaches,
// from where this Thread left off; what it makes of them is its own. Its place
// in the book is kept, with whether it means to go on. If the pages cannot be
// fetched, nothing is read and nothing is invented.
export async function readHolding({thread,situation,holdingRef,describeSelf,catalogue,experienceStore,
  semanticStates=[],memories=[],modelAdapter,onExperienceQueued=null}){
  const holding=experienceStore.getVenueHolding(holdingRef);
  if(holding===null||typeof catalogue?.readPassage!=="function")return null;
  const workRef=workRefOf(holding.work);
  const prior=experienceStore.getThreadReading(thread.threadId,workRef);
  const fromByte=prior?.status==="finished"?null:prior?.nextByte??null;
  let passage;
  try{passage=await catalogue.readPassage({sourceId:holding.work.sourceId,textUrl:holding.work.textUrl,
    fromByte,maxChars:PASSAGE_CHARACTERS});}
  catch(error){
    console.warn(JSON.stringify({event:"book-pages-unavailable",holdingRef,
      message:String(error?.message??error).slice(0,160)}));
    return null;
  }
  if(!passage?.text)return null;
  const book=bookItem(holding);
  const input={
    thread:{threadId:thread.threadId,name:thread.identity?.name??null,
      selfDescription:thread.identity?.selfDescription??"",selfModel:thread.currentState?.selfModel??"",
      stableTendencies:structuredClone(thread.genome?.textualTraits??{})},
    semanticStates:semanticStates.map(state=>({domain:state.domain,dimension:state.dimension,
      target:state.target??null,state:state.state})),
    autobiographicalMemories:[...memories].slice(0,6).map(memory=>({memoryId:memory.memoryId,...memoryInMind(memory)})),
    currentSituation:situationInMind(situation),
    book:{title:book.title,by:book.by,about:book.about},
    reading:{where:fromByte===null?"the first pages":"where you left off",passage:passage.text},
  };
  const invocation=await modelAdapter.invoke({
    ...promptRequest("encounter.reading",{threadId:thread.threadId}),
    input,
    responseSchema:{type:"object",additionalProperties:false,required:["experienceText","keepReading"],
      properties:{experienceText:{type:"string",minLength:1,maxLength:1200},keepReading:{type:"boolean"}}},
    clientRequestId:`encounter-reading_${sha256(canonicalJson(input)).slice(0,40)}`,
  });
  const output=invocation.output;
  assertPlainObject("reading output",output);
  if(typeof output.experienceText!=="string"||!output.experienceText.trim())throw new TypeError("a reading needs its experience");
  const at=situation.establishedAt;
  const story={storyVersion:"encounter-story-v0.1",beats:[{actorThreadId:thread.threadId,kind:"action",
    text:`${describeSelf} reads from "${book.title}".`,holdingRef}]};
  const encounter=experienceStore.recordEncounterStory({occurredAt:at,
    threadPresence:[{threadId:thread.threadId,situationId:situation.situationId}],
    story,visualization:createEncounterVisualization({occurredAt:at,story,scene:"Reading at a library table.",
      sourceReferences:[situation.situationId,holdingRef],depictedThreadRefs:[]})});
  if(experienceStore.getThreadEncounterAttention(thread.threadId,encounter.encounterId)===null){
    const attention=experienceStore.recordThreadEncounterAttention({threadId:thread.threadId,
      encounterRef:encounter.encounterId,situationId:situation.situationId,occurredAt:at,
      outcome:"noticed",experienceText:output.experienceText.trim()});
    await queueThreadExperienceConsolidation({experienceStore,experienceRecord:attention.experience,
      queuedAt:at,onQueued:onExperienceQueued});
  }
  return experienceStore.recordThreadReading({threadId:thread.threadId,workRef,holdingRef,title:book.title,
    nextByte:passage.nextByte,status:passage.nextByte===null?"finished":output.keepReading===true?"reading":"set_aside",at});
}
