import assert from "node:assert/strict";
import test from "node:test";

import {
  lifeRelationId,
  normalizeLifeRelation,
  normalizePlaceEpisode,
  placeEpisodeId,
} from "../src/situated-life-domain.mjs";

function parent(overrides = {}) {
  return {
    relationId: overrides.relationId ?? lifeRelationId({ child: "thread_mina", parent: "synthetic_mother" }),
    revision: 1,
    threadId: "thread_mina",
    relatedParty: {
      partyId: "ancestor.synthetic.mother",
      kind: "synthetic_ancestor",
      displayName: "Ji-eun Park",
    },
    relationKind: overrides.relationKind ?? "biological_parent",
    geneticContributionRole: overrides.geneticContributionRole ?? "parent_genome_source",
    sourceReferences: ["evt_lineage_source"],
    validFrom: null,
    validTo: null,
    visibility: "private",
    provenance: "genesis_created",
    recordedAt: "2026-08-13T16:00:00Z",
  };
}

function residence() {
  return {
    episodeId: placeEpisodeId({ thread: "thread_mina", place: "seoul" }),
    revision: 1,
    threadId: "thread_mina",
    episodeKind: "residence",
    place: {
      placeId: "place.kr.seoul",
      displayName: "Seoul",
      countryCode: "KR",
      region: null,
      locality: "Seoul",
      precision: "locality",
    },
    startAt: "2018-01-01T00:00:00Z",
    endAt: "2025-01-01T00:00:00Z",
    sourceReferences: ["evt_geography_source"],
    visibility: "private",
    provenance: "genesis_created",
    recordedAt: "2026-08-13T16:00:00Z",
  };
}

test("synthetic ancestors can carry parent-genome eligibility without being Threads", () => {
  const relation = normalizeLifeRelation(parent());
  assert.equal(relation.relatedParty.kind, "synthetic_ancestor");
  assert.equal(relation.geneticContributionRole, "parent_genome_source");
  assert.throws(
    () => normalizeLifeRelation(parent({ relationKind: "social_parent" })),
    /only a biological_parent relation may be a parent_genome_source/,
  );
});

test("place facts remain separate from lived place meaning", () => {
  const episode = normalizePlaceEpisode(residence());
  assert.equal(episode.place.displayName, "Seoul");
  assert.equal("meaning" in episode, false);
  assert.throws(
    () => normalizePlaceEpisode({ ...residence(), meaning: "Seoul made her observant." }),
    /meaning is not allowed/,
  );
});
