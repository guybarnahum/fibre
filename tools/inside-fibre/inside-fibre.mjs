import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { projectDailyRhythm } from "../../services/world-kernel/src/daily-rhythm.mjs";
import { INSIDE_FIBRE_VISITOR_WORK } from "../../services/world-kernel/src/inside-fibre-work.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const REQUEST_TIMEOUT_MS = 180_000;
const PREPARE_DURATION_MINUTES = 30;
const PREPARE_CREDITS = 12;
const PREPARE_LEAD_MINUTES = 60;
const PREPARE_SEARCH_HOURS = 24;
const PREPARE_SLOT_MINUTES = 30;
const LOCAL_START_HOUR = 7;
const LOCAL_END_HOUR = 22;
const PREFERRED_LOCAL_START_HOUR = 10;
const PREFERRED_LOCAL_END_HOUR = 18;
const GIT_SHA = /^[0-9a-f]{40}$/u;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function cleanText(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function rosterIdentity(thread, observatory) {
  const authoritativeName = cleanText(observatory?.thread?.identity?.name);
  const publicName = cleanText(thread?.displayName);
  return Object.freeze({
    displayName:authoritativeName ?? publicName ?? thread.threadId,
    publicDisplayName:publicName,
    nameProjectionStale:authoritativeName !== null && publicName !== null && authoritativeName !== publicName,
  });
}

function endpoint(baseUrl, pathname) {
  const url = new URL(baseUrl);
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  return url;
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

function deploymentEvidence() {
  return JSON.parse(readFileSync(
    resolve(REPO_ROOT, ".fibre", "cloudflare", "staging", "deployment.json"),
    "utf8",
  ));
}

function cleanLocalSource() {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd:REPO_ROOT,
    encoding:"utf8",
  }).trim().toLowerCase();
  const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
    cwd:REPO_ROOT,
    encoding:"utf8",
  }).trim();
  if (!GIT_SHA.test(sha)) throw new Error("Inside Fibre requires an exact Git SHA");
  if (status !== "") throw new Error("Inside Fibre prepare requires a clean working tree");
  return sha;
}

async function responseJson(response, label) {
  const payload = await response.json().catch(() => null);
  if (payload === null) throw new Error(`${label} returned non-JSON HTTP ${response.status}`);
  if (!response.ok) {
    throw new Error(`${label} failed HTTP ${response.status}: ${payload?.error?.code ?? payload?.error ?? "unknown"} ${payload?.detail ?? ""}`.trim());
  }
  return payload;
}

