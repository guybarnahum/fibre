import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
import {createLocalArtifactInfraDriver} from "#infra/providers/local";
import {createPopulationLabExperimentStore} from "../../services/population-lab/src/experiment-artifacts.mjs";
import {
  expressInheritedAppearance,
  referencePhysicalState,
} from "../../core/src/human-appearance/index.mjs";
import {
  populationGeometryAnchorPrompt,
  populationSurfacePortraitPrompt,
} from "./portrait-prompt.mjs";
import {
  OPENAI_IMAGE_DEFAULT_MODEL,
  createOpenAIImageProvider,
} from "../../integrations/ai/image/openai.mjs";

const arg=(name,fallback)=>process.argv.find(x=>x.startsWith("--"+name+"="))?.slice(name.length+3)??fallback;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const token=()=>{if(!process.env.OPENAI_API_KEY)throw Error("OPENAI_API_KEY is required");return process.env.OPENAI_API_KEY};

async function resilientFetch(url,options){
  let last;
  for(let attempt=1;attempt<=3;attempt++)try{return await fetch(url,options)}catch(error){
    last=error;
    if(attempt<3)await sleep(attempt*1000);
  }
  throw last;
}

function subject({id,role,sex,genome}){
  const projection=expressInheritedAppearance({physicalGenome:genome,sex});
  const physicalState=referencePhysicalState({
    physicalGenome:genome,
    sex,
    stateSeed:`population-lab:${id}`,
  });
  return {
    id,
    role,
    sex,
    genome,
    phenotype:projection.phenotype.traits,
    expressedLatents:projection.phenotype.latent,
    renderDescription:projection.renderDescription,
    geometryDescription:projection.geometryDescription,
    surfaceDescription:projection.surfaceDescription,
    projectionVersion:projection.projectionVersion,
    physicalState,
  };
}

function subjects(experiment,siblingCount,grandchildCount){
  const out=[];
  for(const family of experiment.families){
    out.push(subject({id:`${family.id}-mother`,role:"mother",sex:"female",...family.parents.maternal}));
    out.push(subject({id:`${family.id}-father`,role:"father",sex:"male",...family.parents.paternal}));
    family.children.slice(0,siblingCount).forEach((x,i)=>out.push(subject({
      id:x.id,role:`sibling ${i+1}`,sex:i%2?"male":"female",...x
    })));
  }
  const g=experiment.grandchildren;
  out.push(subject({id:"mixed-grandchild-partner",role:"partner",sex:"male",...g.partner}));
  g.children.slice(0,grandchildCount).forEach((x,i)=>out.push(subject({
    id:x.id,role:`grandchild ${i+1}`,sex:i%2?"male":"female",...x
  })));
  return out;
}

const digestBytes=bytes=>`sha256:${createHash("sha256").update(bytes).digest("hex")}`;

async function render(subject,index,provider,{experimentId,artifacts}){
  const ordinal=String(index+1).padStart(3,"0");
  const geometryPrompt=populationGeometryAnchorPrompt({
    sex:subject.sex,
    geometryDescription:subject.geometryDescription,
    physicalGeometryDescription:subject.physicalState.geometryDescription,
  });
  const geometry=await provider.generate({
    assetKind:"image",
    role:"population_lab_geometry_anchor",
    brief:{description:geometryPrompt,constraints:[]},
    referenceObjects:[],
  });
  const geometryArtifact=await artifacts.putImage(experimentId,{
    ordinal:index+1,
    role:"geometry",
    bytes:geometry.result.bytes,
    mediaType:geometry.result.mediaType??"image/png",
  });
  const geometryAnchor=`image/${ordinal}/geometry`;

  const renderPrompt=populationSurfacePortraitPrompt({
    sex:subject.sex,
    surfaceDescription:subject.surfaceDescription,
    physicalSurfaceDescription:subject.physicalState.surfaceDescription,
  });
  const final=await provider.generate({
    assetKind:"image",
    role:"population_lab_surface_portrait",
    brief:{description:renderPrompt,constraints:[]},
    referenceObjects:[{
      objectRef:`population_lab_geometry_${ordinal}`,
      digest:digestBytes(geometry.result.bytes),
      bytes:geometry.result.bytes,
      metadata:{mediaType:geometry.result.mediaType,kind:"geometry_anchor"},
    }],
  });
  const portraitArtifact=await artifacts.putImage(experimentId,{
    ordinal:index+1,
    role:"portrait",
    bytes:final.result.bytes,
    mediaType:final.result.mediaType??"image/png",
  });
  const image=`image/${ordinal}/portrait`;
  return {
    ...subject,
    image,
    imageObjectRef:portraitArtifact.objectRef,
    geometryAnchor,
    geometryObjectRef:geometryArtifact.objectRef,
    geometryPrompt,
    renderPrompt,
  };
}

