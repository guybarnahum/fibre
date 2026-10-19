import assert from "node:assert/strict";
import test from "node:test";
import {recentLifeMoments,recordedLifeMoments,formativeLifeMoments} from "./life-causes-model.mjs";

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
    currentLocation:{placeRef:"wpl_southbank",displayName:"Southbank Centre"},
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
  assert.equal(moments[0].publicVenueName,"Southbank Centre",
    "the attested current public venue name disappeared");
  assert.equal(moments[1].publicVenueName,null,
    "a prior scene borrowed today's current location name");
});

test("a social decision witnesses Body and consent without equating co-presence with conversation",()=>{
  const history=recordedLifeMoments({
    socialOpportunities:[{
      kind:"arrival",situationId:"sit_reader",
      completedAt:"2026-10-19T18:00:00Z",outcome:"not_initiated",
      decision:{
        counterpartyThreadId:"thr_guest",
        salience:{outcome:"salient",anchors:["social_contact_pressure"],
          sourceReferences:["sit_reader"]},
        initiation:{decision:"not_initiate",reportedReason:"I prefer my book.",
          decisionContext:{interoception:{
            drives:[{family:"social_contact",pressure:0.6}],
            evidenceRefs:["sit_reader"],
          }},selectedEvidenceRefs:[]},
        response:null,encounterRef:null,
      },
    }],
  });
  const choice=history.find(item=>item.kind==="social_choice");
  assert.equal(choice.outcome,"not_initiated");
  assert.equal(choice.decision.salience.anchors[0],"social_contact_pressure");
  assert.equal(choice.decision.initiation.decisionContext.interoception.drives[0].pressure,0.6);
  assert.equal(choice.decision.encounterRef,null,
    "unacted social pressure was misrepresented as an admitted encounter");
  assert.equal(history.some(item=>item.kind==="encounter"),false,
    "World invented a conversation from the opportunity alone");
});

test("a recipient's recorded refusal stays distinct from any actual conversation",()=>{
  const moments=recordedLifeMoments({
    threadId:"thr_reader",
    socialInteractions:[{
      interactionId:"social_decline",occurredAt:"2026-10-19T18:30:00Z",
      initiatorThreadId:"thr_guest",recipientThreadId:"thr_reader",
      requestText:"Would you like to talk?",responseDecision:"decline",
      responseExpression:"Not right now.",suggestedAt:null,
    }],
  });
  const choice=moments.find(item=>item.kind==="social_interaction");
  assert.equal(choice.role,"recipient");
  assert.equal(choice.responseDecision,"decline",
    "the recipient's consent decision was lost");
  assert.equal(moments.some(item=>item.kind==="encounter"),false,
    "a refused invitation became a conversation");
});

test("recorded life preserves separate World history, personal Encounter experience and remembered meaning",()=>{
  const history={
    livedNow:{
      currentSituation:{
        situationId:"sit_after",establishedAt:"2026-10-19T17:45:02Z",
        activity:"Reading at a public venue",
        location:{kind:"place",placeRef:"wpl_a"},
        sourcePlanRefs:["lplan_a"],
      },
      recentSituations:[{
        situationId:"sit_after",establishedAt:"2026-10-19T17:45:02Z",
        activity:"Reading at a public venue",
        location:{kind:"place",placeRef:"wpl_a"},
        sourcePlanRefs:["lplan_a"],
      }],
      recentPersonalPlans:[{
        planId:"lplan_a",kind:"personal",
        stops:[{physicalPlaceRef:"wpl_a",
          startAt:"2026-10-19T17:45:00Z",endAt:"2026-10-19T19:00:00Z",
          purpose:"To study in company"}],
      }],
    },
    encounterStories:[{
      encounterId:"story_book",occurredAt:"2026-10-18T16:00:00Z",
      story:{beats:[{kind:"utterance",actorThreadId:"thr_a",text:"Hello."}]},
      attention:{outcome:"noticed",experience:{
        experienceId:"exp_book",experienceText:"I felt welcome."}},
    },{
      encounterId:"story_rain",occurredAt:"2026-10-17T16:00:00Z",
      story:{beats:[{kind:"occurrence",actorThreadId:null,text:"Rain began."}]},
      attention:{outcome:"not_noticed",experience:null},
    }],
    memories:[{
      memoryId:"mem_book",subjectPeriod:{startAt:"2026-10-18T16:00:00Z"},
      recordedAt:"2026-10-19T09:00:00Z",
      eventRefs:["exp_book"],rememberedContent:"A friendly greeting.",
      rememberedMeaning:"I might try greeting another visitor.",
    }],
  };
  const moments=recordedLifeMoments(history);
  assert.equal(moments.filter(item=>item.kind==="scene").length,1,
    "a repeated enacted scene became two life events");
  assert.equal(moments.find(item=>item.kind==="scene").planned.purpose,
    "To study in company","a historical plan lost its authored purpose");
  assert.equal(moments.find(item=>item.kind==="encounter").memoryLinks[0],
    "mem_book","an explicitly linked personal Experience lost its Memory");
  assert.equal(moments.find(item=>item.kind==="world").attention,
    "not_noticed","an unattended occurrence was turned into an Experience");
  assert.equal(moments.find(item=>item.kind==="memory").at,
    "2026-10-18T16:00:00Z",
    "a remembered episode was placed at its later consolidation time");
  assert.equal(moments.find(item=>item.kind==="memory").meaning,
    "I might try greeting another visitor.",
    "the person's remembered meaning disappeared from the life inspection");
});


test("Origins stays a birth fact and a selective Memory, not synthetic childhood",()=>{
  const moments=formativeLifeMoments({
    publicationAt:"2026-10-19T21:00:00Z",
    identity:{birthDate:"2011-02-08",birthPlace:"Tbilisi, Georgia",
      world:{thread:{threadId:"thr_one"}}},
    genesisEpisodes:[{
      eventId:"evt_child",occurredAt:"2018-04-01T12:00:00Z",
      ageAtEvent:7,observableAction:"Asked a librarian for a book.",
      episodeId:"episode_child",genesisId:"gen_child",placeRef:"place_library",
      participantRefs:["person_librarian"],
    }],
    memories:[{
      memoryId:"mem_child",subjectPeriod:{startAt:"2019-03-02T10:00:00Z"},
      recordedAt:"2026-10-19T19:00:00Z",
      rememberedContent:"I remember a school corridor.",
      rememberedMeaning:"I learned to listen.",
    }],
  });
  assert.deepEqual(moments.map(item=>item.kind),
    ["memory","formative_event","origin"],
    "an admitted childhood episode was lost or mistaken for Memory");
  assert.equal(moments[1].title,"Asked a librarian for a book.");
  assert.equal(moments[1].genesisId,"gen_child");
  assert.equal(moments[0].at,"2019-03-02T10:00:00Z",
    "remembered childhood was moved to Genesis execution time");
  assert.equal(moments[2].birthPlace,"Tbilisi, Georgia");
});
