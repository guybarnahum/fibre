import {
  generatePhysicalCalibrationCohort,
  physicalCalibrationDiagnostics,
} from "./physical-cohort.mjs";
import {normalizePopulationLabShadowCalibration} from "./shadow-calibration.mjs";

export const POPULATION_LAB_PHYSICAL_EXPERIMENT_VERSION="fibre-population-lab-physical-experiment-v0.1";

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
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;",
  }[char]));
}

export function normalizePhysicalExperimentRequest(raw={}){
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new TypeError("physical experiment request must be an object");
  const experimentId=nonEmpty("experimentId",raw.experimentId);
  const referencePopulation=nonEmpty("referencePopulation",raw.referencePopulation);
  const seed=nonEmpty("seed",raw.seed);
  const count=integer("count",raw.count??24,{minimum:8,maximum:200});
  const requestedAt=nonEmpty("requestedAt",raw.requestedAt);
  const source=raw.source&&typeof raw.source==="object"&&!Array.isArray(raw.source)
    ? structuredClone(raw.source)
    : {};
  const shadowCalibration=raw.shadowCalibration===undefined||raw.shadowCalibration===null
    ?null
    :normalizePopulationLabShadowCalibration(raw.shadowCalibration);
  if(shadowCalibration&&shadowCalibration.referencePopulation!==referencePopulation){
    throw new TypeError("shadow calibration does not match experiment reference population");
  }
  return Object.freeze({
    contract:POPULATION_LAB_PHYSICAL_EXPERIMENT_VERSION,
    experimentId,
    referencePopulation,
    referencePopulations:Object.freeze([referencePopulation]),
    count,
    seed,
    requestedAt,
    images:false,
    mode:"physical",
    shadowCalibration,
    source:Object.freeze(source),
  });
}

export function buildPhysicalExperimentEvidence(rawRequest){
  const request=normalizePhysicalExperimentRequest(rawRequest);
  const people=[...generatePhysicalCalibrationCohort({
    referencePopulations:request.referencePopulations,
    count:request.count,
    seed:request.seed,
    shadowCalibration:request.shadowCalibration,
  })];
  const diagnostics=physicalCalibrationDiagnostics({
    people,
    referencePopulations:request.referencePopulations,
    seed:request.seed,
    shadowCalibration:request.shadowCalibration,
  });
  return Object.freeze({
    request,
    people:Object.freeze(people),
    diagnostics,
  });
}

export function renderPhysicalExperimentReport({request,people,diagnostics}){
  const population=diagnostics.populations[request.referencePopulation];
  const cards=people.map(person=>{
    const phenotype=person.inheritance?.phenotype??{};
    return `<article><section><h3>${esc(person.name)}</h3><small>${esc(person.sex)} · ${esc(request.referencePopulation)}</small><details><summary>Inherited phenotype</summary><pre>${esc(JSON.stringify(phenotype,null,2))}</pre></details><details><summary>Reference physical state</summary><pre>${esc(JSON.stringify(person.physicalState,null,2))}</pre></details></section></article>`;
  }).join("");
  const summary={
    mode:request.shadowCalibration?"shadow":"current",
    count:people.length,
    warnings:diagnostics.warnings,
    maxCenterError:population?.maxCenterError??null,
    uniqueShare:population?.uniqueShare??null,
    resemblance:population?.resemblance??null,
  };
  const shadow=request.shadowCalibration;
  const shadowSummary=shadow?{
    baseCalibration:shadow.baseCalibration,
    values:shadow.values,
    variation:shadow.variation,
    rationale:shadow.rationale,
    evidence:shadow.evidence,
  }:null;
  return `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><title>Fibre Population Lab · ${esc(request.referencePopulation)}</title><style>body{font-family:system-ui;margin:0;padding:28px;background:#f5f5f4;color:#18181b}.wrap{max-width:1500px;margin:auto}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-top:16px}.panel,article{background:white;border:1px solid #ddd;border-radius:12px}.panel,article section{padding:14px}h1,h3{margin:0 0 5px}small{color:#71717a}pre{white-space:pre-wrap;font-size:11px}details{font-size:13px;line-height:1.4}</style><div class=wrap><h1>Fibre Population Lab</h1><p>${shadow?"Shadow calibration candidate":"Controlled physical cohort"} · ${esc(request.referencePopulation)} · ${request.count} people · seed ${esc(request.seed)}</p>${shadow?'<div class=panel><h2>Shadow proposal</h2><pre>'+esc(JSON.stringify(shadowSummary,null,2))+'</pre></div>':""}<div class=panel><h2>Physical calibration diagnostics</h2><pre>${esc(JSON.stringify(summary,null,2))}</pre><details><summary>Full diagnostics</summary><pre>${esc(JSON.stringify(diagnostics,null,2))}</pre></details></div><main class=grid>${cards}</main></div>`;
}

export async function runPersistedPhysicalExperiment({request:rawRequest,artifacts,startedAt=new Date().toISOString()}={}){
  if(!artifacts||typeof artifacts.running!=="function")throw new TypeError("Population Lab experiment artifact store is required");
  const request=normalizePhysicalExperimentRequest(rawRequest);
  await artifacts.running(request.experimentId,{startedAt});
  try{
    const evidence=buildPhysicalExperimentEvidence(request);
    const population={
      contract:"fibre-population-lab-population-v0.1",
      meta:{
        experimentId:request.experimentId,
        requestedAt:request.requestedAt,
        count:evidence.people.length,
        places:[request.referencePopulation],
        seed:request.seed,
        images:false,
        physicalCalibration:true,
        source:request.source,
        shadowCalibration:request.shadowCalibration,
      },
      populationContexts:[],
      people:evidence.people,
    };
    const result={
      contract:"fibre-population-lab-result-v0.1",
      meta:population.meta,
      stats:{
        warnings:evidence.diagnostics.warnings,
        physicalCalibration:evidence.diagnostics,
      },
    };
    await artifacts.putPopulation(request.experimentId,population);
    await artifacts.putResult(request.experimentId,result);
    await artifacts.putReport(request.experimentId,renderPhysicalExperimentReport(evidence));
    const summary={
      people:evidence.people.length,
      warnings:evidence.diagnostics.warnings.length,
      images:0,
      referencePopulation:request.referencePopulation,
      shadow:request.shadowCalibration!==null,
      shadowOfExperimentId:request.source?.shadowOfExperimentId??null,
    };
    await artifacts.complete(request.experimentId,summary);
    return Object.freeze({request,summary});
  }catch(error){
    await artifacts.fail(request.experimentId,error).catch(()=>{});
    throw error;
  }
}
