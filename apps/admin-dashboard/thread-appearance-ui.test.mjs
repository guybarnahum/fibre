import assert from "node:assert/strict";
import test from "node:test";

import { threadAppearanceState } from "./thread-appearance-ui.js";

const visualHealthy=[
  {code:"CANONICAL_VISUAL_SPEC",state:"healthy",authority:"embodiment",specificationDigest:"sha256:spec"},
  {code:"CANONICAL_EMBODIMENT",state:"healthy",objectRef:"visual_identity_reference_1"},
];

test("Admin Appearance exposes upgrade, evidence reuse, and rerender as distinct states",()=>{
  const physicalAncestry={
    maternal:[{population:"Chinese family",share:1,referencePopulation:"east_asia"}],
    paternal:[{population:"Chinese family",share:1,referencePopulation:"east_asia"}],
  };
  const outdated=threadAppearanceState({
    findings:[
      {
        code:"PHYSICAL_APPEARANCE_MODEL_OUTDATED",
        state:"migration_required",
        currentVersion:"physical-genome-v0.1",
        targetVersion:"physical-genome-v0.2",
        migration:{
          id:"physical_embodiment_v2",
          label:"Upgrade appearance model",
          evidence:{eventId:"evt_1",physicalAncestry},
          input:{fields:[{name:"reason",required:true}]},
        },
      },
      ...visualHealthy,
    ],
  });

  assert.equal(outdated.canMigrate,true,"outdated appearance model lost upgrade action");
  assert.equal(outdated.canRerender,false,"outdated appearance model exposed rerender instead of upgrade");
  assert.equal(outdated.currentVersion,"physical-genome-v0.1");
  assert.equal(outdated.targetVersion,"physical-genome-v0.2");
  assert.deepEqual(outdated.evidence.physicalAncestry,physicalAncestry,
    "Admin lost durable parental-origin evidence");

  const current=threadAppearanceState({
    findings:[
      {
        code:"PHYSICAL_GENOME",
        state:"healthy",
        version:"physical-genome-v0.2",
        evidence:{eventId:"evt_2",physicalAncestry},
      },
      ...visualHealthy,
    ],
  });

  assert.equal(current.canMigrate,false,"current appearance model still exposed migration");
  assert.equal(current.canRerender,true,"current appearance model did not expose rerender");
  assert.equal(current.currentVersion,"physical-genome-v0.2");
  assert.deepEqual(current.evidence.physicalAncestry,physicalAncestry);
});

test("Admin Appearance requires explicit migration input when no durable ancestry exists",()=>{
  const migration=threadAppearanceState({
    findings:[
      {
        code:"LEGACY_PHYSICAL_EMBODIMENT",
        state:"healthy",
        currentVersion:null,
        targetVersion:"physical-genome-v0.2",
        migration:{
          id:"physical_embodiment_v2",
          label:"Migrate appearance",
          evidence:null,
          input:{fields:[
            {name:"maternalOrigin",kind:"text",required:true},
            {name:"maternalReferencePopulation",kind:"select",required:true},
            {name:"paternalOrigin",kind:"text",required:true},
            {name:"paternalReferencePopulation",kind:"select",required:true},
            {name:"reason",kind:"text",required:true},
          ]},
        },
      },
      ...visualHealthy,
    ],
  });

  assert.equal(migration.canMigrate,true);
  assert.equal(migration.evidence,null,"Admin invented ancestry evidence");
  assert.deepEqual(
    migration.migration.input.fields.map(field=>field.name),
    ["maternalOrigin","maternalReferencePopulation","paternalOrigin","paternalReferencePopulation","reason"],
    "missing ancestry did not require explicit parental-origin input",
  );
});
