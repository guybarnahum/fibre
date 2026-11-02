import test from "node:test";
import assert from "node:assert/strict";

import {installWorldSchemaForRevision} from "./schema-lifecycle.mjs";

test("World schema install refuses stale code and skips unchanged definitions",()=>{
  const target="b".repeat(40),previous="a".repeat(40);
  const digest="d".repeat(64),nextDigest="e".repeat(64);
  let stamp=null,opens=0,installs=0,resets=0;
  const migrate=({deploymentGitSha,expectedGitSha=target,schemaDigest=digest})=>
    installWorldSchemaForRevision({
      expectedGitSha,deploymentGitSha,expectedSchemaDigest:schemaDigest,
      readInstalledSchemaDigest:()=>{opens++;return stamp;},
      install:()=>{installs++;stamp=schemaDigest;},
      onSuperseded:expected=>{assert.equal(expected,target);resets++;},
    });

  const blocked=migrate({deploymentGitSha:previous});
  assert.deepEqual(blocked,{status:409,body:{
    ok:false,code:"WORLD_REVISION_NOT_SERVING",deploymentGitSha:previous,
  }},"stale code installed a World schema");
  assert.equal(opens,0,"revision refusal opened World storage");
  assert.equal(installs,0,"revision refusal ran schema installation");
  assert.equal(resets,1);

  const installed=migrate({deploymentGitSha:target});
  assert.equal(installed.status,200);
  assert.equal(installed.body.installed,true);
  assert.equal(installs,1);
  assert.equal(stamp,digest);
  assert.equal(opens,1);

  const differentCode=migrate({
    deploymentGitSha:"c".repeat(40),expectedGitSha:"c".repeat(40),
  });
  assert.equal(differentCode.body.already,true,
    "code-only revision caused a full schema install");
  assert.equal(installs,1,"unchanged World schema was reinstalled");

  const changed=migrate({deploymentGitSha:target,schemaDigest:nextDigest});
  assert.equal(changed.body.installed,true,"changed schema was skipped");
  assert.equal(installs,2);
  assert.equal(stamp,nextDigest);
});
