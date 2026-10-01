import { analyzeAppearanceCoverage } from "#core/src/population-context/index.mjs";

function requireMethod(name,value,method){
  if(!value||typeof value[method]!=="function")throw new TypeError(`${name} must expose ${method}()`);
  return value;
}

function recordedOrigins(physicalAncestry){
  const values=[...new Set(
    ["maternal","paternal"].flatMap((side)=>
      (Array.isArray(physicalAncestry?.[side])?physicalAncestry[side]:[])
        .map((entry)=>typeof entry?.population==="string"?entry.population.trim():"")
        .filter(Boolean)
    )
  )];
  return Object.freeze(values);
}

export function createAppearanceCoverageService({
  directoryStore,
  physicalGenomeMigrationStore,
}={}){
  requireMethod("directoryStore",directoryStore,"getEntry");
  requireMethod("directoryStore",directoryStore,"listEntries");
  requireMethod("physicalGenomeMigrationStore",physicalGenomeMigrationStore,"latestEvidence");
  requireMethod("physicalGenomeMigrationStore",physicalGenomeMigrationStore,"listLatestEvidence");

  return Object.freeze({
    inspect(threadId){
      const thread=directoryStore.getEntry(threadId);
      if(thread===null)return null;
      const evidence=physicalGenomeMigrationStore.latestEvidence(threadId);
      return analyzeAppearanceCoverage({
        threads:[thread],
        ancestryEvidence:evidence===null?[]:[{threadId,...evidence}],
      });
    },
    scan({limit=5000}={}){
      const threads=directoryStore.listEntries({limit});
      const ancestryEvidence=physicalGenomeMigrationStore.listLatestEvidence(
        threads.map((thread)=>thread.threadId),
      );
      return analyzeAppearanceCoverage({threads,ancestryEvidence});
    },
    origins(threadIds){
      if(!Array.isArray(threadIds))throw new TypeError("Appearance origins require Thread IDs");
      const ids=[...new Set(threadIds.map((value)=>{
        if(typeof value!=="string"||value.trim()==="")throw new TypeError("Appearance origins require non-empty Thread IDs");
        return value.trim();
      }))];
      if(ids.length>5000)throw new TypeError("Appearance origins are limited to 5000 Threads");
      if(ids.length===0)return Object.freeze([]);
      return Object.freeze(physicalGenomeMigrationStore.listLatestEvidence(ids).map((evidence)=>Object.freeze({
        threadId:evidence.threadId,
        ethnicity:recordedOrigins(evidence.physicalAncestry),
      })));
    },
  });
}
