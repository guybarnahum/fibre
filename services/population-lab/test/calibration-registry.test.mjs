import test from "node:test";
import assert from "node:assert/strict";

import {createMemoryInfraDriver} from "#infra/providers/local";
import {referencePopulationBaseCalibration} from "#core/src/human-appearance/index.mjs";
import {createHumanAppearanceCalibrationRegistry} from "../src/calibration-registry.mjs";

function approval({id="middle_east.egypt",version=2,value=.12,base=null}={}){
  const calibration=base??referencePopulationBaseCalibration(id);
  return {
    contract:"fibre-population-lab-calibration-approval-v0.1",
    experimentId:`plexp_${id.replaceAll(".","_")}_v${version}`,
    referencePopulation:id,
    candidate:{objectRef:"candidate",digest:"sha256:candidate"},
    review:{objectRef:"review",digest:"sha256:review"},
    baseCalibration:{
      id:calibration.id,
      version:calibration.version,
      dependencyChain:calibration.dependencyChain,
    },
    admission:{
      id,
      version,
      values:{noseBreadth:value},
      variation:{},
      evidence:{experimentId:"fixture"},
    },
    approvedBy:"fixture.operator",
    approvedAt:`2026-10-0${version}T00:00:00.000Z`,
  };
}

test("appearance calibration registry admits immutable contiguous versions",async()=>{
  const infra=createMemoryInfraDriver();
  const registry=createHumanAppearanceCalibrationRegistry(infra);

  const first=await registry.admit(approval());
  assert.equal(first.current.version,2,"first admission did not become v2");
  assert.equal(first.current.prior.noseBreadth,.12,"admission did not change current prior");

  const v2=(await registry.model()).calibration("middle_east.egypt");
  const second=await registry.admit(approval({version:3,value:.14,base:v2}));
  assert.equal(second.current.version,3,"second admission did not become v3");

  const history=await registry.history();
  assert.equal(history.length,1,"registry history lost calibrated population");
  assert.deepEqual(
    history[0].versions.map(entry=>entry.version),
    [1,2,3],
    "registry history is not append-only",
  );
  assert.equal(history[0].versions[0].prior.noseBreadth,referencePopulationBaseCalibration("middle_east.egypt").prior.noseBreadth,
    "origin baseline was not preserved");
  assert.equal(history[0].versions[1].prior.noseBreadth,.12,"v2 baseline was not preserved");
  assert.equal(history[0].versions[2].prior.noseBreadth,.14,"v3 baseline was not preserved");
});

test("appearance calibration registry rejects stale, skipped, and duplicate admissions",async()=>{
  const registry=createHumanAppearanceCalibrationRegistry(createMemoryInfraDriver());
  const first=approval();
  await registry.admit(first);

  const duplicate=await registry.admit(first);
  assert.equal(duplicate.duplicate,true,"identical admission retry was not idempotent");
  assert.equal(duplicate.current.version,2,"identical admission retry changed current version");

  const current=(await registry.model()).calibration("middle_east.egypt");
  await assert.rejects(
    registry.admit(approval({version:4,value:.16,base:current})),
    /advance exactly one local version/u,
    "skipped calibration version was accepted",
  );

  await assert.rejects(
    registry.admit(approval({version:3,value:.16,base:referencePopulationBaseCalibration("middle_east.egypt")})),
    /base is no longer current/u,
    "stale calibration base was accepted",
  );
});

test("appearance calibration registry has no rollback or delete authority",async()=>{
  const registry=createHumanAppearanceCalibrationRegistry(createMemoryInfraDriver());
  assert.equal("rollback" in registry,false,"registry exposed rollback authority");
  assert.equal("remove" in registry,false,"registry exposed calibration deletion");
});
