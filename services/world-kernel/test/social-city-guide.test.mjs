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
  assert.ok(page.places.length>=2,
    "The public guide lost its diverse real-world destinations");
  const place=page.places.find(item=>
    item.id==="national-library-of-georgia-building-iii");
  assert.ok(place,"Tbilisi's previously admitted library disappeared");
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

test("public editorial discovery does not imply World presence",()=>{
  const london=listSocialCityGuide(guide,{city:"London",countryCode:"GB"});
  assert.equal(london.status,"listed",
    "London's independently sourced cultural destinations are missing");
  assert.ok(london.places.length>=2,
    "City Guide lacks useful London cultural variety");
  assert.ok(london.places.every(item=>/^wpl_/u.test(item.worldPlaceRef??"")),
    "verified London World admissions were not published in the guide");
  assert.ok(london.places.every(item=>!Object.hasOwn(item,"attendance")),
    "a public World venue identity was misrepresented as an actual visit");

  const unknown=listSocialCityGuide(guide,{city:"Toulouse",countryCode:"FR"});
  assert.equal(unknown.status,"not_listed");
  assert.deepEqual(unknown.places,[],
    "an unlisted city invented public venues");

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
