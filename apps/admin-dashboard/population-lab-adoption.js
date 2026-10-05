function number(value){
  const parsed=Number(value);
  return Number.isFinite(parsed)?parsed:null;
}

function impactOf(experiment){
  const impact=experiment?.approval?.impact;
  if(!impact||typeof impact!=="object"||Array.isArray(impact))return null;
  const referencePopulation=typeof impact.referencePopulation==="string"?impact.referencePopulation:null;
  const fromVersion=number(impact.fromVersion);
  const toVersion=number(impact.toVersion);
  if(referencePopulation===null||fromVersion===null||toVersion===null)return null;
  return Object.freeze({
    referencePopulation,
    fromVersion,
    toVersion,
    threadIds:Object.freeze([...(impact.threadIds??[])].filter(value=>typeof value==="string"&&value!=="")),
    threadCount:Number(impact.threadCount??0),
    lineageCount:Number(impact.lineageCount??0),
  });
}

export function populationLabAdoptionState(experiment,{model=[],migrationCandidates=[]}={}){
  const impact=impactOf(experiment);
  if(impact===null)return null;
  const calibration=(Array.isArray(model)?model:[]).find(item=>item?.id===impact.referencePopulation)??null;
  const currentVersion=number(calibration?.version);
  const admitted=currentVersion!==null&&currentVersion>=impact.toVersion;
  const projected=new Set(impact.threadIds);
  const remaining=(Array.isArray(migrationCandidates)?migrationCandidates:[])
    .filter(candidate=>projected.has(candidate?.threadId))
    .map(candidate=>candidate.threadId);
  const exactAdmission=Boolean(
    calibration?.admissionEvidence?.approvalExperimentId===experiment.experimentId
  );

  const superseded=admitted&&!exactAdmission;
  return Object.freeze({
    experimentId:experiment.experimentId,
    referencePopulation:impact.referencePopulation,
    fromVersion:impact.fromVersion,
    toVersion:impact.toVersion,
    currentVersion,
    projectedThreadIds:impact.threadIds,
    projectedThreadCount:impact.threadCount,
    lineageCount:impact.lineageCount,
    remainingThreadIds:Object.freeze([...new Set(remaining)].sort()),
    remainingThreadCount:new Set(remaining).size,
    admitted,
    exactAdmission,
    superseded,
    state:!admitted
      ?"admission_required"
      :superseded
        ?"superseded"
        :remaining.length>0
          ?"affected"
          :"converged",
  });
}

export function populationLabAdoptions(experiments,context={}){
  return Object.freeze((Array.isArray(experiments)?experiments:[])
    .filter(experiment=>
      (experiment?.experimentKind==="refinement"||experiment?.summary?.shadow===true)
      &&experiment?.artifacts?.calibrationApproval?.objectRef
      &&impactOf(experiment)!==null
    )
    .map(experiment=>populationLabAdoptionState(experiment,context))
    .filter(Boolean)
    .sort((a,b)=>{
      const left=experiments.find(item=>item.experimentId===a.experimentId);
      const right=experiments.find(item=>item.experimentId===b.experimentId);
      return String(right?.approval?.approvedAt??right?.startedAt??"")
        .localeCompare(String(left?.approval?.approvedAt??left?.startedAt??""));
    }));
}

export function populationLabExperimentAdmitted(adoption){
  return Boolean(adoption?.admitted&&adoption?.exactAdmission);
}

export function populationLabAffectedThreadIds(adoptions){
  return new Set((Array.isArray(adoptions)?adoptions:[])
    .filter(adoption=>adoption?.state==="affected")
    .flatMap(adoption=>adoption.remainingThreadIds??[]));
}

export function populationLabAdmissionObservation({experimentId,current,coverage}={}){
  const referencePopulation=typeof current?.id==="string"?current.id:null;
  const expectedVersion=Number(current?.version);
  if(referencePopulation===null||!Number.isSafeInteger(expectedVersion)){
    throw new TypeError("admitted calibration is required");
  }
  const observed=(coverage?.model??[]).find(entry=>entry?.id===referencePopulation)??null;
  const observedVersion=Number(observed?.version);
  const observedExperimentId=observed?.admissionEvidence?.approvalExperimentId??null;
  return Object.freeze({
    referencePopulation,
    expectedVersion,
    observedVersion:Number.isSafeInteger(observedVersion)?observedVersion:null,
    observedExperimentId,
    observed:observedVersion===expectedVersion&&observedExperimentId===experimentId,
  });
}
