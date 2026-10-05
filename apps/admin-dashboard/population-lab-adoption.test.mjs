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
    model:[{
      id:"middle_east.egypt",
      version:2,
      admissionEvidence:{approvalExperimentId:"shadow_egypt"},
    }],
    migrationCandidates:[{threadId:"thr_other"}],
  });
  assert.equal(converged.state,"converged","completed adoption did not converge");
});


test("admission observation distinguishes registry write from World convergence",()=>{
  const current={
    id:"middle_east.egypt",
    version:2,
  };
  const stale=populationLabAdmissionObservation({
    experimentId:"shadow_egypt",
    current,
    coverage:{
      model:[{
        id:"middle_east.egypt",
        version:1,
        admissionEvidence:null,
      }],
    },
  });
  assert.equal(stale.observed,false,"stale World projection looked converged");
  assert.equal(stale.observedVersion,1,"stale World version was lost");

  const currentWorld=populationLabAdmissionObservation({
    experimentId:"shadow_egypt",
    current,
    coverage:{
      model:[{
        id:"middle_east.egypt",
        version:2,
        admissionEvidence:{approvalExperimentId:"shadow_egypt"},
      }],
    },
  });
  assert.equal(currentWorld.observed,true,"World did not recognize exact admitted authority");
});

test("superseded approval is retained but cannot be admitted again",()=>{
  const state=populationLabAdoptionState(experiment,{
    model:[{
      id:"middle_east.egypt",
      version:3,
      admissionEvidence:{approvalExperimentId:"plexp_newer"},
    }],
    migrationCandidates:[],
  });
  assert.equal(state.superseded,true,"superseded approval was not recognized");
  assert.equal(state.state,"superseded","superseded approval remained actionable");
  assert.equal(populationLabExperimentAdmitted(state),false,
    "superseded approval looked like the current exact admission");
  assert.deepEqual(
    [...populationLabAffectedThreadIds([state])],
    [],
    "superseded approval contributed migration work",
  );
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
