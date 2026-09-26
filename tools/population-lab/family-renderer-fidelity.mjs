import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";

const arg=(name,fallback)=>process.argv.find(x=>x.startsWith("--"+name+"="))?.slice(name.length+3)??fallback;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const token=()=>{if(!process.env.OPENAI_API_KEY)throw Error("OPENAI_API_KEY is required");return process.env.OPENAI_API_KEY};
const phenotype=p=>Object.entries(p).map(([k,v])=>`${k}: ${v}`).join("; ");

async function resilientFetch(url,options){
  let last;
  for(let attempt=1;attempt<=3;attempt++)try{return await fetch(url,options)}catch(error){
    last=error;
    if(attempt<3)await sleep(attempt*1000);
  }
  throw last;
}

function subjects(experiment,siblingCount,grandchildCount){
  const out=[];
  for(const family of experiment.families){
    out.push({id:`${family.id}-mother`,role:"mother",sex:"female",phenotype:family.parents.maternal.phenotype});
    out.push({id:`${family.id}-father`,role:"father",sex:"male",phenotype:family.parents.paternal.phenotype});
    family.children.slice(0,siblingCount).forEach((x,i)=>out.push({
      id:x.id,role:`sibling ${i+1}`,sex:i%2?"male":"female",phenotype:x.phenotype
    }));
  }
  const g=experiment.grandchildren;
  out.push({id:"mixed-grandchild-partner",role:"partner",sex:"male",phenotype:g.partner.phenotype});
  g.children.slice(0,grandchildCount).forEach((x,i)=>out.push({
    id:x.id,role:`grandchild ${i+1}`,sex:i%2?"male":"female",phenotype:x.phenotype
  }));
  return out;
}

async function render(subject,dir,index,model){
  const prompt=`Edge-to-edge realistic neutral documentary head-and-shoulders portrait photograph of one fictional adult age 25. Sex: ${subject.sex}. Inherited phenotype: ${phenotype(subject.phenotype)}. Render exactly this concrete phenotype. Preserve facial geometry, pigmentation, hair, eyes, build cues and ordinary asymmetry. Do not beautify, homogenize, slim, symmetrize, glamourize, or substitute a generic attractive face. Do not infer or add ancestry, race, ethnicity, nationality, culture, personality, class, religion, or behavior. Neutral expression, ordinary skin texture, simple dark top, plain photographic background. NO text, letters, numbers, captions, labels, watermark, logo, border, frame, card, document layout, graphic overlay, or margin.`;
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

function html(subjects,model){
  const cards=subjects.map(s=>`<article><img src="${esc(s.image)}"><section><h3>${esc(s.id)}</h3><small>${esc(s.role)} · ${esc(s.sex)}</small><details><summary>Inherited phenotype</summary><pre>${esc(JSON.stringify(s.phenotype,null,2))}</pre></details></section></article>`).join("");
  return `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><title>Fibre family renderer fidelity</title><style>body{font-family:system-ui;margin:0;padding:28px;background:#f5f5f4;color:#18181b}.wrap{max-width:1500px;margin:auto}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}article{background:white;border:1px solid #ddd;border-radius:12px;overflow:hidden}img{width:100%;aspect-ratio:1;object-fit:cover}section{padding:12px}h1,h3{margin:0 0 5px}small{color:#71717a}pre{white-space:pre-wrap;font-size:11px}</style><div class=wrap><h1>Family renderer fidelity</h1><p>Phenotype-only rendering · ${esc(model)} · ancestry and population labels withheld from renderer.</p><main class=grid>${cards}</main></div>`;
}

async function main(){
  const model=arg("image-model","gpt-image-1"),siblings=Number(arg("siblings","4")),grandchildren=Number(arg("grandchildren","4"));
  if(!Number.isInteger(siblings)||siblings<1||siblings>4)throw Error("--siblings must be 1..4");
  if(!Number.isInteger(grandchildren)||grandchildren<1||grandchildren>6)throw Error("--grandchildren must be 1..6");
  const raw=execFileSync(process.execPath,["--disable-warning=ExperimentalWarning","tools/population-lab/family-inheritance-experiment.mjs"],{encoding:"utf8"});
  const source=JSON.parse(raw),selected=subjects(source.experiment,siblings,grandchildren);
  const seed=`family-renderer-v1:${siblings}:${grandchildren}`;
  const dir=resolve(arg("output",resolve(".fibre","population-lab",Date.now()+"-"+createHash("sha256").update(seed).digest("hex").slice(0,8))));
  await mkdir(dir,{recursive:true});
  const rendered=[];
  for(let i=0;i<selected.length;i++){
    process.stdout.write(`\r[${i+1}/${selected.length}] rendering ${selected[i].id}   `);
    rendered.push(await render(selected[i],dir,i,model));
  }
  process.stdout.write("\n");
  const result={meta:{version:"family-renderer-fidelity-v0.1",model,siblings,grandchildren,rendererInputs:"phenotype-only"},sourceDiagnostics:source.diagnostics,people:rendered};
  await writeFile(resolve(dir,"population.json"),JSON.stringify(result,null,2));
  await writeFile(resolve(dir,"index.html"),html(rendered,model));
  console.log(`Done · ${resolve(dir,"index.html")}`);
}

main().catch(error=>{console.error("family renderer failed:",error.message);process.exitCode=1});
