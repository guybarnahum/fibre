import test from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_ACTIVITY_PAGE_SIZE,
  buildAdminActivityPageSql,
  parseAdminActivityPage,
  queryAdminActivityPage,
} from "./activity-page.mjs";

function record(index) {
  const second = String(index).padStart(2, "0");
  return {
    activityVersion:"fibre-runtime-activity-v0.1",
    activityId:`act_${second}`,
    occurredAt:`2026-09-01T14:00:${second}.000Z`,
    recordedAt:`2026-09-01T14:00:${second}.100Z`,
    environment:"staging",
    service:"world-kernel",
    deploymentGitSha:null,
    requestId:"req_1",
    genesisId:null,
    threadId:"thr_1",
    experienceId:null,
    sessionId:null,
    correlationId:"req_1",
    causationId:null,
    stage:"world.publication",
    status:"succeeded",
    attempt:1,
    message:null,
    error:null,
    evidence:{},
  };
}

test("Activity cursor pages 25 meaningful operations without losing causal position", async () => {
  const records = Array.from({ length:ADMIN_ACTIVITY_PAGE_SIZE + 1 }, (_, index) => record(index));
  const env = {
    ACTIVITY_LOG:{
      prepare(){ return { bind(){ return { all:async () => ({ results:records.map((item) => ({ record_json:JSON.stringify(item) })) }) }; } }; },
    },
  };
  const query = { kind:"thread", value:"thr_1", service:null, stage:null, status:null };
  const first = await queryAdminActivityPage(env, "staging", query, { mode:"causal", cursor:null });

  assert.equal(first.records.length, 25);
  assert.ok(first.nextCursor);

  const page = parseAdminActivityPage(new URL(`https://admin/activity?mode=causal&cursor=${first.nextCursor}`));
  const next = buildAdminActivityPageSql({ environment:"staging", query, page });
  assert.match(next.sql, /status <> 'started'/u);
  assert.match(next.sql, /activity_id > \?/u);
  assert.deepEqual(next.bindings.slice(-7), [
    first.records.at(-1).occurredAt,
    first.records.at(-1).occurredAt,
    first.records.at(-1).recordedAt,
    first.records.at(-1).occurredAt,
    first.records.at(-1).recordedAt,
    first.records.at(-1).activityId,
    26,
  ]);
});
