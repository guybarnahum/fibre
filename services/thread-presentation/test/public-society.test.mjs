import assert from "node:assert/strict";
import test from "node:test";
import { composeSocietyNow, createPublicSocietyApi } from "../src/public-society.mjs";

const present = (situationId, payload) => ({ kind:"present.updated", payload:{ presentVersion:"thread-public-present-v0.2",
  situationId, establishedAt:"2026-11-22T09:00:00.000Z", mediatedContext:null, reason:null, participants:[],
  depictionMediaId:`media_present_${situationId}`, ...payload } });
const library = { kind:"place", place:{ displayName:"Abrehot Library", region:"Addis Ababa" } };
const thread = (threadId, displayName, payload, lifecycleStatus = "frozen") => ({ threadId, displayName, lifecycleStatus,
  portraitThumbnailObjectRef:`obj_${threadId}`, currentPresent:payload === null ? null : present(`sit_${threadId}`, payload) });
const THREADS = [
  thread("thr_habiba", "Habiba", { phase:"at_place", location:library, outwardActivity:"reading" }),
  thread("thr_kadir", "Kadir", { phase:"at_place", location:library, outwardActivity:"taking notes" }),
  thread("thr_bontu", "Bontu", { phase:"at_place", location:{ kind:"place", place:{ displayName:"Addis Ababa, Ethiopia", region:null } },
    outwardActivity:"sleeping" }),
  thread("thr_nathan", "Nathan", { phase:"in_transit", location:{ kind:"transit", from:null, to:library.place, progress:0.5 },
    outwardActivity:"walking" }),
  thread("thr_resting", "Resting", { phase:"at_place", location:library, outwardActivity:"reading" }),
  thread("thr_dormant", "Between moments", { phase:"at_place", location:library, outwardActivity:"reading" }, "dormant"),
  thread("thr_candidate", "Not yet born", { phase:"at_place", location:library, outwardActivity:"reading" }, "genesis_candidate"),
  thread("thr_retired", "Retired", { phase:"at_place", location:library, outwardActivity:"reading" }, "retired"),
  thread("thr_unplaced", "Born, not yet placed", null),
];
const WORLD = { asOf:"2026-11-22T10:00:00.000Z", resting:["thr_resting"],
  meetings:[{ encounterStoryId:"story_talk", occurredAt:"2026-11-22T09:30:00.000Z", threadIds:["thr_habiba", "thr_kadir"],
    place:{ displayName:"Abrehot Library", locality:"Addis Ababa" } }] };

test("the public society shows where living Threads are and what can be seen of them, counts who rests, and never guesses a home", () => {
  const society = composeSocietyNow({ threads:THREADS, world:WORLD, asOf:WORLD.asOf });
  const [addis] = society.cities;
  const listed = [...addis.venues.flatMap((venue) => venue.presentThreads), ...addis.inTransitThreads, ...addis.unnamedPlaceThreads];
  assert.deepEqual(society.cities.map((city) => city.locality), ["Addis Ababa"]);
  assert.deepEqual(listed.map((item) => item.threadId).sort(), ["thr_bontu", "thr_dormant", "thr_habiba", "thr_kadir", "thr_nathan"],
    "a living Thread between moments went missing, or a resting, unborn or retired one was listed as living");
  assert.deepEqual(society.population, { livingPublicCount:5, restingCount:1 });
  assert.deepEqual(addis.venues.map((venue) => venue.displayName), ["Abrehot Library"], "a home was shown as a venue");
  assert.deepEqual(addis.venues[0].presentThreads.find((item) => item.threadId === "thr_habiba").coPresentThreadIds, ["thr_kadir", "thr_dormant"],
    "who is there together was lost");
  assert.equal(addis.unnamedPlaceThreads[0].threadId, "thr_bontu", "a place with no public name was guessed at");
  assert.deepEqual(society.recentPublicEncounters[0].participantNames, ["Habiba", "Kadir"]);
});

test("nothing private crosses into the public society view, and nothing said in a meeting", async () => {
  const leaky = [{ ...THREADS[0], currentPresent:{ kind:"present.updated", payload:{ ...THREADS[0].currentPresent.payload,
    activity:"Read and study, wondering whether to tell Kadir about my exam" } } }];
  const api = createPublicSocietyApi({ viewerOrigin:"https://insidefibre.com",
    listPublicThreads:async () => leaky, readWorldSociety:async () => WORLD });
  const response = await api.fetch(new Request("https://presentation.example/api/society/now", { headers:{ Origin:"https://insidefibre.com" } }));
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.equal(text.includes("wondering whether to tell Kadir"), false, "a private intention reached the public view");
  assert.equal(JSON.parse(text).recentPublicEncounters.every((meeting) => Object.keys(meeting).sort().join()
    === "encounterStoryId,locality,occurredAt,participantNames,participantThreadIds,placeDisplayName"), true,
    "a meeting carried more than who, where and when");
  const refused = await api.fetch(new Request("https://presentation.example/api/society/now", { headers:{ Origin:"https://elsewhere.example" } }));
  assert.equal(refused.status, 403, "another site could read the society view");
});
