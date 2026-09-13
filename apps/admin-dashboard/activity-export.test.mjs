import assert from "node:assert/strict";
import test from "node:test";

import {
  activityExportParams,
  collectAllActivityPages,
} from "./activity-export.js";

test("Activity export preserves the displayed filters and walks every cursor page", async () => {
  const search = "?kind=thread&value=thr_export_001&service=birth-center&status=failed&mode=raw&edge=last&direction=prev&cursor=stale";
  const fixed = activityExportParams(search, "causal");
  assert.deepEqual(Object.fromEntries(fixed), {
    kind: "thread",
    value: "thr_export_001",
    service: "birth-center",
    status: "failed",
    mode: "causal",
  });

  const pages = new Map([
    [null, {
      environment: "staging",
      query: { kind: "thread", value: "thr_export_001", service: "birth-center", status: "failed" },
      mode: "causal",
      pageSize: 2,
      totalPages: 3,
      total: 5,
      records: [{ activityId: "act_1" }, { activityId: "act_2" }],
      nextCursor: "cursor_2",
    }],
    ["cursor_2", {
      records: [{ activityId: "act_3" }, { activityId: "act_4" }],
      nextCursor: "cursor_3",
    }],
    ["cursor_3", {
      records: [{ activityId: "act_5" }],
      nextCursor: null,
    }],
  ]);
  const calls = [];
  const result = await collectAllActivityPages({
    search,
    displayedMode: "causal",
    async fetchPageFn(params) {
      calls.push(Object.fromEntries(params));
      return pages.get(params.get("cursor"));
    },
  });

  assert.deepEqual(result.records.map((record) => record.activityId), ["act_1", "act_2", "act_3", "act_4", "act_5"]);
  assert.equal(result.pagesFetched, 3);
  assert.equal(result.first.total, 5);
  assert.deepEqual(calls, [
    {
      kind: "thread", value: "thr_export_001", service: "birth-center", status: "failed", mode: "causal",
      edge: "first", direction: "next",
    },
    {
      kind: "thread", value: "thr_export_001", service: "birth-center", status: "failed", mode: "causal",
      edge: "first", direction: "next", cursor: "cursor_2",
    },
    {
      kind: "thread", value: "thr_export_001", service: "birth-center", status: "failed", mode: "causal",
      edge: "first", direction: "next", cursor: "cursor_3",
    },
  ]);
});
