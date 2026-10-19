import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import test from "node:test";

import {
  admitWorldPublicPlace,createLiveWorldGeographyTables,getWorldPublicPlace,
  listDiscoverableWorldPublicPlaces,setWorldPublicPlaceDiscovery,
  setWorldPublicPlaceAppearance,
} from "../src/live-world-geography.mjs";
import {formPersonalLivedPlan} from "../src/lived-plan-cognition.mjs";
import {planningPublicDiscoveries} from "../src/lived-now-service.mjs";

const at="2026-10-18T16:00:00Z", end="2026-10-18T20:00:00Z";
const homeRef="per:world_discovery_home:1";

function world(){
  const db=new DatabaseSync(":memory:");
  // Exercise the old deployed table shape: installation must preserve its
  // attested records while adding mutable discovery on the same row.
  db.exec(`CREATE TABLE world_public_places(
    place_ref TEXT PRIMARY KEY,venue_ref TEXT NOT NULL UNIQUE,
    locality TEXT NOT NULL,country_code TEXT NOT NULL,
    record_json TEXT NOT NULL CHECK(json_valid(record_json)),
    record_digest TEXT NOT NULL
  ) STRICT`);
  createLiveWorldGeographyTables(db);
  const place=admitWorldPublicPlace(db,{
    venueIdentity:"library-independent-witness",displayName:"A real public library",
    streetAddress:"Library Square, Lisbon",locality:"Lisbon",
    country:"Portugal",countryCode:"PT",lat:38.7,long:-9.1,
    timeZone:"Europe/Lisbon",evidenceRef:"https://example.org/verified-library",
    affordances:["Reading","Study"],
  });
  return {db,place};
}

test("a World venue can be listed, edited and unlisted without changing its physical identity",()=>{
  const {db,place}=world();
  try{
    const before=db.prepare(
      "SELECT record_json,record_digest FROM world_public_places WHERE place_ref=?"
    ).get(place.ref);
    const listed=()=>listDiscoverableWorldPublicPlaces(db,{
      locality:"Lisbon",countryCode:"PT",
    });
    assert.deepEqual(listed(),[],"an unlisted venue appeared as a recommendation");
    const discovery={listed:true,description:"Read quietly among books",
      lastRecommendedAt:"2026-10-18"};
    const published=setWorldPublicPlaceDiscovery(db,{placeRef:place.ref,discovery});
    assert.equal(published.discovery.description,discovery.description);
    assert.deepEqual(listed().map(item=>item.ref),[place.ref],
      "an admitted social place was not discoverable in its city");
    assert.deepEqual(listDiscoverableWorldPublicPlaces(db,{
      locality:"Tbilisi",countryCode:"GE",
    }),[],"another city's venue was offered");

    setWorldPublicPlaceDiscovery(db,{placeRef:place.ref,discovery:{
      ...discovery,description:"Read or explore research collections",
    }});
    assert.equal(listed()[0].discovery.description,"Read or explore research collections",
      "an editorial update needed a code deployment");
    setWorldPublicPlaceDiscovery(db,{placeRef:place.ref,discovery:{
      ...discovery,listed:false,
    }});
    assert.deepEqual(listed(),[],"unlisting did not remove discovery");
    assert.equal(getWorldPublicPlace(db,place.ref).ref,place.ref,
      "unlisting a destination erased its World identity");
    const after=db.prepare(
      "SELECT record_json,record_digest FROM world_public_places WHERE place_ref=?"
    ).get(place.ref);
    assert.deepEqual(after,before,"editorial edits rewrote attested physical facts");
    assert.throws(()=>setWorldPublicPlaceDiscovery(db,{
      placeRef:"wpl_unauthenticated",discovery,
    }),/admitted public World place/u,"an unverified place gained public authority");
  }finally{db.close();}
});

test("a public place retains one editable visual seed without rewriting attested reality",()=>{
  const {db,place}=world();
  try{
    const before=db.prepare(
      "SELECT record_json,record_digest FROM world_public_places WHERE place_ref=?"
    ).get(place.ref);
    assert.equal(getWorldPublicPlace(db,place.ref).appearance,undefined,
      "World created an unearned image or visual seed");
    const appearance={
      prompt:"A warm reading room with tall bookshelves and afternoon light.",
      viewpoint:"Standing in the main reading room, at eye height.",
      projection:"equirectangular",assetRef:null,
    };
    const curated=setWorldPublicPlaceAppearance(db,{placeRef:place.ref,appearance});
    assert.deepEqual(curated.appearance,appearance,
      "visual seed did not persist on the original World place");
    assert.deepEqual(listDiscoverableWorldPublicPlaces(db,{
      locality:"Lisbon",countryCode:"PT",
    }),[],"giving a place an appearance made it a public recommendation");
    setWorldPublicPlaceAppearance(db,{placeRef:place.ref,appearance:{
      ...appearance,prompt:"An inviting but quiet space for independent study.",
    }});
    assert.match(getWorldPublicPlace(db,place.ref).appearance.prompt,/independent study/u,
      "editing a depiction required changing World identity");
    const after=db.prepare(
      "SELECT record_json,record_digest FROM world_public_places WHERE place_ref=?"
    ).get(place.ref);
    assert.deepEqual(after,before,
      "an illustrative image seed rewrote the place's physical attestation");
    assert.throws(()=>setWorldPublicPlaceAppearance(db,{placeRef:place.ref,
      appearance:{...appearance,projection:"real_3d"}}),/projection/u,
    "a panorama was mistaken for unrestricted navigable 3D");
    setWorldPublicPlaceAppearance(db,{placeRef:place.ref,appearance:null});
    assert.equal(getWorldPublicPlace(db,place.ref).appearance,undefined,
      "clearing an illustrative view changed World history");
  }finally{db.close();}
});

