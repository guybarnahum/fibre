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
import { EmbodimentConflictError, openEmbodimentStore } from "../src/embodiment-store.mjs";

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

function specification({
  partyId = "human_mina_source",
  subjectDescription = "Mina as the consenting human source whose likeness grounds this representation.",
  renderDescription = "A source-derived portrait rendering of the depicted person.",
} = {}) {
  return {
    subject: { partyId, description: subjectDescription },
    method: "source-derived",
    description: renderDescription,
    model: "replaceable-renderer",
  };
}

function rights(threadId, eventRef, maxVisibility, suffix, sourcePartyId = "human_mina_source") {
  return {
    authorityId: embodimentRightsAuthorityId({ threadId, maxVisibility, suffix, sourcePartyId }),
    threadId,
    authorityKind: "explicit_consent",
    sourcePartyId,
    permittedKinds: ["portrait"],
    maxVisibility,
    evidenceReferences: [eventRef],
    recordedAt: "2026-08-13T16:00:00Z",
  };
}

function humanPortrait({
  revision,
  eventRef,
  permissionReferences,
  visibility = "private",
  spec = specification(),
  respecification = null,
  representationKind = "human_source_derivative",
  truthStatus = "source_derivative_not_historical_evidence",
}) {
  return {
    embodimentId: embodimentId({ threadId: fixture.threadId, kind: "portrait", lineage: "human-primary" }),
    revision,
    threadId: fixture.threadId,
    kind: "portrait",
    representationKind,
    truthStatus,
    rightsBasis: "explicit_consent",
    permissionReferences,
    sourceReferences: [eventRef],
    specification: spec,
    specificationDigest: embodimentSpecificationDigest(spec),
    respecification,
    status: "pending_generation",
    unavailableReason: null,
    asset: null,
    visibility,
    recordedAt: revision === 1 ? "2026-08-13T16:01:00Z" : "2026-08-13T16:02:00Z",
    ...(revision > 1 ? { supersedesRevision: revision - 1 } : {}),
  };
}

test("an asset cannot substitute for a meaningful embodiment specification", () => {
  const bad = { method: "source-derived", description: "see cache://blob/1 only", model: "renderer", subject: { partyId: "human_mina_source", description: "." } };
  assert.throws(() => normalizeEmbodimentRepresentation({
    ...humanPortrait({ revision: 1, eventRef: "evt_source", permissionReferences: ["era_authority"] }),
    specification: bad,
    specificationDigest: embodimentSpecificationDigest(bad),
  }), /subject\.description must contain at least/);
});

test("embodiment source and consent are durable Thread-scoped authority, not labels", () => withDb((databasePath, eventRef) => {
  const store = openEmbodimentStore(databasePath);
  const fakeAuthority = rights(fixture.threadId, "evt_not_real", "private", "fake");
  assert.throws(() => store.recordRightsAuthority(fakeAuthority), /not durable evidence/);

  const authority = store.recordRightsAuthority(rights(fixture.threadId, eventRef, "private", "private"));
  assert.throws(() => store.record(humanPortrait({ revision: 1, eventRef: "evt_not_real", permissionReferences: [authority.authorityId] })), /not durable evidence/);
  const stored = store.record(humanPortrait({ revision: 1, eventRef, permissionReferences: [authority.authorityId] }));
  assert.equal(stored.rightsBasis, "explicit_consent");
  assert.equal(store.history(fixture.threadId, stored.embodimentId).length, 1);
  store.close();
}));

