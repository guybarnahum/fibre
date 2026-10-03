import {createCloudflareInfraDriver} from "#infra/providers/cloudflare";
import {
  createPopulationLabExperimentStore,
  populationLabExperimentRef,
} from "#services/population-lab/src/experiment-artifacts.mjs";
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

export function adminPopulationLabExperimentRequest(spec,{
  experimentId=newExperimentId(),
  requestedAt=new Date().toISOString(),
}={}){
  if(!spec||typeof spec!=="object"||Array.isArray(spec))throw new TypeError("experiment specification must be an object");
  if(spec.action!=="experiment")throw new TypeError("experiment action is required");
  if(typeof spec.referencePopulation!=="string"||spec.referencePopulation.trim()===""){
    throw new TypeError("coverage hole must have a reference population before an experiment can run");
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
      calibration:spec.calibration??null,
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

export function adminPopulationLabShadowExperimentRequest(baseManifest,proposal,{
  experimentId=newExperimentId(),
  requestedAt=new Date().toISOString(),
}={}){
  if(!baseManifest||typeof baseManifest!=="object"||Array.isArray(baseManifest)){
    throw new TypeError("base experiment manifest is required");
  }
  if(baseManifest.shadowCalibration)throw new TypeError("shadow experiments must start from a current-model baseline");
  const calibration=baseManifest.source?.calibration;
  if(!calibration||typeof calibration!=="object"||Array.isArray(calibration)){
    throw new TypeError("base experiment calibration snapshot is required");
  }
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
  return launchPopulationLabRequest(env,adminPopulationLabShadowExperimentRequest(manifest,proposal));
}

export async function runAdminPopulationLabExperimentWorkflow(env,rawRequest){
  const request=normalizePhysicalExperimentRequest(rawRequest);
  return runPersistedPhysicalExperiment({
    request,
    artifacts:experimentStore(env),
  });
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

export async function readAdminPopulationLabExperiment(env,experimentId){
  return experimentStore(env).get(experimentId);
}

export async function deleteAdminPopulationLabExperiment(env,experimentId){
  return experimentStore(env).delete(experimentId);
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
    impact:projectCalibrationCandidateImpact({candidate,coverage}),
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

export async function readAdminPopulationLabVisualReview(env,experimentId){
  const store=experimentStore(env);
  const experiment=await store.get(experimentId);
  if(experiment===null)return null;
  return readJsonArtifact(store,experiment.artifacts?.visualReview?.objectRef);
}

export async function recordAdminPopulationLabVisualReview(env,experimentId,input){
  const review=await experimentStore(env).putVisualReview(experimentId,input);
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

export async function readAdminPopulationLabReport(env,experimentId){
  const store=experimentStore(env);
  const experiment=await store.get(experimentId);
  if(experiment===null)return null;

  if(experiment.visual?.status==="completed"&&experiment.artifacts?.visualManifest?.objectRef&&experiment.artifacts?.population?.objectRef){
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

  const objectRef=experiment.artifacts?.visualReport?.objectRef
    ?? experiment.artifacts?.report?.objectRef
    ?? populationLabExperimentRef(experimentId,"report");
  return store.getArtifact(objectRef);
}

export async function readAdminPopulationLabImage(env,experimentId,ordinal,role){
  if(!/^\d{3}$/u.test(ordinal))throw new TypeError("image ordinal must be three digits");
  if(!["geometry","portrait"].includes(role))throw new TypeError("image role is invalid");
  return experimentStore(env).getArtifact(
    populationLabExperimentRef(experimentId,`image:${ordinal}:${role}`),
  );
}
