import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { autobiographicalMeaningId } from "../src/autobiographical-meaning-identity.mjs";
import {
  normalizeThreadPresentationBundle,
  presentationProvenanceDigest,
  threadMediaPacketDigest,
  threadPresentationPacketDigest,
} from "../src/thread-presentation-domain.mjs";

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

test("P2 Can Tho golden fixture validates as an unpublished candidate presentation", () => {
  const normalized = bundle();
  assert.equal(normalized.presentation.manifest.threadId, "thr_pr39_g2_04");
  assert.equal(normalized.presentation.manifest.lifecycleStatus, "genesis_candidate");
  assert.equal(normalized.presentation.manifest.fixture, true);
  assert.equal(normalized.presentation.subject.displayName, null);
  assert.equal(normalized.presentation.subject.birthDate, "2004-08-20");
  assert.deepEqual(normalized.presentation.subject.languages, ["Vietnamese", "English"]);
  assert.match(normalized.presentation.introduction.headline, /Cần Thơ/);
  assert.equal(normalized.presentation.life.timeline.length, 10);
  assert.equal(normalized.presentation.memories.length, 6);
  assert.equal(normalized.presentation.meanings.length, 6);
  assert.equal(normalized.media.assets.length, 14);
});

test("P2 Can Tho fixture is self-contained presentation material, not retained Genesis evidence", () => {
  const manifest = load("fixture-manifest.json");
  assert.equal(manifest.source.kind, "historical_fixture_derivation");
  assert.equal(Object.hasOwn(manifest.source, "path"), false);
  assert.equal(Object.hasOwn(manifest.source, "blobSha"), false);
  assert.ok(manifest.scientificIsolation.some((line) => /never published or born/.test(line)));
  assert.ok(manifest.scientificIsolation.some((line) => /not #39 quality evidence/.test(line)));
});

test("P2 preserves historical excess instead of turning every event into memory", () => {
  const normalized = bundle();
  const rememberedEventRefs = new Set(
    normalized.presentation.memories.flatMap((memory) =>
      memory.sourceReferences.filter((ref) => ref.startsWith("epi_"))),
  );
  assert.equal(normalized.presentation.life.timeline.length, 10);
  assert.equal(normalized.presentation.memories.length, 6);
  for (const eventRef of [
    "epi_thr_pr39_g2_04_0001",
    "epi_thr_pr39_g2_04_0002",
    "epi_thr_pr39_g2_04_0003",
  ]) {
    assert.equal(rememberedEventRefs.has(eventRef), false);
  }
});

test("P2 remembered meanings use Fibre stable meaning identity and remain separate from history", () => {
  const normalized = bundle();
  const provenance = new Map(normalized.provenance.entries.map((entry) => [entry.provenanceId, entry]));
  for (const memory of normalized.presentation.memories) {
    assert.deepEqual(memory.meaningRefs, [autobiographicalMeaningId(memory.memoryRef)]);
    assert.equal(provenance.get(memory.provenanceRef).kind, "thread_memory");
  }
  for (const meaning of normalized.presentation.meanings) {
    assert.equal(provenance.get(meaning.provenanceRef).kind, "thread_meaning");
    assert.equal(meaning.meaningRef, autobiographicalMeaningId(meaning.memoryRefs[0]));
  }
  const tomatoMeaning = normalized.presentation.meanings.find((item) => item.title === "Tomatoes and change");
  const sandalMeaning = normalized.presentation.meanings.find((item) => item.title === "Blue or red sandals");
  assert.equal(tomatoMeaning.formedAt, "2022-06-05T09:30:00Z");
  assert.ok(tomatoMeaning.sourceReferences.includes("epi_thr_pr39_g2_04_0010"));
  assert.equal(sandalMeaning.formedAt, "2022-06-05T09:30:00Z");
  assert.ok(sandalMeaning.sourceReferences.includes("epi_thr_pr39_g2_04_0010"));
});

test("P2 media remains empty reconstruction slots rather than evidence", () => {
  const normalized = bundle();
  const provenance = new Map(normalized.provenance.entries.map((entry) => [entry.provenanceId, entry]));
  for (const asset of normalized.media.assets) {
    assert.ok(["placeholder", "pending"].includes(asset.status));
    assert.equal(asset.locator, null);
    assert.equal(asset.generation, null);
    assert.equal(provenance.get(asset.provenanceRef).kind, "generated_reconstruction");
  }
});

test("P2 contains no synthetic live encounter ontology", () => {
  const raw = JSON.stringify(load("presentation.json"));
  for (const forbidden of ["encounter", "dailyPlan", "recentLivedContext", "onMyMind", "currentActivity", "currentLocation"]) {
    assert.equal(raw.includes(`\"${forbidden}\"`), false, `${forbidden} must not enter the Fibre golden packet`);
  }
});

test("P2 fixture manifest pins scientific isolation without retaining development archaeology", () => {
  const manifest = load("fixture-manifest.json");
  assert.equal(manifest.threadId, "thr_pr39_g2_04");
  assert.match(manifest.source.note, /superseded development artifact is intentionally not retained/iu);
  assert.ok(manifest.scientificIsolation.some((line) => /never published or born/.test(line)));
  assert.ok(manifest.scientificIsolation.some((line) => /not #39 quality evidence/.test(line)));
});

test("P2 golden packet digests are stable", () => {
  const normalized = bundle();
  assert.equal(threadPresentationPacketDigest(normalized.presentation), "sha256:a00a3fb8600edc40965135f821609bb0882ed7dac27550ad2ffc76b464522cf7");
  assert.equal(threadMediaPacketDigest(normalized.media), "sha256:39d6516da0c73b2f66ab8533d68b648578d6bd73d003a0becdf836da2252521d");
  assert.equal(presentationProvenanceDigest(normalized.provenance), "sha256:da56742de15a6aa3f79ce29f6000a5899a467d49b18b3b98c1d9d57f47abd37e");
});
