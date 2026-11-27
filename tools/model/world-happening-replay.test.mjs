import assert from "node:assert/strict";
import test from "node:test";
import { replayOccasions } from "./world-happening-replay.mjs";

// The replay gives each person the happenings it has already shown them in the
// past day, as the World would, and nothing they were not there for.
const at = (hours) => new Date(Date.parse("2026-11-26T08:00:00.000Z") + hours * 3_600_000).toISOString();
const occasion = (hours, ...threads) => ({ input: { occurrenceAt: at(hours),
  initiatingSituation: { situationId: `sit_${threads[0]}`, physicalVenue: threads.length > 1 ? { ref: "plc_park" } : null },
  potentialObservers: threads.map((id) => ({ threadId: id, situationId: `sit_${id}` })) } });

test("a replayed person is told lately only what the replay already showed them within the day", async () => {
  const seen = {};
  const answered = await replayOccasions([
    occasion(0, "thr_a"), occasion(1, "thr_b", "thr_a"), occasion(2, "thr_a"), occasion(3, "thr_b"), occasion(30, "thr_a"),
  ], async (input) => {
    seen[input.occurrenceAt] = input.lately;
    const people = input.potentialObservers.map((item) => item.threadId);
    return { output: { likelihood: 1, occurrenceText: `happening at ${input.occurrenceAt}`, potentialObserverThreadIds: people } };
  });
  assert.equal(answered.length, 5);
  assert.deepEqual(seen[at(0)], [], "a first occasion had something shown lately");
  assert.deepEqual(seen[at(1)], [], "a person was told of a happening they were not there for");
  assert.deepEqual(seen[at(2)], [`happening at ${at(1)}`, `happening at ${at(0)}`], "the day's happenings were not shown, newest first");
  assert.deepEqual(seen[at(3)], [`happening at ${at(1)}`], "a shared happening was not shown to the other person there");
  assert.deepEqual(seen[at(30)], [], "a happening from yesterday was still shown as lately");
});
