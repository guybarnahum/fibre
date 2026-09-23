import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const REQUEST_TIMEOUT_MS = 180_000;
const MAX_CANDIDATES = 12;
const SHIFT_LEAD_MS = 5_000;
const SHIFT_DURATION_MS = 20 * 60_000;
const COMPENSATION_FC = 12;
const GIT_SHA = /^[0-9a-f]{40}$/u;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function jsonFile(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sourceGitSha() {
  const value = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd:REPO_ROOT,
    encoding:"utf8",
  }).trim().toLowerCase();
  if (!GIT_SHA.test(value)) throw new Error("Inside Fibre staging proof requires an exact Git SHA");
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
    || ["localhost","127.0.0.1","::1"].includes(url.hostname)
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
    throw new Error(`${label} failed HTTP ${response.status}: ${payload?.error ?? "unknown"} ${payload?.detail ?? ""}`.trim());
  }
  return payload.result;
}

async function privateGet(baseUrl, pathname, privateToken, query, label) {
  const url = endpoint(baseUrl, pathname);
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers:{ Accept:"application/json", "x-fibre-private-token":privateToken },
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await responseJson(response, label);
  if (!response.ok) {
    throw new Error(`${label} failed HTTP ${response.status}: ${payload?.error?.code ?? payload?.error ?? "unknown"}`);
  }
  return payload;
}

