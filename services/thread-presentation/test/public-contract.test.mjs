import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PRESENTATION_PROVENANCE_VERSION,
  THREAD_MEDIA_PACKET_VERSION,
  THREAD_PRESENTATION_PACKET_VERSION,
  normalizeThreadPresentationBundle,
  presentationProvenanceDigest,
  threadMediaPacketDigest,
  threadPresentationPacketDigest,
} from "../src/index.mjs";

const fixtureRoot = new URL("../../../fixtures/thread-presentation/can-tho/", import.meta.url);

function load(name) {
  return JSON.parse(readFileSync(new URL(name, fixtureRoot), "utf8"));
}

function bundle() {
  return normalizeThreadPresentationBundle({
    presentation: load("presentation.json"),
    media: load("media.json"),
    provenance: load("provenance.json"),
  });
}

test("Thread Presentation public seam validates a complete Fibre presentation bundle", () => {
  const normalized = bundle();

  assert.equal(normalized.presentation.schemaVersion, THREAD_PRESENTATION_PACKET_VERSION);
  assert.equal(normalized.media.schemaVersion, THREAD_MEDIA_PACKET_VERSION);
  assert.equal(normalized.provenance.schemaVersion, PRESENTATION_PROVENANCE_VERSION);
  assert.equal(normalized.presentation.manifest.threadId, normalized.media.threadId);
  assert.equal(normalized.presentation.manifest.threadId, normalized.provenance.threadId);
});

test("Thread Presentation public seam exposes stable content-addressed packet digests", () => {
  const normalized = bundle();

  assert.match(threadPresentationPacketDigest(normalized.presentation), /^sha256:[0-9a-f]{64}$/u);
  assert.match(threadMediaPacketDigest(normalized.media), /^sha256:[0-9a-f]{64}$/u);
  assert.match(presentationProvenanceDigest(normalized.provenance), /^sha256:[0-9a-f]{64}$/u);
});
