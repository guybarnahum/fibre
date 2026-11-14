// The Body panel (body levels): an operator's view of a Thread's social
// Body over the last day, and the genes that shape it. Everything is derived
// from World records, read once when the panel opens and sliced in memory
// to evaluate earlier moments; nothing is stored and nothing runs unasked.
import { HOUR_MS, DAY_MS } from "#core/src/body-level.mjs";
import { bondOf, regardOf, selfStanding, socialEnergyEvidence } from "./social-body.mjs";
import { wearinessOf } from "./engagement.mjs";
import { socialBodyLoci } from "./lived-now-regulation.mjs";

const iso=(ms)=>new Date(ms).toISOString();
const round=(value)=>Math.round(value*1000)/1000;

// The Body's records as they stood at any earlier moment: each kind read
// once at `now`, newest first and bounded, then sliced in memory. Bounded
// reads mean a very busy day may show its earliest hours incompletely.
export function recordsAsOf(store,{now,since}){
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
    // Doors carry no time here; they are read as they stand now.
    listOpenDoors:(threadId,otherThreadId)=>once(`doors:${otherThreadId}`,
      ()=>store.listOpenDoors?.(threadId,otherThreadId,{before:now})??[]),
  });
}

// The social Body over the last day, every two hours, with what moved it.
export function bodyObservatory({thread,experienceStore,at,nameOf=()=>null,hours=24,stepHours=2,people:most=6}){
  const now=Date.parse(at),from=now-hours*HOUR_MS;
  const threadId=thread.threadId;
  const records=recordsAsOf(experienceStore,{now:at,since:iso(from-2*DAY_MS)});
  const loci=socialBodyLoci(thread);
  const instants=Array.from({length:Math.floor(hours/stepHours)+1},(_,i)=>iso(from+i*stepHours*HOUR_MS));
  const exposures=records.listSocialExposures(threadId,{since:iso(from),until:at,limit:32});
  const regard=records.listRecentPerceivedRegard(threadId,{before:at,limit:96});
  const readings=records.listEngagementReadings(threadId,{since:iso(from),until:at,limit:96});
  // The people it lived most with lately: by exposures and regard between them.
  const weight=new Map();
  for(const person of [...exposures.map(item=>item.otherThreadId),...regard.map(item=>item.personThreadId)])
    if(typeof person==="string"&&person!==threadId)weight.set(person,(weight.get(person)??0)+1);
  const people=[...weight].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,most).map(([person])=>person);
  const series=instants.map(instant=>{
    const standing=selfStanding({experienceStore:records,threadId,at:instant,standingLocus:loci.standing});
    return Object.freeze({at:instant,
      battery:round(socialEnergyEvidence({threadId,experienceStore:records,asOf:instant,trustLocus:loci.trust})?.depletion??0),
      weariness:round(wearinessOf({experienceStore:records,threadId,at:instant,
        persistence:loci.exploration?.persistence??0})),
      self:round(standing.self),gap:standing.gap===null?null:round(standing.gap),
      frustration:round(standing.frustration.level),frustrationBaseline:round(standing.frustration.baseline),
      people:Object.freeze(Object.fromEntries(people.map(person=>{
        const seen=regardOf({experienceStore:records,threadId,otherThreadId:person,at:instant,
          trustLocus:loci.trust,standingLocus:loci.standing});
        return [person,Object.freeze({knowing:round(seen.knowing),staleness:round(seen.staleness),
          trust:round(seen.trust),hurt:round(seen.hurt),held:round(seen.status),treated:round(seen.treated??0),
          bond:round(bondOf({regard:seen,doors:records.listOpenDoors(threadId,person)}))})];
      }))),
    });
  });
  return Object.freeze({
    threadId,asOf:at,window:Object.freeze({hours,stepHours}),
    genetics:structuredClone(thread.genome?.urgeProjection??[]),
    people:people.map(person=>Object.freeze({threadId:person,name:nameOf(person)})),
    series,
    events:Object.freeze({
      exposures:exposures.filter(item=>item.at>=iso(from)).map(item=>({at:item.at,kind:item.kind,
        person:item.otherThreadId??null,turns:item.turns})),
      readings:readings.map(item=>({at:item.at,reading:item.reading,source:item.sourceKind})),
      regard:regard.filter(item=>item.asOf>=iso(from)).map(item=>({at:item.asOf,act:item.act,
        person:item.personThreadId,by:item.actorThreadId===threadId?"me":"them"})),
    }),
  });
}
