import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {expressPhysicalGenome} from "../../core/src/human-phenotype/index.mjs";

const arg=(name,fallback)=>process.argv.find(x=>x.startsWith("--"+name+"="))?.slice(name.length+3)??fallback;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const token=()=>{if(!process.env.OPENAI_API_KEY)throw Error("OPENAI_API_KEY is required");return process.env.OPENAI_API_KEY};
const phenotype=p=>Object.entries(p).map(([k,v])=>`${k}: ${v}`).join("; ");

const LATENT_MEANING=Object.freeze({
  pigmentation:"-1 lighter, +1 deeper",
  eyePigmentation:"-1 lighter, +1 darker",
  hairPigmentation:"-1 lighter, +1 darker",
  frecklingTendency:"-1 lower, +1 higher",
  hairForm:"-1 straighter, +1 curlier/coiler",
  hairDensity:"-1 sparser, +1 denser",
  hairlineLossTendency:"-1 lower, +1 higher",
  facialHairTendency:"-1 lighter, +1 denser",
  faceBreadth:"-1 narrower, +1 broader",
  faceLength:"-1 shorter, +1 longer",
  midfaceProminence:"-1 softer, +1 more prominent",
  eyeSpacing:"-1 closer, +1 wider",
  eyeShape:"-1 narrower, +1 more open",
  foreheadProportion:"-1 lower, +1 higher",
  brow:"-1 softer, +1 stronger",
  noseBreadth:"-1 narrower, +1 broader",
  noseProjection:"-1 lower, +1 higher",
  softTissue:"-1 thinner, +1 fuller",
  jawBreadth:"-1 narrower, +1 broader",
  chinProjection:"-1 softer, +1 stronger",
  frame:"-1 lighter, +1 broader",
  height:"-1 shorter tendency, +1 taller tendency",
  bodyProportion:"-1 longer torso, +1 longer limbs",
  adiposityTendency:"-1 leaner tendency, +1 higher adiposity tendency",
  muscularityTendency:"-1 lower, +1 stronger",
  shoulderHipProportion:"-1 hip-weighted, +1 shoulder-weighted"
});

const latentText=genome=>Object.entries(expressPhysicalGenome(genome))
  .map(([name,value])=>`${name}: ${Number(value).toFixed(2)} (${LATENT_MEANING[name]})`)
  .join("; ");

async function resilientFetch(url,options){
  let last;
  for(let attempt=1;attempt<=3;attempt++)try{return await fetch(url,options)}catch(error){
    last=error;
    if(attempt<3)await sleep(attempt*1000);
  }
  throw last;
}

