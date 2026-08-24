// fibre-test-lifecycle: permanent
// fibre-test-scope: genesis-birth
// fibre-test-purpose: publication-place-consistency-scene-setting

import assert from "node:assert/strict";
import test from "node:test";

import { assertGenesisEpisodePlaceConsistency } from "../../services/world-kernel/src/genesis-publication-place-consistency.mjs";

test("publication place gate distinguishes current scene from a reported place", () => {
  assert.equal(assertGenesisEpisodePlaceConsistency({
    episode: {
      episodeId: "ep_transit_reports_school_001",
      placeRef: "place_transit",
      observableAction: "On a bus heading toward home, the peer says a classmate deliberately ignored them at school and asks what the subject thinks.",
    },
    envelope: { placeRef: "place_transit", placeKind: "transit" },
  }), true);
});

test("publication place gate still refuses a contradictory opening scene", () => {
  assert.throws(() => assertGenesisEpisodePlaceConsistency({
    episode: {
      episodeId: "ep_transit_but_school_001",
      placeRef: "place_transit",
      observableAction: "In a classroom, the subject and peer compare notes before the lesson begins.",
    },
    envelope: { placeRef: "place_transit", placeKind: "transit" },
  }), /scene setting incompatible with authoritative placeRef/u);
});
