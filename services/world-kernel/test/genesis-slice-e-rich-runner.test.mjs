import assert from "node:assert/strict";
import test from "node:test";

import { GENESIS_EVENT_STRUCTURE_POOL_V2, sampleEventStructuresV2 } from "../src/genesis-event-structure-pool-v2.mjs";
import { buildRichLifePassAInput } from "../src/genesis-rich-life-domain.mjs";
import { GENESIS_RICH_PASS_A_RESPONSE_SCHEMA } from "../src/genesis-rich-life-episode.mjs";
import {
  GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA,
  GENESIS_RICH_PASS_A_REPAIR_TARGET_BYTES,
  GENESIS_RICH_PASS_A_REPAIR_TARGET_WORDS,
  GENESIS_RICH_PASS_A_SECOND_REPAIR_TARGET_BYTES,
  GENESIS_RICH_PASS_A_SECOND_REPAIR_TARGET_WORDS,
  generateRichPassAEpisode,
} from "../src/genesis-rich-pass-a-runner.mjs";

function input() {
  const developmentalWindow = {
    windowId: "slice_e_runner_window",
    startAt: "2008-01-01T00:00:00Z",
    endAt: "2010-12-31T23:59:59Z",
    minAge: 11,
    maxAge: 13.999,
  };
  return buildRichLifePassAInput({
    originMode: "synthetic_lineage",
    syntheticLineageWitness: {
      genomeRef: "genome_runner_child",
      parentOrAncestorRefs: ["ancestor_runner_a", "ancestor_runner_b"],
      recombinationWitnessRef: "recomb_runner_001",
    },
    worldSpec: {
      worldSpecId: "world_slice_e_runner",
      timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2020-01-01T00:00:00Z" },
      places: [{ placeId: "place_library", description: "A public library beside the school." }],
      householdShape: "A stable family household.",
      familyRelations: [],
      languages: ["English"],
      materialCircumstances: "Ordinary stable housing with public-institution access.",
      mobilityPattern: "Walking and transit.",
      schoolingOrCommunityContext: "A public school and library are available.",
      culturalContext: "A mixed urban neighborhood.",
      availableInstitutions: ["public_school", "public_library"],
      intellectualEnvironment: "Books, teachers, art and science demonstrations are accessible.",
      affordedRoles: ["caregiver", "sibling", "peer", "teacher", "neighbor", "librarian", "mentor", "shopkeeper"],
      worldAuthorship: {
        authorId: "slice_e_runner_author",
        sourcesConsulted: [],
        abstractionMethod: "Synthetic development-only world.",
        relocationWitness: "No named source scene or target adult retained.",
        familiarityProbe: null,
        createdAt: "2026-08-18T23:30:00Z",
      },
      createdAt: "2026-08-18T23:30:00Z",
    },
    subject: { provisionalThreadId: "thr_slice_e_runner", bornAt: "1997-01-01T00:00:00Z" },
    developmentalWindow,
    chronologyEndsAt: developmentalWindow.endAt,
    initialRoster: [
      { participantId: "thr_slice_e_runner", factualRoles: ["subject"], relationshipFacts: [] },
      { participantId: "person_teacher", factualRoles: ["teacher"], relationshipFacts: ["school teacher"] },
    ],
    priorEpisodes: [],
    previouslyIntroducedParticipants: [],
    eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    offeredEntries: sampleEventStructuresV2(GENESIS_EVENT_STRUCTURE_POOL_V2, developmentalWindow, { seed: "slice-e-runner", count: 9 }),
  });
}

function episode(observableAction, overrides = {}) {
  return {
    episodeId: "ep_slice_e_runner_001",
    occurredAt: "2009-05-12T16:00:00Z",
    ageAtEvent: 12.36,
    placeRef: "place_library",
    participantRefs: ["thr_slice_e_runner", "person_teacher"],
    observableAction,
    structureRef: null,
    introducedParticipants: [],
    intellectualEncounter: {
      kind: "book",
      subjectKind: "work",
      subjectLabel: "A short astronomy book from the library",
      participantRef: null,
      accessMode: "institution_mediated",
    },
    ...overrides,
  };
}

function adapter(outputs, calls) {
  let index = 0;
  return {
    async invoke(request) {
      calls.push(structuredClone(request));
      const output = outputs[index++];
      return { output, provenance: { provider: "fixture", modelId: "fixture-rich-pass-a" } };
    },
  };
}

test("rich runner keeps lineage out of cognition and admits a structured intellectual encounter", async () => {
  const calls = [];
  const result = await generateRichPassAEpisode({
    adapter: adapter([{ episode: episode("The student opens an astronomy book suggested by the teacher and compares two diagrams at a library table.") }], calls),
    input: input(),
    clientRequestId: "slice-e-rich-runner-accepted",
  });
  assert.equal(result.episode.intellectualEncounter.kind, "book");
  assert.match(result.episode.intellectualEncounter.subjectRef, /^isrc_[0-9a-f]{64}$/);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].responseSchema, GENESIS_RICH_PASS_A_RESPONSE_SCHEMA);
  const serialized = JSON.stringify(calls[0].input);
  for (const forbidden of ["genome_runner_child", "ancestor_runner_a", "recomb_runner_001", "synthetic_lineage"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("rich runner repair can author only replacement observableAction while Fibre preserves every other fact", async () => {
  const calls = [];
  const initial = episode("The student learned that science would always guide every future decision after opening the astronomy book.");
  const result = await generateRichPassAEpisode({
    adapter: adapter([
      { episode: initial },
      { observableAction: "The student opens the astronomy book, compares two diagrams, and points to one difference while the teacher stands nearby." },
    ], calls),
    input: input(),
    clientRequestId: "slice-e-rich-runner-repair",
  });
  assert.equal(result.repairs.length, 1);
  assert.equal(result.repairs[0].failedGate, "pass_a_interiority_form");
  assert.equal(result.episode.intellectualEncounter.accessMode, "institution_mediated");
  assert.equal(result.episode.episodeId, initial.episodeId);
  assert.deepEqual(result.episode.participantRefs, initial.participantRefs);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].responseSchema, GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA);
  assert.deepEqual(Object.keys(calls[1].responseSchema.properties), ["observableAction"]);
  assert.deepEqual(Object.keys(calls[1].input), ["rejectedObservableAction", "failedGate", "failedConstraint"]);
  const repairInput = JSON.stringify(calls[1].input);
  for (const hidden of ["episodeId", "person_teacher", "intellectualEncounter", "passAInput", "world_slice_e_runner"]) {
    assert.equal(repairInput.includes(hidden), false);
  }
});

