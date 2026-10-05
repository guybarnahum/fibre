import {
  PHYSICAL_GENOME_VERSION,
  referencePopulationCalibration,
  referencePopulationCalibrations,
  referencePopulationForPopulationId,
} from "../human-appearance/index.mjs";
import {
  appearanceCalibrationDependencies,
  planAppearanceCalibrationMigration,
} from "./appearance-calibration-dependencies.mjs";

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
    countryCode:clean(value.countryCode)?.toUpperCase()??null,
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

function physicalOrigins(physicalAncestry){
  const labels=(side)=>Object.freeze([...new Set(
    (Array.isArray(physicalAncestry?.[side])?physicalAncestry[side]:[])
      .map((entry)=>clean(entry?.population))
      .filter(Boolean),
  )]);
  const maternal=labels("maternal");
  const paternal=labels("paternal");
  return Object.freeze({
    maternal,
    paternal,
    summary:Object.freeze([...new Set([...maternal,...paternal])]),
  });
}

function lineageEntry({thread,side,lineage,calibrationModel=null}){
  const recordedReferencePopulation=clean(lineage?.referencePopulation);
  const populationId=clean(lineage?.populationId);
  const population=clean(lineage?.population)??"Recorded family";
  const share=Number(lineage?.share);
  const populationForPopulationId=calibrationModel?.populationForPopulationId??referencePopulationForPopulationId;
  const calibrationFor=calibrationModel?.calibration??referencePopulationCalibration;
  const referencePopulation=populationForPopulationId(
    populationId,
    recordedReferencePopulation,
  );
  const calibration=referencePopulation===null?null:calibrationFor(referencePopulation);
  const state=calibration===null?"missing":coverageState(calibration);
  return Object.freeze({
    threadId:thread.threadId,
    threadName:clean(thread.displayName),
    side,
    populationId,
    population,
    share:Number.isFinite(share)&&share>0?share:1,
    recordedReferencePopulation,
    referencePopulation,
    coverage:state,
    calibration,
    birthLocation:locationOf(thread),
    active:thread?.reconciliation?.state==="pending",
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
      threads:new Map(),
      sides:0,
      weightedSides:0,
      places:new Map(),
    };
    current.populations.add(entry.population);
    current.threadIds.add(entry.threadId);
    if(!current.threads.has(entry.threadId)){
      current.threads.set(entry.threadId,Object.freeze({
        threadId:entry.threadId,
        threadName:entry.threadName,
        birthLocation:entry.birthLocation,
        active:entry.active===true,
      }));
    }
    current.sides+=1;
    current.weightedSides+=entry.share;
    if(entry.birthLocation){
      const placeKey=`${entry.birthLocation.lat.toFixed(4)}:${entry.birthLocation.long.toFixed(4)}`;
      const place=current.places.get(placeKey)??{...entry.birthLocation,count:0,threadIds:new Set()};
      place.count+=1;
      place.threadIds.add(entry.threadId);
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
    threads:Object.freeze([...hole.threads.values()].sort((a,b)=>(a.threadName??a.threadId).localeCompare(b.threadName??b.threadId))),
    threadCount:hole.threadIds.size,
    sides:hole.sides,
    weightedSides:Number(hole.weightedSides.toFixed(3)),
    priority:Number((severity(hole.coverage)*hole.weightedSides).toFixed(3)),
    places:Object.freeze([...hole.places.values()].map((place)=>Object.freeze({
      ...place,
      threadIds:Object.freeze([...place.threadIds].sort()),
    })).sort((a,b)=>b.count-a.count||(a.displayName??"").localeCompare(b.displayName??""))),
  })).sort((a,b)=>b.priority-a.priority||b.threadCount-a.threadCount||a.key.localeCompare(b.key)));
}

export function analyzeAppearanceCoverage({threads,ancestryEvidence,calibrationModel=null}={}){
  const normalizedThreads=Array.isArray(threads)?threads:[];
  const evidenceByThread=new Map((Array.isArray(ancestryEvidence)?ancestryEvidence:[]).map((entry)=>[entry.threadId,entry]));
  const entries=[];
  const missing=[];
  const migrationCandidates=new Map();
  const addMigrationCandidate=(thread,reason,changes=[],evidence=null)=>{
    const current=migrationCandidates.get(thread.threadId)??{
      threadId:thread.threadId,
      threadName:clean(thread.displayName),
      reasons:[],
      changes:[],
      birthLocation:locationOf(thread),
      active:thread?.reconciliation?.state==="pending",
      physicalOrigins:physicalOrigins(evidence?.physicalAncestry),
    };
    if(!current.reasons.includes(reason))current.reasons.push(reason);
    current.changes.push(...changes);
    migrationCandidates.set(thread.threadId,current);
  };
  for(const thread of normalizedThreads){
    if(!thread||typeof thread.threadId!=="string")continue;
    const evidence=evidenceByThread.get(thread.threadId)??null;
    const physicalGenomeVersion=clean(thread.physicalGenomeVersion);
    if(physicalGenomeVersion!==null&&physicalGenomeVersion!==PHYSICAL_GENOME_VERSION){
      addMigrationCandidate(thread,"physical_model_outdated",[],evidence);
    }
    if(evidence!==null){
      const currentDependencies=appearanceCalibrationDependencies(evidence.physicalAncestry,{calibrationModel});
      const migration=planAppearanceCalibrationMigration({
        storedDependencies:evidence.calibrationDependencies??null,
        currentDependencies,
      });
      if(migration.migrationRequired){
        addMigrationCandidate(thread,migration.reason,migration.changes,evidence);
      }
    }
    if(evidence===null){
      missing.push(Object.freeze({
        threadId:thread.threadId,
        threadName:clean(thread.displayName),
        physicalGenomeVersion:clean(thread.physicalGenomeVersion),
        birthLocation:locationOf(thread),
        active:thread?.reconciliation?.state==="pending",
      }));
      continue;
    }
    for(const side of ["maternal","paternal"]){
      const lineage=evidence.physicalAncestry?.[side];
      if(!Array.isArray(lineage))continue;
      for(const item of lineage)entries.push(lineageEntry({thread,side,lineage:item,calibrationModel}));
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
      active:thread.active===true,
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
    migrationCandidates:Object.freeze([...migrationCandidates.values()].map((candidate)=>Object.freeze({
      ...candidate,
      reason:candidate.reasons[0]??"appearance_migration_required",
      reasons:Object.freeze([...candidate.reasons]),
      changes:Object.freeze([...candidate.changes]),
    })).sort((a,b)=>
      (a.threadName??a.threadId).localeCompare(b.threadName??b.threadId)
    )),
    lineages:Object.freeze(entries),
    model:Object.freeze(calibrationModel?.calibrations?.()??referencePopulationCalibrations()),
  });
}
