import { execFileSync } from "node:child_process";
import { mkdirSync,writeFileSync } from "node:fs";
import { dirname,resolve } from "node:path";
import { fileURLToPath,pathToFileURL } from "node:url";

import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";
import { placeEpisodeRevisionRef } from "../../services/world-kernel/src/situated-life-evidence.mjs";
import {
  privateGet,publicThreads,requireRuntimeAncestor,topology,validatorGitSha,
} from "./encounter-autonomy-probe.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const SCAN_LIMIT=40;

function runtimeSourceMatches(deployedSha,head){
  if(deployedSha===head)return true;
  try{
    const files=execFileSync("git",["diff","--name-only",deployedSha,head],{
      cwd:ROOT,encoding:"utf8",
    }).trim().split("\n").filter(Boolean);
    return files.every((path)=>path==="AGENTS.md"||path.startsWith("docs/")
      ||path==="tools/validation/world-social-probe.mjs"
      ||path==="tools/validation/encounter-autonomy-probe.mjs");
  }catch{
    return false;
  }
}

function groundedLifeSummary(threadId,person,checkedAt){
  const lived=person.livedNow??{};
  const situation=lived.currentSituation??null;
  const privatePlace=lived.privatelyKnownCurrentPlace??null;
  const bound=(lived.worldPlaces??[]).filter((place)=>place.physicalVenue?.ref);
  const currentRef=situation?.location?.kind==="place"
    ?situation.location.placeRef:null;
  const place=currentRef===null?null:
    bound.find((candidate)=>candidate.ref===currentRef)??null;
  const currentEpisode=currentRef===null?null:
    (lived.placeEpisodes??[]).find((candidate)=>
      placeEpisodeRevisionRef(candidate)===currentRef)??null;
  const description=currentRef===null?null:
    (lived.worldPlaces??[]).find((candidate)=>candidate.ref===currentRef)
    ??currentEpisode;
  const geography=[...new Set((lived.placeEpisodes??[])
    .filter((episode)=>episode.place?.locality&&episode.place?.countryCode)
    .map((episode)=>episode.place.locality+", "+episode.place.countryCode))];
  const availableContexts=(lived.worldPlaces??[]).map((candidate)=>({
    contextPlaceRef:candidate.ref,
    kind:candidate.placeKind,
    description:candidate.displayName,
    attestedVenueRef:candidate.physicalVenue?.ref??null,
    // An admitted historical learning context is not proof of a public venue.
    authority:candidate.authority,
  }));
  const recentPublicVenueVisits=(lived.recentSituations??[])
    .filter(situation=>situation.phase==="at_place"
      &&situation.location?.kind==="place"
      &&bound.some(place=>place.ref===situation.location.placeRef
        &&place.authority==="world-public-place-v1"))
    .map(situation=>({
      situationId:situation.situationId,establishedAt:situation.establishedAt,
      worldPlaceRef:situation.location.placeRef,
    })).slice(0,6);
  const now=Date.parse(checkedAt);
  const futureStops=(lived.currentPersonalPlan?.stops??[])
    .filter((stop)=>stop.presenceMode==="physical"
      &&bound.some((candidate)=>candidate.ref===stop.physicalPlaceRef)
      &&Date.parse(stop.endAt)>now)
    .map((stop)=>({
      venueRef:bound.find((candidate)=>candidate.ref===stop.physicalPlaceRef).physicalVenue.ref,
      startsAt:stop.startAt,endsAt:stop.endAt,
    }));
  return {
    threadId,hasCurrentSituation:situation!==null,
    currentSituationId:situation?.situationId??null,
    currentSituationAt:situation?.establishedAt??null,
    currentPlaceRef:currentRef,
    currentPlaceDescription:description?.displayName??description?.place?.displayName??null,
    currentPlaceKind:currentEpisode?.episodeKind??description?.placeKind??null,
    privatelyLocated:privatePlace!==null,
    preciseResidentialAddressKnown:privatePlace?.streetAddress!==null
      &&privatePlace?.streetAddress!==undefined,
    privateWorldLocality:privatePlace?.locality??null,
    publicLocationGranularity:privatePlace?.publicGranularity??null,
    coarseKnownLocalities:[...new Set([
      ...(privatePlace===null?[]:[privatePlace.locality+", "+privatePlace.countryCode]),
      ...geography,
    ])].slice(0,4),
    availableWorldContexts:availableContexts.slice(0,5),
    currentWakefulness:situation?.wakefulness??"unknown",
    availableLiveWorldPlaceCount:(lived.worldPlaces??[]).length,
    attestedVenueCount:bound.length,
    currentAttestedVenueRef:place?.physicalVenue?.ref??null,
    currentAtAttestedVenue:situation?.phase==="at_place"&&place!==null,
    nextBoundedLifeWake:lived.nextAutonomousBoundary?.dueAt??null,
    futureAttestedVenueStops:futureStops.slice(0,4),
    observedWorldArrivalCount:(person.environmentalOpportunities??[]).length,
    recentPublicVenueVisits,
  };
}

