import {createHash} from"node:crypto";import{phenotypeFromPhysicalGenome}from"../../core/src/human-phenotype/index.mjs";import{composeModernSubjectIdentity,selectModernNameParts}from"../genesis/modern-birth-material.mjs";import{sampleModernFamilyProfile}from"../genesis/modern-family-profile.mjs";import{mkdir,writeFile}from"node:fs/promises";import{resolve}from"node:path";
const MODEL="gpt-5.1-2025-11-13";
const MORPH=["faceWidth","faceLength","midfaceProminence","jawWidth","chinProjection","eyeSpacing","eyeShape","foreheadProportion","browProminence","noseWidth","noseProjection","lipFullness"];
const T=["pigmentation","eyeColor","hairColor","frecklingTendency","hairTexture","hairDensity","hairlineLossTendency","facialHairTendency","faceWidth","faceLength","midfaceProminence","jawWidth","chinProjection","eyeSpacing","eyeShape","foreheadProportion","browProminence","noseWidth","noseProjection","lipFullness","frame","heightTendency","bodyProportion","adiposityTendency","muscularityTendency","shoulderHipProportion"];
const arg=(n,d=null)=>process.argv.find(x=>x.startsWith("--"+n+"="))?.slice(n.length+3)??d;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const key=s=>String(s??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const token=()=>{if(!process.env.OPENAI_API_KEY)throw Error("OPENAI_API_KEY is required");return process.env.OPENAI_API_KEY};
const elapsed=start=>((Date.now()-start)/1000).toFixed(1)+"s";
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function resilientFetch(url,options){
  let last;
  for(let attempt=1;attempt<=3;attempt++)try{return await fetch(url,options)}catch(error){
    last=error;
    if(attempt<3){line(`network retry ${attempt}/2 · ${error.cause?.code??error.message}`);await sleep(attempt*1000)}
  }
  throw last;
}
const uniqueNames=ps=>new Set(ps.map(p=>key(p.name))).size;
function line(text,done=false){process.stdout.write("\r\x1b[2K"+text+(done?"\n":""))}
function progress(done,total,start,label="generated"){line(`[${String(done).padStart(String(total).length)}/${total}] ${label} · ${elapsed(start)} · names ${uniqueNames(progress.people)}/${progress.people.length} unique`)}
progress.people=[];
const ancestrySchema={type:"array",minItems:1,maxItems:3,items:{type:"object",additionalProperties:false,required:["population","share","referencePopulation"],properties:{population:{type:"string",minLength:1},share:{type:"number",exclusiveMinimum:0},referencePopulation:{type:"string",enum:["afr_west","afr_east","eur_north","eur_south","west_asia","south_asia","east_asia","southeast_asia","indigenous_america","oceania"]}}}};
const languageSchema={type:"array",minItems:1,maxItems:3,items:{type:"string",minLength:1}};
const namesSchema={type:"array",minItems:12,items:{type:"string",minLength:1}};
const physicalAncestrySchema={type:"object",additionalProperties:false,required:["maternal","paternal"],properties:{maternal:ancestrySchema,paternal:ancestrySchema}};
const populationSchema={type:"object",additionalProperties:false,required:["profiles"],properties:{profiles:{type:"array",minItems:3,maxItems:8,items:{type:"object",additionalProperties:false,required:["id","share","familyOriginContext","languages","raisedLanguages","nameOrder","femaleGivenNames","maleGivenNames","familyNames","physicalAncestry"],properties:{id:{type:"string",minLength:1},share:{type:"number",exclusiveMinimum:0},familyOriginContext:{type:"string",minLength:1},languages:languageSchema,raisedLanguages:languageSchema,nameOrder:{type:"string",enum:["given_family","family_given"]},femaleGivenNames:namesSchema,maleGivenNames:namesSchema,familyNames:namesSchema,physicalAncestry:physicalAncestrySchema}}}}};
function admitPopulationContext(context){
  if(new Set(context.profiles.map(profile=>profile.id)).size!==context.profiles.length)throw Error("population context has duplicate family profile ids");
  for(const profile of context.profiles){
    for(const field of["languages","raisedLanguages","femaleGivenNames","maleGivenNames","familyNames"]){
      const values=profile[field].map(value=>key(value));
      if(new Set(values).size!==values.length)throw Error(`population context ${profile.id} has duplicate ${field}`);
    }
    const spoken=new Set(profile.languages.map(value=>key(value)));
    if(profile.raisedLanguages.some(value=>!spoken.has(key(value))))throw Error(`population context ${profile.id} has raised language absent from eventual languages`);
  }
  return context;
}
async function populationContext(place,year,model){
  const request=async extra=>{
    const r=await resilientFetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+token(),"Content-Type":"application/json"},body:JSON.stringify({model,reasoning:{effort:"low"},input:[{role:"system",content:[{type:"input_text",text:"Population Lab calibration for Fibre. Author the same bounded family-profile material used by modern Genesis: three to eight weighted coherent household-origin profiles for people born in the requested place and era. This is an experimental prior, not demographic truth and not a quota system. Each profile owns familyOriginContext, raised/eventual personal languages, naming order, at least twelve female given names, twelve male given names, twelve family names, and separate maternal/paternal physicalAncestry. Naming belongs to family history, never directly to birthplace or physical ancestry. Keep one coherent household-origin path per profile; do not combine unrelated naming traditions merely because they coexist locally. Common local family histories should carry most probability mass; migration, diaspora and mixed-family histories should appear only at plausible frequency. referencePopulation is only a coarse physical founder prior: afr_west, afr_east, eur_north, eur_south, west_asia, south_asia, east_asia, southeast_asia, indigenous_america, or oceania. Physical ancestry must never imply personality, intelligence, ability, class, religion, values or behavior. Shares are relative weights, never quotas. Do not curate for representation or coverage."+extra}]},{role:"user",content:[{type:"input_text",text:`Create the experimental local family-history prior for ${place} around ${year}.`}]}],text:{format:{type:"json_schema",name:"population_context",strict:true,schema:populationSchema}},max_output_tokens:5000})});
    if(!r.ok)throw Error("population context "+r.status+": "+await r.text());
    const j=await r.json(),t=j.output?.flatMap(x=>x.content??[]).find(x=>x.type==="output_text")?.text;
    if(!t)throw Error(`model returned no population context (${j.status??"unknown"})`);
    try{return admitPopulationContext(JSON.parse(t))}catch(error){if(error instanceof SyntaxError)return {parseError:true,status:j.status,reason:j.incomplete_details?.reason??null,text:t};throw error}
  };
  const first=await request("");
  if(!first.parseError)return first;
  const retry=await request(" Return concise field values and exactly the requested schema. Keep each familyOriginContext under 220 characters. Do not add prose outside the schema.");
  if(!retry.parseError)return retry;
  throw Error(`population context JSON malformed after retry (${retry.status??"unknown"}${retry.reason?": "+retry.reason:""}; chars ${retry.text.length})`);
}
const schema={type:"object",additionalProperties:false,required:["people"],properties:{people:{type:"array",items:{type:"object",additionalProperties:false,required:["age25"],properties:{age25:{type:"string",minLength:1}}}}}};
const sexFor=requestId=>Number.parseInt(createHash("sha256").update(requestId+"\0sex").digest("hex").slice(0,12),16)%2===0?"female":"male";
async function generate(place,count,seed,model,context){
const births=Array.from({length:count},(_,i)=>{
  const requestId=`population-lab:${seed}:${i}`;
  const family=sampleModernFamilyProfile({profiles:context.profiles,requestId});
  const material={...family,birthCity:place};
  const sex=sexFor(requestId);
  const identity=composeModernSubjectIdentity({requestId,material});
  const names=selectModernNameParts({requestId,material});
  return{requestId,family,material,sex,identity,names};
});
const brief=births.map((birth,i)=>({person:i+1,sex:birth.sex,familyOriginContext:birth.family.familyOriginContext,raisedLanguages:birth.identity.raisedLanguages,spokenLanguages:birth.identity.languages}));
const r=await resilientFetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+token(),"Content-Type":"application/json"},body:JSON.stringify({model,reasoning:{effort:"none"},input:[{role:"system",content:[{type:"input_text",text:"Population calibration for Fibre. The production family profile, name, languages, sex and inherited physical genome are already fixed. Return only a concise plausible age-25 lived physical state for each person: body composition, hairstyle/grooming, skin condition, acquired scars, clothing and other time-local physical state. Do not invent or alter inherited facial morphology, ancestry, name, language, personality, religion, class, intelligence, ability or behavior. Do not optimize the cohort for diversity or contrast."}]},{role:"user",content:[{type:"input_text",text:`Create age-25 lived physical state for these ${count} fictional people born in ${place}. Keep output order unchanged. Inputs: ${JSON.stringify(brief)}`}]}],text:{format:{type:"json_schema",name:"population_lab_age25",strict:true,schema}}})});
if(!r.ok)throw Error("OpenAI "+r.status+": "+await r.text());
const j=await r.json(),t=j.output?.flatMap(x=>x.content??[]).find(x=>x.type==="output_text")?.text;
if(!t)throw Error(`model returned no age-25 population material (${j.status??"unknown"}${j.incomplete_details?.reason?": "+j.incomplete_details.reason:""})`);
let parsed;try{parsed=JSON.parse(t)}catch{throw Error(`model returned incomplete age-25 population JSON (${j.status??"unknown"}${j.incomplete_details?.reason?": "+j.incomplete_details.reason:""})`)}
if(parsed.people.length!==count)throw Error(`model returned ${parsed.people.length} age-25 records; requested ${count}`);
return births.map((birth,i)=>{
  const phenotype=phenotypeFromPhysicalGenome(birth.identity.physicalGenome,{sex:birth.sex});
  return{
    name:birth.sex==="female"?birth.identity.femaleName:birth.identity.maleName,
    givenName:birth.sex==="female"?birth.names.femaleGivenName:birth.names.maleGivenName,
    familyName:birth.names.familyName,
    nameOrder:birth.family.nameOrder,
    sex:birth.sex,
    birthplace:place,
    populationPlace:place,
    familyProfileId:birth.family.id,
    familyProfileShare:birth.family.share,
    familyOrigin:birth.family.familyOriginContext,
    raisedLanguages:[...birth.identity.raisedLanguages],
    spokenLanguages:[...birth.identity.languages],
    age25:parsed.people[i].age25,
    inheritance:{genome:birth.identity.physicalGenome,phenotype},
  };
});
}
function score(ps,contexts){
  const maps=Object.fromEntries(["full","given","family","signature"].map(x=>[x,new Map()]));
  for(const p of ps){
    const traits=p.inheritance.phenotype.traits;
    for(const[k,v]of[["full",key(p.name)],["given",key(p.givenName)],["family",key(p.familyName)],["signature",T.map(d=>traits[d]).join("|")]])maps[k].set(v,(maps[k].get(v)||0)+1);
  }
  const top=(m,n=ps.length)=>n?Math.max(0,...m.values())/n:0;
  const summarize=people=>Object.fromEntries(T.map(d=>{const m=new Map();for(const p of people){const k=p.inheritance.phenotype.traits[d];m.set(k,(m.get(k)||0)+1)}return[d,{counts:Object.fromEntries([...m].sort()),unique:m.size,topShare:top(m,people.length)}]}));
  const domains=summarize(ps),collisions=[...maps.full].filter(x=>x[1]>1),phenotypeCollisions=[...maps.signature].filter(x=>x[1]>1),warnings=[];
  if(collisions.length)warnings.push(collisions.length+" full-name collision(s)");
  if(phenotypeCollisions.length)warnings.push(phenotypeCollisions.length+" inherited-phenotype collision(s)");
  if(ps.length>=20&&top(maps.given)>.25)warnings.push("given-name concentration >25%");
  if(ps.length>=20&&top(maps.family)>.25)warnings.push("surname concentration >25%");
  for(const[d,x]of Object.entries(domains))if(ps.length>=20&&x.unique===1)warnings.push(d+" collapsed to one inherited value");

  const groups={},places={};
  for(const p of ps){
    (groups[p.familyProfileId]??=[]).push(p);
    (places[p.populationPlace]??=[]).push(p);
  }
  const byFamilyProfile=Object.fromEntries(Object.entries(groups).map(([profileId,people])=>[
    profileId,{count:people.length,uniqueNames:new Set(people.map(p=>key(p.name))).size,uniquePhenotypes:new Set(people.map(p=>T.map(d=>p.inheritance.phenotype.traits[d]).join("|"))).size,domains:summarize(people)}
  ]));
  const byPlace=Object.fromEntries(Object.entries(places).map(([place,people])=>[
    place,{count:people.length,uniqueNames:new Set(people.map(p=>key(p.name))).size,profiles:new Set(people.map(p=>p.familyProfileId)).size,domains:summarize(people)}
  ]));

  const familyProfileCoverage=Object.fromEntries(contexts.map(context=>{
    const people=places[context.place]??[];
    const totalWeight=context.profiles.reduce((n,p)=>n+Number(p.share),0);
    const profiles=context.profiles.map(profile=>{
      const count=people.filter(p=>p.familyProfileId===profile.id).length;
      const expectedShare=Number(profile.share)/totalWeight;
      return{id:profile.id,count,expectedShare,observedShare:people.length?count/people.length:0};
    });
    const substantial=profiles.filter(p=>p.expectedShare>=.1);
    if(people.length>=30&&substantial.length>1&&substantial.filter(p=>p.count>0).length<2)warnings.push(context.place+" family-profile sampling collapsed");
    return[context.place,{count:people.length,profiles}];
  }));

  const distribution=(people,domain)=>{
    const counts=new Map();for(const p of people){const v=p.inheritance.phenotype.traits[domain];counts.set(v,(counts.get(v)||0)+1)}
    return Object.fromEntries([...counts].map(([v,n])=>[v,n/people.length]));
  };
  const tv=(a,b)=>[...new Set([...Object.keys(a),...Object.keys(b)])].reduce((n,k)=>n+Math.abs((a[k]||0)-(b[k]||0)),0)/2;
  const placeEntries=Object.entries(places),populationSeparation={};
  if(placeEntries.length>1)for(const domain of T){
    let max=0;
    for(let i=0;i<placeEntries.length;i++)for(let j=i+1;j<placeEntries.length;j++)max=Math.max(max,tv(distribution(placeEntries[i][1],domain),distribution(placeEntries[j][1],domain)));
    populationSeparation[domain]=max;
  }
  for(const domain of MORPH){
    const x=domains[domain],separation=populationSeparation[domain];
    if(ps.length>=60&&x.topShare>.7&&separation!==undefined&&separation<.2)warnings.push(domain+" midpoint collapse across populations");
  }
  return{
    collisions,
    collisionRate:ps.length?collisions.reduce((n,[,count])=>n+count,0)/ps.length:0,
    phenotypeCollisions,
    givenConcentration:top(maps.given),
    familyConcentration:top(maps.family),
    domains,
    byPlace,
    populationSeparation,
    byFamilyProfile,
    familyProfileCoverage,
    warnings
  };
}
async function image(p,dir,i,model){const prompt=`Edge-to-edge realistic neutral documentary head-and-shoulders portrait photograph of one fictional adult age 25. Sex: ${p.sex}. Inherited phenotype: ${T.map(d=>d+": "+p.inheritance.phenotype.traits[d]).join("; ")}. Inherited body-fat tendency: ${p.inheritance.phenotype.traits.adiposityTendency}. Age-25 physical state: ${p.age25}. Render believable body and facial fullness consistent with both inherited tendency and lived state; do not default to slim. Preserve uncommon morphology and body/build cues. Do not beautify, homogenize, slim, symmetrize, glamourize, or substitute a generic attractive face. Ordinary skin texture, neutral expression, simple dark top, plain photographic background. NO text, letters, numbers, captions, labels, watermark, logo, border, frame, card, document layout, graphic overlay, or margin.`;const r=await resilientFetch("https://api.openai.com/v1/images/generations",{method:"POST",headers:{Authorization:"Bearer "+token(),"Content-Type":"application/json"},body:JSON.stringify({model,prompt,size:"1024x1024",quality:"low",n:1})});if(!r.ok)throw Error("image "+r.status+": "+await r.text());const j=await r.json(),b=j.data?.[0]?.b64_json;if(!b)throw Error("image provider returned no bytes");const name=`person-${String(i+1).padStart(3,"0")}.png`;await writeFile(resolve(dir,name),Buffer.from(b,"base64"));return{name,prompt}}
function report(ps,s,m){const cards=ps.map((p,i)=>{const payload=esc(JSON.stringify(p,null,2));return`<article><div class=pic>${p.image?`<img src="${esc(p.image)}" alt="">`:`<i>${esc(p.name.split(/\s+/).map(x=>x[0]).slice(0,2).join(""))}</i>`}</div><section><div class=title><h3>${esc(p.name)}</h3><button data-copy="person-${i}">Copy</button></div><small>${esc(p.sex)} · ${esc(p.birthplace)}</small><p><b>Family</b> ${esc(p.familyOrigin)}</p>${p.inheritance?`<details><summary>Shared inheritance</summary><pre>${esc(JSON.stringify(p.inheritance,null,2))}</pre></details>`:""}<p><b>Languages</b> ${esc(p.raisedLanguages.join(", "))} → ${esc(p.spokenLanguages.join(", "))}</p><details><summary>Inherited phenotype</summary><dl>${T.map(d=>`<dt>${d}</dt><dd>${esc(p.inheritance.phenotype.traits[d])}</dd>`).join("")}<dt>age25</dt><dd>${esc(p.age25)}</dd></dl></details>${p.renderPrompt?`<details><summary>Render prompt <button data-copy="prompt-${i}">Copy</button></summary><pre>${esc(p.renderPrompt)}</pre></details>`:""}<textarea hidden id="person-${i}">${payload}</textarea>${p.renderPrompt?`<textarea hidden id="prompt-${i}">${esc(p.renderPrompt)}</textarea>`:""}</section></article>`}).join(""),ds=T.map(d=>`<div><b>${d}</b><span>${Object.entries(s.domains[d].counts).map(([k,n])=>`${k} ${n}`).join(" · ")}</span></div>`).join(""),summary=JSON.stringify(s,null,2);return`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><title>Fibre Population Lab</title><style>body{font-family:system-ui;margin:0;padding:28px;background:#f5f5f4;color:#18181b}.wrap{max-width:1500px;margin:auto}header,.title{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.metrics,.grid,.domains{display:grid;gap:12px}.metrics{grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin:20px 0}.metric,.panel,article{background:white;border:1px solid #ddd;border-radius:12px}.metric,.panel{padding:14px}.metric strong{display:block;font-size:24px}.warn{color:#9a3412}.ok{color:#166534}.domains{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}.domains div{display:flex;justify-content:space-between;font-size:13px}.domains span,small{color:#71717a}.grid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));margin-top:16px}article{overflow:hidden}.pic{aspect-ratio:1;background:#e7e5e4;display:grid;place-items:center;font-size:42px}.pic img{width:100%;height:100%;object-fit:cover}.pic i{font-style:normal;color:#78716c}article section{padding:13px}h1,h3{margin:0}article p,details{font-size:13px;line-height:1.4}dl{display:grid;grid-template-columns:65px 1fr;gap:4px 8px}dd{margin:0;color:#52525b}button{border:1px solid #d4d4d8;background:#fafafa;border-radius:7px;padding:4px 8px;cursor:pointer}pre{white-space:pre-wrap;font-size:11px}.copyrow{display:flex;justify-content:space-between}@media(max-width:500px){body{padding:14px}.grid{grid-template-columns:1fr}}</style><div class=wrap><header><div><h1>Fibre Population Lab</h1><small>${m.count} people · ${esc(m.places.join(" · "))}</small></div><small>${esc(m.model)} · seed ${esc(m.seed)} · ${m.images?"visual":"text-only"}</small></header><div class=metrics><div class=metric><strong>${s.collisions.length}</strong>full-name collisions</div><div class=metric><strong>${Math.round(s.givenConcentration*100)}%</strong>top given-name share</div><div class=metric><strong>${Math.round(s.familyConcentration*100)}%</strong>top surname share</div><div class=metric><strong class=${s.warnings.length?"warn":"ok"}>${s.warnings.length}</strong>collapse warnings</div></div><div class=panel><div class=copyrow><h2>Automatic diagnostics</h2><button data-copy=analytics>Copy analytics</button></div><p class=${s.warnings.length?"warn":"ok"}>${esc(s.warnings.join(" · ")||"No objective collision/concentration warning fired.")}</p><div class=domains>${ds}</div><details><summary>Family-profile diagnostics</summary><pre>${esc(JSON.stringify(s.byFamilyProfile,null,2))}</pre></details><details><summary>Family-profile coverage</summary><pre>${esc(JSON.stringify(s.familyProfileCoverage,null,2))}</pre></details><textarea hidden id=analytics>${esc(summary)}</textarea></div><main class=grid>${cards}</main></div><script>document.addEventListener("click",async e=>{let b=e.target.closest("[data-copy]");if(!b)return;let x=document.getElementById(b.dataset.copy);if(!x)return;await navigator.clipboard.writeText(x.value);let old=b.textContent;b.textContent="Copied";setTimeout(()=>b.textContent=old,900)})</script>`}
async function main(){const count=Number(arg("count","24")),batch=Number(arg("batch","1")),year=Number(arg("year",String(new Date().getUTCFullYear())));if(!Number.isInteger(count)||count<1||count>200)throw Error("--count must be 1..200");if(!Number.isInteger(batch)||batch<1||batch>20)throw Error("--batch must be 1..20");if(!Number.isInteger(year)||year<1800||year>2200)throw Error("--year must be 1800..2200");const model=arg("model",MODEL),imageModel=arg("image-model","gpt-image-1"),seed=arg("seed","population-v1"),images=process.argv.includes("--images"),places=(arg("places")?.split(";").map(x=>x.trim()).filter(Boolean))??[arg("place","United Kingdom/London")],dir=resolve(arg("output",resolve(".fibre","population-lab",Date.now()+"-"+createHash("sha256").update(seed).digest("hex").slice(0,8)))),start=Date.now();await mkdir(dir,{recursive:true});let ps=[],contexts=[];console.log(`Population Lab · ${count} people · ${places.join(" · ")} · year ${year} · batches of ${batch}`);line(`[0/${count}] starting`);for(let i=0;i<places.length;i++){const context=await populationContext(places[i],year,model);contexts.push({place:places[i],year,...context});const target=Math.floor(count/places.length)+(i<count%places.length?1:0);for(let offset=0;offset<target;offset+=batch){const n=Math.min(batch,target-offset),made=await generate(places[i],n,`${seed}:${places[i]}:${offset}`,model,context);ps.push(...made);progress.people=ps;progress(ps.length,count,start)}}if(images)for(let i=0;i<ps.length;i++){line(`[${i}/${ps.length}] portraits · ${elapsed(start)}`);const v=await image(ps[i],dir,i,imageModel);ps[i]={...ps[i],image:v.name,renderPrompt:v.prompt}}line(`[${ps.length}/${count}] generated · ${elapsed(start)}`,true);console.log("Analyzing population…");const s=score(ps,contexts),m={count:ps.length,places,year,model,imageModel,seed,images,batch,productionFamilyPath:true};console.log("Writing HTML…");await writeFile(resolve(dir,"population.json"),JSON.stringify({meta:m,populationContexts:contexts,stats:s,people:ps},null,2));await writeFile(resolve(dir,"index.html"),report(ps,s,m));console.log(`Done · ${elapsed(start)} · ${resolve(dir,"index.html")}`);console.log("Warnings:",s.warnings.length)}
main().catch(e=>{console.error("population-lab failed:",e.message);process.exitCode=1});
