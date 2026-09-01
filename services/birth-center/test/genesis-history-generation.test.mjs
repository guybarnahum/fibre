import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT,
  GENESIS_LIFE_PASS_A_PROMPT,
  buildGenesisLifePassACognitionInput,
  generateGenesisHistoricalEpisode,
} from "../src/genesis-history-generation.mjs";

function passAInput() {
  const offeredStructures = Array.from({ length: 8 }, (_, index) => ({
    structureId: `ges_history_test_${index + 1}`,
    abstractSituation: index === 0
      ? "a peer and the subject handle one concrete shared task"
      : `ordinary test situation ${index + 1}`,
    participatingRoles: index === 0 ? ["peer"] : [],
    developmentalRange: { minAge: 10, maxAge: 12 },
    consequenceClass: "low",
  }));
  return {
    inputVersion: "genesis-pass-a-input-v1",
    subject: { provisionalThreadId: "thr_history_generation", bornAt: "2000-01-01T00:00:00.000Z" },
    world: {
      worldSpecId: "world_history_generation",
      timeFrame: { startAt: "2000-01-01T00:00:00.000Z", endAt: "2030-01-01T00:00:00.000Z" },
      places: [{ placeId: "place_history_school", description: "A school." }],
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
      windowId: "window_history_generation",
      startAt: "2011-05-02T13:15:00.000Z",
      endAt: "2011-05-02T13:15:00.000Z",
      minAge: 11.331,
      maxAge: 11.331,
    },
    chronologyEndsAt: "2011-05-02T13:15:00.000Z",
    initialRoster: [
      { participantId: "thr_history_generation", factualRoles: ["subject"], relationshipFacts: [] },
      { participantId: "person_history_caregiver", factualRoles: ["caregiver"], relationshipFacts: ["Lives with subject."] },
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
    windowId: "window_history_generation",
    occurredAt: "2011-05-02T13:15:00.000Z",
    ageAtEvent: 11.331,
    timeZone: "America/New_York",
    localDate: "2011-05-02",
    localTime: "09:15",
    localWeekday: "Monday",
    daypart: "morning",
    placeRef: "place_history_school",
    placeKind: "school",
    selectionKind: "offered_structure",
    structureRef: "ges_history_test_1",
    counterpartMode: "present_required",
    counterpart: {
      participantId: "person_history_peer",
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

test("Birth historical cognition is genome-blind and cannot rewrite the frozen envelope", () => {
  const cognition = buildGenesisLifePassACognitionInput({ passAInput: passAInput(), envelope: envelope() });
  assert.equal(JSON.stringify(cognition).toLowerCase().includes("genome"), false);
  assert.equal(Object.hasOwn(cognition.frozenEnvelope, "ordinal"), false);
  assert.equal(cognition.frozenEnvelope.placeRef, envelope().placeRef);
  assert.equal(cognition.frozenEnvelope.structureRef, envelope().structureRef);
  assert.match(GENESIS_LIFE_PASS_A_PROMPT, /not choosing those facts/iu);
});

test("Birth historical generation stamps frozen facts and preserves them across record retry", async () => {
  const outputs = [
    { ...validRealization(), additionalParticipantRefs: ["person_not_grounded"] },
    validRealization(),
  ];
  const requests = [];
  const adapter = {
    invoke: async (request) => ({
      output: outputs[requests.push(request) - 1],
      provenance: { provider: "fixture" },
    }),
  };
  const result = await generateGenesisHistoricalEpisode({
    adapter,
    passAInput: passAInput(),
    envelope: envelope(),
    clientRequestId: "birth-history-record-retry",
  });
  assert.equal(requests.length, 2);
  assert.match(requests[1].clientRequestId, /record-retry-1$/u);
  assert.equal(result.episode.occurredAt, envelope().occurredAt);
  assert.equal(result.episode.placeRef, envelope().placeRef);
  assert.equal(result.episode.structureRef, envelope().structureRef);
  assert.deepEqual(result.budgetState, { generatedVersions: 2, formRepairs: 0, recordRetries: 1 });
});

test("Birth historical generation repairs local civil-time narration before spending a record retry", async () => {
  let generationCalls = 0;
  const adapter = {
    invoke: async () => {
      generationCalls += 1;
      return {
        output: { ...validRealization(), observableAction: "On Sunday afternoon, the subject and peer compare two classroom labels." },
        provenance: { provider: "fixture" },
      };
    },
  };
  let repairCalls = 0;
  const repairAdapter = {
    invoke: async (request) => {
      repairCalls += 1;
      assert.equal(request.input.failedGate, "pass_a_local_civil_time_narration");
      assert.match(GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT, /remove explicit weekday, daypart, or clock-time wording/iu);
      return {
        output: { observableAction: validRealization().observableAction },
        provenance: { provider: "fixture-repair" },
      };
    },
  };
  const result = await generateGenesisHistoricalEpisode({
    adapter,
    repairAdapter,
    passAInput: passAInput(),
    envelope: envelope(),
    clientRequestId: "birth-history-local-time-repair",
  });
  assert.equal(generationCalls, 1);
  assert.equal(repairCalls, 1);
  assert.deepEqual(result.calls.map((call) => call.kind), ["initial", "form-repair-1"]);
  assert.deepEqual(result.budgetState, { generatedVersions: 2, formRepairs: 1, recordRetries: 0 });
});
