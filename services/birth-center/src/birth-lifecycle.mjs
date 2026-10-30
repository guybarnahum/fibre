import { resolveGeoNamesPlace } from "../../../integrations/geography/geonames.mjs";
import { buildGenesisDevelopmentPlan } from "./genesis-development-plan.mjs";
import { genesisSexForThread } from "./genesis-sex.mjs";
import { selectBirthChronology } from "./birth-material.mjs";
import { composeGenesisBirthRequest } from "./genesis-birth-authoring.mjs";
import { newbornLocationStatus } from "./birth-location-verification.mjs";
import {
  composeGenesisWorldSelection, normalizeGenesisWorldSelector,
  normalizeHeritage, selectDefaultBirthplace,
} from "./genesis-world-selection.mjs";
import { sha256 } from "./state-codec.mjs";
import {
  authorPlacePopulation,authorNamingTradition,
} from "./place-population.mjs";
import {selectedOrigins,requiredNamingOrigins,composeParentage,birthSex} from "./birth-parentage.mjs";

const AUTHOR_EXHAUSTED_BACKOFF_MS=6*60*60_000;
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
function truncatedPopulation(error){
  return error?.code==="MODEL_INCOMPLETE_RESPONSE"
    && ["max_output_tokens","max_tokens"].includes(error.providerErrorCode);
}
function birthPlaceKey(birth,chronology){
  // Preserve the old key for an already pinned Slice 1 birth; new Places
  // are shared across heritage filters within the same child-birth decade.
  return birth.data.placeKey??(birth.data.selector.key+":"+chronology.bornAt.slice(0,3)+"0");
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
function namingRequirement(birth,store){
  if(birth.stage!=="parents_selected")return null;
  const place=store.place(birth.data.placeKey,birth.placeVersion);
  if(!place?.authored?.originGroups)return null;
  const selected=selectedOrigins({
    place:place.authored,requestId:birth.requestId,heritage:birth.input.heritage,
  });
  const decade=birth.data.chronology.bornAt.slice(0,3)+"0";
  for(const originId of requiredNamingOrigins(selected)){
    const record=store.naming(place.key,originId,decade,birth.data.namingVersions?.[originId]??null);
    if(record===null)return {place,selected,originId,decade};
  }
  return {place,selected,originId:null,decade};
}
async function worldNamesForPlace(world,selector){
  const data=await world("/internal/thread-directory/names?birthCity="+
    encodeURIComponent(selector.birthCity));
  if(data?.birthCity!==selector.birthCity||!Array.isArray(data.names))
    throw new Error("World returned invalid birth-city name seed");
  return data.names;
}

function projection(birth){
  const data=birth.data;
  return Object.freeze({
    requestId:birth.requestId,requestedAt:birth.requestedAt,
    inputDigest:birth.inputDigest,status:birth.status,stage:birth.stage,
    attemptCount:birth.attemptCount,nextAttemptAt:birth.nextAttemptAt,
    error:birth.error,errorCode:birth.error?(data?.errorCode??"BIRTH_FAILED"):null,
    failureRetryable:birth.failureRetryable,
    placeVersion:birth.placeVersion,genesisId:birth.genesisId,threadId:birth.threadId,
    location:birth.location,sex:birth.sex,
    result:birth.result,createdAt:birth.createdAt,updatedAt:birth.updatedAt,
    parentage:data?.parentage??null,
    reconciliationNote:data?.reconciliationNote??null,
    placeKey:data?.placeKey??null,
    name:data?.developmentRequest?.subjectIdentity?.[
      birth.sex==="male"?"maleName":"femaleName"
    ]??null,
  });
}
function birthFinalResult(birth,identity,worldInspection){
  const request=birth.data.developmentRequest;
  const chosen=birth.sex;
  const name=chosen==="female"?request.subjectIdentity.femaleName:request.subjectIdentity.maleName;
  const norm=value=>String(value??"").normalize("NFC").trim().replace(/\s+/gu," ");
  const differences=[];
  if(norm(identity?.name)!==norm(name))differences.push({field:"name",expected:name,actual:identity?.name??null});
  if(identity?.sex!==chosen)differences.push({field:"sex",expected:chosen,actual:identity?.sex??null});
  if(identity?.birthDate!==request.bornAt.slice(0,10))
    differences.push({field:"birthDate",expected:request.bornAt.slice(0,10),actual:identity?.birthDate??null});
  if(norm(identity?.birthCity)!==norm(request.subjectIdentity.birthCity))
    differences.push({field:"birthCity",expected:request.subjectIdentity.birthCity,actual:identity?.birthCity??null});
  // World has already admitted a living Thread; disagreement is evidence,
  // never grounds for retroactively failing the birth.
  const reconciliationNote=differences.length?{kind:"world_identity_disagreement",differences}:null;
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
    name:identity?.name??name,sex:identity?.sex??chosen,birthDate:identity?.birthDate??request.bornAt.slice(0,10),
    birthCity:identity?.birthCity??request.subjectIdentity.birthCity,reconciliationNote,
    locality:birth.data.newbornLocation.locality,
    countryCode:birth.data.newbornLocation.countryCode,
    languages:identity?.languages??request.subjectIdentity.languages,
    memoryRefCount:worldInspection?.authoritativeThread?.memoryRefCount??null,
    worldSpecId:request.worldSpec.worldSpecId,
    identityMode:"fresh_birth_composition",
  });
}

