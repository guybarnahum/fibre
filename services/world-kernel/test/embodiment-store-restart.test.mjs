import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openWorldStore } from "../src/persistence.mjs";
import { embodimentId, embodimentSpecificationDigest } from "../src/embodiment-domain.mjs";
import { openEmbodimentStore } from "../src/embodiment-store.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));

function record(revision, status = "pending_generation") {
  const specification = { method: "generated", description: "Neutral portrait of Mina", model: "replaceable-renderer" };
  return {
    embodimentId: embodimentId({ threadId: fixture.threadId, kind: "portrait", lineage: "primary" }),
    revision, threadId: fixture.threadId, kind: "portrait",
    representationKind: "synthetic_generation",
    truthStatus: "synthetic_representation_not_historical_evidence",
    rightsBasis: "generated_no_human_source", permissionReferences: [], sourceReferences: ["ias_identity_source"],
    specification, specificationDigest: embodimentSpecificationDigest(specification),
    status, unavailableReason: null,
    asset: status === "available" ? { assetRef: "cache://portrait/mina/v2", sha256: `sha256:${"a".repeat(64)}`, mediaType: "image/png", width: 1024, height: 1024, durationMs: null } : null,
    visibility: "private", recordedAt: revision === 1 ? "2026-08-13T16:00:00Z" : "2026-08-13T16:01:00Z",
    ...(revision > 1 ? { supersedesRevision: revision - 1 } : {}),
  };
}

test("embodiment lineage survives restart and preserves synthetic truth", () => {
  const dir = mkdtempSync(join(tmpdir(), "fibre-emb-")); const db = join(dir, "world.sqlite");
  try {
    const world = openWorldStore(db); world.seedThread(structuredClone(fixture)); world.close();
    const store = openEmbodimentStore(db); store.record(record(1)); store.record(record(2, "available")); store.close();
    const reopened = openEmbodimentStore(db); const history = reopened.history(fixture.threadId, record(1).embodimentId);
    assert.equal(history.length, 2); assert.equal(history.at(-1).status, "available");
    assert.equal(history.at(-1).truthStatus, "synthetic_representation_not_historical_evidence"); reopened.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
