// Deliberate, bounded operator waves. Never a background life simulator.
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {pathToFileURL} from "node:url";
import {topology} from "../validation/encounter-autonomy-probe.mjs";

export function selectWorldLifeWave(evidence,{offset=0,limit=3,city=null,countryCode=null,thread=null}={}){
  if(evidence?.contract!=="fibre-social-city-candidates-v0.1"
    ||!Array.isArray(evidence.sampledThreadIds)){
    throw new TypeError("wave requires a current world-social:candidates evidence file");
  }
  if(!Number.isSafeInteger(offset)||offset<0
    ||!Number.isSafeInteger(limit)||limit<1||limit>21){
    throw new TypeError("wave needs nonnegative --offset and --limit 1-21");
  }
  if((city===null)!==(countryCode===null)
    ||(city!==null&&(typeof city!=="string"||city.trim()===""
      ||! /^[A-Z]{2}$/.test(countryCode)))){
    throw new TypeError("city waves require --city and an ISO-2 --country-code together");
  }
  if(thread!==null&&(city!==null||countryCode!==null||offset!==0||limit!==3)){
    throw new TypeError("single-Thread wave must use --thread alone");
  }
  const sampled=new Set(evidence.sampledThreadIds);
  let ids=[...sampled];
  if(thread!==null){
    if(!sampled.has(thread))throw new Error("requested Thread is absent from the sampled population");
    ids=[thread];
  }
  if(city!==null){
    const place=[...(evidence.pairedCities??[]),...(evidence.otherPopulatedCities??[])]
      .find(item=>item.locality?.toLocaleLowerCase("en-US")===city.trim().toLocaleLowerCase("en-US")
        &&item.countryCode===countryCode);
    if(!place)throw new Error("city is absent from the sampled current-World population");
    ids=[...new Set((place.threads??[]).map(t=>t.threadId))];
    if(ids.some(id=>!sampled.has(id)))throw new Error("city contains an unsampled Thread");
  }
  ids.sort();
  if(offset>=ids.length)throw new Error("wave offset is beyond the selected cohort");
  return {total:ids.length,ids:ids.slice(offset,offset+limit)};
}

export function waveResponseFailure(status,payload){
  const diagnostics=payload?.diagnostics??null;
  return {
    httpStatus:status,
    code:payload?.code??payload?.error??"unknown",
    detail:payload?.detail??null,
    ...(diagnostics===null?{}:{diagnostics}),
  };
}

function options(argv){
  const config={env:null,file:null,offset:0,limit:3,city:null,countryCode:null,thread:null,apply:false};
  for(let i=0;i<argv.length;i++){
    const arg=argv[i],value=argv[i+1];
    if(arg==="--env"){config.env=value;i++;}
    else if(arg==="--file"){config.file=value;i++;}
    else if(arg==="--offset"){config.offset=Number(value);i++;}
    else if(arg==="--limit"){config.limit=Number(value);i++;}
    else if(arg==="--city"){config.city=value;i++;}
    else if(arg==="--country-code"){config.countryCode=value?.toUpperCase();i++;}
    else if(arg==="--thread"){config.thread=value;i++;}
    else if(arg==="--apply")config.apply=true;
    else throw new TypeError("usage: world-life:wave -- --env staging --file cities.json [--city Tbilisi --country-code GE | --thread thr_ID] [--offset 0 --limit 3 --apply]");
  }
  if(config.env!=="staging"||!config.file){
    throw new TypeError("population wave requires --env staging and --file");
  }
  return config;
}

