import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import { lifeRelationId, placeEpisodeId } from "../src/situated-life-domain.mjs";
import { openSituatedLifeStore } from "../src/situated-life-store.mjs";
import { SituatedIdentityService } from "../src/situated-identity-service.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));

function withDb(run) {
  const dir = mkdtempSync(join(tmpdir(), "fibre-situated-identity-"));
  const path = join(dir, "world.sqlite");
  try { return run(path); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("cultural formation requires Fibre-resolved lived evidence and remains context-only", () =>
  withDb((databasePath) => {
    const world = openWorldStore(databasePath);
    const seeded = world.seedThread(structuredClone(fixture)).thread;
    world.close();

    const situated = openSituatedLifeStore(databasePath);
    const relationId = lifeRelationId({ child: fixture.threadId, parent: "synthetic_mother" });
    situated.recordLifeRelation({
      relationId, revision: 1, threadId: fixture.threadId,
      relatedParty: { partyId: "ancestor.synthetic.mother", kind: "synthetic_ancestor", displayName: "Ji-eun Park" },
      relationKind: "biological_parent", geneticContributionRole: "parent_genome_source",
      sourceReferences: [seeded.provenance.lastEventId], validFrom: null, validTo: null,
      visibility: "private", provenance: "genesis_created", recordedAt: "2026-08-13T16:00:00Z",
    });
    const episodeId = placeEpisodeId({ thread: fixture.threadId, place: "seoul" });
    situated.recordPlaceEpisode({
      episodeId, revision: 1, threadId: fixture.threadId, episodeKind: "residence",
      place: { placeId: "place.kr.seoul", displayName: "Seoul", countryCode: "KR", region: null, locality: "Seoul", precision: "locality" },
      startAt: "2018-01-01T00:00:00Z", endAt: "2025-01-01T00:00:00Z",
      sourceReferences: [seeded.provenance.lastEventId], visibility: "private", provenance: "genesis_created", recordedAt: "2026-08-13T16:00:00Z",
    });
    situated.close();

    const service = new SituatedIdentityService(databasePath);
    assert.throws(() => service.recordCulturalFormation({
      threadId: fixture.threadId, kind: "household_language",
      claimPredicate: { subject: "self", predicate: "used_language_at_home", object: "Korean" },
      meaning: "Mina used Korean at home during childhood.", eventReferences: ["evt_invented"],
      relationWitnesses: [{ relationId, revision: 1 }], placeWitnesses: [{ episodeId, revision: 1 }],
      recordedAt: "2026-08-13T16:02:00Z",
    }), /does not exist/);

    const stored = service.recordCulturalFormation({
      threadId: fixture.threadId, kind: "household_language",
      claimPredicate: { subject: "self", predicate: "used_language_at_home", object: "Korean" },
      meaning: "Mina used Korean at home during childhood.", eventReferences: [seeded.provenance.lastEventId],
      relationWitnesses: [{ relationId, revision: 1 }], placeWitnesses: [{ episodeId, revision: 1 }],
      recordedAt: "2026-08-13T16:02:00Z",
    });
    assert.equal(stored.assertion.domain, "cultural_formation");
    assert.equal(stored.assertion.behavioralStatus, "context_only");
    assert.equal(stored.registryVersion, "2");
  }));