async function publicThreads(presentationBaseUrl, viewerOrigin) {
  const url = endpoint(presentationBaseUrl, "/api/threads");
  url.searchParams.set("limit", "200");
  const response = await fetch(url, {
    headers:{ Accept:"application/json", Origin:viewerOrigin },
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await responseJson(response, "public Thread discovery");
  if (!response.ok || !Array.isArray(payload?.threads)) {
    throw new Error(`public Thread discovery failed HTTP ${response.status}`);
  }
  return payload.threads;
}

async function publicMeetSelection(presentationBaseUrl, viewerOrigin, threadId, runId) {
  const url = endpoint(presentationBaseUrl, "/api/threads/meet");
  url.searchParams.set("q", threadId);
  url.searchParams.set("seed", runId);
  const response = await fetch(url, {
    headers:{ Accept:"application/json", Origin:viewerOrigin },
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await responseJson(response, "public committed Meet selection");
  if (!response.ok) throw new Error(`public committed Meet selection failed HTTP ${response.status}`);
  return payload;
}

async function publicMeetEntry(presentationBaseUrl, viewerOrigin, threadId) {
  const response = await fetch(
    endpoint(presentationBaseUrl, `/api/threads/${encodeURIComponent(threadId)}/meet`),
    {
      method:"POST",
      headers:{ Accept:"application/json", Origin:viewerOrigin },
      signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  const payload = await responseJson(response, "public Meet entry");
  if (!response.ok) throw new Error(`public Meet entry failed HTTP ${response.status}: ${payload?.error ?? "unknown"}`);
  return payload;
}

async function publicEncounter(presentationBaseUrl, viewerOrigin, threadId, situationId) {
  const response = await fetch(
    endpoint(presentationBaseUrl, `/api/threads/${encodeURIComponent(threadId)}/encounter`),
    {
      method:"POST",
      headers:{
        Accept:"application/json",
        "content-type":"application/json",
        Origin:viewerOrigin,
      },
      body:JSON.stringify({
        situationId,
        utterance:"Hi — I’m visiting Inside Fibre. What were you doing before I arrived?",
      }),
      signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  const payload = await responseJson(response, "public visitor encounter");
  if (!response.ok) throw new Error(`public visitor encounter failed HTTP ${response.status}: ${payload?.error ?? "unknown"}`);
  return payload;
}

function newestFirst(threads) {
  return [...threads].sort((left, right) => {
    const a = Date.parse(left?.currentPresent?.payload?.establishedAt ?? "") || 0;
    const b = Date.parse(right?.currentPresent?.payload?.establishedAt ?? "") || 0;
    return b - a;
  });
}

function visitorStoryAfter(observatory, priorIds, threadId) {
  return (observatory?.encounterStories ?? []).find((story) => {
    if (priorIds.has(story?.encounterId)) return false;
    if (story?.attention?.outcome !== "noticed") return false;
    const beats = story?.story?.beats ?? [];
    return beats.length >= 2
      && beats[0]?.actorThreadId === null
      && beats.some((beat) => beat?.actorThreadId === threadId);
  }) ?? null;
}

function writeEvidence(runId, evidence) {
  const path = resolve(REPO_ROOT, ".fibre", "inside-fibre", "staging", runId, "evidence.json");
  mkdirSync(dirname(path), { recursive:true, mode:0o700 });
  writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`, { mode:0o600 });
  return path;
}

export async function runInsideFibreStagingAcceptance({
  environment = process.env,
  emit = (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
} = {}) {
  const privateToken = nonEmpty("FIBRE_PRIVATE_TOKEN", environment.FIBRE_PRIVATE_TOKEN);
  const sourceSha = sourceGitSha();
  const deployment = jsonFile(resolve(REPO_ROOT, ".fibre", "cloudflare", "staging", "deployment.json"));
  if (
    deployment.environment !== "staging"
    || deployment.sourceGitSha !== sourceSha
    || deployment.sourceTreeClean !== true
  ) {
    throw new Error("Inside Fibre staging acceptance requires exact clean staging deployment evidence for this checkout");
  }

  const worldBaseUrl = remoteBase(
    "staging World",
    deploymentByService(deployment, "world-kernel").baseUrl,
  );
  const presentationBaseUrl = remoteBase(
    "staging Thread Presentation",
    deploymentByService(deployment, "thread-presentation").baseUrl,
  );
  const viewerOrigin = remoteBase("staging Viewer", deployment.externalViewerOrigin);
  const runId = `inside-fibre-${Date.now().toString(36)}`;

  emit({ event:"inside-fibre-staging-start", runId, sourceGitSha:sourceSha });

  const discovered = newestFirst(await publicThreads(presentationBaseUrl, viewerOrigin))
    .filter((thread) => !["genesis_candidate","retired"].includes(thread?.lifecycleStatus))
    .slice(0, MAX_CANDIDATES);

  const decisions = [];
  let accepted = null;

  for (const thread of discovered) {
    const ensured = await privatePost(
      worldBaseUrl,
      "/internal/lived-now/ensure",
      privateToken,
      { threadId:thread.threadId },
      `LivedNow ${thread.threadId}`,
    );

    if (ensured?.present?.phase !== "at_place") {
      const skipped = Object.freeze({
        threadId:thread.threadId,
        displayName:thread.displayName ?? null,
        outcome:"not_offered",
        reason:"current situation is not at_place",
      });
      decisions.push(skipped);
      emit({ event:"inside-fibre-work-candidate", ...skipped });
      continue;
    }

    const beforeState = await privateGet(
      worldBaseUrl,
      "/internal/inside-fibre/work-state",
      privateToken,
      { threadId:thread.threadId },
      `work state before ${thread.threadId}`,
    );

    const offeredAtMs = Date.now();
    const startAt = new Date(offeredAtMs + SHIFT_LEAD_MS).toISOString();
    const endAt = new Date(offeredAtMs + SHIFT_LEAD_MS + SHIFT_DURATION_MS).toISOString();
    const offer = await privatePost(
      worldBaseUrl,
      "/internal/inside-fibre/work-offer",
      privateToken,
      {
        threadId:thread.threadId,
        startAt,
        endAt,
        fibreCredits:COMPENSATION_FC,
      },
      `work offer ${thread.threadId}`,
    );

    const decision = Object.freeze({
      threadId:thread.threadId,
      displayName:thread.displayName ?? null,
      outcome:offer.decision,
      reason:offer.reason,
      offerId:offer.offerId,
      commitmentId:offer.commitmentId,
      planningState:offer.planning?.state ?? null,
      startAt:offer.startAt,
      endAt:offer.endAt,
      fibreCredits:offer.fibreCredits,
      balanceBefore:beforeState?.result?.fibreCredits ?? null,
    });
    decisions.push(decision);
    emit({ event:"inside-fibre-work-decision", ...decision });

    if (offer.decision === "decline") continue;
    if (offer.planning?.state !== "planned" || !offer.planning?.planId) {
      throw new Error(`accepted work for ${thread.threadId} did not become a Flight Plan`);
    }
    accepted = Object.freeze({ thread, offer, balanceBefore:beforeState.result.fibreCredits });
    break;
  }

  if (accepted === null) {
    const evidence = Object.freeze({
      contract:"fibre-inside-fibre-staging-acceptance-v0.1",
      environment:"staging",
      status:"no_acceptor",
      runId,
      sourceGitSha:sourceSha,
      completedAt:new Date().toISOString(),
      compensationFibreCredits:COMPENSATION_FC,
      decisions:Object.freeze(decisions),
    });
    const evidencePath = writeEvidence(runId, evidence);
    emit({
      event:"inside-fibre-staging-no-acceptor",
      runId,
      decisionCount:decisions.length,
      evidencePath,
    });
    return Object.freeze({ evidence, evidencePath });
  }

  const startMs = Date.parse(accepted.offer.startAt);
  if (Date.now() < startMs) await delay(startMs - Date.now() + 100);

  const selected = await publicMeetSelection(
    presentationBaseUrl,
    viewerOrigin,
    accepted.thread.threadId,
    runId,
  );
  if (selected?.thread?.threadId !== accepted.thread.threadId) {
    throw new Error("the accepted Thread was not discoverable through committed public Meet selection");
  }
  if (
    selected?.availability?.startAt !== accepted.offer.startAt
    || selected?.availability?.endAt !== accepted.offer.endAt
  ) {
    throw new Error("public Meet selection availability disagrees with the accepted work window");
  }

  const entry = await publicMeetEntry(
    presentationBaseUrl,
    viewerOrigin,
    accepted.thread.threadId,
  );
  const situationId = entry?.currentPresent?.payload?.situationId;
  if (typeof situationId !== "string" || situationId === "") {
    throw new Error("public Meet entry did not return an admitted situation");
  }
  if (
    entry?.availability?.startAt !== accepted.offer.startAt
    || entry?.availability?.endAt !== accepted.offer.endAt
  ) {
    throw new Error("public Meet entry availability disagrees with the accepted work window");
  }

  const beforeEncounterPayload = await privateGet(
    worldBaseUrl,
    `/internal/threads/${encodeURIComponent(accepted.thread.threadId)}/observatory`,
    privateToken,
    {},
    "World Observatory before visitor encounter",
  );
  const priorStoryIds = new Set(
    (beforeEncounterPayload?.observatory?.encounterStories ?? []).map((story) => story.encounterId),
  );

  const encounter = await publicEncounter(
    presentationBaseUrl,
    viewerOrigin,
    accepted.thread.threadId,
    situationId,
  );
  if (
    encounter?.situationId !== situationId
    || typeof encounter?.responseText !== "string"
    || encounter.responseText.trim() === ""
  ) {
    throw new Error("public visitor encounter did not return a response from the admitted scene");
  }

  const afterEncounterPayload = await privateGet(
    worldBaseUrl,
    `/internal/threads/${encodeURIComponent(accepted.thread.threadId)}/observatory`,
    privateToken,
    {},
    "World Observatory after visitor encounter",
  );
  const visitorStory = visitorStoryAfter(
    afterEncounterPayload?.observatory,
    priorStoryIds,
    accepted.thread.threadId,
  );
  if (visitorStory === null) {
    throw new Error("public visitor encounter did not produce a new noticed Encounter Story");
  }

  const afterState = await privateGet(
    worldBaseUrl,
    "/internal/inside-fibre/work-state",
    privateToken,
    { threadId:accepted.thread.threadId },
    "work state after visitor encounter",
  );
  const balanceAfter = afterState?.result?.fibreCredits;
  if (balanceAfter !== accepted.balanceBefore + accepted.offer.fibreCredits) {
    throw new Error("completed visitor work did not produce the agreed Fibre Credit consequence");
  }

  const evidence = Object.freeze({
    contract:"fibre-inside-fibre-staging-acceptance-v0.1",
    environment:"staging",
    status:"closed",
    runId,
    sourceGitSha:sourceSha,
    completedAt:new Date().toISOString(),
    decisions:Object.freeze(decisions),
    acceptedWork:Object.freeze({
      threadId:accepted.thread.threadId,
      displayName:accepted.thread.displayName ?? null,
      offerId:accepted.offer.offerId,
      commitmentId:accepted.offer.commitmentId,
      planId:accepted.offer.planning.planId,
      startAt:accepted.offer.startAt,
      endAt:accepted.offer.endAt,
      fibreCredits:accepted.offer.fibreCredits,
    }),
    publicMeeting:Object.freeze({
      selectedThreadId:selected.thread.threadId,
      situationId,
      responseText:encounter.responseText,
      encounterStoryId:visitorStory.encounterId,
      experienceOutcome:visitorStory.attention.outcome,
    }),
    economy:Object.freeze({
      balanceBefore:accepted.balanceBefore,
      balanceAfter,
      earned:balanceAfter - accepted.balanceBefore,
    }),
  });
  const evidencePath = writeEvidence(runId, evidence);
  emit({
    event:"inside-fibre-staging-complete",
    runId,
    threadId:accepted.thread.threadId,
    encounterStoryId:visitorStory.encounterId,
    balanceBefore:accepted.balanceBefore,
    balanceAfter,
    evidencePath,
  });
  return Object.freeze({ evidence, evidencePath });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runInsideFibreStagingAcceptance().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      event:"inside-fibre-staging-failed",
      errorName:error?.constructor?.name ?? "Error",
      message:String(error?.message ?? error).slice(0, 1200),
    })}\n`);
    process.exitCode = 1;
  });
}
