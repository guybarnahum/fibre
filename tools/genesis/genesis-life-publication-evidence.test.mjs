// fibre-test-lifecycle: permanent
// fibre-test-scope: genesis-birth
// fibre-test-purpose: preserve append-only epistemic evidence across multiple Genesis meaning revisions

import assert from "node:assert/strict";
import test from "node:test";

import {
  autobiographicalMeaningPartId,
  autobiographicalMemoryId,
} from "#services/world-kernel/src/autobiographical-memory-domain.mjs";
import {
  assertAutobiographicalMemoryRevisionCompatibility,
} from "#services/world-kernel/src/autobiographical-memory-persistence.mjs";
import { materializeGenesisMemoryRecords } from "./genesis-life-publication.mjs";

function meaning(memoryId, summary) {
  return {
    outcome: "revised",
    summary,
    parts: [{
      meaningPartId: autobiographicalMeaningPartId({ memoryId, ordinal: 1 }),
      meaning: `${summary} This remains a material and independently citable interpretation.`,
    }],
  };
}

test("Genesis publication carries prior supporting evidence through later meaning revisions", () => {
  const threadId = "thread_genesis_publication_evidence_fixture";
  const originEventRef = "event_genesis_publication_origin_fixture";
  const slot = "pass_b_call_01";
  const memoryRef = autobiographicalMemoryId({ threadId, originReference: originEventRef, slot });
  const initialMeaning = meaning(memoryRef, "I initially understand the event as a reason to check my assumptions carefully.");
  const firstRevision = meaning(memoryRef, "I later understand the event as evidence that careful checking can protect other people too.");
  const secondRevision = meaning(memoryRef, "I now understand the event as a reminder to combine care with willingness to revise my view.");

  const candidate = {
    threadId,
    passCInitial: [{ memoryRef, output: initialMeaning }],
    memories: [{
      memoryRef,
      slot,
      origin: { eventId: originEventRef },
      cited: [{ episode: { occurredAt: "2026-01-01T00:00:00.000Z" } }],
      eventRefs: [originEventRef],
      rememberedContent: "I remember checking the record twice before deciding what had actually happened.",
      uncertainty: [],
      initialMeaningFormedAt: "2026-01-02T00:00:00.000Z",
      reinterpretations: [
        {
          outcome: "revised",
          asOf: "2026-01-03T00:00:00.000Z",
          supportingEventRef: "event_genesis_publication_trigger_a_fixture",
          output: firstRevision,
        },
        {
          outcome: "revised",
          asOf: "2026-01-04T00:00:00.000Z",
          supportingEventRef: "event_genesis_publication_trigger_b_fixture",
          output: secondRevision,
        },
      ],
    }],
  };

  const records = materializeGenesisMemoryRecords(candidate, "2026-01-05T00:00:00.000Z");
  assert.equal(records.length, 3);
  assert.deepEqual(records[0].supportingEvidenceRefs, []);
  assert.deepEqual(records[1].supportingEvidenceRefs, ["event_genesis_publication_trigger_a_fixture"]);
  assert.deepEqual(records[2].supportingEvidenceRefs, [
    "event_genesis_publication_trigger_a_fixture",
    "event_genesis_publication_trigger_b_fixture",
  ]);

  assert.doesNotThrow(() => assertAutobiographicalMemoryRevisionCompatibility(records[0], records[1]));
  assert.doesNotThrow(() => assertAutobiographicalMemoryRevisionCompatibility(records[1], records[2]));
});
