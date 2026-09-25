import test from "node:test";
import assert from "node:assert/strict";

import { projectCurrentThreadLocation } from "../src/current-thread-location.mjs";

const entry = Object.freeze({
  threadId:"thr_current_location",
  birthPlace:"Tbilisi, Georgia",
});

test("current World place, not birthplace, defines the Threads map position", () => {
  const placeEpisode = {
    episodeId:"pep_current_jerusalem",
    revision:1,
    threadId:entry.threadId,
    episodeKind:"formative_presence",
    place:{
      placeId:"place_current_jerusalem",
      displayName:"A neighborhood library in Jerusalem",
      countryCode:"IL",
      region:null,
      locality:"Jerusalem",
      precision:"locality",
    },
    startAt:"2026-09-25T10:00:00.000Z",
    endAt:null,
    sourceReferences:["evt_current_jerusalem"],
    visibility:"private",
    status:"current",
    provenance:"genesis_created",
    recordedAt:"2026-09-25T10:00:00.000Z",
  };
  const location = projectCurrentThreadLocation({
    entry,
    currentSituation:{
      establishedAt:"2026-09-25T18:00:00.000Z",
      location:{ kind:"place", placeRef:"per:pep_current_jerusalem:1" },
    },
    placeEpisodes:[placeEpisode],
  });

  assert.equal(location.current, true);
  assert.equal(location.displayName, "A neighborhood library in Jerusalem");
  assert.equal(location.locality, "Jerusalem");
  assert.equal(location.country, "Israel");
  assert.equal(location.lat, 31.76904);
  assert.equal(location.long, 35.21633);
});

test("shared current venue uses current situation while retaining World-locality coordinates", () => {
  const location = projectCurrentThreadLocation({
    entry,
    currentSituation:{
      establishedAt:"2026-09-25T18:00:00.000Z",
      location:{ kind:"place", placeRef:"wpl_library" },
    },
    worldPlaces:[{
      ref:"wpl_library",
      displayName:"Neighborhood public library",
    }],
  });

  assert.equal(location.current, true);
  assert.equal(location.displayName, "Neighborhood public library");
  assert.equal(location.locality, "Tbilisi");
  assert.equal(location.authority, "live_world_place");
});

test("missing LivedNow never plots birthplace as current presence", () => {
  const location = projectCurrentThreadLocation({
    entry,
    currentSituation:null,
  });

  assert.equal(location, null, "Threads-now map must not substitute birthplace for current World presence");
});


test("unresolved current place never falls back to birthplace", () => {
  const location = projectCurrentThreadLocation({
    entry,
    currentSituation:{
      establishedAt:"2026-09-25T18:00:00.000Z",
      location:{ kind:"place", placeRef:"per:missing_current_place:1" },
    },
  });

  assert.equal(location, null, "unresolved current place was plotted as birthplace");
});
