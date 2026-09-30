import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { resolveBirthPhysicalInheritance } from "#core/src/human-phenotype/index.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { ThreadPhysicalGenomeMigrationStore } from "../src/thread-physical-genome-migration-store.mjs";
import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";

const fixture=JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8"),
);

function withWorld(run){
  const directory=mkdtempSync(join(tmpdir(),"fibre-physical-genome-migration-"));
  const storage=localWorldStateStorage(join(directory,"world.sqlite"));
  const world=openWorldStore(storage);
  const migration=new ThreadPhysicalGenomeMigrationStore(storage);
  try{return run({world,migration})}
  finally{
    migration.close();
    world.close();
    rmSync(directory,{recursive:true,force:true});
  }
}

test("legacy physical embodiment becomes one durable inherited genome without rewriting identity",()=>{
  withWorld(({world,migration})=>{
    const source=structuredClone(fixture);
    delete source.genome.physical;
    source.identity.sex="female";
    const seeded=world.seedThread(source).thread;
    const physicalAncestry={
      maternal:[{population:"operator-confirmed Sichuan Chinese family",share:1,referencePopulation:"east_asia"}],
      paternal:[{population:"operator-confirmed Sichuan Chinese family",share:1,referencePopulation:"east_asia"}],
    };
    const request={
      physicalAncestry,
      operationKey:"legacy_physical_mina_001",
      changedAt:"2026-09-27T18:00:00.000Z",
    };

    const first=migration.migrate(seeded,request);
    assert.equal(first.migrated,true);
    assert.equal(first.thread.genome.physical.version,"physical-genome-v0.3");
    assert.deepEqual(first.thread.identity,seeded.identity,"embodiment migration rewrote Thread identity");
    assert.deepEqual(world.replayThread(seeded.threadId),world.getThread(seeded.threadId),
      "physical embodiment migration did not survive World replay");

    const event=world.listEvents(seeded.threadId).at(-1);
    assert.equal(event.eventType,"THREAD_PHYSICAL_GENOME_MIGRATED");
    assert.equal(event.payloadSchemaVersion,3);
    assert.deepEqual(event.payload.physicalAncestry,physicalAncestry);
    assert.deepEqual(
      event.payload.calibrationDependencies.map((entry)=>({
        side:entry.side,
        resolvedReferencePopulation:entry.resolvedReferencePopulation,
        chain:entry.dependencyChain.map(({id,version})=>`${id}@${version}`),
      })),
      [
        {side:"maternal",resolvedReferencePopulation:"east_asia",chain:["east_asia@1"]},
        {side:"paternal",resolvedReferencePopulation:"east_asia",chain:["east_asia@1"]},
      ],
      "physical migration did not snapshot the appearance calibration it consumed",
    );
    assert.equal(event.payload.previousCalibrationDependencies,null);
    assert.equal(event.provenance.source,"operator_confirmed_physical_ancestry");
    assert.equal(event.provenance.notThreadLifeEvent,true);

    const evidence=migration.latestEvidence(seeded.threadId);
    assert.equal(evidence.eventId,first.eventId);
    assert.deepEqual(evidence.physicalAncestry,physicalAncestry);
    assert.equal(evidence.physicalGenomeVersion,"physical-genome-v0.3");
    assert.equal(evidence.previousPhysicalGenomeVersion,null);
    assert.deepEqual(evidence.calibrationDependencies,event.payload.calibrationDependencies);

    const retry=migration.migrate(world.getThread(seeded.threadId),request);
    assert.equal(retry.reused,true);
    assert.equal(retry.eventId,first.eventId);
    assert.equal(world.listEvents(seeded.threadId).filter(entry=>entry.eventType==="THREAD_PHYSICAL_GENOME_MIGRATED").length,1);

    assert.throws(
      ()=>migration.migrate(world.getThread(seeded.threadId),{
        ...request,
        operationKey:"legacy_physical_mina_002",
      }),
      /physical genome already uses the current appearance model/u,
    );
  });
});


test("outdated physical appearance model upgrades in place with previous version evidence",()=>{
  withWorld(({world,migration})=>{
    const source=structuredClone(fixture);
    source.identity.sex="female";
    const physicalAncestry={
      maternal:[{population:"operator-confirmed Chinese family",share:1,referencePopulation:"east_asia.han_chinese"}],
      paternal:[{population:"operator-confirmed Chinese family",share:1,referencePopulation:"east_asia.han_chinese"}],
    };
    source.genome.physical=resolveBirthPhysicalInheritance({
      maternalAncestry:physicalAncestry.maternal,
      paternalAncestry:physicalAncestry.paternal,
      seed:"old-appearance-model-store-test",
    }).genome;
    source.genome.physical.version="physical-genome-v0.1";
    const seeded=world.seedThread(source).thread;

    const result=migration.migrate(seeded,{
      physicalAncestry,
      operationKey:"physical_model_upgrade_mina_001",
      changedAt:"2026-09-28T02:00:00.000Z",
    });

    assert.equal(result.migrated,true);
    assert.equal(result.thread.genome.physical.version,"physical-genome-v0.3");
    const event=world.listEvents(seeded.threadId).at(-1);
    assert.equal(event.eventType,"THREAD_PHYSICAL_GENOME_MIGRATED");
    assert.equal(event.payload.previousPhysicalGenomeVersion,"physical-genome-v0.1");
    assert.equal(event.payload.physicalGenome.version,"physical-genome-v0.3");
    assert.deepEqual(event.payload.physicalAncestry,physicalAncestry);
  });
});
