import assert from "node:assert/strict";
import test from "node:test";
import {recentLifeMoments} from "./life-causes-model.mjs";

test("Life Timeline distinguishes enacted World situations from an authored plan and uncertain motive",()=>{
  const current={
    situationId:"sit_arrived",phase:"at_place",
    establishedAt:"2026-10-19T17:45:02.408Z",
    activity:"Reading at Southbank Centre",
    location:{kind:"place",placeRef:"wpl_southbank"},
    sourcePlanRefs:["lplan_amelia"],
  };
  const other={
    situationId:"sit_earlier",phase:"at_place",
    establishedAt:"2026-10-19T10:15:00.171Z",
    activity:"Reading at British Library",
    location:{kind:"place",placeRef:"wpl_british"},
    sourcePlanRefs:["lplan_old"],
  };
  const livedNow={
    currentSituation:current,
    recentSituations:[current,other],
    currentPersonalPlan:{
      planId:"lplan_amelia",authoredAt:"2026-10-19T15:41:51.963Z",
      stops:[{
        physicalPlaceRef:"wpl_southbank",
        startAt:"2026-10-19T17:45:00Z",
        endAt:"2026-10-19T20:00:00Z",
        activity:"Visit the arts centre",
        purpose:"Read somewhere lively",
      }],
    },
  };
  const moments=recentLifeMoments(livedNow);
  assert.deepEqual(moments.map(item=>item.id),["sit_arrived","sit_earlier"],
    "an enacted situation was lost or counted twice");
  assert.equal(moments[0].planned?.purpose,"Read somewhere lively",
    "a linked Flight Plan lost the Thread's own purpose");
  assert.equal(moments[1].planned,null,
    "an unrelated past visit borrowed the current plan's motives");
  assert.equal(moments[0].placeKind,"verified_public",
    "the verified World venue was confused with a private place");
});
