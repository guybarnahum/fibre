import assert from "node:assert/strict";
import test from "node:test";
import {newbornLocationStatus} from "./birth-location-verification.mjs";

const threadPlace="per:plce_newborn_home:1";
const situation={
  situationId:"sit_newborn",phase:"at_place",
  location:{kind:"place",placeRef:threadPlace},
};
test("birth is located only when its enacted present has a city",()=>{
  assert.equal(newbornLocationStatus({livedNow:{currentSituation:null}}).state,
    "awaiting_first_life");
  const current={placeRef:threadPlace,locality:"Hilo, Hawaii",countryCode:"US"};
  assert.deepEqual(newbornLocationStatus({livedNow:{
    currentSituation:situation,privatelyKnownCurrentPlace:current,
  }}),{state:"located",location:{locality:"Hilo, Hawaii",countryCode:"US"}});
  assert.equal(newbornLocationStatus({livedNow:{
    currentSituation:situation,currentLocation:current,
  }}).state,"located","a projected current city did not count as located");
});

test("birth cannot be verified by a stale or incomplete location",()=>{
  for(const wrong of [
    {placeRef:"per:plce_previous:1",locality:"Hilo, Hawaii",countryCode:"US"},
    {placeRef:threadPlace,locality:"Hilo, Hawaii",countryCode:null},
    {placeRef:threadPlace,locality:null,countryCode:"US"},
  ]){
    const status=newbornLocationStatus({livedNow:{
      currentSituation:situation,privatelyKnownCurrentPlace:wrong,
    }});
    assert.equal(status.state,"missing_current_location",
      "unlocated first life was reported as verified");
  }
});
