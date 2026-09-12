import test from "node:test";
import assert from "node:assert/strict";

import { buildAdminActivityPageSql, parseAdminActivityPage, queryAdminActivityPage } from "./activity-page.mjs";

function record(n) {
  return {
    activityVersion:"fibre-runtime-activity-v0.1",
    activityId:`act_${n}`,
    occurredAt:`2026-09-01T14:00:${String(n).padStart(2, "0")}.000Z`,
    recordedAt:`2026-09-01T14:00:${String(n).padStart(2, "0")}.100Z`,
    environment:"staging",
    service:"world-kernel",
    deploymentGitSha:"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    requestId:"req_1",
    genesisId:"gen_1",
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

const query = Object.freeze({ kind:"thread", value:"thr_1", service:null, stage:null, status:null, before:null });

test("Activity pages keep causal signal and bounded human page sizes", async () => {
  const page = parseAdminActivityPage(new URL("https://admin/api/activity/page?mode=causal&size=10"));
  const built = buildAdminActivityPageSql({ environment:"staging", query, page });
  assert.match(built.sql, /status <> 'started'/u);
  assert.equal(built.bindings.at(-1), 11);
  assert.throws(() => parseAdminActivityPage(new URL("https://admin/api/activity/page?size=20")), /10, 25, or 50/u);

  const records = Array.from({ length:11 }, (_, index) => record(index + 1));
  const d1 = {
    prepare(sql) {
      return {
        bind() {
          return { all:async () => sql.startsWith("SELECT COUNT")
            ? { results:[{ total:27 }] }
            : { results:records.map((item) => ({ record_json:JSON.stringify(item) })) } };
        },
      };
    },
  };

  const result = await queryAdminActivityPage({ ACTIVITY_LOG:d1 }, "staging", query, page);
  assert.equal(result.records.length, 10);
  assert.equal(result.totalPages, 3);
  assert.equal(result.pageSize, 10);
  assert.ok(result.nextCursor);
  assert.equal(result.prevCursor, null);
});
