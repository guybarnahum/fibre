import {populationLabExperimentRef} from "./experiment-artifacts.mjs";
import {
  populationGeometryAnchorPrompt,
  populationSurfacePortraitPrompt,
} from "./portrait-prompt.mjs";

const ASSET_GENERATION_JOB_VERSION="asset-generation-job-v0.1";

export const POPULATION_LAB_VISUAL_EXPERIMENT_VERSION="fibre-population-lab-visual-experiment-v0.1";
export const POPULATION_LAB_VISUAL_SAMPLE_SIZE=4;
export const POPULATION_LAB_VISUAL_PROVIDER_PROFILE="openai-gpt-image-2-medium-v1";

function nonEmpty(name,value){
  if(typeof value!=="string"||value.trim()==="")throw new TypeError(name+" is required");
  return value.trim();
}

function integer(name,value,{minimum,maximum}){
  if(!Number.isInteger(value)||value<minimum||value>maximum){
    throw new TypeError(`${name} must be an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

function esc(value){
  return String(value??"").replace(/[&<>"']/gu,char=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;",
  }[char]));
}

function parsePopulation(bytes){
  let value;
  try{value=JSON.parse(new TextDecoder().decode(bytes))}
  catch(error){throw new Error("Population Lab population artifact is invalid JSON: "+error.message)}
  if(!value||typeof value!=="object"||!Array.isArray(value.people)||value.people.length===0){
    throw new Error("Population Lab population artifact has no people");
  }
  return value;
}

function sampleIndexes(length,count){
  if(count>=length)return Array.from({length},(_,index)=>index);
  if(count===1)return [0];
  return Array.from({length:count},(_,index)=>Math.round(index*(length-1)/(count-1)));
}

function personPrompts(person){
  if(!person?.physicalState?.geometryDescription||!person?.physicalState?.surfaceDescription){
    throw new Error("visual sample person is missing layered reference physical state");
  }
  return Object.freeze({
    geometryPrompt:populationGeometryAnchorPrompt({
      sex:person.sex,
      geometryDescription:person.geometryDescription,
      physicalGeometryDescription:person.physicalState.geometryDescription,
    }),
    surfacePrompt:populationSurfacePortraitPrompt({
      sex:person.sex,
      surfaceDescription:person.surfaceDescription,
      physicalSurfaceDescription:person.physicalState.surfaceDescription,
    }),
  });
}

function job({
  experimentId,
  ordinal,
  pass,
  prompt,
  referenceObjectRefs,
  requestedAt,
  referencePopulation,
}){
  const padded=String(ordinal).padStart(3,"0");
  const role=pass==="geometry"?"population_lab_geometry_anchor":"population_lab_surface_portrait";
  const outputObjectRef=populationLabExperimentRef(experimentId,`image:${padded}:${pass==="geometry"?"geometry":"portrait"}`);
  return Object.freeze({
    jobVersion:ASSET_GENERATION_JOB_VERSION,
    jobId:`assetjob_population_lab_${experimentId}_${padded}_${pass}`,
    assetKind:"image",
    role,
    variant:`physical-calibration-${pass}-v1`,
    brief:{description:prompt,constraints:[]},
    inputReferences:[populationLabExperimentRef(experimentId,"population")],
    referenceObjectRefs,
    outputObjectRef,
    receiptObjectRef:populationLabExperimentRef(experimentId,`image:${padded}:${pass}:receipt`),
    requestedAt,
    providerProfile:POPULATION_LAB_VISUAL_PROVIDER_PROFILE,
    context:{
      kind:`population_lab_visual_${pass}`,
      experimentId,
      ordinal,
      referencePopulation,
    },
  });
}

export function normalizeVisualExperimentRequest(raw={}){
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new TypeError("visual experiment request must be an object");
  return Object.freeze({
    contract:POPULATION_LAB_VISUAL_EXPERIMENT_VERSION,
    experimentId:nonEmpty("experimentId",raw.experimentId),
    requestedAt:nonEmpty("requestedAt",raw.requestedAt),
    sampleSize:integer("sampleSize",raw.sampleSize??POPULATION_LAB_VISUAL_SAMPLE_SIZE,{minimum:1,maximum:8}),
  });
}

export function buildPopulationLabVisualPlan({request:rawRequest,populationBytes}={}){
  const request=normalizeVisualExperimentRequest(rawRequest);
  const population=parsePopulation(populationBytes);
  const indexes=sampleIndexes(population.people.length,Math.min(request.sampleSize,population.people.length));
  const referencePopulation=nonEmpty(
    "referencePopulation",
    population.meta?.places?.[0]??population.people[0]?.referencePopulation,
  );
  const samples=indexes.map((personIndex,sampleIndex)=>{
    const person=population.people[personIndex];
    const ordinal=sampleIndex+1;
    const prompts=personPrompts(person);
    const geometryJob=job({
      experimentId:request.experimentId,
      ordinal,
      pass:"geometry",
      prompt:prompts.geometryPrompt,
      referenceObjectRefs:[],
      requestedAt:request.requestedAt,
      referencePopulation,
    });
    const portraitJob=job({
      experimentId:request.experimentId,
      ordinal,
      pass:"portrait",
      prompt:prompts.surfacePrompt,
      referenceObjectRefs:[geometryJob.outputObjectRef],
      requestedAt:request.requestedAt,
      referencePopulation,
    });
    return Object.freeze({
      ordinal,
      personIndex,
      name:person.name,
      sex:person.sex,
      referencePopulation,
      phenotype:person.inheritance?.phenotype??null,
      physicalState:person.physicalState??null,
      geometryPrompt:prompts.geometryPrompt,
      surfacePrompt:prompts.surfacePrompt,
      geometryJob,
      portraitJob,
    });
  });
  return Object.freeze({
    contract:POPULATION_LAB_VISUAL_EXPERIMENT_VERSION,
    request,
    referencePopulation,
    populationCount:population.people.length,
    samples:Object.freeze(samples),
  });
}

export function renderPopulationLabVisualReport(plan){
  if(!plan||!Array.isArray(plan.samples)||plan.samples.length===0)throw new TypeError("visual experiment plan is required");
  const cards=plan.samples.map(sample=>{
    const ordinal=String(sample.ordinal).padStart(3,"0");
    return `<article><h3>${esc(sample.name)}</h3><small>${esc(sample.sex)} · cohort person ${sample.personIndex+1}</small><div class=pair><figure><img src="image/${ordinal}/geometry" alt=""><figcaption>Geometry anchor</figcaption></figure><figure><img src="image/${ordinal}/portrait" alt=""><figcaption>Surface portrait</figcaption></figure></div><details><summary>Expected inherited phenotype</summary><pre>${esc(JSON.stringify(sample.phenotype,null,2))}</pre></details><details><summary>Reference physical state</summary><pre>${esc(JSON.stringify(sample.physicalState,null,2))}</pre></details><details><summary>Geometry prompt</summary><pre>${esc(sample.geometryPrompt)}</pre></details><details><summary>Surface prompt</summary><pre>${esc(sample.surfacePrompt)}</pre></details></article>`;
  }).join("");
  return `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><title>Fibre Population Lab · Visual fidelity</title><style>body{font-family:system-ui;margin:0;padding:28px;background:#f5f5f4;color:#18181b}.wrap{max-width:1500px;margin:auto}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:16px;margin-top:18px}article{background:white;border:1px solid #ddd;border-radius:12px;padding:14px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}figure{margin:0}img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#e7e5e4}figcaption,small{font-size:12px;color:#71717a;margin-top:4px}h1,h3{margin:0 0 5px}details{font-size:13px;margin-top:8px}pre{white-space:pre-wrap;font-size:11px}@media(max-width:640px){body{padding:14px}.grid{grid-template-columns:1fr}.pair{grid-template-columns:1fr}}</style><div class=wrap><h1>Fibre Population Lab · Visual fidelity</h1><p>Controlled physical cohort · ${esc(plan.referencePopulation)} · ${plan.samples.length} deterministic samples from ${plan.populationCount} people.</p><p>Compare each geometry anchor with its reference-conditioned final portrait. This is human renderer-fidelity evidence, not calibration authority.</p><main class=grid>${cards}</main></div>`;
}
