// fibre-test-lifecycle: regression
// fibre-test-scope: tools
// fibre-test-purpose: inside-fibre-terminal-roster-and-voluntary-cohort-authority

import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyInsideFibreRosterEntry,
  selectPrepareWindow,
} from "./inside-fibre.mjs";

const AT = "2026-09-23T19:05:00.000Z";
const THREAD_ID = "thr_roster_001";
const COMMITMENT_ID = "work_roster_001";
const PLAN_ID = "lplan_roster_001";

function thread() {
  return {
    threadId:THREAD_ID,
    displayName:"Luka Example",
    lifecycleStatus:"active",
    currentPresent:{
      payload:{
        situationId:"sit_roster_001",
        establishedAt:AT,
        phase:"at_place",
        location:{ kind:"place", place:{ displayName:"Home", region:null } },
        activity:"meeting Inside Fibre visitors",
      },
    },
  };
}

function workState() {
  return {
    fibreCredits:0,
    commitments:[{
      commitmentId:COMMITMENT_ID,
      startAt:"2026-09-23T19:00:00.000Z",
      endAt:"2026-09-23T19:20:00.000Z",
      fibreCredits:12,
    }],
    settlements:[{
      commitmentId:COMMITMENT_ID,
      encounterStoryId:"story_paid_once",
      amount:12,
      occurredAt:"2026-09-23T19:02:00.000Z",
    }],
  };
}

function plan(mediatedContext) {
  return {
    planId:PLAN_ID,
    kind:"personal",
    subjectThreadId:THREAD_ID,
    owner:{ partyId:THREAD_ID, kind:"thread" },
    authoredAt:"2026-09-23T18:50:00.000Z",
    horizonStart:"2026-09-23T18:50:00.000Z",
    horizonEnd:"2026-09-23T20:00:00.000Z",
    stops:[{
      startAt:"2026-09-23T18:50:00.000Z",
      endAt:"2026-09-23T20:00:00.000Z",
      physicalPlaceRef:"place_home",
      mediatedContext,
      activity:"meeting Inside Fibre visitors",
      purpose:"visitor availability",
      companionRefs:[],
      travelFromPrevious:null,
    }],
    sourceReferences:["evt_prior", COMMITMENT_ID],
    cognition:{
      provider:"test",
      modelId:"test",
      providerRequestId:null,
    },
  };
}

function observatory({ mediatedContext, evidenceRefs }) {
  return {
    livedNow:{
      currentSituation:{
        threadId:THREAD_ID,
        situationId:"sit_roster_001",
        establishedAt:AT,
        mediatedContext,
        evidenceRefs,
        resolution:{
          governingPlanRef:PLAN_ID,
          observedDivergence:false,
        },
      },
      currentPersonalPlan:plan(mediatedContext),
    },
  };
}

test("roster advertises an accepted shift only when it is enacted, even after first payment", () => {
  const merelyActive = classifyInsideFibreRosterEntry({
    thread:thread(),
    workState:workState(),
    observatory:observatory({
      mediatedContext:null,
      evidenceRefs:["evt_prior"],
    }),
    at:AT,
  });
  assert.equal(merelyActive.available, null,
    "an active clock window alone must not advertise a Thread as available");
  assert.equal(merelyActive.activeCommitment?.commitmentId, COMMITMENT_ID);

  const enacted = classifyInsideFibreRosterEntry({
    thread:thread(),
    workState:workState(),
    observatory:observatory({
      mediatedContext:"insidefibre:visitor-work",
      evidenceRefs:["evt_prior", COMMITMENT_ID],
    }),
    at:AT,
  });
  assert.equal(enacted.available?.commitmentId, COMMITMENT_ID,
    "the roster should advertise work only when World and the governing plan enact it");
});


function prepareRecord(threadId, timeZone, horizonEnd) {
  return {
    thread:{ threadId, displayName:threadId, lifecycleStatus:"active" },
    workState:{ fibreCredits:0, commitments:[], settlements:[] },
    observatory:{
      livedNow:{
        worldContext:{ timeZone },
        currentSituation:{
          threadId,
          situationId:`sit_${threadId}`,
          establishedAt:"2026-09-23T12:00:00.000Z",
          phase:"at_place",
          location:{ kind:"place", placeRef:"place_home" },
          resolution:{ governingPlanRef:`plan_${threadId}`, observedDivergence:false },
          evidenceRefs:["evt_prior"],
        },
        currentPersonalPlan:{
          planId:`plan_${threadId}`,
          horizonStart:"2026-09-23T12:00:00.000Z",
          horizonEnd,
          stops:[{
            startAt:"2026-09-23T12:00:00.000Z",
            endAt:horizonEnd,
            physicalPlaceRef:"place_home",
            mediatedContext:null,
            activity:"ordinary life",
          }],
          sourceReferences:["evt_prior"],
        },
      },
    },
  };
}

test("prepare chooses a locally reasonable shared window without treating the current Flight Plan horizon as a veto", () => {
  const records = [
    prepareRecord("thr_utc", "UTC", "2026-09-23T12:30:00.000Z"),
    prepareRecord("thr_berlin", "Europe/Berlin", "2026-09-23T12:30:00.000Z"),
    prepareRecord("thr_new_york", "America/New_York", "2026-09-23T12:30:00.000Z"),
    prepareRecord("thr_tokyo", "Asia/Tokyo", "2026-09-23T12:30:00.000Z"),
  ];

  const selected = selectPrepareWindow(records, {
    at:"2026-09-23T12:00:00.000Z",
    target:3,
  });

  assert.equal(selected?.startAt, "2026-09-23T14:00:00.000Z");
  assert.equal(selected?.endAt, "2026-09-23T14:30:00.000Z");
  assert.deepEqual(
    selected?.eligible.map((record) => record.thread.threadId),
    ["thr_utc", "thr_berlin", "thr_new_york"],
    "the shared offer window should prefer ordinary local daytime without mistaking an expiring plan horizon for a rigid commitment",
  );
});
