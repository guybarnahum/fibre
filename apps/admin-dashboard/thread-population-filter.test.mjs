import assert from "node:assert/strict";
import test from "node:test";

import {
  populationFilterCount,
  threadMatchesPopulationFilter,
} from "./thread-population-filter.js";

const threads=[
  {threadId:"thr_appearance",health:"migration_required",migrationDomains:["appearance"]},
  {threadId:"thr_identity",health:"migration_required",migrationDomains:["identity"]},
  {threadId:"thr_repair",health:"repairable",migrationDomains:[]},
  {threadId:"thr_healthy",health:"healthy",migrationDomains:[]},
];

test("Threads exposes one authoritative Needs migration filter",()=>{
  assert.equal(populationFilterCount(threads,"migration"),2);
  assert.equal(threadMatchesPopulationFilter(threads[0],"migration"),true);
  assert.equal(threadMatchesPopulationFilter(threads[1],"migration"),true);
  assert.equal(threadMatchesPopulationFilter(threads[2],"migration"),false);
  assert.equal(threadMatchesPopulationFilter(threads[3],"all"),true);
});
