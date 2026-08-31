import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

import { GENESIS_DEVELOPMENT_REQUEST_VERSION } from "#services/birth-center/src/genesis-development-plan.mjs";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function positiveInteger(name, value, fallback) {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new TypeError(`${name} must be a positive integer`);
  return parsed;
}

function readJson(path) {
  return JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
}

function requestFromFixture({ requestId, requestedAt, slotOrdinal }) {
  const cohort = readJson("fixtures/genesis/pr39/development-cohort-v1.json");
  const slot = cohort.slots[slotOrdinal - 1];
  if (!slot) throw new TypeError(`FIBRE_GENESIS_E2E_SLOT ${slotOrdinal} does not exist in the development cohort fixture`);
  const worldSpec = readJson(slot.worldSpecPath);
  const genome = readJson(slot.genomePath);
  return Object.freeze({
    requestVersion: GENESIS_DEVELOPMENT_REQUEST_VERSION,
    requestId,
    requestedAt,
    worldSpec,
    genomeValues: genome.loci.map((locus) => locus.value),
    participants: slot.participants.filter((participant) => !participant.factualRoles.includes("subject")),
    placeAffordances: slot.placeAffordances,
    bornAt: cohort.entry.bornAt,
    chronologyEndsAt: cohort.entry.chronologyEndsAt,
    timeZone: slot.timeZone,
  });
}

function endpoint(baseUrl) {
  const url = new URL(nonEmpty("FIBRE_BIRTH_CENTER_URL", baseUrl));
  url.pathname = "/internal/births/develop";
  url.search = "";
  url.hash = "";
  return url;
}

async function submit({ url, privateToken, body, requestTimeoutMs }) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-fibre-private-token": privateToken,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok !== true || !payload.development) {
    const detail = payload === null ? `HTTP ${response.status}` : JSON.stringify(payload);
    throw new Error(`Genesis development request failed: ${detail}`);
  }
  return payload.development;
}

function assertSameIdentity(first, replay) {
  for (const key of ["requestId", "genesisId", "threadId", "fibreIdentityNumber", "developmentPlanDigest"]) {
    if (first[key] !== replay[key]) throw new Error(`Genesis development replay changed ${key}`);
  }
}

async function main(environment = process.env) {
  const baseUrl = environment.FIBRE_BIRTH_CENTER_URL ?? "http://127.0.0.1:8790";
  const privateToken = nonEmpty("FIBRE_PRIVATE_TOKEN", environment.FIBRE_PRIVATE_TOKEN);
  const slotOrdinal = positiveInteger("FIBRE_GENESIS_E2E_SLOT", environment.FIBRE_GENESIS_E2E_SLOT, 1);
  const requestTimeoutMs = positiveInteger(
    "FIBRE_GENESIS_E2E_REQUEST_TIMEOUT_MS",
    environment.FIBRE_GENESIS_E2E_REQUEST_TIMEOUT_MS,
    900_000,
  );
  const publishWaitMs = positiveInteger(
    "FIBRE_GENESIS_E2E_PUBLISH_WAIT_MS",
    environment.FIBRE_GENESIS_E2E_PUBLISH_WAIT_MS,
    30_000,
  );
  const pollMs = positiveInteger(
    "FIBRE_GENESIS_E2E_POLL_MS",
    environment.FIBRE_GENESIS_E2E_POLL_MS,
    250,
  );
  const requestId = environment.FIBRE_GENESIS_REQUEST_ID?.trim()
    || `genesis-e2e-${Date.now().toString(36)}`;
  const requestedAt = environment.FIBRE_GENESIS_REQUESTED_AT?.trim()
    || new Date().toISOString();
  const body = requestFromFixture({ requestId, requestedAt, slotOrdinal });
  const url = endpoint(baseUrl);

  process.stdout.write(`${JSON.stringify({
    event: "genesis-development-e2e-start",
    endpoint: url.toString(),
    requestId,
    slotOrdinal,
  })}\n`);

  const first = await submit({ url, privateToken, body, requestTimeoutMs });
  process.stdout.write(`${JSON.stringify({
    event: "genesis-development-e2e-submitted",
    requestId,
    genesisId: first.genesisId,
    threadId: first.threadId,
    fibreIdentityNumber: first.fibreIdentityNumber,
    status: first.status,
    generated: first.generated,
    idempotent: first.idempotent,
  })}\n`);

  let current = first;
  const deadline = Date.now() + publishWaitMs;
  while (current.status !== "published" && Date.now() < deadline) {
    await delay(pollMs);
    const replay = await submit({ url, privateToken, body, requestTimeoutMs });
    assertSameIdentity(first, replay);
    current = replay;
  }
  if (current.status !== "published") {
    throw new Error(`Genesis development ${first.genesisId} remained ${current.status} after ${publishWaitMs}ms`);
  }

  const replay = await submit({ url, privateToken, body, requestTimeoutMs });
  assertSameIdentity(first, replay);
  if (replay.status !== "published" || replay.idempotent !== true || replay.generated !== false) {
    throw new Error("published Genesis development did not replay idempotently without regeneration");
  }

  process.stdout.write(`${JSON.stringify({
    event: "genesis-development-e2e-complete",
    requestId,
    genesisId: replay.genesisId,
    threadId: replay.threadId,
    fibreIdentityNumber: replay.fibreIdentityNumber,
    status: replay.status,
    idempotentReplay: true,
  })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    event: "genesis-development-e2e-failed",
    errorName: error?.constructor?.name ?? "Error",
    message: error?.message ?? String(error),
  })}\n`);
  process.exitCode = 1;
});