test("rights-grounded embodiment accumulates permission and needs fresh authority to become more public", () => withDb((databasePath, eventRef) => {
  const store = openEmbodimentStore(databasePath);
  const first = store.recordRightsAuthority(rights(fixture.threadId, eventRef, "private", "a"));
  const second = store.recordRightsAuthority(rights(fixture.threadId, eventRef, "private", "b"));
  const publicAuthority = store.recordRightsAuthority(rights(fixture.threadId, eventRef, "public", "public"));
  const v1 = store.record(humanPortrait({ revision: 1, eventRef, permissionReferences: [first.authorityId, second.authorityId] }));

  assert.throws(() => store.record(humanPortrait({ revision: 2, eventRef, permissionReferences: [second.authorityId] })), /cannot discard prior permission authority/);
  assert.throws(() => store.record(humanPortrait({ revision: 2, eventRef, permissionReferences: [first.authorityId, second.authorityId], visibility: "public" })), /public visibility|requires new rights authority/);

  const v2 = store.record(humanPortrait({ revision: 2, eventRef, permissionReferences: [first.authorityId, second.authorityId, publicAuthority.authorityId], visibility: "public" }));
  assert.equal(v2.visibility, "public");
  assert.equal(store.history(fixture.threadId, v1.embodimentId).length, 2);
  store.close();
}));

test("embodiment lineage cannot silently change who it depicts", () => withDb((databasePath, eventRef) => {
  const store = openEmbodimentStore(databasePath);
  const mina = store.recordRightsAuthority(rights(fixture.threadId, eventRef, "private", "mina", "human_mina_source"));
  const other = store.recordRightsAuthority(rights(fixture.threadId, eventRef, "private", "other", "human_other_source"));
  store.record(humanPortrait({ revision: 1, eventRef, permissionReferences: [mina.authorityId] }));
  const otherSpec = specification({
    partyId: "human_other_source",
    subjectDescription: "An entirely different human source who must not replace Mina in this lineage.",
  });
  assert.throws(() => store.record(humanPortrait({ revision: 2, eventRef, permissionReferences: [mina.authorityId, other.authorityId], spec: otherSpec })), /cannot change who it depicts|different depicted subject/);
  store.close();
}));

test("legitimate subject change is explicit, prior-bound, and witnessed", () => withDb((databasePath, eventRef) => {
  const store = openEmbodimentStore(databasePath);
  const mina = store.recordRightsAuthority(rights(fixture.threadId, eventRef, "private", "mina"));
  const firstSpec = specification();
  const first = store.record(humanPortrait({ revision: 1, eventRef, permissionReferences: [mina.authorityId], spec: firstSpec }));
  const matured = specification({ subjectDescription: "Mina years later, recognizably the same person, with age-significant changes in appearance." });
  assert.throws(() => store.record(humanPortrait({ revision: 2, eventRef, permissionReferences: [mina.authorityId], spec: matured })), /requires witnessed respecification/);
  const second = store.record(humanPortrait({
    revision: 2,
    eventRef,
    permissionReferences: [mina.authorityId],
    spec: matured,
    respecification: {
      reason: "Recorded age-related embodiment change for the same depicted person.",
      priorSpecificationDigest: first.specificationDigest,
      evidenceReferences: [eventRef],
    },
  }));
  assert.equal(second.respecification.priorSpecificationDigest, first.specificationDigest);
  store.close();
}));

test("captured_source with explicit consent cannot swap consent or depicted human", () => withDb((databasePath, eventRef) => {
  const store = openEmbodimentStore(databasePath);
  const mina = store.recordRightsAuthority(rights(fixture.threadId, eventRef, "private", "captured-mina"));
  const other = store.recordRightsAuthority(rights(fixture.threadId, eventRef, "private", "captured-other", "human_other_source"));
  store.record(humanPortrait({ revision: 1, eventRef, permissionReferences: [mina.authorityId], representationKind: "captured_source", truthStatus: "captured_source_evidence" }));
  const otherSpec = specification({ partyId: "human_other_source", subjectDescription: "A different captured human whose consent cannot replace Mina's authority in this lineage." });
  assert.throws(() => store.record(humanPortrait({ revision: 2, eventRef, permissionReferences: [other.authorityId], representationKind: "captured_source", truthStatus: "captured_source_evidence", spec: otherSpec })), /cannot discard prior permission authority|different depicted subject|cannot change who it depicts/);
  store.close();
}));
