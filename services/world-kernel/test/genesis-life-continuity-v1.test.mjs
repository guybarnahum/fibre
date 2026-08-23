import assert from "node:assert/strict";
import test from "node:test";

import { deriveGenesisLifeContinuity } from "../src/genesis-life-continuity-v1.mjs";

const world = {
  worldSpecId: "world_test_continuity",
  places: [
    { placeId: "place_home", description: "Home" },
    { placeId: "place_school", description: "School" },
  ],
};
const roster = [
  { participantId: "thr_test_continuity", factualRoles: ["subject"], relationshipFacts: [] },
  { participantId: "person_caregiver", factualRoles: ["caregiver"], relationshipFacts: ["Lives with the subject."] },
  { participantId: "person_sibling", factualRoles: ["sibling"], relationshipFacts: ["Older sibling."] },
];
const episodes = [
  {
    episodeId: "episode_1",
    occurredAt: "2012-01-01T12:00:00.000Z",
    placeRef: "place_home",
    participantRefs: ["thr_test_continuity", "person_caregiver"],
    introducedParticipants: [],
  },
  {
    episodeId: "episode_2",
    occurredAt: "2014-01-01T12:00:00.000Z",
    placeRef: "place_school",
    participantRefs: ["thr_test_continuity", "person_peer_1"],
    introducedParticipants: [
      { provisionalPersonId: "person_peer_1", roleRef: "peer", introducedAt: "2014-01-01T12:00:00.000Z" },
    ],
  },
  {
    episodeId: "episode_3",
    occurredAt: "2016-01-01T12:00:00.000Z",
    placeRef: "place_home",
    participantRefs: ["thr_test_continuity", "person_sibling", "person_peer_1"],
    introducedParticipants: [],
  },
];

test("continuity bundle preserves initial relationship facts, introduced roles and place evidence", () => {
  const bundle = deriveGenesisLifeContinuity({ threadId: "thr_test_continuity", worldSpec: world, initialRoster: roster, episodes });
  const byPerson = new Map(bundle.people.map((person) => [person.participantId, person]));
  assert.deepEqual(byPerson.get("person_caregiver").roleRefs, ["caregiver"]);
  assert.deepEqual(byPerson.get("person_caregiver").relationshipFacts, ["Lives with the subject."]);
  assert.deepEqual(byPerson.get("person_peer_1").roleRefs, ["peer"]);
  assert.equal(byPerson.get("person_peer_1").origin, "pass_a_introduction");
  assert.deepEqual(byPerson.get("person_peer_1").episodeRefs, ["episode_2", "episode_3"]);
  const byPlace = new Map(bundle.places.map((place) => [place.placeId, place]));
  assert.equal(byPlace.get("place_home").occurrenceCount, 2);
  assert.deepEqual(byPlace.get("place_home").episodeRefs, ["episode_1", "episode_3"]);
  assert.equal(bundle.guarantees.everyPublishedParticipantHasRoleAuthority, true);
  assert.equal(bundle.guarantees.everyPublishedPlaceResolvesToWorldSpec, true);
  assert.match(bundle.digest, /^sha256:[0-9a-f]{64}$/);
});

test("continuity derivation refuses opaque participant and place references", () => {
  assert.throws(() => deriveGenesisLifeContinuity({
    threadId: "thr_test_continuity",
    worldSpec: world,
    initialRoster: roster,
    episodes: [{ ...episodes[0], participantRefs: ["thr_test_continuity", "person_unknown"] }],
  }), /opaque participant/);
  assert.throws(() => deriveGenesisLifeContinuity({
    threadId: "thr_test_continuity",
    worldSpec: world,
    initialRoster: roster,
    episodes: [{ ...episodes[0], placeRef: "place_unknown" }],
  }), /opaque place/);
});
