import {createHash} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";

import {physicalPhenotypeRenderingProjection} from "../../core/src/human-phenotype/index.mjs";
import {composeModernSubjectIdentity,selectModernNameParts} from "../genesis/modern-birth-material.mjs";
import {
  MODERN_FAMILY_PROFILES_SCHEMA,
  sampleModernFamilyProfile,
  validateModernFamilyProfiles,
} from "../genesis/modern-family-profile.mjs";

const MODEL="gpt-5.1-2025-11-13";
const MORPH=["faceWidth","faceLength","midfaceProminence","jawWidth","chinProjection","eyeSpacing","eyeShape","foreheadProportion","browProminence","noseWidth","noseProjection","lipFullness"];
const T=["pigmentation","eyeColor","hairColor","frecklingTendency","hairTexture","hairDensity","hairlineLossTendency","facialHairTendency","faceWidth","faceLength","midfaceProminence","jawWidth","chinProjection","eyeSpacing","eyeShape","foreheadProportion","browProminence","noseWidth","noseProjection","lipFullness","frame","heightTendency","bodyProportion","adiposityTendency","muscularityTendency","shoulderHipProportion"];
const LATENT=Object.freeze({
  pigmentation:"pigmentation",eyeColor:"eyePigmentation",hairColor:"hairPigmentation",frecklingTendency:"frecklingTendency",
  hairTexture:"hairForm",hairDensity:"hairDensity",hairlineLossTendency:"hairlineLossTendency",facialHairTendency:"facialHairTendency",
  faceWidth:"faceBreadth",faceLength:"faceLength",midfaceProminence:"midfaceProminence",jawWidth:"jawBreadth",chinProjection:"chinProjection",
  eyeSpacing:"eyeSpacing",eyeShape:"eyeShape",foreheadProportion:"foreheadProportion",browProminence:"brow",noseWidth:"noseBreadth",
  noseProjection:"noseProjection",lipFullness:"softTissue",frame:"frame",heightTendency:"height",bodyProportion:"bodyProportion",
  adiposityTendency:"adiposityTendency",muscularityTendency:"muscularityTendency",shoulderHipProportion:"shoulderHipProportion"
});

const arg=(name,fallback=null)=>process.argv.find(value=>value.startsWith("--"+name+"="))?.slice(name.length+3)??fallback;
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const key=value=>String(value??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const token=()=>{if(!process.env.OPENAI_API_KEY)throw Error("OPENAI_API_KEY is required");return process.env.OPENAI_API_KEY};
const elapsed=start=>((Date.now()-start)/1000).toFixed(1)+"s";
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const line=(text,done=false)=>process.stdout.write("\r\x1b[2K"+text+(done?"\n":""));

async function resilientFetch(url,options){
  let last;
  for(let attempt=1;attempt<=3;attempt++)try{return await fetch(url,options)}catch(error){
    last=error;
    if(attempt<3){line(`network retry ${attempt}/2 · ${error.cause?.code??error.message}`);await sleep(attempt*1000)}
  }
  throw last;
}

const populationSchema={type:"object",additionalProperties:false,required:["profiles"],properties:{profiles:MODERN_FAMILY_PROFILES_SCHEMA}};

async function populationContext(place,year,model){
  const request=async extra=>{
    const response=await resilientFetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{Authorization:"Bearer "+token(),"Content-Type":"application/json"},
      body:JSON.stringify({
        model,reasoning:{effort:"low"},
        input:[
          {role:"system",content:[{type:"input_text",text:[
            "Population Lab calibration for Fibre. Author the same bounded family-profile material used by modern Genesis: three to eight weighted coherent household-origin profiles for people born in the requested place and era.",
            "This is an experimental prior, not demographic truth, not a census model and not a diversity quota. Weight ordinary locally common family-origin paths more heavily; include migration, diaspora and mixed-family paths only when plausible.",
            "A profile is a narrow origin/kin/language/naming path, not a whole-person stereotype. familyOriginContext may describe family roots, migration, relatives and household language context. Do not assign a whole profile a class, occupation, politics, diet, hobbies, personality, values or lifestyle. Do not make personal religious belief or observance a consequence of ancestry; mention a naming tradition only when it is genuinely needed for naming coherence.",
            "Each profile owns familyOriginContext, one to three raised/eventual personal languages, naming order, at least twenty-four female given names, twenty-four male given names, twenty-four family names, and separate maternal/paternal physicalAncestry.",
            "Every language array item must be one bare language name. Never pack several languages, alternatives or an explanation into one string.",
            "Naming belongs to family history, never directly to birthplace or physical ancestry. Keep one coherent naming tradition per profile; preserve ordinary common names rather than optimizing for exotic variety.",
            "referencePopulation is only a coarse physical founder prior: afr_west, afr_east, eur_north, eur_south, west_asia, south_asia, east_asia, southeast_asia, indigenous_america, or oceania. Physical ancestry must never imply personality, intelligence, ability, class, religion, values or behavior.",
            "Shares are relative weights, never quotas. Do not curate for representation or coverage.",
            extra
          ].filter(Boolean).join("\n")}]} ,
          {role:"user",content:[{type:"input_text",text:`Create the experimental local family-history prior for ${place} around ${year}.`}]}
        ],
        text:{format:{type:"json_schema",name:"population_context",strict:true,schema:populationSchema}},
        max_output_tokens:7000
      })
    });
    if(!response.ok)throw Error("population context "+response.status+": "+await response.text());
    const json=await response.json();
    const text=json.output?.flatMap(item=>item.content??[]).find(item=>item.type==="output_text")?.text;
    if(!text)throw Error(`model returned no population context (${json.status??"unknown"})`);
    try{
      const parsed=JSON.parse(text);
      validateModernFamilyProfiles(parsed.profiles);
      return parsed;
    }catch(error){
      if(error instanceof SyntaxError)return{parseError:true,status:json.status,reason:json.incomplete_details?.reason??null,text};
      throw error;
    }
  };
  const first=await request("");
  if(!first.parseError)return first;
  const retry=await request("Return concise field values and exactly the requested schema. Keep each familyOriginContext under 220 characters. Do not add prose outside the schema.");
  if(!retry.parseError)return retry;
  throw Error(`population context JSON malformed after retry (${retry.status??"unknown"}${retry.reason?": "+retry.reason:""}; chars ${retry.text.length})`);
}

