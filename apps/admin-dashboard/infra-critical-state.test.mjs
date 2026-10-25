import test from "node:test";
import assert from "node:assert/strict";
import {criticalInfrastructureState} from "./infra-critical-state.mjs";

test("confirmed Durable Object exhaustion stops Admin until a valid recovery sample",()=>{
  const sample={sample:{level:"critical",observedAt:"2026-10-25T22:10:00.000Z",
    checks:[{level:"critical",resource:"world",error:{
      code:"DURABLE_OBJECT_ROWS_READ_LIMIT",
      detail:"Exceeded allowed rows read in Durable Objects free tier.",
    }}]}};
  const state=criticalInfrastructureState(sample,Date.parse("2026-10-25T22:10:00.000Z"));
  assert.ok(state,"confirmed fatal quota did not interrupt Admin operations");
  assert.equal(state.code,"DURABLE_OBJECT_ROWS_READ_LIMIT");
  assert.equal(state.resetAt,"2026-10-26T00:00:00.000Z",
    "daily quota showed an invented or local-time reset");
  assert.equal(criticalInfrastructureState({sample:{level:"normal",checks:[]}}),null,
    "restored infrastructure remained blocked");
  assert.equal(criticalInfrastructureState({error:{message:"monitor unavailable"}}),null,
    "unverified monitor failure was presented as known critical state");
});

test("nonquota critical infrastructure has no invented recovery time",()=>{
  const state=criticalInfrastructureState({sample:{level:"critical",checks:[{
    level:"critical",error:{code:"SERVICE_UNAVAILABLE",detail:"World health probe failed"},
  }]}},Date.parse("2026-10-25T22:10:00Z"));
  assert.ok(state);
  assert.equal(state.resetAt,null,"unknown provider failure got a fictional free-tier reset");
  assert.equal(state.reason,"World health probe failed");
});
