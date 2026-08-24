import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { normalizeThreadPresentationBundle } from "../src/index.mjs";

const fixtureRoot = new URL("../../../fixtures/thread-presentation/can-tho/", import.meta.url);

function load(name) {
  return JSON.parse(readFileSync(new URL(name, fixtureRoot), "utf8"));
}

function presentation() {
  return normalizeThreadPresentationBundle({
    presentation: load("presentation.json"),
    media: load("media.json"),
    provenance: load("provenance.json"),
  }).presentation;
}

function words(value) {
  return value.trim().split(/\s+/u).filter(Boolean);
}

function assertSubstantive(label, value) {
  assert.equal(typeof value, "string", `${label} must be text`);
  assert.ok(words(value).length >= 6, `${label} must carry specific narrative content`);
}

test("Thread projection is a situated life rather than a profile card", () => {
  const p = presentation();
  const placeRefs = new Set(p.places.map((place) => place.placeRef));

  assert.ok(p.subject.birthDate, "Thread projection retains temporal origin");
  assert.ok(p.subject.languages.length >= 2, "Thread projection retains lived language context");
  assert.ok(placeRefs.has(p.subject.homePlaceRef), "Thread home resolves to presented world context");
  assertSubstantive("introduction headline", p.introduction.headline);
  assertSubstantive("introduction summary", p.introduction.summary);
  assert.ok(p.origins.length >= 2, "Thread has more than a single origin label");
  assert.ok(p.relationships.length >= 3, "Thread is socially embedded");
  assert.ok(p.life.timeline.length >= 8, "Thread has temporal continuity");
  assert.ok(p.memories.length >= 4, "Thread has selective remembered life");
  assert.ok(p.meanings.length >= 4, "Thread has interpreted remembered life");
});

test("Experience/history projection is specific across time and world context", () => {
  const timeline = presentation().life.timeline;
  const times = timeline.map((event) => Date.parse(event.occurredAt));
  const usedPlaces = new Set(timeline.map((event) => event.placeRef).filter(Boolean));
  const summaries = new Set(timeline.map((event) => event.summary));
  const sourceRefs = new Set(timeline.flatMap((event) => event.sourceReferences));

  assert.ok(Math.max(...times) - Math.min(...times) >= 10 * 365 * 24 * 60 * 60 * 1000, "life spans substantial time");
  assert.ok(usedPlaces.size >= 3, "events are situated in multiple places");
  assert.equal(summaries.size, timeline.length, "events retain distinct texture instead of repeated filler");
  assert.ok(sourceRefs.size >= timeline.length, "events retain differentiated source grounding");
  timeline.forEach((event, index) => {
    assertSubstantive(`timeline[${index}].summary`, event.summary);
    assert.ok(event.sourceReferences.length > 0, `timeline[${index}] is grounded`);
  });
});

test("World/place projection carries distinct situated context used by lived events", () => {
  const p = presentation();
  const places = new Map(p.places.map((place) => [place.placeRef, place]));
  const usedPlaceRefs = new Set(p.life.timeline.map((event) => event.placeRef).filter(Boolean));

  assert.ok(places.size >= 4, "presentation contains a non-trivial lived geography");
  for (const placeRef of usedPlaceRefs) assert.ok(places.has(placeRef), `event place ${placeRef} resolves`);
  for (const [placeRef, place] of places) {
    assertSubstantive(`${placeRef}.summary`, place.summary);
    assert.ok(place.sourceReferences.length > 0, `${placeRef} is grounded in Fibre sources`);
  }
  assert.ok(usedPlaceRefs.size >= 3, "world context participates in life rather than sitting unused");
});

test("Relationship projection is socially differentiated and grounded", () => {
  const relationships = presentation().relationships;
  const labels = new Set(relationships.map((relationship) => relationship.displayLabel));
  const kinds = new Set(relationships.map((relationship) => relationship.relationshipKind).filter(Boolean));
  const summaries = new Set(relationships.map((relationship) => relationship.summary));

  assert.equal(labels.size, relationships.length, "relationships have distinct social identities");
  assert.ok(kinds.size >= 2, "relationships are not an interchangeable generic relation");
  assert.equal(summaries.size, relationships.length, "relationships retain distinct histories");
  relationships.forEach((relationship, index) => {
    assertSubstantive(`relationships[${index}].summary`, relationship.summary);
    assert.ok(relationship.sourceReferences.length > 0, `relationship ${relationship.relationshipRef} is grounded`);
  });
});

test("Memory remains selective history and resolves into Thread-owned meaning", () => {
  const p = presentation();
  const meanings = new Map(p.meanings.map((meaning) => [meaning.meaningRef, meaning]));
  const rememberedEventRefs = new Set(
    p.memories.flatMap((memory) => memory.sourceReferences.filter((ref) => ref.startsWith("epi_"))),
  );

  assert.ok(rememberedEventRefs.size < p.life.timeline.length, "memory does not collapse into a copy of history");
  for (const memory of p.memories) {
    assertSubstantive(`${memory.memoryRef}.rememberedContent`, memory.rememberedContent);
    assert.ok(memory.sourceReferences.length > 0, `${memory.memoryRef} remains evidence-grounded`);
    assert.ok(memory.meaningRefs.length > 0, `${memory.memoryRef} participates in interpretation`);
    memory.meaningRefs.forEach((meaningRef) => assert.ok(meanings.has(meaningRef), `${meaningRef} resolves`));
  }
});

test("Meaning projection is grounded in memory and temporally formed", () => {
  const p = presentation();
  const memories = new Map(p.memories.map((memory) => [memory.memoryRef, memory]));
  const summaries = new Set(p.meanings.map((meaning) => meaning.summary));

  assert.equal(summaries.size, p.meanings.length, "meanings retain non-interchangeable interpretations");
  for (const meaning of p.meanings) {
    assertSubstantive(`${meaning.meaningRef}.summary`, meaning.summary);
    assert.ok(meaning.formedAt, `${meaning.meaningRef} has a formation time`);
    assert.ok(meaning.sourceReferences.length > 0, `${meaning.meaningRef} is grounded`);
    assert.ok(meaning.memoryRefs.length > 0, `${meaning.meaningRef} names remembered experience`);
    meaning.memoryRefs.forEach((memoryRef) => assert.ok(memories.has(memoryRef), `${memoryRef} resolves`));
  }
});
