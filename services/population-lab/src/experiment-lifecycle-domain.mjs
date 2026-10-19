import {normalizePhysicalExperimentRequest} from "./physical-experiment.mjs";

export function withExperimentLifecycleHints(store,publish){
  if(!store||typeof store!=="object")throw new TypeError("experiment store is required");
  if(typeof publish!=="function")throw new TypeError("experiment lifecycle publisher is required");
  return Object.freeze({
    ...store,
    async running(experimentId,...args){
      const result=await store.running(experimentId,...args);
      await publish(experimentId,"running");
      return result;
    },
    async complete(experimentId,...args){
      const result=await store.complete(experimentId,...args);
      await publish(experimentId,"completed");
      return result;
    },
    async fail(experimentId,...args){
      const result=await store.fail(experimentId,...args);
      await publish(experimentId,"failed");
      return result;
    },
  });
}

function physicalExperimentSeed(spec){
  const version=spec?.calibration?.version??"current";
  return `appearance:${spec.coverageKey}:${spec.referencePopulation}:${version}`;
}

function newExperimentId(){
  return "plexp_"+crypto.randomUUID().replaceAll("-","").slice(0,24);
}

function comparisonAlignmentPoint(name,value){
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new TypeError(name+" point is required");
  }
  const x=Number(value.x);
  const y=Number(value.y);
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1||y<0||y>1){
    throw new TypeError(name+" point must be normalized to [0,1]");
  }
  return Object.freeze({x,y});
}

export function populationLabComparisonAlignmentInput(input){
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new TypeError("comparison alignment must be an object");
  }
  return Object.freeze({
    beforeLeft:comparisonAlignmentPoint("beforeLeft",input.beforeLeft),
    beforeRight:comparisonAlignmentPoint("beforeRight",input.beforeRight),
    afterLeft:comparisonAlignmentPoint("afterLeft",input.afterLeft),
    afterRight:comparisonAlignmentPoint("afterRight",input.afterRight),
  });
}

export function populationLabComparisonAlignmentKey(role,ordinal){
  if(!["geometry","portrait"].includes(role))throw new TypeError("comparison alignment role is invalid");
  if(!Number.isInteger(ordinal)||ordinal<1||ordinal>8)throw new TypeError("comparison alignment ordinal is invalid");
  return role+":"+ordinal;
}

export function populationLabExperimentRequest(spec,{
  experimentId=newExperimentId(),
  requestedAt=new Date().toISOString(),
}={}){
  if(!spec||typeof spec!=="object"||Array.isArray(spec))throw new TypeError("experiment specification must be an object");
  if(spec.action!=="experiment")throw new TypeError("experiment action is required");
  if(typeof spec.referencePopulation!=="string"||spec.referencePopulation.trim()===""){
    throw new TypeError("coverage hole must have a reference population before an experiment can run");
  }
  const calibration=spec.calibration;
  if(
    !calibration
    ||typeof calibration!=="object"
    ||Array.isArray(calibration)
    ||calibration.id!==spec.referencePopulation
    ||!Number.isSafeInteger(Number(calibration.version))
    ||!calibration.prior
    ||!calibration.variation
  ){
    throw new TypeError("experiment requires the current admitted calibration snapshot");
  }
  return normalizePhysicalExperimentRequest({
    experimentId,
    referencePopulation:spec.referencePopulation,
    count:Number.isInteger(spec.count)?spec.count:24,
    seed:physicalExperimentSeed(spec),
    requestedAt,
    source:{
      coverageKey:spec.coverageKey??null,
      coverage:spec.coverage??null,
      populations:Array.isArray(spec.populations)?spec.populations:[],
      threadIds:Array.isArray(spec.threadIds)?spec.threadIds:[],
      places:Array.isArray(spec.places)?spec.places:[],
      calibration,
    },
  });
}

