import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GENESIS_DEVELOPMENT_REQUEST_VERSION,
  buildGenesisDevelopmentPlan,
  hydrateGenesisDevelopmentPlan,
  serializeGenesisDevelopmentPlan,
} from "../src/genesis-development-plan.mjs";

function readJson(path) {
  return JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8"));
}

function developmentRequest(overrides = {}) {
  const cohort = readJson("fixtures/genesis/pr39/development-cohort-v1.json");
  const slot = cohort.slots[0];
  const worldSpec = readJson(slot.worldSpecPath);
  const genome = readJson(slot.genomePath);
  return {
    requestVersion: GENESIS_DEVELOPMENT_REQUEST_VERSION,
    requestId: "birth-development-request-001",
    requestedAt: "2026-08-31T23:00:00Z",
    worldSpec,
    genomeValues: genome.loci.map((locus) => locus.value),
    participants: slot.participants.filter((participant) => !participant.factualRoles.includes("subject")),
    placeAffordances: slot.placeAffordances,
    bornAt: cohort.entry.bornAt,
    chronologyEndsAt: cohort.entry.chronologyEndsAt,
    timeZone: slot.timeZone,
    ...overrides,
  };
}

test("Birth Center derives Genesis identity, genome, chronology, offers and envelopes from narrow origin material", () => {
  const request = developmentRequest();
  const first = buildGenesisDevelopmentPlan(request);
  const second = buildGenesisDevelopmentPlan(structuredClone(request));

  assert.deepEqual(serializeGenesisDevelopmentPlan(first), serializeGenesisDevelopmentPlan(second));
  assert.match(first.threadId, /^thr_[0-9a-f]{40}$/u);
  assert.match(first.genesisId, /^genesis_[0-9a-f]{40}$/u);
  assert.equal(first.originMode, "de_novo");
  assert.equal(first.slot, 1);
  assert.equal(first.genome.header.owner.ownerId, first.threadId);
  assert.equal(first.genome.header.genesisId, first.genesisId);
  assert.equal(first.roster.participants[0].participantId, first.threadId);
  assert.deepEqual(first.roster.participants[0].factualRoles, ["subject"]);
  assert.equal(first.windows.length, 14);
  assert.equal(first.offersByWindow.size, 14);
  assert.equal(first.envelopePlan.envelopes.length, 14);
  for (const window of first.windows) assert.equal(first.offersByWindow.get(window.windowId).length, 9);

  const serialized = serializeGenesisDevelopmentPlan(first);
  const hydrated = hydrateGenesisDevelopmentPlan(serialized);
  assert.deepEqual(serializeGenesisDevelopmentPlan(hydrated), serialized);
});

test("Genesis development request cannot author Thread/Genesis IDs or final developed state", () => {
  assert.throws(
    () => buildGenesisDevelopmentPlan({ ...developmentRequest(), threadId: "thr_caller_authored" }),
    /threadId is not allowed/u,
  );
  assert.throws(
    () => buildGenesisDevelopmentPlan({ ...developmentRequest(), birthBundle: { thread: {} } }),
    /birthBundle is not allowed/u,
  );
  const request = developmentRequest();
  request.participants = [
    ...request.participants,
    {
      participantId: "thr_fake_subject",
      factualRoles: ["subject"],
      relationshipFacts: ["Caller tries to provide the provisional subject."],
    },
  ];
  assert.throws(
    () => buildGenesisDevelopmentPlan(request),
    /must not author the subject participant/u,
  );
});

test("same request ID yields stable identities while changed origin material changes the request digest", () => {
  const first = buildGenesisDevelopmentPlan(developmentRequest());
  const changedRequest = developmentRequest();
  changedRequest.genomeValues = [...changedRequest.genomeValues];
  changedRequest.genomeValues[0] = "when instructions conflict, explicitly names both constraints before asking which one governs";
  const changed = buildGenesisDevelopmentPlan(changedRequest);

  assert.equal(changed.threadId, first.threadId);
  assert.equal(changed.genesisId, first.genesisId);
  assert.notEqual(changed.requestDigest, first.requestDigest);
  assert.notEqual(changed.genomeDigest, first.genomeDigest);
});
