import assert from "node:assert/strict";
import test from "node:test";

import {formatWorldSocialReport,groundedLifeSummary,summarizeSocialActivity,summarizeSocialContinuity} from "./world-social-probe.mjs";

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

test("social timing report distinguishes missed company from voluntary refusal",()=>{
  const due="2026-10-21T11:15:00.063Z";
  const started="2026-10-21T11:15:13.646Z";
  const evidence={
    environment:"staging",checkedAt:"2026-10-21T18:25:00.000Z",
    targetedThreadId:"thr_witness",scannedThreadCount:1,
    availableThreadCount:1,unavailableThreadIds:[],
    deployedGitSha:"71ac4c16126622acda4b5a6b994ca7cb36285a43",
    runtimeSourceMatches:true,worldBlocker:"co_presence_not_scanned",
    groundedLife:{withVenues:[],withoutVenues:[]},
    sharedCurrentVenues:[],
    socialOpportunities:[{
      threadId:"thr_witness",kind:"observed",dueAt:due,
      startedAt:started,completedAt:started,outcome:"missed_window",
      sourceEncounterRef:"story_shared_arrival",decision:null,
    }],
    distinctExperienceWitness:null,
    causalContinuity:{
      inspectedSharedStoryCount:0,distinctExperiencePairCount:0,
      retainedMemoryChainCount:0,laterContactAfterRetentionCount:0,
      episodes:[],
    },
  };
  const report=formatWorldSocialReport(evidence,"/tmp/world-social.json");
  assert.match(report,/missed window/,
    "the witnessed opportunity was mislabeled as absent company");
  assert.match(report,/13\.583s after opportunity/,
    "the decision delay was not measured from the enacted occurrence");
  assert.match(report,/started 2026-10-21 11:15:13 UTC/,
    "actual claim timing was lost from social investigation");
  assert.match(report,/no conversation was attempted/i,
    "a missed opportunity was misrepresented as a voluntary refusal");
});

test("social probe explains a durably interrupted cognition attempt",()=>{
  const at="2026-10-24T07:15:00.000Z";
  const report=formatWorldSocialReport({
    environment:"staging",checkedAt:at,targetedThreadId:"thr_surafel",
    scannedThreadCount:1,availableThreadCount:1,unavailableThreadIds:[],
    deployedGitSha:"8f6e674",runtimeSourceMatches:false,
    groundedLife:{withVenues:[],withoutVenues:[]},sharedCurrentVenues:[],
    socialOpportunities:[{
      threadId:"thr_surafel",kind:"arrival",dueAt:at,
      startedAt:at,completedAt:at,outcome:"interrupted",
      decision:{error:"OpenAI strict response schema invalid at $.properties.result",
        counterpartyThreadId:"thr_samuel",salience:{outcome:"salient",anchors:[]}},
    }],
    causalContinuity:{inspectedSharedStoryCount:0,distinctExperiencePairCount:0,
      retainedMemoryChainCount:0,laterContactAfterRetentionCount:0,episodes:[]},
  },"/tmp/social-failure.json");
  assert.match(report,/strict response schema invalid/,
    "interrupted model failure was omitted from the social probe");
  assert.match(report,/thr_surafel → thr_samuel/,
    "interrupted social attention lost its counterpart");
});

test("the social probe retains an operator-grounded current city without mistaking birthplace for residence",()=>{
  const threadId="thr_london";
  const person={
    thread:{identity:{name:"Omar",birthCity:"Lahore"}},
    livedNow:{
      currentSituation:{
        situationId:"sit_home",phase:"at_place",wakefulness:"awake",
        location:{kind:"place",placeRef:"place_london"},
        establishedAt:"2026-10-21T22:59:00.000Z",
      },
      operatorCurrentPlace:{placeRef:"place_london",locality:"London",countryCode:"GB"},
      currentLocation:{placeRef:"place_lahore",locality:"Lahore",countryCode:"PK"},
      worldPlaces:[],placeEpisodes:[],
    },
  };
  const life=groundedLifeSummary(threadId,person,"2026-10-21T23:00:00.000Z");
  assert.equal(life.currentWorldLocality,"London, GB",
    "the social probe lost the same enacted city recognized by the population census");
  const changed=structuredClone(person);
  changed.livedNow.operatorCurrentPlace.placeRef="place_elsewhere";
  assert.equal(groundedLifeSummary(threadId,changed,"2026-10-21T23:00:00.000Z")
    .currentWorldLocality,null,
    "an unrelated location was incorrectly called the Thread's current city");
});