export function populationLabRerunRequest(manifest,{
  experimentId=newExperimentId(),
  requestedAt=new Date().toISOString(),
}={}){
  if(!manifest||typeof manifest!=="object"||Array.isArray(manifest)){
    throw new TypeError("experiment manifest is required");
  }
  return normalizePhysicalExperimentRequest({
    experimentId,
    referencePopulation:manifest.referencePopulation,
    count:manifest.count,
    seed:manifest.seed,
    requestedAt,
    shadowCalibration:manifest.shadowCalibration??null,
    source:manifest.source??{},
  });
}

export function populationLabShadowBaseCalibration(baseManifest,currentCalibration=null){
  if(!baseManifest||typeof baseManifest!=="object"||Array.isArray(baseManifest)){
    throw new TypeError("base experiment manifest is required");
  }
  if(!baseManifest.shadowCalibration){
    const calibration=baseManifest.source?.calibration;
    if(!calibration||typeof calibration!=="object"||Array.isArray(calibration)){
      throw new TypeError("base experiment calibration snapshot is required");
    }
    if(currentCalibration!==null){
      const sameVersion=Number(calibration.version)===Number(currentCalibration.version);
      const sameChain=JSON.stringify(calibration.dependencyChain??null)===JSON.stringify(currentCalibration.dependencyChain??null);
      if(!sameVersion||!sameChain)throw new TypeError("baseline experiment calibration is no longer current");
    }
    return calibration;
  }

  if(currentCalibration===null){
    throw new TypeError("current admitted calibration is required for admitted refinement branching");
  }
  const current=currentCalibration;
  const admittedExperimentId=current?.admissionEvidence?.approvalExperimentId??null;
  const priorVersion=Number(baseManifest.shadowCalibration?.baseCalibration?.version);
  const priorChain=baseManifest.shadowCalibration?.baseCalibration?.dependencyChain;
  const expectedChain=Array.isArray(priorChain)
    ?priorChain.map(entry=>entry?.id===baseManifest.referencePopulation
      ?{...entry,version:Number(entry.version)+1}
      :entry)
    :null;
  const currentChain=Array.isArray(current?.dependencyChain)?current.dependencyChain:null;
  if(
    admittedExperimentId!==baseManifest.experimentId
    ||!Number.isSafeInteger(priorVersion)
    ||Number(current?.version)!==priorVersion+1
    ||(expectedChain!==null&&JSON.stringify(expectedChain)!==JSON.stringify(currentChain))
  ){
    throw new TypeError("shadow experiments must start from current admitted calibration evidence");
  }
  return current;
}

export function populationLabShadowExperimentRequest(baseManifest,proposal,{
  experimentId=newExperimentId(),
  requestedAt=new Date().toISOString(),
  currentCalibration=null,
}={}){
  if(!baseManifest||typeof baseManifest!=="object"||Array.isArray(baseManifest)){
    throw new TypeError("base experiment manifest is required");
  }
  const calibration=populationLabShadowBaseCalibration(baseManifest,currentCalibration);
  if(!proposal||typeof proposal!=="object"||Array.isArray(proposal)){
    throw new TypeError("shadow calibration proposal is required");
  }
  return normalizePhysicalExperimentRequest({
    experimentId,
    referencePopulation:baseManifest.referencePopulation,
    count:baseManifest.count,
    seed:baseManifest.seed,
    requestedAt,
    shadowCalibration:{
      referencePopulation:baseManifest.referencePopulation,
      baseCalibration:calibration,
      values:proposal.values??{},
      variation:proposal.variation??{},
      rationale:proposal.rationale,
      evidence:proposal.evidence,
    },
    source:{
      ...(baseManifest.source??{}),
      calibration,
      shadowOfExperimentId:baseManifest.experimentId,
    },
  });
}

