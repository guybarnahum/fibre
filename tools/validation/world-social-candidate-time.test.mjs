import assert from "node:assert/strict";
import test from "node:test";
import {rankSocialCityCandidates} from "./world-social-candidates.mjs";

test("an old plan is not a future visit; unknown is not confirmed awake",()=>{
  const location={key:"GE:tbilisi",locality:"Tbilisi",countryCode:"GE"};
  const one={...location,threadId:"thr_a",name:"A",placeRef:"per:home",
    atPlace:true,wakefulness:"awake",plan:{stops:[{
      physicalPlaceRef:"wpl_library",endAt:"2026-10-19T18:15:00.000Z",
    }]},situationRef:"sit_a"};
  const two={...location,threadId:"thr_b",name:"B",placeRef:"per:home",
    atPlace:true,wakefulness:"unknown",plan:null,situationRef:"sit_b"};
  const result=rankSocialCityCandidates({
    places:[{placeRef:"wpl_library",venueRef:"venue_library",name:"Library",
      city:"Tbilisi",countryCode:"GE",discoveryListed:true}],
    people:[one,two],at:"2026-10-19T18:45:00.000Z",
  }).pairedCities[0];
  assert.equal(result.awakeThreadCount,1);
  assert.equal(result.unknownWakefulnessThreadCount,1);
  assert.equal(result.threads[0].plannedPublicVisits.length,0);
});
