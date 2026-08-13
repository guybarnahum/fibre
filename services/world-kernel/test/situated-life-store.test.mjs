import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import { lifeRelationId, placeEpisodeId } from "../src/situated-life-domain.mjs";
import {
  SituatedLifeConflictError,
  openSituatedLifeInspectionStore,
  openSituatedLifeStore,
} from "../src/situated-life-store.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-situated-life-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); } finally { rmSync(directory, { recursive: true, force: true }); }
}

function seed(databasePath) {
  const world = openWorldStore(databasePath);
  world.seedThread(structuredClone(fixture));
  world.close();
}

function relation(revision = 1) {
  return {
    relationId: lifeRelationId({ child: fixture.threadId, parent: "synthetic_mother" }),
    revision,
    threadId: fixture.threadId,
    relatedParty: {
      partyId: "ancestor.synthetic.mother",
      kind: "synthetic_ancestor",
      displayName: revision === 1 ? "Ji-eun Park" : "Jieun Park",
    },
    relationKind: "biological_parent",
    geneticContributionRole: "parent_genome_source",
    sourceReferences: [revision === 1 ? "evt_lineage_source" : "evt_lineage_correction"],
    validFrom: null,
    validTo: null,
    visibility: "private",
    provenance: revision === 1 ? "genesis_created" : "admin_correction",
    recordedAt: revision === 1 ? "2026-08-13T16:00:00Z" : "2026-08-13T16:01:00Z",
    ...(revision > 1 ? { supersedesRevision: revision - 1 } : {}),
  };
}

function place() {
  return {
    episodeId: placeEpisodeId({ thread: fixture.threadId, place: "seoul" }),
    revision: 1,
    threadId: fixture.threadId,
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

test("situated life persists revision history and survives restart", () =>
  withDatabase((databasePath) => {
    seed(databasePath);
    const store = openSituatedLifeStore(databasePath);
    store.recordLifeRelation(relation(1));
    store.recordLifeRelation(relation(2));
    store.recordPlaceEpisode(place());
    assert.equal(store.lifeRelationHistory(fixture.threadId, relation(1).relationId).length, 2);
    store.close();

    const reopened = openSituatedLifeStore(databasePath);
    assert.equal(reopened.listCurrentLifeRelations(fixture.threadId)[0].revision, 2);
    assert.equal(reopened.listCurrentPlaceEpisodes(fixture.threadId)[0].place.placeId, "place.kr.seoul");
    reopened.close();
  }));

test("read-only inspection is query-only and cannot author situated life", () =>
  withDatabase((databasePath) => {
    seed(databasePath);
    const writer = openSituatedLifeStore(databasePath);
    writer.recordLifeRelation(relation(1));
    writer.recordPlaceEpisode(place());
    writer.close();

    const inspector = openSituatedLifeInspectionStore(databasePath);
    assert.equal(inspector.queryOnly(), true);
    const report = inspector.inspectThread(fixture.threadId);
    assert.equal(report.lifeRelations.length, 1);
    assert.equal(report.placeEpisodes.length, 1);
    assert.throws(() => inspector.recordLifeRelation(relation(1)), SituatedLifeConflictError);
    inspector.close();
  }));
