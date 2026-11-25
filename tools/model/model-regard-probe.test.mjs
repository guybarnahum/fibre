import assert from "node:assert/strict";
import test from "node:test";
import { withFriction } from "./model-regard-probe.mjs";

test("a regard probe changes only what the other person just did, never the Thread or its Body", () => {
  const turn = { thread: { threadId: "thr_a" }, story: { beats: [{ actorThreadId: "thr_b", kind: "utterance", text: "Exactly." }] },
    liveInteraction: { body: ["You want to hold your own with them."],
      heardSoFar: { thr_b: { speechRef: "thr_b:speech:2", text: "Exactly.", active: true } },
      opportunity: { sourceActorId: "thr_b", speechRef: "thr_b:speech:2", reason: "sentence", heardText: "Exactly." } } };
  const corrected = withFriction(turn, "corrected");
  assert.match(corrected.liveInteraction.opportunity.heardText, /not right/u, "the friction was not what was heard");
  assert.equal(corrected.liveInteraction.heardSoFar.thr_b.text, corrected.liveInteraction.opportunity.heardText,
    "what was heard and what was said so far disagree");
  assert.equal(corrected.story.beats.at(-1).actorThreadId, "thr_b", "the friction was not the other person's");
  assert.deepEqual([corrected.thread, corrected.liveInteraction.body], [turn.thread, turn.liveInteraction.body],
    "the Thread or its Body changed");
  assert.equal(turn.liveInteraction.opportunity.heardText, "Exactly.", "the recorded request was changed");
  const overlooked = withFriction(turn, "overlooked").liveInteraction.opportunity;
  assert.deepEqual([overlooked.reason, overlooked.heardText], ["action", null], "being overlooked was heard as words");
});