async function publicThreads(baseUrl, viewerOrigin, limit) {
  const url = endpoint(baseUrl, "/api/threads");
  url.searchParams.set("limit", String(limit));
  const response = await fetch(url, {
    headers:{ Accept:"application/json", Origin:viewerOrigin },
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await responseJson(response, "public Thread discovery");
  if (!Array.isArray(payload?.threads)) throw new Error("public Thread discovery returned no Threads");
  return payload.threads;
}

async function privateGet(baseUrl, pathname, privateToken, query, label) {
  const url = endpoint(baseUrl, pathname);
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers:{ Accept:"application/json", "x-fibre-private-token":privateToken },
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return responseJson(response, label);
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
  if (payload?.ok !== true) throw new Error(`${label} did not return ok`);
  return payload.result;
}

function activeCommitments(workState, atMs) {
  return (workState?.commitments ?? [])
    .map((commitment) => Object.freeze({
      ...commitment,
      startMs:Date.parse(commitment.startAt),
      endMs:Date.parse(commitment.endAt),
    }))
    .filter((commitment) => Number.isFinite(commitment.startMs) && Number.isFinite(commitment.endMs))
    .filter((commitment) => commitment.startMs <= atMs && atMs < commitment.endMs)
    .sort((left, right) => left.startMs - right.startMs);
}

function futureCommitments(workState, atMs) {
  return (workState?.commitments ?? [])
    .map((commitment) => Object.freeze({
      ...commitment,
      startMs:Date.parse(commitment.startAt),
      endMs:Date.parse(commitment.endAt),
    }))
    .filter((commitment) => Number.isFinite(commitment.startMs) && Number.isFinite(commitment.endMs))
    .filter((commitment) => atMs < commitment.startMs)
    .sort((left, right) => left.startMs - right.startMs);
}

function plannedStopAt(plan, at) {
  const instant = Date.parse(at);
  if (!Number.isFinite(instant)) return null;
  return (plan?.stops ?? []).find((stop) => {
    const start = Date.parse(stop?.startAt ?? "");
    const end = Date.parse(stop?.endAt ?? "");
    return Number.isFinite(start) && Number.isFinite(end) && start <= instant && instant < end;
  }) ?? null;
}

function commitmentIsEnacted(commitment, observatory, at) {
  const situation = observatory?.livedNow?.currentSituation ?? null;
  const plan = observatory?.livedNow?.currentPersonalPlan ?? null;
  if (
    situation === null
    || plan === null
    || situation.mediatedContext !== INSIDE_FIBRE_VISITOR_WORK.mediatedContext
    || situation.resolution?.observedDivergence === true
    || situation.resolution?.governingPlanRef !== plan.planId
    || !(plan.sourceReferences ?? []).includes(commitment.commitmentId)
    || !(situation.evidenceRefs ?? []).includes(commitment.commitmentId)
  ) return false;

  const stop = plannedStopAt(plan, at);
  return stop !== null
    && stop.mediatedContext === INSIDE_FIBRE_VISITOR_WORK.mediatedContext;
}

function publicScene(thread) {
  const present = thread?.currentPresent?.payload ?? null;
  if (present === null) return null;
  let place = null;
  if (present.location?.kind === "place") {
    place = present.location.place?.displayName ?? null;
  } else if (present.location?.kind === "transit") {
    const from = present.location.from?.displayName ?? "somewhere";
    const to = present.location.to?.displayName ?? "somewhere";
    place = `in transit from ${from} to ${to}`;
  }
  return Object.freeze({
    situationId:present.situationId ?? null,
    establishedAt:present.establishedAt ?? null,
    phase:present.phase ?? null,
    place,
    activity:present.activity ?? null,
  });
}

function currentPlannedStop(observatory, at) {
  return plannedStopAt(observatory?.livedNow?.currentPersonalPlan ?? null, at);
}

function displayScene({ thread, observatory, at }) {
  const stop = currentPlannedStop(observatory, at);
  if (stop !== null) {
    return Object.freeze({
      source:"plan",
      establishedAt:null,
      place:null,
      activity:stop.activity,
    });
  }
  const scene = publicScene(thread);
  return scene === null ? null : Object.freeze({
    source:"last_enacted",
    establishedAt:scene.establishedAt,
    place:scene.place,
    activity:scene.activity,
  });
}

function threadTimeZone(observatory) {
  const value = observatory?.livedNow?.worldContext?.timeZone;
  return typeof value === "string" && value !== "" ? value : null;
}

export function classifyInsideFibreRosterEntry({
  thread,
  workState,
  observatory,
  at = new Date().toISOString(),
}) {
  const atMs = Date.parse(at);
  if (!Number.isFinite(atMs)) throw new TypeError("roster time must be an ISO timestamp");
  const active = activeCommitments(workState, atMs);
  const scheduled = futureCommitments(workState, atMs);
  const available = active.find((commitment) => commitmentIsEnacted(commitment, observatory, at)) ?? null;
  const identity = rosterIdentity(thread, observatory);

  return Object.freeze({
    threadId:thread.threadId,
    displayName:identity.displayName,
    publicDisplayName:identity.publicDisplayName,
    nameProjectionStale:identity.nameProjectionStale,
    lifecycleStatus:thread.lifecycleStatus ?? null,
    fibreCredits:workState?.fibreCredits ?? null,
    birthCity:observatory?.thread?.identity?.birthCity ?? null,
    timeZone:threadTimeZone(observatory),
    dailyRhythm:projectDailyRhythm(observatory?.thread?.genome?.runtimeBaselines ?? {}),
    scene:displayScene({ thread, observatory, at }),
    available,
    activeCommitment:active[0] ?? null,
    scheduled:scheduled[0] ?? null,
  });
}

function localParts(value, timeZone) {
  if (typeof timeZone !== "string" || timeZone === "") return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year:"numeric",
      month:"2-digit",
      day:"2-digit",
      hour:"2-digit",
      minute:"2-digit",
      hourCycle:"h23",
    }).formatToParts(date);
    return Object.fromEntries(parts.map((part) => [part.type, part.value]));
  } catch {
    return null;
  }
}

