import { mkdirSync,writeFileSync } from "node:fs";
import { dirname,resolve } from "node:path";
import { fileURLToPath,pathToFileURL } from "node:url";

import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";
import {
  privateGet,requireRuntimeAncestor,topology,validatorGitSha,
} from "./encounter-autonomy-probe.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));

function argsFrom(argv){
  let environment=null,threadId=null;
  for(let i=0;i<argv.length;i++){
    if(argv[i]==="--env")environment=argv[++i];
    else if(argv[i]==="--thread")threadId=argv[++i];
    else throw new TypeError("usage: npm run thread-journey:probe -- --env staging --thread thr_...");
  }
  if(typeof threadId!=="string"||!/^thr_[a-zA-Z0-9_-]+$/u.test(threadId)){
    throw new TypeError("journey probe needs --thread thr_...");
  }
  return {environment:normalizeCloudflareEnvironment(environment),threadId};
}

function inPeriod(value,start,end){
  const t=Date.parse(value??""),a=Date.parse(start??""),b=Date.parse(end??"");
  return Number.isFinite(t)&&Number.isFinite(a)&&Number.isFinite(b)&&t>=a&&t<=b;
}

// An intention is not a visit. Only World-enacted CurrentSituations count as
// departure, transit or arrival, and each must cite that personal Flight Plan.
export function inspectThreadJourneys(observatory){
  const life=observatory?.livedNow??{};
  const plans=[life.currentPersonalPlan,...(life.recentPersonalPlans??[])]
    .filter(plan=>plan?.planId&&Array.isArray(plan.stops)
      &&(plan.kind===undefined||plan.kind==="personal"));
  const distinct=[...new Map(plans.map(plan=>[plan.planId,plan])).values()];
  const situations=life.recentSituations??[];
  const worldPlaces=life.worldPlaces??[];
  const journeys=[];
  for(const plan of distinct){
    for(let i=1;i<plan.stops.length;i++){
      const from=plan.stops[i-1],to=plan.stops[i];
      if(from.physicalPlaceRef===to.physicalPlaceRef)continue;
      const scenes=situations.filter(situation=>
        (situation.sourcePlanRefs??[]).includes(plan.planId)
        &&situation.resolution?.governingPlanRef===plan.planId);
      const departure=scenes.find(situation=>
        situation.location?.kind==="place"
        &&situation.location.placeRef===from.physicalPlaceRef
        &&inPeriod(situation.establishedAt,from.startAt,from.endAt));
      const transit=scenes.find(situation=>
        situation.location?.kind==="transit"
        &&situation.location.fromPlaceRef===from.physicalPlaceRef
        &&situation.location.toPlaceRef===to.physicalPlaceRef
        &&inPeriod(situation.establishedAt,from.endAt,to.startAt));
      const arrival=scenes.find(situation=>
        situation.location?.kind==="place"
        &&situation.location.placeRef===to.physicalPlaceRef
        &&inPeriod(situation.establishedAt,to.startAt,to.endAt));
      const stage=arrival&&transit&&departure?"journey_enacted"
        :arrival?"arrival_observed"
        :transit?"transit_observed"
        :departure?"departure_observed"
        :"planned_only";
      const place=worldPlaces.find(value=>value.ref===to.physicalPlaceRef)??null;
      journeys.push({
        planId:plan.planId,
        authoredAt:plan.authoredAt,
        ownerKind:plan.owner?.kind??"unknown",
        modelProvider:plan.cognition?.provider??null,
        fromPlaceRef:from.physicalPlaceRef,
        toPlaceRef:to.physicalPlaceRef,
        destination:place===null?null:{
          name:place.displayName??null,
          authority:place.authority??null,
          locality:place.locality??null,
          country:place.country??null,
        },
        plannedDepartureAt:from.endAt,
        plannedArrivalAt:to.startAt,
        enactedDepartureAt:departure?.establishedAt??null,
        enactedTransitAt:transit?.establishedAt??null,
        enactedArrivalAt:arrival?.establishedAt??null,
        stage,
      });
    }
  }
  return journeys.sort((a,b)=>b.authoredAt.localeCompare(a.authoredAt)).slice(0,12);
}

export async function runThreadJourneyProbe({
  targetEnvironment,threadId,environment=process.env,
  emit=record=>process.stdout.write(JSON.stringify(record)+"\n"),
}={}){
  const token=environment.FIBRE_PRIVATE_TOKEN;
  if(typeof token!=="string"||token.trim()===""){
    throw new TypeError("FIBRE_PRIVATE_TOKEN is required");
  }
  const target=normalizeCloudflareEnvironment(targetEnvironment);
  const head=validatorGitSha();
  const location=topology(target).worldBaseUrl;
  const response=await privateGet(location,
    `/internal/threads/${encodeURIComponent(threadId)}/observatory?view=full`,
    token,"Thread journey observatory");
  const deployedSha=response.deploymentGitSha;
  requireRuntimeAncestor(deployedSha,head);
  if(!response.observatory)throw new Error("Thread is not observable");
  const life=response.observatory.livedNow;
  const journeys=inspectThreadJourneys(response.observatory);
  const evidence={
    contract:"fibre-thread-journey-probe-v0.1",
    environment:target,threadId,
    checkedAt:new Date().toISOString(),
    validatorGitSha:head,deployedGitSha:deployedSha,
    deployedMatchesCheckout:deployedSha===head,
    currentSituation:life.currentSituation===null?null:{
      situationId:life.currentSituation.situationId,
      establishedAt:life.currentSituation.establishedAt,
      phase:life.currentSituation.phase,
      location:life.currentSituation.location,
    },
    nextAutonomousBoundary:life.nextAutonomousBoundary??null,
    recentJourneyCount:journeys.length,
    journeys,
    // The Observatory cannot prove no one called ensure. Do not upgrade an
    // observed sequence to a claim of independent scheduler causation.
    status:deployedSha!==head?"deployment_outdated"
      :journeys.some(j=>j.stage==="journey_enacted")?"journey_enacted"
        :journeys.some(j=>j.stage==="arrival_observed")?"arrival_observed"
          :journeys.some(j=>j.stage==="transit_observed")?"transit_observed"
            :journeys.length?"journey_planned":"no_recent_journey",
  };
  const folder=resolve(ROOT,".fibre","journeys",target,threadId);
  const file=resolve(folder,`journey-${new Date().toISOString().replace(/[:.]/gu,"-")}.json`);
  mkdirSync(dirname(file),{recursive:true});
  writeFileSync(file,JSON.stringify(evidence,null,2)+"\n");
  emit({event:"thread-journey-probe",status:evidence.status,
    threadId,observed:journeys.length,deployedGitSha:deployedSha,
    nextWake:evidence.nextAutonomousBoundary?.dueAt??null,
    evidencePath:file,journeys});
  return {evidence,evidencePath:file};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const args=argsFrom(process.argv.slice(2));
    await runThreadJourneyProbe({
      targetEnvironment:args.environment,threadId:args.threadId,
    });
  }catch(error){
    process.stderr.write(JSON.stringify({
      event:"thread-journey-probe-failed",
      message:String(error?.message??error).slice(0,350),
    })+"\n");
    process.exitCode=1;
  }
}
