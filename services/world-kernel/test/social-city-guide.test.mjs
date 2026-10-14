import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {listSocialCityGuide} from "../src/social-city-guide.mjs";

const guide=JSON.parse(readFileSync(
  new URL("../../../data/social-city-guide.json",import.meta.url),"utf8",
));
const library=JSON.parse(readFileSync(
  new URL("../../../data/world/places/tbilisi-national-library-building-iii.json",import.meta.url),"utf8",
));

test("the Tbilisi guide recommends a real place without claiming visitors",()=>{
  const page=listSocialCityGuide(guide,{city:"tbilisi",countryCode:"GE"});
  assert.equal(page.status,"listed","Tbilisi's public guide is missing");
  assert.equal(page.places.length,1);
  const [place]=page.places;
  assert.equal(place.address,library.streetAddress,
    "editorial address contradicts admitted World evidence");
  assert.equal(place.source.url,library.evidenceRef,
    "editorial listing lost its source");
  assert.match(place.worldPlaceRef,/^wpl_/u,
    "known World venue lost its shared identity");
  assert.equal("attendance" in place,false,
    "a guide listing became an attendance claim");
  assert.equal("threadId" in place,false,
    "a guide listing exposed an individual");
});

test("an unlisted city stays unknown; an external listing never becomes World presence",()=>{
  const unknown=listSocialCityGuide(guide,{city:"London",countryCode:"GB"});
  assert.equal(unknown.status,"not_listed");
  assert.deepEqual(unknown.places,[],
    "the magazine invented recommendations for an unknown city");

  const external=structuredClone(guide);
  external.cities["tel-aviv-IL"]={
    city:"Tel Aviv",country:"Israel",countryCode:"IL",
    places:{"sample-community-space":{
      name:"Sample Community Space",
      lastRecommendedAt:"2026-10-14",
      address:"Public Example Square",
      description:"A location from a third-party directory",
      activities:["Community discussions"],
      source:{directory:"independent",url:"https://example.org/venue"},
      worldPlaceRef:null,
    }},
  };
  const page=listSocialCityGuide(external,{city:"Tel Aviv",countryCode:"IL"});
  assert.equal(page.places[0].worldPlaceRef,null,
    "an external magazine listing falsely became an admitted World place");
});
