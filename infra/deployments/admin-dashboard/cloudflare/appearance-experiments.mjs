import {createCloudflareInfraDriver} from "#infra/providers/cloudflare";
import {
  createPopulationLabExperimentStore,
  populationLabExperimentRef,
} from "#services/population-lab/src/experiment-artifacts.mjs";
import {createHumanAppearanceCalibrationRegistry} from "#services/population-lab/src/calibration-registry.mjs";
import {
  projectCalibrationCandidateImpact,
} from "#services/population-lab/src/calibration-approval.mjs";
import {
  normalizePhysicalExperimentRequest,
  runPersistedPhysicalExperiment,
} from "#services/population-lab/src/physical-experiment.mjs";
import {
  POPULATION_LAB_VISUAL_SAMPLE_SIZE,
  buildPopulationLabVisualPlan,
  normalizeVisualExperimentRequest,
  renderPopulationLabVisualReport,
} from "#services/population-lab/src/visual-experiment.mjs";

const WORKFLOW_NAME="population_lab_experiment_v1";

function experimentInfra(env,{workflow=false,services=false,realtime=false}={}){
  return createCloudflareInfraDriver({
    objectBucket:env?.PRESENTATION_OBJECTS,
    catalogDatabase:env?.PRESENTATION_CATALOG,
    workflowBindings:workflow&&env?.POPULATION_LAB_EXPERIMENT
      ? {[WORKFLOW_NAME]:env.POPULATION_LAB_EXPERIMENT}
      : {},
    serviceBindings:services&&env?.ASSET_GENERATOR
      ? {asset_generator:env.ASSET_GENERATOR}
      : {},
    privateToken:services?env?.FIBRE_PRIVATE_TOKEN:null,
    realtimeChannels:realtime?env?.ADMIN_LIVE:null,
  });
}

function experimentStore(env){
  return createPopulationLabExperimentStore(experimentInfra(env));
}

function calibrationRegistry(env){
  return createHumanAppearanceCalibrationRegistry(experimentInfra(env));
}

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

async function readJsonArtifact(store,objectRef){
  if(typeof objectRef!=="string")return null;
  const artifact=await store.getArtifact(objectRef);
  if(artifact===null)return null;
  try{return JSON.parse(new TextDecoder().decode(artifact.bytes))}
  catch{throw new Error("Population Lab JSON artifact is invalid")}
}

