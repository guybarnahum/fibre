import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { selectReasoningIntegration } from "../../infra/deployments/integration-selection.mjs";
import {
  parseDeploymentManifest,
  resolveServiceDeployment,
} from "../../infra/deployments/manifest.mjs";
import { formPersonalLivedPlan } from "../../services/world-kernel/src/lived-plan-cognition.mjs";
import { explorationInteroceptionForLivedContinuity } from "../../services/world-kernel/src/lived-now-regulation.mjs";
import { placeEpisodeRevisionRef } from "../../services/world-kernel/src/situated-life-evidence.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_THREADS = 18;
const X3_MAX_THREADS = 8;
const MIN_CURRENT_THREADS = 3;
const MIN_HISTORY_ATTRIBUTED = 2;
const GIT_SHA = /^[0-9a-f]{40}$/u;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function jsonFile(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sourceGitSha() {
  const value = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd:REPO_ROOT,
    encoding:"utf8",
  }).trim().toLowerCase();
  if (!GIT_SHA.test(value)) throw new Error("lived-planning staging proof requires an exact Git SHA");
  return value;
}

function deploymentByService(record, serviceId) {
  const matches = (record.deployments ?? []).filter((entry) => entry?.serviceId === serviceId);
  if (matches.length !== 1) throw new Error(`deployment evidence must contain exactly one ${serviceId}`);
  return matches[0];
}

function remoteBase(name, value) {
  const url = new URL(nonEmpty(name, value));
  if (
    url.protocol !== "https:"
    || ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    || url.hostname.endsWith(".local")
  ) {
    throw new Error(`${name} must be a remote HTTPS staging endpoint`);
  }
  return url.toString().replace(/\/$/u, "");
}

function endpoint(baseUrl, pathname) {
  const url = new URL(baseUrl);
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  return url;
}

async function responseJson(response, label) {
  const payload = await response.json().catch(() => null);
  if (payload === null) throw new Error(`${label} returned non-JSON HTTP ${response.status}`);
  return payload;
}