test("rich runner bounds repair asks well below the authoritative byte ceiling", async () => {
  const calls = [];
  const overlong = "The student checks one shelf label against the catalog. ".repeat(30);
  assert.ok(Buffer.byteLength(overlong, "utf8") > 1200);
  const result = await generateRichPassAEpisode({
    adapter: adapter([
      { episode: episode(overlong) },
      { observableAction: "The student checks one shelf label against the catalog and asks the teacher to confirm the call number." },
    ], calls),
    input: input(),
    clientRequestId: "slice-e-rich-runner-byte-repair",
  });
  assert.equal(result.repairs.length, 1);
  assert.equal(result.repairs[0].failedGate, "pass_a_observable_action_bounds");
  assert.equal(result.repairs[0].failedConstraint.authoritativeMaxObservableActionUtf8Bytes, 1200);
  assert.equal(result.repairs[0].failedConstraint.targetRepairUtf8Bytes, GENESIS_RICH_PASS_A_REPAIR_TARGET_BYTES);
  assert.equal(result.repairs[0].failedConstraint.targetRepairWords, GENESIS_RICH_PASS_A_REPAIR_TARGET_WORDS);
  assert.equal(GENESIS_RICH_PASS_A_REPAIR_TARGET_BYTES, 600);
  assert.equal(GENESIS_RICH_PASS_A_REPAIR_TARGET_WORDS, 80);
  assert.ok(result.repairs[0].failedConstraint.rejectedObservableActionUtf8Bytes > 1200);
  assert.ok(Buffer.byteLength(result.episode.observableAction, "utf8") <= 1200);
});

test("repeated byte repair sees only the previous action and tightens the second target", async () => {
  const calls = [];
  const initialOverlong = "The student checks the catalog and shelf label while the teacher waits nearby. ".repeat(24);
  const firstRepairStillOverlong = "The student compares the catalog number with the shelf label and points to the mismatch. ".repeat(22);
  assert.ok(Buffer.byteLength(initialOverlong, "utf8") > 1200);
  assert.ok(Buffer.byteLength(firstRepairStillOverlong, "utf8") > 1200);

  const result = await generateRichPassAEpisode({
    adapter: adapter([
      { episode: episode(initialOverlong) },
      { observableAction: firstRepairStillOverlong },
      { observableAction: "The student compares the catalog number with the shelf label and points out the mismatch to the teacher." },
    ], calls),
    input: input(),
    clientRequestId: "slice-e-rich-runner-progressive-byte-repair",
  });

  assert.equal(result.repairs.length, 2);
  assert.equal(result.repairs[0].failedConstraint.targetRepairUtf8Bytes, GENESIS_RICH_PASS_A_REPAIR_TARGET_BYTES);
  assert.equal(result.repairs[0].failedConstraint.targetRepairWords, GENESIS_RICH_PASS_A_REPAIR_TARGET_WORDS);
  assert.equal(result.repairs[1].failedConstraint.targetRepairUtf8Bytes, GENESIS_RICH_PASS_A_SECOND_REPAIR_TARGET_BYTES);
  assert.equal(result.repairs[1].failedConstraint.targetRepairWords, GENESIS_RICH_PASS_A_SECOND_REPAIR_TARGET_WORDS);
  assert.equal(GENESIS_RICH_PASS_A_SECOND_REPAIR_TARGET_BYTES, 300);
  assert.equal(GENESIS_RICH_PASS_A_SECOND_REPAIR_TARGET_WORDS, 40);
  assert.equal(calls.length, 3);
  assert.equal(calls[1].input.rejectedObservableAction, initialOverlong);
  assert.equal(calls[2].input.rejectedObservableAction, firstRepairStillOverlong);
  for (const repairCall of calls.slice(1)) {
    const serialized = JSON.stringify(repairCall.input);
    for (const hidden of ["episodeId", "person_teacher", "intellectualEncounter", "passAInput", "world_slice_e_runner"]) {
      assert.equal(serialized.includes(hidden), false);
    }
  }
  assert.ok(Buffer.byteLength(result.episode.observableAction, "utf8") <= 1200);
});

test("rich runner rejects repair output that tries to reauthor fields outside observableAction", async () => {
  const calls = [];
  await assert.rejects(
    () => generateRichPassAEpisode({
      adapter: adapter([
        { episode: episode("The student learned that books would always matter after opening the astronomy book.") },
        {
          observableAction: "The student opens the astronomy book and compares two diagrams.",
          intellectualEncounter: { accessMode: "self_directed" },
        },
      ], calls),
      input: input(),
      clientRequestId: "slice-e-rich-runner-bad-repair",
    }),
    /unsupported field set|not allowed/,
  );
});
