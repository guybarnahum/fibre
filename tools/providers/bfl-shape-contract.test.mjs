import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectBflPollShape,
  inspectBflSubmissionShape,
} from "./bfl-shape-contract.mjs";

test("BFL submission shape inspector exposes structure without response contents", () => {
  assert.deepEqual(inspectBflSubmissionShape({
    status: 200,
    payload: {
      id: "task-secret-ish-identifier",
      polling_url: "https://api.eu.bfl.ai/v1/get_result?id=task-secret-ish-identifier",
      extra: "do-not-copy",
    },
  }), {
    httpStatus: 200,
    payloadKind: "object",
    topLevelKeys: ["extra", "id", "polling_url"],
    idPresent: true,
    idLength: 26,
    pollingUrlPresent: true,
    pollingUrl: {
      protocol: "https:",
      hostname: "api.eu.bfl.ai",
      pathname: "/v1/get_result",
      hasQuery: true,
    },
  });
});

test("BFL poll shape inspector reports terminal delivery structure without leaking URL query", () => {
  assert.deepEqual(inspectBflPollShape({
    status: 200,
    payload: {
      id: "task_1",
      status: "Ready",
      result: {
        sample: "https://delivery.us.bfl.ai/path/image.png?token=secret",
        prompt: "must not be emitted",
      },
    },
  }), {
    httpStatus: 200,
    payloadKind: "object",
    topLevelKeys: ["id", "result", "status"],
    status: "Ready",
    resultKeys: ["prompt", "sample"],
    sampleUrlPresent: true,
    sampleUrl: {
      protocol: "https:",
      hostname: "delivery.us.bfl.ai",
      pathname: "/path/image.png",
      hasQuery: true,
    },
  });
});
