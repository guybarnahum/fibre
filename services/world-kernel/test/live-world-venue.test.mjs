import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  bindLivePhysicalVenue,
  createLiveWorldPlaceTables,
  listLiveWorldPlaces,
  liveWorldPlaceRef,
  resolveLiveWorldPlace,
} from "../src/live-world-place.mjs";
import { meetingPresenceCompatible } from "../src/lived-meeting-cognition.mjs";
import {
  admitWorldPublicPlace,admitWorldPrivatePlace,coarseWorldPlace,
  createLiveWorldGeographyTables,getWorldPrivatePlace,listLocalWorldPublicPlaces,
} from "../src/live-world-geography.mjs";
import { canonicalJson,sha256 } from "../src/persistence-common.mjs";

test("E7.4 Genesis learning contexts cannot impersonate a common physical venue",()=>{
  const db=new DatabaseSync(":memory:",{enableForeignKeyConstraints:true});
  try{
    db.exec(`CREATE TABLE fibre_civil_registrations(
      thread_id TEXT PRIMARY KEY,world_ref TEXT NOT NULL
    ) STRICT`);
    createLiveWorldPlaceTables(db);
    const contexts=[
      {threadId:"thr_home_study",sourceWorldRef:"genesis_context_one",sourcePlaceId:"learn_one"},
      {threadId:"thr_public_library",sourceWorldRef:"genesis_context_two",sourcePlaceId:"learn_two"},
      {threadId:"thr_other_public_library",sourceWorldRef:"genesis_context_three",sourcePlaceId:"learn_three"},
      {threadId:"thr_reused_genesis_library",sourceWorldRef:"genesis_context_two",sourcePlaceId:"learn_two"},
    ];
    for(const context of contexts){
      db.prepare("INSERT INTO fibre_civil_registrations(thread_id,world_ref) VALUES (?,?)")
        .run(context.threadId,context.sourceWorldRef);
      const ref=liveWorldPlaceRef({...context,placeKind:"library_or_learning"});
      context.ref=ref;
      const record={
        ref,liveWorldRef:"lworld_fixture",sourceWorldRef:context.sourceWorldRef,
        sourcePlaceId:context.sourcePlaceId,placeKind:"library_or_learning",
        displayName:context.threadId==="thr_home_study"
          ?"Studying at home on a bed":"Reading at the neighborhood library",
        authority:"live-world-place-admission-v1",
      };
      db.prepare(`INSERT OR IGNORE INTO live_world_place_records(
        place_ref,live_world_ref,source_world_ref,source_place_id,place_kind,
        record_json,record_digest
      ) VALUES (?,?,?,?,?,?,?)`).run(
        ref,record.liveWorldRef,record.sourceWorldRef,record.sourcePlaceId,
        record.placeKind,canonicalJson(record),
        `sha256:${sha256(canonicalJson(record))}`,
      );
    }
    const [home,library,other]=contexts;
    const situation=(item)=>({
      threadId:item.threadId,location:{kind:"place",placeRef:item.ref},
    });
    assert.equal(meetingPresenceCompatible(
      situation(library),situation(other),{
        leftWorldPlaces:listLiveWorldPlaces(db,library.threadId),
        rightWorldPlaces:listLiveWorldPlaces(db,other.threadId),
      },
    ),false,"matching historical learning kinds manufactured co-presence");

    const venue={
      venueIdentity:"osm:way/12345",displayName:"Riverside Public Library",
      locality:"Riverside",country:"US",evidenceRef:"local-venue-identity-verified",
    };
    const first=bindLivePhysicalVenue(db,{
      threadId:library.threadId,contextPlaceRef:library.ref,...venue,
    });
    const second=bindLivePhysicalVenue(db,{
      threadId:other.threadId,contextPlaceRef:other.ref,...venue,
    });
    assert.equal(first.ref,second.ref,
      "independent Genesis contexts failed to resolve one actual venue");
    assert.equal(resolveLiveWorldPlace(db,library.threadId,library.ref)?.physicalVenue?.ref,
      first.ref,"single-place lookup lost the Thread's admitted physical venue");
    assert.equal(resolveLiveWorldPlace(db,home.threadId,library.ref),null,
      "single-place lookup crossed the Thread's Genesis World authority");
    assert.equal(resolveLiveWorldPlace(db,"thr_reused_genesis_library",library.ref)?.physicalVenue,
      undefined,"single-place lookup inherited another Thread's venue binding");
    assert.equal(meetingPresenceCompatible(
      situation(library),situation(other),{
        leftWorldPlaces:listLiveWorldPlaces(db,library.threadId),
        rightWorldPlaces:listLiveWorldPlaces(db,other.threadId),
      },
    ),true,"explicitly attested common venue did not permit co-presence");
    assert.equal(
      listLiveWorldPlaces(db,"thr_reused_genesis_library")[0].physicalVenue,
      undefined,
      "another Thread inherited a public venue merely by sharing Genesis context",
    );
    assert.equal(meetingPresenceCompatible(
      situation(home),situation(library),{
        leftWorldPlaces:listLiveWorldPlaces(db,home.threadId),
        rightWorldPlaces:listLiveWorldPlaces(db,library.threadId),
      },
    ),false,"home study entered a public scene because of Genesis kind");
    assert.equal(listLiveWorldPlaces(db,home.threadId)[0].physicalVenue,undefined,
      "private contextual place silently became an admitted public venue");
  }finally{db.close();}
});