test("the same planning mind can choose a World-listed place or stay home",async()=>{
  const {db,place}=world();
  try{
    const listing={listed:true,description:"Read or think alongside other visitors",
      lastRecommendedAt:"2026-10-18"};
    setWorldPublicPlaceDiscovery(db,{placeRef:place.ref,discovery:listing});
    const store={listDiscoverablePublicPlaces:input=>
      listDiscoverableWorldPublicPlaces(db,input)};
    assert.deepEqual(planningPublicDiscoveries(store,{
      locality:"Lisbon",countryCode:"PT",
    },"2026-10-17T16:00:00Z"),[],
    "tomorrow's discovery leaked into a prior Flight Plan");
    const guidePlaces=planningPublicDiscoveries(store,{
      locality:"Lisbon",countryCode:"PT",
    },at);
    assert.deepEqual(guidePlaces.map(item=>item.ref),[place.ref],
      "current World discovery failed to enter ordinary planning");
    const threadId="thr_world_discovery",thread={
      threadId,version:1,identity:{name:"A Thread"},
      currentState:{selfModel:"I enjoy thoughtful solitude.",unresolvedIntentions:[]},
    };
    async function choose({visiting,memory=null}){
      const modelAdapter={async invoke(call){
        const offered=call.input.concern.externalContext.cityGuide?.some(
          item=>item.placeRef===place.ref)===true;
        const remembered=call.input.developedSelfEvidence?.find(
          item=>item.kind==="memory")?.text??"";
        const go=offered&&visiting&&!/unwelcome/iu.test(remembered);
        const base={physicalPlaceRef:homeRef,presenceMode:"physical",
          wakefulness:"awake",mediatedContext:"",activity:"Read",
          purpose:"Enjoy the day",travelFromPrevious:""};
        return {output:{result:{stops:[
          {...base,startAt:at,endAt:go?"2026-10-18T16:45:00Z":end},
          ...(go?[{...base,physicalPlaceRef:place.ref,
            startAt:"2026-10-18T17:00:00Z",endAt:end,
            travelFromPrevious:"Walk to the library."}]:[]),
        ]},evidenceRefs:[],conflictingMotives:[],uncertainty:null},
        provenance:{provider:"fixture",modelId:"world-discovery"}};
      }};
      return formPersonalLivedPlan({
        threadId,authoredAt:at,horizonEnd:end,startingPlaceRef:homeRef,
        availablePlaceRefs:[homeRef,place.ref],cityGuidePlaces:guidePlaces,
        sourceReferences:["evt_lived_discovery"],
        sourceStores:{
          worldStore:{getThread(){return thread;}},
          identityStore:{getCurrentIdentityView(){return {threadId,assertions:[]};}},
          semanticStateStore:{listCurrentState(){return [];}},
          memoryStore:{listCurrentMemories(){return memory?[{
            threadId,memoryId:"mem_library",status:"current",
            accessibility:"accessible",rememberedMeaning:memory,
            asOf:"2026-10-17T12:00:00Z",recordedAt:"2026-10-17T12:00:00Z",
          }]:[];}},
          situatedLifeStore:{
            listCurrentPlaceEpisodes(){return [];},
            listCurrentLifeRelations(){return [];},
          },
          livedNowStore:{getWorldPlace(_id,ref){
            return ref===homeRef?{ref,placeKind:"residence",displayName:"Home"}
              :ref===place.ref?getWorldPublicPlace(db,ref):null;
          }},
        },modelAdapter,
      });
    }
    const interested=await choose({visiting:true});
    const reluctant=await choose({visiting:true,memory:"An unwelcome interruption."});
    const solitary=await choose({visiting:false});
    assert.deepEqual(interested.stops.map(s=>s.physicalPlaceRef),[homeRef,place.ref],
      "World discovery could not bend ordinary planning");
    assert.deepEqual(reluctant.stops.map(s=>s.physicalPlaceRef),[homeRef],
      "private history could not outweigh public discovery");
    assert.deepEqual(solitary.stops.map(s=>s.physicalPlaceRef),[homeRef],
      "listing a venue forced a visit");
    assert.ok(interested.stops.every(s=>s.companionRefs.length===0),
      "discovery invented a companion");
  }finally{db.close();}
});
