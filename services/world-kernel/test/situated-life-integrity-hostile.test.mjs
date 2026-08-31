import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openWorldStore } from "../src/persistence.mjs";
import { canonicalJson } from "../src/persistence-common.mjs";
import { lifeRelationId } from "../src/situated-life-domain.mjs";
import { situatedRecordDigest } from "../src/situated-life-integrity.mjs";
import { openSituatedLifeInspectionStore, openSituatedLifeStore } from "../src/situated-life-store.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));

function seedEvent(database) {
  return database.prepare(
    "SELECT event_id FROM thread_events WHERE thread_id=? AND event_type='THREAD_SEEDED' ORDER BY sequence LIMIT 1",
  ).get(fixture.threadId).event_id;
}

test("situated-life head detects coherent row rewrite even when attacker recomputes the row digest", () => {
  const dir = mkdtempSync(join(tmpdir(), "fibre-situated-tamper-"));
  const db = join(dir, "world.sqlite");
  try {
    const world = openWorldStore(localWorldStateStorage(db));
    world.seedThread(structuredClone(fixture));
    world.close();
    const rawSeed = new DatabaseSync(db, { enableForeignKeyConstraints: true });
    const sourceEvent = seedEvent(rawSeed);
    rawSeed.close();

    const relationId = lifeRelationId({ child: fixture.threadId, parent: "synthetic_mother" });
    const relation = {
      relationId,
      revision: 1,
      threadId: fixture.threadId,
      relatedParty: { partyId: "ancestor.synthetic.mother", kind: "synthetic_ancestor", displayName: "Ji-eun Park" },
      relationKind: "biological_parent",
      geneticContributionRole: "parent_genome_source",
      sourceReferences: [sourceEvent],
      validFrom: null,
      validTo: null,
      visibility: "private",
      provenance: "genesis_created",
      recordedAt: "2026-08-13T16:00:00Z",
    };
    const writer = openSituatedLifeStore(localWorldStateStorage(db));
    writer.recordLifeRelation(relation);
    writer.close();

    const raw = new DatabaseSync(db, { enableForeignKeyConstraints: true });
    raw.exec("DROP TRIGGER life_relations_no_update");
    const changed = {
      ...relation,
      relatedParty: { ...relation.relatedParty, displayName: "FORGED ANCESTOR" },
    };
    const attackerDigest = situatedRecordDigest("life_relation", changed, null);
    raw.prepare(
      "UPDATE life_relation_records SET record_json=?,record_digest=? WHERE relation_id=? AND revision=1",
    ).run(canonicalJson(changed), attackerDigest, relationId);
    raw.close();

    const inspector = openSituatedLifeInspectionStore(localWorldStateStorage(db));
    assert.throws(
      () => inspector.lifeRelationHistory(fixture.threadId, relationId),
      /head mismatch|chained-head integrity/i,
    );
    inspector.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
