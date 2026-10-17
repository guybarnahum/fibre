import test from "node:test";
import assert from "node:assert/strict";
import { threadLifeStatus } from "./thread-life-status.mjs";

test("Thread life continuity follows plan coverage and the durable wake, not model activity",()=>{
  const at=Date.parse("2026-10-17T14:15:00Z");
  const currentAt="2026-09-25T19:23:20Z";
  const expired="2026-09-26T07:16:21Z";
  const next="2026-10-18T02:07:48Z";

  assert.equal(threadLifeStatus({
    currentAt,planHorizonEnd:expired,nextAutonomousBoundary:null,
  },at),"dormant","expired life without a wake must not appear active");

  assert.equal(threadLifeStatus({
    currentAt:"2026-10-17T14:07:48Z",planHorizonEnd:next,
    nextAutonomousBoundary:{dueAt:"2026-10-17T15:00:00Z",blockedReason:null},
  },at),"continuing","an unexpired, armed plan is continuing even without active compute");

  assert.equal(threadLifeStatus({
    currentAt,planHorizonEnd:next,nextAutonomousBoundary:null,
  },at),"unarmed","a recent plan does not establish autonomous scheduling");

  assert.equal(threadLifeStatus({
    currentAt,planHorizonEnd:next,
    nextAutonomousBoundary:{dueAt:null,blockedReason:"coverage unresolved"},
  },at),"blocked","a blocked frontier must be visible");

  assert.equal(threadLifeStatus({
    currentAt,planHorizonEnd:next,
    nextAutonomousBoundary:{dueAt:"2026-10-17T14:00:00Z",blockedReason:null},
  },at),"overdue","an unfulfilled wake must not appear healthy");
});
