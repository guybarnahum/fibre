import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import {
  embodimentId,
  embodimentSpecificationDigest,
  normalizeEmbodimentRepresentation,
} from "../src/embodiment-domain.mjs";
import { embodimentRightsAuthorityId } from "../src/embodiment-rights-domain.mjs";
import {
  EmbodimentConflictError,
  openEmbodimentStore,
} from "../src/embodiment-store-personhood.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));

function withDb(run) {
  const dir = mkdtempSync(join(tmpdir(), "fibre-emb-personhood-"));
  const databasePath = join(dir, "world.sqlite");
  try {
    const world = openWorldStore(databasePath);
    const seeded = world.seedThread(structuredClone(fixture)).thread;
    world.close();
    return run(databasePath, seeded.provenance.lastEventId);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function specification(description = "A source-derived portrait representation of Mina.") {
  return { method: "source-derived", description, model: "replaceable-renderer" };
}

function rights(threadId, eventRef, maxVisibility, suffix, sourcePartyId = "human_mina_source") {
  const candidate = {
    authorityId: embodimentRightsAuthorityId({ threadId, maxVisibility, suffix, sourcePartyId }),
    threadId,
    authorityKind: "explicit_consent",
    sourcePartyId,
    permittedKinds: ["portrait"],
    maxVisibility,
    evidenceReferences: [eventRef],
    recordedAt: "2026-08-13T16:00:00Z",
  };
  return candidate;
}

function humanPortrait({ revision, eventRef, permissionReferences, visibility = "private", description }) {
  const spec = specification(description);
  return {
    embodimentId: embodimentId({ threadId: fixture.threadId, kind: "portrait", lineage: "human-primary" }),
    revision,
    threadId: fixture.threadId,
    kind: "portrait",
    representationKind: "human_source_derivative",
    truthStatus: "source_derivative_not_historical_evidence",
    rightsBasis: "explicit_consent",
    permissionReferences,
    sourceReferences: [eventRef],
    specification: spec,
    specificationDigest: embodimentSpecificationDigest(spec),
    status: "pending_generation",
    unavailableReason: null,
    asset: null,
    visibility,
    recordedAt: revision === 1 ? "2026-08-13T16:01:00Z" : "2026-08-13T16:02:00Z",
    ...(revision > 1 ? { supersedesRevision: revision - 1 } : {}),
  };
}

test("an asset cannot substitute for a meaningful embodiment specification", () => {
  assert.throws(() => normalizeEmbodimentRepresentation({
    ...humanPortrait({ revision: 1, eventRef: "evt_source", permissionReferences: ["era_authority"] }),
    specification: {},
    specificationDigest: embodimentSpecificationDigest({}),
  }), /specification must describe the representation/);
});

test("embodiment source and consent are durable Thread-scoped authority, not labels", () => withDb((databasePath, eventRef) => {
  const store = openEmbodimentStore(databasePath);
  const fakeAuthority = rights(fixture.threadId, "evt_not_real", "private", "fake");
  assert.throws(() => store.recordRightsAuthority(fakeAuthority), /not durable evidence/);

  const authority = store.recordRightsAuthority(rights(fixture.threadId, eventRef, "private", "private"));
  assert.throws(() => store.record(humanPortrait({
    revision: 1,
    eventRef: "evt_not_real",
    permissionReferences: [authority.authorityId],
  })), /not durable evidence/);

  const stored = store.record(humanPortrait({
    revision: 1,
    eventRef,
    permissionReferences: [authority.authorityId],
  }));
  assert.equal(stored.rightsBasis, "explicit_consent");
  assert.equal(store.history(fixture.threadId, stored.embodimentId).length, 1);
  store.close();
}));

test("human-derived embodiment accumulates permission and needs fresh authority to become more public", () => withDb((databasePath, eventRef) => {
  const store = openEmbodimentStore(databasePath);
  const first = store.recordRightsAuthority(rights(fixture.threadId, eventRef, "private", "a"));
  const second = store.recordRightsAuthority(rights(fixture.threadId, eventRef, "private", "b"));
  const publicAuthority = store.recordRightsAuthority(rights(fixture.threadId, eventRef, "public", "public"));

  const v1 = store.record(humanPortrait({
    revision: 1,
    eventRef,
    permissionReferences: [first.authorityId, second.authorityId],
  }));

  assert.throws(() => store.record(humanPortrait({
    revision: 2,
    eventRef,
    permissionReferences: [second.authorityId],
  })), /cannot discard prior permission authority/);

  assert.throws(() => store.record(humanPortrait({
    revision: 2,
    eventRef,
    permissionReferences: [first.authorityId, second.authorityId],
    visibility: "public",
  })), /no embodiment rights authority permits public visibility|requires new rights authority/);

  const v2 = store.record(humanPortrait({
    revision: 2,
    eventRef,
    permissionReferences: [first.authorityId, second.authorityId, publicAuthority.authorityId],
    visibility: "public",
    description: "A revised source-derived portrait representation of Mina.",
  }));
  assert.equal(v2.visibility, "public");
  assert.equal(store.history(fixture.threadId, v1.embodimentId).length, 2);
  store.close();
}));

test("human-derived embodiment cannot silently change whose likeness it represents", () => withDb((databasePath, eventRef) => {
  const store = openEmbodimentStore(databasePath);
  const mina = store.recordRightsAuthority(rights(fixture.threadId, eventRef, "private", "mina", "human_mina_source"));
  const other = store.recordRightsAuthority(rights(fixture.threadId, eventRef, "private", "other", "human_other_source"));
  store.record(humanPortrait({ revision: 1, eventRef, permissionReferences: [mina.authorityId] }));
  assert.throws(() => store.record(humanPortrait({
    revision: 2,
    eventRef,
    permissionReferences: [mina.authorityId, other.authorityId],
  })), /one human source identity|cannot change its human source identity/);
  store.close();
}));
