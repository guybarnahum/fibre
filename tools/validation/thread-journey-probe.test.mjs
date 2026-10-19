import test from "node:test";
import assert from "node:assert/strict";

import { inspectThreadJourneys } from "./thread-journey-probe.mjs";
import { privateGet } from "./encounter-autonomy-probe.mjs";

test("a Thread's earlier Flight Plan and enacted travel remain distinguishable after renewal",()=>{
  const travel={
    planId:"plan_travel",kind:"personal",owner:{kind:"thread"},
    authoredAt:"2026-10-17T08:00:00Z",
    cognition:{provider:"openai"},
    stops:[
      {physicalPlaceRef:"wpl_lisbon",
        startAt:"2026-10-17T08:00:00Z",endAt:"2026-10-17T09:00:00Z"},
      {physicalPlaceRef:"wpl_porto",
        startAt:"2026-10-17T12:00:00Z",endAt:"2026-10-17T14:00:00Z",
        activity:"Reading at a public library",
        purpose:"I want to spend an afternoon learning in new surroundings.",
        travelFromPrevious:"Take the train."},
    ],
  };
  const scene=(kind,time,location)=>({
    establishedAt:time,location,sourcePlanRefs:["plan_travel"],
    resolution:{governingPlanRef:"plan_travel"},
  });
  const origin=scene("at_place","2026-10-17T08:30:00Z",
    {kind:"place",placeRef:"wpl_lisbon"});
  const movement=scene("transit","2026-10-17T09:00:00Z",
    {kind:"transit",fromPlaceRef:"wpl_lisbon",toPlaceRef:"wpl_porto"});
  const arrival=scene("at_place","2026-10-17T12:00:00Z",
    {kind:"place",placeRef:"wpl_porto"});
  const observatory=(scenes)=>({livedNow:{
    currentPersonalPlan:{planId:"plan_next",stops:[]},
    recentPersonalPlans:[travel],
    recentSituations:scenes,
    worldPlaces:[{ref:"wpl_porto",displayName:"Porto, Portugal",
      authority:"world-place-v1",locality:"Porto",country:"Portugal"}],
  }});
  const phase=scenes=>inspectThreadJourneys(observatory(scenes))[0];

  assert.equal(phase([origin]).stage,"departure_observed",
    "a planned journey was mistaken for arrival");
  assert.equal(phase([movement,origin]).stage,"transit_observed",
    "enacted transit was invisible");
  assert.equal(phase([arrival,origin]).stage,"arrival_observed",
    "arrival without transit was counted as a witnessed journey");
  const full=phase([arrival,movement,origin]);
  assert.equal(full.stage,"journey_enacted",
    "real World transitions were not joined to their Thread-owned plan");
  assert.equal(full.modelProvider,"openai");
  assert.equal(full.purpose,travel.stops[1].purpose,
    "the Thread's own stated purpose was lost in journey inspection");
  assert.equal(full.activity,travel.stops[1].activity,
    "the chosen public activity was reduced to a location reference");
  assert.equal(full.destination.authority,"world-place-v1");
  const instantPlan={
    ...travel,planId:"plan_instant",
    stops:[travel.stops[0],{
      ...travel.stops[1],startAt:travel.stops[0].endAt,
    }],
  };
  const instantScenes=[origin,arrival].map(item=>({
    ...item,sourcePlanRefs:["plan_instant"],
    resolution:{governingPlanRef:"plan_instant"},
  }));
  const instant=inspectThreadJourneys({
    livedNow:{recentPersonalPlans:[instantPlan],recentSituations:instantScenes},
  })[0];
  assert.equal(instant.stage,"instant_place_change",
    "zero-duration location switch was credited as a journey");
  assert.equal(instant.plannedTransitSeconds,0,
    "zero-duration change concealed its missing travel interval");
  const wrongPlan={...movement,sourcePlanRefs:["plan_other"]};
  assert.equal(phase([arrival,wrongPlan,origin]).stage,"arrival_observed",
    "another plan's transit was falsely attributed to this journey");
  const overridden={...movement,
    resolution:{governingPlanRef:"plan_care"},
    sourcePlanRefs:["plan_travel","plan_care"]};
  assert.equal(phase([arrival,overridden,origin]).stage,"arrival_observed",
    "a care-governed journey was credited to the Thread's personal plan");
});

test("read-only journey inspection reaches full World Observatory rather than a fabricated route",async()=>{
  const original=globalThis.fetch;
  let called=false;
  globalThis.fetch=async request=>{
    called=true;
    const url=new URL(request);
    assert.equal(url.pathname,"/internal/threads/thr_example/observatory",
      "World Observatory route was not preserved");
    assert.equal(url.searchParams.get("view"),"full",
      "full Observatory query disappeared");
    return Response.json({observatory:{livedNow:{recentPersonalPlans:[]}}});
  };
  try{
    const result=await privateGet("https://world.example",
      "/internal/threads/thr_example/observatory?view=full",
      "fixture-token","journey Observatory");
    assert.equal(called,true,"World Observatory was not consulted");
    assert.deepEqual(result.observatory.livedNow.recentPersonalPlans,[],
      "full Observatory response was lost");
  }finally{
    globalThis.fetch=original;
  }
});
