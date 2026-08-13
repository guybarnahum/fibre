import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openWorldStore } from "../src/persistence.mjs";
import { lifeRelationId } from "../src/situated-life-domain.mjs";
import { openSituatedLifeInspectionStore, openSituatedLifeStore } from "../src/situated-life-store.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));

test("situated-life read detects coherent row rewrite when independent digest is unchanged", () => {
  const dir = mkdtempSync(join(tmpdir(), "fibre-situated-tamper-")); const db = join(dir, "world.sqlite");
  try {
    const world = openWorldStore(db); world.seedThread(structuredClone(fixture)); world.close();
    const relationId = lifeRelationId({ child: fixture.threadId, parent: "synthetic_mother" });
    const relation = { relationId, revision: 1, threadId: fixture.threadId, relatedParty: { partyId: "ancestor.synthetic.mother", kind: "synthetic_ancestor", displayName: "Ji-eun Park" }, relationKind: "biological_parent", geneticContributionRole: "parent_genome_source", sourceReferences: ["evt_lineage_source"], validFrom: null, validTo: null, visibility: "private", provenance: "genesis_created", recordedAt: "2026-08-13T16:00:00Z" };
    const writer = openSituatedLifeStore(db); writer.recordLifeRelation(relation); writer.close();

    const raw = new DatabaseSync(db); raw.exec("DROP TRIGGER life_relations_no_update");
    const changed = { ...relation, relatedParty: { ...relation.relatedParty, displayName: "Forged Name" } };
    raw.prepare("UPDATE life_relation_records SET record_json=? WHERE relation_id=? AND revision=1").run(JSON.stringify(changed), relationId); raw.close();

    const inspector = openSituatedLifeInspectionStore(db);
    assert.throws(() => inspector.lifeRelationHistory(fixture.threadId, relationId), /canonical JSON|digest mismatch/i);
    inspector.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