const sexFor=requestId=>Number.parseInt(createHash("sha256").update(requestId+"\0sex").digest("hex").slice(0,12),16)%2===0?"female":"male";

function generate(place,count,seed,context){
  return Array.from({length:count},(_,index)=>{
    const requestId=`population-lab:${seed}:${place}:${index}`;
    const family=sampleModernFamilyProfile({profiles:context.profiles,requestId});
    const material={...family,birthCity:place};
    const sex=sexFor(requestId);
    const identity=composeModernSubjectIdentity({requestId,material});
    const names=selectModernNameParts({requestId,material});
    const projection=physicalPhenotypeRenderingProjection(identity.physicalGenome,{sex});
    return{
      name:sex==="female"?identity.femaleName:identity.maleName,
      givenName:sex==="female"?names.femaleGivenName:names.maleGivenName,
      familyName:names.familyName,
      nameOrder:family.nameOrder,
      sex,
      birthplace:place,
      populationPlace:place,
      familyProfileId:family.id,
      familyProfileShare:family.share,
      familyOrigin:family.familyOriginContext,
      raisedLanguages:[...identity.raisedLanguages],
      spokenLanguages:[...identity.languages],
      renderDescription:projection.description,
      inheritance:{genome:identity.physicalGenome,phenotype:projection.phenotype},
    };
  });
}

const uniqueNames=people=>new Set(people.map(person=>key(person.name))).size;
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const latentSummary=(people,trait)=>{
  const latent=LATENT[trait];
  const values=people.map(person=>person.inheritance.phenotype.latent[latent]);
  const average=mean(values);
  return{min:Math.min(...values),max:Math.max(...values),mean:average,sd:Math.sqrt(mean(values.map(value=>(value-average)**2)))};
};

