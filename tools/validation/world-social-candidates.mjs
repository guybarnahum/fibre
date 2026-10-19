import {execFileSync} from "node:child_process";
import {mkdirSync,writeFileSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";

import {normalizeCloudflareEnvironment} from "../deployment/cloudflare-operator.mjs";
import {privateGet,publicThreads,requireRuntimeAncestor,topology,validatorGitSha}
  from "./encounter-autonomy-probe.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const DEFAULT_LIMIT=64;
const MAX_LIMIT=200;
const DISPLAY_LIMIT=12;

function cityKey(locality,countryCode){
  if(typeof locality!=="string"||!locality.trim()
    ||typeof countryCode!=="string"||!countryCode.trim())return null;
  return countryCode.trim().toUpperCase()+":"+locality.trim().toLocaleLowerCase("en-US");
}

export function currentCity(threadId,person){
  const lived=person?.livedNow;
  const situation=lived?.currentSituation;
  if(situation?.location?.kind!=="place")return null;
  const ref=situation.location.placeRef;
  // Use the actual current World place, never birthPlace, profile,
  // remembered upbringing, or another Thread's location.
  const sources=[
    lived.privatelyKnownCurrentPlace,
    lived.operatorCurrentPlace,
    lived.currentLocation,
  ];
  const location=sources.find(item=>item?.placeRef===ref
    &&cityKey(item.locality,item.countryCode)!==null);
  if(!location)return null;
  return {
    threadId,
    name:person.thread?.identity?.name??null,
    key:cityKey(location.locality,location.countryCode),
    locality:location.locality,countryCode:location.countryCode.toUpperCase(),
    situationRef:situation.situationId,
    placeRef:ref,
    wakefulness:situation.wakefulness??"unknown",
    nextLifeBoundaryAt:lived.nextAutonomousBoundary?.dueAt??null,
    plan:lived.currentPersonalPlan??null,
  };
}

export function rankSocialCityCandidates({places,people,limit=DISPLAY_LIMIT}){
  if(!Number.isSafeInteger(limit)||limit<1)throw new TypeError("candidate limit must be positive");
  const cityMap=new Map();
  const placeByRef=new Map();
  for(const place of places){
    const key=cityKey(place.city,place.countryCode);
    if(!key||typeof place.placeRef!=="string")continue;
    let city=cityMap.get(key);
    if(!city){
      city={key,locality:place.city,countryCode:place.countryCode,
        venues:[],threads:[]};
      cityMap.set(key,city);
    }
    const venue={
      placeRef:place.placeRef,venueRef:place.venueRef??null,
      name:place.name??null,listed:place.discoveryListed===true,
    };
    city.venues.push(venue);
    placeByRef.set(place.placeRef,{key,venue});
  }
  for(const person of people){
    const city=cityMap.get(person.key);
    if(!city)continue;
    const place=placeByRef.get(person.placeRef);
    const currentVenue=place?.key===city.key?place.venue:null;
    const plannedPublicVisits=(person.plan?.stops??[]).flatMap(stop=>{
      const target=placeByRef.get(stop.physicalPlaceRef);
      if(target?.key!==city.key)return [];
      return [{
        placeRef:stop.physicalPlaceRef,
        name:target.venue.name,
        startAt:stop.startAt,endAt:stop.endAt,
      }];
    }).slice(0,3);
    city.threads.push({
      threadId:person.threadId,name:person.name,
      currentSituationRef:person.situationRef,
      wakefulness:person.wakefulness,
      currentAtPublicVenue:currentVenue?.name??null,
      currentPublicVenueRef:currentVenue?.placeRef??null,
      plannedPublicVisits,
      nextLifeBoundaryAt:person.nextLifeBoundaryAt,
    });
  }
  const all=[...cityMap.values()].map(city=>{
    city.venues.sort((a,b)=>Number(b.listed)-Number(a.listed)
      ||(a.name??"").localeCompare(b.name??""));
    city.threads.sort((a,b)=>a.threadId.localeCompare(b.threadId));
    const byVenue=new Map();
    for(const person of city.threads){
      if(person.currentPublicVenueRef===null||person.wakefulness==="asleep")continue;
      const crowd=byVenue.get(person.currentPublicVenueRef)??[];
      crowd.push(person.threadId);
      byVenue.set(person.currentPublicVenueRef,crowd);
    }
    const sharedVenues=[...byVenue.entries()].filter(([,ids])=>ids.length>=2)
      .map(([ref,ids])=>({
        placeRef:ref,name:city.venues.find(v=>v.placeRef===ref)?.name??null,
        threadIds:ids,
      }));
    return {
      locality:city.locality,countryCode:city.countryCode,
      publicVenueCount:city.venues.length,
      listedVenueCount:city.venues.filter(v=>v.listed).length,
      currentThreadCount:city.threads.length,
      awakeThreadCount:city.threads.filter(t=>t.wakefulness!=="asleep").length,
      sharedCurrentPublicVenues:sharedVenues,
      meetingEvidence:sharedVenues.length>0?"actual_shared_public_venue"
        :city.threads.length>=2?"same_city_only":"not_enough_current_threads",
      venues:city.venues.slice(0,8),threads:city.threads.slice(0,12),
    };
  }).sort((a,b)=>b.sharedCurrentPublicVenues.length-a.sharedCurrentPublicVenues.length
    ||Number(b.currentThreadCount>=2)-Number(a.currentThreadCount>=2)
    ||b.listedVenueCount-a.listedVenueCount
    ||b.currentThreadCount-a.currentThreadCount
    ||b.publicVenueCount-a.publicVenueCount
    ||a.locality.localeCompare(b.locality));
  return {
    pairedCities:all.filter(c=>c.currentThreadCount>=2).slice(0,limit),
    otherPopulatedCities:all.filter(c=>c.currentThreadCount===1).slice(0,limit),
    publicVenueCities:all.map(({locality,countryCode,publicVenueCount,listedVenueCount,currentThreadCount})=>({
      locality,countryCode,publicVenueCount,listedVenueCount,currentThreadCount,
    })).slice(0,limit),
    pairedCityCount:all.filter(c=>c.currentThreadCount>=2).length,
    matchedThreadCount:all.reduce((n,c)=>n+c.currentThreadCount,0),
  };
}

export async function runSocialCandidateScan({
  targetEnvironment,sampleLimit=DEFAULT_LIMIT,
  environment=process.env,
  emit=entry=>process.stdout.write(JSON.stringify(entry)+"\n"),
}={}){
  if(!Number.isSafeInteger(sampleLimit)||sampleLimit<1||sampleLimit>MAX_LIMIT){
    throw new TypeError("social candidates --limit must be 1-200");
  }
  const token=environment.FIBRE_PRIVATE_TOKEN;
  if(typeof token!=="string"||!token.trim())throw new TypeError("FIBRE_PRIVATE_TOKEN is required");
  const target=normalizeCloudflareEnvironment(targetEnvironment);
  const head=validatorGitSha();
  const config=topology(target);
  // Existing bounded verified-place overview, not an unbounded geographic search.
  const overview=await privateGet(config.worldBaseUrl,
    "/internal/world-events/overview?hours=1",token,"World public places");
  if(!Array.isArray(overview.places))throw new Error("World public venues unavailable");
  const cards=(await publicThreads(config.presentationBaseUrl,config.viewerOrigin))
    .filter(item=>item?.threadId&&!["genesis_candidate","retired"].includes(item.lifecycleStatus));
  const sample=cards.slice(0,sampleLimit);
  const people=[],unavailable=[];
  let deployedSha=null;
  for(const card of sample){
    try{
      // Cheap current-only life: no Journal, Memory, Encounter Story,
      // birth-profile population lookup or automatic LivedNow ensure.
      const response=await privateGet(config.worldBaseUrl,
        "/internal/threads/"+encodeURIComponent(card.threadId)+"/observatory?view=current",
        token,"Current World life "+card.threadId);
      if(deployedSha===null){
        deployedSha=response.deploymentGitSha??null;
        requireRuntimeAncestor(deployedSha,head);
      }
      const current=currentCity(card.threadId,response.observatory);
      if(current!==null)people.push(current);
    }catch(error){
      unavailable.push({threadId:card.threadId,
        reason:String(error?.message??error).slice(0,120)});
    }
  }
  const ranked=rankSocialCityCandidates({places:overview.places,people});
  const status=ranked.pairedCityCount>0?"candidate_cities_found"
    :ranked.matchedThreadCount>0?"public_city_without_sampled_peer"
      :overview.places.length===0?"no_attested_public_venues"
        :"no_matching_current_city_in_sample";
  const evidence={
    contract:"fibre-social-city-candidates-v0.1",
    environment:target,checkedAt:new Date().toISOString(),
    deployedWorldGitSha:deployedSha,validatorGitSha:head,
    publicPlaceCount:overview.places.length,
    listedPublicPlaceCount:overview.places.filter(p=>p.discoveryListed).length,
    publicPlaceCatalogTruncated:overview.coverage?.placesTruncated===true,
    directoryReturnedThreadCount:cards.length,
    scannedThreadCount:sample.length,unavailable,
    matchedCurrentCityThreadCount:ranked.matchedThreadCount,
    pairedCityCount:ranked.pairedCityCount,
    ...ranked,status,
    evidenceLimitations:"Read-only bounded snapshot of the first sampled public-directory Threads and at most 240 verified places. Current city is grounded in enacted World situation, not birthplace. Same city is not physical co-presence. No visit, consent or meeting is inferred. Missing Threads/venues may be outside the sample.",
  };
  const dir=resolve(ROOT,".fibre","world-social",target,"candidates");
  const file=resolve(dir,"cities-"+Date.now().toString(36)+".json");
  mkdirSync(dirname(file),{recursive:true});
  writeFileSync(file,JSON.stringify(evidence,null,2)+"\n");
  emit({
    event:"world-social-candidates-complete",status,
    deployedWorldGitSha:deployedSha,scannedThreadCount:sample.length,
    unavailableThreadCount:unavailable.length,
    matchedCurrentCityThreadCount:ranked.matchedThreadCount,
    pairedCityCount:ranked.pairedCityCount,
    candidates:ranked.pairedCities,
    otherPopulatedCities:ranked.otherPopulatedCities.slice(0,4),
    publicVenueCities:ranked.publicVenueCities,
    evidencePath:file,
  });
  return {evidence,evidencePath:file};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    let env=null,limit=DEFAULT_LIMIT;
    for(let i=2;i<process.argv.length;i++){
      const arg=process.argv[i];
      if(arg==="--env")env=process.argv[++i];
      else if(arg==="--limit"){
        const raw=process.argv[++i];
        if(!/^[0-9]+$/.test(raw??""))throw new TypeError("--limit must be an integer");
        limit=Number(raw);
      }else throw new TypeError("usage: world-social:candidates -- --env staging [--limit 64]");
    }
    await runSocialCandidateScan({targetEnvironment:env,sampleLimit:limit});
  }catch(error){
    process.stderr.write(JSON.stringify({
      event:"world-social-candidates-failed",
      message:String(error?.message??error).slice(0,400),
    })+"\n");
    process.exitCode=1;
  }
}
