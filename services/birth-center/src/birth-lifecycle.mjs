import { resolveGeoNamesPlace } from "../../../integrations/geography/geonames.mjs";
import { buildGenesisDevelopmentPlan } from "./genesis-development-plan.mjs";
import { genesisSexForThread } from "./genesis-sex.mjs";
import { selectBirthChronology } from "./birth-material.mjs";
import { composeGenesisBirthRequest } from "./genesis-birth-authoring.mjs";
import { newbornLocationStatus } from "./birth-location-verification.mjs";
import {
  authorGenesisPlace, composeGenesisWorldSelection, normalizeGenesisWorldSelector,
  normalizeHeritage, selectDefaultBirthplace,
} from "./genesis-world-selection.mjs";
import { sha256 } from "./state-codec.mjs";

const OBSERVE_LIMIT_MS=2*60*60_000;
const OBSERVE_FIRST_MS=15_000;
const OBSERVE_MAX_MS=5*60_000;

function backoff(attempt,initial=5_000,maximum=15*60_000){
  return Math.min(maximum,initial*2**Math.min(20,Math.max(0,attempt-1)));
}
function message(error){return String(error?.message??error).slice(0,400);}
function responseError(response,payload,what){
  const error=new Error(what+" returned HTTP "+response.status+": "+JSON.stringify(payload?.error??payload).slice(0,200));
  error.status=response.status;
  error.retryable=response.status===408||response.status===429||response.status>=500;
  return error;
}
async function checkedResponse(response,what){
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw responseError(response,data,what);
  return data;
}
function journalError(error){return error instanceof TypeError && error?.retryable!==true;}
function birthPlaceKey(birth,chronology){
  const heritage=birth.input.heritage===null?"default":normalizeHeritage(birth.input.heritage).key;
  return birth.data.selector.key+":"+chronology.bornAt.slice(0,3)+"0:"+heritage;
}
function selectionFromBirth(birth,place){
  const selector=birth.data.selector;
  const chronology=birth.data.chronology;
  const heritage=birth.input.heritage===null?null:normalizeHeritage(birth.input.heritage);
  const material=place.authored.material??place.authored;
  return composeGenesisWorldSelection({
    selector,heritage,authored:material,requestId:birth.requestId,
    ...chronology,createdAt:place.createdAt,
  });
}
function projection(birth){
  const data=birth.data;
  return Object.freeze({
    requestId:birth.requestId,requestedAt:birth.requestedAt,
    inputDigest:birth.inputDigest,status:birth.status,stage:birth.stage,
    attemptCount:birth.attemptCount,nextAttemptAt:birth.nextAttemptAt,
    error:birth.error,failureRetryable:birth.failureRetryable,
    placeVersion:birth.placeVersion,genesisId:birth.genesisId,threadId:birth.threadId,
    location:birth.location,sex:birth.sex,
    result:birth.result,createdAt:birth.createdAt,updatedAt:birth.updatedAt,
    name:data?.developmentRequest?.subjectIdentity?.[
      birth.sex==="male"?"maleName":"femaleName"
    ]??null,
  });
}
function birthFinalResult(birth,identity,worldInspection){
  const request=birth.data.developmentRequest;
  const chosen=birth.sex;
  const name=chosen==="female"?request.subjectIdentity.femaleName:request.subjectIdentity.maleName;
  if(identity?.name!==name || identity?.sex!==chosen ||
    identity?.birthDate!==request.bornAt.slice(0,10) ||
    identity?.birthCity!==request.subjectIdentity.birthCity) {
    const error=new Error("World admitted a different birth identity");
    error.retryable=false;
    throw error;
  }
  return Object.freeze({
    event:"thread-birth-complete",
    requestId:birth.requestId,
    requestMode:"new",
    sexSelection:birth.input.sex??"derived",
    placeSelection:birth.data.selector?.display??null,
    heritageSelection:birth.input.heritage,
    worldMode:birth.data.worldMode,
    selectionDigest:request.originMaterial.selectionDigest.slice(0,19),
    genesisId:birth.genesisId,
    threadId:birth.threadId,
    fibreIdentityNumber:birth.data.developmentResult.fibreIdentityNumber,
    name,sex:chosen,birthDate:identity.birthDate,birthCity:identity.birthCity,
    locality:birth.data.newbornLocation.locality,
    countryCode:birth.data.newbornLocation.countryCode,
    languages:identity.languages,
    memoryRefCount:worldInspection?.authoritativeThread?.memoryRefCount??null,
    worldSpecId:request.worldSpec.worldSpecId,
    identityMode:"fresh_birth_composition",
  });
}

