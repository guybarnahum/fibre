// fibre-test-lifecycle: milestone
// fibre-test-scope: pr39
// fibre-test-purpose: replacement-v2-r2-historical-realization-reliability
// fibre-test-disposition: consolidate-into-permanent-genesis-history-invariants-after-pr39

import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_REPLACEMENT_PASS_A_PROMPT,
  buildReplacementPassACognitionInput,
  generateReplacementHistoricalEpisode,
} from "../src/genesis-replacement-pass-a.mjs";

function passAInput() {
  const offeredStructures = Array.from({ length: 8 }, (_, index) => ({
    structureId: `ges_r2_test_${index + 1}`,
    abstractSituation: index === 0 ? "a peer and the subject handle one concrete shared task" : `ordinary test situation ${index + 1}`,
    participatingRoles: index === 0 ? ["peer"] : [],
    developmentalRange: { minAge: 10, maxAge: 12 },
    consequenceClass: "low",
  }));
  return {
    inputVersion: "genesis-pass-a-input-v1",
    subject: { provisionalThreadId: "thr_r2_realization", bornAt: "2000-01-01T00:00:00.000Z" },
    world: {
      worldSpecId: "world_r2_realization",
      timeFrame: { startAt: "2000-01-01T00:00:00.000Z", endAt: "2030-01-01T00:00:00.000Z" },
      places: [{ placeId: "place_r2_school", description: "A school." }],
      householdShape: "A household.",
      familyRelations: [],
      languages: ["English"],
      materialCircumstances: "Stable.",
      mobilityPattern: "Walking.",
      schoolingOrCommunityContext: "School.",
      culturalContext: "A concrete locality.",
      availableInstitutions: ["school"],
      intellectualEnvironment: "Books and discussion.",
      affordedRoles: ["caregiver", "peer", "teacher"],
    },
    developmentalWindow: {
      windowId: "window_r2_realization",
      startAt: "2011-05-02T13:15:00.000Z",
      endAt: "2011-05-02T13:15:00.000Z",
      minAge: 11.331,
      maxAge: 11.331,
    },
    chronologyEndsAt: "2011-05-02T13:15:00.000Z",
    initialRoster: [
      { participantId: "thr_r2_realization", factualRoles: ["subject"], relationshipFacts: [] },
      { participantId: "person_r2_caregiver", factualRoles: ["caregiver"], relationshipFacts: ["Lives with subject."] },
    ],
    priorEpisodes: [],
    previouslyIntroducedParticipants: [],
    offeredStructures,
    policyWitness: {
      policyVersion: "genesis-pass-a-policy-v1+genesis-rich-counterpart-policy-v2",
      eventStructurePoolDigest: `sha256:${"1".repeat(64)}`,
      offerSelectionDigest: `sha256:${"2".repeat(64)}`,
    },
  };
}

function envelope() {
  return {
    envelopeVersion: "genesis-historical-envelope-v1",
    ordinal: 1,
    windowId: "window_r2_realization",
    occurredAt: "2011-05-02T13:15:00.000Z",
    ageAtEvent: 11.331,
    timeZone: "America/New_York",
    localDate: "2011-05-02",
    localTime: "09:15",
    localWeekday: "Monday",
    daypart: "morning",
    placeRef: "place_r2_school",
    placeKind: "school",
    selectionKind: "offered_structure",
    structureRef: "ges_r2_test_1",
    counterpartMode: "present_required",
    counterpart: {
      participantId: "person_env_r2_peer",
      roleRef: "peer",
      origin: "historical_envelope",
      introducedHere: true,
    },
    externalCounterpartRequired: true,
  };
}

function validRealization() {
  return {
    observableAction: "The subject and peer compare two labels on a classroom materials box and correct one mismatch.",
    additionalParticipantRefs: [],
    additionalIntroductions: [],
    intellectualEncounter: null,
  };
}

function interiorRealization() {
  return {
    ...validRealization(),
    observableAction: "The subject and peer learned that careful labeling matters while comparing two classroom boxes.",
  };
}

test("replacement Pass-A cognition is genome-blind and the model sees the frozen envelope as context, not writable output", () => {
  const cognition = buildReplacementPassACognitionInput({ passAInput: passAInput(), envelope: envelope() });
  assert.equal(JSON.stringify(cognition).toLowerCase().includes("genome"), false);
  assert.equal(Object.hasOwn(cognition.frozenEnvelope, "ordinal"), false);
  assert.equal(cognition.frozenEnvelope.placeRef, envelope().placeRef);
  assert.equal(cognition.frozenEnvelope.structureRef, envelope().structureRef);
  assert.equal(cognition.frozenEnvelope.counterpart.roleRef, "peer");
  assert.match(GENESIS_REPLACEMENT_PASS_A_PROMPT, /not choosing those facts/iu);
  assert.match(GENESIS_REPLACEMENT_PASS_A_PROMPT, /do not return or restate episodeId, occurredAt/iu);
});

test("replacement Pass-A stamps the frozen skeleton after a valid realization", async () => {
  const calls = [];
  const adapter = {
    invoke: async (request) => {
      calls.push(request);
      return { output: validRealization(), provenance: { provider: "fixture" } };
    },
  };
  const result = await generateReplacementHistoricalEpisode({
    adapter,
    passAInput: passAInput(),
    envelope: envelope(),
    clientRequestId: "r2-pass-a-valid",
  });
  assert.equal(calls.length, 1);
  assert.equal(result.episode.occurredAt, envelope().occurredAt);
  assert.equal(result.episode.placeRef, envelope().placeRef);
  assert.equal(result.episode.structureRef, envelope().structureRef);
  assert.ok(result.episode.participantRefs.includes("person_env_r2_peer"));
  assert.deepEqual(result.budgetState, { generatedVersions: 1, formRepairs: 0, recordRetries: 0 });
});

