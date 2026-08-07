import assert from "node:assert/strict";
import test from "node:test";

import { audienceResponseStatus } from "../src/expression-integrity.mjs";

test("audience response integrity is unknown when no response exists", () => {
  assert.deepEqual(audienceResponseStatus(null), {
    responsePresent: false,
    deliveryNotSent: null,
    performedActionNotRecorded: null,
    completionNotClaimed: null,
    boundedStatusWitnesses: null,
  });
});

test("audience response integrity reports each bounded status witness independently", () => {
  assert.deepEqual(
    audienceResponseStatus({
      deliveryStatus: "not_sent",
      performedActionStatus: "none_recorded",
      completionStatus: "not_claimed",
    }),
    {
      responsePresent: true,
      deliveryNotSent: true,
      performedActionNotRecorded: true,
      completionNotClaimed: true,
      boundedStatusWitnesses: true,
    },
  );

  assert.deepEqual(
    audienceResponseStatus({
      deliveryStatus: "delivered",
      performedActionStatus: "none_recorded",
      completionStatus: "not_claimed",
    }),
    {
      responsePresent: true,
      deliveryNotSent: false,
      performedActionNotRecorded: true,
      completionNotClaimed: true,
      boundedStatusWitnesses: false,
    },
  );
});
