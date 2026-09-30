import assert from "node:assert/strict";
import test from "node:test";

import {
  populationFilterCount,
  threadHasMigrationDomain,
  threadMatchesPopulationFilter,
} from "./thread-population-filter.js";

const threads=[
  {threadId:"thr_appearance",health:"migration_required",migrationDomains:["appearance"]},
  {threadId:"thr_identity",health:"migration_required",migrationDomains:["identity"]},
  {threadId:"thr_repair",health:"repairable",migrationDomains:[]},
  {threadId:"thr_healthy",health:"healthy",migrationDomains:[]},
];

test("Threads migration filters reflect authoritative health and migration domains",()=>{
  assert.equal(populationFilterCount(threads,"migration"),2);
  assert.equal(populationFilterCount(threads,"appearance"),1);
  assert.equal(populationFilterCount(threads,"identity"),1);
  assert.equal(threadMatchesPopulationFilter(threads[0],"migration"),true);
  assert.equal(threadMatchesPopulationFilter(threads[2],"migration"),false);
  assert.equal(threadHasMigrationDomain(threads[0],"appearance"),true);
  assert.equal(threadHasMigrationDomain(threads[1],"appearance"),false);
});
