// The Body panel (body levels): an operator's view of a Thread's social
// Body over the last day, and the genes that shape it. Everything is derived
// from World records, read once when the panel opens and sliced in memory
// to evaluate earlier moments; nothing is stored and nothing runs unasked.
import { HOUR_MS, DAY_MS } from "#core/src/body-level.mjs";
import { bondOf, longingOf, missingMoments, moodOf, regardOf, selfStanding, socialEnergyEvidence } from "./social-body.mjs";
import { learningMoments } from "./knowledge.mjs";
import { wearinessLevel } from "./engagement.mjs";
import { learningBodyAt, socialBodyLoci } from "./lived-now-regulation.mjs";
import { learningFelt } from "./interoceptive-cognition.mjs";

const iso=(ms)=>new Date(ms).toISOString();
const round=(value)=>Math.round(value*1000)/1000;

// The Body's records as they stood at any earlier moment: each kind read
// once at `now`, newest first and bounded, then sliced in memory. Bounded
// reads mean a very busy day may show its earliest hours incompletely.
export function recordsAsOf(store,{now,since,memoryStore=null}){
  const cache=new Map();
  const once=(key,read)=>{if(!cache.has(key))cache.set(key,read());return cache.get(key);};
  const newestFirst=(items,field,keep,limit)=>items.filter(keep)
    .sort((a,b)=>b[field].localeCompare(a[field])).slice(0,limit??items.length);
  return Object.freeze({
    listSharedContact:(threadId,otherThreadId,{before,limit=64}={})=>newestFirst(
      once(`contact:${otherThreadId}`,()=>store.listSharedContact(threadId,otherThreadId,{before:now,limit:96})),
      "at",item=>item.at<before,limit),
    listPairActs:(threadId,otherThreadId,{before,limit=48}={})=>newestFirst(
      once(`acts:${otherThreadId}`,()=>store.listPairActs(threadId,otherThreadId,{before:now,limit:96})),
      "occurredAt",item=>item.occurredAt<before,limit),
    listPerceivedRegard:(threadId,personThreadId,{before,limit=48}={})=>newestFirst(
      once(`regard:${personThreadId}`,()=>store.listPerceivedRegard?.(threadId,personThreadId,{before:now,limit:96})??[]),
      "asOf",item=>item.asOf<before,limit),
    listRecentPerceivedRegard:(threadId,{before,limit=96}={})=>newestFirst(
      once("regard",()=>store.listRecentPerceivedRegard?.(threadId,{before:now,limit:96})??[]),
      "asOf",item=>item.asOf<before,limit),
    listSocialExposures:(threadId,{since:from,until,limit=16}={})=>newestFirst(
      once("exposures",()=>store.listSocialExposures(threadId,{since,until:now,limit:32})),
      "at",item=>item.at>=from&&item.at<=until,limit),
    listEngagementReadings:(threadId,{since:from,until,limit=48}={})=>newestFirst(
      once("readings",()=>store.listEngagementReadings?.(threadId,{since,until:now,limit:96})??[]),
      "at",item=>item.at>=from&&item.at<until,limit),
    listRecentExchangeTexts:(threadId,{since:from,until,limit=12}={})=>newestFirst(
      once("exchanges",()=>store.listRecentExchangeTexts?.(threadId,{since,until:now,limit:24})??[]),
      "at",item=>item.at>=from&&item.at<until,limit),
    exchangeMeanings:(refs)=>once(`meanings:${refs.join(",")}`,()=>store.exchangeMeanings?.(refs)??new Map()),
    // Memories carry their latest return to mind only; the experiences
    // shared with a person are read as they stand now.
    listRecalledMemories:(threadId,{since:from,until,limit=16}={})=>newestFirst(
      once("recalled",()=>memoryStore?.listRecalledMemories?.(threadId,{since,until:now,limit:32})??[]),
      "at",item=>item.at>=from&&item.at<=until,limit),
    listSharedExperienceRefs:(threadId,otherThreadId)=>once(`shared:${otherThreadId}`,
      ()=>store.listSharedExperienceRefs?.(threadId,otherThreadId,{before:now,limit:64})??[]),
    listLearning:(threadId,{since:from,until})=>once("learning",
      ()=>store.listLearning?.(threadId,{since,until:now})??[]).filter(item=>item.at>=from&&item.at<=until),
    // Doors carry no time here; they are read as they stand now.
    listOpenDoors:(threadId,otherThreadId)=>once(`doors:${otherThreadId}`,
      ()=>store.listOpenDoors?.(threadId,otherThreadId,{before:now})??[]),
  });
}