test("replacement Pass-A form repair changes only observableAction and preserves frozen facts", async () => {
  const requests = [];
  const adapter = {
    invoke: async (request) => {
      requests.push(request);
      return { output: interiorRealization(), provenance: { provider: "fixture" } };
    },
  };
  const repairAdapter = {
    invoke: async (request) => {
      requests.push(request);
      return {
        output: { observableAction: "The subject and peer compare two classroom box labels and replace one mismatched label." },
        provenance: { provider: "fixture-repair" },
      };
    },
  };
  const result = await generateReplacementHistoricalEpisode({
    adapter,
    repairAdapter,
    passAInput: passAInput(),
    envelope: envelope(),
    clientRequestId: "r2-pass-a-form-repair",
  });
  assert.equal(requests.length, 2);
  assert.equal(result.episode.occurredAt, envelope().occurredAt);
  assert.equal(result.episode.placeRef, envelope().placeRef);
  assert.deepEqual(result.budgetState, { generatedVersions: 2, formRepairs: 1, recordRetries: 0 });
});

test("malformed form-repair output consumes the form-repair budget rather than the record-retry budget", async () => {
  const adapter = {
    invoke: async () => ({ output: interiorRealization(), provenance: { provider: "fixture" } }),
  };
  let repairCalls = 0;
  const repairAdapter = {
    invoke: async () => {
      repairCalls += 1;
      if (repairCalls === 1) {
        return { output: validRealization(), provenance: { provider: "fixture-malformed-repair" } };
      }
      return {
        output: { observableAction: "The subject and peer compare two classroom box labels and replace one mismatched label." },
        provenance: { provider: "fixture-repair" },
      };
    },
  };
  const result = await generateReplacementHistoricalEpisode({
    adapter,
    repairAdapter,
    passAInput: passAInput(),
    envelope: envelope(),
    clientRequestId: "r2-pass-a-malformed-form-repair",
  });
  assert.equal(repairCalls, 2);
  assert.deepEqual(result.budgetState, { generatedVersions: 3, formRepairs: 2, recordRetries: 0 });
});

test("replacement Pass-A falls back to a fresh record retry after form repairs are exhausted", async () => {
  const generationRequests = [];
  const adapter = {
    invoke: async (request) => {
      generationRequests.push(request);
      return {
        output: generationRequests.length === 1 ? interiorRealization() : validRealization(),
        provenance: { provider: "fixture" },
      };
    },
  };
  const repairRequests = [];
  const repairAdapter = {
    invoke: async (request) => {
      repairRequests.push(request);
      return {
        output: { observableAction: interiorRealization().observableAction },
        provenance: { provider: "fixture-repair" },
      };
    },
  };
  const result = await generateReplacementHistoricalEpisode({
    adapter,
    repairAdapter,
    passAInput: passAInput(),
    envelope: envelope(),
    clientRequestId: "r2-pass-a-form-to-record-retry",
  });
  assert.equal(repairRequests.length, 2);
  assert.equal(generationRequests.length, 2);
  assert.match(generationRequests[1].clientRequestId, /record-retry-1$/u);
  assert.deepEqual(result.budgetState, { generatedVersions: 4, formRepairs: 2, recordRetries: 1 });
});

test("replacement Pass-A persistent form failure can consume the full five-version policy before refusing", async () => {
  const adapter = {
    invoke: async () => ({ output: interiorRealization(), provenance: { provider: "fixture" } }),
  };
  const repairAdapter = {
    invoke: async () => ({
      output: { observableAction: interiorRealization().observableAction },
      provenance: { provider: "fixture-repair" },
    }),
  };
  await assert.rejects(
    generateReplacementHistoricalEpisode({
      adapter,
      repairAdapter,
      passAInput: passAInput(),
      envelope: envelope(),
      clientRequestId: "r2-pass-a-full-budget",
    }),
    (error) => {
      assert.equal(error.gate, "record_repair_exhausted");
      assert.equal(error.budgetDecision.reason, "total_generated_version_budget_exhausted");
      assert.deepEqual(error.calls.map((call) => call.kind), [
        "initial",
        "form-repair-1",
        "form-repair-2",
        "record-retry-1",
        "record-retry-2",
      ]);
      return true;
    },
  );
});

test("replacement Pass-A record retry preserves the frozen structure", async () => {
  const outputs = [
    {
      ...validRealization(),
      additionalParticipantRefs: ["person_not_grounded"],
    },
    validRealization(),
  ];
  const requests = [];
  const adapter = {
    invoke: async (request) => ({
      output: outputs[requests.push(request) - 1],
      provenance: { provider: "fixture" },
    }),
  };
  const result = await generateReplacementHistoricalEpisode({
    adapter,
    passAInput: passAInput(),
    envelope: envelope(),
    clientRequestId: "r2-pass-a-record-retry",
  });
  assert.equal(requests.length, 2);
  assert.match(requests[1].clientRequestId, /record-retry-1$/u);
  assert.equal(result.episode.structureRef, envelope().structureRef);
  assert.deepEqual(result.budgetState, { generatedVersions: 2, formRepairs: 0, recordRetries: 1 });
});