function html(subjects,model,projectionVersion){
  const cards=subjects.map(s=>`<article><img src="${esc(s.image)}"><section><h3>${esc(s.id)}</h3><small>${esc(s.role)} · ${esc(s.sex)}</small><details><summary>Inherited phenotype</summary><pre>${esc(JSON.stringify(s.phenotype,null,2))}</pre></details><details><summary>Continuous expression</summary><pre>${esc(JSON.stringify(s.expressedLatents,null,2))}</pre></details></section></article>`).join("");
  return `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><title>Fibre family renderer fidelity</title><style>body{font-family:system-ui;margin:0;padding:28px;background:#f5f5f4;color:#18181b}.wrap{max-width:1500px;margin:auto}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}article{background:white;border:1px solid #ddd;border-radius:12px;overflow:hidden}img{width:100%;aspect-ratio:1;object-fit:cover}section{padding:12px}h1,h3{margin:0 0 5px}small{color:#71717a}pre{white-space:pre-wrap;font-size:11px}</style><div class=wrap><h1>Family renderer fidelity</h1><p>${esc(projectionVersion)} shared production phenotype projection · ${esc(model)} · ancestry and population labels withheld from renderer.</p><main class=grid>${cards}</main></div>`;
}

async function main(){
  const model=arg("image-model",OPENAI_IMAGE_DEFAULT_MODEL),siblings=Number(arg("siblings","4")),grandchildren=Number(arg("grandchildren","4"));
  if(!Number.isInteger(siblings)||siblings<1||siblings>4)throw Error("--siblings must be 1..4");
  if(!Number.isInteger(grandchildren)||grandchildren<1||grandchildren>6)throw Error("--grandchildren must be 1..6");
  const raw=execFileSync(process.execPath,["--disable-warning=ExperimentalWarning","tools/population-lab/family-inheritance-experiment.mjs"],{encoding:"utf8"});
  const source=JSON.parse(raw),selected=subjects(source.experiment,siblings,grandchildren);
  const projectionVersion=selected[0]?.projectionVersion??"unknown";
  const seed=`family-renderer-v3:${projectionVersion}:${siblings}:${grandchildren}`;
  const artifactRoot=resolve(arg("output",resolve(".fibre","population-lab")));
  const experimentId=arg("experiment-id",Date.now()+"-"+createHash("sha256").update(seed).digest("hex").slice(0,8));
  const artifacts=createPopulationLabExperimentStore(createLocalArtifactInfraDriver({root:artifactRoot}));
  const startedAt=new Date().toISOString();
  await artifacts.start(experimentId,{
    contract:"fibre-population-lab-manifest-v0.1",
    experimentId,
    startedAt,
    mode:"family-renderer-fidelity",
    model,
    siblings,
    grandchildren,
    seed,
  });
  const provider=createOpenAIImageProvider({
    apiKey:token(),
    model,
    quality:"low",
    fetchImpl:resilientFetch,
  });
  const rendered=[];
  try{
  for(let i=0;i<selected.length;i++){
    process.stdout.write(`\r[${i+1}/${selected.length}] geometry + surface ${selected[i].id}   `);
    rendered.push(await render(selected[i],i,provider,{experimentId,artifacts}));
  }
  process.stdout.write("\n");
  const result={
    meta:{
      version:"family-renderer-fidelity-v0.6",
      model,
      siblings,
      grandchildren,
      rendererInputs:"geometry-anchor-plus-surface-edit",
      projectionVersion,
    },
    sourceDiagnostics:source.diagnostics,
    people:rendered,
  };
  await artifacts.putPopulation(experimentId,{
    contract:"fibre-population-lab-population-v0.1",
    meta:{...result.meta,experimentId,startedAt},
    people:rendered,
  });
  await artifacts.putResult(experimentId,{
    contract:"fibre-population-lab-result-v0.1",
    meta:{...result.meta,experimentId,startedAt},
    sourceDiagnostics:source.diagnostics,
  });
  await artifacts.putReport(experimentId,html(rendered,model,projectionVersion));
  await artifacts.complete(experimentId,{people:rendered.length,warnings:0,images:rendered.length});
  console.log(`Done · experiment ${experimentId}`);
  }catch(error){
    await artifacts.fail(experimentId,error).catch(()=>{});
    throw error;
  }
}

main().catch(error=>{console.error("family renderer failed:",error.message);process.exitCode=1});