async function privateGet(baseUrl, pathname, privateToken, label) {
  const response = await fetch(endpoint(baseUrl, pathname), {
    headers:{ Accept:"application/json", "x-fibre-private-token":privateToken },
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await responseJson(response, label);
  if (!response.ok) {
    throw new Error(`${label} failed HTTP ${response.status}: ${payload?.error?.code ?? payload?.error ?? "unknown"}`);
  }
  return payload;
}

async function privatePost(baseUrl, pathname, privateToken, body, label) {
  const response = await fetch(endpoint(baseUrl, pathname), {
    method:"POST",
    headers:{
      Accept:"application/json",
      "content-type":"application/json",
      "x-fibre-private-token":privateToken,
    },
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await responseJson(response, label);
  if (!response.ok || payload?.ok !== true) {
    const diagnostics = payload?.diagnostics ?? {};
    const interior = diagnostics?.interior ?? null;
    const parts = [
      payload?.error ?? "unknown",
      payload?.code ? `code=${payload.code}` : null,
      diagnostics?.stage ? `stage=${diagnostics.stage}` : null,
      diagnostics?.errorName ? `error=${diagnostics.errorName}` : null,
      diagnostics?.httpStatus !== null && diagnostics?.httpStatus !== undefined
        ? `provider_http=${diagnostics.httpStatus}`
        : null,
      diagnostics?.providerErrorCode ? `provider_code=${diagnostics.providerErrorCode}` : null,
      diagnostics?.providerErrorType ? `provider_type=${diagnostics.providerErrorType}` : null,
      diagnostics?.retryable !== null && diagnostics?.retryable !== undefined
        ? `retryable=${diagnostics.retryable}`
        : null,
      payload?.detail ? `detail=${payload.detail}` : null,
      interior ? `interior=${JSON.stringify(interior)}` : null,
    ].filter(Boolean);
    const error = new Error(`${label} failed HTTP ${response.status}: ${parts.join(" | ")}`);
    error.payload = payload;
    throw error;
  }
  return payload.result;
}

async function publicThreads(presentationBaseUrl, viewerOrigin) {
  const url = endpoint(presentationBaseUrl, "/api/threads");
  url.searchParams.set("limit", "200");
  const response = await fetch(url, {
    headers:{ Accept:"application/json", Origin:viewerOrigin },
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await responseJson(response, "Thread discovery");
  if (!response.ok || !Array.isArray(payload?.threads)) {
    throw new Error(`Thread discovery failed HTTP ${response.status}`);
  }
  return payload.threads;
}

function establishedAt(thread) {
  const parsed = Date.parse(thread?.currentPresent?.payload?.establishedAt ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function addRef(index, ref, kind) {
  if (typeof ref === "string" && ref !== "") index.set(ref, kind);
}

function developedEvidenceIndex(observatory) {
  const index = new Map();

  for (const assertion of observatory?.identityView?.assertions ?? []) {
    if (
      assertion?.isCurrentRevision !== false
      && ["current", "corrected"].includes(assertion?.status)
      && ["accepted_causal", "candidate_causal"].includes(assertion?.behavioralStatus)
    ) {
      addRef(index, assertion.assertionId, "identity");
    }
  }

  for (const state of observatory?.semanticStates ?? []) {
    addRef(index, state?.stateId, "semantic_state");
  }

  for (const memory of observatory?.memories ?? []) {
    const hasMeaning = typeof memory?.rememberedMeaning === "string" && memory.rememberedMeaning.trim() !== "";
    const hasContent = typeof memory?.rememberedContent === "string" && memory.rememberedContent.trim() !== "";
    if (
      ["current", "corrected"].includes(memory?.status)
      && memory?.accessibility !== "inaccessible"
      && memory?.retentionState !== "unavailable"
      && (hasMeaning || hasContent)
    ) {
      addRef(index, memory.memoryId, "memory");
    }
  }

  for (const relation of observatory?.lifeRelations ?? []) {
    if ((relation?.relationshipFacts ?? []).some((fact) => typeof fact === "string" && fact.trim() !== "")) {
      addRef(index, relation.relationId, "relationship");
    }
  }

  return index;
}

function currentMomentDigest(situation) {
  return sha256(JSON.stringify({
    phase:situation.phase,
    location:situation.location,
    mediatedContext:situation.mediatedContext ?? null,
    activity:situation.activity,
    reason:situation.reason,
  }));
}

function inspectCurrentPlanEvidence(threadCard, observatory, ensured) {
  const situation = observatory?.livedNow?.currentSituation;
  if (!situation || situation.situationId !== ensured.situationId) {
    throw new Error(`World Observatory current situation disagrees with LivedNow for ${threadCard.threadId}`);
  }
  const plan = observatory?.livedNow?.currentPersonalPlan ?? null;
  if (plan === null || !(situation.sourcePlanRefs ?? []).includes(plan.planId)) {
    throw new Error(`World Observatory cannot resolve the current personal Flight Plan for ${threadCard.threadId}`);
  }

  const available = developedEvidenceIndex(observatory);
  const cognition = plan.cognition ?? {};
  const selected = [...new Set(cognition.selectedEvidenceRefs ?? [])]
    .filter((ref) => available.has(ref))
    .sort()
    .map((ref) => Object.freeze({ ref, kind:available.get(ref) }));
  const cited = [...new Set(cognition.evidenceRefs ?? [])]
    .filter((ref) => available.has(ref))
    .sort()
    .map((ref) => Object.freeze({ ref, kind:available.get(ref) }));
  const historyCited = cited.filter((item) => item.kind === "memory" || item.kind === "relationship");

  return Object.freeze({
    threadId:threadCard.threadId,
    situationId:situation.situationId,
    establishedAt:situation.establishedAt,
    resolutionKind:situation.resolution?.kind ?? null,
    sourcePlanRefs:Object.freeze([...(situation.sourcePlanRefs ?? [])]),
    personalPlanId:plan.planId,
    cognitionProfile:cognition.implementationProfile ?? null,
    cognitionContextDigest:cognition.contextDigest ?? null,
    selectedDevelopedEvidenceRefs:Object.freeze(selected),
    developedEvidenceRefs:Object.freeze(cited),
    historyEvidenceRefs:Object.freeze(historyCited),
    evidenceFingerprint:sha256(JSON.stringify(cited)),
    currentMomentFingerprint:currentMomentDigest(situation),
  });
}

function sourceStoresFromObservatory(observatory) {
  const threadId=observatory.threadId;
  const thread=structuredClone(observatory.thread);
  const identityView=structuredClone(observatory.identityView);
  const semanticStates=structuredClone(observatory.semanticStates ?? []);
  const memories=structuredClone(observatory.memories ?? []);
  const lifeRelations=structuredClone(observatory.lifeRelations ?? []);
  const placeEpisodes=structuredClone(observatory.livedNow?.placeEpisodes ?? []);
  const worldPlaces=structuredClone(observatory.livedNow?.worldPlaces ?? []);
  return Object.freeze({
    worldStore:Object.freeze({
      getThread(candidate,{ required=true }={}){
        if(candidate===threadId)return structuredClone(thread);
        if(required)throw new TypeError(`Thread ${candidate} was not found`);
        return null;
      },
    }),
    identityStore:Object.freeze({
      getCurrentIdentityView(candidate){
        if(candidate!==threadId)throw new TypeError(`Thread ${candidate} was not found`);
        return structuredClone(identityView);
      },
    }),
    semanticStateStore:Object.freeze({
      listCurrentState(candidate){
        if(candidate!==threadId)throw new TypeError(`Thread ${candidate} was not found`);
        return structuredClone(semanticStates);
      },
    }),
    memoryStore:Object.freeze({
      listCurrentMemories(candidate,{ limit }={}){
        if(candidate!==threadId)throw new TypeError(`Thread ${candidate} was not found`);
        return structuredClone(limit===undefined?memories:memories.slice(0,limit));
      },
    }),
    situatedLifeStore:Object.freeze({
      listCurrentLifeRelations(candidate){
        if(candidate!==threadId)throw new TypeError(`Thread ${candidate} was not found`);
        return structuredClone(lifeRelations);
      },
      listCurrentPlaceEpisodes(candidate){
        if(candidate!==threadId)throw new TypeError(`Thread ${candidate} was not found`);
        return structuredClone(placeEpisodes);
      },
    }),
    livedNowStore:Object.freeze({
      getWorldPlace(candidate,reference,{ required=true }={}){
        if(candidate!==threadId)throw new TypeError(`Thread ${candidate} was not found`);
        const place=worldPlaces.find((item)=>item.ref===reference)??null;
        if(place!==null)return structuredClone(place);
        if(required)throw new TypeError(`shared World place ${reference} was not found`);
        return null;
      },
    }),
  });
}

function availablePlaceRefs(observatory,currentSituation){
  const refs=[];
  for(const episode of observatory.livedNow?.placeEpisodes ?? []){
    refs.push(placeEpisodeRevisionRef(episode));
  }
  for(const place of observatory.livedNow?.worldPlaces ?? [])refs.push(place.ref);
  if(currentSituation?.location?.kind==="place")refs.push(currentSituation.location.placeRef);
  return [...new Set(refs)];
}

function planSummary(plan){
  return Object.freeze(plan.stops.map((stop)=>Object.freeze({
    startAt:stop.startAt,
    endAt:stop.endAt,
    placeRef:stop.physicalPlaceRef,
    mediatedContext:stop.mediatedContext,
    activity:stop.activity,
    purpose:stop.purpose,
  })));
}

function planFingerprint(plan){
  return sha256(JSON.stringify(planSummary(plan)));
}

function stagingReasoningAdapter(environment){
  const manifest=parseDeploymentManifest(
    readFileSync(resolve(REPO_ROOT,"infra/deployments/environments/cloudflare.yaml"),"utf8"),
  );
  const world=resolveServiceDeployment(manifest,"world-kernel");
  return selectReasoningIntegration(world.integrations.livedNow,{ environment });
}

function writeX3Evidence(runId,evidence){
  const path=resolve(
    REPO_ROOT,
    ".fibre",
    "developmental-exploration",
    "x3",
    runId,
    "evidence.json",
  );
  mkdirSync(dirname(path),{ recursive:true,mode:0o700 });
  writeFileSync(path,`${JSON.stringify(evidence,null,2)}\n`,{ mode:0o600 });
  return path;
}

function writeEvidence(runId, evidence) {
  const path = resolve(REPO_ROOT, ".fibre", "interior-cognition", "lived-planning", runId, "evidence.json");
  mkdirSync(dirname(path), { recursive:true, mode:0o700 });
  writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`, { mode:0o600 });
  return path;
}

export async function runLivedPlanningStagingProof({
  environment = process.env,
  emit = (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
} = {}) {
  const privateToken = nonEmpty("FIBRE_PRIVATE_TOKEN", environment.FIBRE_PRIVATE_TOKEN);
  const sourceSha = sourceGitSha();
  const deploymentPath = resolve(REPO_ROOT, ".fibre", "cloudflare", "staging", "deployment.json");
  const deployment = jsonFile(deploymentPath);
  if (
    deployment.environment !== "staging"
    || deployment.sourceGitSha !== sourceSha
    || deployment.sourceTreeClean !== true
  ) {
    throw new Error("lived-planning proof requires staging deployment evidence for the exact clean checkout SHA");
  }

  const worldBaseUrl = remoteBase("staging World", deploymentByService(deployment, "world-kernel").baseUrl);
  const presentationBaseUrl = remoteBase("staging Thread Presentation", deploymentByService(deployment, "thread-presentation").baseUrl);
  const viewerOrigin = remoteBase("staging Viewer", deployment.externalViewerOrigin);
  const runId = `lived-planning-${Date.now().toString(36)}`;

  emit({
    event:"lived-planning-staging-start",
    runId,
    sourceGitSha:sourceSha,
    deploymentRecordedAt:deployment.recordedAt ?? null,
  });

  const discovered = await publicThreads(presentationBaseUrl, viewerOrigin);
  const ordered = [...discovered]
    .filter((thread) => !["genesis_candidate", "retired"].includes(thread?.lifecycleStatus))
    .sort((left, right) => establishedAt(right) - establishedAt(left));

  const rows = [];
  const skipped = [];
  for (const thread of ordered.slice(0, MAX_THREADS)) {
    try {
      const ensured = await privatePost(
        worldBaseUrl,
        "/internal/lived-now/ensure",
        privateToken,
        { threadId:thread.threadId },
        `LivedNow ${thread.threadId}`,
      );
      const payload = await privateGet(
        worldBaseUrl,
        `/internal/threads/${encodeURIComponent(thread.threadId)}/observatory`,
        privateToken,
        `World Observatory ${thread.threadId}`,
      );
      const row = inspectCurrentPlanEvidence(thread, payload?.observatory, ensured);
      rows.push(row);
      emit({
        event:"lived-planning-thread-inspected",
        threadId:row.threadId,
        selectedEvidenceCount:row.selectedDevelopedEvidenceRefs.length,
        developedEvidenceCount:row.developedEvidenceRefs.length,
        historyEvidenceCount:row.historyEvidenceRefs.length,
        evidenceKinds:[...new Set(row.developedEvidenceRefs.map((item) => item.kind))],
        cognitionProfile:row.cognitionProfile?.id ?? null,
      });
    } catch (error) {
      const reason = String(error?.message ?? error).slice(0, 1600);
      skipped.push(Object.freeze({ threadId:thread.threadId, reason }));
      emit({ event:"lived-planning-thread-skipped", threadId:thread.threadId, reason });
    }
  }

  const personalRows = rows.filter((row) => row.resolutionKind === "personal_plan");
  const attributed = personalRows.filter((row) => row.developedEvidenceRefs.length > 0);
  const historyAttributed = personalRows.filter((row) => row.historyEvidenceRefs.length > 0);
  const distinctHistoryEvidence = new Set(
    historyAttributed.map((row) => sha256(JSON.stringify(row.historyEvidenceRefs))),
  ).size;
  const distinctCurrentMoments = new Set(historyAttributed.map((row) => row.currentMomentFingerprint)).size;

  const evidence = Object.freeze({
    contract:"fibre-lived-planning-staging-proof-v0.1",
    environment:"staging",
    runId,
    sourceGitSha:sourceSha,
    deploymentRecordedAt:deployment.recordedAt ?? null,
    completedAt:new Date().toISOString(),
    summary:Object.freeze({
      discoveredThreadCount:discovered.length,
      inspectedThreadCount:rows.length,
      personalPlanThreadCount:personalRows.length,
      skippedThreadCount:skipped.length,
      developedEvidenceAttributedCount:attributed.length,
      historyEvidenceAttributedCount:historyAttributed.length,
      distinctHistoryEvidenceCount:distinctHistoryEvidence,
      distinctCurrentMomentCount:distinctCurrentMoments,
    }),
    threads:Object.freeze(rows),
    skipped:Object.freeze(skipped),
  });
  const evidencePath = writeEvidence(runId, evidence);

  emit({
    event:"lived-planning-staging-summary",
    inspectedThreadCount:rows.length,
    personalPlanThreadCount:personalRows.length,
    historyEvidenceAttributedCount:historyAttributed.length,
    distinctHistoryEvidenceCount:distinctHistoryEvidence,
    distinctCurrentMomentCount:distinctCurrentMoments,
    evidencePath,
  });

  if (rows.length < MIN_CURRENT_THREADS) {
    throw new Error(`lived-planning proof needs at least ${MIN_CURRENT_THREADS} current staging Threads; inspected ${rows.length}; evidence: ${evidencePath}`);
  }
  if (historyAttributed.length < MIN_HISTORY_ATTRIBUTED) {
    throw new Error(
      `lived-planning proof found only ${historyAttributed.length} personal-plan Thread(s) whose enacted plan cites autobiographical memory or relationship history; need ${MIN_HISTORY_ATTRIBUTED}; evidence: ${evidencePath}`,
    );
  }
  if (distinctHistoryEvidence < MIN_HISTORY_ATTRIBUTED) {
    throw new Error(`lived-planning proof did not observe differentiated history evidence across current personal plans; evidence: ${evidencePath}`);
  }
  if (distinctCurrentMoments < MIN_HISTORY_ATTRIBUTED) {
    throw new Error(`lived-planning proof observed history attribution but current intended life remained indistinguishable; evidence: ${evidencePath}`);
  }

  emit({
    event:"lived-planning-staging-complete",
    runId,
    sourceGitSha:sourceSha,
    inspectedThreadCount:rows.length,
    historyEvidenceAttributedCount:historyAttributed.length,
    distinctHistoryEvidenceCount:distinctHistoryEvidence,
    distinctCurrentMomentCount:distinctCurrentMoments,
    evidencePath,
  });
  return Object.freeze({ evidence, evidencePath });
}

export async function runDevelopmentalExplorationX3Staging({
  environment=process.env,
  emit=(event)=>process.stdout.write(`${JSON.stringify(event)}\n`),
}={}){
  const privateToken=nonEmpty("FIBRE_PRIVATE_TOKEN",environment.FIBRE_PRIVATE_TOKEN);
  const sourceSha=sourceGitSha();
  const deploymentPath=resolve(REPO_ROOT,".fibre","cloudflare","staging","deployment.json");
  const deployment=jsonFile(deploymentPath);
  if(
    deployment.environment!=="staging"
    || deployment.sourceGitSha!==sourceSha
    || deployment.sourceTreeClean!==true
  ){
    throw new Error("X3 requires staging deployment evidence for the exact clean checkout SHA");
  }

  const worldBaseUrl=remoteBase(
    "staging World",
    deploymentByService(deployment,"world-kernel").baseUrl,
  );
  const presentationBaseUrl=remoteBase(
    "staging Thread Presentation",
    deploymentByService(deployment,"thread-presentation").baseUrl,
  );
  const viewerOrigin=remoteBase("staging Viewer",deployment.externalViewerOrigin);
  const modelAdapter=stagingReasoningAdapter(environment);
  const runId=`developmental-x3-${Date.now().toString(36)}`;

  emit({
    event:"developmental-x3-start",
    runId,
    sourceGitSha:sourceSha,
    modelProvider:modelAdapter.provider,
    modelId:modelAdapter.modelId,
  });

  const discovered=await publicThreads(presentationBaseUrl,viewerOrigin);
  const ordered=[...discovered]
    .filter((thread)=>!["genesis_candidate","retired"].includes(thread?.lifecycleStatus))
    .sort((left,right)=>establishedAt(right)-establishedAt(left));

  const rows=[];
  const skipped=[];
  for(const threadCard of ordered.slice(0,X3_MAX_THREADS)){
    try{
      await privatePost(
        worldBaseUrl,
        "/internal/lived-now/ensure",
        privateToken,
        { threadId:threadCard.threadId },
        `LivedNow ${threadCard.threadId}`,
      );
      const payload=await privateGet(
        worldBaseUrl,
        `/internal/threads/${encodeURIComponent(threadCard.threadId)}/observatory`,
        privateToken,
        `World Observatory ${threadCard.threadId}`,
      );
      const observatory=payload?.observatory;
      const current=observatory?.livedNow?.currentSituation??null;
      const previous=observatory?.livedNow?.previousSituation??null;
      if(current===null||previous===null||current.location?.kind!=="place"){
        skipped.push(Object.freeze({
          threadId:threadCard.threadId,
          reason:"no comparable enacted at-place continuity",
        }));
        continue;
      }

      const interoception=explorationInteroceptionForLivedContinuity({
        thread:observatory.thread,
        previousSituation:previous,
        currentSituation:current,
      });
      if(interoception===null){
        skipped.push(Object.freeze({
          threadId:threadCard.threadId,
          reason:"current enacted life does not ground exploration pressure",
        }));
        continue;
      }

      const refs=availablePlaceRefs(observatory,current);
      if(refs.length<2){
        skipped.push(Object.freeze({
          threadId:threadCard.threadId,
          reason:"fewer than two authoritative planning opportunities",
        }));
        continue;
      }
      const startingPlaceRef=current.location.placeRef;
      if(!refs.includes(startingPlaceRef)){
        skipped.push(Object.freeze({
          threadId:threadCard.threadId,
          reason:"current place is absent from authoritative planning opportunities",
        }));
        continue;
      }

      const authoredAt=current.establishedAt;
      const horizonEnd=new Date(Date.parse(authoredAt)+(4*60*60*1000)).toISOString();
      const sourceReferences=observatory?.livedNow?.currentPersonalPlan?.sourceReferences ?? [];
      if(sourceReferences.length===0){
        skipped.push(Object.freeze({
          threadId:threadCard.threadId,
          reason:"current plan has no reusable World evidence",
        }));
        continue;
      }
      const sourceStores=sourceStoresFromObservatory(observatory);
      const common={
        threadId:threadCard.threadId,
        authoredAt,
        horizonEnd,
        availablePlaceRefs:refs,
        startingPlaceRef,
        sourceReferences,
        sourceStores,
        modelAdapter,
        worldTimeZone:observatory?.livedNow?.worldContext?.timeZone ?? null,
      };

      const baseline=await formPersonalLivedPlan(common);
      const exploratory=await formPersonalLivedPlan({
        ...common,
        interoception,
      });
      const changed=planFingerprint(baseline)!==planFingerprint(exploratory);
      const row=Object.freeze({
        threadId:threadCard.threadId,
        displayName:threadCard.displayName ?? observatory.thread?.identity?.name ?? null,
        previousSituationId:previous.situationId,
        currentSituationId:current.situationId,
        interoception:structuredClone(interoception),
        availablePlaceRefs:Object.freeze([...refs]),
        baseline:Object.freeze({
          plan:planSummary(baseline),
          provider:baseline.cognition.provider,
          modelId:baseline.cognition.modelId,
        }),
        exploratory:Object.freeze({
          plan:planSummary(exploratory),
          provider:exploratory.cognition.provider,
          modelId:exploratory.cognition.modelId,
        }),
        materiallyDifferent:changed,
      });
      rows.push(row);
      emit({
        event:"developmental-x3-thread",
        threadId:row.threadId,
        displayName:row.displayName,
        materiallyDifferent:changed,
        baseline:row.baseline.plan,
        exploratory:row.exploratory.plan,
      });
    }catch(error){
      const reason=String(error?.message??error).slice(0,1200);
      skipped.push(Object.freeze({ threadId:threadCard.threadId,reason }));
      emit({ event:"developmental-x3-thread-skipped",threadId:threadCard.threadId,reason });
    }
  }

  const evidence=Object.freeze({
    contract:"fibre-developmental-exploration-x3-live-v0.1",
    environment:"staging",
    runId,
    sourceGitSha:sourceSha,
    completedAt:new Date().toISOString(),
    model:Object.freeze({
      provider:modelAdapter.provider,
      modelId:modelAdapter.modelId,
    }),
    rule:"One baseline and one exploration planning call per eligible Thread; no persistence and no resampling.",
    summary:Object.freeze({
      discoveredThreadCount:discovered.length,
      inspectedThreadCount:Math.min(ordered.length,X3_MAX_THREADS),
      eligibleThreadCount:rows.length,
      materiallyDifferentCount:rows.filter((row)=>row.materiallyDifferent).length,
      skippedThreadCount:skipped.length,
    }),
    threads:Object.freeze(rows),
    skipped:Object.freeze(skipped),
  });
  const evidencePath=writeX3Evidence(runId,evidence);

  emit({
    event:"developmental-x3-summary",
    ...evidence.summary,
    evidencePath,
  });

  if(rows.length===0){
    throw new Error(
      `X3 found no currently eligible staging Thread with grounded exploration pressure and two authoritative opportunities; evidence: ${evidencePath}`,
    );
  }

  emit({
    event:"developmental-x3-complete",
    runId,
    eligibleThreadCount:rows.length,
    materiallyDifferentCount:evidence.summary.materiallyDifferentCount,
    evidencePath,
  });
  return Object.freeze({ evidence,evidencePath });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const developmental=process.argv.slice(2).includes("--exploration");
  const run=developmental
    ? runDevelopmentalExplorationX3Staging
    : runLivedPlanningStagingProof;
  run().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      event:developmental?"developmental-x3-failed":"lived-planning-staging-failed",
      errorName:error?.constructor?.name ?? "Error",
      message:String(error?.message ?? error).slice(0,1200),
    })}\n`);
    process.exitCode=1;
  });
}
