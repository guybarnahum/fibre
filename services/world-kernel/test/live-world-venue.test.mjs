import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  bindLivePhysicalVenue,
  createLiveWorldPlaceTables,
  listLiveWorldPlaces,
  liveWorldPlaceRef,
} from "../src/live-world-place.mjs";
import { meetingPresenceCompatible } from "../src/lived-meeting-cognition.mjs";
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
      db.prepare(`INSERT INTO live_world_place_records(
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
    assert.equal(meetingPresenceCompatible(
      situation(library),situation(other),{
        leftWorldPlaces:listLiveWorldPlaces(db,library.threadId),
        rightWorldPlaces:listLiveWorldPlaces(db,other.threadId),
      },
    ),true,"explicitly attested common venue did not permit co-presence");
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
