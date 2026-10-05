import { analyzeAppearanceCoverage } from "#core/src/population-context/index.mjs";

function requireMethod(name,value,method){
  if(!value||typeof value[method]!=="function")throw new TypeError(`${name} must expose ${method}()`);
  return value;
}

export function createAppearanceCoverageService({
  directoryStore,
  physicalGenomeMigrationStore,
  calibrationModelProvider=null,
}={}){
  requireMethod("directoryStore",directoryStore,"getEntry");
  requireMethod("directoryStore",directoryStore,"listEntries");
  requireMethod("physicalGenomeMigrationStore",physicalGenomeMigrationStore,"latestEvidence");
  requireMethod("physicalGenomeMigrationStore",physicalGenomeMigrationStore,"listLatestEvidence");
  if(calibrationModelProvider!==null&&typeof calibrationModelProvider!=="function"){
    throw new TypeError("calibrationModelProvider must be a function or null");
  }

  const model=()=>calibrationModelProvider?.()??null;
  const withHistory=(coverage,calibrationModel)=>{
    if(calibrationModel===null)return Object.freeze({...coverage,calibrationHistory:Object.freeze([])});
    const calibrated=[...new Set((calibrationModel.admissions??[]).map(entry=>entry.id))].sort();
    return Object.freeze({
      ...coverage,
      calibrationHistory:Object.freeze(calibrated.map(referencePopulation=>Object.freeze({
        id:referencePopulation,
        currentVersion:calibrationModel.calibration(referencePopulation).version,
        versions:calibrationModel.history(referencePopulation),
      }))),
    });
  };

  return Object.freeze({
    inspect(threadId){
      const thread=directoryStore.getEntry(threadId);
      if(thread===null)return null;
      const evidence=physicalGenomeMigrationStore.latestEvidence(threadId);
      const calibrationModel=model();
      return withHistory(analyzeAppearanceCoverage({
        threads:[thread],
        ancestryEvidence:evidence===null?[]:[{threadId,...evidence}],
        calibrationModel,
      }),calibrationModel);
    },
    scan({limit=5000}={}){
      const threads=directoryStore.listEntries({limit});
      const ancestryEvidence=physicalGenomeMigrationStore.listLatestEvidence(
        threads.map((thread)=>thread.threadId),
      );
      const calibrationModel=model();
      return withHistory(analyzeAppearanceCoverage({threads,ancestryEvidence,calibrationModel}),calibrationModel);
    },
  });
}
