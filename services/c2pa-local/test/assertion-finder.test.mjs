import test from "node:test";
import assert from "node:assert/strict";

import {
  activeManifestFromStore,
  describeC2paAssertions,
  findC2paAssertion,
} from "../assertion-finder.mjs";

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

test("C2PA active manifest resolves the reader JSON manifest-store shape", () => {
  const active = {
    assertions: [
      { label: LABEL, kind: "Json", instance: 1, data: assertion },
      { label: "c2pa.actions.v2", kind: "Cbor", data: { actions: [] } },
    ],
  };
  const store = {
    active_manifest: "urn:uuid:fibre-active",
    manifests: {
      "urn:uuid:fibre-active": active,
    },
  };
  assert.equal(activeManifestFromStore(store), active);
  assert.deepEqual(findC2paAssertion(activeManifestFromStore(store), LABEL), assertion);
});

test("C2PA assertion diagnostics report active labels, kinds and instances", () => {
  assert.deepEqual(
    describeC2paAssertions({
      assertions: [
        { label: LABEL, kind: "Json", instance: 2, data: assertion },
        { label: "c2pa.actions.v2", data: { actions: [] } },
      ],
    }),
    [
      `${LABEL}#2 (Json, data=object)`,
      "c2pa.actions.v2 (unknown-kind, data=object)",
    ],
  );
});
