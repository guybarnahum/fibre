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
