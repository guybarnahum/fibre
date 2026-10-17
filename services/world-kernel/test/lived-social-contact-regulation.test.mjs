import assert from "node:assert/strict";
import test from "node:test";

import { evaluateIntrinsicRegulation } from "../../../core/src/intrinsic-regulation.mjs";
import { socialContactEvidenceForLivedHistory, livedInteroceptionForLivedHistory } from "../src/lived-now-regulation.mjs";
import { formPersonalLivedPlan } from "../src/lived-plan-cognition.mjs";

test("World-grounded lack of reciprocal contact changes inherited Body pressure without inventing loneliness", () => {
  const situations=[
    {threadId:"thr_social_body",situationId:"sit_day_start",establishedAt:"2026-10-12T20:00:00Z"},
    {threadId:"thr_social_body",situationId:"sit_morning",establishedAt:"2026-10-13T06:00:00Z"},
    {threadId:"thr_social_body",situationId:"sit_afternoon",establishedAt:"2026-10-13T16:00:00Z"},
  ];
  const last=situations.at(-1);
  const livedNowStore={
    getPreviousSituation(threadId,before){
      assert.equal(threadId,last.threadId);
      return [...situations].reverse().find(item=>item.establishedAt<before)??null;
    },
  };
  let interactions=[];
  let humanMeetings=[];
  const experienceStore={
    listSocialInteractions(threadId,{limit}){
      assert.equal(threadId,last.threadId);
      assert.ok(limit<=8,"social evidence loaded an unbounded history");
      return interactions;
    },
    listAcceptedHumanMeetings(threadId,{since,until,limit}){
      assert.equal(threadId,last.threadId);
      assert.ok(since<=until&&limit<=8,"Human contact history was not bounded");
      return humanMeetings;
    },
  };
  const assess=(baseline)=> {
    const contact=socialContactEvidenceForLivedHistory({
      threadId:last.threadId,currentSituation:last,livedNowStore,experienceStore,
    });
    return evaluateIntrinsicRegulation({
      perceptFrame:{
        asOf:last.establishedAt,evidenceRefs:[last.situationId],
        ...(contact===null?{}:{contact}),
      },
      runtimeBaselines:{regulatorSocialSensitivity:baseline},
    }).drives.find(d=>d.family==="social_contact");
  };
  const lower=assess(0.85);
  const higher=assess(1.15);
  assert.ok(lower&&higher.pressure>lower.pressure,
    "inherited social sensitivity had no real-world Body effect");
  interactions=[{
    interactionId:"interaction_friendly",
    occurredAt:"2026-10-13T15:00:00Z",
    responseDecision:"accept",
  }];
  const relieved=assess(1.15);
  assert.ok(relieved.pressure<higher.pressure,
    "real reciprocal contact did not change the Body signal");
  assert.ok(!relieved.evidenceRefs.some(ref=>ref==="imagined_friend"),
    "Body sourced a fictional social encounter");
  interactions=[];
  humanMeetings=[{
    encounterRef:"story_real_person_visit",
    occurredAt:"2026-10-13T15:30:00Z",
  }];
  const humanRelieved=assess(1.15);
  assert.ok(humanRelieved.pressure<relieved.pressure,
    "real Human contact did not replenish social exposure");
  assert.ok(humanRelieved.evidenceRefs.includes("story_real_person_visit"),
    "Body lost the Human encounter's World provenance");
  assert.equal(socialContactEvidenceForLivedHistory({
    threadId:last.threadId,currentSituation:situations[0],livedNowStore,experienceStore,
  }),null,"missing lived coverage was mistaken for deprivation");
});

