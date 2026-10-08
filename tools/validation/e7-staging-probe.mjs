import { mkdirSync,writeFileSync } from "node:fs";
import { dirname,resolve } from "node:path";
import { fileURLToPath,pathToFileURL } from "node:url";

import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";
import {
  privateGet,
  publicThreads,
  requireRuntimeAncestor,
  topology,
  validatorGitSha,
} from "./encounter-autonomy-probe.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const SCAN_LIMIT=40;

function parseArgs(args){
  if(args.length!==2||args[0]!=="--env"){
    throw new TypeError("usage: npm run e7:staging:probe -- --env staging");
  }
  const target=normalizeCloudflareEnvironment(args[1]);
  if(target!=="staging")throw new TypeError("E7 natural acceptance probe targets staging only");
  return target;
}

function sourceCandidates(observatory){
  return (observatory.encounterStories??[])
    .filter((story)=>story.worldEnvironmentFollowup?.sourceEncounterRef===story.encounterId)
    .map((story)=>({
      sourceEncounterId:story.encounterId,
      sourceOccurredAt:story.occurredAt,
      followup:story.worldEnvironmentFollowup,
    }));
}

function naturalScenes(observatory,threadId){
  const situation=observatory.livedNow?.currentSituation;
  const ref=situation?.location?.placeRef;
  if(situation?.location?.kind!=="place"||!ref?.startsWith("wpl_"))return [];
  const place=(observatory.livedNow?.worldPlaces??[]).find((item)=>item.ref===ref);
  if(!place?.physicalVenue?.ref)return [];
  return [{
    threadId,
    contextPlaceRef:ref,
    placeRef:place.physicalVenue.ref,
    placeName:place.physicalVenue.displayName,
    establishedAt:situation.establishedAt,
  }];
}

export async function runE7StagingProbe({
  environment=process.env,
  emit=(entry)=>process.stdout.write(`${JSON.stringify(entry)}\n`),
}={}){
  const privateToken=environment.FIBRE_PRIVATE_TOKEN;
  if(typeof privateToken!=="string"||privateToken.trim()===""){
    throw new TypeError("FIBRE_PRIVATE_TOKEN is required");
  }
  const head=validatorGitSha();
  const target="staging";
  const config=topology(target);
  const runId=`e7-${Date.now().toString(36)}`;
  emit({event:"e7-probe-start",runId,environment:target,validatorGitSha:head});

  const cards=(await publicThreads(config.presentationBaseUrl,config.viewerOrigin))
    .filter((card)=>card?.threadId&&!["genesis_candidate","retired"].includes(card.lifecycleStatus))
    .slice(0,SCAN_LIMIT);
  const observatories=new Map();
  let deployedSha=null;
  let unavailable=0;
  for(const card of cards){
    try{
      const response=await privateGet(
        config.worldBaseUrl,
        `/internal/threads/${encodeURIComponent(card.threadId)}/observatory`,
        privateToken,`E7 observatory ${card.threadId}`,
      );
      if(deployedSha===null){
        deployedSha=response.deploymentGitSha??null;
        requireRuntimeAncestor(deployedSha,head);
      }
      if(response.observatory)observatories.set(card.threadId,response.observatory);
      else unavailable+=1;
    }catch(error){
      unavailable+=1;
      if(deployedSha===null&&/deployed world-kernel|validator checkout/.test(error.message)){
        throw error;
      }
    }
  }
  if(deployedSha===null)throw new Error("no readable World Observatory or deployed Git SHA");
  const currentScenes=[];
  const sources=new Map();
  for(const [threadId,observatory] of observatories){
    currentScenes.push(...naturalScenes(observatory,threadId));
    for(const source of sourceCandidates(observatory)){
      sources.set(source.sourceEncounterId,source);
    }
  }

  const history=[...sources.values()]
    .sort((a,b)=>b.sourceOccurredAt.localeCompare(a.sourceOccurredAt))
    .slice(0,12).map((source)=>{
      const followup=source.followup;
      const continuation=followup.continuation;
      const observers=(continuation?.threadPresence??[]).map(({threadId,situationId})=>{
        const story=observatories.get(threadId)?.encounterStories?.find(
          (item)=>item.encounterId===continuation.encounterId,
        );
        return {
          threadId,
          situationId,
          attention:story?.attention?.outcome??"not_verified",
          experienceId:story?.attention?.experience?.experienceId??null,
        };
      });
      return {
        sourceEncounterId:source.sourceEncounterId,
        sourceOccurredAt:source.sourceOccurredAt,
        placeRef:followup.placeRef,
        dueAt:followup.dueAt,
        status:followup.outcome,
        completedAt:followup.completedAt,
        continuationEncounterId:continuation?.encounterId??null,
        continuedFrom:continuation?.story?.continuationOfEncounterRef??null,
        observers,
      };
    });

  const valid=history.filter((item)=>item.status==="changed"
    &&item.continuationEncounterId!==null
    &&item.continuedFrom===item.sourceEncounterId
    &&item.observers.length>0
    &&item.observers.every((observer)=>
      ["noticed","not_noticed"].includes(observer.attention)));
  const contrasting=valid.find((item)=>{
    const outcomes=new Set(item.observers.map((observer)=>observer.attention));
    return item.observers.length>=2&&outcomes.has("noticed")&&outcomes.has("not_noticed");
  })??null;
  const status=deployedSha!==head?"deployment_outdated"
    :contrasting!==null?"contrasting_attention_proven"
      :valid.length>0?"independent_attention_proven"
        :history.some((item)=>item.status==="pending")?"pending_world_followup"
          :history.length>0?"no_lived_continuation_observed"
            :"no_source_in_bounded_scan";

  const evidence={
    contract:"fibre-e7-natural-staging-v0.1",
    runId,
    environment:target,
    validatorGitSha:head,
    deployedGitSha:deployedSha,
    checkedAt:new Date().toISOString(),
    scannedThreadCount:cards.length,
    observedThreadCount:observatories.size,
    unavailableThreadCount:unavailable,
    currentSharedPlaceScenes:currentScenes.slice(0,12),
    sources:history,
    status,
    complete:status==="contrasting_attention_proven",
  };
  const evidencePath=resolve(ROOT,".fibre","e7",target,runId,"evidence.json");
  mkdirSync(dirname(evidencePath),{recursive:true});
  writeFileSync(evidencePath,`${JSON.stringify(evidence,null,2)}\n`);
  emit({
    event:"e7-world-evidence",
    currentSharedPlaceScenes:evidence.currentSharedPlaceScenes,
    sourceCount:sources.size,
    continuationCount:history.filter((item)=>item.continuationEncounterId).length,
    verifiedObserverEventCount:valid.length,
  });
  emit({
    event:"e7-probe-complete",status,complete:evidence.complete,
    deployedGitSha:deployedSha,unavailableThreadCount:unavailable,evidencePath,
  });
  return Object.freeze({evidence,evidencePath});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    parseArgs(process.argv.slice(2));
    await runE7StagingProbe();
  }catch(error){
    process.stderr.write(`${JSON.stringify({
      event:"e7-probe-failed",
      message:String(error?.message??error).slice(0,500),
    })}\n`);
    process.exitCode=1;
  }
}
