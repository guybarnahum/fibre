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
import {
  composeModernSubjectIdentity,
  freshModernParticipants,
  selectModernBirthSlot,
} from "./modern-birth-material.mjs";
import {
  parseModernGenesisArgs,
  resolveModernWorldSelection,
  selectDefaultModernBirthplace,
} from "./modern-genesis-selection.mjs";

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

function modernRequest({ requestId, requestedAt, cohort, selection, sexSelection }) {
  const genome = fixture(selection.genomePath);
  const composedIdentity = composeModernSubjectIdentity({ requestId, material: selection.material });
  const subjectIdentity = Object.freeze({
    ...composedIdentity,
    ...(sexSelection === null ? {} : { sex: sexSelection }),
    ...(selection.selector === null ? {} : {
      place: Object.freeze({
        country: selection.selector.country,
        city: selection.selector.city,
      }),
    }),
    ...(selection.heritage === null ? {} : { heritage: selection.heritage.display }),
    ...(typeof selection.material?.appearanceContext === "string" && selection.material.appearanceContext.trim() !== ""
      ? { appearanceContext: selection.material.appearanceContext.trim() }
      : {}),
  });
  return Object.freeze({
    requestVersion: GENESIS_DEVELOPMENT_REQUEST_VERSION,
    requestId,
    requestedAt,
    worldSpec: selection.worldSpec,
    subjectIdentity,
    genomeValues: genome.loci.map((locus) => locus.value),
    participants: freshModernParticipants({ requestId, participants: selection.participants }),
    placeAffordances: selection.placeAffordances,
    bornAt: cohort.entry.bornAt,
    chronologyEndsAt: cohort.entry.chronologyEndsAt,
    timeZone: selection.timeZone,
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
  const expectedSex = body.subjectIdentity.sex ?? genesisSexForThread({ threadId: plan.threadId });
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

function usage() {
  return [
    "Modern Genesis staging birth",
    "",
    "  npm run genesis:modern:staging -- --sex=female --place=Israel/Jerusalem --heritage=\"Yemeni Jewish\"",
    "  npm run genesis:modern:staging -- --sex=male --place=Germany/Berlin --heritage=Turkish",
    "  npm run genesis:modern:staging -- --new-world --sex=female --place=Brazil/Recife",
    "",
    "Keys: --sex=female|male, --place=Country/City, --heritage=Family Heritage.",
    "Legacy shorthand --female/--male and --Country/City remains accepted.",
    "Sex is optional; without it Fibre derives sex from the Thread identity.",
    "Place is optional; without it Fibre deterministically selects a globally distributed anchor birthplace.",
    "Heritage requires an explicit place and creates/reuses a place+heritage World variant.",
    "Unknown place/heritage combinations are authored once and cached under .fibre/genesis/worlds; --new-world forces a fresh World version.",
    "Set FIBRE_GENESIS_REQUEST_ID to an existing request to resume its persisted request time and durable model calls.",
  ].join("\n");
}

async function main() {
  const options = parseModernGenesisArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const privateToken = required("FIBRE_PRIVATE_TOKEN", process.env.FIBRE_PRIVATE_TOKEN);
  const rawExplicitSlot = process.env.FIBRE_GENESIS_E2E_SLOT?.trim() || null;
  const explicitSlot = rawExplicitSlot === null ? null : Number.parseInt(rawExplicitSlot, 10);
  if (rawExplicitSlot !== null && (!Number.isSafeInteger(explicitSlot) || explicitSlot < 1)) {
    throw new TypeError("FIBRE_GENESIS_E2E_SLOT must be a positive integer");
  }

  const deployed = deployment(REPO_ROOT);
  const timeoutMs = Number.parseInt(process.env.FIBRE_GENESIS_E2E_CONVERGENCE_WAIT_MS ?? String(DEFAULT_TIMEOUT_MS), 10);
  const birthCenter = serviceBase(deployed, "birth-center");
  const worldKernel = serviceBase(deployed, "world-kernel");
  const threadPresentation = serviceBase(deployed, "thread-presentation");
  const viewerOrigin = required("staging viewer origin", deployed.externalViewerOrigin);
  const cohort = fixture("fixtures/genesis/pr39/development-cohort-v1.json");
  const materialFixture = fixture("fixtures/genesis/pr39/modern-birth-material-v1.json");
  if (materialFixture.fixtureVersion !== "pr39-modern-birth-material-v1") {
    throw new Error("unexpected modern birth material fixture version");
  }

  const explicitRequestId = process.env.FIBRE_GENESIS_REQUEST_ID?.trim() || null;
  const requestId = explicitRequestId ?? `genesis-modern-${Date.now().toString(36)}`;
  const existing = explicitRequestId === null
    ? null
    : await inspectDevelopmentIfExists({ baseUrl: birthCenter, privateToken, requestId, timeoutMs });
  const persistedRequestedAt = existing?.inspection?.requestedAt ?? null;
  const explicitRequestedAt = process.env.FIBRE_GENESIS_REQUESTED_AT?.trim() || null;
  if (persistedRequestedAt !== null && explicitRequestedAt !== null && persistedRequestedAt !== explicitRequestedAt) {
    throw new Error(`existing Genesis request ${requestId} was created at ${persistedRequestedAt}; do not override FIBRE_GENESIS_REQUESTED_AT when resuming`);
  }
  const requestedAt = explicitRequestedAt ?? persistedRequestedAt ?? new Date().toISOString();
  const baseSlotOrdinal = selectModernBirthSlot({
    requestId,
    slotCount: cohort.slots.length,
    explicitSlot,
  });
  const selection = await resolveModernWorldSelection({
    selector:options.world ?? selectDefaultModernBirthplace(requestId),
    heritage: options.heritage,
    forceNewWorld: options.forceNewWorld,
    cohort,
    materialFixture,
    fixture,
    repoRoot: REPO_ROOT,
    requestId,
    baseSlotOrdinal,
  });
  const body = modernRequest({
    requestId,
    requestedAt,
    cohort,
    selection,
    sexSelection: options.sex,
  });
  const plan = buildGenesisDevelopmentPlan(body);
  if (existing !== null && existing.inspection.requestDigest !== plan.requestDigest) {
    throw new Error(`existing Genesis request ${requestId} does not match the supplied sex/place/heritage inputs`);
  }

  process.stdout.write(`${JSON.stringify({
    event: "modern-thread-birth-start",
    requestId,
    requestMode: existing === null ? "new" : "resume",
    sexSelection: options.sex ?? "derived",
    placeSelection: selection.selector?.display ?? null,
    heritageSelection: selection.heritage?.display ?? null,
    worldMode: selection.mode,
    worldSpecId: body.worldSpec.worldSpecId,
    genomeSlot: selection.slotOrdinal,
    worldSlot: selection.worldSlotOrdinal ?? null,
    genesisId: plan.genesisId,
    threadId: plan.threadId,
    identityMode: "fresh_birth_composition",
  })}\n`);

  const birth = (await submit({ baseUrl: birthCenter, privateToken, body, timeoutMs })).development;
  if (birth?.status !== "published") {
    await poll(
      () => inspectDevelopment({ baseUrl: birthCenter, privateToken, requestId, timeoutMs }),
      (result) => result?.inspection?.provisionalStatus === "published",
      { timeoutMs },
    );
  }
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
    requestMode: existing === null ? "new" : "resume",
    sexSelection: options.sex ?? "derived",
    placeSelection: selection.selector?.display ?? null,
    heritageSelection: selection.heritage?.display ?? null,
    worldMode: selection.mode,
    genomeSlot: selection.slotOrdinal,
    worldSlot: selection.worldSlotOrdinal ?? null,
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
    identityMode: "fresh_birth_composition",
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
