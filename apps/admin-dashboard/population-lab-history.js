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

export function populationLabHistoryDraft(group,version){
  if(!group?.id||!version)throw new TypeError("calibration history version is required");
  return Object.freeze({
    referencePopulation:group.id,
    sourceVersion:Number(version.version),
    rationale:"",
    evidence:[],
    values:Object.freeze({...version.values}),
    variation:Object.freeze({...version.variation}),
  });
}
