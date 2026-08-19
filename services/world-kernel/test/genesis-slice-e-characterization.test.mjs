import assert from "node:assert/strict";
import test from "node:test";

import { GENESIS_EVENT_STRUCTURE_POOL_V2 } from "../src/genesis-event-structure-pool-v2.mjs";
import {
  assertSliceECharacterizationShape,
  characterizeSliceERichLife,
} from "../src/genesis-slice-e-characterization.mjs";
import { normalizeRichPassAEpisode } from "../src/genesis-rich-life-episode.mjs";

function episode({ id, structureRef = null, encounter = null, occurredAt = "2010-01-01T00:00:00Z" }) {
  const candidate = {
    episodeId: id,
    occurredAt,
    ageAtEvent: 13,
    placeRef: "place_e",
    participantRefs: ["thr_e"],
    observableAction: "The young person reads, listens, talks, or acts in one observable scene without the history record deciding what it means.",
    structureRef,
    introducedParticipants: [],
  };
  if (encounter !== null) candidate.intellectualEncounter = encounter;
  return normalizeRichPassAEpisode(candidate, { enforceObservableForm: false });
}

const book = {
  kind: "book",
  subjectKind: "work",
  subjectLabel: "A public-library astronomy book",
  participantRef: null,
  accessMode: "self_directed",
};

const science = {
  kind: "scientific_idea",
  subjectKind: "idea",
  subjectLabel: "A claim about pendulum length and timing",
  participantRef: null,
  accessMode: "institution_mediated",
};

test("Slice E characterization exposes rich-life observations but cannot produce an admission verdict", () => {
  const report = characterizeSliceERichLife({
    originMode: "de_novo",
    eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    episodes: [
      episode({ id: "ep_e_1", encounter: book }),
      episode({ id: "ep_e_2", encounter: book, occurredAt: "2014-01-01T00:00:00Z" }),
      episode({ id: "ep_e_3", encounter: science, occurredAt: "2015-01-01T00:00:00Z" }),
      episode({ id: "ep_e_4" }),
    ],
  });
  assert.equal(report.historicalEvents, 4);
  assert.equal(report.intellectualEncounterEvents, 3);
  assert.equal(report.encounterKindCounts.book, 2);
  assert.equal(report.encounterKindCounts.scientific_idea, 1);
  assert.equal(report.uniqueEncounterSourceCount, 2);
  assert.equal(report.repeatedEncounterSourceRefs.length, 1);
  assert.ok(report.eventStructureRangeSignatures.length >= 8);
  assert.equal(report.admissionVerdict, null);
  assert.doesNotThrow(() => assertSliceECharacterizationShape(report));
});

test("an intellectually empty life remains characterizable rather than being rejected for quality", () => {
  const report = characterizeSliceERichLife({
    originMode: "synthetic_lineage",
    eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    episodes: [episode({ id: "ep_empty_1" }), episode({ id: "ep_empty_2", occurredAt: "2011-01-01T00:00:00Z" })],
  });
  assert.equal(report.intellectualEncounterEvents, 0);
  assert.deepEqual(report.encounterKindCounts, {});
  assert.equal(report.admissionVerdict, null);
});

test("characterization rejects an invented verdict field value rather than becoming a hidden richness gate", () => {
  const report = characterizeSliceERichLife({
    originMode: "de_novo",
    eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    episodes: [],
  });
  assert.throws(() => assertSliceECharacterizationShape({ ...report, admissionVerdict: "reject_bland_life" }), /must not carry an admission verdict/);
});