function subject({id,role,sex,genome,phenotype}){
  return {id,role,sex,genome,phenotype,expressedLatents:expressPhysicalGenome(genome)};
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

async function render(subject,dir,index,model,projection){
  const continuous=projection==="rich"
    ? ` Continuous inherited coordinates refine the semantic phenotype rather than replacing it. Preserve differences inside the same semantic category: ${latentText(subject.genome)}.`
    : "";
  const prompt=`Edge-to-edge realistic neutral documentary head-and-shoulders portrait photograph of one fictional adult age 25. Sex: ${subject.sex}. Inherited phenotype: ${phenotype(subject.phenotype)}.${continuous} Render exactly this concrete phenotype. Preserve facial geometry, pigmentation, hair, eyes, build cues and ordinary asymmetry. Do not exaggerate continuous coordinates into caricature; nearby values should produce subtle nearby physical differences. Do not beautify, homogenize, slim, symmetrize, glamourize, or substitute a generic attractive face. Do not infer or add ancestry, race, ethnicity, nationality, culture, personality, class, religion, or behavior. Neutral expression, ordinary skin texture, simple dark top, plain photographic background. NO text, letters, numbers, captions, labels, watermark, logo, border, frame, card, document layout, graphic overlay, or margin.`;
  const response=await resilientFetch("https://api.openai.com/v1/images/generations",{
    method:"POST",
    headers:{Authorization:"Bearer "+token(),"Content-Type":"application/json"},
    body:JSON.stringify({model,prompt,size:"1024x1024",quality:"low",n:1})
  });
  if(!response.ok)throw Error(`image ${response.status}: ${await response.text()}`);
  const json=await response.json(),bytes=json.data?.[0]?.b64_json;
  if(!bytes)throw Error("image provider returned no bytes");
  const image=`person-${String(index+1).padStart(3,"0")}.png`;
  await writeFile(resolve(dir,image),Buffer.from(bytes,"base64"));
  return {...subject,image,renderPrompt:prompt};
}

function html(subjects,model,projection){
  const cards=subjects.map(s=>`<article><img src="${esc(s.image)}"><section><h3>${esc(s.id)}</h3><small>${esc(s.role)} · ${esc(s.sex)}</small><details><summary>Inherited phenotype</summary><pre>${esc(JSON.stringify(s.phenotype,null,2))}</pre></details><details><summary>Continuous expression</summary><pre>${esc(JSON.stringify(s.expressedLatents,null,2))}</pre></details></section></article>`).join("");
  return `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><title>Fibre family renderer fidelity</title><style>body{font-family:system-ui;margin:0;padding:28px;background:#f5f5f4;color:#18181b}.wrap{max-width:1500px;margin:auto}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}article{background:white;border:1px solid #ddd;border-radius:12px;overflow:hidden}img{width:100%;aspect-ratio:1;object-fit:cover}section{padding:12px}h1,h3{margin:0 0 5px}small{color:#71717a}pre{white-space:pre-wrap;font-size:11px}</style><div class=wrap><h1>Family renderer fidelity</h1><p>${esc(projection)} phenotype projection · ${esc(model)} · ancestry and population labels withheld from renderer.</p><main class=grid>${cards}</main></div>`;
}

async function main(){
  const model=arg("image-model","gpt-image-1"),siblings=Number(arg("siblings","4")),grandchildren=Number(arg("grandchildren","4")),projection=arg("projection","rich");
  if(!Number.isInteger(siblings)||siblings<1||siblings>4)throw Error("--siblings must be 1..4");
  if(!Number.isInteger(grandchildren)||grandchildren<1||grandchildren>6)throw Error("--grandchildren must be 1..6");
  if(!["semantic","rich"].includes(projection))throw Error("--projection must be semantic or rich");
  const raw=execFileSync(process.execPath,["--disable-warning=ExperimentalWarning","tools/population-lab/family-inheritance-experiment.mjs"],{encoding:"utf8"});
  const source=JSON.parse(raw),selected=subjects(source.experiment,siblings,grandchildren);
  const seed=`family-renderer-v2:${projection}:${siblings}:${grandchildren}`;
  const dir=resolve(arg("output",resolve(".fibre","population-lab",Date.now()+"-"+createHash("sha256").update(seed).digest("hex").slice(0,8))));
  await mkdir(dir,{recursive:true});
  const rendered=[];
  for(let i=0;i<selected.length;i++){
    process.stdout.write(`\r[${i+1}/${selected.length}] rendering ${selected[i].id}   `);
    rendered.push(await render(selected[i],dir,i,model,projection));
  }
  process.stdout.write("\n");
  const result={meta:{version:"family-renderer-fidelity-v0.2",model,siblings,grandchildren,rendererInputs:projection==="rich"?"semantic-phenotype-plus-continuous-expression":"semantic-phenotype"},sourceDiagnostics:source.diagnostics,people:rendered};
  await writeFile(resolve(dir,"population.json"),JSON.stringify(result,null,2));
  await writeFile(resolve(dir,"index.html"),html(rendered,model,projection));
  console.log(`Done · ${resolve(dir,"index.html")}`);
}

main().catch(error=>{console.error("family renderer failed:",error.message);process.exitCode=1});