function localMinuteOfDay(value, timeZone) {
  const parts = localParts(value, timeZone);
  if (parts === null) return null;
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  return Number.isInteger(hour) && Number.isInteger(minute) ? (hour * 60) + minute : null;
}

function localDateKey(value, timeZone) {
  const parts = localParts(value, timeZone);
  return parts === null ? null : `${parts.year}-${parts.month}-${parts.day}`;
}

function reasonableLocalWindow(startAt, endAt, timeZone) {
  const endProbe = new Date(Date.parse(endAt) - 1).toISOString();
  const startMinute = localMinuteOfDay(startAt, timeZone);
  const endMinute = localMinuteOfDay(endProbe, timeZone);
  if (startMinute === null || endMinute === null) return false;
  if (localDateKey(startAt, timeZone) !== localDateKey(endProbe, timeZone)) return false;
  return startMinute >= LOCAL_START_HOUR * 60
    && endMinute < LOCAL_END_HOUR * 60;
}

function localDisruptionScore(startAt, endAt, timeZone) {
  const startMinute = localMinuteOfDay(startAt, timeZone);
  const endProbe = new Date(Date.parse(endAt) - 1).toISOString();
  const endMinute = localMinuteOfDay(endProbe, timeZone);
  if (startMinute === null || endMinute === null) return Number.POSITIVE_INFINITY;
  const preferredStart = PREFERRED_LOCAL_START_HOUR * 60;
  const preferredEnd = PREFERRED_LOCAL_END_HOUR * 60;
  return Math.max(0, preferredStart - startMinute)
    + Math.max(0, endMinute - preferredEnd);
}

function candidateDisruptionScore(eligible, startAt, endAt, target) {
  return eligible
    .map((record) => localDisruptionScore(startAt, endAt, threadTimeZone(record.observatory)))
    .sort((left, right) => left - right)
    .slice(0, Math.min(target, eligible.length))
    .reduce((sum, score) => sum + score, 0);
}

function commitmentOverlaps(workState, startAt, endAt) {
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  return (workState?.commitments ?? []).some((commitment) => (
    start < Date.parse(commitment.endAt) && end > Date.parse(commitment.startAt)
  ));
}

function prepareEligible(record, startAt, endAt, at) {
  const observatory = record.observatory;
  const plan = observatory?.livedNow?.currentPersonalPlan ?? null;
  const timeZone = threadTimeZone(observatory);
  if (plan === null || timeZone === null) return false;
  if (plannedStopAt(plan, at) === null) return false;
  if (!reasonableLocalWindow(startAt, endAt, timeZone)) return false;
  if (commitmentOverlaps(record.workState, startAt, endAt)) return false;
  return true;
}

function ceilToSlot(valueMs, slotMinutes) {
  const slotMs = slotMinutes * 60_000;
  return Math.ceil(valueMs / slotMs) * slotMs;
}

export function selectPrepareWindow(records, {
  at,
  target = 3,
  durationMinutes = PREPARE_DURATION_MINUTES,
  leadMinutes = PREPARE_LEAD_MINUTES,
  searchHours = PREPARE_SEARCH_HOURS,
  slotMinutes = PREPARE_SLOT_MINUTES,
} = {}) {
  const nowMs = Date.parse(at);
  if (!Number.isFinite(nowMs)) throw new TypeError("prepare time must be an ISO timestamp");
  if (!Number.isSafeInteger(target) || target < 1) throw new TypeError("prepare target must be positive");

  const durationMs = durationMinutes * 60_000;
  const firstMs = ceilToSlot(nowMs + (leadMinutes * 60_000), slotMinutes);
  const lastMs = nowMs + (searchHours * 60 * 60_000);
  let bestMeetingTarget = null;
  let bestFallback = null;

  for (let startMs = firstMs; startMs + durationMs <= lastMs; startMs += slotMinutes * 60_000) {
    const startAt = new Date(startMs).toISOString();
    const endAt = new Date(startMs + durationMs).toISOString();
    const eligible = records.filter((record) => prepareEligible(record, startAt, endAt, at));
    if (eligible.length === 0) continue;
    const disruptionScore = candidateDisruptionScore(eligible, startAt, endAt, target);
    const candidate = Object.freeze({
      startAt,
      endAt,
      disruptionScore,
      eligible:Object.freeze(eligible),
    });

    if (
      bestFallback === null
      || eligible.length > bestFallback.eligible.length
      || (eligible.length === bestFallback.eligible.length
        && disruptionScore < bestFallback.disruptionScore)
    ) {
      bestFallback = candidate;
    }

    if (eligible.length < target) continue;
    if (
      bestMeetingTarget === null
      || disruptionScore < bestMeetingTarget.disruptionScore
      || (disruptionScore === bestMeetingTarget.disruptionScore
        && startMs < Date.parse(bestMeetingTarget.startAt))
    ) {
      bestMeetingTarget = candidate;
    }
  }
  return bestMeetingTarget ?? bestFallback;
}

function formatOperatorTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value ?? "—";
  return new Intl.DateTimeFormat(undefined, {
    month:"short",
    day:"numeric",
    hour:"numeric",
    minute:"2-digit",
    timeZoneName:"short",
  }).format(date);
}

function formatThreadTime(value, timeZone, { includeDate = false } = {}) {
  if (timeZone === null) return "timezone unavailable";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value ?? "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      ...(includeDate ? { month:"short", day:"numeric" } : {}),
      hour:"numeric",
      minute:"2-digit",
    }).format(date);
  } catch {
    return "timezone unavailable";
  }
}

function localWindowText(startAt, endAt, timeZone) {
  if (timeZone === null) return "local time unavailable";
  return `${formatThreadTime(startAt, timeZone, { includeDate:true })}–${formatThreadTime(endAt, timeZone)} · ${timeZone}`;
}

function sceneAge(establishedAt) {
  const time = Date.parse(establishedAt ?? "");
  if (!Number.isFinite(time)) return null;
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function sceneText(entry) {
  const place = entry.scene?.place;
  const activity = entry.scene?.activity;
  const base = place && activity ? `${place} · ${activity}` : (place ?? activity ?? "No lived scene");
  if (entry.scene?.source === "plan") return `${base} · planned now`;
  const age = sceneAge(entry.scene?.establishedAt);
  return age === null ? `${base} · last enacted` : `${base} · last enacted ${age}`;
}

function printEntry(entry, commitment = null, at = new Date().toISOString()) {
  process.stdout.write(`${entry.displayName}\n`);
  process.stdout.write(`  ${entry.threadId}\n`);
  if (entry.nameProjectionStale) process.stdout.write(`  Public name stale: ${entry.publicDisplayName}\n`);
  if (entry.birthCity) process.stdout.write(`  Born: ${entry.birthCity}\n`);
  process.stdout.write(`  Local: ${formatThreadTime(at, entry.timeZone)} · ${entry.timeZone ?? "unknown timezone"}\n`);
  if (entry.dailyRhythm) {
    process.stdout.write(
      `  Rhythm: wake ~${entry.dailyRhythm.preferredWakeAround} · sleep ~${entry.dailyRhythm.preferredSleepAround} · ${entry.dailyRhythm.sleepNeedHours}h\n`,
    );
  }
  process.stdout.write(`  ${sceneText(entry)}\n`);
  if (commitment !== null) {
    process.stdout.write(
      `  Work: ${localWindowText(commitment.startAt, commitment.endAt, entry.timeZone)} · ${commitment.fibreCredits} FC\n`,
    );
  }
}

function printSection(title, entries, commitmentOf, at) {
  process.stdout.write(`\n${title} (${entries.length})\n`);
  if (entries.length === 0) {
    process.stdout.write("  None\n");
    return;
  }
  entries.forEach((entry, index) => {
    process.stdout.write(`\n${index + 1}. `);
    printEntry(entry, commitmentOf(entry), at);
  });
}

function parsePositiveInt(name, value, { minimum = 1, maximum = 200 } = {}) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new TypeError(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return number;
}

function parseArgs(argv) {
  const [command = "scan", ...rest] = argv;
  if (!["scan", "prepare"].includes(command)) {
    throw new TypeError(`unsupported inside-fibre command ${command}`);
  }
  let limit = 50;
  let target = 3;
  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === "--limit") {
      limit = parsePositiveInt("--limit", rest[++index]);
    } else if (rest[index] === "--target" && command === "prepare") {
      target = parsePositiveInt("--target", rest[++index], { maximum:20 });
    } else {
      throw new TypeError(`unsupported ${command} argument ${rest[index]}`);
    }
  }
  return Object.freeze({ command, limit, target });
}

