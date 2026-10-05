import assert from "node:assert/strict";
import test from "node:test";

import {
  PHYSICAL_GENOME_VERSION,
  createReferencePopulationModel,
  referencePopulationPrior,
} from "#core/src/human-appearance/index.mjs";
import { appearanceCalibrationDependencies } from "#core/src/population-context/index.mjs";
import { createAppearanceCoverageService } from "../src/appearance-coverage-service.mjs";

function thread(threadId,name){
  return {
    threadId,
    displayName:name,
    birthPlace:"Fes, Morocco",
    birthLocation:{displayName:"Fes, Morocco",country:"Morocco",city:"Fes",lat:34.03313,long:-5.00028},
    physicalGenomeVersion:PHYSICAL_GENOME_VERSION,
  };
}

const ancestry={
  maternal:[{populationId:"morocco",population:"Moroccan family",share:1,referencePopulation:"afr_north.morocco"}],
  paternal:[{populationId:"morocco",population:"Moroccan family",share:1,referencePopulation:"afr_north.morocco"}],
};

function evidence(threadId){
  return {
    threadId,
    physicalAncestry:ancestry,
    calibrationDependencies:appearanceCalibrationDependencies(ancestry),
    physicalGenomeVersion:PHYSICAL_GENOME_VERSION,
  };
}

test("appearance coverage batches population ancestry and keeps exact inspection exact",()=>{
  const threads=[thread("thr_one","One"),thread("thr_two","Two")];
  let listEntries=0;
  let listEvidence=0;
  let getEntry=0;
  let latestEvidence=0;
  const service=createAppearanceCoverageService({
    directoryStore:{
      listEntries(){
        listEntries+=1;
        return threads;
      },
      getEntry(threadId){
        getEntry+=1;
        return threads.find((entry)=>entry.threadId===threadId)??null;
      },
    },
    physicalGenomeMigrationStore:{
      listLatestEvidence(threadIds){
        listEvidence+=1;
        assert.deepEqual(threadIds,["thr_one","thr_two"]);
        return threadIds.map(evidence);
      },
      latestEvidence(threadId){
        latestEvidence+=1;
        return evidence(threadId);
      },
    },
  });

  const population=service.scan();
  assert.equal(population.threadCount,2);
  assert.equal(listEntries,1,"coverage scan repeated the Thread directory read");
  assert.equal(listEvidence,1,"coverage scan repeated ancestry reads");
  assert.equal(getEntry,0);
  assert.equal(latestEvidence,0);

  const exact=service.inspect("thr_one");
  assert.equal(exact.threadCount,1);
  assert.equal(getEntry,1,"exact coverage did not use exact Thread authority");
  assert.equal(latestEvidence,1,"exact coverage did not use exact ancestry evidence");
  assert.equal(listEntries,1,"exact coverage rescanned the Thread population");
  assert.equal(listEvidence,1,"exact coverage rescanned population ancestry");
});

test("appearance coverage reads one dynamic calibration model for the whole population",()=>{
  const threads=[thread("thr_one","One"),thread("thr_two","Two")];
  const stored=threads.map(({threadId})=>evidence(threadId));
  const currentPrior=referencePopulationPrior("afr_north.morocco");
  const model=createReferencePopulationModel([{
    id:"afr_north.morocco",
    version:2,
    values:{noseBreadth:Math.min(1,currentPrior.noseBreadth+.05)},
    variation:{},
    evidence:{approvalExperimentId:"plexp_morocco_v2"},
  }]);
  let modelReads=0;
  const service=createAppearanceCoverageService({
    directoryStore:{
      listEntries(){return threads},
      getEntry(threadId){return threads.find(entry=>entry.threadId===threadId)??null},
    },
    physicalGenomeMigrationStore:{
      listLatestEvidence(){return stored},
      latestEvidence(threadId){return stored.find(entry=>entry.threadId===threadId)??null},
    },
    calibrationModelProvider(){
      modelReads+=1;
      return model;
    },
  });

  const coverage=service.scan();
  assert.equal(modelReads,1,"coverage reread calibration authority during one scan");
  assert.equal(
    coverage.model.find(entry=>entry.id==="afr_north.morocco")?.version,
    2,
    "coverage ignored admitted runtime calibration",
  );
  assert.deepEqual(
    coverage.migrationCandidates.map(entry=>entry.threadId),
    ["thr_one","thr_two"],
    "admitted calibration did not mark dependent Threads",
  );
  assert.equal(
    coverage.calibrationHistory[0]?.currentVersion,
    2,
    "coverage lost runtime calibration history",
  );
});
