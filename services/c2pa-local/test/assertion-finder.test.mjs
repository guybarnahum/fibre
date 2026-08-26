import test from "node:test";
import assert from "node:assert/strict";

import { findC2paAssertion } from "../assertion-finder.mjs";

const LABEL = "com.insidefibre.asset-generation.v1";
const assertion = { provenanceClass: "generated_reconstruction" };

test("C2PA assertion lookup accepts SDK-assigned label suffixes", () => {
  const store = {
    manifests: {
      active: {
        assertions: [
          { label: `${LABEL}__1`, data: JSON.stringify(assertion) },
        ],
      },
    },
  };
  assert.deepEqual(findC2paAssertion(store, LABEL), assertion);
});

test("C2PA assertion lookup still accepts exact keyed assertion objects", () => {
  const store = {
    [LABEL]: { data: assertion },
  };
  assert.deepEqual(findC2paAssertion(store, LABEL), assertion);
});

test("C2PA assertion lookup does not match unrelated labels", () => {
  const store = { assertions: [{ label: "com.example.other", data: assertion }] };
  assert.equal(findC2paAssertion(store, LABEL), null);
});