function stagingContext(environment, { requireExactDeployment = false } = {}) {
  const privateToken = nonEmpty("FIBRE_PRIVATE_TOKEN", environment.FIBRE_PRIVATE_TOKEN);
  const deployment = deploymentEvidence();
  if (requireExactDeployment) {
    const sha = cleanLocalSource();
    if (
      deployment.environment !== "staging"
      || deployment.sourceGitSha !== sha
      || deployment.sourceTreeClean !== true
    ) {
      throw new Error("Inside Fibre prepare requires this exact clean checkout deployed to staging");
    }
  }
  return Object.freeze({
    privateToken,
    deployment,
    worldBaseUrl:remoteBase(
      "staging World",
      deploymentByService(deployment, "world-kernel").baseUrl,
    ),
    presentationBaseUrl:remoteBase(
      "staging Thread Presentation",
      deploymentByService(deployment, "thread-presentation").baseUrl,
    ),
    viewerOrigin:remoteBase("staging Viewer", deployment.externalViewerOrigin),
  });
}

async function inspectThread({ worldBaseUrl, privateToken, thread, at }) {
  const [workPayload, observatoryPayload] = await Promise.all([
    privateGet(
      worldBaseUrl,
      "/internal/inside-fibre/work-state",
      privateToken,
      { threadId:thread.threadId },
      `work state ${thread.threadId}`,
    ),
    privateGet(
      worldBaseUrl,
      `/internal/threads/${encodeURIComponent(thread.threadId)}/observatory`,
      privateToken,
      {},
      `World Observatory ${thread.threadId}`,
    ),
  ]);
  const workState = workPayload?.result ?? null;
  const observatory = observatoryPayload?.observatory ?? null;
  return Object.freeze({
    thread,
    workState,
    observatory,
    entry:classifyInsideFibreRosterEntry({ thread, workState, observatory, at }),
  });
}

async function discoverEligiblePublicThreads(context, limit) {
  return (await publicThreads(context.presentationBaseUrl, context.viewerOrigin, limit))
    .filter((thread) => !["genesis_candidate", "retired"].includes(thread?.lifecycleStatus));
}

export async function scanInsideFibre({
  environment = process.env,
  argv = process.argv.slice(2),
} = {}) {
  const { limit } = parseArgs(argv);
  const context = stagingContext(environment);
  const at = new Date().toISOString();
  const discovered = await discoverEligiblePublicThreads(context, limit);

  const roster = [];
  const errors = [];
  for (const thread of discovered) {
    try {
      const record = await inspectThread({ ...context, thread, at });
      roster.push(record.entry);
    } catch (error) {
      errors.push(Object.freeze({
        threadId:thread.threadId,
        displayName:thread.displayName ?? thread.threadId,
        message:error instanceof Error ? error.message : String(error),
      }));
    }
  }

  const available = roster.filter((entry) => entry.available !== null);
  const scheduled = roster
    .filter((entry) => entry.available === null && entry.scheduled !== null)
    .sort((left, right) => Date.parse(left.scheduled.startAt) - Date.parse(right.scheduled.startAt));
  const activeNotEnacted = roster.filter(
    (entry) => entry.available === null && entry.activeCommitment !== null,
  );
  const other = roster.filter(
    (entry) => entry.available === null
      && entry.activeCommitment === null
      && entry.scheduled === null
      && entry.scene !== null,
  );

  process.stdout.write(
    `Inside Fibre · staging · operator ${formatOperatorTime(at)} · deployed ${context.deployment.sourceGitSha?.slice(0, 8) ?? "unknown"}\n`,
  );
  printSection("AVAILABLE NOW", available, (entry) => entry.available, at);
  printSection("SCHEDULED", scheduled, (entry) => entry.scheduled, at);
  printSection("ACTIVE COMMITMENT, NOT CURRENTLY ENACTED", activeNotEnacted, (entry) => entry.activeCommitment, at);
  printSection("OTHER LIVED THREADS", other, () => null, at);

  if (errors.length > 0) {
    process.stdout.write(`\nINSPECTION ERRORS (${errors.length})\n`);
    for (const entry of errors) process.stdout.write(`  ${entry.displayName}: ${entry.message}\n`);
  }

  return Object.freeze({ at, roster:Object.freeze(roster), errors:Object.freeze(errors) });
}

