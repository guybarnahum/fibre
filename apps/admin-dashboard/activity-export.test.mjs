import assert from "node:assert/strict";
import test from "node:test";

import {
  activityExportParams,
  beginPromisedClipboardWrite,
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


test("Activity export starts the clipboard write before asynchronous export collection settles", async () => {
  let resolveText;
  const textPromise = new Promise((resolve) => { resolveText = resolve; });
  const writes = [];
  class ClipboardItemFixture {
    constructor(parts) { this.parts = parts; }
  }
  class BlobFixture {
    constructor(parts, options) {
      this.parts = parts;
      this.type = options.type;
    }
  }
  const clipboard = {
    write(items) {
      writes.push(items);
      return Promise.all([items[0].parts["text/plain"]]).then(() => undefined);
    },
  };

  const writing = beginPromisedClipboardWrite(textPromise, {
    clipboard,
    ClipboardItemCtor:ClipboardItemFixture,
    BlobCtor:BlobFixture,
  });

  assert.equal(writes.length, 1, "clipboard write waited for export collection and lost user activation");
  resolveText("activity export");
  assert.equal(await writing, true);
  const blob = await writes[0][0].parts["text/plain"];
  assert.deepEqual(blob.parts, ["activity export"]);
  assert.equal(blob.type, "text/plain");
});