test("social probe counts graded acts, reciprocal attention and need-band debt",()=>{
  const due="2026-10-23T12:00:00.000Z";
  const items=[
    {threadId:"thr_a",kind:"arrival",trigger:"activity_change",
      dueAt:due,startedAt:due,completedAt:due,outcome:"acted",
      decision:{counterpartyThreadId:"thr_b",initiation:{act:"greet",
        expression:"Hello.",decisionContext:{priorSocialChoicesThisVisit:[{act:"none"}]}}},
      story:{encounterId:"enc_greeting",recipientThreadId:"thr_b",
        participants:[{threadId:"thr_b",attention:"not_noticed"}]}},
    {threadId:"thr_a",kind:"arrival",trigger:"need_band",needBand:0.4,
      dueAt:due,startedAt:null,completedAt:null,outcome:"pending"},
    {threadId:"thr_b",kind:"observed",trigger:"social_act",dueAt:due,
      startedAt:due,completedAt:due,outcome:"not_initiated",
      decision:{initiation:{act:"none",decisionContext:{priorSocialChoicesThisVisit:[]}}}},
    {threadId:"thr_b",kind:"arrival",trigger:"need_band",needBand:0.6,
      dueAt:due,startedAt:due,completedAt:due,outcome:"need_unreached"},
  ];
  const result=summarizeSocialActivity(items);
  assert.deepEqual(result.opportunityTriggers,{activity_change:1,need_band:2,social_act:1},
    "one kind of social opportunity disappeared from the report");
  assert.equal(result.initiationActs.greet,1);
  assert.equal(result.initiationActs.none,1);
  assert.equal(result.recipientNotNoticed,1,"an unnoticed greeting was reported as noticed");
  assert.deepEqual([result.needBands.pending,result.needBands.completed],[1,1],
    "the probe lost pending versus settled Body crossings");
  assert.equal(result.decisionsWithPriorChoices,1,
    "prior personal choices were invisible to operators");
  const report=formatWorldSocialReport({
    environment:"staging",checkedAt:due,targetedThreadId:"thr_a",
    scannedThreadCount:1,availableThreadCount:1,unavailableThreadIds:[],
    deployedGitSha:"abc1234",runtimeSourceMatches:false,
    groundedLife:{withVenues:[],withoutVenues:[]},
    sharedCurrentVenues:[],socialOpportunities:items,
    causalContinuity:{inspectedSharedStoryCount:0,distinctExperiencePairCount:0,
      retainedMemoryChainCount:0,laterContactAfterRetentionCount:0,episodes:[]},
  },"/tmp/social-life.json");
  assert.match(report,/activity_change=1/);
  assert.match(report,/recipient noticed=0 · not noticed=1/);
  assert.match(report,/thr_a → thr_b/);
  assert.match(report,/Hello\./);
});

test("future venue plans use admitted physical-place refs, not absent presenceMode",()=>{
  const at="2026-10-23T09:00:00.000Z";
  const life=groundedLifeSummary("thr_reader",{
    thread:{identity:{name:"Reader"}},
    livedNow:{currentSituation:null,
      worldPlaces:[{ref:"wpl_library",physicalVenue:{ref:"venue_library"}}],
      currentPersonalPlan:{stops:[{physicalPlaceRef:"wpl_library",
        startAt:"2026-10-23T10:00:00.000Z",endAt:"2026-10-23T11:00:00.000Z"}]},
    },
  },at);
  assert.equal(life.futureAttestedVenueStops.length,1,
    "a valid planned public visit vanished from social inspection");
});
