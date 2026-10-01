import assert from "node:assert/strict";
import test from "node:test";

import { createThreadMigrationSummaryService } from "../src/thread-migration-summary-service.mjs";

test("migration summary keeps appearance and identity work distinct",()=>{
  const service=createThreadMigrationSummaryService({
    appearanceCoverage:{
      scan(){return {
        migrationCandidates:[
          {threadId:"thr_both",reasons:["calibration_dependencies_changed"]},
          {threadId:"thr_appearance",reasons:["physical_model_outdated"]},
        ],
        lineages:[
          {threadId:"thr_both",side:"maternal",population:"Moroccan family"},
          {threadId:"thr_both",side:"paternal",population:"Moroccan family"},
          {threadId:"thr_appearance",side:"maternal",population:"Korean family"},
        ],
      };},
      inspect(threadId){
        return {
          migrationCandidates:threadId==="thr_both"||threadId==="thr_appearance"
            ? [{threadId,reasons:["calibration_dependencies_changed"]}]
            : [],
          lineages:threadId==="thr_both"
            ? [{threadId,side:"maternal",population:"Moroccan family"}]
            : [],
        };
      },
    },
    directoryStore:{
      getEntry(threadId){return {threadId,sex:threadId==="thr_sex"?null:"female"};},
    },
    symbolicGenomeStore:{
      listThreadMigrationCandidates(){return [
        {threadId:"thr_both",state:"legacy_v1_de_novo"},
        {threadId:"thr_identity",state:"legacy_v1_recombined"},
      ];},
      inspectThreadGenomeMigration(threadId){
        return {state:threadId==="thr_both"?"legacy_v1_de_novo":"current"};
      },
    },
    genesisBirthSexEvidence:{
      listMigrationThreadIds(){return ["thr_sex"];},
      resolve(threadId){return threadId==="thr_sex"?{sex:"female"}:null;},
    },
  });

  const scan=service.scan();
  const byId=new Map(scan.threads.map((entry)=>[entry.threadId,entry]));
  assert.deepEqual(byId.get("thr_appearance").domains,["appearance"]);
  assert.deepEqual(byId.get("thr_identity").domains,["identity"]);
  assert.deepEqual(byId.get("thr_both").domains,["appearance","identity"]);
  assert.deepEqual(byId.get("thr_both").physicalOrigins,["Moroccan family"]);
  assert.deepEqual(byId.get("thr_sex").domains,["identity"]);
  assert.deepEqual(scan.origins,[
    {threadId:"thr_appearance",physicalOrigins:["Korean family"]},
    {threadId:"thr_both",physicalOrigins:["Moroccan family"]},
  ],"migration scan did not reuse appearance ancestry for Thread context");
});

test("exact migration summary does not require a population scan",()=>{
  let scans=0;
  const service=createThreadMigrationSummaryService({
    appearanceCoverage:{
      scan(){scans+=1;return {migrationCandidates:[]};},
      inspect(){return {
        migrationCandidates:[{reasons:["calibration_dependencies_changed"]}],
        lineages:[{threadId:"thr_exact",side:"maternal",population:"Korean family"}],
      };},
    },
    directoryStore:{getEntry(threadId){return {threadId,sex:"female"};}},
    symbolicGenomeStore:{
      listThreadMigrationCandidates(){throw new Error("population identity scan should not run");},
      inspectThreadGenomeMigration(){return {state:"current"};},
    },
    genesisBirthSexEvidence:{
      listMigrationThreadIds(){throw new Error("population Genesis scan should not run");},
      resolve(){return null;},
    },
  });

  const exact=service.inspect("thr_exact");
  assert.deepEqual(exact.domains,["appearance"]);
  assert.deepEqual(exact.physicalOrigins,["Korean family"]);
  assert.equal(scans,0,"exact migration refresh scanned the population");
});
