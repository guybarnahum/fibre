import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_PASS_C_POLICY,
  genesisMeaningId,
  genesisMeaningPartId,
} from "../src/genesis-pass-c-domain.mjs";
import {
  buildScheduledReinterpretationPassCInput,
  evaluateReinterpretationOpportunity,
  passCTriggerFromScheduledOpportunity,
  reinterpretationAccountingByThread,
  reinterpretationRelationFromFacts,
  scheduleReinterpretationOpportunities,
  summarizeReinterpretationSchedule,
} from "../src/genesis-pass-c-reinterpretation.mjs";

function facts(overrides = {}) {
  return {
    targetStructureRef: "ges_library_return",
    triggerStructureRef: "ges_library_return",
    targetStructureFamilyRef: "ges_family_ordinary_exchange",
    triggerStructureFamilyRef: "ges_family_ordinary_exchange",
    sharedPersonRefs: [],
    sharedRelationshipRefs: [],
    sharedIntellectualSourceRefs: [],
    ...overrides,
  };
}

function candidate({
  threadId = "thr_d4_001",
  memoryRef = "mem_d4_001",
  priorMeaningFormedAt = "2009-01-01T00:00:00Z",
  episodeRef = "ep_echo_001",
  occurredAt = "2015-01-01T00:00:00Z",
  observableAction = "The teenager returns to the library with a younger cousin and waits while the cousin chooses a book.",
  relationFacts = facts(),
} = {}) {
  return {
    threadId,
    memoryRef,
    priorMeaningFormedAt,
    trigger: { episodeRef, occurredAt, observableAction },
    relationFacts,
  };
}

test("reinterpretation requires both a five-year interval and a mechanical relation", () => {
  const tooEarly = evaluateReinterpretationOpportunity(candidate({ occurredAt: "2013-12-31T23:59:59Z" }));
  assert.equal(tooEarly.ageEligible, false);
  assert.equal(tooEarly.relationEligible, true);
  assert.equal(tooEarly.eligible, false);

  const noRelation = evaluateReinterpretationOpportunity(candidate({
    occurredAt: "2015-01-01T00:00:00Z",
    relationFacts: facts({
      targetStructureRef: "ges_a",
      triggerStructureRef: "ges_b",
      targetStructureFamilyRef: "ges_family_a",
      triggerStructureFamilyRef: "ges_family_b",
    }),
  }));
  assert.equal(noRelation.ageEligible, true);
  assert.equal(noRelation.relationEligible, false);
  assert.equal(noRelation.eligible, false);

  const eligible = evaluateReinterpretationOpportunity(candidate());
  assert.equal(eligible.minimumTriggerAt, "2014-01-01T00:00:00.000Z");
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.relation, "same_structure_family");
});

test("five-year policy uses the calendar anniversary, including Feb 29", () => {
  const leap = evaluateReinterpretationOpportunity(candidate({
    priorMeaningFormedAt: "2008-02-29T12:00:00Z",
    occurredAt: "2013-02-28T12:00:00Z",
  }));
  assert.equal(leap.minimumTriggerAt, "2013-02-28T12:00:00.000Z");
  assert.equal(leap.ageEligible, true);
});

test("relation choice uses fixed mechanical precedence rather than semantic ranking", () => {
  const relation = reinterpretationRelationFromFacts(facts({
    sharedPersonRefs: ["person_cousin"],
    sharedRelationshipRefs: ["rel_family_001"],
    sharedIntellectualSourceRefs: ["source_book_001"],
  }));
  assert.equal(relation, "same_structure_family");

  assert.equal(reinterpretationRelationFromFacts(facts({
    targetStructureRef: "ges_a",
    triggerStructureRef: "ges_b",
    targetStructureFamilyRef: null,
    triggerStructureFamilyRef: null,
    sharedPersonRefs: ["person_cousin"],
    sharedRelationshipRefs: [],
    sharedIntellectualSourceRefs: ["source_book_001"],
  })), "same_person_or_relationship");

  assert.equal(reinterpretationRelationFromFacts(facts({
    targetStructureRef: null,
    triggerStructureRef: null,
    targetStructureFamilyRef: null,
    triggerStructureFamilyRef: null,
    sharedIntellectualSourceRefs: ["source_book_001"],
  })), "same_intellectual_source");
});

