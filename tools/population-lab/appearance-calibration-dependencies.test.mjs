import assert from "node:assert/strict";
import test from "node:test";

import {
  appearanceCalibrationDependencies,
  planAppearanceCalibrationMigration,
} from "../../core/src/population-context/appearance-calibration-dependencies.mjs";

function dep({side,populationId,population,share=1,resolved,chain}) {
  return {
    side,
    populationId,
    population,
    share,
    requestedReferencePopulation:resolved,
    resolvedReferencePopulation:resolved,
    dependencyChain:chain,
  };
}

test("Moroccan ancestry resolves through the named versioned calibration node", () => {
  const dependencies = appearanceCalibrationDependencies({
    maternal:[{
      populationId:"morocco",
      population:"Moroccan family",
      share:1,
      referencePopulation:"afr_north",
    }],
    paternal:[{
      populationId:"morocco",
      population:"Moroccan family",
      share:1,
      referencePopulation:"afr_north",
    }],
  });

  assert.equal(dependencies[0].resolvedReferencePopulation, "afr_north.morocco");
  assert.deepEqual(
    dependencies[0].dependencyChain.map(({id,version}) => [id,version]),
    [["west_asia",1],["afr_north",1],["afr_north.morocco",1]],
  );
});

test("calibration migration jumps directly from stored version to current version", () => {
  const stored = [
    dep({
      side:"maternal",
      populationId:"morocco",
      population:"Moroccan family",
      resolved:"afr_north.morocco",
      chain:[
        {id:"west_asia",version:1},
        {id:"afr_north",version:1},
        {id:"afr_north.morocco",version:1},
      ],
    }),
  ];
  const current = [
    dep({
      side:"maternal",
      populationId:"morocco",
      population:"Moroccan family",
      resolved:"afr_north.morocco",
      chain:[
        {id:"west_asia",version:1},
        {id:"afr_north",version:1},
        {id:"afr_north.morocco",version:3},
      ],
    }),
  ];

  const plan = planAppearanceCalibrationMigration({
    storedDependencies:stored,
    currentDependencies:current,
  });

  assert.equal(plan.migrationRequired, true);
  assert.deepEqual(
    plan.changes[0].from.dependencyChain.at(-1),
    {id:"afr_north.morocco",version:1},
  );
  assert.deepEqual(
    plan.changes[0].to.dependencyChain.at(-1),
    {id:"afr_north.morocco",version:3},
  );
  assert.equal(plan.changes.some((change) => JSON.stringify(change).includes('"version":2')), false,
    "planner introduced an intermediate calibration migration");
});

test("Moroccan refinement does not migrate Korean dependencies", () => {
  const korean = [
    dep({
      side:"maternal",
      populationId:"korea",
      population:"Korean family",
      resolved:"east_asia.korean",
      chain:[
        {id:"east_asia",version:1},
        {id:"east_asia.korean",version:1},
      ],
    }),
  ];

  const plan = planAppearanceCalibrationMigration({
    storedDependencies:korean,
    currentDependencies:structuredClone(korean),
  });

  assert.equal(plan.migrationRequired, false);
  assert.deepEqual(plan.changes, []);
});