function score(people,contexts){
  const maps=Object.fromEntries(["full","given","family","signature"].map(name=>[name,new Map()]));
  for(const person of people){
    const traits=person.inheritance.phenotype.traits;
    for(const [name,value] of [["full",key(person.name)],["given",key(person.givenName)],["family",key(person.familyName)],["signature",T.map(trait=>traits[trait]).join("|")]]){
      maps[name].set(value,(maps[name].get(value)??0)+1);
    }
  }
  const top=(map,n=people.length)=>n?Math.max(0,...map.values())/n:0;
  const summarize=group=>Object.fromEntries(T.map(trait=>{
    const counts=new Map();
    for(const person of group){const value=person.inheritance.phenotype.traits[trait];counts.set(value,(counts.get(value)??0)+1)}
    return[trait,{counts:Object.fromEntries([...counts].sort()),unique:counts.size,topShare:top(counts,group.length),latent:latentSummary(group,trait)}];
  }));
  const domains=summarize(people);
  const collisions=[...maps.full].filter(([,count])=>count>1);
  const phenotypeCollisions=[...maps.signature].filter(([,count])=>count>1);
  const warnings=[];
  if(collisions.length)warnings.push(collisions.length+" full-name collision(s)");
  if(phenotypeCollisions.length)warnings.push(phenotypeCollisions.length+" inherited-phenotype collision(s)");
  if(people.length>=20&&top(maps.given)>.25)warnings.push("given-name concentration >25%");
  if(people.length>=20&&top(maps.family)>.25)warnings.push("surname concentration >25%");

  const groups={},places={};
  for(const person of people){
    (groups[person.familyProfileId]??=[]).push(person);
    (places[person.populationPlace]??=[]).push(person);
  }
  const byFamilyProfile=Object.fromEntries(Object.entries(groups).map(([profileId,group])=>[
    profileId,{count:group.length,uniqueNames:uniqueNames(group),uniquePhenotypes:new Set(group.map(person=>T.map(trait=>person.inheritance.phenotype.traits[trait]).join("|"))).size,domains:summarize(group)}
  ]));
  const byPlace=Object.fromEntries(Object.entries(places).map(([place,group])=>[
    place,{count:group.length,uniqueNames:uniqueNames(group),profiles:new Set(group.map(person=>person.familyProfileId)).size,domains:summarize(group)}
  ]));

  const familyProfileCoverage=Object.fromEntries(contexts.map(context=>{
    const group=places[context.place]??[];
    const total=context.profiles.reduce((sum,profile)=>sum+Number(profile.share),0);
    return[context.place,{count:group.length,profiles:context.profiles.map(profile=>{
      const count=group.filter(person=>person.familyProfileId===profile.id).length;
      return{id:profile.id,count,expectedShare:Number(profile.share)/total,observedShare:group.length?count/group.length:0};
    })}];
  }));

  const samplerProbe=Object.fromEntries(contexts.map(context=>{
    const total=context.profiles.reduce((sum,profile)=>sum+Number(profile.share),0);
    const counts=new Map(context.profiles.map(profile=>[profile.id,0]));
    const n=10_000;
    for(let index=0;index<n;index++){
      const profile=sampleModernFamilyProfile({profiles:context.profiles,requestId:`population-probe:${context.place}:${index}`});
      counts.set(profile.id,counts.get(profile.id)+1);
    }
    const profiles=context.profiles.map(profile=>{
      const expectedShare=Number(profile.share)/total,observedShare=counts.get(profile.id)/n;
      return{id:profile.id,expectedShare,observedShare,error:observedShare-expectedShare};
    });
    const maxAbsoluteError=Math.max(...profiles.map(profile=>Math.abs(profile.error)));
    if(maxAbsoluteError>.03)warnings.push(context.place+" weighted family sampler drift >3%");
    return[context.place,{n,maxAbsoluteError,profiles}];
  }));

  const distribution=(group,trait)=>{
    const counts=new Map();
    for(const person of group){const value=person.inheritance.phenotype.traits[trait];counts.set(value,(counts.get(value)??0)+1)}
    return Object.fromEntries([...counts].map(([value,count])=>[value,count/group.length]));
  };
  const tv=(left,right)=>[...new Set([...Object.keys(left),...Object.keys(right)])].reduce((sum,value)=>sum+Math.abs((left[value]??0)-(right[value]??0)),0)/2;
  const placeEntries=Object.entries(places);
  const populationSeparation={};
  if(placeEntries.length>1)for(const trait of T){
    let max=0;
    for(let i=0;i<placeEntries.length;i++)for(let j=i+1;j<placeEntries.length;j++)max=Math.max(max,tv(distribution(placeEntries[i][1],trait),distribution(placeEntries[j][1],trait)));
    populationSeparation[trait]=max;
  }

  const projectionCompression=MORPH.map(trait=>({trait,topShare:domains[trait].topShare,...domains[trait].latent}))
    .filter(item=>item.topShare>.7&&item.sd>.12);
  const collapsedLatents=MORPH.map(trait=>({trait,...domains[trait].latent})).filter(item=>item.sd<.06);
  for(const item of collapsedLatents)warnings.push(item.trait+" inherited latent collapsed");

  return{
    collisions,
    collisionRate:people.length?collisions.reduce((sum,[,count])=>sum+count,0)/people.length:0,
    phenotypeCollisions,
    givenConcentration:top(maps.given),
    familyConcentration:top(maps.family),
    domains,
    byPlace,
    populationSeparation,
    projectionCompression,
    byFamilyProfile,
    familyProfileCoverage,
    samplerProbe,
    warnings
  };
}

