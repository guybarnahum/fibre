import assert from "node:assert/strict";
import test from "node:test";

import { evaluateSalience } from "../src/salience-gate.mjs";

const percept = Object.freeze({
  observerThreadId:"thr_salience_observer",
  setting:Object.freeze({
    mode:"physical",
    participantRefs:Object.freeze([]),
  }),
  recentEvents:Object.freeze([]),
  sourceReferences:Object.freeze(["sit_salience_observer"]),
});

test("an unexpected observable can elevate an otherwise background opportunity", () => {
  const ordinary = evaluateSalience({
    opportunity:{
      kind:"observed_person",
      subjectRefs:["thr_salience_other"],
    },
    situatedPercept:percept,
  });
  const anomalous = evaluateSalience({
    opportunity:{
      kind:"observed_person",
      subjectRefs:["thr_salience_other"],
      observableCues:["unexpected_observable"],
    },
    situatedPercept:percept,
  });

  assert.equal(ordinary.outcome, "background",
    "ordinary unanchored observation should remain background");
  assert.equal(anomalous.outcome, "salient",
    "unexpected observable should be able to enter attention");
  assert.deepEqual(anomalous.anchors, ["unexpected_observable"],
    "anomaly should remain inspectable as the materiality reason");
});

test("background co-presence retains Body evidence without inventing social interest",()=>{
  const opportunity={kind:"actor_presence",subjectRefs:["thr_salience_other"]};
  const base={opportunity,situatedPercept:percept};
  const absent=evaluateSalience(base);
  const unrelated=evaluateSalience({...base,regulationFrame:{
    asOf:"2026-10-20T11:35:00.001Z",
    drives:[{family:"rest",orientation:"maintain",
      pressure:0.7,evidenceRefs:["sit_rest"]}],
  }});
  const weak=evaluateSalience({...base,regulationFrame:{
    asOf:"2026-10-20T11:35:00.001Z",
    drives:[{family:"social_contact",orientation:"approach",
      pressure:0.375197,evidenceRefs:["sit_contact_history"]}],
  }});
  const material=evaluateSalience({...base,regulationFrame:{
    asOf:"2026-10-20T11:35:00.001Z",
    drives:[{family:"social_contact",orientation:"approach",
      pressure:0.4,evidenceRefs:["sit_contact_history"]}],
  }});
  assert.equal(absent.bodyAtGate,null,
    "missing Body evidence became an invented zero-pressure reading");
  assert.deepEqual(unrelated.bodyAtGate.drives,[],
    "a known but irrelevant Body frame was mistaken for a social drive");
  assert.equal(weak.outcome,"background",
    "ordinary weak social pull incorrectly forced cognition");
  assert.equal(weak.bodyAtGate.drives[0].pressure,0.375197,
    "background erased the actual Body pressure");
  assert.deepEqual(weak.bodyAtGate.drives[0].evidenceRefs,["sit_contact_history"],
    "background lost the Body provenance");
  assert.equal(material.outcome,"salient",
    "material social need did not reach consideration");
  assert.deepEqual(material.anchors,["social_contact_pressure"],
    "Body pressure was reinterpreted as a social decision");
});

test("restless people notice unfamiliar arrivals, not every nearby person",()=>{
  const counterpart="thr_salience_other",observer="thr_salience_observer";
  const regulationFrame={asOf:"2026-10-22T13:00:00.000Z",
    drives:[{family:"exploration",orientation:"approach",
      pressure:0.5,evidenceRefs:["sit_restless"]}]};
  const make=(known,noticed)=>evaluateSalience({
    opportunity:{kind:"actor_presence",subjectRefs:[counterpart]},
    regulationFrame,
    situatedPercept:{
      observerThreadId:observer,setting:{mode:"physical",participantRefs:[]},
      observed:[{threadId:counterpart,name:known?"Known friend":null}],
      recentEvents:noticed?[{kind:"encounter",counterpartyThreadIds:[counterpart],
        noticedArrivalThreadIds:[counterpart]}]:[],
      sourceReferences:["sit_restless"],
    },
  });
  const ordinary=make(false,false);
  const familiar=make(true,true);
  const stranger=make(false,true);
  assert.equal(ordinary.outcome,"background",
    "stillness alone manufactured interest in a stranger");
  assert.equal(familiar.outcome,"salient",
    "an admitted noticed encounter lost its normal observable-history anchor");
  assert.deepEqual(familiar.anchors,["recent_observable_history"],
    "familiar noticed company was confused with novelty");
  assert.equal(familiar.anchors.includes("novel_person_under_exploration_pressure"),
    false,"an already-known person became novelty");
  assert.equal(stranger.anchors.includes("novel_person_under_exploration_pressure"),
    true,"noticing a new stranger failed to channel curiosity");
  assert.equal(ordinary.bodyAtGate.drives[0].pressure,0.5,
    "Body restlessness was erased when interest stayed background");
});
