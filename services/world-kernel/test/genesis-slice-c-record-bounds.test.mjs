import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_PASS_A_POLICY,
  buildPassAInput,
  sampleEventStructures,
} from "../src/genesis-pass-a-domain.mjs";
import { GENESIS_EVENT_STRUCTURE_POOL_V1 } from "../src/genesis-event-structure-pool-v1.mjs";
import {
  GENESIS_PASS_A_PROMPT,
  GENESIS_PASS_A_REPAIR_PROMPT,
  generatePassAEpisode,
} from "../src/genesis-pass-a-runner.mjs";

const subject = Object.freeze({ provisionalThreadId: "thr_slice_c_bounds", bornAt: "1992-05-14T00:00:00Z" });
const window = Object.freeze({
  windowId: "middle_childhood",
  startAt: "1998-05-14T00:00:00Z",
  endAt: "2004-05-13T23:59:59Z",
  minAge: 6,
  maxAge: 11.999,
});
const world = Object.freeze({
  worldSpecId: "world_slice_c_bounds",
  timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2008-12-31T23:59:59Z" },
  places: [
    { placeId: "place_home", description: "A rented apartment on a residential block." },
    { placeId: "place_school", description: "A neighborhood public school." },
  ],
  householdShape: "Two caregivers and two children share a rented apartment.",
  familyRelations: ["One younger sibling lives in the household."],
  languages: ["English"],
  materialCircumstances: "Ordinary bills are reliable with little discretionary money.",
  mobilityPattern: "Walking and public transit are normal.",
  schoolingOrCommunityContext: "Public school, local shops, and neighborhood activity are available.",
  culturalContext: "Extended-family visits and ordinary neighborhood routines occur.",
  availableInstitutions: ["public_school", "public_library", "local_commerce", "public_transit"],
  intellectualEnvironment: "School books, library materials, radio news, and repair manuals are accessible.",
  affordedRoles: ["household_member", "responsible_adult", "peer", "school_teacher", "librarian", "shopkeeper", "neighbor"],
  worldAuthorship: {
    authorId: "fibre_test",
    sourcesConsulted: [],
    abstractionMethod: "Synthetic fixture.",
    relocationWitness: "Portable fixture.",
    familiarityProbe: null,
    createdAt: "2026-08-16T01:00:00Z",
  },
  createdAt: "2026-08-16T01:00:00Z",
});
const roster = Object.freeze([
  { participantId: subject.provisionalThreadId, factualRoles: ["subject"], relationshipFacts: ["Provisional Thread."] },
  { participantId: "person_caregiver", factualRoles: ["household_member", "responsible_adult"], relationshipFacts: ["Lives in household."] },
]);
const offered = sampleEventStructures(GENESIS_EVENT_STRUCTURE_POOL_V1, window, { seed: "slice-c-bounds-offer" });

function input() {
  return buildPassAInput({
    worldSpec: world,
    subject,
    developmentalWindow: window,
    chronologyEndsAt: window.endAt,
    initialRoster: roster,
    priorEpisodes: [],
    previouslyIntroducedParticipants: [],
    eventStructurePool: GENESIS_EVENT_STRUCTURE_POOL_V1,
    offeredStructures: offered,
  });
}

function episode(observableAction) {
  return {
    episodeId: "ep_slice_c_bounds_001",
    occurredAt: "1999-02-03T17:10:00Z",
    ageAtEvent: 6.72,
    placeRef: "place_home",
    participantRefs: [subject.provisionalThreadId, "person_caregiver"],
    observableAction,
    structureRef: null,
    introducedParticipants: [],
  };
}

test("Pass A tells generation and repair cognition the exact observableAction byte ceiling", () => {
  assert.match(GENESIS_PASS_A_PROMPT, new RegExp(`${GENESIS_PASS_A_POLICY.maxObservableActionBytes} UTF-8 bytes`));
  assert.match(GENESIS_PASS_A_REPAIR_PROMPT, new RegExp(`${GENESIS_PASS_A_POLICY.maxObservableActionBytes} UTF-8 bytes`));
});

test("oversized observableAction repair receives the exact failed bound and preserves event facts", async () => {
  const oversized = episode("x".repeat(GENESIS_PASS_A_POLICY.maxObservableActionBytes + 100));
  const repaired = episode("The child and caregiver moved plates from a loose cupboard shelf and tightened the hinge screws together.");
  const invocations = [];
  const adapter = {
    async invoke(request) {
      invocations.push(request);
      return {
        output: { episode: invocations.length === 1 ? oversized : repaired },
        provenance: { provider: "mock", modelId: "slice-c-bounds" },
      };
    },
  };

  const result = await generatePassAEpisode({
    adapter,
    input: input(),
    clientRequestId: "slice-c-bounds-repair",
  });

  assert.equal(invocations.length, 2);
  assert.equal(invocations[1].input.failedGate, "pass_a_observable_action_bounds");
  assert.equal(invocations[1].input.failedConstraint.maxObservableActionUtf8Bytes, GENESIS_PASS_A_POLICY.maxObservableActionBytes);
  assert.equal(invocations[1].input.failedConstraint.rejectedObservableActionUtf8Bytes, GENESIS_PASS_A_POLICY.maxObservableActionBytes + 100);
  assert.equal(result.repairs.length, 1);
  assert.equal(result.episode.observableAction, repaired.observableAction);
});

test("record-repair exhaustion preserves all generated-call and rejected-record evidence", async () => {
  let invocation = 0;
  const adapter = {
    async invoke() {
      invocation += 1;
      return {
        output: { episode: episode("z".repeat(GENESIS_PASS_A_POLICY.maxObservableActionBytes + invocation)) },
        provenance: { provider: "mock", modelId: "slice-c-bounds" },
      };
    },
  };

  await assert.rejects(
    generatePassAEpisode({
      adapter,
      input: input(),
      clientRequestId: "slice-c-bounds-exhaustion",
    }),
    (error) => {
      assert.equal(error?.gate, "record_repair_exhausted");
      assert.equal(error?.cause?.gate, "pass_a_observable_action_bounds");
      assert.equal(error?.calls?.length, GENESIS_PASS_A_POLICY.maxGeneratedVersionsPerRecord);
      assert.equal(error?.repairEvidence?.length, GENESIS_PASS_A_POLICY.maxGeneratedVersionsPerRecord - 1);
      assert.equal(error?.repairEvidence?.[0]?.failedConstraint?.maxObservableActionUtf8Bytes, GENESIS_PASS_A_POLICY.maxObservableActionBytes);
      assert.equal(typeof error?.repairEvidence?.[0]?.rejectedEpisode?.observableAction, "string");
      return true;
    },
  );
});