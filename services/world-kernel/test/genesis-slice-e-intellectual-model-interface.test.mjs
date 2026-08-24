import assert from "node:assert/strict";
import test from "node:test";

import { GENESIS_EVENT_STRUCTURE_POOL_V2 } from "../src/genesis-event-structure-pool-v2.mjs";
import { buildRichLifePassAInput } from "../src/genesis-rich-life-domain.mjs";
import { generateRichPassAEpisode } from "../src/genesis-rich-pass-a-runner.mjs";
import {
  RICH_LIFE_TEST_SEEDS,
  RICH_LIFE_TEST_WORLD_FIXTURE,
  buildRichLifeTestPlan,
} from "./support/rich-life-fixture.mjs";

const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000;

function ageAt(bornAt, occurredAt) {
  return (Date.parse(occurredAt) - Date.parse(bornAt)) / YEAR_MS;
}

test("model-facing subjectPersonRef maps to canonical participantRef and intellectual retry exposes only the fixed gate rule", async () => {
  const worldFixture = RICH_LIFE_TEST_WORLD_FIXTURE;
  const plan = buildRichLifeTestPlan({ worldFixture, seed: RICH_LIFE_TEST_SEEDS[0] });
  const item = plan[7];
  const input = buildRichLifePassAInput({
    originMode: "de_novo",
    worldSpec: worldFixture.worldSpec,
    subject: worldFixture.subject,
    developmentalWindow: item.developmentalWindow,
    chronologyEndsAt: item.developmentalWindow.endAt,
    initialRoster: worldFixture.initialRoster,
    priorEpisodes: [],
    previouslyIntroducedParticipants: [],
    eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    offeredEntries: item.offeredEntries,
  });

  const occurredAt = new Date(Date.parse(item.developmentalWindow.startAt) + (7 * 24 * 60 * 60 * 1000)).toISOString();
  const mediatorId = worldFixture.initialRoster[1].participantId;
  const invalidSubjectLabel = "fixture book whose rejected label must never reach retry cognition";
  const baseEpisode = {
    episodeId: "episode_e2_intellectual_interface",
    occurredAt,
    ageAtEvent: ageAt(worldFixture.subject.bornAt, occurredAt),
    placeRef: worldFixture.worldSpec.places[1].placeId,
    participantRefs: [worldFixture.subject.provisionalThreadId, mediatorId],
    observableAction: "A caregiver points to a book on a school display table and the subject opens it to one diagram.",
    structureRef: null,
    introducedParticipants: [],
  };
  const invalid = {
    ...structuredClone(baseEpisode),
    intellectualEncounter: {
      kind: "book",
      subjectKind: "work",
      subjectLabel: invalidSubjectLabel,
      subjectPersonRef: mediatorId,
      accessMode: "institution_mediated",
    },
  };
  const valid = {
    ...structuredClone(baseEpisode),
    observableAction: "A caregiver points to a different short book on the display table and the subject opens it to a labeled diagram.",
    intellectualEncounter: {
      kind: "book",
      subjectKind: "work",
      subjectLabel: "short illustrated book from the school display",
      subjectPersonRef: null,
      accessMode: "institution_mediated",
    },
  };

  const calls = [];
  let invocation = 0;
  const adapter = {
    async invoke(request) {
      calls.push(structuredClone(request));
      invocation += 1;
      return {
        output: { episode: invocation === 1 ? invalid : valid },
        provenance: { provider: "fixture", modelId: "intellectual-interface-fixture" },
      };
    },
  };

  const result = await generateRichPassAEpisode({
    adapter,
    input,
    selectedOpportunity: { selectionKind: "world_emergent", structureRef: null },
    clientRequestId: "slice-e-intellectual-interface",
  });

  assert.equal(result.recordRetries.length, 1);
  assert.equal(result.recordRetries[0].failedGate, "pass_a_intellectual_encounter");
  assert.match(result.recordRetries[0].failedConstraint.rule, /subjectPersonRef/);
  assert.deepEqual(result.calls.map(({ kind }) => kind), ["initial", "record_retry"]);

  const encounterSchema = calls[0].responseSchema.properties.episode.properties.intellectualEncounter;
  assert.equal(encounterSchema.required.includes("subjectPersonRef"), true);
  assert.equal(encounterSchema.required.includes("participantRef"), false);
  assert.equal(Object.hasOwn(encounterSchema.properties, "subjectPersonRef"), true);
  assert.equal(Object.hasOwn(encounterSchema.properties, "participantRef"), false);

  assert.deepEqual(Object.keys(calls[1].input).sort(), [
    "failedConstraint",
    "failedGate",
    "passAInput",
    "selectedOpportunity",
  ]);
  assert.equal(JSON.stringify(calls[1].input).includes(invalidSubjectLabel), false);
  assert.equal(result.episode.intellectualEncounter.participantRef, null);
  assert.equal(Object.hasOwn(result.episode.intellectualEncounter, "subjectPersonRef"), false);
});
