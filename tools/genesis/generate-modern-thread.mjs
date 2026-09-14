import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { genesisSexForThread } from "#services/birth-center/src/genesis-sex.mjs";
import {
  GENESIS_DEVELOPMENT_REQUEST_VERSION,
  buildGenesisDevelopmentPlan,
} from "#services/birth-center/src/genesis-development-plan.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DEFAULT_TIMEOUT_MS = 900_000;

function required(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function fixture(path) {
  return JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
}

function deployment(repoRoot) {
  const path = resolve(repoRoot, ".fibre", "cloudflare", "staging", "deployment.json");
  const record = JSON.parse(readFileSync(path, "utf8"));
  if (record?.environment !== "staging") throw new Error("deployment evidence is not staging");
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  if (record.sourceGitSha !== head) {
    throw new Error(`staging deployment ${record.sourceGitSha} does not match current checkout ${head}`);
  }
  return record;
}

function serviceBase(record, serviceId) {
  const matches = (record.deployments ?? []).filter((item) => item?.serviceId === serviceId);
  if (matches.length !== 1) throw new Error(`deployment evidence must contain exactly one ${serviceId}`);
  return required(`${serviceId} baseUrl`, matches[0].baseUrl).replace(/\/$/u, "");
}

function modernRequest({ requestId, requestedAt, slotOrdinal }) {
  const cohort = fixture("fixtures/genesis/pr39/development-cohort-v1.json");
  const identities = fixture("fixtures/genesis/pr39/subject-identities-v1.json");
  const slot = cohort.slots[slotOrdinal - 1];
  const subjectIdentity = identities.slots.find(({ slot: ordinal }) => ordinal === slotOrdinal);
  if (!slot || !subjectIdentity) throw new TypeError(`modern Genesis slot ${slotOrdinal} is unavailable`);
  const worldSpec = fixture(slot.worldSpecPath);
  const genome = fixture(slot.genomePath);
  return Object.freeze({
    requestVersion: GENESIS_DEVELOPMENT_REQUEST_VERSION,
    requestId,
    requestedAt,
    worldSpec,
    subjectIdentity: Object.freeze({
      femaleName: subjectIdentity.femaleName,
      maleName: subjectIdentity.maleName,
      birthCity: subjectIdentity.birthCity,
    }),
    genomeValues: genome.loci.map((locus) => locus.value),
    participants: slot.participants.filter((participant) => !participant.factualRoles.includes("subject")),
    placeAffordances: slot.placeAffordances,
    bornAt: cohort.entry.bornAt,
    chronologyEndsAt: cohort.entry.chronologyEndsAt,
    timeZone: slot.timeZone,
  });
}

async function json(response, label) {
  const payload = await response.json().catch(() => null);
  if (payload === null) throw new Error(`${label} returned non-JSON HTTP ${response.status}`);
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status} ${JSON.stringify(payload)}`);
  return payload;
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
  }), "modern Genesis birth");
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
  throw new Error(`modern Thread convergence timed out; latest=${JSON.stringify(latest)}`);
}

function assertModernReference({ body, plan, world, presentation }) {
  const identity = world.inspection?.authoritativeThread?.identity;
  if (!identity) throw new Error("World inspection lacks authoritative Thread identity");
  const expectedSex = genesisSexForThread({ threadId: plan.threadId });
  const expectedName = expectedSex === "female" ? body.subjectIdentity.femaleName : body.subjectIdentity.maleName;
  if (identity.name !== expectedName || identity.name === "Fibre Thread") throw new Error("modern Thread proper name did not persist");
  if (identity.sex !== expectedSex) throw new Error("modern Thread sex did not persist");
  if (identity.birthDate !== body.bornAt.slice(0, 10)) throw new Error("modern Thread birth date did not persist");
  if (identity.birthCity !== body.subjectIdentity.birthCity) throw new Error("modern Thread birth city did not persist");
  if (JSON.stringify(identity.languages) !== JSON.stringify(body.worldSpec.languages)) throw new Error("modern Thread language context did not persist");
  if (!Array.isArray(identity.culture) || identity.culture[0] !== `${body.subjectIdentity.birthCity} formative context`) throw new Error("modern Thread cultural context did not persist");

  const publicPresentation = presentation?.snapshot?.presentation;
  if (publicPresentation?.subject?.displayName !== expectedName) throw new Error("public Presentation does not expose modern Thread name");
  if (publicPresentation.subject.birthDate !== body.bornAt.slice(0, 10)) throw new Error("public Presentation does not expose birth date");
  if (JSON.stringify(publicPresentation.subject.languages) !== JSON.stringify(body.worldSpec.languages)) throw new Error("public Presentation does not expose languages");
  if (!(publicPresentation.places ?? []).some(({ displayName }) => displayName === body.subjectIdentity.birthCity)) {
    throw new Error("public Presentation does not expose authoritative birth place");
  }
  if (!Array.isArray(publicPresentation.origins) || publicPresentation.origins.length === 0) {
    throw new Error("public Presentation does not expose cultural context");
  }
  return Object.freeze({ expectedName, expectedSex, identity });
}

async function main() {
  const privateToken = required("FIBRE_PRIVATE_TOKEN", process.env.FIBRE_PRIVATE_TOKEN);
  const slotOrdinal = Number.parseInt(process.env.FIBRE_GENESIS_E2E_SLOT ?? "1", 10);
  if (!Number.isSafeInteger(slotOrdinal) || slotOrdinal < 1) throw new TypeError("FIBRE_GENESIS_E2E_SLOT must be a positive integer");
  const requestId = process.env.FIBRE_GENESIS_REQUEST_ID?.trim() || `genesis-modern-${Date.now().toString(36)}`;
  const requestedAt = process.env.FIBRE_GENESIS_REQUESTED_AT?.trim() || new Date().toISOString();
  const timeoutMs = Number.parseInt(process.env.FIBRE_GENESIS_E2E_CONVERGENCE_WAIT_MS ?? String(DEFAULT_TIMEOUT_MS), 10);
  const body = modernRequest({ requestId, requestedAt, slotOrdinal });
  const plan = buildGenesisDevelopmentPlan(body);
  const deployed = deployment(REPO_ROOT);
  const birthCenter = serviceBase(deployed, "birth-center");
  const worldKernel = serviceBase(deployed, "world-kernel");
  const threadPresentation = serviceBase(deployed, "thread-presentation");
  const viewerOrigin = required("staging viewer origin", deployed.externalViewerOrigin);

  process.stdout.write(`${JSON.stringify({ event: "modern-thread-birth-start", requestId, genesisId: plan.genesisId, threadId: plan.threadId })}\n`);

  const birth = await poll(
    async () => (await submit({ baseUrl: birthCenter, privateToken, body, timeoutMs })).development,
    (development) => development?.status === "published",
    { timeoutMs },
  );
  const world = await poll(
    () => inspectWorld({ baseUrl: worldKernel, privateToken, plan, timeoutMs }),
    (result) => result?.inspection?.authoritativeThread?.exists === true && result?.inspection?.genesis?.threadPublished === true,
    { timeoutMs },
  );
  const presentation = await poll(
    () => inspectPresentation({ baseUrl: threadPresentation, viewerOrigin, threadId: plan.threadId, timeoutMs }),
    (result) => result?.pointer?.threadId === plan.threadId,
    { timeoutMs },
  );
  const validated = assertModernReference({ body, plan, world, presentation });

  process.stdout.write(`${JSON.stringify({
    event: "modern-thread-birth-complete",
    requestId,
    genesisId: plan.genesisId,
    threadId: plan.threadId,
    fibreIdentityNumber: birth.fibreIdentityNumber,
    name: validated.expectedName,
    sex: validated.expectedSex,
    birthDate: validated.identity.birthDate,
    birthCity: validated.identity.birthCity,
    languages: validated.identity.languages,
    memoryRefCount: world.inspection.authoritativeThread.memoryRefCount,
    worldSpecId: body.worldSpec.worldSpecId,
  })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    event: "modern-thread-birth-failed",
    errorName: error?.constructor?.name ?? "Error",
    message: error?.message ?? String(error),
  })}\n`);
  process.exitCode = 1;
});