// This is specifically a birth lifecycle, not a generic workflow scheduler.
// Each step commits before the next network wait. Development is one resumable
// stage; its own durable journal retains already committed model invocations.
export function createBirthLifecycle({
  store,runtime,developmentService,authorAdapter,
  worldFetch,presentationFetch,privateToken,geoNamesUsername=null,
  viewerOrigin="https://insidefibre.com",nowMs=Date.now,
  onWake=()=>{},
}={}){
  if(!store || !runtime || !developmentService || !authorAdapter ||
     typeof worldFetch!=="function" || typeof presentationFetch!=="function")
    throw new TypeError("Birth lifecycle requires durable store, services and injected boundaries");
  const author=runtime.durableAdapter(authorAdapter);
  const active=id=>!store.isTerminal(store.get(id)?.stage);

  async function world(path,options={}){
    const result=await worldFetch(new Request("https://world-kernel.internal"+path,{
      ...options,headers:{
        Accept:"application/json","x-fibre-private-token":privateToken,
        ...options.headers,
      },
    }));
    return checkedResponse(result,"World "+path);
  }
  async function appearanceCalibration(){
    const snapshot=await world("/internal/appearance/calibrations");
    if(snapshot?.contract!=="fibre-human-appearance-calibration-model-v0.1" ||
      !Array.isArray(snapshot.model))throw new Error("World appearance calibration is unavailable");
    const byId=new Map(snapshot.model.map(entry=>[entry?.id,entry]));
    const calibration=id=>{
      const entry=byId.get(id);
      if(!entry?.prior||!entry?.variation)throw new Error("World appearance calibration "+id+" is unavailable");
      return entry;
    };
    return {prior:id=>calibration(id).prior,variation:id=>calibration(id).variation};
  }
  async function presentation(threadId){
    const res=await presentationFetch(new Request(
      "https://thread-presentation.internal/api/threads/"+encodeURIComponent(threadId)+"/snapshot",
      {headers:{Origin:viewerOrigin,Accept:"application/json"}},
    ));
    if(res.status===404)return false;
    const payload=await checkedResponse(res,"Thread Presentation");
    return payload?.pointer?.threadId===threadId;
  }
  async function worldPresence(threadId){
    const data=await world("/internal/thread-directory/presence",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({threadIds:[threadId]}),
    });
    return data.presentThreadIds?.includes(threadId)===true;
  }
  async function observeLocation(threadId){
    const data=await world("/internal/threads/"+encodeURIComponent(threadId)+"/observatory?view=current");
    return newbornLocationStatus(data.observatory);
  }
  async function advance(birth,{canAuthor}){
    const {requestId,stage}=birth,at=nowMs();
    const chronology=birth.data.chronology??selectBirthChronology({
      requestId,requestedAt:birth.requestedAt,
    });
    if(stage==="requested"){
      let selector,canonicalPlace=null;
      if(birth.input.place){
        const requested=normalizeGenesisWorldSelector(birth.input.place);
        if(!geoNamesUsername)throw Object.assign(new Error("Birth Center GEONAMES_USERNAME is required"),{retryable:false});
        canonicalPlace=await resolveGeoNamesPlace({
          country:requested.country,city:requested.city,
          username:geoNamesUsername,
        });
        selector=normalizeGenesisWorldSelector(canonicalPlace.country+"/"+canonicalPlace.city);
      }else selector=selectDefaultBirthplace(requestId);
      if(!active(requestId))return "complete";
      store.progress(requestId,{
        stage:"place_resolved",status:"authoring",location:selector.display,
        data:{...birth.data,chronology,selector,canonicalPlace},
        error:null,failureRetryable:null,attemptCount:0,nextAttemptAt:at,
      });
      return "continue";
    }
    if(stage==="place_resolved"){
      const {selector}=birth.data;
      const key=birthPlaceKey(birth,chronology);
      const chosenVersion=birth.data.chosenPlaceVersion;
      const existing=chosenVersion?store.place(key,chosenVersion)
        :birth.input.forceNewWorld?null:store.place(key);
      if(existing){
        // Slice 1 still uses a family-profile model conditioned on heritage.
        // Unlike Slice 2's Place Population, its other heritage paths cannot
        // yet be sampled from one shared prior. Never silently ignore a filter.
        const savedHeritage=existing.authored.heritage??null;
        if(savedHeritage!==(birth.input.heritage??null)){
          const error=new Error("Pinned Place material does not match its heritage");
          error.retryable=false;
          throw error;
        }
        store.progress(requestId,{
          stage:"place_authored",status:"authoring",placeVersion:existing.version,
          data:{...birth.data,placeKey:key,chosenPlaceVersion:existing.version,
            worldMode:chosenVersion?"created":"reused"},
          attemptCount:0,error:null,failureRetryable:null,nextAttemptAt:at,
        });
        return "continue";
      }
      if(!canAuthor){
        store.progress(requestId,{nextAttemptAt:at+5_000});
        return "deferred";
      }
      const version=chosenVersion??"place_"+sha256(key+":"+requestId).slice(0,16);
      const heritage=birth.input.heritage===null?null:normalizeHeritage(birth.input.heritage);
      try{
        const authored=await authorGenesisPlace({
          adapter:author,selector,heritage,placeKey:key,version,
          repair:birth.data.authoringRepair??null,
        });
        if(!active(requestId))return "complete";
        store.savePlace(key,version,{material:authored,heritage:heritage?.display??null});
        store.progress(requestId,{
          stage:"place_authored",status:"authoring",placeVersion:version,attemptCount:0,
          data:{...birth.data,placeKey:key,chosenPlaceVersion:version,
            worldMode:birth.input.forceNewWorld?"forced":"created",
            authoringRepair:null},
          error:null,failureRetryable:null,nextAttemptAt:at,
        });
      }catch(error){
        // A journaled structurally invalid model response must be repaired with
        // a different invocation ID, never replayed forever as the same call.
        if(journalError(error) && !birth.data.authoringRepair){
          store.progress(requestId,{data:{...birth.data,placeKey:key,
            chosenPlaceVersion:version,authoringRepair:message(error)},
            attemptCount:birth.attemptCount+1,
            error:message(error),failureRetryable:true,nextAttemptAt:at+5_000});
        }else throw error;
      }
      return "authored";
    }
    if(stage==="place_authored"){
      const place=store.place(birth.data.placeKey,birth.placeVersion);
      if(!place)throw Object.assign(new Error("Pinned birth Place is missing"),{retryable:false});
      store.progress(requestId,{stage:"parents_selected",status:"authoring",
        attemptCount:0,error:null,failureRetryable:null,nextAttemptAt:at});
      return "continue";
    }
    if(stage==="parents_selected"){
      const place=store.place(birth.data.placeKey,birth.placeVersion);
      if(!place)throw Object.assign(new Error("Pinned birth Place is missing"),{retryable:false});
      const selection=selectionFromBirth(birth,place);
      const calibration=await appearanceCalibration();
      const request=composeGenesisBirthRequest({
        requestId,requestedAt:birth.requestedAt,
        selection,sexSelection:birth.input.sex,
        calibrationModel:calibration,canonicalPlace:birth.data.canonicalPlace,
      });
      const plan=buildGenesisDevelopmentPlan(request);
      if(!active(requestId))return "complete";
      const sex=birth.input.sex??(plan.subjectIdentity?.sex??null);
      // The actual derived sex belongs to the existing Genesis contract.
      const selectedSex=sex??genesisSexForThread({threadId:plan.threadId});
      store.progress(requestId,{
        stage:"genome_selected",threadId:plan.threadId,genesisId:plan.genesisId,
        sex:selectedSex,status:"developing",attemptCount:0,
        data:{...birth.data,developmentRequest:request},
        error:null,failureRetryable:null,nextAttemptAt:at,
      });
      return "continue";
    }
    if(stage==="genome_selected"){
      store.progress(requestId,{stage:"developing",status:"developing",nextAttemptAt:at});
      return "continue";
    }
    if(stage==="developing"){
      const developmentResult=await developmentService.develop(birth.data.developmentRequest);
      if(!active(requestId))return "complete";
      store.progress(requestId,{
        stage:"publishing",status:"publishing",attemptCount:0,
        data:{...birth.data,developmentResult},
        error:null,failureRetryable:null,nextAttemptAt:at,
      });
      return "development";
    }
    if(stage==="publishing"){
      const provisional=runtime.provisionalBirthStore.get(birth.genesisId);
      if(provisional?.status==="failed"){
        const error=new Error("World rejected birth publication: "+JSON.stringify(provisional.worldResult?.error??{}));
        error.retryable=false;
        throw error;
      }
      if(provisional?.status!=="published"){
        store.progress(requestId,{
          status:"publishing",attemptCount:birth.attemptCount+1,
          nextAttemptAt:Math.max(at+15_000,provisional?.nextAttemptAt??0),
        });
        return "observing";
      }
      store.progress(requestId,{
        stage:"admitted",status:"published",attemptCount:0,observationStartedAt:at,
        nextAttemptAt:at+OBSERVE_FIRST_MS,
      });
      return "observing";
    }
    if(stage==="admitted"){
      const ready=await presentation(birth.threadId);
      if(!active(requestId))return "complete";
      if(!ready){
        store.progress(requestId,{
          status:"published",attemptCount:birth.attemptCount+1,
          nextAttemptAt:at+backoff(birth.attemptCount+1,OBSERVE_FIRST_MS,OBSERVE_MAX_MS),
        });
        return "observing";
      }
      store.progress(requestId,{stage:"presented",attemptCount:0,nextAttemptAt:at+OBSERVE_FIRST_MS});
      return "observing";
    }
    if(stage==="presented"){
      const result=await observeLocation(birth.threadId);
      if(!active(requestId))return "complete";
      if(result.state!=="located"){
        if(at-(birth.observationStartedAt??at)>=OBSERVE_LIMIT_MS){
          store.progress(requestId,{stage:"unlocated",nextAttemptAt:null,result:{
            event:"thread-birth-unlocated",requestId,threadId:birth.threadId,state:result.state,
          }});
          return "complete";
        }
        store.progress(requestId,{
          attemptCount:birth.attemptCount+1,
          nextAttemptAt:at+backoff(birth.attemptCount+1,OBSERVE_FIRST_MS,OBSERVE_MAX_MS),
        });
        return "observing";
      }
      store.progress(requestId,{stage:"located",attemptCount:0,
        data:{...birth.data,newbornLocation:result.location},nextAttemptAt:at});
      return "continue";
    }
    if(stage==="located"){
      const inspection=(await world(
        "/internal/genesis/"+encodeURIComponent(birth.genesisId)+"/threads/"+
        encodeURIComponent(birth.threadId)+"/inspection",
      )).inspection;
      if(!active(requestId))return "complete";
      const identity=inspection?.authoritativeThread?.identity;
      const result=birthFinalResult(birth,identity,inspection);
      store.progress(requestId,{stage:"complete",status:"published",result,nextAttemptAt:null,
        error:null,failureRetryable:null});
      return "complete";
    }
    return "complete";
  }
  async function processOne(original,{canAuthor}){
    let birth=original,usedAuthor=false;
    for(let n=0;n<8;n++){
      try{
        // Reserve the authoring budget before a possible provider failure.
        // One unsuccessful call must not admit a second call in this alarm.
        const enteringAuthor=birth.stage==="place_resolved" && canAuthor && !usedAuthor
          && (birth.data.chosenPlaceVersion===undefined
            || store.place(birthPlaceKey(birth,birth.data.chronology),
              birth.data.chosenPlaceVersion)===null);
        if(enteringAuthor)usedAuthor=true;
        const action=await advance(birth,{canAuthor:canAuthor&&!usedAuthor||enteringAuthor});
        if(action==="deferred")return {usedAuthor};
        if(action==="authored")usedAuthor=true;
        if(action==="authored" || action==="development" || action==="observing" || action==="complete")
          return {usedAuthor};
        birth=store.get(original.requestId);
      }catch(error){
        if(!active(original.requestId))return {usedAuthor};
        const attempt=birth.attemptCount+1;
        const retryable=error?.retryable!==false && !(
          error instanceof TypeError && birth.stage!=="place_resolved"
        );
        store.progress(original.requestId,{
          status:"failed",error:message(error),failureRetryable:retryable,
          attemptCount:attempt,nextAttemptAt:retryable?nowMs()+backoff(attempt):null,
        });
        return {usedAuthor,failed:true};
      }
    }
    return {usedAuthor};
  }
  async function ensureScheduled(){
    const next=store.nextDueAt();
    if(next===null)return;
    const current=await runtime.infraDriver.scheduler.get(runtime.stateScopeId);
    if(current===null||next<current)
      await runtime.infraDriver.scheduler.schedule(runtime.stateScopeId,Math.max(nowMs(),next));
  }
  async function handleWake(){
    const started=nowMs();
    const state=runtime.infraDriver.state;
    const before=state?.costSnapshot?.(runtime.stateScopeId)??null;
    let advanced=0,failed=0,usedAuthor=false;
    try{
      for(const birth of store.due({limit:2})){
        const result=await processOne(birth,{canAuthor:!usedAuthor});
        if(result.usedAuthor)usedAuthor=true;
        advanced++;
        if(result.failed)failed++;
      }
    }finally{
      await ensureScheduled();
      const after=state?.costSnapshot?.(runtime.stateScopeId)??null;
      const cost=before&&after?{
        rowsRead:after.rowsRead-before.rowsRead,
        rowsWritten:after.rowsWritten-before.rowsWritten,
        queries:after.queries-before.queries,
      }:{};
      onWake({event:"birth-lifecycle-wake",advanced,failed,authorCalls:usedAuthor?1:0,
        wallMs:nowMs()-started,...cost});
    }
    return {advanced,failed};
  }
  async function abandon(requestId,reason){
    if(typeof reason!=="string"||!reason.trim())throw new TypeError("Abandon requires a reason");
    const birth=store.get(requestId);
    if(!birth)throw new Error("Birth not found");
    if(store.isTerminal(birth.stage))return projection(birth);
    if(birth.threadId===null){
      return projection(store.progress(requestId,{stage:"cancelled",nextAttemptAt:null,
        data:{...birth.data,abandonReason:reason.trim()}}));
    }
    const provisional=runtime.provisionalBirthStore.get(birth.genesisId);
    // Never report stillborn while an asynchronous development or World
    // publication can still finish. An in-flight World acknowledgement could
    // otherwise admit a person after a claimed stillbirth.
    if(provisional?.status==="pending" ||
       (["genome_selected","developing"].includes(birth.stage) && birth.status!=="failed")){
      const error=new Error("Birth development/publication is in flight; abandon after it settles");
      error.code="BIRTH_IN_FLIGHT";
      throw error;
    }
    const admitted=provisional?.status==="published" ||
      await worldPresence(birth.threadId);
    if(admitted){
      return projection(store.progress(requestId,{
        stage:"complete",status:"published",nextAttemptAt:null,
        data:{...birth.data,observationStopped:true,abandonReason:reason.trim()},
      }));
    }
    const development=runtime.developmentRequestStore.get(requestId);
    if(development)
      runtime.developmentRequestStore.settleStillborn(requestId);
    return projection(store.progress(requestId,{stage:"stillborn",status:"failed",
      nextAttemptAt:null,error:reason.trim(),failureRetryable:false,
      data:{...birth.data,abandonReason:reason.trim()}}));
  }
  function resume(requestId){
    const birth=store.get(requestId);
    if(!birth)throw new Error("Birth not found");
    if(store.isTerminal(birth.stage))return projection(birth);
    if(birth.status==="failed" && birth.failureRetryable===false)
      throw new TypeError("A terminal birth failure cannot be resumed");
    return projection(store.progress(requestId,{status:"queued",error:null,
      failureRetryable:null,nextAttemptAt:nowMs()}));
  }
  return Object.freeze({
    enqueue:input=>projection(store.enqueue(input)),
    get:requestId=>{const row=store.get(requestId);return row?projection(row):null;},
    list:options=>{const page=store.list(options);return {
      births:page.births.map(projection),nextCursor:page.nextCursor};},
    resume,abandon,handleWake,ensureScheduled,
  });
}
