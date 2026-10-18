import assert from "node:assert/strict";
import test from "node:test";
import {projectWorldEventOverview} from "../src/world-event-observatory.mjs";

const when="2026-10-18T18:20:00.000Z";
const place={ref:"wpl_library",displayName:"City Library",locality:"Lisbon",
  country:"Portugal",countryCode:"PT",lat:38.74,long:-9.14,
  physicalVenue:{ref:"venue_library"}};
const quietPlace={ref:"wpl_park",displayName:"Quiet Garden",locality:"Lisbon",
  country:"Portugal",countryCode:"PT",lat:38.73,long:-9.15,
  physicalVenue:{ref:"venue_park"}};
const otherPlace={ref:"wpl_remote",displayName:"Remote Meadow",locality:"Tbilisi",
  country:"Georgia",countryCode:"GE",lat:41.72,long:44.81,
  physicalVenue:{ref:"venue_remote"}};
const rows=[place,quietPlace,otherPlace].map((item,i)=>({
  record_json:JSON.stringify(item),discovery_json:"null",
  appearance_json:i===0?JSON.stringify({
    prompt:"Tall library shelves",viewpoint:"Reading room",
    projection:"equirectangular",assetRef:null,
  }):"null",
}));
const old={situationId:"sit_before",threadId:"thr_victor",
  establishedAt:"2026-10-18T18:00:00.000Z",provenance:"world_enacted",
  location:{kind:"transit",fromPlaceRef:"per:home:1",toPlaceRef:place.ref}};
const arrived={...old,situationId:"sit_real_arrival",establishedAt:when,
  location:{kind:"place",placeRef:place.ref}};
const revisited={...arrived,situationId:"sit_new_plan",establishedAt:"2026-10-18T18:21:00.000Z"};

test("God-view pulses only from admitted World activity and keeps subjective consequences distinct",()=>{
  const snapshot=projectWorldEventOverview({
    now:"2026-10-18T18:30:00.000Z",hours:24,
    placeRows:rows,situationRows:[
      {record_json:JSON.stringify(arrived),previous_json:JSON.stringify(old)},
      {record_json:JSON.stringify(revisited),previous_json:JSON.stringify(arrived)},
    ],
    storyRows:[
      {
        encounter_id:"story_rain",occurred_at:"2026-10-18T18:22:00.000Z",
        story_json:JSON.stringify({beats:[{kind:"occurrence",text:"Rain begins outside."}]}),
        visualization_source_refs_json:JSON.stringify([place.physicalVenue.ref]),
        thread_id:"thr_victor",situation_id:arrived.situationId,
        situation_json:JSON.stringify(arrived),attention_outcome:"noticed",
        experience_id:"exp_rain",memory_id:"mem_authoritative_rain",
      },
      {
        encounter_id:"story_rain",occurred_at:"2026-10-18T18:22:00.000Z",
        story_json:JSON.stringify({beats:[{kind:"occurrence",text:"Rain begins outside."}]}),
        visualization_source_refs_json:JSON.stringify([place.physicalVenue.ref]),
        thread_id:"thr_victor",situation_id:arrived.situationId,
        situation_json:JSON.stringify(arrived),attention_outcome:"noticed",
        experience_id:"exp_rain",memory_id:"mem_another_recorded_recollection",
      },
      {
        encounter_id:"story_rain",occurred_at:"2026-10-18T18:22:00.000Z",
        story_json:JSON.stringify({beats:[{kind:"occurrence",text:"Rain begins outside."}]}),
        visualization_source_refs_json:JSON.stringify([place.physicalVenue.ref]),
        thread_id:"thr_reader",situation_id:"sit_reader",
        situation_json:JSON.stringify({...arrived,threadId:"thr_reader",situationId:"sit_reader"}),
        attention_outcome:"not_noticed",experience_id:null,
      },
      {
        encounter_id:"story_distant",occurred_at:"2026-10-18T18:24:00.000Z",
        story_json:JSON.stringify({beats:[{kind:"occurrence",text:"A far-off flash."}]}),
        visualization_source_refs_json:JSON.stringify(["event_unlocated"]),
        thread_id:"thr_victor",situation_id:arrived.situationId,
        situation_json:JSON.stringify(arrived),attention_outcome:null,experience_id:null,
      },
      {
        encounter_id:"story_distant",occurred_at:"2026-10-18T18:24:00.000Z",
        story_json:JSON.stringify({beats:[{kind:"occurrence",text:"A far-off flash."}]}),
        visualization_source_refs_json:JSON.stringify(["event_unlocated"]),
        thread_id:"thr_remote",situation_id:"sit_remote",
        situation_json:JSON.stringify({...arrived,threadId:"thr_remote",situationId:"sit_remote",
          location:{kind:"place",placeRef:otherPlace.ref}}),
        attention_outcome:null,experience_id:null,
      },
    ],
  });
  assert.deepEqual(snapshot.events.map(event=>event.eventRef),
    ["story_rain","sit_real_arrival"],
    "a plan refresh or unlocated distant witness became a place event");
  assert.deepEqual(snapshot.cities.map(city=>[city.name,city.eventCount]),
    [["Lisbon",2],["Tbilisi",0]],
    "the map fabricated pulse activity at an unrelated place");
  assert.equal(snapshot.places.find(item=>item.placeRef===place.ref).appearance?.prompt,
    "Tall library shelves","the God-view omitted the persisted venue depiction seed");
  assert.equal(snapshot.places.find(item=>item.placeRef===quietPlace.ref).appearance,null,
    "the God-view fabricated imagery for an unillustrated place");
  assert.equal(snapshot.places.find(item=>item.placeRef===quietPlace.ref).eventCount,0,
    "a listed but quiet place pulsed without World evidence");
  const event=snapshot.events[0];
  assert.deepEqual(event.witnesses.map(person=>[person.threadId,person.attention,
    person.experienceId]),[
    ["thr_reader","not_noticed",null],
    ["thr_victor","noticed","exp_rain"],
  ],"one shared occurrence lost distinct personal perception");
  assert.deepEqual(event.witnesses.find(person=>person.threadId==="thr_victor")?.memoryLinks,
    ["mem_another_recorded_recollection","mem_authoritative_rain"],
    "multiple retained memories duplicated a witness or lost its memories");
  assert.deepEqual(event.witnesses.find(person=>person.threadId==="thr_reader")?.memoryLinks,
    [],"unnoticed experience gained an invented Memory");
  assert.ok(event.witnesses.every(item=>item.impactLink===null),
    "an event or Memory was misreported as proved later behavior");
  assert.equal(snapshot.coverage.privateCityActivity,"not_included",
    "the World claimed complete geographic coverage without source evidence");
});
