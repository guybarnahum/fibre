import assert from "node:assert/strict";
import test from "node:test";

import {formatWorldSocialReport,groundedLifeSummary,summarizeSocialContinuity} from "./world-social-probe.mjs";

test("an admitted memory follows personal experience into later contact without claiming causation",()=>{
  const story={
    encounterId:"story_cafe",occurredAt:"2026-10-17T09:00:00.000Z",
    threadPresence:[
      {threadId:"thr_reader",situationId:"sit_reader"},
      {threadId:"thr_visitor",situationId:"sit_visitor"},
    ],
    attention:{
      outcome:"noticed",
      experience:{experienceId:"exp_reader",experienceText:"I felt welcome."},
    },
  };
  const counterpart={
    ...story,
    attention:{
      outcome:"noticed",
      experience:{experienceId:"exp_visitor",experienceText:"I felt distracted."},
    },
  };
  const completed={
    consolidationId:"con_cafe",experienceRefs:["exp_reader"],
    complete:{payload:{memoryOutcome:"retained",memoryId:"mem_cafe"}},
  };
  const retained={
    memoryId:"mem_cafe",threadId:"thr_reader",status:"current",
    retentionState:"retained",eventRefs:["exp_reader"],
    recordedAt:"2026-10-17T10:00:00.000Z",
  };
  const later={
    interactionId:"social_next_day",
    occurredAt:"2026-10-18T12:00:00.000Z",
    initiatorThreadId:"thr_reader",recipientThreadId:"thr_visitor",
  };
  const views=new Map([
    ["thr_reader",{
      encounterStories:[story],experienceConsolidation:{consolidations:[completed]},
      memories:[retained],socialInteractions:[later],
    }],
    ["thr_visitor",{
      encounterStories:[counterpart],
      experienceConsolidation:{consolidations:[]},
      memories:[],socialInteractions:[],
    }],
  ]);
  const observed=summarizeSocialContinuity(views);
  const reader=observed.episodes.find(item=>item.threadId==="thr_reader");
  assert.equal(reader.distinctPersonalExperience,true,
    "a shared World event erased independent personal Experiences");
  assert.equal(reader.retainedMemoryRef,"mem_cafe",
    "retained Memory lost its own Experience source");
  assert.equal(reader.laterSocialInteractionRef,"social_next_day",
    "later action lost continuity with the earlier counterpart");
  assert.equal(observed.causalProof,"not_established_by_observatory",
    "temporal proximity was falsely certified as cause");

  const notRemembered=structuredClone(views.get("thr_reader"));
  notRemembered.experienceConsolidation.consolidations[0].complete.payload={
    memoryOutcome:"not_remembered",memoryId:null,
  };
  views.set("thr_reader",notRemembered);
  const absent=summarizeSocialContinuity(views).episodes
    .find(item=>item.threadId==="thr_reader");
  assert.equal(absent.retainedMemoryRef,null,
    "a World event became autobiographical Memory without retention");
  assert.equal(absent.laterSocialInteractionRef,null,
    "later contact was incorrectly attributed to a missing Memory");

  const invented=structuredClone(views.get("thr_reader"));
  invented.experienceConsolidation.consolidations[0].complete.payload={
    memoryOutcome:"retained",memoryId:"mem_cafe",
  };
  invented.memories[0].eventRefs=["exp_different_person"];
  views.set("thr_reader",invented);
  assert.equal(summarizeSocialContinuity(views).episodes
    .find(item=>item.threadId==="thr_reader").retainedMemoryRef,null,
  "another Experience was substituted for this Thread's actual Memory");

  const laterFormed=structuredClone(invented);
  laterFormed.memories[0].eventRefs=["exp_reader"];
  laterFormed.memories[0].recordedAt="2026-10-19T10:00:00.000Z";
  views.set("thr_reader",laterFormed);
  const beforeMemory=summarizeSocialContinuity(views).episodes
    .find(item=>item.threadId==="thr_reader");
  assert.equal(beforeMemory.retainedMemoryRef,"mem_cafe",
    "a valid subsequently admitted Memory was lost");
  assert.equal(beforeMemory.laterSocialInteractionRef,null,
    "a conversation before Memory formation was called a consequence of that Memory");
});

