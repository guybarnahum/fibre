import assert from "node:assert/strict";
import test from "node:test";

import { createLivedNowWriteApi } from "../src/lived-now-write-api.mjs";

const THREAD_ID = "thr_lived_now_meet_001";
const SITUATION_ID = "sit_lived_now_meet_001";
const TOKEN = "private-lived-now-token";

function request(body) {
  return new Request("https://world-kernel.internal/internal/lived-now/ensure", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-fibre-private-token": TOKEN,
    },
    body: JSON.stringify(body),
  });
}

test("N4 meeting entry asks World for now and publishes exactly that reconciled situation", async () => {
  const calls = [];
  const situation = {
    threadId: THREAD_ID,
    situationId: SITUATION_ID,
    establishedAt: "2026-09-21T03:30:00Z",
  };
  const present = {
    situationId: SITUATION_ID,
    establishedAt: situation.establishedAt,
    phase: "at_place",
  };
  const api = createLivedNowWriteApi({
    privateToken: TOKEN,
    now: () => situation.establishedAt,
    livedNow: {
      async ensure(input) {
        calls.push(["ensure", structuredClone(input)]);
        return situation;
      },
    },
    publication: {
      async publishCurrentSituation(value) {
        calls.push(["publish", structuredClone(value)]);
        return { situation: value, present, publication: { duplicate: false } };
      },
    },
  });

  const response = await api.fetch(request({ threadId: THREAD_ID }));
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [
    ["ensure", { threadId: THREAD_ID, at: situation.establishedAt }],
    ["publish", situation],
  ], "meeting entry must reconcile World-owned now before publishing");
  assert.deepEqual(await response.json(), {
    ok: true,
    result: {
      threadId: THREAD_ID,
      situationId: SITUATION_ID,
      establishedAt: situation.establishedAt,
      present,
    },
  });
});

test("N4 meeting entry cannot choose the Thread's time or scene", async () => {
  let ensureCalls = 0;
  const api = createLivedNowWriteApi({
    privateToken: TOKEN,
    livedNow: {
      async ensure() {
        ensureCalls += 1;
        throw new Error("should not run");
      },
    },
    publication: {
      async publishCurrentSituation() {
        throw new Error("should not run");
      },
    },
  });

  const response = await api.fetch(request({
    threadId: THREAD_ID,
    at: "2030-01-01T00:00:00Z",
  }));
  assert.equal(response.status, 400);
  assert.equal(ensureCalls, 0);
});


test("N4 LivedNow write API returns a safe reconciliation code on unexpected failure", async () => {
  const api = createLivedNowWriteApi({
    privateToken: TOKEN,
    livedNow: {
      async ensure() {
        const error = new Error("provider details stay private");
        error.code = "MODEL_REQUEST_CONFIGURATION_ERROR";
        throw error;
      },
    },
    publication: {
      async publishCurrentSituation() {
        throw new Error("not reached");
      },
    },
  });

  const response = await api.fetch(request({ threadId: THREAD_ID }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "lived_now_reconciliation_failed",
    code: "MODEL_REQUEST_CONFIGURATION_ERROR",
  });
});


test("N4 LivedNow write API includes safe detail for schema constraint failures", async () => {
  const api = createLivedNowWriteApi({
    privateToken: TOKEN,
    livedNow: {
      async ensure() {
        const error = new Error("OpenAI model output violates Fibre canonical response schema at $.stops[0].activity: string length 0 is below minLength 1");
        error.code = "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR";
        throw error;
      },
    },
    publication: {
      async publishCurrentSituation() {
        throw new Error("not reached");
      },
    },
  });

  const response = await api.fetch(request({ threadId: THREAD_ID }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "lived_now_reconciliation_failed",
    code: "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR",
    detail: "OpenAI model output violates Fibre canonical response schema at $.stops[0].activity: string length 0 is below minLength 1",
  });
});
