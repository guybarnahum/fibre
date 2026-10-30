import { openBirthStateDatabase } from "./birth-state-storage.mjs";
import { canonicalDigest, canonicalJson } from "./state-codec.mjs";

// One lifecycle per requestId in the existing modern_birth_requests authority.
// Historical Admin and CLI records remain unchanged until their routes retire.
const TERMINAL = new Set(["complete", "unlocated", "unpresented", "cancelled", "stillborn"]);
const STAGES = new Set([
  "requested", "place_resolved", "place_authored", "parents_selected",
  "genome_selected", "developing", "publishing", "admitted",
  "presented", "located", ...TERMINAL,
]);

function decode(value) { return value == null ? null : JSON.parse(value); }
function name(value) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError("birth requestId is required");
  return value.trim();
}
function fromRow(row) {
  if (!row) return null;
  return Object.freeze({
    requestId:row.request_id, requestedAt:row.requested_at,
    input:decode(row.lifecycle_input_json), inputDigest:row.lifecycle_input_digest,
    stage:row.lifecycle_stage, data:decode(row.lifecycle_data_json) ?? {},
    placeVersion:row.place_version,
    attemptCount:row.attempt_count, nextAttemptAt:row.next_attempt_at,
    error:row.error_text, failureRetryable:row.failure_retryable === null ? null : !!row.failure_retryable,
    observationStartedAt:row.observation_started_at, result:decode(row.lifecycle_result_json),
    status:row.status, threadId:row.thread_id, genesisId:row.genesis_id,
    location:row.selected_location, sex:row.selected_sex,
    createdAt:row.created_at, updatedAt:row.updated_at,
  });
}
const COLUMNS = [
  "request_id", "requested_at", "lifecycle_input_json", "lifecycle_input_digest",
  "lifecycle_stage", "lifecycle_data_json", "place_version", "attempt_count",
  "next_attempt_at", "error_text", "failure_retryable", "observation_started_at",
  "lifecycle_result_json", "status", "thread_id", "genesis_id",
  "selected_location", "selected_sex", "created_at", "updated_at",
].join(",");