// This is specifically a birth lifecycle, not a generic workflow scheduler.
// Each step commits before the next network wait. Development is one resumable
// stage; its own durable journal retains already committed model invocations.
export function createBirthLifecycle({
  store,runtime,developmentService,authorAdapter,populationAdapter=authorAdapter,
  worldFetch,presentationFetch,privateToken,geoNamesUsername=null,
  viewerOrigin="https://insidefibre.com",nowMs=Date.now,
  onWake=()=>{},
}={}){
  if(!store || !runtime || !developmentService || !authorAdapter ||
     typeof worldFetch!=="function" || typeof presentationFetch!=="function")
    throw new TypeError("Birth lifecycle requires durable store, services and injected boundaries");
  const author=runtime.durableAdapter(authorAdapter);
  const populationAuthor=populationAdapter===authorAdapter?author:runtime.durableAdapter(populationAdapter);
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
        // A pinned transitional Slice 1 record remains readable, but new
        // Place versions share one population across heritage filters.
        if(!existing.authored.originGroups &&
          (existing.authored.heritage??null)!==(birth.input.heritage??null)){
          const error=new Error("Pinned Slice 1 Place material does not match its heritage");
          error.retryable=false;throw error;
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
      try{
        const authored=await authorPlacePopulation({
          adapter:populationAuthor,selector,placeKey:key,version,
          repair:birth.data.authoringRepair??null,
          attempt:birth.data.authoringAttempt??0,round:birth.data.authoringRound??0,
        });
        if(!active(requestId))return "complete";
        store.savePlace(key,version,authored);
        store.progress(requestId,{
          stage:"place_authored",status:"authoring",placeVersion:version,attemptCount:0,
          data:{...birth.data,placeKey:key,chosenPlaceVersion:version,
            worldMode:birth.input.forceNewWorld?"forced":"created",
            authoringRepair:null,authoringAttempt:0},
          error:null,failureRetryable:null,nextAttemptAt:at,
        });
      }catch(error){
        if(journalError(error)||truncatedPopulation(error)){
          const attempt=(birth.data.authoringAttempt??0)+1;
          const exhausted=attempt>=3;
          store.progress(requestId,{
            data:{...birth.data,placeKey:key,chosenPlaceVersion:version,
              errorCode:String(error?.code??"PLACE_AUTHORING_REJECTED"),
              authoringAttempt:exhausted?0:attempt,
              authoringRound:(birth.data.authoringRound??0)+(exhausted?1:0),
              authoringRepair:exhausted?null:message(error)},
            attemptCount:attempt,status:exhausted?"failed":"authoring",
            error:message(error),failureRetryable:exhausted?true:null,
            nextAttemptAt:at+(exhausted?AUTHOR_EXHAUSTED_BACKOFF_MS:5_000),
          });
        }else throw error;
      }
      return "authored";
    }
    if(stage==="place_authored"){
      const place=store.place(birth.data.placeKey,birth.placeVersion);
      if(!place)throw Object.assign(new Error("Pinned birth Place is missing"),{retryable:false});
      // Parent choices are pure functions of requestId and this pinned Place.
      store.progress(requestId,{stage:"parents_selected",status:"authoring",
        attemptCount:0,error:null,failureRetryable:null,nextAttemptAt:at});
      return "continue";
    }
    if(stage==="parents_selected"){
      const place=store.place(birth.data.placeKey,birth.placeVersion);
      if(!place)throw Object.assign(new Error("Pinned birth Place is missing"),{retryable:false});
      let parentage=null,selection;
      if(place.authored.originGroups){
        const needed=namingRequirement(birth,store);
        const {selected,decade}=needed;
        if(needed.originId!==null){
          if(!canAuthor){
            store.progress(requestId,{nextAttemptAt:at+5_000});
            return "deferred";
          }
          const origin=place.authored.originGroups.find(group=>group.originId===needed.originId);
          const version="names_"+sha256(place.version+":"+needed.originId+":"+decade).slice(0,16);
          const repair=birth.data.namingRepair?.originId===needed.originId
            ?birth.data.namingRepair.reason:null;
          try{
            const authored=await authorNamingTradition({
              adapter:author,place:{...place,selector:birth.data.selector},
              origin,childDecade:decade,placeVersion:place.version,repair,
              attempt:birth.data.namingAttempt??0,round:birth.data.namingRound??0,
            });
            if(!active(requestId))return "complete";
            store.saveNaming(place.key,needed.originId,decade,version,authored);
            store.progress(requestId,{
              data:{...birth.data,namingVersions:{...birth.data.namingVersions,
                [needed.originId]:version},namingRepair:null,namingAttempt:0},
              attemptCount:0,error:null,failureRetryable:null,nextAttemptAt:at,
            });
          }catch(error){
            if(journalError(error)||truncatedPopulation(error)){
              const attempt=(birth.data.namingAttempt??0)+1;
              const exhausted=attempt>=3;
              store.progress(requestId,{
                data:{...birth.data,
                  errorCode:String(error?.code??"NAMING_AUTHORING_REJECTED"),
                  namingAttempt:exhausted?0:attempt,
                  namingRound:(birth.data.namingRound??0)+(exhausted?1:0),
                  namingRepair:exhausted?null:{originId:needed.originId,reason:message(error)}},
                attemptCount:attempt,status:exhausted?"failed":"authoring",
                error:message(error),failureRetryable:exhausted?true:null,
                nextAttemptAt:at+(exhausted?AUTHOR_EXHAUSTED_BACKOFF_MS:5_000),
              });
            }else throw error;
          }
          return "authored";
        }
        const traditions={};
        for(const id of requiredNamingOrigins(selected)){
          traditions[id]=store.naming(place.key,id,decade,
            birth.data.namingVersions?.[id]??null).authored;
        }
        if(!store.nameIndexSeeded(birth.data.selector.key)){
          const existingNames=await worldNamesForPlace(world,birth.data.selector);
          if(!active(requestId))return "complete";
          store.seedNames(birth.data.selector.key,existingNames);
        }
        const selectedSex=birthSex(requestId,birth.input.sex);
        const calibration=await appearanceCalibration();
        const firstRedraw=birth.data.nameRedrawOffset??0;
        for(let redraw=firstRedraw;redraw<firstRedraw+16;redraw++){
          parentage=composeParentage({
            requestId,chronology,selector:birth.data.selector,
            place:place.authored,selected,traditions,sex:selectedSex,redraw,
          });
          selection=composeGenesisWorldSelection({
            selector:birth.data.selector,
            heritage:birth.input.heritage===null?null:normalizeHeritage(birth.input.heritage),
            authored:place.authored,familyOverride:parentage.family,
            householdOverride:{...parentage.household,participants:parentage.participants},
            requestId,...chronology,createdAt:place.createdAt,
          });
          const request=composeGenesisBirthRequest({
            requestId,requestedAt:birth.requestedAt,
            selection,sexSelection:selectedSex,calibrationModel:calibration,
            canonicalPlace:birth.data.canonicalPlace,parentage,
          });
          const plan=buildGenesisDevelopmentPlan(request);
          if(!store.reserveName(birth.data.selector.key,parentage.issuedName,requestId))
            continue;
          if(!active(requestId))return "complete";
          store.progress(requestId,{
            stage:"genome_selected",threadId:plan.threadId,genesisId:plan.genesisId,
            sex:selectedSex,status:"developing",attemptCount:0,
            data:{...birth.data,developmentRequest:request,
              namingVersions:Object.fromEntries(requiredNamingOrigins(selected).map(id=>
                [id,store.naming(place.key,id,decade,birth.data.namingVersions?.[id]??null).version])),
              parentage:{
                mother:parentage.mother,father:parentage.father,
                mixed:parentage.mixed,
                couple:{motherOriginId:selected.mother.originId,fatherOriginId:selected.father.originId},
                childGivenNameTradition:{
                  originId:selected.childOriginId,
                  originLabel:place.authored.originGroups.find(g=>g.originId===selected.childOriginId).label,
                },
                household:{
                  caregivers:parentage.household.caregivers,
                  siblings:parentage.household.siblings,
                },
                mixedParentShare:place.authored.mixedParentShare,
                issuedName:parentage.issuedName,
              }},
            error:null,failureRetryable:null,nextAttemptAt:at,
          });
          return "continue";
        }
        // A stochastic collision does not condemn a prospective child.
        store.progress(requestId,{status:"authoring",
          data:{...birth.data,nameRedrawOffset:firstRedraw+16},
          nextAttemptAt:at+60_000});
        return "deferred";
      }
      // Existing pinned Slice 1 births retain their historic family-profile material.
      selection=selectionFromBirth(birth,place);
      const calibration=await appearanceCalibration();
      const request=composeGenesisBirthRequest({
        requestId,requestedAt:birth.requestedAt,
        selection,sexSelection:birth.input.sex,
        calibrationModel:calibration,canonicalPlace:birth.data.canonicalPlace,
      });
      const plan=buildGenesisDevelopmentPlan(request);
      if(!active(requestId))return "complete";
      const sex=birth.input.sex??(plan.subjectIdentity?.sex??null);
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
        data:{...birth.data,reconciliationNote:result.reconciliationNote},
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
        const placeMissing=birth.stage==="place_resolved"
          && (birth.input.forceNewWorld&&!birth.data.chosenPlaceVersion ||
            store.place(birthPlaceKey(birth,birth.data.chronology),
              birth.data.chosenPlaceVersion??null)===null);
        const requirement=birth.stage==="parents_selected"?namingRequirement(birth,store):null;
        const missingNaming=requirement!==null&&requirement.originId!==null;
        const enteringAuthor=(placeMissing||missingNaming)&&canAuthor&&!usedAuthor;
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
        const retryable=error?.retryable!==false &&
          !(birth.stage==="requested"&&error instanceof TypeError);
        store.progress(original.requestId,{
          status:"failed",error:message(error),failureRetryable:retryable,
          data:{...birth.data,errorCode:String(error?.code??error?.constructor?.name??"BIRTH_FAILED")},
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
      store.releaseName(requestId);
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
    store.releaseName(requestId);
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
    place:requestId=>{
      const birth=store.get(requestId);
      return birth?.data?.placeKey&&birth.placeVersion
        ?store.place(birth.data.placeKey,birth.placeVersion):null;
    },
    list:options=>{const page=store.list(options);return {
      births:page.births.map(projection),nextCursor:page.nextCursor};},
    resume,abandon,handleWake,ensureScheduled,
  });
}