// The social Body over the last day, every two hours, with what moved it:
// toward the people it lived most with, and those it is bonded to apart
// (missed, named by the caller from its relations).
// Besides the two-hourly series, the Body just before each given moment (the
// moments it chose something: arriving somewhere, a conversation), so what it
// felt then can be read against what it did, never against what the choice
// itself brought it, nor against the nearest hour.
export function bodyObservatory({thread,experienceStore,memoryStore=null,at,nameOf=()=>null,hours=24,stepHours=2,
  people:most=6,apart=[],moments=[],present=[]}){
  const now=Date.parse(at),from=now-hours*HOUR_MS;
  const threadId=thread.threadId;
  const records=recordsAsOf(experienceStore,{now:at,since:iso(from-2*DAY_MS),memoryStore});
  const loci=socialBodyLoci(thread);
  const instants=Array.from({length:Math.floor(hours/stepHours)+1},(_,i)=>iso(from+i*stepHours*HOUR_MS));
  const exposures=records.listSocialExposures(threadId,{since:iso(from),until:at,limit:32});
  const regard=records.listRecentPerceivedRegard(threadId,{before:at,limit:96});
  const readings=records.listEngagementReadings(threadId,{since:iso(from),until:at,limit:96});
  // The people it lived most with lately: by exposures and regard between them.
  const weight=new Map();
  for(const person of [...exposures.map(item=>item.otherThreadId),...regard.map(item=>item.personThreadId)])
    if(typeof person==="string"&&person!==threadId)weight.set(person,(weight.get(person)??0)+1);
  const lived=[...weight].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,most).map(([person])=>person);
  const people=[...lived,...apart.filter(person=>person!==threadId&&!lived.includes(person)).slice(0,4)];
  // And anyone it met at those moments, so how it took them then is shown.
  for(const person of present)if(person!==threadId&&!people.includes(person)&&people.length<16)people.push(person);
  const attachment=loci.attachment;
  const pointAt=(instant)=>{
    const standing=selfStanding({experienceStore:records,threadId,at:instant,standingLocus:loci.standing});
    const mood=moodOf({people:standing.felt,doing:learningMoments({experienceStore:records,threadId,at:instant}),
      at:instant,moodLocus:loci.mood});
    const weariness=wearinessLevel({experienceStore:records,threadId,at:instant,
      persistence:loci.exploration?.persistence??0});
    const moments=missingMoments({experienceStore:records,memoryStore:records,threadId,at:instant});
    // What learning was doing to it then (ADR-0041), through the same core.
    // Whether a lift and the pull to tell were felt, as the Body's own words say.
    const learning=typeof experienceStore.listLearning==="function"
      ?learningBodyAt({thread,experienceStore:records,at:instant}):null;
    const felt=learning===null?null:learningFelt(learning.frame);
    return Object.freeze({at:instant,
      ...(learning===null?{}:{novelty:round(learning.novelty),competence:round(learning.competence),
        lifted:learning.lifted,noveltyHunger:round(learning.noveltyHunger),share:round(learning.share),
        liftFelt:felt.lift!==null,shareFelt:felt.share!==null}),
      battery:round(socialEnergyEvidence({threadId,experienceStore:records,asOf:instant,trustLocus:loci.trust})?.depletion??0),
      weariness:round(weariness.level),wearinessBaseline:round(weariness.baseline),
      self:round(standing.self),gap:standing.gap===null?null:round(standing.gap),
      frustration:round(standing.frustration.level),frustrationBaseline:round(standing.frustration.baseline),
      mood:round(mood.level),moodBaseline:round(mood.baseline),
      people:Object.freeze(Object.fromEntries(people.map(person=>{
        const seen=regardOf({experienceStore:records,threadId,otherThreadId:person,at:instant,
          trustLocus:loci.trust,standingLocus:loci.standing,attachmentLocus:loci.attachment});
        const bond=bondOf({regard:seen,doors:records.listOpenDoors(threadId,person)});
        const longing=longingOf({bond,regard:seen,orientation:attachment?.orientation??null,
          persistence:attachment?.persistence??0,at:instant,absorbed:moments.absorbed,
          reminders:bond>0?moments.remindersOf(person):[]});
        return [person,Object.freeze({knowing:round(seen.knowing),staleness:round(seen.staleness),
          trust:round(seen.trust),warmth:round(seen.warmth),promise:round(seen.promise??0),hurt:round(seen.hurt),held:round(seen.status),treated:round(seen.treated??0),
          bond:round(bond),longing:round(longing.level),longingBaseline:round(longing.baseline)})];
      }))),
    });
  };
  const series=instants.map(pointAt);
  const atMoments=[...new Set(moments)].filter(moment=>typeof moment==="string"&&moment>=iso(from)&&moment<=at)
    .sort().slice(-48).map(moment=>pointAt(iso(Date.parse(moment)-1000)));
  return Object.freeze({
    threadId,asOf:at,window:Object.freeze({hours,stepHours}),
    genetics:structuredClone(thread.genome?.urgeProjection??[]),
    people:people.map(person=>Object.freeze({threadId:person,name:nameOf(person)})),
    series,
    atMoments,
    events:Object.freeze({
      exposures:exposures.filter(item=>item.at>=iso(from)).map(item=>({at:item.at,kind:item.kind,
        person:item.otherThreadId??null,turns:item.turns})),
      readings:readings.map(item=>({at:item.at,reading:item.reading,source:item.sourceKind,
        ...(item.note?{note:item.note}:{})})),
      regard:regard.filter(item=>item.asOf>=iso(from)).map(item=>({at:item.asOf,act:item.act,
        person:item.personThreadId,by:item.actorThreadId===threadId?"me":"them"})),
      // What it came to know in the window: discoveries and steps deeper (ADR-0041).
      learning:typeof experienceStore.listLearning==="function"
        ?records.listLearning(threadId,{since:iso(from),until:at}).map(item=>({at:item.at,learning:item.learning,
          workRef:item.sourceRef,subjects:item.subjects??[]})):[],
      recalled:records.listRecalledMemories(threadId,{since:iso(from),until:at})
        .map(item=>({at:item.at,people:people.filter(person=>
          item.eventRefs.some(ref=>records.listSharedExperienceRefs(threadId,person).includes(ref)))})),
    }),
  });
}
