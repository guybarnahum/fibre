import assert from "node:assert/strict";
import test from "node:test";
import {createGenesisFirstLifeProcess} from "../src/genesis-first-life-process.mjs";

const AT="2026-10-27T12:00:00.000Z";
const threadId="thr_hilo_home";
const placeRef="per:plce_hilo_home:1";
const birthplace={city:"Hilo",country:"United States",displayName:"Hilo, United States"};

function firstLife({home={},existing=null}={}){
  const situation={
    threadId,situationId:"sit_hilo_first_life",establishedAt:AT,
    phase:"at_place",location:{kind:"place",placeRef},
  };
  const episode={
    episodeId:"plce_hilo_home",revision:1,threadId,
    episodeKind:"formative_presence",
    place:{placeId:"plc_hilo",displayName:"A small family home",
      locality:null,countryCode:null,region:null,precision:"unspecified",...home},
    startAt:"2026-10-01T00:00:00.000Z",endAt:null,
    sourceReferences:["evt_hilo_home"],visibility:"private",
    status:"current",provenance:"genesis_created",recordedAt:AT,
  };
  const events=[];
  let due={thread_id:threadId},admitted=existing,completed=false;
  const process=createGenesisFirstLifeProcess({
    workStore:{
      due:()=>due,
      complete(id,establishedAt){
        assert.equal(id,threadId);
        assert.equal(establishedAt,AT);
        due=null;completed=true;
      },
      fail(){throw new Error("location must not fail first life");},
      block(){throw new Error("location must not block first life");},
      nextDueAt:()=>null,
    },
    livedNow:{async ensure(){return situation;}},
    worldReader:{getThread:()=>({threadId,identity:{
      name:"Daniel",birthPlace:birthplace,
    }})},
    livedNowStore:{
      getPrivatePlace:()=>admitted,
      getWorldContext:()=>({timeZone:"Pacific/Honolulu"}),
      listWorldPlaces:()=>[],
      admitPrivatePlace(place){
        if(admitted!==null)throw new Error("existing private location was overwritten");
        admitted=place;
        return place;
      },
    },
    situatedLifeStore:{listCurrentPlaceEpisodes:()=>[episode]},
    logUnlocated:entry=>events.push(entry),
    now:()=>AT,
  });
  return {process,events,get location(){return admitted;},
    get completed(){return completed;}};
}

test("Hilo newborn completes first life with World-attested home-city location",async()=>{
  const life=firstLife();
  const result=await life.process.runOnce();
  assert.equal(result.results[0].outcome,"established");
  assert.equal(life.completed,true,"located first life did not complete");
  assert.equal(life.location.locality,"Hilo, Hawaii",
    "Hilo birthplace did not resolve to its canonical locality");
  assert.equal(life.location.countryCode,"US");
  assert.equal(life.location.timeZone,"Pacific/Honolulu");
  assert.equal(life.location.publicGranularity,"city");
  assert.equal(life.location.evidenceRef,"birth_city_world_default:"+threadId);
  assert.deepEqual([life.location.streetAddress,life.location.lat,life.location.long],
    [null,null,null],"home location invented precise residence evidence");
  assert.equal(life.events.length,0,"grounded Hilo home was marked unlocated");
});

test("contradictory home country stays unlocated without blocking first life",async()=>{
  const life=firstLife({home:{locality:"Chengdu",countryCode:"CN"}});
  const result=await life.process.runOnce();
  assert.equal(result.results[0].outcome,"established");
  assert.equal(life.completed,true,"contradictory birthplace prevented first life");
  assert.equal(life.location,null,"contradictory home country silently claimed location");
  assert.deepEqual(life.events,[{
    event:"genesis-first-life-home-unlocated",threadId,state:"review_time_zone",
  }],"contradiction did not preserve its explicit unlocated state");
});

test("an established private location is not overwritten by first life",async()=>{
  const existing={threadId,placeRef,locality:"Hilo, Hawaii",
    countryCode:"US",evidenceRef:"operator_attested"};
  const life=firstLife({existing});
  const result=await life.process.runOnce();
  assert.equal(result.results[0].outcome,"established");
  assert.equal(life.completed,true);
  assert.strictEqual(life.location,existing,
    "first life replaced a previously attested private place");
  assert.equal(life.events[0]?.state,"already_located");
});
