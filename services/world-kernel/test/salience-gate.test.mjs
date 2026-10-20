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
