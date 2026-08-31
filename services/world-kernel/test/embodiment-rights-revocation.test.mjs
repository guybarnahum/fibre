import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import { embodimentId, embodimentSpecificationDigest } from "../src/embodiment-domain.mjs";
import { embodimentRightsAuthorityId } from "../src/embodiment-rights-domain.mjs";
import { embodimentRightsRevocationId } from "../src/embodiment-rights-revocation.mjs";
import { openEmbodimentRightsRevocationStore } from "../src/embodiment-rights-revocation-store.mjs";
import { openEmbodimentStore } from "../src/embodiment-store.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));

function spec() {
  return {
    subject: {
      partyId: "human_mina_source",
      description: "Mina as the consenting human source whose likeness grounds this representation.",
    },
    method: "source-derived",
    description: "A source-derived portrait rendering of the depicted person.",
    model: "replaceable-renderer",
  };
}

function portrait(revision, eventRef, authorityId) {
  const specification = spec();
  return {
    embodimentId: embodimentId({ threadId: fixture.threadId, kind: "portrait", lineage: "revocable-human" }),
    revision,
    threadId: fixture.threadId,
    kind: "portrait",
    representationKind: "human_source_derivative",
    truthStatus: "source_derivative_not_historical_evidence",
    rightsBasis: "explicit_consent",
    permissionReferences: [authorityId],
    sourceReferences: [eventRef],
    specification,
    specificationDigest: embodimentSpecificationDigest(specification),
    respecification: null,
    status: "pending_generation",
    unavailableReason: null,
    asset: null,
    visibility: "private",
    recordedAt: revision === 1 ? "2026-08-13T16:01:00Z" : "2026-08-13T16:03:00Z",
    ...(revision > 1 ? { supersedesRevision: revision - 1 } : {}),
  };
}

test("human consent can end future embodiment use without erasing historical provenance", () => {
  const dir = mkdtempSync(join(tmpdir(), "fibre-emb-revoke-"));
  const databasePath = join(dir, "world.sqlite");
  try {
    const world = openWorldStore(localWorldStateStorage(databasePath));
    const seeded = world.seedThread(structuredClone(fixture)).thread;
    world.close();
    const eventRef = seeded.provenance.lastEventId;

    const store = openEmbodimentStore(localWorldStateStorage(databasePath));
    const authority = {
      authorityId: embodimentRightsAuthorityId({ threadId: fixture.threadId, source: "human_mina_source", scope: "portrait-private" }),
      threadId: fixture.threadId,
      authorityKind: "explicit_consent",
      sourcePartyId: "human_mina_source",
      permittedKinds: ["portrait"],
      maxVisibility: "private",
      evidenceReferences: [eventRef],
      recordedAt: "2026-08-13T16:00:00Z",
    };
    store.recordRightsAuthority(authority);
    const first = store.record(portrait(1, eventRef, authority.authorityId));
    store.close();

    const revocations = openEmbodimentRightsRevocationStore(localWorldStateStorage(databasePath));
    revocations.record({
      revocationId: embodimentRightsRevocationId({ authorityId: authority.authorityId, recordedAt: "2026-08-13T16:02:00Z" }),
      threadId: fixture.threadId,
      authorityId: authority.authorityId,
      reason: "The human source revoked permission for future likeness use.",
      evidenceReferences: [eventRef],
      recordedAt: "2026-08-13T16:02:00Z",
    });
    revocations.close();

    const reopened = openEmbodimentStore(localWorldStateStorage(databasePath));
    assert.equal(reopened.history(fixture.threadId, first.embodimentId).length, 1);
    assert.equal(reopened.history(fixture.threadId, first.embodimentId)[0].permissionReferences[0], authority.authorityId);
    assert.throws(
      () => reopened.record(portrait(2, eventRef, authority.authorityId)),
      /no longer available for new representation|revoked|consent authority/,
    );
    reopened.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