async function image(person,dir,index,model){
  const prompt=`Edge-to-edge realistic neutral documentary head-and-shoulders portrait photograph of one fictional adult age 25. Sex: ${person.sex}. ${person.renderDescription} Render exactly this concrete inherited phenotype. Preserve facial geometry, pigmentation, hair, eyes, build cues and ordinary asymmetry. Do not exaggerate continuous coordinates into caricature; nearby values should produce subtle nearby physical differences. Do not beautify, homogenize, slim, symmetrize, glamourize, or substitute a generic attractive face. Do not infer or add ancestry, race, ethnicity, nationality, culture, personality, class, religion or behavior. Neutral expression, ordinary skin texture, simple dark top, plain photographic background. NO text, letters, numbers, captions, labels, watermark, logo, border, frame, card, document layout, graphic overlay, or margin.`;
  const response=await resilientFetch("https://api.openai.com/v1/images/generations",{
    method:"POST",headers:{Authorization:"Bearer "+token(),"Content-Type":"application/json"},
    body:JSON.stringify({model,prompt,size:"1024x1024",quality:"low",n:1})
  });
  if(!response.ok)throw Error("image "+response.status+": "+await response.text());
  const json=await response.json(),bytes=json.data?.[0]?.b64_json;
  if(!bytes)throw Error("image provider returned no bytes");
  const name=`person-${String(index+1).padStart(3,"0")}.png`;
  await writeFile(resolve(dir,name),Buffer.from(bytes,"base64"));
  return{name,prompt};
}

function report(people,stats,meta){
  const cards=people.map((person,index)=>{
    const payload=esc(JSON.stringify(person,null,2));
    return`<article><div class=pic>${person.image?`<img src="${esc(person.image)}" alt="">`:`<i>${esc(person.name.split(/\s+/).map(part=>part[0]).slice(0,2).join(""))}</i>`}</div><section><div class=title><h3>${esc(person.name)}</h3><button data-copy="person-${index}">Copy</button></div><small>${esc(person.sex)} · ${esc(person.birthplace)}</small><p><b>Family</b> ${esc(person.familyOrigin)}</p><p><b>Languages</b> ${esc(person.raisedLanguages.join(", "))} → ${esc(person.spokenLanguages.join(", "))}</p><details><summary>Inherited phenotype</summary><pre>${esc(JSON.stringify(person.inheritance.phenotype,null,2))}</pre></details>${person.renderPrompt?`<details><summary>Render prompt <button data-copy="prompt-${index}">Copy</button></summary><pre>${esc(person.renderPrompt)}</pre></details>`:""}<textarea hidden id="person-${index}">${payload}</textarea>${person.renderPrompt?`<textarea hidden id="prompt-${index}">${esc(person.renderPrompt)}</textarea>`:""}</section></article>`;
  }).join("");
  const domains=T.map(trait=>`<div><b>${trait}</b><span>${Object.entries(stats.domains[trait].counts).map(([value,count])=>`${value} ${count}`).join(" · ")}</span></div>`).join("");
  const analytics=JSON.stringify(stats,null,2);
  return`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><title>Fibre Population Lab</title><style>body{font-family:system-ui;margin:0;padding:28px;background:#f5f5f4;color:#18181b}.wrap{max-width:1500px;margin:auto}header,.title{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.metrics,.grid,.domains{display:grid;gap:12px}.metrics{grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin:20px 0}.metric,.panel,article{background:white;border:1px solid #ddd;border-radius:12px}.metric,.panel{padding:14px}.metric strong{display:block;font-size:24px}.warn{color:#9a3412}.ok{color:#166534}.domains{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}.domains div{display:flex;justify-content:space-between;font-size:13px}.domains span,small{color:#71717a}.grid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));margin-top:16px}article{overflow:hidden}.pic{aspect-ratio:1;background:#e7e5e4;display:grid;place-items:center;font-size:42px}.pic img{width:100%;height:100%;object-fit:cover}.pic i{font-style:normal;color:#78716c}article section{padding:13px}h1,h3{margin:0}article p,details{font-size:13px;line-height:1.4}button{border:1px solid #d4d4d8;background:#fafafa;border-radius:7px;padding:4px 8px;cursor:pointer}pre{white-space:pre-wrap;font-size:11px}.copyrow{display:flex;justify-content:space-between}@media(max-width:500px){body{padding:14px}.grid{grid-template-columns:1fr}}</style><div class=wrap><header><div><h1>Fibre Population Lab</h1><small>${meta.count} people · ${esc(meta.places.join(" · "))}</small></div><small>${esc(meta.model)} · seed ${esc(meta.seed)} · ${meta.images?"visual":"text-only"}</small></header><div class=metrics><div class=metric><strong>${stats.collisions.length}</strong>full-name collisions</div><div class=metric><strong>${Math.round(stats.givenConcentration*100)}%</strong>top given-name share</div><div class=metric><strong>${Math.round(stats.familyConcentration*100)}%</strong>top surname share</div><div class=metric><strong class=${stats.warnings.length?"warn":"ok"}>${stats.warnings.length}</strong>objective warnings</div></div><div class=panel><div class=copyrow><h2>Automatic diagnostics</h2><button data-copy=analytics>Copy analytics</button></div><p class=${stats.warnings.length?"warn":"ok"}>${esc(stats.warnings.join(" · ")||"No objective collision or latent-collapse warning fired.")}</p><div class=domains>${domains}</div><details><summary>Semantic projection compression</summary><pre>${esc(JSON.stringify(stats.projectionCompression,null,2))}</pre></details><details><summary>Family-profile coverage</summary><pre>${esc(JSON.stringify(stats.familyProfileCoverage,null,2))}</pre></details><details><summary>10k production sampler probe</summary><pre>${esc(JSON.stringify(stats.samplerProbe,null,2))}</pre></details><textarea hidden id=analytics>${esc(analytics)}</textarea></div><main class=grid>${cards}</main></div><script>document.addEventListener("click",async event=>{const button=event.target.closest("[data-copy]");if(!button)return;const source=document.getElementById(button.dataset.copy);if(!source)return;await navigator.clipboard.writeText(source.value);const old=button.textContent;button.textContent="Copied";setTimeout(()=>button.textContent=old,900)})</script>`;
}

