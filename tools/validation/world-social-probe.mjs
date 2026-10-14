import { mkdirSync,writeFileSync } from "node:fs";
import { dirname,resolve } from "node:path";
import { fileURLToPath,pathToFileURL } from "node:url";

import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";
import {
  privateGet,publicThreads,requireRuntimeAncestor,topology,validatorGitSha,
} from "./encounter-autonomy-probe.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const SCAN_LIMIT=40;

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
    }
  }
  if(deployedSha===null)throw new Error("No readable World Observatory or deployed Git SHA");

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
  const status=deployedSha!==head?"deployment_outdated"
    :proven?"shared_encounter_with_distinct_experiences"
    :opportunities.some((entry)=>entry.outcome==="met")?"meeting_reported_story_unverified"
    :choices.length>0?"voluntary_social_choice_observed"
    :opportunities.some((entry)=>entry.outcome==="pending")?"opportunity_pending"
    :shared.length>0?"shared_venue_without_social_decision"
    :"blocked_by_world_state";
  const runId="worldsocial-"+Date.now().toString(36);
  const evidence={
    contract:"fibre-world-social-observation-v0.1",runId,
    checkedAt:new Date().toISOString(),environment:target,
    validatorGitSha:head,deployedGitSha:deployedSha,
    scannedThreadCount:scan.length,availableThreadCount:observatories.size,
    totalDiscoverableThreadCount:cards.length,
    boundedScan:cards.length>scan.length,unavailableThreadIds:unavailable,
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
    event:"world-social-probe-complete",status,deployedGitSha:deployedSha,
    scannedThreadCount:scan.length,unavailableThreadCount:unavailable.length,
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