async function publishExperimentHint(env,experimentId,aspect="progress"){
  try{
    const infra=experimentInfra(env,{realtime:true});
    if(!infra.realtime)return;
    await infra.realtime.publish("admin",{
      entity:"population_lab_experiment",
      id:experimentId,
      aspect,
    });
  }catch{}
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

function comparisonAlignmentInput(input){
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

function comparisonAlignmentKey(role,ordinal){
  if(!["geometry","portrait"].includes(role))throw new TypeError("comparison alignment role is invalid");
  if(!Number.isInteger(ordinal)||ordinal<1||ordinal>8)throw new TypeError("comparison alignment ordinal is invalid");
  return role+":"+ordinal;
}

export function adminPopulationLabExperimentRequest(spec,{
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

export function adminPopulationLabRerunRequest(manifest,{
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

export function adminPopulationLabShadowBaseCalibration(baseManifest,currentCalibration=null){
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

export function adminPopulationLabShadowExperimentRequest(baseManifest,proposal,{
  experimentId=newExperimentId(),
  requestedAt=new Date().toISOString(),
  currentCalibration=null,
}={}){
  if(!baseManifest||typeof baseManifest!=="object"||Array.isArray(baseManifest)){
    throw new TypeError("base experiment manifest is required");
  }
  const calibration=adminPopulationLabShadowBaseCalibration(baseManifest,currentCalibration);
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

async function launchPopulationLabRequest(env,request){
  const store=experimentStore(env);
  await store.queue(request.experimentId,request);
  const infra=experimentInfra(env,{workflow:true});
  try{
    const workflow=await infra.workflows.start(WORKFLOW_NAME,request.experimentId,request);
    return Object.freeze({
      experiment:await store.get(request.experimentId),
      workflow,
    });
  }catch(error){
    await store.fail(request.experimentId,error).catch(()=>{});
    throw error;
  }
}

export async function launchAdminPopulationLabExperiment(env,spec){
  return launchPopulationLabRequest(env,adminPopulationLabExperimentRequest(spec));
}

export async function launchAdminPopulationLabShadowExperiment(env,baseExperimentId,proposal){
  const store=experimentStore(env);
  const base=await store.get(baseExperimentId);
  if(base===null)throw new TypeError("base experiment not found");
  if(base.status!=="completed")throw new TypeError("shadow calibration requires a completed baseline experiment");
  const manifest=await readJsonArtifact(store,base.artifacts?.manifest?.objectRef);
  if(manifest===null)throw new Error("base experiment manifest is missing");
  const model=await calibrationRegistry(env).model();
  const currentCalibration=model.calibration(manifest.referencePopulation);
  return launchPopulationLabRequest(env,adminPopulationLabShadowExperimentRequest(
    manifest,
    proposal,
    {currentCalibration},
  ));
}

export async function runAdminPopulationLabExperimentWorkflow(env,rawRequest){
  const request=normalizePhysicalExperimentRequest(rawRequest);
  const artifacts=withExperimentLifecycleHints(
    experimentStore(env),
    (experimentId,aspect)=>publishExperimentHint(env,experimentId,aspect),
  );
  return runPersistedPhysicalExperiment({request,artifacts});
}

export async function launchAdminPopulationLabVisualExperiment(env,experimentId){
  const store=experimentStore(env);
  const experiment=await store.get(experimentId);
  if(experiment===null)throw new TypeError("experiment not found");
  const request=experiment.visual?.status==="failed"&&!experiment.visual?.startedAt
    ? normalizeVisualExperimentRequest(await store.retryQueuedVisual(experimentId))
    : normalizeVisualExperimentRequest({
        experimentId,
        requestedAt:new Date().toISOString(),
        sampleSize:POPULATION_LAB_VISUAL_SAMPLE_SIZE,
      });
  if(!experiment.visual)await store.queueVisual(experimentId,request);
  const infra=experimentInfra(env,{workflow:true});
  try{
    const workflow=await infra.workflows.start(
      WORKFLOW_NAME,
      experimentId+":visual",
      request,
    );
    return Object.freeze({
      experiment:await store.get(experimentId),
      workflow,
    });
  }catch(error){
    await store.failVisual(experimentId,error).catch(()=>{});
    throw error;
  }
}

export async function prepareAdminPopulationLabVisualExperiment(env,rawRequest){
  const request=normalizeVisualExperimentRequest(rawRequest);
  const store=experimentStore(env);
  await store.runningVisual(request.experimentId);
  await publishExperimentHint(env,request.experimentId,"running");
  const experiment=await store.get(request.experimentId);
  const populationRef=experiment?.artifacts?.population?.objectRef;
  if(typeof populationRef!=="string")throw new Error("experiment population artifact is missing");
  const population=await store.getArtifact(populationRef);
  if(population===null)throw new Error("experiment population bytes are missing");
  return buildPopulationLabVisualPlan({
    request,
    populationBytes:population.bytes,
  });
}

export async function reconcileAdminPopulationLabAsset(env,job){
  const infra=experimentInfra(env,{services:true});
  return infra.services.call("asset_generator","generation.reconcile",{job});
}

export async function recordAdminPopulationLabVisualAsset(env,{experimentId,sample,role,result}){
  if(result?.state!=="ready")throw new TypeError("visual asset must be ready before recording");
  const receipt=result?.proof?.receipt;
  const job=role==="geometry"?sample.geometryJob:sample.portraitJob;
  if(!receipt||receipt.objectRef!==job.outputObjectRef||receipt.jobId!==job.jobId){
    throw new Error("Asset Generator proof does not match Population Lab visual job");
  }
  const store=experimentStore(env);
  await store.adoptImage(experimentId,{
    ordinal:sample.ordinal,
    role,
    objectRef:receipt.objectRef,
    digest:receipt.sha256,
    mediaType:receipt.mediaType,
  });
  await store.adoptArtifact(experimentId,{
    key:`visualReceipt${String(sample.ordinal).padStart(3,"0")}${role==="geometry"?"Geometry":"Portrait"}`,
    objectRef:job.receiptObjectRef,
  });
  await publishExperimentHint(env,experimentId,role);
  return receipt;
}

export async function completeAdminPopulationLabVisualExperiment(env,plan){
  const store=experimentStore(env);
  await store.putVisualReport(plan.request.experimentId,renderPopulationLabVisualReport(plan));
  const completed=await store.completeVisual(plan.request.experimentId,{
    sampleSize:plan.samples.length,
    images:plan.samples.length*2,
    referencePopulation:plan.referencePopulation,
  });
  await publishExperimentHint(env,plan.request.experimentId,"completed");
  return completed;
}

export async function failAdminPopulationLabVisualExperiment(env,experimentId,error){
  const failed=await experimentStore(env).failVisual(experimentId,error);
  await publishExperimentHint(env,experimentId,"failed");
  return failed;
}

export async function listAdminPopulationLabExperiments(env){
  const page=await experimentStore(env).list({limit:200});
  return{
    ...page,
    experiments:[...page.experiments].sort((left,right)=>{
      const a=left.requestedAt??left.startedAt??"";
      const b=right.requestedAt??right.startedAt??"";
      return b.localeCompare(a);
    }),
  };
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

export async function readAdminPopulationLabComparison(env,experimentId){
  const store=experimentStore(env);
  const shadowExperiment=await store.get(experimentId);
  if(shadowExperiment===null)throw new TypeError("experiment not found");
  const shadowManifest=await readJsonArtifact(store,shadowExperiment.artifacts?.manifest?.objectRef);
  const shadow=shadowManifest?.shadowCalibration;
  const baselineExperimentId=populationLabComparisonBaselineId({
    shadowManifest,
    shadowExperiment,
  });
  if(!shadow||typeof baselineExperimentId!=="string"||baselineExperimentId===""){
    throw new TypeError("comparison requires a shadow experiment with a baseline");
  }
  const baselineExperiment=await store.get(baselineExperimentId);
  if(baselineExperiment===null)throw new Error("baseline experiment not found");

  const [baselineManifest,baselineResult,shadowResult]=await Promise.all([
    readJsonArtifact(store,baselineExperiment.artifacts?.manifest?.objectRef),
    readJsonArtifact(store,baselineExperiment.artifacts?.result?.objectRef),
    readJsonArtifact(store,shadowExperiment.artifacts?.result?.objectRef),
  ]);
  const referencePopulation=shadow.referencePopulation;
  const changes=populationLabComparisonChanges({shadow,baselineResult,shadowResult});

  return Object.freeze({
    referencePopulation,
    baselineExperimentId,
    shadowExperimentId:experimentId,
    baseCalibration:shadow.baseCalibration,
    rationale:shadow.rationale,
    evidence:shadow.evidence,
    sameCohort:populationLabSameCohort(baselineManifest,shadowManifest),
    cohort:Object.freeze({
      seed:shadowManifest.seed??null,
      count:shadowManifest.count??null,
    }),
    changes:Object.freeze(changes),
    health:populationLabComparisonHealth({referencePopulation,baselineResult,shadowResult}),
    comparisonAlignments:Object.freeze({...shadowExperiment.comparisonAlignments}),
  });
}

export async function recordAdminPopulationLabComparisonAlignment(env,experimentId,role,ordinal,input){
  const store=experimentStore(env);
  const experiment=await store.get(experimentId);
  if(experiment===null)throw new TypeError("experiment not found");
  if(experiment.experimentKind!=="refinement"&&experiment.summary?.shadow!==true){
    throw new TypeError("comparison alignment belongs to a shadow experiment");
  }
  if(experiment.visual?.status!=="completed"){
    throw new TypeError("comparison alignment requires completed visuals");
  }
  const sampleSize=Number(experiment.visual?.sampleSize??experiment.visual?.summary?.sampleSize);
  if(!Number.isInteger(sampleSize)||ordinal>sampleSize){
    throw new TypeError("comparison alignment sample is outside the visual cohort");
  }
  const manifest=await readJsonArtifact(store,experiment.artifacts?.manifest?.objectRef);
  const shadow=manifest?.shadowCalibration;
  if(!shadow)throw new TypeError("comparison alignment requires shadow calibration evidence");
  if(Object.keys(shadow.variation??{}).length>0){
    throw new TypeError("comparison alignment is disabled when variation changes");
  }
  if(Object.hasOwn(shadow.values??{},"eyeSpacing")){
    throw new TypeError("comparison alignment is disabled when eyeSpacing changes");
  }
  const key=comparisonAlignmentKey(role,ordinal);
  const points=comparisonAlignmentInput(input);
  const updated=await store.putComparisonAlignment(experimentId,{key,points});
  await publishExperimentHint(env,experimentId,"comparison_alignment");
  return updated.comparisonAlignments[key];
}

export async function deleteAdminPopulationLabComparisonAlignment(env,experimentId,role,ordinal){
  const store=experimentStore(env);
  const experiment=await store.get(experimentId);
  if(experiment===null)throw new TypeError("experiment not found");
  const key=comparisonAlignmentKey(role,ordinal);
  const existed=Object.hasOwn(experiment.comparisonAlignments??{},key);
  const updated=await store.removeComparisonAlignment(experimentId,key);
  await publishExperimentHint(env,experimentId,"comparison_alignment");
  return Object.freeze({
    experimentId,
    key,
    deleted:existed,
    comparisonAlignments:Object.freeze({...updated.comparisonAlignments}),
  });
}

export async function readAdminPopulationLabExperiment(env,experimentId){
  return experimentStore(env).get(experimentId);
}

export async function deleteAdminPopulationLabExperiment(env,experimentId){
  const store=experimentStore(env);
  const page=await store.list({limit:200});
  const dependent=page.experiments.find(experiment=>
    experiment.baselineExperimentId===experimentId
    ||experiment.summary?.shadowOfExperimentId===experimentId
  );
  if(dependent)throw new TypeError("baseline experiment is retained while refinement evidence depends on it");
  return store.delete(experimentId);
}

export async function createAdminPopulationLabCalibrationCandidate(env,experimentId){
  const store=experimentStore(env);
  const experiment=await store.get(experimentId);
  if(experiment===null)throw new TypeError("experiment not found");
  if(experiment.review?.decision!=="supports_candidate"){
    throw new TypeError("calibration candidate requires a supporting visual review");
  }
  const manifest=await readJsonArtifact(store,experiment.artifacts?.manifest?.objectRef);
  const shadow=manifest?.shadowCalibration;
  if(!shadow)throw new TypeError("calibration candidate requires a shadow calibration experiment");
  const candidate=await store.putCalibrationCandidate(experimentId,{
    values:shadow.values,
    variation:shadow.variation,
    rationale:shadow.rationale,
  });
  await publishExperimentHint(env,experimentId,"candidate");
  return candidate;
}

export async function readAdminPopulationLabCalibrationApproval(env,experimentId,{coverage}={}){
  const store=experimentStore(env);
  const experiment=await store.get(experimentId);
  if(experiment===null)throw new TypeError("experiment not found");

  const approval=await readJsonArtifact(store,experiment.artifacts?.calibrationApproval?.objectRef);
  if(approval!==null)return Object.freeze({approval,impact:approval.impact,candidate:null});

  const candidate=await readJsonArtifact(store,experiment.artifacts?.calibrationCandidate?.objectRef);
  if(candidate===null)throw new TypeError("calibration approval requires candidate evidence");
  return Object.freeze({
    approval:null,
    impact:coverage?projectCalibrationCandidateImpact({candidate,coverage}):null,
    candidate,
  });
}

export async function approveAdminPopulationLabCalibration(env,experimentId,{approvedBy,coverage}={}){
  const store=experimentStore(env);
  const experiment=await store.get(experimentId);
  if(experiment===null)throw new TypeError("experiment not found");
  const candidate=await readJsonArtifact(store,experiment.artifacts?.calibrationCandidate?.objectRef);
  if(candidate===null)throw new TypeError("calibration approval requires candidate evidence");
  const impact=projectCalibrationCandidateImpact({candidate,coverage});
  const approval=await store.putCalibrationApproval(experimentId,{approvedBy,impact});
  await publishExperimentHint(env,experimentId,"approval");
  return approval;
}

export async function admitAdminPopulationLabCalibration(env,experimentId){
  const state=await readAdminPopulationLabCalibrationApproval(env,experimentId);
  if(state.approval===null)throw new TypeError("calibration admission requires approval");
  const result=await calibrationRegistry(env).admit(state.approval);
  await publishExperimentHint(env,experimentId,"admission");
  return result;
}

export async function readAdminPopulationLabVisualReview(env,experimentId){
  const store=experimentStore(env);
  const experiment=await store.get(experimentId);
  if(experiment===null)return null;
  return readJsonArtifact(store,experiment.artifacts?.visualReview?.objectRef);
}

export async function recordAdminPopulationLabVisualReview(env,experimentId,input){
  const review=await experimentStore(env).putVisualReview(experimentId,{
    ...input,
    decision:"open",
  });
  await publishExperimentHint(env,experimentId,"review");
  return review;
}

export async function decideAdminPopulationLabVisualReview(env,experimentId,decision){
  if(!["supports_candidate","reject"].includes(decision)){
    throw new TypeError("visual review decision must be accept or reject");
  }
  const store=experimentStore(env);
  const experiment=await store.get(experimentId);
  if(experiment===null)throw new TypeError("experiment not found");
  const current=await readJsonArtifact(store,experiment.artifacts?.visualReview?.objectRef);
  if(current===null)throw new TypeError("save visual scoring before deciding");
  const review=await store.putVisualReview(experimentId,{
    samples:current.samples,
    note:current.note,
    decision,
  });
  await publishExperimentHint(env,experimentId,"review");
  return review;
}

export async function reopenAdminPopulationLabVisualReview(env,experimentId){
  const store=experimentStore(env);
  const experiment=await store.get(experimentId);
  if(experiment===null)throw new TypeError("experiment not found");
  if(experiment.artifacts?.calibrationCandidate){
    throw new TypeError("candidate evidence locks the visual review");
  }
  const current=await readJsonArtifact(store,experiment.artifacts?.visualReview?.objectRef);
  if(current===null)throw new TypeError("visual review is not saved yet");
  const review=await store.putVisualReview(experimentId,{
    samples:current.samples,
    note:current.note,
    decision:"open",
  });
  await publishExperimentHint(env,experimentId,"review");
  return review;
}

export async function rerunAdminPopulationLabExperiment(env,experimentId){
  const store=experimentStore(env);
  const experiment=await store.get(experimentId);
  if(experiment===null)throw new TypeError("experiment not found");
  if(experiment.review?.decision!=="reject"){
    throw new TypeError("only a rejected reviewed experiment may be rerun");
  }
  const manifest=await readJsonArtifact(store,experiment.artifacts?.manifest?.objectRef);
  if(manifest===null)throw new Error("experiment manifest is missing");
  return launchPopulationLabRequest(env,adminPopulationLabRerunRequest(manifest));
}

export async function readAdminPopulationLabReport(env,experimentId,{kind="current"}={}){
  const store=experimentStore(env);
  const experiment=await store.get(experimentId);
  if(experiment===null)return null;

  if(kind!=="numerical"&&experiment.visual?.status==="completed"&&experiment.artifacts?.visualManifest?.objectRef&&experiment.artifacts?.population?.objectRef){
    try{
      const [manifest,population,review]=await Promise.all([
        store.getArtifact(experiment.artifacts.visualManifest.objectRef),
        store.getArtifact(experiment.artifacts.population.objectRef),
        readJsonArtifact(store,experiment.artifacts?.visualReview?.objectRef),
      ]);
      if(manifest!==null&&population!==null){
        const request=normalizeVisualExperimentRequest(
          JSON.parse(new TextDecoder().decode(manifest.bytes)),
        );
        const plan=buildPopulationLabVisualPlan({
          request,
          populationBytes:population.bytes,
        });
        return Object.freeze({
          bytes:new TextEncoder().encode(renderPopulationLabVisualReport(plan,{review})),
          metadata:Object.freeze({mediaType:"text/html; charset=utf-8",derived:true}),
        });
      }
    }catch{}
  }

  const objectRef=kind==="numerical"
    ?experiment.artifacts?.report?.objectRef??populationLabExperimentRef(experimentId,"report")
    :experiment.artifacts?.visualReport?.objectRef
      ??experiment.artifacts?.report?.objectRef
      ??populationLabExperimentRef(experimentId,"report");
  return store.getArtifact(objectRef);
}

export async function readAdminPopulationLabImage(env,experimentId,ordinal,role){
  if(!/^\d{3}$/u.test(ordinal))throw new TypeError("image ordinal must be three digits");
  if(!["geometry","portrait"].includes(role))throw new TypeError("image role is invalid");
  return experimentStore(env).getArtifact(
    populationLabExperimentRef(experimentId,`image:${ordinal}:${role}`),
  );
}