async function main(){
  const count=Number(arg("count","24")),year=Number(arg("year",String(new Date().getUTCFullYear())));
  if(!Number.isInteger(count)||count<1||count>200)throw Error("--count must be 1..200");
  if(!Number.isInteger(year)||year<1800||year>2200)throw Error("--year must be 1800..2200");
  const model=arg("model",MODEL),imageModel=arg("image-model","gpt-image-1"),seed=arg("seed","population-v1"),images=process.argv.includes("--images");
  const places=(arg("places")?.split(";").map(value=>value.trim()).filter(Boolean))??[arg("place","United Kingdom/London")];
  const dir=resolve(arg("output",resolve(".fibre","population-lab",Date.now()+"-"+createHash("sha256").update(seed).digest("hex").slice(0,8))));
  const start=Date.now();
  await mkdir(dir,{recursive:true});
  let people=[],contexts=[];
  console.log(`Population Lab · ${count} people · ${places.join(" · ")} · year ${year} · production family/inheritance path`);
  for(let index=0;index<places.length;index++){
    line(`[${people.length}/${count}] authoring ${places[index]} context · ${elapsed(start)}`);
    const context=await populationContext(places[index],year,model);
    contexts.push({place:places[index],year,...context});
    const target=Math.floor(count/places.length)+(index<count%places.length?1:0);
    people.push(...generate(places[index],target,seed,context));
    line(`[${people.length}/${count}] generated locally · ${elapsed(start)}`,index===places.length-1&&!images);
  }
  if(images)for(let index=0;index<people.length;index++){
    line(`[${index}/${people.length}] portraits · ${elapsed(start)}`);
    const visual=await image(people[index],dir,index,imageModel);
    people[index]={...people[index],image:visual.name,renderPrompt:visual.prompt};
  }
  if(images)line(`[${people.length}/${count}] portraits · ${elapsed(start)}`,true);
  console.log("Analyzing population…");
  const stats=score(people,contexts);
  const meta={count:people.length,places,year,model,imageModel,seed,images,productionFamilyPath:true,renderingProjection:"physical-rendering-projection-v0.1"};
  console.log("Writing HTML…");
  await writeFile(resolve(dir,"population.json"),JSON.stringify({meta,populationContexts:contexts,stats,people},null,2));
  await writeFile(resolve(dir,"index.html"),report(people,stats,meta));
  console.log(`Done · ${elapsed(start)} · ${resolve(dir,"index.html")}`);
  console.log("Warnings:",stats.warnings.length);
}

main().catch(error=>{console.error("population-lab failed:",error.message);process.exitCode=1});
