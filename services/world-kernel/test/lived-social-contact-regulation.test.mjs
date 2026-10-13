import assert from "node:assert/strict";
import test from "node:test";

import { evaluateIntrinsicRegulation } from "../../../core/src/intrinsic-regulation.mjs";
import { socialContactEvidenceForLivedHistory } from "../src/lived-now-regulation.mjs";

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
