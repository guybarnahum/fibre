export function populationLabHistoryExperimentParentId(experiment){
  return experiment?.baselineExperimentId
    ??experiment?.summary?.shadowOfExperimentId
    ??null;
}

export function populationLabCalibrationHistoryGroups(history=[],experiments=[]){
  const groups=Array.isArray(history)?history:[];
  const list=Array.isArray(experiments)?experiments:[];
  const byId=new Map(list.map(experiment=>[experiment?.experimentId,experiment]));

  return Object.freeze(groups.map(group=>{
    const versions=Array.isArray(group?.versions)?group.versions:[];
    const nodes=versions.map((version,index)=>{
      const admissionExperimentId=version?.evidence?.approvalExperimentId??null;
      const nextAdmissionExperimentId=versions[index+1]?.evidence?.approvalExperimentId??null;
      const nextAdmissionExperiment=byId.get(nextAdmissionExperimentId)??null;
      const baselineExperimentId=nextAdmissionExperiment
        ?populationLabHistoryExperimentParentId(nextAdmissionExperiment)
        :null;
      const reportExperimentId=baselineExperimentId??admissionExperimentId;
      return Object.freeze({
        ...version,
        current:Number(version?.version)===Number(group?.currentVersion),
        admissionExperimentId,
        reportExperimentId,
      });
    });
    return Object.freeze({
      id:group?.id??null,
      currentVersion:Number(group?.currentVersion),
      versions:Object.freeze(nodes),
    });
  }).filter(group=>group.id&&group.versions.length>1));
}

export function populationLabHistoricalExperimentIds(groups=[]){
  const ids=new Set();
  for(const group of groups??[]){
    for(const version of group?.versions??[]){
      if(version?.admissionExperimentId)ids.add(version.admissionExperimentId);
      if(version?.reportExperimentId)ids.add(version.reportExperimentId);
    }
  }
  return ids;
}

function changedValues(current,target){
  return Object.freeze(Object.fromEntries(
    Object.entries(target??{}).filter(([key,value])=>current?.[key]!==value),
  ));
}

export function populationLabHistoryDraft(group,version){
  if(!group?.id||!version)throw new TypeError("calibration history version is required");
  return Object.freeze({
    referencePopulation:group.id,
    sourceVersion:Number(version.version),
    rationale:"",
    evidence:[],
    values:Object.freeze({...version.prior}),
    variation:Object.freeze({...version.effectiveVariation}),
  });
}

export function populationLabHistoryShadowDraft(group,version){
  if(!group?.id||!version)throw new TypeError("calibration history version is required");
  const current=group.versions?.find(candidate=>candidate?.current===true);
  if(!current)throw new TypeError("current calibration history version is required");
  return Object.freeze({
    referencePopulation:group.id,
    sourceVersion:Number(version.version),
    rationale:`Re-evaluate admitted historical baseline @${version.version} against current @${group.currentVersion}.`,
    evidence:Object.freeze([`calibration-history:${group.id}@${version.version}`]),
    values:changedValues(current.prior,version.prior),
    variation:changedValues(current.effectiveVariation,version.effectiveVariation),
  });
}
