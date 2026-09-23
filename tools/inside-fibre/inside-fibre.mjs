import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { INSIDE_FIBRE_VISITOR_WORK } from "../../services/world-kernel/src/inside-fibre-work.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const REQUEST_TIMEOUT_MS = 30_000;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
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

async function responseJson(response, label) {
  const payload = await response.json().catch(() => null);
  if (payload === null) throw new Error(`${label} returned non-JSON HTTP ${response.status}`);
  if (!response.ok) {
    throw new Error(`${label} failed HTTP ${response.status}: ${payload?.error?.code ?? payload?.error ?? "unknown"}`);
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

  return Object.freeze({
    threadId:thread.threadId,
    displayName:thread.displayName ?? thread.threadId,
    lifecycleStatus:thread.lifecycleStatus ?? null,
    fibreCredits:workState?.fibreCredits ?? null,
    scene:publicScene(thread),
    available,
    activeCommitment:active[0] ?? null,
    scheduled:scheduled[0] ?? null,
  });
}

function formatTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value ?? "—";
  return new Intl.DateTimeFormat(undefined, {
    hour:"numeric",
    minute:"2-digit",
    timeZoneName:"short",
  }).format(date);
}

function sceneText(entry) {
  const place = entry.scene?.place;
  const activity = entry.scene?.activity;
  if (place && activity) return `${place} · ${activity}`;
  return place ?? activity ?? "No public current scene";
}

function printEntry(entry, commitment = null) {
  process.stdout.write(`${entry.displayName}\n`);
  process.stdout.write(`  ${entry.threadId}\n`);
  process.stdout.write(`  ${sceneText(entry)}\n`);
  if (commitment !== null) {
    process.stdout.write(
      `  ${formatTime(commitment.startAt)}–${formatTime(commitment.endAt)} · ${commitment.fibreCredits} FC\n`,
    );
  }
}

function printSection(title, entries, commitmentOf) {
  process.stdout.write(`\n${title} (${entries.length})\n`);
  if (entries.length === 0) {
    process.stdout.write("  None\n");
    return;
  }
  entries.forEach((entry, index) => {
    process.stdout.write(`\n${index + 1}. `);
    printEntry(entry, commitmentOf(entry));
  });
}

function parseArgs(argv) {
  const [command = "scan", ...rest] = argv;
  if (command !== "scan") throw new TypeError(`unsupported inside-fibre command ${command}`);
  let limit = 50;
  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === "--limit") {
      limit = Number(rest[++index]);
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) {
        throw new TypeError("--limit must be an integer from 1 to 200");
      }
    } else {
      throw new TypeError(`unsupported scan argument ${rest[index]}`);
    }
  }
  return Object.freeze({ command, limit });
}

export async function scanInsideFibre({
  environment = process.env,
  argv = process.argv.slice(2),
} = {}) {
  const { limit } = parseArgs(argv);
  const privateToken = nonEmpty("FIBRE_PRIVATE_TOKEN", environment.FIBRE_PRIVATE_TOKEN);
  const deployment = JSON.parse(readFileSync(
    resolve(REPO_ROOT, ".fibre", "cloudflare", "staging", "deployment.json"),
    "utf8",
  ));
  const worldBaseUrl = remoteBase(
    "staging World",
    deploymentByService(deployment, "world-kernel").baseUrl,
  );
  const presentationBaseUrl = remoteBase(
    "staging Thread Presentation",
    deploymentByService(deployment, "thread-presentation").baseUrl,
  );
  const viewerOrigin = remoteBase("staging Viewer", deployment.externalViewerOrigin);
  const at = new Date().toISOString();

  const discovered = (await publicThreads(presentationBaseUrl, viewerOrigin, limit))
    .filter((thread) => !["genesis_candidate", "retired"].includes(thread?.lifecycleStatus));

  const roster = [];
  const errors = [];
  for (const thread of discovered) {
    try {
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
      roster.push(classifyInsideFibreRosterEntry({
        thread,
        workState:workPayload?.result ?? null,
        observatory:observatoryPayload?.observatory ?? null,
        at,
      }));
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
    `Inside Fibre · staging · ${formatTime(at)} · deployed ${deployment.sourceGitSha?.slice(0, 8) ?? "unknown"}\n`,
  );
  printSection("AVAILABLE NOW", available, (entry) => entry.available);
  printSection("SCHEDULED", scheduled, (entry) => entry.scheduled);
  printSection("ACTIVE COMMITMENT, NOT CURRENTLY ENACTED", activeNotEnacted, (entry) => entry.activeCommitment);
  printSection("OTHER LIVED THREADS", other, () => null);

  if (errors.length > 0) {
    process.stdout.write(`\nINSPECTION ERRORS (${errors.length})\n`);
    for (const entry of errors) process.stdout.write(`  ${entry.displayName}: ${entry.message}\n`);
  }

  return Object.freeze({ at, roster:Object.freeze(roster), errors:Object.freeze(errors) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  scanInsideFibre().catch((error) => {
    process.stderr.write(`inside-fibre scan failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