function currentVenue(observatory){
  const situation=observatory?.livedNow?.currentSituation;
  if(situation?.phase!=="at_place"||situation.location?.kind!=="place"
    ||situation.wakefulness==="asleep")return null;
  const place=(observatory.livedNow.worldPlaces??[])
    .find((item)=>item.ref===situation.location.placeRef);
  if(!place?.physicalVenue?.ref)return null;
  return {
    venueRef:place.physicalVenue.ref,
    venueName:place.physicalVenue.displayName,
    situationId:situation.situationId,
    establishedAt:situation.establishedAt,
  };
}

function acceptedStory(observatories,threadId,opportunity){
  const person=observatories.get(threadId);
  const interaction=(person?.socialInteractions??[]).find((item)=>
    item.initiatorThreadId===threadId
    &&item.initiatorSituationId===opportunity.situationId
    &&item.responseDecision==="accept");
  if(!interaction)return null;
  const story=(person.encounterStories??[]).find((item)=>
    item.threadPresence?.some((part)=>
      part.threadId===threadId&&part.situationId===opportunity.situationId)
    &&item.threadPresence?.some((part)=>
      part.threadId===interaction.recipientThreadId
      &&part.situationId===interaction.recipientSituationId));
  if(!story)return null;
  const participants=story.threadPresence.map((part)=>{
    const counterpart=(observatories.get(part.threadId)?.encounterStories??[])
      .find((item)=>item.encounterId===story.encounterId);
    return {
      threadId:part.threadId,
      attention:counterpart?.attention?.outcome??"not_verified",
      experienceId:counterpart?.attention?.experience?.experienceId??null,
    };
  });
  return {
    encounterId:story.encounterId,
    recipientThreadId:interaction.recipientThreadId,
    participants,
    distinctExperienceConfirmed:participants.length>=2
      &&participants.every((part)=>part.attention==="noticed"&&part.experienceId!==null),
  };
}

