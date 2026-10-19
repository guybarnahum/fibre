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

export function groundedLifeSummary(threadId,person,checkedAt){
  const lived=person.livedNow??{};
  const situation=lived.currentSituation??null;
  const privatePlace=lived.privatelyKnownCurrentPlace??null;
  const bound=(lived.worldPlaces??[]).filter((place)=>place.physicalVenue?.ref);
  const currentRef=situation?.location?.kind==="place"
    ?situation.location.placeRef:null;
  const place=currentRef===null?null:
    bound.find((candidate)=>candidate.ref===currentRef)??null;
  const currentPublicLocality=situation?.phase==="at_place"
    &&place?.authority==="world-public-place-v1"
    &&place.locality&&place.countryCode
    ?place.locality+", "+place.countryCode:null;
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
    threadId,displayName:person.thread?.identity?.name??null,
    hasCurrentSituation:situation!==null,
    currentSituationId:situation?.situationId??null,
    currentSituationAt:situation?.establishedAt??null,
    currentPlaceRef:currentRef,
    currentPlaceDescription:description?.displayName??description?.place?.displayName??null,
    currentPlaceKind:currentEpisode?.episodeKind??description?.placeKind??null,
    currentPublicLocality,
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
          &&["current","corrected"].includes(item.status)
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

// Operator report is a projection of recorded evidence, never additional
// World truth. No private addresses or long autobiographical text are printed.
export function formatWorldSocialReport(evidence,evidencePath){
  const n=(value)=>Number.isFinite(value)?value:0;
  const short=(value,length=84)=>typeof value==="string"&&value.length>length
    ?value.slice(0,length-1)+"…":value??"unknown";
  const time=(value)=>typeof value==="string"&&Number.isFinite(Date.parse(value))
    ?value.replace("T"," ").replace(/(?:\.\d+)?Z$/u," UTC")
    :"not scheduled";
  const lines=[
    "Fibre · World social observation",
    "Environment: "+evidence.environment+"  |  Checked: "+time(evidence.checkedAt),
    "Scope: "+(evidence.targetedThreadId??"first "+evidence.scannedThreadCount+" directory Threads"),
    "Observatories: "+evidence.availableThreadCount+"/"+evidence.scannedThreadCount+
      " read"+(evidence.unavailableThreadIds.length
        ?" ("+evidence.unavailableThreadIds.length+" unavailable)":""),
    "Runtime: "+short(evidence.deployedGitSha?.slice(0,7)??null)+
      (evidence.runtimeSourceMatches
        ?" · source matches checkout"
        :" · checkout includes later runtime changes; observations are from deployed World"),
    "",
    "CURRENT LIFE",
  ];
  const life=evidence.groundedLife;
  if(evidence.targetedThreadId!==null){
    const person=[...(life.withVenues??[]),...(life.withoutVenues??[])]
      .find(item=>item.threadId===evidence.targetedThreadId);
    if(person){
      const locality=person.currentPublicLocality??person.privateWorldLocality
        ??person.coarseKnownLocalities?.[0]??"locality not established";
      const context=person.currentAtAttestedVenue
        ?short(person.availableWorldContexts?.find(p=>
          p.attestedVenueRef===person.currentAttestedVenueRef)?.description
          ??"verified public venue")
        :person.hasCurrentSituation
          ?person.currentPlaceKind==="formative_presence"
            ?"formative place (not a verified public venue)"
            :person.privatelyLocated
              ?"private place (not a verified public venue)"
              :"not at a verified public venue"
          :"no current situation";
      lines.push("  Thread: "+short(person.displayName??person.threadId),
        "  Wakefulness: "+person.currentWakefulness,
        "  Locality: "+locality,
        "  Current place: "+context,
        "  Next life boundary: "+time(person.nextBoundedLifeWake),
        "  Verified venues in current World context: "+n(person.attestedVenueCount),
        "  Recent public-venue situations: "+n(person.recentPublicVenueVisits?.length)+
          " (bounded history)",
        "  Future public-venue stops in current plan: "+
          n(person.futureAttestedVenueStops?.length));
      for(const visit of (person.recentPublicVenueVisits??[]).slice(0,2)){
        const name=person.availableWorldContexts?.find(p=>
          p.contextPlaceRef===visit.worldPlaceRef)?.description??"verified venue";
        lines.push("  · Visited "+short(name,62)+" · "+time(visit.establishedAt));
      }
    }else lines.push("  No current-life projection in the sampled Observatory.");
  }else{
    lines.push("  Current verified-venue visits: "+n(life.currentAttestedVenueVisitCount),
      "  Recent public-venue visitors: "+n(life.recentlyVisitedPublicVenueThreadCount)+
        " (bounded history)",
      "  Threads with future public-venue stops: "+n(life.futureAttestedVenuePlanCount));
  }
  lines.push("",
    "SOCIAL LIFE",
    "  Shared public venues now: "+(evidence.coPresenceChecked??evidence.targetedThreadId===null
      ?n(evidence.sharedCurrentVenues.length)
      :"not checked (single-Thread inspection)"),
    "  Recorded social opportunities: "+n(evidence.socialOpportunities.length)+
      " (bounded inspection)");
  for(const shared of evidence.sharedCurrentVenues.slice(0,3)){
    lines.push("  · "+short(shared.venueName)+" · "+shared.threads.length+
      " co-present Threads ("+shared.threads.map(p=>p.threadId).join(", ")+")");
  }
  for(const opportunity of evidence.socialOpportunities.slice(0,3)){
    lines.push("  · "+(opportunity.outcome??"pending").replaceAll("_"," ")+
      " · "+opportunity.threadId+
      (opportunity.dueAt?" · "+time(opportunity.dueAt):""));
  }
  const histories=evidence.causalContinuity;
  lines.push("",
    "EXPERIENCE → MEMORY → LATER CHOICE",
    "  Shared stories in inspected history: "+n(histories.inspectedSharedStoryCount),
    "  Stories with distinct personal Experiences: "+n(histories.distinctExperiencePairCount),
    "  Verified retained-Memory chains: "+n(histories.retainedMemoryChainCount),
    "  Later contact after retention: "+n(histories.laterContactAfterRetentionCount));
  for(const episode of histories.episodes.slice(0,2)){
    lines.push("  · "+episode.threadId+" · Story "+short(episode.encounterRef,25)+
      " · attention: "+episode.attention+
      " · retention: "+(episode.consolidationOutcome??"not established")+
      (episode.laterSocialInteractionRef?" · later contact recorded":""));
  }
  lines.push("  Causal influence of Memory on a later decision: NOT ESTABLISHED",
    "",
    "ASSESSMENT");
  const conclusions={
    observatory_unavailable:"No sampled Observatory was available.",
    no_attested_venues_in_sample:
      "No verified public venue appears in the sampled personal World records.",
    no_current_attested_venue_visits_in_sample:
      "No sampled Thread is currently at a verified public venue.",
    all_current_attested_venue_visitors_asleep:
      "All sampled occupants of verified venues are asleep.",
    no_shared_current_attested_venue_in_sample:
      "No two sampled Threads currently share the same verified venue.",
    co_presence_not_scanned:
      "Current co-presence was not checked; only this Thread's own history was inspected.",
    shared_venue_without_recorded_decision:
      "Shared venue presence exists; inspect the bounded social decisions above.",
  };
  lines.push("  "+(evidence.distinctExperienceWitness
    ?"Shared meeting Story with independent personal Experiences recorded."
    :evidence.socialOpportunities.some(o=>o.outcome==="met")
      ?"A meeting outcome is recorded, but its Story was not fully corroborated."
      :evidence.socialOpportunities.length
        ?evidence.socialOpportunities.some(o=>o.outcome==="no_co_presence")
          ?"An earlier social consideration found no eligible peer then; it does not assess later visits."
          :"Social opportunities exist; their outcomes are listed above."
        :conclusions[evidence.worldBlocker]??"No additional social conclusion established."),
    "  Missing evidence in this bounded view does not establish lifetime absence.",
    "",
    "Full evidence: "+evidencePath);
  return lines.join("\n");
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
    :threadId!==null?"co_presence_not_scanned"
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
    coPresenceChecked:threadId===null,
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
    event:"world-social-probe-complete",status,worldBlocker,
    coPresenceChecked:threadId===null,deployedGitSha:deployedSha,
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
    let targetEnvironment=null,threadId=null,json=false;
    for(let index=2;index<process.argv.length;index++){
      if(process.argv[index]==="--env")targetEnvironment=process.argv[++index];
      else if(process.argv[index]==="--thread")threadId=process.argv[++index];
      else if(process.argv[index]==="--json")json=true;
      else throw new TypeError("unsupported social probe argument");
    }
    if(targetEnvironment===null){
      throw new TypeError("usage: npm run world-social:probe -- --env staging [--thread thr_...] [--json]");
    }
    let machineEvent=null;
    const {evidence,evidencePath}=await runWorldSocialProbe({
      targetEnvironment,threadId,
      emit:event=>{machineEvent=event;},
    });
    process.stdout.write((json?JSON.stringify(machineEvent)
      :formatWorldSocialReport(evidence,evidencePath))+"\n");
  }catch(error){
    process.stderr.write(JSON.stringify({
      event:"world-social-probe-failed",
      message:String(error?.message??error).slice(0,500),
    })+"\n");
    process.exitCode=1;
  }
}