export async function prepareInsideFibre({
  environment = process.env,
  argv = process.argv.slice(2),
} = {}) {
  const { limit, target } = parseArgs(argv);
  const context = stagingContext(environment, { requireExactDeployment:true });
  const at = new Date().toISOString();
  const discovered = await discoverEligiblePublicThreads(context, limit);
  const records = [];
  const skipped = [];

  process.stdout.write(
    `Inside Fibre prepare · target ${target} · operator ${formatOperatorTime(at)}\n`,
  );

  for (const thread of discovered) {
    try {
      const record = await inspectThread({ ...context, thread, at });
      records.push(record);
    } catch (error) {
      skipped.push(Object.freeze({
        threadId:thread.threadId,
        displayName:thread.displayName ?? thread.threadId,
        reason:error instanceof Error ? error.message : String(error),
      }));
    }
  }

  const missingTimeZones = records.filter((record) => threadTimeZone(record.observatory) === null);
  if (missingTimeZones.length > 0) {
    throw new Error("Thread World timezone is unavailable; deploy the current World Observatory before prepare");
  }

  const window = selectPrepareWindow(records, { at, target });
  if (window === null) {
    process.stdout.write("\nNo shared locally-reasonable work window exists inside the current Flight Plan horizons.\n");
    return Object.freeze({ at, target, accepted:Object.freeze([]), declined:Object.freeze([]), skipped:Object.freeze(skipped), window:null });
  }

  process.stdout.write(
    `\nShared window · operator ${formatOperatorTime(window.startAt)}–${formatOperatorTime(window.endAt)}\n`
      + `Eligible Threads: ${window.eligible.length}\n`,
  );

  const accepted = [];
  const declined = [];
  const orderedEligible = [...window.eligible].sort((left, right) =>
    localDisruptionScore(window.startAt, window.endAt, threadTimeZone(left.observatory))
      - localDisruptionScore(window.startAt, window.endAt, threadTimeZone(right.observatory)));
  for (const record of orderedEligible) {
    if (accepted.length >= target) break;
    const timeZone = threadTimeZone(record.observatory);
    process.stdout.write(
      `\n${record.entry.displayName}\n`
      + `  Local window: ${localWindowText(window.startAt, window.endAt, timeZone)}\n`,
    );

    const offer = await privatePost(
      context.worldBaseUrl,
      "/internal/inside-fibre/work-offer",
      context.privateToken,
      {
        threadId:record.thread.threadId,
        startAt:window.startAt,
        endAt:window.endAt,
        fibreCredits:PREPARE_CREDITS,
      },
      `work offer ${record.thread.threadId}`,
    );

    if (offer.decision === "decline") {
      const result = Object.freeze({
        threadId:record.thread.threadId,
        displayName:record.entry.displayName,
        reason:offer.reason,
      });
      declined.push(result);
      process.stdout.write(`  DECLINE · ${offer.reason}\n`);
      continue;
    }

    if (offer.planning?.state !== "planned" || !offer.planning?.planId) {
      throw new Error(`accepted work for ${record.thread.threadId} did not become a Flight Plan`);
    }
    const result = Object.freeze({
      threadId:record.thread.threadId,
      displayName:record.entry.displayName,
      reason:offer.reason,
      commitmentId:offer.commitmentId,
      planId:offer.planning.planId,
    });
    accepted.push(result);
    process.stdout.write(`  ACCEPT · ${offer.reason ?? "previously accepted"}\n`);
  }

  process.stdout.write(
    `\nPrepared ${accepted.length}/${target} Threads · ${declined.length} declined · ${skipped.length} skipped\n`,
  );
  for (const result of accepted) {
    const record = records.find((candidate) => candidate.thread.threadId === result.threadId);
    process.stdout.write(
      `  ${result.displayName} · ${localWindowText(window.startAt, window.endAt, threadTimeZone(record?.observatory))}\n`,
    );
  }

  return Object.freeze({
    at,
    target,
    window:Object.freeze({ startAt:window.startAt, endAt:window.endAt }),
    accepted:Object.freeze(accepted),
    declined:Object.freeze(declined),
    skipped:Object.freeze(skipped),
  });
}

async function main() {
  const { command } = parseArgs(process.argv.slice(2));
  if (command === "prepare") return prepareInsideFibre();
  return scanInsideFibre();
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`inside-fibre failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
