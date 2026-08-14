import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import { openIdentityStore } from "../src/identity-store.mjs";
import { livedCulturalFormationClaim } from "../src/lived-cultural-formation-authoring.mjs";
import { lifeRelationId } from "../src/situated-life-domain.mjs";
import { openSituatedLifeStore } from "../src/situated-life-store.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));

function withDb(run) {
  const dir = mkdtempSync(join(tmpdir(), "fibre-situated-grounding-"));
  const db = join(dir, "world.sqlite");
  try { return run(db); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("situated-life writer requires a persisted evidence reference", () => withDb((db) => {
  const world = openWorldStore(db);
  world.seedThread(structuredClone(fixture));
  world.close();
  const situated = openSituatedLifeStore(db);
  const relationId = lifeRelationId({ child: fixture.threadId, parent: "synthetic_mother" });
  assert.throws(() => situated.recordLifeRelation({
    relationId,
    revision: 1,
    threadId: fixture.threadId,
    relatedParty: { partyId: "ancestor.synthetic.mother", kind: "synthetic_ancestor", displayName: "Ji-eun Park" },
    relationKind: "biological_parent",
    geneticContributionRole: "parent_genome_source",
    sourceReferences: ["evt_missing_reference"],
    validFrom: null,
    validTo: null,
    visibility: "private",
    provenance: "genesis_created",
    recordedAt: "2026-08-13T16:00:00Z",
  }), /unresolved evidence reference/i);
  assert.deepEqual(situated.listCurrentLifeRelations(fixture.threadId), []);
  situated.close();
}));

test("direct IdentityStore still requires a real lived-event witness", () => withDb((db) => {
  const world = openWorldStore(db);
  world.seedThread(structuredClone(fixture));
  world.close();
  const identity = openIdentityStore(db);
  const candidate = livedCulturalFormationClaim({
    threadId: fixture.threadId,
    kind: "cultural_practice",
    claimPredicate: { subject: "self", predicate: "participated_in_ritual", object: "Seollal" },
    meaning: "Mina participated in Seollal observances during childhood.",
    eventReferences: ["evt_missing_reference"],
    recordedAt: "2026-08-13T16:02:00Z",
  });
  assert.throws(() => identity.recordAssertion(candidate), /resolved Thread-event witness/i);
  identity.close();
}));
