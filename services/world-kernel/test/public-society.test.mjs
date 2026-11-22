import assert from "node:assert/strict";
import test from "node:test";
import { projectPublicSociety } from "../src/public-society.mjs";

const at = (place) => JSON.stringify({ location:{ kind:"place", placeRef:place } });
const story = (...actors) => JSON.stringify({ beats:actors.map((actorThreadId) => ({ kind:"utterance", actorThreadId, text:"private words" })) });
const row = (encounter, threadId, actors, place = "wpl_library") => ({ encounter_id:encounter, occurred_at:"2026-11-22T09:30:00.000Z",
  story_json:story(...actors), thread_id:threadId, situation_json:at(place) });
const venueOf = (_threadId, placeRef) => placeRef === "wpl_library" ? { displayName:"Abrehot Library", locality:"Addis Ababa" } : null;

test("World tells the public who met whom at a public venue, and who rests among the Threads it shows, nothing more", () => {
  const society = projectPublicSociety({ now:"2026-11-22T10:00:00.000Z", venueOf,
    threadIds:["thr_habiba", "thr_kadir", "thr_resting"], resting:["thr_resting", "thr_not_shown"],
    rows:[
      row("story_talk", "thr_habiba", ["thr_habiba", "thr_kadir"]), row("story_talk", "thr_kadir", ["thr_habiba", "thr_kadir"]),
      row("story_rain", "thr_habiba", []), row("story_rain", "thr_kadir", []),
      row("story_visitor", "thr_habiba", ["thr_habiba"]),
      row("story_private", "thr_habiba", ["thr_habiba", "thr_hidden"]), row("story_private", "thr_hidden", ["thr_habiba", "thr_hidden"]),
      row("story_home", "thr_habiba", ["thr_habiba", "thr_kadir"], "per:home"), row("story_home", "thr_kadir", ["thr_habiba", "thr_kadir"], "per:home"),
    ] });
  assert.deepEqual(society.resting, ["thr_resting"], "a Thread not shown publicly was disclosed as resting");
  assert.deepEqual(society.meetings.map((meeting) => [meeting.threadIds.join("+"), meeting.place?.displayName ?? null]),
    [["thr_habiba+thr_kadir", "Abrehot Library"], ["thr_habiba+thr_kadir", null]],
    "a witnessed happening, a visitor, or someone not shown counted as a public meeting, or a home was named");
  assert.equal(JSON.stringify(society).includes("private words"), false, "words said reached the public view");
});