export function createBirthLifecycleStore(storage, {
  now=()=>new Date().toISOString(), nowMs=Date.now,
}={}) {
  const db=openBirthStateDatabase(storage,{storeName:"BirthLifecycleStore"});
  const getRow=db.prepare("SELECT "+COLUMNS+" FROM modern_birth_requests WHERE request_id=?");
  const insert=db.prepare(
    "INSERT INTO modern_birth_requests(request_id,requested_at,requested_location,requested_sex,status,created_at,updated_at,lifecycle_input_json,lifecycle_input_digest,lifecycle_stage,next_attempt_at)"+
    " VALUES (?,?,NULL,?,'queued',?,?,?,?,'requested',?)"
  );
  const update=db.prepare(
    "UPDATE modern_birth_requests SET status=?,lifecycle_stage=?,lifecycle_data_json=?,place_version=?,"+
    "attempt_count=?,next_attempt_at=?,failure_retryable=?,error_text=?,observation_started_at=?,"+
    "lifecycle_result_json=?,selected_location=?,location_source=?,selected_sex=?,thread_id=?,"+
    "genesis_id=?,updated_at=? WHERE request_id=? AND lifecycle_input_json IS NOT NULL"
  );
  const due=db.prepare(
    "SELECT "+COLUMNS+" FROM modern_birth_requests "+
    "WHERE lifecycle_input_json IS NOT NULL AND next_attempt_at IS NOT NULL AND next_attempt_at<=? "+
    "ORDER BY next_attempt_at,request_id LIMIT ?"
  );
  const nextDue=db.prepare(
    "SELECT MIN(next_attempt_at) AS at FROM modern_birth_requests "+
    "WHERE lifecycle_input_json IS NOT NULL AND next_attempt_at IS NOT NULL"
  );
  const listFirst=db.prepare(
    "SELECT "+COLUMNS+" FROM modern_birth_requests WHERE lifecycle_input_json IS NOT NULL "+
    "AND (?=1 OR lifecycle_stage!='cancelled') "+
    "ORDER BY created_at DESC,request_id DESC LIMIT ?"
  );
  const listNext=db.prepare(
    "SELECT "+COLUMNS+" FROM modern_birth_requests WHERE lifecycle_input_json IS NOT NULL "+
    "AND (?=1 OR lifecycle_stage!='cancelled') "+
    "AND (created_at<? OR (created_at=? AND request_id<?)) "+
    "ORDER BY created_at DESC,request_id DESC LIMIT ?"
  );
  // One bounded operator read, without loading the large development-request
  // JSON or naming/Place records. The lifecycle row remains the authority.
  const recentStatusQuery=db.prepare(
    "SELECT request_id,requested_at,lifecycle_stage,status,thread_id,genesis_id,"+
    "selected_location,selected_sex,error_text,created_at,updated_at,"+
    "json_extract(lifecycle_input_json,'$.place') AS requested_place,"+
    "json_extract(lifecycle_result_json,'$.name') AS final_name,"+
    "json_extract(lifecycle_data_json,'$.developmentRequest.subjectIdentity.femaleName') AS female_name,"+
    "json_extract(lifecycle_data_json,'$.developmentRequest.subjectIdentity.maleName') AS male_name "+
    "FROM modern_birth_requests WHERE lifecycle_input_json IS NOT NULL "+
    "ORDER BY created_at DESC,request_id DESC LIMIT ?"
  );
  const preflightPlaces=db.prepare(
    "SELECT place_key,version FROM birth_place_records "+
    "WHERE place_key>=? AND place_key<? ORDER BY place_key DESC,created_at DESC LIMIT 4"
  );
  const preflightNames=db.prepare(
    "SELECT origin_id,authored_json FROM birth_naming_records "+
    "WHERE place_key=? AND child_decade=? "+
    "ORDER BY origin_id,created_at DESC LIMIT 48"
  );
  const placeByVersion=db.prepare("SELECT * FROM birth_place_records WHERE place_key=? AND version=?");
  const placeLatest=db.prepare(
    "SELECT * FROM birth_place_records WHERE place_key=? ORDER BY created_at DESC,version DESC LIMIT 1"
  );
  const addPlace=db.prepare(
    "INSERT INTO birth_place_records(place_key,version,authored_json,created_at) VALUES (?,?,?,?)"
  );

  const namingByVersion=db.prepare(
    "SELECT * FROM birth_naming_records WHERE place_key=? AND origin_id=? AND child_decade=? AND version=?");
  const namingLatest=db.prepare(
    "SELECT * FROM birth_naming_records WHERE place_key=? AND origin_id=? AND child_decade=? "+
    "ORDER BY created_at DESC,version DESC LIMIT 1");
  const addNaming=db.prepare(
    "INSERT INTO birth_naming_records(place_key,origin_id,child_decade,version,authored_json,created_at) VALUES (?,?,?,?,?,?)");
  const nameSeed=db.prepare("SELECT 1 AS present FROM birth_name_seeds WHERE place_id=?");
  const insertSeed=db.prepare("INSERT INTO birth_name_seeds(place_id,seeded_at) VALUES (?,?)");
  const existingName=db.prepare(
    "SELECT request_id FROM birth_issued_names WHERE place_id=? AND name_key=?");
  const addName=db.prepare(
    "INSERT INTO birth_issued_names(place_id,name_key,display_name,request_id) VALUES (?,?,?,?)");
  const releaseNames=db.prepare(
    "DELETE FROM birth_issued_names WHERE request_id=?");
  function nameKey(value){
    if(typeof value!=="string"||!value.trim())throw new TypeError("Issued name is required");
    return value.normalize("NFC").trim().replace(/\s+/gu," ").toLocaleLowerCase("en-US");
  }
  function naming(placeKey,originId,childDecade,version=null){
    const row=version===null?namingLatest.get(placeKey,originId,childDecade)
      :namingByVersion.get(placeKey,originId,childDecade,version);
    return row?Object.freeze({placeKey,originId,childDecade,version:row.version,
      authored:decode(row.authored_json),createdAt:row.created_at}):null;
  }
  function saveNaming(placeKey,originId,childDecade,version,authored){
    const body=canonicalJson(authored);
    return db.transaction(()=>{
      const prior=naming(placeKey,originId,childDecade,version);
      if(prior){
        if(canonicalJson(prior.authored)!==body)throw new Error("Naming tradition version conflict");
        return prior;
      }
      addNaming.run(placeKey,originId,childDecade,version,body,now());
      return naming(placeKey,originId,childDecade,version);
    });
  }
  function nameIndexSeeded(placeId){return nameSeed.get(placeId)!==undefined;}
  function seedNames(placeId,names){
    if(!Array.isArray(names))throw new TypeError("World issued names must be an array");
    return db.transaction(()=>{
      if(nameIndexSeeded(placeId))return false;
      for(const fullName of names){
        if(typeof fullName!=="string"||!fullName.trim())continue;
        if(existingName.get(placeId,nameKey(fullName))===undefined)
          addName.run(placeId,nameKey(fullName),fullName,null);
      }
      insertSeed.run(placeId,now());
      return true;
    });
  }
  function reserveName(placeId,fullName,requestId){
    return db.transaction(()=>{
      const present=existingName.get(placeId,nameKey(fullName));
      if(present!==undefined)return present.request_id===requestId;
      addName.run(placeId,nameKey(fullName),fullName,requestId);
      return true;
    });
  }
  function releaseName(requestId){
    return releaseNames.run(name(requestId)).changes;
  }

  function get(requestId) {
    const row=getRow.get(name(requestId));
    return row?.lifecycle_input_json == null ? null : fromRow(row);
  }
  function enqueue(input) {
    if (!input || typeof input!=="object") throw new TypeError("birth input is required");
    const requestId=name(input.requestId);
    if (!Number.isFinite(Date.parse(input.requestedAt))) throw new TypeError("requestedAt must be ISO time");
    if (input.sex!=null && input.sex!=="male" && input.sex!=="female") throw new TypeError("birth sex is invalid");
    if (input.place!=null && (typeof input.place!=="string" || !input.place.includes("/")))
      throw new TypeError("birth place must be Country/City");
    if (input.heritage!=null && (typeof input.heritage!=="string" || !input.heritage.trim()))
      throw new TypeError("birth heritage is invalid");
    if (input.heritage!=null && input.place==null) throw new TypeError("heritage requires place");
    if (typeof input.forceNewWorld!=="boolean") throw new TypeError("birth forceNewWorld must be boolean");
    const clean={
      requestId, requestedAt:input.requestedAt, place:input.place??null,
      sex:input.sex??null, heritage:input.heritage??null,
      forceNewWorld:input.forceNewWorld,
    };
    const payload=canonicalJson(clean), digest=canonicalDigest(clean);
    return db.transaction(()=>{
      const prior=getRow.get(requestId);
      if (prior) {
        if (prior.lifecycle_input_digest!==digest || prior.lifecycle_input_json!==payload)
          throw Object.assign(new Error("Birth requestId already has different input"),{code:"BIRTH_INPUT_CONFLICT"});
        return fromRow(prior);
      }
      const timestamp=now();
      insert.run(requestId,clean.requestedAt,clean.sex,timestamp,timestamp,payload,digest,nowMs());
      return get(requestId);
    });
  }
  function progress(requestId,patch) {
    const existing=get(requestId);
    if (!existing) throw new Error("Birth lifecycle not found");
    const stage=patch.stage??existing.stage;
    if (!STAGES.has(stage)) throw new TypeError("Unsupported birth lifecycle stage");
    const nextAttemptAt=patch.nextAttemptAt===undefined?existing.nextAttemptAt:patch.nextAttemptAt;
    const result=patch.result===undefined?existing.result:patch.result;
    const data=patch.data===undefined?existing.data:patch.data;
    const status=patch.status??existing.status;
    const location=patch.location===undefined?existing.location:patch.location;
    const sex=patch.sex===undefined?existing.sex:patch.sex;
    const threadId=patch.threadId===undefined?existing.threadId:patch.threadId;
    const genesisId=patch.genesisId===undefined?existing.genesisId:patch.genesisId;
    update.run(
      status,stage,canonicalJson(data),patch.placeVersion===undefined?existing.placeVersion:patch.placeVersion,
      patch.attemptCount??existing.attemptCount,nextAttemptAt,
      patch.failureRetryable===undefined?(existing.failureRetryable===null?null:Number(existing.failureRetryable))
        :(patch.failureRetryable===null?null:Number(patch.failureRetryable)),
      patch.error===undefined?existing.error:patch.error,
      patch.observationStartedAt===undefined?existing.observationStartedAt:patch.observationStartedAt,
      result===null?null:canonicalJson(result),
      location,location===null?null:"birth-center",sex,threadId,genesisId,now(),existing.requestId
    );
    return get(requestId);
  }
  function list({limit=32,after=null,includeCancelled=false}={}) {
    if(!Number.isSafeInteger(limit)||limit<1||limit>128)throw new TypeError("birth list limit must be 1..128");
    const rows=after===null?listFirst.all(Number(includeCancelled),limit+1)
      :listNext.all(Number(includeCancelled),after.createdAt,after.createdAt,after.requestId,limit+1);
    const page=rows.slice(0,limit).map(fromRow);
    const last=page.at(-1);
    return Object.freeze({
      births:page,
      nextCursor:rows.length>limit&&last?{createdAt:last.createdAt,requestId:last.requestId}:null,
    });
  }
  function recentStatus({limit=64}={}){
    if(!Number.isSafeInteger(limit)||limit<1||limit>128)
      throw new TypeError("birth status limit must be 1..128");
    return recentStatusQuery.all(limit).map(row=>Object.freeze({
      requestId:row.request_id,requestedAt:row.requested_at,
      stage:row.lifecycle_stage,status:row.status,
      threadId:row.thread_id,genesisId:row.genesis_id,
      location:row.selected_location??row.requested_place,
      sex:row.selected_sex,
      name:row.final_name??(row.selected_sex==="female"?row.female_name:row.male_name),
      error:row.error_text,createdAt:row.created_at,updatedAt:row.updated_at,
    }));
  }
  function storedBirthPreflightPlaces(cityKey){
    const base=cityKey+":";
    return preflightPlaces.all(base,cityKey+";").map(row=>({
      placeKey:row.place_key,version:row.version,
    }));
  }
  function storedBirthPreflightNames(placeKey,decade){
    const names=new Map();
    for(const row of preflightNames.all(placeKey,decade)){
      if(!names.has(row.origin_id))names.set(row.origin_id,decode(row.authored_json));
    }
    return names;
  }
  function place(key,version=null) {
    const row=version===null?placeLatest.get(key):placeByVersion.get(key,version);
    return row?Object.freeze({key:row.place_key,version:row.version,
      authored:decode(row.authored_json),createdAt:row.created_at}):null;
  }
  function savePlace(key,version,authored){
    const body=canonicalJson(authored);
    return db.transaction(()=>{
      const existing=place(key,version);
      if(existing){
        if(canonicalJson(existing.authored)!==body)throw new Error("Birth Place version conflict");
        return existing;
      }
      addPlace.run(key,version,body,now());
      return place(key,version);
    });
  }
  return Object.freeze({
    get,enqueue,progress,list,recentStatus,place,savePlace,naming,saveNaming,
    storedBirthPreflightPlaces,storedBirthPreflightNames,
    nameIndexSeeded,seedNames,reserveName,releaseName,
    due({limit=2}={}){return due.all(nowMs(),limit).map(fromRow);},
    nextDueAt(){return nextDue.get().at??null;},
    isTerminal(stage){return TERMINAL.has(stage);},
    close(){db.close();},
  });
}
