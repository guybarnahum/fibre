import { analyzeAppearanceCoverage } from "#core/src/population-context/index.mjs";

function requireMethod(name,value,method){
  if(!value||typeof value[method]!=="function")throw new TypeError(`${name} must expose ${method}()`);
  return value;
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
  });
}
