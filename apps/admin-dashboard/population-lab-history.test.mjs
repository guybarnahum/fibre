import test from "node:test";
import assert from "node:assert/strict";

import {
  populationLabCalibrationHistoryGroups,
  populationLabHistoricalExperimentIds,
  populationLabHistoryDraft,
} from "./population-lab-history.js";

const experiments=[
  {experimentId:"base_v1"},
  {experimentId:"admit_v2",baselineExperimentId:"base_v1"},
  {experimentId:"base_v2"},
  {experimentId:"admit_v3",baselineExperimentId:"base_v2"},
];

const history=[{
  id:"middle_east.egypt",
  currentVersion:3,
  versions:[
    {id:"middle_east.egypt",version:1,origin:true,values:{},variation:{},evidence:null},
    {id:"middle_east.egypt",version:2,origin:false,values:{noseBreadth:.12},variation:{},evidence:{approvalExperimentId:"admit_v2"}},
    {id:"middle_east.egypt",version:3,origin:false,values:{noseBreadth:.14},variation:{familyFactorMultiplier:1.04},evidence:{approvalExperimentId:"admit_v3"}},
  ],
}];

test("calibration history links each baseline to retained experiment evidence",()=>{
  const [group]=populationLabCalibrationHistoryGroups(history,experiments);
  assert.equal(group.versions[0].reportExperimentId,"base_v1","origin lost its baseline report");
  assert.equal(group.versions[1].reportExperimentId,"base_v2","historical baseline did not use next comparison baseline");
  assert.equal(group.versions[1].admissionExperimentId,"admit_v2","admitted version lost its comparison experiment");
  assert.equal(group.versions[2].reportExperimentId,"admit_v3","current baseline lost admitted evidence");
  assert.equal(group.versions[2].current,true,"current baseline was not marked");
  assert.deepEqual(
    [...populationLabHistoricalExperimentIds([group])].sort(),
    ["admit_v2","admit_v3","base_v1","base_v2"],
    "historical evidence leaked back into the active queue",
  );
});

test("history exports a reusable refinement starting point",()=>{
  const [group]=populationLabCalibrationHistoryGroups(history,experiments);
  assert.deepEqual(
    populationLabHistoryDraft(group,group.versions[2]),
    {
      referencePopulation:"middle_east.egypt",
      sourceVersion:3,
      rationale:"",
      evidence:[],
      values:{noseBreadth:.14},
      variation:{familyFactorMultiplier:1.04},
    },
    "history export stopped representing the selected baseline",
  );
});
