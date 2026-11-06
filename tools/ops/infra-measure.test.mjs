import assert from "node:assert/strict";
import test from "node:test";

import { summarizeCosts } from "./infra-measure.mjs";

test("infrastructure measurement preserves Fibre operation cost and encounter slope", () => {
  const summary = summarizeCosts([
    {
      event:"world-state-cost",
      phase:"meeting",
      source:"world-kernel",
      kind:"request",
      method:"POST",
      path:"/internal/lived-encounter",
      rowsRead:40,
      rowsWritten:8,
      queries:12,
    },
    {
      event:"d1-cost",
      phase:"meeting",
      source:"thread-presentation",
      operation:"activity.record",
      rowsRead:0,
      rowsWritten:1,
    },
    {
      event:"world-state-cost",
      phase:"meeting",
      source:"world-kernel",
      kind:"request",
      method:"POST",
      path:"/internal/lived-encounter",
      rowsRead:42,
      rowsWritten:8,
      queries:12,
    },
    {
      event:"d1-cost",
      phase:"activity",
      source:"admin-dashboard",
      operation:"admin.activity.count",
      rowsRead:18000,
      rowsWritten:0,
    },
  ]);

  assert.deepEqual(summary.encounterRowsRead, [40, 42], "encounter cost history must remain visible");
  assert.equal(summary.encounterSlopeRowsReadPerTurn, 2, "encounter cost growth must remain measurable");

  const operations = new Map(summary.operations.map((row) => [row.operation, row]));
  assert.equal(operations.get("POST /internal/lived-encounter").calls, 2);
  assert.equal(operations.get("POST /internal/lived-encounter").rowsRead, 82);
  assert.equal(operations.get("activity.record").rowsWritten, 1);
  assert.equal(operations.get("admin.activity.count").rowsRead, 18000);
});

test("LivedNow failures are diagnosed without inflating Cloudflare read/write totals",()=>{
  const result=summarizeCosts([
    {event:"world-state-cost",phase:"world-life-wave",source:"world-kernel",
      kind:"request",method:"POST",path:"/internal/lived-now/ensure",
      rowsRead:70,rowsWritten:2,queries:11},
    {event:"lived-now-reconciliation-failed",phase:"world-life-wave",
      source:"world-kernel",threadId:"thr_london",
      code:"LIVED_NOW_RECONCILIATION_FAILED",
      detail:"Planning integration failed",
      diagnostics:{stage:"lived_now.ensure",providerErrorCode:"upstream_timeout"}},
  ]);
  assert.equal(result.operations.length,1,
    "a server error counted as a fictitious database request");
  assert.equal(result.operations[0].rowsRead,70);
  assert.equal(result.reconciliationFailures.length,1,
    "the reason for the failed wave vanished from measurement evidence");
  assert.equal(result.reconciliationFailures[0].diagnostics.stage,"lived_now.ensure");
});

test("model calls are measured per cognitive job without counting as database work",()=>{
  const call=(kind,inputTokens,cachedInputTokens,prefix,story="s1")=>({event:"model-call",port:"encounter",kind,inputTokens,cachedInputTokens,outputTokens:20,scope:"thr_a",prefix,
    parts:{system:"p",schema:"q","input.thread":"t","input.story":story},
    sizes:{system:900,schema:300,"input.thread":2000,"input.story":story==="s1"?400:600},
    innerSizes:{"input.thread.memories":1500}});
  const result=summarizeCosts([
    call("social-live-turn",5000,4096,["a","b","c",null]),call("social-live-turn",5200,0,["a","b","d",null],"s2"),
    call("encounter-attention",2000,0,["e",null,null,null]),
    {event:"live-social-encounter-ended",endedBy:"bounded"},{event:"live-social-encounter-ended",endedBy:"quiescent"},
  ]);
  assert.equal(result.operations.length,0,"a model call counted as a database request");
  assert.deepEqual(result.conversationEndings,{bounded:1,quiescent:1},"how conversations ended was not counted");
  assert.deepEqual(result.modelCalls.map(({kind,calls,cachedInputTokens})=>({kind,calls,cachedInputTokens})),
    [{kind:"social-live-turn",calls:2,cachedInputTokens:4096},{kind:"encounter-attention",calls:1,cachedInputTokens:0}],
    "model cost was not attributable to its cognitive job");
  assert.deepEqual(result.modelCalls[0].sharedPrefixChars,{2048:1,4096:1,8192:0,16384:0},
    "a repeated call could not show how much of its prompt the provider could reuse");
  assert.deepEqual(result.modelCalls[0].firstChangedPart,{"input.story":1},
    "a repeated call could not show which part of its prompt stopped reuse");
  assert.equal(result.modelCalls[0].partChars["input.thread"],4000,
    "the parts that dominate a job's input could not be found");
  assert.equal(result.modelCalls[0].innerChars["input.thread.memories"],3000,
    "what fills a large part could not be found");
});
