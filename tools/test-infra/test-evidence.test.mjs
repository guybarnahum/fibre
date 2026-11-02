import assert from "node:assert/strict";
import test from "node:test";
import {reportTestEvidence} from "./test-evidence.mjs";

test("World evidence is silent by default and structured when requested",()=>{
  const lines=[];
  const log=line=>lines.push(line);
  const evidence={rowsPerBoundary:14,byStore:{LivedNowStore:63,SemanticStateStore:35}};
  for(const env of [{},{FIBRE_TEST_EVIDENCE:"0"},{FIBRE_TEST_EVIDENCE:"true"}])
    reportTestEvidence("FIBRE-WORLD-BOUNDARY-UNIT",evidence,{env,log});
  assert.deepEqual(lines,[],"ordinary successful tests printed measurement evidence");
  reportTestEvidence("FIBRE-WORLD-BOUNDARY-UNIT",evidence,{
    env:{FIBRE_TEST_EVIDENCE:"1"},log,
  });
  assert.deepEqual(lines,["FIBRE-WORLD-BOUNDARY-UNIT "+JSON.stringify(evidence)],
    "explicit evidence output lost its structured diagnostic");
});
