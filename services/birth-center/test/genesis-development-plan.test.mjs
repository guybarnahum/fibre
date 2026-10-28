import {selectedUrgesForBirth} from "../../../core/src/inherited-urges.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GENESIS_EVENT_STRUCTURE_POOL_V3 } from "../src/genesis-development-contracts.mjs";
import {buildGenesisPassBInput} from "../src/genesis-memory-input.mjs";
import {selectSymbolicBirthLoci} from "../../../tools/genesis/symbolic-locus-library.mjs";
import {selectBirthChronology} from "../../../tools/genesis/birth-material.mjs";
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

  const historyStart = new Date(first.bornAt);
  historyStart.setUTCFullYear(historyStart.getUTCFullYear() + 6);
  assert.equal(first.windows[0].startAt, historyStart.toISOString());
  assert.equal(Date.parse(first.windows.at(-1).endAt), Date.parse(first.chronologyEndsAt) - 1);
  assert.equal(new Set(first.windows.map(({ windowId }) => windowId)).size, first.windows.length);

  const currentPoolIds = new Set(
    GENESIS_EVENT_STRUCTURE_POOL_V3.map(({ structure }) => structure.structureId),
  );
  for (let index = 0; index < first.windows.length; index += 1) {
    const window = first.windows[index];
    assert.equal(window.ordinal, index + 1);
    assert.equal(window.windowId, `life_${String(index + 1).padStart(2, "0")}`);
    assert.ok(Date.parse(window.endAt) >= Date.parse(window.startAt));
    if (index > 0) {
      assert.equal(Date.parse(window.startAt), Date.parse(first.windows[index - 1].endAt) + 1);
    }

    const offers = first.offersByWindow.get(window.windowId);
    assert.equal(offers.length, 9);
    const offerIds = offers.map(({ structure }) => structure.structureId);
    assert.equal(new Set(offerIds).size, offerIds.length);
    assert.ok(offers.filter(({ structure }) => structure.consequenceClass === "low").length >= 4);
    for (const { structure } of offers) {
      assert.equal(currentPoolIds.has(structure.structureId), true);
      assert.ok(structure.developmentalRange.minAge <= window.minAge);
      assert.ok(structure.developmentalRange.maxAge >= window.maxAge);
    }
  }

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

 
test("modern birth admits selected symbolic loci with provenance but no cognition leakage",()=>{
  const requestId="genesis-modern-individual-104";
  const requestedAt="2026-10-28T06:30:00.000Z";
  const chronology=selectBirthChronology({requestId,requestedAt});
  const selected=selectSymbolicBirthLoci(requestId);
  const legacy=developmentRequest();
  const request={
    ...legacy,requestId,requestedAt,
    worldSpec:{...legacy.worldSpec,timeFrame:{
      startAt:chronology.bornAt,endAt:chronology.chronologyEndsAt,
    }},
    genomeValues:[...selected.values],originMaterial:selected.originMaterial,
    ...chronology,
  };
  const plan=buildGenesisDevelopmentPlan(request);
  assert.deepEqual(plan.genome.loci.map(l=>l.value),selected.values,
    "development used fixed fixture dispositions instead of individual birth loci");
  assert.deepEqual(plan.genome.header.originMaterial,selected.originMaterial,
    "World admission lost inspectable origin provenance");
  assert.deepEqual(buildGenesisDevelopmentPlan(structuredClone(request)).genomeDigest,
    plan.genomeDigest,"resumed origin did not replay exactly");
  const episodes=plan.windows.map((window,index)=>({
    episodeId:`historical-episode-${index+1}`,
    occurredAt:window.startAt,ageAtEvent:window.minAge,
    placeRef:plan.worldSpec.places[0].placeId,
    participantRefs:[],observableAction:"The subject took part in an ordinary school day.",
    introducedParticipants:[],
  }));
  const memoryInput=buildGenesisPassBInput({
    threadId:plan.threadId,bornAt:plan.bornAt,worldSpec:plan.worldSpec,
    episodes,windows:plan.windows,callOrdinal:3,
    priorRememberedMemories:[],genome:plan.genome,
  });
  assert.deepEqual(memoryInput.genomeExposure.loci.map(l=>l.value),selected.values,
    "developmental memory cognition did not consume the individual dispositions");
  assert.doesNotMatch(JSON.stringify(memoryInput),/originMaterial|libraryDigest|variantIds|selectionDigest/u,
    "genome origin provenance leaked into cognition");
  assert.doesNotMatch(JSON.stringify(plan.envelopePlan),/originMaterial|libraryDigest|selectionDigest/u,
    "historical Pass A consumed origin provenance");

  const tampered=structuredClone(request);
  tampered.genomeValues[0]="An unrelated disposition";
  assert.throws(()=>buildGenesisDevelopmentPlan(tampered),/selection digest/,
    "origin provenance did not bind the selected loci");
});

test("v2 modern Genesis admits immutable urges without exposing DNA to either memory formation or history",()=>{
  const requestId="v2-urge-birth-provenance-1";
  const selected=selectedUrgesForBirth(requestId);
  const base=developmentRequest();
  const plan=buildGenesisDevelopmentPlan({
    ...base,requestId,genomeValues:selected.values,
    originMaterial:selected.originMaterial,
  });
  assert.equal(plan.genome.loci.length,13,"birth did not persist the full urge family set");
  assert.deepEqual(plan.genome.header.originMaterial,selected.originMaterial);
  const episodes=plan.windows.map((window,index)=>({
    episodeId:`history-v2-${index+1}`,occurredAt:window.startAt,
    ageAtEvent:window.minAge,placeRef:plan.worldSpec.places[0].placeId,
    participantRefs:[],observableAction:"One ordinary lived event.",introducedParticipants:[],
  }));
  for(let callOrdinal=1;callOrdinal<=6;callOrdinal++){
    const input=buildGenesisPassBInput({
      threadId:plan.threadId,bornAt:plan.bornAt,worldSpec:plan.worldSpec,
      episodes,windows:plan.windows,callOrdinal,priorRememberedMemories:[],
      genome:plan.genome,
    });
    assert.equal(input.assignment.formationMode,"life_only",
      "v2 childhood exposed raw inherited urge text");
    assert.equal(input.genomeExposure,null);
    assert.doesNotMatch(JSON.stringify(input),/fibre_urge_loci|originMaterial|variantIds/u);
  }
  assert.doesNotMatch(JSON.stringify(plan.envelopePlan),/originMaterial|variantIds/u);
});