test("eligibility is computed before the three-run cap and ineligible candidates do not consume it", () => {
  const scheduled = scheduleReinterpretationOpportunities([
    candidate({ episodeRef: "ep_00_too_early", occurredAt: "2012-01-01T00:00:00Z" }),
    candidate({ episodeRef: "ep_04", occurredAt: "2018-01-01T00:00:00Z", memoryRef: "mem_d4_004" }),
    candidate({ episodeRef: "ep_02", occurredAt: "2016-01-01T00:00:00Z", memoryRef: "mem_d4_002" }),
    candidate({ episodeRef: "ep_01", occurredAt: "2015-01-01T00:00:00Z", memoryRef: "mem_d4_001" }),
    candidate({ episodeRef: "ep_03", occurredAt: "2017-01-01T00:00:00Z", memoryRef: "mem_d4_003" }),
  ]);
  assert.deepEqual(summarizeReinterpretationSchedule(scheduled), {
    candidates: 5,
    eligible: 4,
    run: GENESIS_PASS_C_POLICY.reinterpretationRunCapPerThread,
    skippedByCap: 1,
    ineligible: 1,
  });
  assert.deepEqual(
    scheduled.filter((item) => item.run).map((item) => item.trigger.episodeRef),
    ["ep_01", "ep_02", "ep_03"],
  );
  assert.equal(scheduled.find((item) => item.trigger.episodeRef === "ep_04").disposition, "skipped_by_cap");
  assert.equal(scheduled.find((item) => item.trigger.episodeRef === "ep_00_too_early").disposition, "ineligible");
});

test("cap selection is invariant to candidate input order and uses chronology then stable IDs", () => {
  const source = [
    candidate({ episodeRef: "ep_z", occurredAt: "2015-01-01T00:00:00Z", memoryRef: "mem_z" }),
    candidate({ episodeRef: "ep_a", occurredAt: "2015-01-01T00:00:00Z", memoryRef: "mem_a" }),
    candidate({ episodeRef: "ep_b", occurredAt: "2016-01-01T00:00:00Z", memoryRef: "mem_b" }),
    candidate({ episodeRef: "ep_c", occurredAt: "2017-01-01T00:00:00Z", memoryRef: "mem_c" }),
  ];
  const forward = scheduleReinterpretationOpportunities(source);
  const reverse = scheduleReinterpretationOpportunities([...source].reverse());
  const runIds = (items) => items.filter((item) => item.run).map((item) => item.opportunityId).sort();
  assert.deepEqual(runIds(forward), runIds(reverse));
  assert.equal(forward.find((item) => item.trigger.episodeRef === "ep_z").skippedByCap, true);
});

test("duplicate opportunities are rejected rather than consuming the cap twice", () => {
  const duplicate = candidate();
  assert.throws(
    () => scheduleReinterpretationOpportunities([duplicate, structuredClone(duplicate)]),
    /duplicate reinterpretation opportunity/,
  );
});

test("cap accounting records the complete eligible set before selecting run opportunities", () => {
  const scheduled = scheduleReinterpretationOpportunities([
    candidate({ episodeRef: "ep_04", occurredAt: "2018-01-01T00:00:00Z", memoryRef: "mem_d4_004" }),
    candidate({ episodeRef: "ep_02", occurredAt: "2016-01-01T00:00:00Z", memoryRef: "mem_d4_002" }),
    candidate({ episodeRef: "ep_01", occurredAt: "2015-01-01T00:00:00Z", memoryRef: "mem_d4_001" }),
    candidate({ episodeRef: "ep_03", occurredAt: "2017-01-01T00:00:00Z", memoryRef: "mem_d4_003" }),
  ]);
  const [accounting] = reinterpretationAccountingByThread(scheduled);
  assert.equal(accounting.reinterpretationEligibleCount, 4);
  assert.equal(accounting.reinterpretationRunCount, 3);
  assert.equal(accounting.reinterpretationSkippedByCapCount, 1);
  assert.equal(accounting.eligibleOpportunityRefs.length, 4);
  assert.equal(accounting.runOpportunityRefs.length, 3);
  assert.equal(accounting.skippedByCapOpportunityRefs.length, 1);
  assert.equal(accounting.eligibleOpportunityRefs.includes(accounting.skippedByCapOpportunityRefs[0]), true);
});

