import assert from "node:assert/strict";
import test from "node:test";
import {rankSocialCityCandidates,inspectLifeContinuity} from "./world-social-candidates.mjs";

test("an old plan is not a future visit; unknown is not confirmed awake",()=>{
  const location={key:"GE:tbilisi",locality:"Tbilisi",countryCode:"GE"};
  const one={...location,threadId:"thr_a",name:"A",placeRef:"per:home",
    atPlace:true,wakefulness:"awake",plan:{stops:[{
      physicalPlaceRef:"wpl_library",endAt:"2026-10-19T18:15:00.000Z",
    }]},situationRef:"sit_a"};
  const two={...location,threadId:"thr_b",name:"B",placeRef:"per:home",
    atPlace:true,wakefulness:"unknown",plan:null,situationRef:"sit_b"};
  const result=rankSocialCityCandidates({
    places:[{placeRef:"wpl_library",venueRef:"venue_library",name:"Library",
      city:"Tbilisi",countryCode:"GE",discoveryListed:true}],
    people:[one,two],at:"2026-10-19T18:45:00.000Z",
  }).pairedCities[0];
  assert.equal(result.awakeThreadCount,1);
  assert.equal(result.unknownWakefulnessThreadCount,1);
  assert.equal(result.threads[0].plannedPublicVisits.length,0);
});

test("a venue-free current city remains visible as a grounded cohort gap",()=>{
  const people=[
    {threadId:"thr_kisumu_1",name:"One",key:"KE:kisumu",
      locality:"Kisumu",countryCode:"KE",placeRef:"per:home",atPlace:true,
      wakefulness:"awake",plan:null},
    {threadId:"thr_tbilisi_1",name:"Two",key:"GE:tbilisi",
      locality:"Tbilisi",countryCode:"GE",placeRef:"per:home",atPlace:true,
      wakefulness:"awake",plan:null},
    {threadId:"thr_tbilisi_2",name:"Three",key:"GE:tbilisi",
      locality:"Tbilisi",countryCode:"GE",placeRef:"per:home",atPlace:true,
      wakefulness:"awake",plan:null},
  ];
  const ranked=rankSocialCityCandidates({places:[],people,at:"2026-10-21T12:00:00Z"});
  assert.equal(ranked.underpopulatedCityCount,2);
  assert.equal(ranked.sampledBirthsToThree,3);
  const kisumu=ranked.underpopulatedCities.find(c=>c.locality==="Kisumu");
  assert.deepEqual([kisumu.currentThreadCount,kisumu.neededToThree,kisumu.publicVenueCount],[1,2,0],
    "a real city without curated venues disappeared from population planning");
});

test("population census distinguishes blocked, expired and unestablished lives without a wake",()=>{
  const at="2026-10-21T23:00:00.000Z";
  const life={
    thread:{identity:{name:"Omar"}},
    livedNow:{
      currentSituation:{situationId:"sit_omar",establishedAt:"2026-10-20T21:03:16.893Z"},
      currentPersonalPlan:{planId:"plan_old",horizonEnd:"2026-10-20T21:03:16.893Z"},
      nextAutonomousBoundary:{
        situationId:"sit_prior",dueAt:null,failedAttempts:3,
        blockedReason:"personal plan cognition selected a place outside its offered World context",
      },
    },
  };
  const blocked=inspectLifeContinuity("thr_omar",life,at);
  assert.equal(blocked.status,"blocked",
    "a third failed autonomous plan was hidden as an ordinary sleeping Thread");
  assert.equal(blocked.failedAttempts,3);
  assert.equal(blocked.currentSituationId,"sit_omar");
  assert.equal(blocked.blockedReason.includes("offered World context"),true);
  life.livedNow.nextAutonomousBoundary=null;
  assert.equal(inspectLifeContinuity("thr_omar",life,at).status,"plan_expired",
    "an expired plan with no frontier was reported as ongoing life");
  life.livedNow.currentSituation=null;
  assert.equal(inspectLifeContinuity("thr_omar",life,at).status,"not_established",
    "a never-lived Thread was mistaken for a stalled renewal");
});
