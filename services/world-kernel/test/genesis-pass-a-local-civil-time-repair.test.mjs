import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_REPLACEMENT_PASS_A_FORM_REPAIR_PROMPT,
  generateReplacementHistoricalEpisode,
} from "../src/genesis-replacement-pass-a.mjs";

function passAInput() {
  return {
    inputVersion: "genesis-pass-a-input-v1",
    subject: {
      provisionalThreadId: "thr_local_time_repair",
      bornAt: "2000-01-01T00:00:00.000Z",
    },
    world: {
      worldSpecId: "world_local_time_repair",
      timeFrame: {
        startAt: "2000-01-01T00:00:00.000Z",
        endAt: "2030-01-01T00:00:00.000Z",
      },
      places: [{ placeId: "place_local_time_school", description: "A neighborhood school." }],
      householdShape: "A household.",
      familyRelations: [],
      languages: ["English"],
      materialCircumstances: "Stable.",
      mobilityPattern: "Walking and public transit.",
      schoolingOrCommunityContext: "A neighborhood school.",
      culturalContext: "A concrete locality.",
      availableInstitutions: ["school"],
      intellectualEnvironment: "Books and ordinary discussion.",
      affordedRoles: ["caregiver", "peer", "teacher"],
    },
    developmentalWindow: {
      windowId: "window_local_time_repair",
      startAt: "2011-05-02T13:15:00.000Z",
      endAt: "2011-05-02T13:15:00.000Z",
      minAge: 11.331,
      maxAge: 11.331,
    },
    chronologyEndsAt: "2011-05-02T13:15:00.000Z",
    initialRoster: [
      { participantId: "thr_local_time_repair", factualRoles: ["subject"], relationshipFacts: [] },
      { participantId: "person_local_time_caregiver", factualRoles: ["caregiver"], relationshipFacts: ["Lives with subject."] },
    ],
    priorEpisodes: [],
    previouslyIntroducedParticipants: [],
    offeredStructures: [{
      structureId: "ges_local_time_peer_task",
      abstractSituation: "a peer and the subject handle one concrete shared task",
      participatingRoles: ["peer"],
      developmentalRange: { minAge: 10, maxAge: 12 },
      consequenceClass: "low",
    }],
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
    windowId: "window_local_time_repair",
    occurredAt: "2011-05-02T13:15:00.000Z",
    ageAtEvent: 11.331,
    timeZone: "America/New_York",
    localDate: "2011-05-02",
    localTime: "09:15",
    localWeekday: "Monday",
    daypart: "morning",
    placeRef: "place_local_time_school",
    placeKind: "school",
    selectionKind: "offered_structure",
    structureRef: "ges_local_time_peer_task",
    counterpartMode: "present_required",
    counterpart: {
      participantId: "person_local_time_peer",
      roleRef: "peer",
      origin: "historical_envelope",
      introducedHere: true,
    },
    externalCounterpartRequired: true,
  };
}

function realization(observableAction) {
  return {
    observableAction,
    additionalParticipantRefs: [],
    additionalIntroductions: [],
    intellectualEncounter: null,
  };
}

test("Pass A repairs conflicting daypart narration locally instead of spending a fresh record retry", async () => {
  let generationCalls = 0;
  const adapter = {
    invoke: async () => {
      generationCalls += 1;
      return {
        output: realization("On Sunday afternoon, the subject and peer compare two labels on a classroom materials box."),
        provenance: { provider: "fixture" },
      };
    },
  };
  let repairCalls = 0;
  const repairAdapter = {
    invoke: async (request) => {
      repairCalls += 1;
      assert.equal(request.input.failedGate, "pass_a_local_civil_time_narration");
      assert.match(GENESIS_REPLACEMENT_PASS_A_FORM_REPAIR_PROMPT, /remove explicit weekday, daypart, or clock-time wording/iu);
      return {
        output: { observableAction: "The subject and peer compare two labels on a classroom materials box." },
        provenance: { provider: "fixture-repair" },
      };
    },
  };

  const result = await generateReplacementHistoricalEpisode({
    adapter,
    repairAdapter,
    passAInput: passAInput(),
    envelope: envelope(),
    clientRequestId: "local-civil-time-repair",
  });

  assert.equal(generationCalls, 1);
  assert.equal(repairCalls, 1);
  assert.deepEqual(result.calls.map((call) => call.kind), ["initial", "form-repair-1"]);
  assert.deepEqual(result.budgetState, {
    generatedVersions: 2,
    formRepairs: 1,
    recordRetries: 0,
  });
});

test("Pass A may use both local repairs for repeated civil-time narration before consuming any record retry", async () => {
  const adapter = {
    invoke: async () => ({
      output: realization("In the afternoon, the subject and peer compare two classroom labels."),
      provenance: { provider: "fixture" },
    }),
  };
  let repairCalls = 0;
  const repairAdapter = {
    invoke: async (request) => {
      repairCalls += 1;
      assert.equal(request.input.failedGate, "pass_a_local_civil_time_narration");
      return repairCalls === 1
        ? {
            output: { observableAction: "Later that afternoon, the subject and peer compare two classroom labels." },
            provenance: { provider: "fixture-repair" },
          }
        : {
            output: { observableAction: "The subject and peer compare two classroom labels." },
            provenance: { provider: "fixture-repair" },
          };
    },
  };

  const result = await generateReplacementHistoricalEpisode({
    adapter,
    repairAdapter,
    passAInput: passAInput(),
    envelope: envelope(),
    clientRequestId: "local-civil-time-two-repairs",
  });

  assert.equal(repairCalls, 2);
  assert.deepEqual(result.calls.map((call) => call.kind), [
    "initial",
    "form-repair-1",
    "form-repair-2",
  ]);
  assert.deepEqual(result.budgetState, {
    generatedVersions: 3,
    formRepairs: 2,
    recordRetries: 0,
  });
});
