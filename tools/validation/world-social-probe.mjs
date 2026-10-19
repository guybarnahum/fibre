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
    const git=(args)=>execFileSync("git",args,{cwd:ROOT,encoding:"utf8"}).trim();
    const files=git(["diff","--name-only",deployedSha,head]).split("\n").filter(Boolean);
    const offlinePrefixes=[
      "tools/validation/","docs/","apps/admin-dashboard/",
      "infra/deployments/admin-dashboard/","tools/appearance/",
    ];
    if(files.some(path=>path!=="AGENTS.md"&&path!=="package.json"
      &&!offlinePrefixes.some(prefix=>path.startsWith(prefix))))return false;
    if(files.includes("package.json")){
      const earlier=JSON.parse(git(["show",deployedSha+":package.json"]));
      const current=JSON.parse(git(["show",head+":package.json"]));
      delete earlier.scripts;
      delete current.scripts;
      if(JSON.stringify(earlier)!==JSON.stringify(current))return false;
    }
    return true;
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

// Read-only evidentiary join. It deliberately never reports causation from
// temporal proximity alone: the runtime does not yet persist the private
// evidence consumed by each autonomous social initiation judgment.
export function summarizeSocialContinuity(observatories,{limit=24}={}){
  const episodes=[];
  for(const [threadId,person] of observatories){
    for(const story of person.encounterStories??[]){
      const others=(story.threadPresence??[]).map(item=>item.threadId)
        .filter(id=>id!==threadId);
      if(others.length===0)continue;
      const attention=story.attention??null;
      const experience=attention?.outcome==="noticed"
        ?attention.experience??null:null;
      const consolidation=experience===null?null
        :(person.experienceConsolidation?.consolidations??[])
          .find(item=>item.experienceRefs?.includes(experience.experienceId))??null;
      const completion=consolidation?.complete?.payload??null;
      // Both ownership and first-person Experience linkage are mandatory.
      // A completed decision alone is not a recalled Memory.
      const memory=completion?.memoryOutcome==="retained"
        ?(person.memories??[]).find(item=>
          item.threadId===threadId&&item.memoryId===completion.memoryId
          &&item.status==="current"
          &&item.retentionState==="retained"
          &&item.eventRefs?.includes(experience.experienceId)
          &&Date.parse(item.recordedAt)>=Date.parse(story.occurredAt))??null
        :null;
      const later=memory===null?null:(person.socialInteractions??[])
          .filter(item=>item.initiatorThreadId===threadId
            &&others.includes(item.recipientThreadId)
            &&Date.parse(item.occurredAt)>Date.parse(memory.recordedAt))
          .sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt))[0]??null;
      const counterpart=others.map(id=>observatories.get(id)?.encounterStories
        ?.find(item=>item.encounterId===story.encounterId))
        .find(Boolean)??null;
      const bothExperienced=experience!==null
        &&counterpart?.attention?.outcome==="noticed"
        &&counterpart.attention.experience?.experienceId!==undefined;
      episodes.push({
        threadId,encounterRef:story.encounterId,occurredAt:story.occurredAt,
        counterpartThreadIds:others.slice(0,3),
        corroboratedAcrossThreads:counterpart!==null,
        distinctPersonalExperience:bothExperienced
          &&counterpart.attention.experience.experienceId!==experience.experienceId
          &&counterpart.attention.experience.experienceText!==experience.experienceText,
        attention:attention?.outcome??"not_appraised",
        experienceRef:experience?.experienceId??null,
        consolidationRef:consolidation?.consolidationId??null,
        consolidationOutcome:completion?.memoryOutcome
          ??(consolidation===null?null:"pending"),
        retainedMemoryRef:memory?.memoryId??null,
        memoryRecordedAt:memory?.recordedAt??null,
        laterSocialInteractionRef:later?.interactionId??null,
        laterSocialInteractionAt:later?.occurredAt??null,
        // Even a later outgoing request does not show which remembered
        // content, if any, caused the internal decision to make it.
        causalAttribution:"not_observed",
      });
    }
  }
  episodes.sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)
    ||a.threadId.localeCompare(b.threadId));
  return Object.freeze({
    contract:"fibre-social-causal-inspection-v0.1",
    inspectedSharedStoryCount:episodes.length,
    distinctExperiencePairCount:new Set(episodes.filter(item=>item.distinctPersonalExperience)
      .map(item=>item.encounterRef)).size,
    retainedMemoryChainCount:episodes.filter(item=>item.retainedMemoryRef!==null).length,
    laterContactAfterRetentionCount:episodes.filter(item=>item.laterSocialInteractionRef!==null).length,
    causalProof:"not_established_by_observatory",
    evidenceLimitations:"Each Thread Observatory caps recent stories, consolidations, memories and interactions. A missing link can be outside those windows. Later contact is temporal evidence, not proof that a Memory influenced the decision.",
    episodes:episodes.slice(0,limit),
  });
}

export async function runWorldSocialProbe({
  targetEnvironment,threadId=null,environment=process.env,
  emit=(entry)=>process.stdout.write(JSON.stringify(entry)+"\n"),
}={}){
  if(threadId!==null&&!/^thr_[a-zA-Z0-9_-]+$/u.test(threadId)){
    throw new TypeError("social probe needs --thread thr_...");
  }
  const token=environment.FIBRE_PRIVATE_TOKEN;
  if(typeof token!=="string"||token.trim()===""){
    throw new TypeError("FIBRE_PRIVATE_TOKEN is required");
  }
  const target=normalizeCloudflareEnvironment(targetEnvironment);
  const head=validatorGitSha();
  const config=topology(target);
  // An identified Thread needs one World read, not a directory/population scan.
  const cards=threadId===null
    ?(await publicThreads(config.presentationBaseUrl,config.viewerOrigin))
      .filter(item=>item?.threadId&&!["genesis_candidate","retired"].includes(item.lifecycleStatus))
    :[{threadId}];
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
  const causalContinuity=summarizeSocialContinuity(observatories);
  const evidence={
    contract:"fibre-world-social-observation-v0.1",runId,
    checkedAt,environment:target,
    validatorGitSha:head,deployedGitSha:deployedSha,
    runtimeSourceMatches:runtimeMatches,worldBlocker,
    scannedThreadCount:scan.length,availableThreadCount:observatories.size,
    totalDiscoverableThreadCount:threadId===null?cards.length:null,
    targetedThreadId:threadId,
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
    causalContinuity,
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
    retainedMemoryChainCount:causalContinuity.retainedMemoryChainCount,
    laterContactAfterRetentionCount:causalContinuity.laterContactAfterRetentionCount,
    causalProof:causalContinuity.causalProof,
    evidencePath,
  });
  return Object.freeze({evidence,evidencePath});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    let targetEnvironment=null,threadId=null;
    for(let index=2;index<process.argv.length;index++){
      if(process.argv[index]==="--env")targetEnvironment=process.argv[++index];
      else if(process.argv[index]==="--thread")threadId=process.argv[++index];
      else throw new TypeError("unsupported social probe argument");
    }
    if(targetEnvironment===null){
      throw new TypeError("usage: npm run world-social:probe -- --env staging [--thread thr_...]");
    }
    await runWorldSocialProbe({targetEnvironment,threadId});
  }catch(error){
    process.stderr.write(JSON.stringify({
      event:"world-social-probe-failed",
      message:String(error?.message??error).slice(0,500),
    })+"\n");
    process.exitCode=1;
  }
}