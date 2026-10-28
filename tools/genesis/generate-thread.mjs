import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { resolveGeoNamesPlace } from "#integrations/geography/geonames.mjs";
import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";
import { genesisSexForThread } from "#services/birth-center/src/genesis-sex.mjs";
import {
  GENESIS_DEVELOPMENT_REQUEST_VERSION,
  buildGenesisDevelopmentPlan,
} from "#services/birth-center/src/genesis-development-plan.mjs";
import {
  composeBirthSubjectIdentity,
  freshBirthParticipants,
  selectBirthChronology,
} from "./birth-material.mjs";
import {
  normalizeGenesisWorldSelector,
  parseGenesisArgs,
  resolveGenesisWorldSelection,
  selectDefaultBirthplace,
} from "./genesis-selection.mjs";
import {newbornLocationStatus} from "./birth-location-verification.mjs";
import {selectedUrgesForBirth} from "../../core/src/inherited-urges.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DEFAULT_TIMEOUT_MS = 900_000;

function required(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function deployment(repoRoot, environment) {
  const target=normalizeCloudflareEnvironment(environment);
  const path = resolve(repoRoot, ".fibre", "cloudflare", target, "deployment.json");
  const record = JSON.parse(readFileSync(path, "utf8"));
  if (record?.environment !== target) throw new Error("deployment evidence environment mismatch");
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  if (record.sourceGitSha !== head) {
    throw new Error(`${target} deployment ${record.sourceGitSha} does not match current checkout ${head}`);
  }
  return record;
}

function serviceBase(record, serviceId) {
  const matches = (record.deployments ?? []).filter((item) => item?.serviceId === serviceId);
  if (matches.length !== 1) throw new Error(`deployment evidence must contain exactly one ${serviceId}`);
  return required(`${serviceId} baseUrl`, matches[0].baseUrl).replace(/\/$/u, "");
}

function birthRequest({
  requestId,
  requestedAt,
  selection,
  sexSelection,
  calibrationModel,
  canonicalPlace = null,
}) {
  const symbolicBirth=selectedUrgesForBirth(requestId);
  const composedIdentity = composeBirthSubjectIdentity({
    requestId,
    material:selection.material,
    calibrationModel,
  });
  const subjectIdentity = Object.freeze({
    ...composedIdentity,
    ...(sexSelection === null ? {} : { sex: sexSelection }),
    ...(selection.selector === null ? {} : {
      place: Object.freeze({
        country: canonicalPlace?.country ?? selection.selector.country,
        city: canonicalPlace?.city ?? selection.selector.city,
        ...(canonicalPlace === null ? {} : { lat:canonicalPlace.lat, long:canonicalPlace.long }),
      }),
    }),
    ...(selection.heritage === null ? {} : { heritage: selection.heritage.display }),
  });
  return Object.freeze({
    requestVersion: GENESIS_DEVELOPMENT_REQUEST_VERSION,
    requestId,
    requestedAt,
    worldSpec: selection.worldSpec,
    subjectIdentity,
    genomeValues:symbolicBirth.values,
    originMaterial:symbolicBirth.originMaterial,
    participants: freshBirthParticipants({ requestId, participants: selection.participants }),
    placeAffordances: selection.placeAffordances,
    bornAt:selection.worldSpec.timeFrame.startAt,
    chronologyEndsAt:selection.worldSpec.timeFrame.endAt,
    timeZone: selection.timeZone,
  });
}

async function json(response, label) {
  const payload = await response.json().catch(() => null);
  if (payload === null) throw new Error(`${label} returned non-JSON HTTP ${response.status}`);
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

function calibrationModelFromSnapshot(payload) {
  if(payload?.contract!=="fibre-human-appearance-calibration-model-v0.1"||!Array.isArray(payload.model)){
    throw new Error("World appearance calibration model is invalid");
  }
  const byId=new Map(payload.model.map(entry=>[entry?.id,entry]));
  const calibration=(id)=>{
    const entry=byId.get(id);
    if(!entry?.prior||!entry?.variation)throw new Error(`World appearance calibration ${id} is unavailable`);
    return entry;
  };
  return Object.freeze({
    prior:id=>calibration(id).prior,
    variation:id=>calibration(id).variation,
  });
}

async function readAppearanceCalibrationModel({baseUrl,privateToken,timeoutMs}) {
  const payload=await json(await fetch(
    `${baseUrl}/internal/appearance/calibrations`,
    {
      headers:{Accept:"application/json","x-fibre-private-token":privateToken},
      signal:AbortSignal.timeout(timeoutMs),
    },
  ),"World appearance calibration");
  return calibrationModelFromSnapshot(payload);
}

async function submit({ baseUrl, privateToken, body, timeoutMs }) {
  return json(await fetch(`${baseUrl}/internal/births/develop`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-fibre-private-token": privateToken,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  }), "Genesis birth");
}

async function inspectDevelopment({ baseUrl, privateToken, requestId, timeoutMs }) {
  return json(await fetch(
    `${baseUrl}/internal/births/develop/${encodeURIComponent(requestId)}/inspection`,
    {
      headers: { "x-fibre-private-token": privateToken },
      signal: AbortSignal.timeout(timeoutMs),
    },
  ), "Genesis development inspection");
}

async function inspectDevelopmentIfExists({ baseUrl, privateToken, requestId, timeoutMs }) {
  const response = await fetch(
    `${baseUrl}/internal/births/develop/${encodeURIComponent(requestId)}/inspection`,
    {
      headers: { "x-fibre-private-token": privateToken },
      signal: AbortSignal.timeout(timeoutMs),
    },
  );
  if (response.status === 404) return null;
  return json(response, "Genesis development inspection");
}

async function inspectWorldObservatory({baseUrl,privateToken,threadId,timeoutMs}){
  return json(await fetch(
    `${baseUrl}/internal/threads/${encodeURIComponent(threadId)}/observatory?view=full`,{
      headers:{"x-fibre-private-token":privateToken},
      signal:AbortSignal.timeout(timeoutMs),
    },
  ),"World newborn observatory");
}

async function inspectWorld({ baseUrl, privateToken, plan, timeoutMs }) {
  return json(await fetch(
    `${baseUrl}/internal/genesis/${encodeURIComponent(plan.genesisId)}/threads/${encodeURIComponent(plan.threadId)}/inspection`,
    {
      headers: { "x-fibre-private-token": privateToken },
      signal: AbortSignal.timeout(timeoutMs),
    },
  ), "World Thread inspection");
}

async function inspectPresentation({ baseUrl, viewerOrigin, threadId, timeoutMs }) {
  const response = await fetch(`${baseUrl}/api/threads/${encodeURIComponent(threadId)}/snapshot`, {
    headers: { Origin: viewerOrigin, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status === 404) return null;
  return json(response, "Thread Presentation snapshot");
}

async function poll(operation, ready, { timeoutMs, intervalMs = 2_000 }) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await operation();
    if (ready(latest)) return latest;
    await delay(intervalMs);
  }
  const error=new Error("Thread birth convergence timed out");
  error.code="THREAD_BIRTH_CONVERGENCE_TIMEOUT";
  error.latest=latest;
  throw error;
}

function assertGenesisReference({ body, plan, world, presentation }) {
  const identity = world.inspection?.authoritativeThread?.identity;
  if (!identity) throw new Error("World inspection lacks authoritative Thread identity");
  const expectedSex = body.subjectIdentity.sex ?? genesisSexForThread({ threadId: plan.threadId });
  const expectedName = expectedSex === "female" ? body.subjectIdentity.femaleName : body.subjectIdentity.maleName;
  if (identity.name !== expectedName || identity.name === "Fibre Thread") throw new Error("Thread proper name did not persist");
  if (identity.sex !== expectedSex) throw new Error("Thread sex did not persist");
  if (identity.birthDate !== body.bornAt.slice(0, 10)) throw new Error("Thread birth date did not persist");
  if (identity.birthCity !== body.subjectIdentity.birthCity) throw new Error("Thread birth city did not persist");
  if (JSON.stringify(identity.languages) !== JSON.stringify(body.subjectIdentity.languages)) throw new Error("Thread spoken languages did not persist");
  if (!Array.isArray(identity.culture) || identity.culture[0] !== `${body.subjectIdentity.birthCity} formative context`) throw new Error("Thread cultural context did not persist");

  const publicPresentation = presentation?.snapshot?.presentation;
  if (publicPresentation?.subject?.displayName !== expectedName) throw new Error("public Presentation does not expose Thread name");
  if (publicPresentation.subject.birthDate !== body.bornAt.slice(0, 10)) throw new Error("public Presentation does not expose birth date");
  if (JSON.stringify(publicPresentation.subject.languages) !== JSON.stringify(body.subjectIdentity.languages)) throw new Error("public Presentation does not expose spoken languages");
  if (!(publicPresentation.places ?? []).some(({ displayName }) => displayName === body.subjectIdentity.birthCity)) {
    throw new Error("public Presentation does not expose authoritative birth place");
  }
  if (!Array.isArray(publicPresentation.origins) || publicPresentation.origins.length === 0) {
    throw new Error("public Presentation does not expose cultural context");
  }
  return Object.freeze({ expectedName, expectedSex, identity });
}

function usage() {
  return [
    "Genesis remote birth",
    "",
    "  npm run genesis:birth -- --env staging --sex=female --place=Israel/Jerusalem --heritage=\"Yemeni Jewish\"",
    "  npm run genesis:birth -- --env staging --sex=male --place=Germany/Berlin --heritage=Turkish",
    "  npm run genesis:birth -- --env staging --new-world --sex=female --place=Brazil/Recife",
    "",
    "Keys: --sex=female|male, --place=Country/City, --heritage=Family Heritage.",
    "Legacy shorthand --female/--male and --Country/City remains accepted.",
    "Sex is optional; without it Fibre derives sex from the Thread identity.",
    "Place is optional; without it Fibre deterministically samples a globally distributed birthplace with a meaningful small-place long tail.",
    "Explicit places are normalized through GeoNames and require GEONAMES_USERNAME.",
    "Heritage requires an explicit place and creates/reuses a place+heritage World variant.",
    "Unknown place/heritage combinations are authored once and cached under .fibre/genesis/worlds; --new-world forces a fresh World version.",
    "Set FIBRE_GENESIS_REQUEST_ID to an existing request to resume its persisted request time and durable model calls.",
  ].join("\n");
}

function parseRemoteArgs(argv){
  let environment=null;
  const genesisArgs=[];
  for(let index=0;index<argv.length;index+=1){
    if(argv[index]==="--env")environment=argv[++index]??null;
    else genesisArgs.push(argv[index]);
  }
  const options=parseGenesisArgs(genesisArgs);
  return Object.freeze({
    environment:options.help?null:normalizeCloudflareEnvironment(environment),
    options,
  });
}
async function reportPreparation({baseUrl,privateToken,requestId,requestedAt,location,sex,action,error=null,timeoutMs}){
  const response=await fetch(baseUrl+"/internal/births/preparation",{
    method:"POST",
    headers:{"content-type":"application/json","x-fibre-private-token":privateToken},
    body:JSON.stringify({requestId,requestedAt,location,sex,action,...(error===null?{}:{error})}),
    signal:AbortSignal.timeout(timeoutMs),
  });
  const payload=await json(response,"Birth Center preparation");
  return payload.preparation;
}

async function main() {
  const startedAt=Date.now();
  let activeStage="starting",stageStart=startedAt,birthRequestId=null,birthThreadId=null;
  const interactive=process.stderr.isTTY===true;
  let transientVisible=false;
  const progress=(detail={})=>{
    const now=Date.now();
    if(interactive){
      const status=`BIRTH ${activeStage} · ${Math.floor((now-stageStart)/1000)}s (total ${Math.floor((now-startedAt)/1000)}s)`;
      const width=Number.isSafeInteger(process.stderr.columns)
        ?Math.max(1,process.stderr.columns-2):null;
      const characters=[...status];
      const line=width!==null&&characters.length>width
        ?characters.slice(0,width-1).join("")+"…":status;
      process.stderr.write("\r\u001b[2K"+line);
      transientVisible=true;
      return;
    }
    const fields={
      ...(birthRequestId===null?{}:{requestId:birthRequestId}),
      ...(birthThreadId===null?{}:{threadId:birthThreadId}),
      ...detail,
    };
    process.stderr.write(`BIRTH ${activeStage} (${Math.floor((now-stageStart)/1000)}s in stage, ${Math.floor((now-startedAt)/1000)}s total)`+
      Object.entries(fields).map(([key,value])=>` ${key}=${value}`).join("")+"\n");
  };
  const emit=(stage,detail={})=>{
    const changed=stage!==activeStage;
    if(interactive&&transientVisible){
      process.stderr.write("\r\u001b[2K");
      transientVisible=false;
    }
    activeStage=stage;stageStart=Date.now();
    if(interactive){
      if(changed){
        const fields={
          ...(birthRequestId===null?{}:{requestId:birthRequestId}),
          ...(birthThreadId===null?{}:{threadId:birthThreadId}),
          ...detail,
        };
        process.stderr.write(`BIRTH ${stage}`+
          Object.entries(fields).map(([key,value])=>` ${key}=${value}`).join("")+"\n");
      }
    }else progress(detail);
  };
  const heartbeat=setInterval(()=>progress(),10_000);
  heartbeat.unref?.();
  try {
  emit("inspect_deployment");
  const remote=parseRemoteArgs(process.argv.slice(2));
  const options=remote.options;
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const targetEnvironment=remote.environment;

  const privateToken = required("FIBRE_PRIVATE_TOKEN", process.env.FIBRE_PRIVATE_TOKEN);
  const deployed = deployment(REPO_ROOT,targetEnvironment);
  const timeoutMs = Number.parseInt(process.env.FIBRE_GENESIS_E2E_CONVERGENCE_WAIT_MS ?? String(DEFAULT_TIMEOUT_MS), 10);
  const birthCenter = serviceBase(deployed, "birth-center");
  const worldKernel = serviceBase(deployed, "world-kernel");
  const threadPresentation = serviceBase(deployed, "thread-presentation");
  const viewerOrigin = required(`${targetEnvironment} viewer origin`, deployed.externalViewerOrigin);
  emit("read_appearance_calibration");
  const calibrationModel=await readAppearanceCalibrationModel({
    baseUrl:worldKernel,
    privateToken,
    timeoutMs,
  });

  const explicitRequestId = process.env.FIBRE_GENESIS_REQUEST_ID?.trim() || null;
  const requestId = explicitRequestId ?? `genesis-birth-${Date.now().toString(36)}`;
  birthRequestId=requestId;
  emit("inspect_prior_development");
  const existing = explicitRequestId === null
    ? null
    : await inspectDevelopmentIfExists({ baseUrl: birthCenter, privateToken, requestId, timeoutMs });
  const persistedRequestedAt = existing?.inspection?.requestedAt ?? null;
  const explicitRequestedAt = process.env.FIBRE_GENESIS_REQUESTED_AT?.trim() || null;
  if (persistedRequestedAt !== null && explicitRequestedAt !== null && persistedRequestedAt !== explicitRequestedAt) {
    throw new Error(`existing Genesis request ${requestId} was created at ${persistedRequestedAt}; do not override FIBRE_GENESIS_REQUESTED_AT when resuming`);
  }
  let requestedAt = explicitRequestedAt ?? persistedRequestedAt ?? new Date().toISOString();
  emit("resolve_birthplace");
  const canonicalPlace = options.world === null
    ? null
    : await resolveGeoNamesPlace({
        country:options.world.country,
        city:options.world.city,
        username:required("GEONAMES_USERNAME", process.env.GEONAMES_USERNAME),
      });
  const selector = canonicalPlace === null
    ? selectDefaultBirthplace(requestId)
    : normalizeGenesisWorldSelector(`${canonicalPlace.country}/${canonicalPlace.city}`);
  const location=canonicalPlace===null?null:{
    country:canonicalPlace.country,city:canonicalPlace.city,
    displayName:canonicalPlace.displayName??(canonicalPlace.city+", "+canonicalPlace.country),
    lat:canonicalPlace.lat,long:canonicalPlace.long,
  };
  emit("register_birth_preparation");
  const preparation=await reportPreparation({
    baseUrl:birthCenter,privateToken,requestId,requestedAt,
    location,sex:options.sex,action:"start",timeoutMs,
  });
  requestedAt=preparation.requestedAt;
  const chronology=selectBirthChronology({requestId,requestedAt});
  if(persistedRequestedAt!==null&&persistedRequestedAt!==requestedAt){
    throw new Error("Birth Center preparation time differs from durable Genesis development");
  }
  emit("author_world_and_family",{place:selector.display});
  let selection;
  try {
    selection = await resolveGenesisWorldSelection({
      selector,
      heritage: options.heritage,
      forceNewWorld: options.forceNewWorld,
      ...chronology,
      repoRoot: REPO_ROOT,
      requestId,
      onProgress:event=>{
        if(event.type==="model_attempt"||event.type==="operational_failure"){
          progress({model:event.type,attempt:`${event.attempt}/${event.maximumAttempts}`,
            ...(event.failure?{failureCode:event.failure.code,retrying:event.retrying}:{})});
        }
      },
    });
  }catch(error){
    await reportPreparation({baseUrl:birthCenter,privateToken,requestId,
      requestedAt,location,sex:options.sex,action:"fail",
      error:String(error?.message??error),timeoutMs}).catch(()=>{});
    throw error;
  }
  emit("compose_birth_request");
  const body = birthRequest({
    requestId,
    requestedAt,
    selection,
    sexSelection: options.sex,
    calibrationModel,
    canonicalPlace,
  });
  const plan = buildGenesisDevelopmentPlan(body);
  if (existing !== null && existing.inspection.requestDigest !== plan.requestDigest) {
    throw new Error(`existing Genesis request ${requestId} does not match the supplied sex/place/heritage inputs`);
  }

  birthThreadId=plan.threadId;
  emit("birth_prepared",{
    requestMode:existing===null?"new":"resume",
    place:selection.selector?.display??"sampled",
    worldMode:selection.mode,worldSpecId:body.worldSpec.worldSpecId,
    selectionDigest:body.originMaterial.selectionDigest.slice(0,19),
    genesisId:plan.genesisId,
  });
  emit("submit_development",{genesisId:plan.genesisId});
  const birth = (await submit({ baseUrl: birthCenter, privateToken, body, timeoutMs })).development;
  if (birth?.status !== "published") {
    emit("await_birth_center_publication");
    await poll(
      () => inspectDevelopment({ baseUrl: birthCenter, privateToken, requestId, timeoutMs }),
      (result) => result?.inspection?.provisionalStatus === "published",
      { timeoutMs },
    );
  }
  emit("await_world_admission");
  const world = await poll(
    () => inspectWorld({ baseUrl: worldKernel, privateToken, plan, timeoutMs }),
    (result) => result?.inspection?.authoritativeThread?.exists === true && result?.inspection?.genesis?.threadPublished === true,
    { timeoutMs },
  );
  emit("await_public_presentation");
  const presentation = await poll(
    () => inspectPresentation({ baseUrl: threadPresentation, viewerOrigin, threadId: plan.threadId, timeoutMs }),
    (result) => result?.pointer?.threadId === plan.threadId,
    { timeoutMs },
  );
  const validated = assertGenesisReference({ body, plan, world, presentation });
  emit("birth_verified");
  let newbornLocation;
  try{
    newbornLocation=await poll(async()=>{
      const observation=await inspectWorldObservatory({
        baseUrl:worldKernel,privateToken,threadId:plan.threadId,timeoutMs,
      });
      return newbornLocationStatus(observation.observatory);
    },result=>result.state==="located",{timeoutMs,intervalMs:15_000});
  }catch(error){
    if(error?.code!=="THREAD_BIRTH_CONVERGENCE_TIMEOUT")throw error;
    process.stdout.write(JSON.stringify({
      event:"thread-birth-unlocated",threadId:plan.threadId,
      state:error.latest?.state??"awaiting_first_life",
    })+"\n");
    const failure=new Error("Newborn has no located current life");
    failure.code="THREAD_BIRTH_UNLOCATED";
    throw failure;
  }

  process.stdout.write(`${JSON.stringify({
    event: "thread-birth-complete",
    requestId,
    requestMode: existing === null ? "new" : "resume",
    sexSelection: options.sex ?? "derived",
    placeSelection: selection.selector?.display ?? null,
    heritageSelection: selection.heritage?.display ?? null,
    worldMode: selection.mode,
    selectionDigest:body.originMaterial.selectionDigest.slice(0,19),
    genesisId: plan.genesisId,
    threadId: plan.threadId,
    fibreIdentityNumber: birth.fibreIdentityNumber,
    name: validated.expectedName,
    sex: validated.expectedSex,
    birthDate: validated.identity.birthDate,
    birthCity: validated.identity.birthCity,
    locality:newbornLocation.location.locality,
    countryCode:newbornLocation.location.countryCode,
    languages: validated.identity.languages,
    memoryRefCount: world.inspection.authoritativeThread.memoryRefCount,
    worldSpecId: body.worldSpec.worldSpecId,
    identityMode: "fresh_birth_composition",
  })}\n`);
  } finally {
    clearInterval(heartbeat);
    if(interactive&&transientVisible)process.stderr.write("\r\u001b[2K");
  }
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    event: "thread-birth-failed",
    errorName: error?.constructor?.name ?? "Error",
    errorCode:error?.code ?? null,
    retryable:error?.retryable ?? null,
    message: error?.message ?? String(error),
  })}\n`);
  process.exitCode = 1;
});