test("the cap is per Thread, not a global semantic budget", () => {
  const candidates = [];
  for (const threadId of ["thr_d4_a", "thr_d4_b"]) {
    for (let index = 1; index <= 4; index += 1) {
      candidates.push(candidate({
        threadId,
        memoryRef: `mem_${threadId}_${index}`,
        episodeRef: `ep_${threadId}_${index}`,
        occurredAt: `${2014 + index}-01-01T00:00:00Z`,
      }));
    }
  }
  const scheduled = scheduleReinterpretationOpportunities(candidates);
  assert.equal(scheduled.filter((item) => item.threadId === "thr_d4_a" && item.run).length, 3);
  assert.equal(scheduled.filter((item) => item.threadId === "thr_d4_b" && item.run).length, 3);
  const accounting = reinterpretationAccountingByThread(scheduled);
  assert.deepEqual(accounting.map((item) => item.reinterpretationRunCount), [3, 3]);
  assert.deepEqual(accounting.map((item) => item.reinterpretationSkippedByCapCount), [1, 1]);
});

test("scheduler facts cannot carry condition, salience or semantic ranking fields", () => {
  assert.throws(() => evaluateReinterpretationOpportunity({
    ...candidate(),
    semanticScore: 0.99,
  }), /not allowed/);
  assert.throws(() => evaluateReinterpretationOpportunity({
    ...candidate(),
    relationFacts: { ...facts(), conditionSalience: 0.8 },
  }), /not allowed/);
});

test("Pass C receives only the bounded trigger and typed relation, never scheduler witness facts", () => {
  const [scheduled] = scheduleReinterpretationOpportunities([candidate({
    relationFacts: facts({
      sharedPersonRefs: ["person_cousin"],
      sharedIntellectualSourceRefs: ["source_book_001"],
    }),
  })]);
  const trigger = passCTriggerFromScheduledOpportunity(scheduled);
  assert.deepEqual(Object.keys(trigger).sort(), ["episodeRef", "observableAction", "occurredAt", "relation"]);
  assert.equal(Object.hasOwn(trigger, "relationFacts"), false);
  assert.equal(Object.hasOwn(trigger, "minimumTriggerAt"), false);
  assert.throws(() => passCTriggerFromScheduledOpportunity({ ...scheduled, run: false, disposition: "skipped_by_cap" }), /scheduled run/);
});

test("the normal Pass-C reinterpretation constructor accepts only a scheduled run opportunity", () => {
  const scheduled = scheduleReinterpretationOpportunities([
    candidate({ episodeRef: "ep_run_1", occurredAt: "2015-01-01T00:00:00Z" }),
    candidate({ episodeRef: "ep_run_2", occurredAt: "2016-01-01T00:00:00Z", memoryRef: "mem_d4_002" }),
    candidate({ episodeRef: "ep_run_3", occurredAt: "2017-01-01T00:00:00Z", memoryRef: "mem_d4_003" }),
    candidate({ episodeRef: "ep_skipped", occurredAt: "2018-01-01T00:00:00Z", memoryRef: "mem_d4_004" }),
  ]);
  const run = scheduled[0];
  const input = buildScheduledReinterpretationPassCInput({
    scheduledOpportunity: run,
    targetMemory: {
      memoryRef: run.memoryRef,
      episodeRefs: ["ep_original_memory"],
      rememberedContent: "I remember the earlier episode clearly enough to reconsider what it meant.",
      uncertainty: ["Some details remain uncertain."],
    },
    priorMeaning: {
      summary: "I had treated the earlier event as dependable private space for attention.",
      parts: [{
        meaningPartId: genesisMeaningPartId({ memoryRef: run.memoryRef, ordinal: 1 }),
        meaning: "The earlier event had come to represent dependable private space.",
      }],
    },
    formation: {
      asOf: run.trigger.occurredAt,
      ageAtFormation: 16,
      chronologyIndex: 7,
    },
  });
  assert.equal(input.mode, "reinterpretation");
  assert.deepEqual(Object.keys(input.trigger).sort(), ["episodeRef", "observableAction", "occurredAt", "relation"]);
  assert.equal(Object.hasOwn(input, "genome"), false);
  assert.equal(Object.hasOwn(input.trigger, "relationFacts"), false);

  const skipped = scheduled.find((item) => item.disposition === "skipped_by_cap");
  assert.throws(
    () => buildScheduledReinterpretationPassCInput({
      scheduledOpportunity: skipped,
      targetMemory: input.targetMemory,
      priorMeaning: input.priorMeaning,
      formation: input.formation,
    }),
    /scheduled run/,
  );
});

test("meaning identity is stable for one memory and separate from meaning-part identity", () => {
  const first = genesisMeaningId("mem_d4_meaning_001");
  const second = genesisMeaningId("mem_d4_meaning_001");
  const other = genesisMeaningId("mem_d4_meaning_002");
  assert.equal(first, second);
  assert.notEqual(first, other);
  assert.match(first, /^mean_[0-9a-f]{64}$/);
});