test("operator report separates deployed-version warning from grounded social evidence",()=>{
  const evidence={
    environment:"staging",checkedAt:"2026-10-19T18:35:00.000Z",
    targetedThreadId:"thr_kisumu",scannedThreadCount:1,
    availableThreadCount:1,unavailableThreadIds:[],
    deployedGitSha:"dda3bf669ebf7789f3644f8af1394783bb597440",
    runtimeSourceMatches:false,worldBlocker:"no_attested_venues_in_sample",
    groundedLife:{
      withVenues:[],withoutVenues:[{
        threadId:"thr_kisumu",hasCurrentSituation:true,
        currentWakefulness:"awake",privateWorldLocality:"Kisumu",
        currentPlaceDescription:"Private home address that must never appear",
        currentPlaceKind:"formative_presence",
        attestedVenueCount:0,recentPublicVenueVisits:[],
        futureAttestedVenueStops:[],
        nextBoundedLifeWake:"2026-10-19T19:00:00.000Z",
      }],
    },
    sharedCurrentVenues:[],socialOpportunities:[],
    distinctExperienceWitness:null,
    causalContinuity:{
      inspectedSharedStoryCount:0,distinctExperiencePairCount:0,
      retainedMemoryChainCount:0,laterContactAfterRetentionCount:0,
      episodes:[],
    },
  };
  const report=formatWorldSocialReport(evidence,"/tmp/social-evidence.json");
  assert.match(report,/Kisumu/,"the Thread's grounded locality was omitted");
  assert.match(report,/dda3bf6/,"deployed World provenance was lost");
  assert.match(report,/NOT ESTABLISHED/,"unknown causal influence was overstated");
  assert.doesNotMatch(report,/Private home address/,
    "operator display leaked a nonpublic place description");
  assert.match(report,/\/tmp\/social-evidence.json/,
    "the complete evidence file was not identified");
});

test("one observed venue visit never masquerades as a co-presence check",()=>{
  const threadId="thr_london";
  const visitAt="2026-10-19T17:45:02.408Z";
  const person={
    thread:{identity:{name:"Amelia Shah"}},
    livedNow:{
      currentSituation:{
        situationId:"sit_southbank",phase:"at_place",wakefulness:"awake",
        location:{kind:"place",placeRef:"wpl_southbank"},
        establishedAt:visitAt,
      },
      worldPlaces:[{
        ref:"wpl_southbank",authority:"world-public-place-v1",
        displayName:"Southbank Centre",locality:"London",countryCode:"GB",
        physicalVenue:{ref:"venue_southbank",displayName:"Southbank Centre"},
      }],
      recentSituations:[{
        situationId:"sit_southbank",phase:"at_place",
        location:{kind:"place",placeRef:"wpl_southbank"},establishedAt:visitAt,
      }],
      nextAutonomousBoundary:{dueAt:"2026-10-19T20:00:00.000Z"},
    },
    environmentalOpportunities:[],
  };
  const life=groundedLifeSummary(threadId,person,"2026-10-19T18:59:15.000Z");
  assert.equal(life.currentPublicLocality,"London, GB",
    "an attested current public venue lost its grounded locality");
  const evidence={
    environment:"staging",checkedAt:"2026-10-19T18:59:15.000Z",
    targetedThreadId:threadId,scannedThreadCount:1,availableThreadCount:1,
    unavailableThreadIds:[],deployedGitSha:"dda3bf669ebf7789f3644f8af1394783bb597440",
    runtimeSourceMatches:false,worldBlocker:"co_presence_not_scanned",
    coPresenceChecked:false,
    groundedLife:{withVenues:[life],withoutVenues:[]},
    sharedCurrentVenues:[],
    socialOpportunities:[{
      threadId,outcome:"no_co_presence",
      dueAt:"2026-10-18T10:16:02.000Z",
    }],
    causalContinuity:{
      inspectedSharedStoryCount:0,distinctExperiencePairCount:0,
      retainedMemoryChainCount:0,laterContactAfterRetentionCount:0,
      episodes:[],
    },
  };
  const report=formatWorldSocialReport(evidence,"/tmp/world.json");
  assert.match(report,/Locality: London, GB/,
    "operator report omitted the verified public venue's city");
  assert.match(report,/Shared public venues now: not checked/,
    "single-Thread inspection claimed population-wide co-presence knowledge");
  assert.match(report,/Visited Southbank Centre/,
    "actual enacted World arrival disappeared from the report");
  assert.match(report,/earlier social consideration found no eligible peer then/i,
    "historical absence of peers was confused with today's visit");
});