async function main(argv){
  const args=options(argv);
  const evidence=JSON.parse(readFileSync(resolve(args.file),"utf8"));
  if(evidence.environment!==args.env)throw new Error("candidate snapshot environment mismatch");
  if(!Number.isFinite(Date.parse(evidence.checkedAt))
    ||Date.now()-Date.parse(evidence.checkedAt)>48*3_600_000){
    throw new Error("candidate snapshot is over 48 hours old; rerun world-social:candidates");
  }
  const wave=selectWorldLifeWave(evidence,args);
  const names=new Map((evidence.lifeContinuity??[])
    .map(person=>[person.threadId,person.name]).filter(([,name])=>name));
  const issuedAt=new Date().toISOString();
  const report={contract:"fibre-world-life-wave-v0.1",
    environment:args.env,sourceCheckedAt:evidence.checkedAt,
    sourceDeployedSha:evidence.deployedWorldGitSha,
    issuedAt,offset:args.offset,limit:args.limit,
    ...(args.city===null?{}:{city:args.city,countryCode:args.countryCode}),
    ...(args.thread===null?{}:{thread:args.thread}),
    total:wave.total,
    dryRun:!args.apply,selectedThreadIds:wave.ids,results:[]};
  const out=resolve(".fibre","world-life",args.env,
    "wave-"+issuedAt.replaceAll(":","-")+".json");
  if(!args.apply){
    process.stdout.write(JSON.stringify({...report,
      note:"Dry run. Use --apply to ensure these Threads once; no meetings or destinations are forced.",
      evidencePath:null},null,2)+"\n");
    return;
  }
  if(typeof process.env.FIBRE_PRIVATE_TOKEN!=="string"||!process.env.FIBRE_PRIVATE_TOKEN){
    throw new Error("FIBRE_PRIVATE_TOKEN is required for --apply");
  }
  const base=topology(args.env).worldBaseUrl;
  const endpoint=new URL("/internal/lived-now/ensure",base);
  const save=()=>{mkdirSync(dirname(out),{recursive:true});
    writeFileSync(out,JSON.stringify(report,null,2)+"\n");};
  for(let i=0;i<wave.ids.length;i++){
    if(i>0)await new Promise(done=>setTimeout(done,1250));
    const threadId=wave.ids[i],started=Date.now();
    const person=names.get(threadId);
    const label=person?`${person} (${threadId})`:threadId;
    // The server returns only when the entire LivedNow operation completes.
    // Indicate elapsed waiting, never manufacture internal planning stages.
    process.stdout.write(JSON.stringify({
      event:"world-life-wave-progress",
      progress:`[${i+1}/${wave.ids.length}] ${label} · waiting for World reconciliation`,
    })+"\n");
    try{
      const response=await fetch(endpoint,{
        method:"POST",
        headers:{"content-type":"application/json",
          "x-fibre-private-token":process.env.FIBRE_PRIVATE_TOKEN},
        body:JSON.stringify({threadId}),
        signal:AbortSignal.timeout(120000),
      });
      const payload=await response.json();
      if(!response.ok||payload?.ok!==true){
        const failure=waveResponseFailure(response.status,payload);
        const error=new Error(`HTTP ${response.status}: ${failure.code}`
          +(failure.detail?` — ${failure.detail}`:""));
        error.failure=failure;
        throw error;
      }
      report.results.push({threadId,status:"ensured",
        situationId:payload.result?.situationId??null,
        establishedAt:payload.result?.establishedAt??null,
        elapsedMs:Date.now()-started});
      process.stdout.write(`[${i+1}/${wave.ids.length}] ${label} · ensured (${((Date.now()-started)/1000).toFixed(1)}s)\n`);
    }catch(error){
      report.results.push({threadId,status:"failed",
        elapsedMs:Date.now()-started,
        error:String(error?.message??error).slice(0,400),
        ...(error?.failure??{})});
      save();
      throw new Error(`wave stopped on ${threadId}: ${error?.message??error}; evidence: ${out}`);
    }
    save();
  }
  process.stdout.write(`Wave complete · ${report.results.length} Threads · ${out}\n`);
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  main(process.argv.slice(2)).catch(error=>{
    process.stderr.write(`World life wave: ${error.message}\n`);
    process.exitCode=1;
  });
}
