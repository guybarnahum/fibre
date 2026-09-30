import {
  referencePopulationCalibration,
  referencePopulationCalibrations,
} from "#core/src/human-appearance/index.mjs";

function clean(value){
  return typeof value==="string"&&value.trim()!==""?value.trim():null;
}

function locationOf(thread){
  const value=thread?.birthLocation;
  if(!value||typeof value!=="object")return null;
  const lat=Number(value.lat);
  const long=Number(value.long);
  if(!Number.isFinite(lat)||!Number.isFinite(long))return null;
  return Object.freeze({
    displayName:clean(value.displayName)??clean(thread?.birthPlace),
    country:clean(value.country),
    city:clean(value.city),
    lat,
    long,
  });
}

function coverageState(calibration){
  if(calibration.status==="fallback")return "fallback";
  if(calibration.status==="partial")return "partial";
  if(calibration.granularity==="broad")return "broad";
  return "explicit";
}

function severity(state){
  return ({missing:4,fallback:3,broad:2,partial:1,explicit:0})[state]??0;
}

function lineageEntry({thread,side,lineage}){
  const referencePopulation=clean(lineage?.referencePopulation);
  const population=clean(lineage?.population)??"Recorded family";
  const share=Number(lineage?.share);
  const calibration=referencePopulation===null?null:referencePopulationCalibration(referencePopulation);
  const state=calibration===null?"missing":coverageState(calibration);
  return Object.freeze({
    threadId:thread.threadId,
    threadName:clean(thread.displayName),
    side,
    population,
    share:Number.isFinite(share)&&share>0?share:1,
    referencePopulation,
    coverage:state,
    calibration,
    birthLocation:locationOf(thread),
  });
}

function holeKey(entry){
  return entry.referencePopulation===null
    ? `missing:${entry.population.toLocaleLowerCase("en-US")}`
    : entry.referencePopulation;
}

function summarizeHoles(entries){
  const holes=new Map();
  for(const entry of entries){
    if(entry.coverage==="explicit")continue;
    const key=holeKey(entry);
    const current=holes.get(key)??{
      key,
      referencePopulation:entry.referencePopulation,
      coverage:entry.coverage,
      calibration:entry.calibration,
      populations:new Set(),
      threadIds:new Set(),
      sides:0,
      weightedSides:0,
      places:new Map(),
    };
    current.populations.add(entry.population);
    current.threadIds.add(entry.threadId);
    current.sides+=1;
    current.weightedSides+=entry.share;
    if(entry.birthLocation){
      const placeKey=`${entry.birthLocation.lat.toFixed(4)}:${entry.birthLocation.long.toFixed(4)}`;
      const place=current.places.get(placeKey)??{...entry.birthLocation,count:0};
      place.count+=1;
      current.places.set(placeKey,place);
    }
    if(severity(entry.coverage)>severity(current.coverage))current.coverage=entry.coverage;
    holes.set(key,current);
  }
  return Object.freeze([...holes.values()].map((hole)=>Object.freeze({
    key:hole.key,
    referencePopulation:hole.referencePopulation,
    coverage:hole.coverage,
    calibration:hole.calibration,
    populations:Object.freeze([...hole.populations].sort()),
    threadIds:Object.freeze([...hole.threadIds].sort()),
    threadCount:hole.threadIds.size,
    sides:hole.sides,
    weightedSides:Number(hole.weightedSides.toFixed(3)),
    priority:Number((severity(hole.coverage)*hole.weightedSides).toFixed(3)),
    places:Object.freeze([...hole.places.values()].sort((a,b)=>b.count-a.count||(a.displayName??"").localeCompare(b.displayName??""))),
  })).sort((a,b)=>b.priority-a.priority||b.threadCount-a.threadCount||a.key.localeCompare(b.key)));
}

export function analyzeAppearanceCoverage({threads,ancestryEvidence}={}){
  const normalizedThreads=Array.isArray(threads)?threads:[];
  const evidenceByThread=new Map((Array.isArray(ancestryEvidence)?ancestryEvidence:[]).map((entry)=>[entry.threadId,entry]));
  const entries=[];
  const missing=[];
  for(const thread of normalizedThreads){
    if(!thread||typeof thread.threadId!=="string")continue;
    const evidence=evidenceByThread.get(thread.threadId)??null;
    if(evidence===null){
      if(clean(thread.physicalGenomeVersion)!==null){
        missing.push(Object.freeze({
          threadId:thread.threadId,
          threadName:clean(thread.displayName),
          physicalGenomeVersion:clean(thread.physicalGenomeVersion),
          birthLocation:locationOf(thread),
        }));
      }
      continue;
    }
    for(const side of ["maternal","paternal"]){
      const lineage=evidence.physicalAncestry?.[side];
      if(!Array.isArray(lineage))continue;
      for(const item of lineage)entries.push(lineageEntry({thread,side,lineage:item}));
    }
  }
  for(const thread of missing){
    entries.push(Object.freeze({
      threadId:thread.threadId,
      threadName:thread.threadName,
      side:"unknown",
      population:"Ancestry provenance missing",
      share:1,
      referencePopulation:null,
      coverage:"missing",
      calibration:null,
      birthLocation:thread.birthLocation,
    }));
  }

  const counts={explicit:0,partial:0,broad:0,fallback:0,missing:0};
  for(const entry of entries)counts[entry.coverage]+=1;
  return Object.freeze({
    contract:"fibre-appearance-coverage-v0.1",
    threadCount:normalizedThreads.length,
    lineageCount:entries.length,
    coverage:Object.freeze(counts),
    holes:summarizeHoles(entries),
    lineages:Object.freeze(entries),
    model:Object.freeze(referencePopulationCalibrations()),
  });
}
