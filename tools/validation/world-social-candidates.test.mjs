import assert from "node:assert/strict";
import test from "node:test";

import {currentCity,rankSocialCityCandidates} from "./world-social-candidates.mjs";

const places=[
  {placeRef:"wpl_library",venueRef:"venue_library",
    name:"Tbilisi Library",city:"Tbilisi",countryCode:"GE",discoveryListed:true},
  {placeRef:"wpl_cafe",venueRef:"venue_cafe",
    name:"Tbilisi Café",city:"Tbilisi",countryCode:"GE",discoveryListed:false},
  {placeRef:"wpl_museum",venueRef:"venue_museum",
    name:"Lisbon Museum",city:"Lisbon",countryCode:"PT",discoveryListed:true},
];

function person(id,ref="per:home",wakefulness="awake",city="Tbilisi",countryCode="GE"){
  return currentCity(id,{
    thread:{identity:{name:id}},
    birthPlace:{city:"Lisbon",countryCode:"PT"},
    livedNow:{
      currentSituation:{
        situationId:"sit_"+id,phase:"at_place",
        location:{kind:"place",placeRef:ref},wakefulness,
      },
      privatelyKnownCurrentPlace:ref==="per:home"
        ?{placeRef:ref,locality:city,countryCode}:null,
      currentLocation:{placeRef:ref,locality:city,countryCode},
      currentPersonalPlan:{stops:[{
        physicalPlaceRef:"wpl_library",
        startAt:"2026-10-20T11:00:00.000Z",
        endAt:"2026-10-20T12:00:00.000Z",
      }]},
    },
  });
}

test("current city comes from enacted life rather than published birthplace",()=>{
  assert.equal(currentCity("thr_unknown",{
    birthPlace:{city:"Tbilisi",countryCode:"GE"},
    livedNow:{currentSituation:null},
  }),null,"birthplace fabricated current presence");

  const here=person("thr_current");
  assert.equal(here.key,"GE:tbilisi","current private city was lost");
  assert.equal(here.placeRef,"per:home","home became a public venue");

  const transit=currentCity("thr_transit",{
    livedNow:{
      currentSituation:{
        situationId:"sit_transit",
        location:{kind:"transit",fromPlaceRef:"per:home",toPlaceRef:"wpl_library"},
      },
      currentLocation:{locality:"Tbilisi",countryCode:"GE"},
    },
  });
  assert.equal(transit,null,"transit was misidentified as at-place presence");
});

test("two independent Threads in one city are not automatically meeting",()=>{
  const result=rankSocialCityCandidates({at:"2026-10-19T18:00:00.000Z",
    places,people:[person("thr_a"),person("thr_b"),person("thr_else","per:home",
      "awake","Lisbon","PT")],
  });
  assert.equal(result.pairedCityCount,1,
    "co-located city candidates were not grouped");
  const city=result.pairedCities[0];
  assert.equal(city.locality,"Tbilisi");
  assert.equal(city.listedVenueCount,1);
  assert.equal(city.currentThreadCount,2);
  assert.equal(city.sharedCurrentPublicVenues.length,0,
    "two private homes were mistaken for shared physical presence");
  assert.equal(city.meetingEvidence,"same_city_only");
  assert.equal(city.threads[0].plannedPublicVisits[0].placeRef,"wpl_library",
    "an independently planned venue was not visible as intention");
  assert.equal(result.otherPopulatedCities[0].locality,"Lisbon",
    "an actual single-Thread city vanished from bounded results");
});

test("only two currently co-present non-sleeping visitors count as shared venue",()=>{
  const base=[person("thr_a","wpl_library"),person("thr_b","wpl_library")];
  const shared=rankSocialCityCandidates({at:"2026-10-19T18:00:00.000Z",places,people:base}).pairedCities[0];
  assert.equal(shared.meetingEvidence,"actual_shared_public_venue",
    "real co-presence was not distinguished from city residence");
  assert.deepEqual(shared.sharedCurrentPublicVenues[0].threadIds,
    ["thr_a","thr_b"]);
  const asleep=rankSocialCityCandidates({at:"2026-10-19T18:00:00.000Z",
    places,people:[base[0],person("thr_b","wpl_library","asleep")],
  }).pairedCities[0];
  assert.equal(asleep.sharedCurrentPublicVenues.length,0,
    "a sleeping visitor was counted as an ordinary social peer");
  assert.equal(asleep.meetingEvidence,"same_city_only",
    "sleep removed the Thread's actual city");
});