export async function runWorldSocialProbe({
  targetEnvironment,environment=process.env,
  emit=(entry)=>process.stdout.write(JSON.stringify(entry)+"\n"),
}={}){
  const token=environment.FIBRE_PRIVATE_TOKEN;
  if(typeof token!=="string"||token.trim()===""){
    throw new TypeError("FIBRE_PRIVATE_TOKEN is required");
  }
  const target=normalizeCloudflareEnvironment(targetEnvironment);
  const head=validatorGitSha();
  const config=topology(target);
  const cards=(await publicThreads(config.presentationBaseUrl,config.viewerOrigin))
    .filter((item)=>item?.threadId&&!["genesis_candidate","retired"].includes(item.lifecycleStatus));
  const scan=cards.slice(0,SCAN_LIMIT);
  const observatories=new Map();
  const unavailable=[];
  const failureSamples=[];
  let deployedSha=null;
  for(const card of scan){
    try{
      const response=await privateGet(
        config.worldBaseUrl,
        "/internal/threads/"+encodeURIComponent(card.threadId)+"/observatory",
        token,"Social World Observatory "+card.threadId,
      );
      if(deployedSha===null){
        deployedSha=response.deploymentGitSha??null;
        requireRuntimeAncestor(deployedSha,head);
      }
      if(response.observatory)observatories.set(card.threadId,response.observatory);
      else unavailable.push(card.threadId);
    }catch(error){
      if(deployedSha===null&&/deployed world-kernel|validator checkout/.test(error.message)){
        throw error;
      }
      unavailable.push(card.threadId);
      if(failureSamples.length<3){
        failureSamples.push(String(error?.message??error).slice(0,200));
      }
    }
  }
  if(deployedSha===null){
    throw new Error(
      "World Observatory unreadable for "+unavailable.length+"/"+scan.length+
      " sampled Threads; first failure: "+(failureSamples[0]??"missing Observatory payload"),
    );
  }

  const checkedAt=new Date().toISOString();
  const life=[...observatories].map(([threadId,person])=>
    groundedLifeSummary(threadId,person,checkedAt));
  const attested=life.filter((entry)=>entry.attestedVenueCount>0);
  const present=life.filter((entry)=>entry.currentAtAttestedVenue);
  const awakePresent=present.filter((entry)=>entry.currentWakefulness!=="asleep");
  const planned=life.filter((entry)=>entry.futureAttestedVenueStops.length>0);
  const groups=new Map();
  const opportunities=[];
  for(const [threadId,person] of observatories){
    const venue=currentVenue(person);
    if(venue){
      const group=groups.get(venue.venueRef)??{
        venueRef:venue.venueRef,venueName:venue.venueName,threads:[],
      };
      group.threads.push({threadId,situationId:venue.situationId,establishedAt:venue.establishedAt});
      groups.set(venue.venueRef,group);
    }
    for(const opportunity of person.socialOpportunities??[]){
      opportunities.push({
        threadId,...opportunity,
        ...(opportunity.outcome==="met"
          ?{story:acceptedStory(observatories,threadId,opportunity)}:{}),
      });
    }
  }
  const shared=[...groups.values()]
    .filter((group)=>group.threads.length>=2).slice(0,12);
  opportunities.sort((a,b)=>b.dueAt.localeCompare(a.dueAt));
  const choices=opportunities.filter((entry)=>
    ["background","not_initiated","not_met","met","scene_changed"].includes(entry.outcome));
  const proven=opportunities.find((entry)=>entry.story?.distinctExperienceConfirmed)??null;
  const runtimeMatches=runtimeSourceMatches(deployedSha,head);
  const worldBlocker=observatories.size===0?"observatory_unavailable"
    :attested.length===0?"no_attested_venues_in_sample"
    :present.length===0?"no_current_attested_venue_visits_in_sample"
    :awakePresent.length===0?"all_current_attested_venue_visitors_asleep"
    :shared.length===0?"no_shared_current_attested_venue_in_sample"
    :"shared_venue_without_recorded_decision";
  const status=!runtimeMatches?"deployment_outdated"
    :proven?"shared_encounter_with_distinct_experiences"
    :opportunities.some((entry)=>entry.outcome==="met")?"meeting_reported_story_unverified"
    :choices.length>0?"voluntary_social_choice_observed"
    :opportunities.some((entry)=>entry.outcome==="pending")?"opportunity_pending"
    :shared.length>0?"shared_venue_without_social_decision"
    :"blocked_by_world_state";
  const runId="worldsocial-"+Date.now().toString(36);
  const evidence={
    contract:"fibre-world-social-observation-v0.1",runId,
    checkedAt,environment:target,
    validatorGitSha:head,deployedGitSha:deployedSha,
    runtimeSourceMatches:runtimeMatches,worldBlocker,
    scannedThreadCount:scan.length,availableThreadCount:observatories.size,
    totalDiscoverableThreadCount:cards.length,
    boundedScan:cards.length>scan.length,unavailableThreadIds:unavailable,
    groundedLife:{
      privatelyLocatedThreadCount:life.filter((item)=>item.privatelyLocated).length,
      exactResidentialAddressCount:life.filter((item)=>item.preciseResidentialAddressKnown).length,
      attestedVenueThreadCount:attested.length,
      currentAttestedVenueVisitCount:present.length,
      recentlyVisitedPublicVenueThreadCount:life.filter(entry=>
        entry.recentPublicVenueVisits.length>0).length,
      recentPublicVenueVisits:life.filter(entry=>
        entry.recentPublicVenueVisits.length>0)
        .map(({threadId,recentPublicVenueVisits})=>
          ({threadId,recentPublicVenueVisits})).slice(0,12),
      awakeAttestedVenueVisitCount:awakePresent.length,
      futureAttestedVenuePlanCount:planned.length,
      threadsWithRecordedWorldArrivalCount:life.filter((entry)=>entry.observedWorldArrivalCount>0).length,
      threadsWithScheduledLifeWakeCount:life.filter((entry)=>entry.nextBoundedLifeWake!==null).length,
      withVenues:attested.slice(0,12),withoutVenues:life.filter((entry)=>entry.attestedVenueCount===0).slice(0,12),
      plannedVisits:planned.slice(0,12),
    },
    sharedCurrentVenues:shared,
    socialOpportunities:opportunities.slice(0,40),
    status,
    // A partial directory/Observatory view cannot prove absence across the World.
    evidenceLimitations:"Read-only bounded view; absent or unsampled people and older opportunities may be missing.",
  };
  const evidencePath=resolve(ROOT,".fibre","world-social",target,runId,"evidence.json");
  mkdirSync(dirname(evidencePath),{recursive:true});
  writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+"\n");
  emit({
    event:"world-social-probe-complete",status,worldBlocker,deployedGitSha:deployedSha,
    runtimeSourceMatches:runtimeMatches,
    scannedThreadCount:scan.length,unavailableThreadCount:unavailable.length,
    attestedVenueThreadCount:attested.length,
    currentAttestedVenueVisitCount:present.length,
    recentlyVisitedPublicVenueThreadCount:life.filter(entry=>
      entry.recentPublicVenueVisits.length>0).length,
    futureAttestedVenuePlanCount:planned.length,
    sharedCurrentVenueCount:shared.length,
    recordedOpportunityCount:opportunities.length,
    voluntaryChoiceCount:choices.length,
    distinctExperienceWitness:proven?.story?.encounterId??null,
    evidencePath,
  });
  return Object.freeze({evidence,evidencePath});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    if(process.argv.length!==4||process.argv[2]!=="--env"){
      throw new TypeError("usage: npm run world-social:probe -- --env staging|production");
    }
    await runWorldSocialProbe({targetEnvironment:process.argv[3]});
  }catch(error){
    process.stderr.write(JSON.stringify({
      event:"world-social-probe-failed",
      message:String(error?.message??error).slice(0,500),
    })+"\n");
    process.exitCode=1;
  }
}