export function populationLabComparisonChanges({shadow,baselineResult,shadowResult}={}){
  if(!shadow||typeof shadow!=="object"||Array.isArray(shadow)){
    throw new TypeError("shadow calibration is required");
  }
  const referencePopulation=shadow.referencePopulation;
  const baselineLoci=
    baselineResult?.stats?.physicalCalibration?.populations?.[referencePopulation]?.loci
    ??{};
  const shadowLoci=
    shadowResult?.stats?.physicalCalibration?.populations?.[referencePopulation]?.loci
    ??{};
  return Object.freeze([
    ...Object.entries(shadow.values??{}).sort(([a],[b])=>a.localeCompare(b)).map(([parameter,after])=>Object.freeze({
      kind:"value",
      parameter,
      before:Number.isFinite(baselineLoci?.[parameter]?.prior)?baselineLoci[parameter].prior:null,
      after:Number(after),
      baselineMean:Number.isFinite(baselineLoci?.[parameter]?.mean)?baselineLoci[parameter].mean:null,
      shadowMean:Number.isFinite(shadowLoci?.[parameter]?.mean)?shadowLoci[parameter].mean:null,
      baselineSd:Number.isFinite(baselineLoci?.[parameter]?.sd)?baselineLoci[parameter].sd:null,
      shadowSd:Number.isFinite(shadowLoci?.[parameter]?.sd)?shadowLoci[parameter].sd:null,
      baselineP05:Number.isFinite(baselineLoci?.[parameter]?.p05)?baselineLoci[parameter].p05:null,
      shadowP05:Number.isFinite(shadowLoci?.[parameter]?.p05)?shadowLoci[parameter].p05:null,
      baselineP95:Number.isFinite(baselineLoci?.[parameter]?.p95)?baselineLoci[parameter].p95:null,
      shadowP95:Number.isFinite(shadowLoci?.[parameter]?.p95)?shadowLoci[parameter].p95:null,
    })),
    ...Object.entries(shadow.variation??{}).sort(([a],[b])=>a.localeCompare(b)).map(([parameter,after])=>Object.freeze({
      kind:"variation",
      parameter,
      before:null,
      after:Number(after),
      baselineMean:null,
      shadowMean:null,
      baselineSd:null,
      shadowSd:null,
      baselineP05:null,
      shadowP05:null,
      baselineP95:null,
      shadowP95:null,
    })),
  ]);
}

export function populationLabComparisonHealth({referencePopulation,baselineResult,shadowResult}={}){
  const baseline=
    baselineResult?.stats?.physicalCalibration?.populations?.[referencePopulation]
    ??{};
  const shadow=
    shadowResult?.stats?.physicalCalibration?.populations?.[referencePopulation]
    ??{};
  const warningCount=result=>Array.isArray(result?.stats?.physicalCalibration?.warnings)
    ?result.stats.physicalCalibration.warnings.length
    :0;
  return Object.freeze([
    Object.freeze({metric:"Unique share",baseline:baseline.uniqueShare??null,shadow:shadow.uniqueShare??null}),
    Object.freeze({metric:"Max center error",baseline:baseline.maxCenterError??null,shadow:shadow.maxCenterError??null}),
    Object.freeze({metric:"Median spread",baseline:baseline.medianSd??null,shadow:shadow.medianSd??null}),
    Object.freeze({metric:"Min spread",baseline:baseline.minSd??null,shadow:shadow.minSd??null}),
    Object.freeze({metric:"Max spread",baseline:baseline.maxSd??null,shadow:shadow.maxSd??null}),
    Object.freeze({
      metric:"Sibling / unrelated",
      baseline:baseline.resemblance?.siblingToUnrelatedRatio??null,
      shadow:shadow.resemblance?.siblingToUnrelatedRatio??null,
    }),
    Object.freeze({
      metric:"Child / unrelated",
      baseline:baseline.resemblance?.childToUnrelatedRatio??null,
      shadow:shadow.resemblance?.childToUnrelatedRatio??null,
    }),
    Object.freeze({metric:"Warnings",baseline:warningCount(baselineResult),shadow:warningCount(shadowResult),integer:true}),
  ]);
}

export function populationLabSameCohort(baselineManifest,shadowManifest){
  return Boolean(
    baselineManifest
    &&shadowManifest
    &&baselineManifest.seed===shadowManifest.seed
    &&baselineManifest.count===shadowManifest.count
  );
}

export function populationLabComparisonBaselineId({shadowManifest,shadowExperiment}={}){
  return shadowManifest?.source?.shadowOfExperimentId
    ??shadowExperiment?.baselineExperimentId
    ??shadowExperiment?.summary?.shadowOfExperimentId
    ??null;
}

