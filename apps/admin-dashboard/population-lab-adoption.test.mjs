import test from "node:test";
import assert from "node:assert/strict";

import {
  populationLabAdoptionState,
  populationLabAffectedThreadIds,
  populationLabExperimentAdmitted,
} from "./population-lab-adoption.js";

const experiment={
  experimentId:"shadow_egypt",
  experimentKind:"refinement",
  artifacts:{calibrationApproval:{objectRef:"approval"}},
  approval:{
    approvedAt:"2026-10-04T16:00:00Z",
    impact:{
      referencePopulation:"middle_east.egypt",
      fromVersion:1,
      toVersion:2,
      threadIds:["thr_a","thr_b"],
      threadCount:2,
      lineageCount:3,
    },
  },
};

test("calibration adoption follows admitted authority and affected World workset",()=>{
  const waiting=populationLabAdoptionState(experiment,{
    model:[{id:"middle_east.egypt",version:1}],
    migrationCandidates:[],
  });
  assert.equal(waiting.state,"admission_required","unadmitted approval looked live");

  const affected=populationLabAdoptionState(experiment,{
    model:[{
      id:"middle_east.egypt",
      version:2,
      admissionEvidence:{approvalExperimentId:"shadow_egypt"},
    }],
    migrationCandidates:[{threadId:"thr_b"},{threadId:"thr_other"}],
  });
  assert.equal(affected.state,"affected","admitted calibration lost its affected workset");
  assert.deepEqual(affected.remainingThreadIds,["thr_b"]);
  assert.deepEqual([...populationLabAffectedThreadIds([affected])],["thr_b"]);

  const converged=populationLabAdoptionState(experiment,{
    model:[{id:"middle_east.egypt",version:2}],
    migrationCandidates:[{threadId:"thr_other"}],
  });
  assert.equal(converged.state,"converged","completed adoption did not converge");
});


test("experiment is admitted only when registry provenance names that exact experiment",()=>{
  assert.equal(
    populationLabExperimentAdmitted({admitted:true,exactAdmission:true}),
    true,
    "exact registry admission was not recognized",
  );
  assert.equal(
    populationLabExperimentAdmitted({admitted:true,exactAdmission:false}),
    false,
    "version movement falsely admitted a different experiment",
  );
  assert.equal(
    populationLabExperimentAdmitted({admitted:false,exactAdmission:true}),
    false,
    "unadmitted approval evidence looked live",
  );
});