test("independent Threads can know one real public venue while their precise homes stay private",()=>{
  const db=new DatabaseSync(":memory:");
  try{
    db.exec(`CREATE TABLE situated_evidence_witnesses(
      thread_id TEXT,reference TEXT,witness_kind TEXT
    ) STRICT`);
    createLiveWorldPlaceTables(db);
    createLiveWorldGeographyTables(db);
    const threads=[
      ["thr_world_citizen_one","per:home_one:1","12 Example Lane, Apt A"],
      ["thr_world_citizen_two","per:home_two:1","34 Example Lane, Apt C"],
      ["thr_world_citizen_other","per:home_other:1","56 Example Lane, Apt E"],
    ];
    const places=[];
    for(const [threadId,placeRef,streetAddress] of threads){
      db.prepare(`INSERT INTO situated_evidence_witnesses(
        thread_id,reference,witness_kind
      ) VALUES(?,?,'place_episode_revision')`).run(threadId,placeRef);
      places.push(admitWorldPrivatePlace(db,{
        threadId,placeRef,specificPlace:"My actual apartment",
        streetAddress,locality:threadId.endsWith("other")?"Batumi":"Tbilisi",
        country:"Georgia",countryCode:"GE",
        lat:threadId.endsWith("other")?41.65:41.72,
        long:threadId.endsWith("other")?41.64:44.78,
        timeZone:"Asia/Tbilisi",evidenceRef:"world-attested-private-address",
        publicGranularity:threadId.endsWith("one")?"city"
          :threadId.endsWith("two")?"country":"hidden",
      }));
    }
    // A historical home can be known by its city without a fabricated door number.
    db.prepare(`INSERT INTO situated_evidence_witnesses(
      thread_id,reference,witness_kind
    ) VALUES('thr_world_locality_only','per:home_locality:1','place_episode_revision')`).run();
    const localityOnly=admitWorldPrivatePlace(db,{
      threadId:"thr_world_locality_only",placeRef:"per:home_locality:1",
      specificPlace:"Apartment building in Tbilisi's Saburtalo district",
      streetAddress:null,locality:"Tbilisi",country:"Georgia",countryCode:"GE",
      lat:null,long:null,timeZone:"Asia/Tbilisi",
      evidenceRef:"per:home_locality:1",publicGranularity:"hidden",
    });
    assert.equal(localityOnly.streetAddress,null,
      "World manufactured a street address from partial residence history");
    assert.equal(localityOnly.lat,null,
      "World manufactured precise coordinates from partial residence history");
    assert.equal(coarseWorldPlace(localityOnly),null,
      "private locality was disclosed without authorization");
    const publicPlace=admitWorldPublicPlace(db,{
      venueIdentity:"fixture:venue/tbilisi-library",
      displayName:"Example City Library",streetAddress:"1 Example Square",
      locality:"Tbilisi",country:"Georgia",countryCode:"GE",
      lat:41.73,long:44.79,timeZone:"Asia/Tbilisi",
      evidenceRef:"fixture:independent-public-place",
      affordances:["Reading","Public learning"],
    });
    const inCity=places.slice(0,2).map(place=>
      listLocalWorldPublicPlaces(db,{locality:place.locality,countryCode:place.countryCode}));
    assert.equal(inCity[0][0].ref,inCity[1][0].ref,
      "two local lives did not resolve one independent public place");
    assert.equal(inCity[0][0].physicalVenue.ref,publicPlace.physicalVenue.ref);
    const atPlace=(threadId)=>({
      threadId,location:{kind:"place",placeRef:publicPlace.ref},
    });
    assert.equal(meetingPresenceCompatible(
      atPlace(threads[0][0]),atPlace(threads[1][0]),{
        leftWorldPlaces:inCity[0],rightWorldPlaces:inCity[1],
      },
    ),true,"two separately admitted lives cannot share one real public venue");
    assert.equal(listLocalWorldPublicPlaces(db,{
      locality:places[2].locality,countryCode:places[2].countryCode,
    }).length,0,"a public place appeared in a different locality");
    assert.equal(
      getWorldPrivatePlace(db,threads[0][0],threads[0][1])?.streetAddress,
      places[0].streetAddress,"Thread's own physical home is unknown",
    );
    assert.equal(getWorldPrivatePlace(db,threads[1][0],threads[0][1]),null,
      "one Thread learned another Thread's home");
    const coarse=coarseWorldPlace(places[0]);
    assert.equal(coarse.displayName,"Tbilisi, Georgia");
    assert.equal(coarseWorldPlace(places[1]).displayName,"Georgia",
      "country-only publication exposed the city");
    assert.equal(coarseWorldPlace(places[2]),null,
      "hidden home geography was disclosed");
    assert.equal(JSON.stringify(coarse).includes(places[0].streetAddress),false,
      "private address reached public geography");
    assert.throws(()=>admitWorldPublicPlace(db,{
      venueIdentity:"fixture:venue/tbilisi-library",
      displayName:"Example City Library",streetAddress:"9 Contradiction Way",
      locality:"Tbilisi",country:"Georgia",countryCode:"GE",
      lat:41.73,long:44.79,timeZone:"Asia/Tbilisi",
      evidenceRef:"fixture:independent-public-place",affordances:["Reading"],
    }),/conflicting facts/,"one real venue silently changed identity");
  }finally{db.close();}
});