test("inherited social need can change a later Thread-authored Flight Plan without inventing a meeting",async()=>{
  const threadId="thr_grounded_planner";
  const at="2026-10-13T18:00:00Z";
  const prior={
    threadId,situationId:"sit_sustained_life",establishedAt:"2026-10-13T06:00:00Z",
    activity:"Quiet morning chores.",location:{kind:"place",placeRef:"wpl_home"},
  };
  const current={
    ...prior,situationId:"sit_current_life",establishedAt:at,
    activity:"Working at home.",
  };
  const livedNowStore={
    getPreviousSituation(id,before){
      assert.equal(id,threadId);
      return before>prior.establishedAt?prior:null;
    },
    getWorldPlace(_id,ref){
      return ref==="wpl_home"
        ?{ref,displayName:"Home",placeKind:"residence"}
        :ref==="wpl_cafe"?{ref,displayName:"Neighborhood café",placeKind:"market_or_commerce"}:null;
    },
  };
  const experienceStore={
    listSocialInteractions(){return [];},
    listAcceptedHumanMeetings(){return [];},
  };
  const base={
    threadId,version:1,
    identity:{name:"Casey"},
    currentState:{selfModel:"I enjoy quiet work, but sometimes miss being around people.",unresolvedIntentions:[]},
  };
  const inputs=[];
  const modelAdapter={
    async invoke(call){
      const context=call.input.concern.externalContext;
      inputs.push(context);
      const social=context.interoception?.drives.find(d=>d.family==="social_contact");
      const seekCompany=(social?.pressure??0)>=0.4;
      const home={
        startAt:at,endAt:seekCompany?"2026-10-13T19:00:00Z":"2026-10-14T06:00:00Z",
        physicalPlaceRef:"wpl_home",presenceMode:"physical",wakefulness:"awake",
        mediatedContext:"",activity:"Continue drawing.",purpose:"Spend time on my own work.",
        travelFromPrevious:"",
      };
      const stops=[home];
      if(seekCompany)stops.push({
        ...home,startAt:"2026-10-13T19:05:00Z",endAt:"2026-10-14T06:00:00Z",
        physicalPlaceRef:"wpl_cafe",activity:"Draw where people gather.",
        purpose:"Make room for social contact without arranging a meeting.",
        travelFromPrevious:"Walk to the café.",
      });
      return {
        output:{result:{stops},evidenceRefs:[],conflictingMotives:[],uncertainty:null},
        provenance:{provider:"fixture",modelId:"need-responsive-planning"},
      };
    },
  };
  async function planFor(socialSensitivity){
    const thread={
      ...base,genome:{runtimeBaselines:{regulatorSocialSensitivity:socialSensitivity}},
    };
    const interoception=livedInteroceptionForLivedHistory({
      thread,livedNowStore,currentSituation:current,experienceStore,
    });
    return formPersonalLivedPlan({
      threadId,authoredAt:at,horizonEnd:"2026-10-14T06:00:00Z",
      availablePlaceRefs:["wpl_home","wpl_cafe"],
      sourceReferences:[current.situationId],
      startingPlaceRef:"wpl_home",
      sourceStores:{
        worldStore:{getThread(){return thread;}},
        identityStore:{getCurrentIdentityView(){return {threadId,assertions:[]};}},
        semanticStateStore:{listCurrentState(){return [];}},
        memoryStore:{listCurrentMemories(){return [];}},
        situatedLifeStore:{
          listCurrentPlaceEpisodes(){return [];},
          listCurrentLifeRelations(){return [];},
        },
        livedNowStore,
      },
      interoception,modelAdapter,
    });
  }
  const quieter=await planFor(0.85);
  const moreSocial=await planFor(1.15);
  assert.deepEqual(quieter.stops.map(s=>s.physicalPlaceRef),["wpl_home"],
    "low social pressure did not preserve a legitimate solitary plan");
  assert.deepEqual(moreSocial.stops.map(s=>s.physicalPlaceRef),["wpl_home","wpl_cafe"],
    "inherited social hunger did not change a later owned destination");
  assert.ok(inputs.every(c=>c.interoception?.evidenceRefs.includes("sit_sustained_life")),
    "planning lost the lived source of social need");
  assert.ok(moreSocial.stops.every(s=>s.companionRefs.length===0),
    "a need-driven plan manufactured a companion");
});

test("social hunger and sustained sameness coexist in one inherited Body frame",()=>{
  const threadId="thr_independent_needs";
  const old={
    threadId,situationId:"sit_quiet_morning",establishedAt:"2026-10-13T06:00:00Z",
    activity:"Working quietly.",location:{kind:"place",placeRef:"wpl_home"},
    mediatedContext:null,participantRefs:[],
  };
  const current={...old,situationId:"sit_quiet_evening",establishedAt:"2026-10-13T18:00:00Z"};
  const livedNowStore={
    getPreviousSituation(_threadId,before){return before>old.establishedAt?old:null;},
  };
  let humanMeetings=[];
  const experienceStore={
    listSocialInteractions(){return [];},
    listAcceptedHumanMeetings(){return humanMeetings;},
  };
  const thread={
    threadId,genome:{runtimeBaselines:{
      regulatorSocialSensitivity:1.15,regulatorExplorationSensitivity:0.85,
    }},
  };
  const baseline=livedInteroceptionForLivedHistory({
    thread,livedNowStore,currentSituation:current,experienceStore,
  });
  const pressure=family=>baseline.drives.find(d=>d.family===family)?.pressure??0;
  assert.ok(pressure("social_contact")>0&&pressure("exploration")>0,
    "independent lived needs were flattened into one drive");
  humanMeetings=[{encounterRef:"enc_reciprocal",occurredAt:"2026-10-13T17:45:00Z"}];
  const replenished=livedInteroceptionForLivedHistory({
    thread,livedNowStore,currentSituation:current,experienceStore,
  });
  assert.ok((replenished.drives.find(d=>d.family==="social_contact")?.pressure??0)
    <pressure("social_contact"),"contact did not reduce only its own pressure");
  assert.equal(replenished.drives.find(d=>d.family==="exploration").pressure,
    pressure("exploration"),"social contact incorrectly relieved monotony");
});
