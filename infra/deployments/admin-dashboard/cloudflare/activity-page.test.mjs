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
const records = Array.from({ length:27 }, (_, index) => record(index + 1));
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

test("raw Activity remains cursor-paged", async () => {
  const page = parseAdminActivityPage(new URL("https://admin/api/activity/page?mode=raw&kind=thread&size=10"));
  const built = buildAdminActivityPageSql({ environment:"staging", query, page });
  assert.equal(page.size, 25);
  assert.equal(page.edge, "first");
  assert.equal(built.bindings.at(-1), 26);
  assert.throws(
    () => parseAdminActivityPage(new URL("https://admin/api/activity/page?direction=prev")),
    /requires a cursor/u,
  );

  const result = await queryAdminActivityPage({ ACTIVITY_LOG:d1 }, "staging", query, page);
  assert.equal(result.records.length, 25);
  assert.equal(result.totalPages, 2);
  assert.equal(result.pageSize, 25);
  assert.ok(result.nextCursor);
  assert.equal(result.prevCursor, null);
});

test("scoped causal Activity keeps one operational chain intact", async () => {
  const page = parseAdminActivityPage(new URL("https://admin/api/activity/page?mode=causal&kind=thread&value=thr_1"));
  const built = buildAdminActivityPageSql({ environment:"staging", query, page });
  assert.equal(page.size, 1000);
  assert.match(built.sql, /status <> 'started'/u);
  assert.match(built.sql, /stage NOT LIKE '%\.provider_commit'/u);
  assert.equal(built.bindings.at(-1), 1001);

  const result = await queryAdminActivityPage({ ACTIVITY_LOG:d1 }, "staging", query, page);
  assert.equal(result.records.length, 27);
  assert.equal(result.totalPages, 1);
  assert.equal(result.pageSize, 1000);
  assert.equal(result.nextCursor, null);
  assert.equal(result.prevCursor, null);
});

test("Activity paging can jump directly to the exact last raw page", async () => {
  const page = parseAdminActivityPage(new URL("https://admin/api/activity/page?mode=raw&kind=thread&edge=last"));
  const built = buildAdminActivityPageSql({ environment:"staging", query, page });
  assert.equal(page.edge, "last");
  assert.equal(built.reverse, true);
  assert.throws(
    () => parseAdminActivityPage(new URL("https://admin/api/activity/page?edge=last&cursor=abc")),
    /does not accept a cursor/u,
  );

  const result = await queryAdminActivityPage({ ACTIVITY_LOG:d1 }, "staging", query, page);
  assert.equal(result.records.length, 2);
  assert.equal(result.totalPages, 2);
  assert.ok(result.prevCursor);
  assert.equal(result.nextCursor, null);
});

test("background Activity refresh skips the full count scan", async () => {
  const calls = [];
  const database = {
    prepare(sql) {
      calls.push(sql);
      return {
        bind() {
          return {
            async all() {
              return {
                results:records.slice(0, 26).map((item) => ({
                  activity_id:item.activityId,
                  occurred_at:item.occurredAt,
                  recorded_at:item.recordedAt,
                  record_json:JSON.stringify(item),
                })),
              };
            },
          };
        },
      };
    },
  };

  const page = parseAdminActivityPage(new URL(
    "https://admin/api/activity/page?mode=raw&kind=thread&value=thr_1&count=0",
  ));
  const result = await queryAdminActivityPage({ ACTIVITY_LOG:database }, "staging", query, page);

  assert.equal(page.includeTotal,false,"background refresh unexpectedly requested an exact total");
  assert.equal(calls.length,1,"background refresh performed an avoidable second D1 query");
  assert.equal(calls.some((sql)=>sql.startsWith("SELECT COUNT")),false,"background refresh scanned Activity for COUNT(*)");
  assert.equal(result.total,null);
  assert.equal(result.records.length,25);
});


test("live Activity delta starts strictly after the current head", async () => {
  const first = await queryAdminActivityPage(
    { ACTIVITY_LOG:d1 },
    "staging",
    query,
    parseAdminActivityPage(new URL("https://admin/api/activity/page?mode=raw&kind=thread&value=thr_1")),
  );
  assert.ok(first.headCursor,"initial Activity page did not expose a durable head cursor");

  const delta = parseAdminActivityPage(new URL(
    `https://admin/api/activity/page?mode=raw&kind=recent&count=0&after=${encodeURIComponent(first.headCursor)}`,
  ));
  const built = buildAdminActivityPageSql({
    environment:"staging",
    query:{ ...query, kind:"recent", value:null },
    page:delta,
  });

  assert.equal(delta.includeTotal,false,"delta refresh requested a historical count");
  assert.match(
    built.sql,
    /occurred_at > \?/u,
    "delta refresh did not constrain Activity to facts newer than the current head",
  );
  assert.throws(
    () => parseAdminActivityPage(new URL(
      `https://admin/api/activity/page?mode=raw&kind=recent&direction=prev&after=${encodeURIComponent(first.headCursor)}`,
    )),
    /first forward page/u,
    "delta cursor was allowed to change historical paging semantics",
  );
});
