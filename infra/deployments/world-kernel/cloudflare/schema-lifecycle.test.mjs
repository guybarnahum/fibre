import test from "node:test";
import assert from "node:assert/strict";

import {installWorldSchemaForRevision} from "./schema-lifecycle.mjs";

test("World schema refuses stale serving code before any store read or installation",()=>{
  const target="b".repeat(40);
  const previous="a".repeat(40);
  let stamp=previous,opens=0,installs=0,resets=0;
  const migrate=(deploymentGitSha)=>installWorldSchemaForRevision({
    expectedGitSha:target,deploymentGitSha,
    readInstalledGitSha:()=>{opens++;return stamp;},
    install:()=>{installs++;stamp=deploymentGitSha;},
    onSuperseded:expected=>{assert.equal(expected,target);resets++;},
  });

  const pending=migrate(previous);
  assert.deepEqual(pending,{status:409,body:{
    ok:false,code:"WORLD_REVISION_NOT_SERVING",deploymentGitSha:previous,
  }},"stale revision was permitted to stamp World state");
  assert.equal(opens,0,"revision mismatch opened the World store");
  assert.equal(installs,0,"revision mismatch installed World schema");
  assert.equal(stamp,previous,"revision mismatch changed the schema stamp");
  assert.equal(resets,1,"superseded World did not request a reset");

  const installed=migrate(target);
  assert.equal(installed.status,200);
  assert.equal(installed.body.installed,true);
  assert.equal(installs,1,"new serving revision did not install its schema");
  assert.equal(opens,1,"installation checked the stamp more than once");
  assert.equal(stamp,target,"schema was not stamped with its serving revision");
  assert.equal(resets,1,"matching World revision requested a reset");

  const repeated=migrate(target);
  assert.deepEqual({installed:repeated.body.installed,already:repeated.body.already},
    {installed:false,already:true},"same World revision reinstalled the schema");
  assert.equal(installs,1,"repeat deployment re-ran expensive schema installation");
  assert.equal(opens,2,"no-op required more than one stamp read");
});
