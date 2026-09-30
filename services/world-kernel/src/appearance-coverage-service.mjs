import { analyzeAppearanceCoverage } from "#core/src/population-context/index.mjs";

function requireMethod(name,value,method){
  if(!value||typeof value[method]!=="function")throw new TypeError(`${name} must expose ${method}()`);
  return value;
}

export function createAppearanceCoverageService({
  directoryStore,
  physicalGenomeMigrationStore,
}={}){
  requireMethod("directoryStore",directoryStore,"listEntries");
  requireMethod("physicalGenomeMigrationStore",physicalGenomeMigrationStore,"listLatestEvidence");

  return Object.freeze({
    scan({limit=5000}={}){
      const threads=directoryStore.listEntries({limit});
      const ancestryEvidence=physicalGenomeMigrationStore.listLatestEvidence(
        threads.map((thread)=>thread.threadId),
      );
      return analyzeAppearanceCoverage({threads,ancestryEvidence});
    },
  });
}
