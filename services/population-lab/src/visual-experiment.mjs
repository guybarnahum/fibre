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

function reviewDecisionLabel(value){
  if(value==="supports_candidate")return "Supports candidate";
  if(value==="reject")return "Rejected";
  if(value==="inconclusive")return "Inconclusive";
  return null;
}

function sampleReview(review,ordinal){
  return Array.isArray(review?.samples)
    ?review.samples.find(sample=>sample?.ordinal===ordinal)??null
    :null;
}

export function renderPopulationLabVisualReport(plan,{review=null}={}){

  if(!plan||!Array.isArray(plan.samples)||plan.samples.length===0)throw new TypeError("visual experiment plan is required");
  const cards=plan.samples.map(sample=>{
    const ordinal=String(sample.ordinal).padStart(3,"0");
    const geometryDescription=sample.physicalState?.geometryDescription??sample.geometryPrompt;
    const surfaceDescription=sample.physicalState?.surfaceDescription??sample.surfacePrompt;
    return [
      '<article class="sample-card">',
      '<div class="sample-head"><div><span class="sample-kicker">Sample '+sample.ordinal+'</span><h2>'+esc(sample.name)+'</h2><p>'+esc(sample.sex)+' · cohort person '+(sample.personIndex+1)+'</p></div><span class="population-chip">'+esc(sample.referencePopulation)+'</span></div>',
      '<div class="pair">',
      '<figure><div class="image-label"><strong>A</strong><span>Geometry anchor</span></div><img src="image/'+ordinal+'/geometry" alt="'+esc(sample.name)+' geometry anchor"><figcaption><strong>Structure only.</strong> This pass tests inherited facial proportions and shape before surface styling is added.</figcaption></figure>',
      '<figure><div class="image-label"><strong>B</strong><span>Reference-conditioned portrait</span></div><img src="image/'+ordinal+'/portrait" alt="'+esc(sample.name)+' surface portrait"><figcaption><strong>Final rendering.</strong> This pass uses A as its exact visual reference, then adds skin, hair, age and other surface detail.</figcaption></figure>',
      '</div>',
      '<div class="review-hint"><strong>Review A → B</strong><span>Does B remain recognizably the same person, preserve A\'s geometry, and add believable surface detail without reshaping the face?</span></div>',
      (()=>{const scored=sampleReview(review,sample.ordinal);return scored?'<div class="submitted-score"><span>Submitted review</span><strong>Geometry '+scored.geometryFidelity+'/5 · Identity '+scored.identityContinuity+'/5 · Surface '+scored.surfaceRealism+'/5</strong>'+(scored.note?'<p>'+esc(scored.note)+'</p>':'')+'</div>':""})(),
      '<div class="expected"><div><span>Expected geometry</span><p>'+esc(geometryDescription)+'</p></div><div><span>Expected surface</span><p>'+esc(surfaceDescription)+'</p></div></div>',
      '<details><summary>Inherited phenotype data</summary><pre>'+esc(JSON.stringify(sample.phenotype,null,2))+'</pre></details>',
      '<details><summary>Reference physical state</summary><pre>'+esc(JSON.stringify(sample.physicalState,null,2))+'</pre></details>',
      '<details><summary>Generation prompts</summary><div class="prompt"><strong>A · geometry</strong><pre>'+esc(sample.geometryPrompt)+'</pre><strong>B · surface</strong><pre>'+esc(sample.surfacePrompt)+'</pre></div></details>',
      '</article>',
    ].join("");
  }).join("");
  return [
    "<!doctype html><html><head><meta charset=utf-8><meta name=viewport content=\"width=device-width\"><title>Fibre Population Lab · Visual fidelity</title>",
    "<style>",
    ":root{font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;color:#202225;background:#f7f7f5;--surface:#fff;--subtle:#f5f5f2;--border:#deded9;--muted:#6d6f73;--accent:#ea7a24;--accent-soft:#fff1e7}",
    "*{box-sizing:border-box}body{margin:0;background:var(--subtle);color:var(--text,#202225)}.wrap{max-width:1500px;margin:auto;padding:28px}",
    ".hero{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(320px,.8fr);gap:18px;align-items:start;margin-bottom:18px}.hero-copy,.guide{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px}",
    ".eyebrow,.sample-kicker{display:block;color:var(--accent);font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.hero h1{margin:5px 0 8px;font-size:28px;letter-spacing:-.02em}.hero p{margin:0;color:var(--muted);font-size:12px;line-height:1.55}",
    ".guide h2{margin:0 0 10px;font-size:13px}.guide ol{margin:0;padding-left:18px;color:var(--muted);font-size:11px;line-height:1.55}.guide li+li{margin-top:5px}",
    ".rubric{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.rubric div{border:1px solid var(--border);border-radius:9px;padding:9px;background:var(--subtle)}.rubric strong{display:block;font-size:10px}.rubric span{display:block;margin-top:3px;color:var(--muted);font-size:9px;line-height:1.4}",
    ".scale{margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:9px;color:var(--muted);line-height:1.45}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(480px,1fr));gap:14px}",
    ".sample-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:15px;box-shadow:0 6px 22px rgba(20,22,26,.04)}.sample-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.sample-head h2{margin:3px 0 2px;font-size:16px}.sample-head p{margin:0;color:var(--muted);font-size:10px}",
    ".population-chip{padding:4px 7px;border:1px solid var(--border);border-radius:999px;background:var(--subtle);font:9px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted);overflow-wrap:anywhere}.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}figure{margin:0}.image-label{display:flex;align-items:center;gap:7px;margin-bottom:6px}.image-label strong{width:22px;height:22px;display:grid;place-items:center;border-radius:999px;background:var(--accent-soft);color:#8d4313;font-size:10px}.image-label span{font-size:10px;font-weight:750}",
    "img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;border:1px solid var(--border);background:#e7e5e4}figcaption{margin-top:6px;color:var(--muted);font-size:9.5px;line-height:1.45}figcaption strong{color:#45474a}",
    ".review-hint{display:grid;gap:3px;margin-top:10px;padding:9px 10px;border-radius:9px;background:var(--accent-soft);border:1px solid #f2ceb2}.review-hint strong{font-size:10px}.review-hint span{font-size:9.5px;line-height:1.45;color:#6f4a2e}.submitted-score{display:grid;gap:3px;margin-top:8px;padding:9px 10px;border-radius:9px;border:1px solid var(--border);background:var(--subtle)}.submitted-score span{font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}.submitted-score strong{font-size:10px}.submitted-score p{margin:2px 0 0;color:var(--muted);font-size:9px;line-height:1.4}",
    ".expected{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.expected>div{padding:9px;border:1px solid var(--border);border-radius:9px;background:var(--subtle)}.expected span{font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:750}.expected p{margin:5px 0 0;font-size:9.5px;line-height:1.45}",
    "details{margin-top:8px;border-top:1px solid var(--border);padding-top:8px}summary{cursor:pointer;font-size:9.5px;font-weight:700;color:#4d4f52}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:9px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;color:#55585c}.prompt{display:grid;gap:4px;margin-top:8px}.prompt strong{font-size:9px}",
    ".footer{margin:18px 0 4px;text-align:center;color:var(--muted);font-size:9px;line-height:1.5}",
    "@media(max-width:850px){.wrap{padding:14px}.hero{grid-template-columns:1fr}.grid{grid-template-columns:1fr}}@media(max-width:620px){.pair,.expected,.rubric{grid-template-columns:1fr}}",
    "</style></head><body><div class=\"wrap\">",
    '<section class="hero"><div class="hero-copy"><span class="eyebrow">Population Lab · visual fidelity</span><h1>'+esc(plan.referencePopulation)+'</h1><p>'+plan.samples.length+' deterministic A/B samples from a controlled cohort of '+plan.populationCount+'. The report asks whether the renderer preserves inherited physical structure while adding realistic surface detail. It is review evidence, not appearance authority.</p>'+(review?'<div class="submitted-score"><span>Human review · '+esc(reviewDecisionLabel(review.decision)??review.decision)+'</span><strong>Geometry '+review.scores.geometryFidelity+'/5 · Identity '+review.scores.identityContinuity+'/5 · Surface '+review.scores.surfaceRealism+'/5</strong>'+(review.note?'<p>'+esc(review.note)+'</p>':'')+'</div>':'')+'</div>',
    '<aside class="guide"><h2>How to read each A/B pair</h2><ol><li><strong>A · Geometry anchor</strong> isolates structural facial geometry from most surface styling.</li><li><strong>B · Final portrait</strong> is generated using A as its exact reference image.</li><li>Judge the transition, not attractiveness: B should preserve structure and identity while adding believable surface detail.</li></ol><div class="rubric"><div><strong>Geometry fidelity</strong><span>Are facial proportions and structural relationships preserved from A to B?</span></div><div><strong>Identity continuity</strong><span>Does B still look like the same individual rather than a nearby person?</span></div><div><strong>Surface realism</strong><span>Are skin, hair, age and texture believable without overriding geometry?</span></div></div><div class="scale"><strong>Suggested human score:</strong> 1 = material failure · 3 = usable with visible drift · 5 = strong fidelity. Score patterns across all four samples; no single face establishes population calibration correctness.</div></aside></section>',
    '<main class="grid">'+cards+'</main>',
    '<p class="footer">Human visual review complements the numerical cohort. No automated demographic or ethnicity classifier is used, and this report cannot change the approved calibration registry.</p>',
    "</div></body></html>",
  ].join("");
}
