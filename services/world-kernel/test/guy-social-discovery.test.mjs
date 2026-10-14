import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import test from "node:test";

import {
  admitWorldPublicPlace,admitWorldPrivatePlace,createLiveWorldGeographyTables,
  listLocalWorldPublicPlaces,
} from "../src/live-world-geography.mjs";
import {createLiveWorldPlaceTables} from "../src/live-world-place.mjs";
import {createGuySocialDiscovery} from "../src/guy-social-discovery.mjs";

function withPlaces(fn){
  const db=new DatabaseSync(":memory:");
  try{
    db.exec(`CREATE TABLE situated_evidence_witnesses(
      thread_id TEXT,reference TEXT,witness_kind TEXT
    ) STRICT`);
    createLiveWorldPlaceTables(db);
    createLiveWorldGeographyTables(db);
    const publicLibrary={
      venueIdentity:"fixture:tbilisi-library",
      displayName:"National Library — Test Building",
      streetAddress:"7 Example Street, Tbilisi",
      locality:"Tbilisi",country:"Georgia",countryCode:"GE",
      lat:41.7,long:44.8,timeZone:"Asia/Tbilisi",
      evidenceRef:"fixture:public-library-source",
      affordances:["Reading","Study"],
    };
    const library=admitWorldPublicPlace(db,publicLibrary);
    db.prepare(`INSERT INTO situated_evidence_witnesses(
      thread_id,reference,witness_kind
    ) VALUES('thr_guy_private','per:guy_home:1','place_episode_revision')`).run();
    admitWorldPrivatePlace(db,{
      threadId:"thr_guy_private",placeRef:"per:guy_home:1",
      specificPlace:"An individual's apartment in Saburtalo",
      streetAddress:"99 Hidden Apartment, Saburtalo",
      locality:"Tbilisi",country:"Georgia",countryCode:"GE",
      lat:41.71,long:44.77,timeZone:"Asia/Tbilisi",
      evidenceRef:"per:guy_home:1",publicGranularity:"hidden",
    });
    const guy=createGuySocialDiscovery({
      listPublicPlaces:query=>listLocalWorldPublicPlaces(db,query),
    });
    return fn({guy,db,library});
  }finally{db.close();}
}

test("Guy offers a real place to a human or Thread without claiming anyone will be there",()=>withPlaces(({guy,library})=>{
  for(const asker of ["human","thread"]){
    const result=guy.ask({
      asker,question:"I'm in Tbilisi, where can I meet a person?",
    });
    assert.equal(result.status,"place_opportunities","a public social opportunity was lost");
    assert.equal(result.places[0].worldPlaceRef,library.ref);
    assert.equal(result.places[0].attendance,"not_verified");
    assert.equal(result.places[0].threadMeeting,"not_verified");
    assert.equal(result.places[0].source.evidenceRef,library.evidenceRef);
    assert.equal(result.coverage,"fibre_places_only");
    assert.equal(result.places.length,1);
    assert.equal(JSON.stringify(result).includes("99 Hidden Apartment"),false,
      "a private residential address leaked into Guy's public knowledge");
    assert.equal(JSON.stringify(result).includes("thr_guy_private"),false,
      "Guy exposed a private resident");
  }
}));

test("a social question cannot turn a library into a verified Thread meeting",()=>withPlaces(({guy})=>{
  const thread=guy.ask({
    question:"Where can I meet a Thread in Tbilisi?",
    asker:"human",
  });
  assert.equal(thread.seeking,"thread");
  assert.equal(thread.status,"place_opportunities");
  assert.equal(thread.places[0].threadMeeting,"not_verified");
  assert.match(thread.answer,/none verifies that a Thread can be met/u);

  const digital=guy.ask({
    question:"Where can I meet a Thread online in Tbilisi?",
  });
  assert.equal(digital.status,"no_verified_options");
  assert.equal(digital.places.length,0,
    "a physical library was falsely offered as a digital meeting channel");
  assert.match(digital.answer,/no verified digital meeting/u);
}));

test("Guy keeps unknown cities, missing locations and overlapping country names uncertain",()=>withPlaces(({guy,db,library})=>{
  const empty=guy.ask({question:"Where can I meet a Thread in London?"});
  assert.equal(empty.status,"no_verified_options");
  assert.equal(empty.places.length,0);
  assert.match(empty.answer,/Other public directories are not yet connected/u);

  const vague=guy.ask({question:"Where can I meet someone?"});
  assert.equal(vague.status,"needs_location");
  assert.equal(vague.places.length,0);

  const unknown=guy.ask({question:"What social life is there in Tel Aviv?"});
  assert.equal(unknown.location.locality,"Tel Aviv");
  assert.equal(unknown.status,"no_verified_options");

  admitWorldPublicPlace(db,{
    venueIdentity:"fixture:tbilisi-other-country",
    displayName:"Another Tbilisi Community Center",
    streetAddress:"2 Example Avenue",
    locality:"Tbilisi",country:"Fictional Example",countryCode:"EX",
    lat:40.0,long:43.0,timeZone:"Asia/Tbilisi",
    evidenceRef:"fixture:independent-second-country",
    affordances:["Community activities"],
  });
  assert.equal(guy.ask({
    question:"Where can I meet people in Tbilisi?",
  }).status,"needs_country","same-name cities silently merged across countries");
  const disambiguated=guy.ask({
    question:"Where can I meet people in Tbilisi?",
    location:{locality:"Tbilisi",countryCode:"GE"},
  });
  assert.equal(disambiguated.places.length,1);
  assert.equal(disambiguated.places[0].worldPlaceRef,library.ref);
}));
