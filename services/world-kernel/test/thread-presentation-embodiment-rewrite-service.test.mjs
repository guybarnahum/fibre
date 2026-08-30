import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { embodimentSpecificationDigest } from "../src/embodiment-domain.mjs";
import {
  ThreadPresentationVisualIdentityConflictError,
  createThreadPresentationEmbodimentRewriteService,
} from "../src/thread-presentation-embodiment-rewrite-service.mjs";
import { createThreadPresentationServer } from "../src/thread-presentation-server.mjs";

const THREAD_ID = "thr_pr39_g2_04";
const CHANNEL_ID = `presentation:${THREAD_ID}`;

async function liveBundle() {
  const base = new URL("../../../fixtures/thread-presentation/can-tho/", import.meta.url);
  const presentation = JSON.parse(await readFile(new URL("presentation.json", base), "utf8"));
  const media = JSON.parse(await readFile(new URL("media.json", base), "utf8"));
  const provenance = JSON.parse(await readFile(new URL("provenance.json", base), "utf8"));
  presentation.schemaVersion = "thread-presentation-packet-v0.2";
  presentation.manifest = {
    ...presentation.manifest,
    lifecycleStatus: "active",
    fixture: false,
    generatedAt: "2026-08-29T23:50:00Z",
  };
  presentation.civilIdentity = null;
  presentation.visualIdentity = null;
  presentation.identityCard = null;
  return { presentation, media, provenance };
}

function embodiment({
  revision = 2,
  embodimentId = "emb_visual_identity_primary",
  status = "available",
  visibility = "public",
  referenceObjectRef = "visual_identity_reference_root_001",
  recordedAt = "2026-08-30T05:20:00Z",
} = {}) {
  const specification = {
    subject: {
      partyId: THREAD_ID,
      description: "An oval face with a broad upper forehead, slightly asymmetric dark almond-shaped eyes, a straight medium-width nose, a defined cupid's bow, a softly squared chin, warm medium skin with a small mark beside the left cheekbone, and dense dark wavy hair with a subtle widow's peak.",
    },
    method: "synthetic canonical portrait generation",
    description: "Preserve the narrow left eyebrow arch, slightly fuller right cheek, close-set lower lip contour, visible ear shape, natural skin texture, stable facial proportions and the cheekbone mark across age; neutral mostly frontal reference rendering without glamour treatment.",
    model: "canonical-visual-identity-v1",
  };
  return {
    embodimentId,
    revision,
    threadId: THREAD_ID,
    kind: "portrait",
    representationKind: "synthetic_generation",
    truthStatus: "synthetic_representation_not_historical_evidence",
    rightsBasis: "generated_no_human_source",
    permissionReferences: [],
    sourceReferences: ["birth_visual_identity_source"],
    specification,
    specificationDigest: embodimentSpecificationDigest(specification),
    respecification: null,
    status,
    unavailableReason: status === "unavailable_with_reason" ? "fixture unavailable" : null,
    asset: status === "available" ? {
      assetRef: `asset://${referenceObjectRef}`,
      referenceObjectRef,
      sha256: `sha256:${"b".repeat(64)}`,
      mediaType: "image/webp",
      width: 1024,
      height: 1024,
      durationMs: null,
    } : null,
    visibility,
    recordedAt,
    ...(revision === 1 ? {} : { supersedesRevision: revision - 1 }),
  };
}

async function fixture() {
  const infra = createMemoryInfraDriver();
  const server = createThreadPresentationServer({ infra });
  const bundle = await liveBundle();
  await server.publishSnapshot({
    channelId: CHANNEL_ID,
    objectRef: "snapshot_genesis_before_visual_identity",
    snapshotVersion: "genesis-before-visual-identity",
    bundle,
    expectedSequence: 0,
    catalog: {
      publiclyVisible: true,
      genesisId: "genesis_visual_identity_rewrite",
      publicationDigest: `sha256:${"a".repeat(64)}`,
      projectionKind: "genesis_birth",
    },
  });
  return {
    infra,
    server,
    bundle,
    service: createThreadPresentationEmbodimentRewriteService({ presentationServer: server }),
  };
}

test("admitted public Embodiment rewrites bounded visual identity without creating derived media", async () => {
  const current = await fixture();
  const before = await current.server.getSnapshot(CHANNEL_ID);
  const result = await current.service.project({ channelId: CHANNEL_ID, embodiment: embodiment() });

  assert.equal(result.rewritten, true);
  assert.equal(result.reused, false);
  assert.equal(result.projection.authority, "authorized_embodiment_projection");
  assert.equal(result.projection.embodimentRevision, 2);
  assert.deepEqual(result.projection.referenceObjectRefs, ["visual_identity_reference_root_001"]);

  const after = await current.server.getSnapshot(CHANNEL_ID);
  assert.notEqual(after.pointer.objectRef, before.pointer.objectRef);
  assert.deepEqual(after.snapshot.media, before.snapshot.media, "Slice D must not pull derived media generation forward");
  assert.deepEqual(after.snapshot.presentation.subject, before.snapshot.presentation.subject);
  assert.deepEqual(after.snapshot.presentation.introduction, before.snapshot.presentation.introduction);
  assert.deepEqual(after.snapshot.presentation.memories, before.snapshot.presentation.memories);
  assert.equal(after.snapshot.presentation.identityCard, null);
  assert.deepEqual(after.snapshot.presentation.visualIdentity, result.projection);
  assert.equal(JSON.stringify(after.snapshot.presentation.visualIdentity).includes("asset://"), false);

  const visualProvenance = after.snapshot.provenance.entries.find(
    (entry) => entry.provenanceId === result.projection.provenanceRef,
  );
  assert.equal(visualProvenance.kind, "fibre_projection");
  assert.deepEqual(visualProvenance.sourceReferences, result.projection.sourceReferences);

  const catalog = await current.infra.catalog.get(CHANNEL_ID);
  assert.equal(catalog.publiclyVisible, true);
  assert.equal(catalog.genesisId, "genesis_visual_identity_rewrite");
  assert.equal(catalog.publicationDigest, `sha256:${"a".repeat(64)}`);
  assert.equal(catalog.projectionKind, "embodiment_visual_identity");
  assert.equal(catalog.visualIdentityEmbodimentId, "emb_visual_identity_primary");
  assert.equal(catalog.visualIdentityEmbodimentRevision, 2);
});

test("replaying the same admitted Embodiment is an exact no-op", async () => {
  const current = await fixture();
  const first = await current.service.project({ channelId: CHANNEL_ID, embodiment: embodiment() });
  const firstPointer = (await current.server.getSnapshot(CHANNEL_ID)).pointer;
  const repeated = await current.service.project({ channelId: CHANNEL_ID, embodiment: embodiment() });
  const repeatedPointer = (await current.server.getSnapshot(CHANNEL_ID)).pointer;

  assert.equal(first.rewritten, true);
  assert.equal(repeated.rewritten, false);
  assert.equal(repeated.reused, true);
  assert.deepEqual(repeatedPointer, firstPointer);
});

test("a stale or different Embodiment lineage cannot overwrite current public visual identity", async () => {
  const current = await fixture();
  const newer = embodiment({ revision: 3, recordedAt: "2026-08-30T05:25:00Z" });
  await current.service.project({ channelId: CHANNEL_ID, embodiment: newer });

  await assert.rejects(
    () => current.service.project({ channelId: CHANNEL_ID, embodiment: embodiment({ revision: 2 }) }),
    ThreadPresentationVisualIdentityConflictError,
  );
  await assert.rejects(
    () => current.service.project({
      channelId: CHANNEL_ID,
      embodiment: embodiment({ revision: 4, embodimentId: "emb_visual_identity_other_lineage" }),
    }),
    ThreadPresentationVisualIdentityConflictError,
  );

  const after = await current.server.getSnapshot(CHANNEL_ID);
  assert.equal(after.snapshot.presentation.visualIdentity.embodimentRevision, 3);
  assert.equal(after.snapshot.presentation.visualIdentity.embodimentId, "emb_visual_identity_primary");
});

test("pending or non-public Embodiment cannot create public visual identity", async () => {
  for (const candidate of [
    embodiment({ revision: 1, status: "pending_generation", referenceObjectRef: null }),
    embodiment({ visibility: "private" }),
    embodiment({ visibility: "restricted" }),
  ]) {
    const current = await fixture();
    const before = await current.server.getSnapshot(CHANNEL_ID);
    const result = await current.service.project({ channelId: CHANNEL_ID, embodiment: candidate });
    const after = await current.server.getSnapshot(CHANNEL_ID);
    assert.equal(result.rewritten, false);
    assert.equal(result.reason, "embodiment_not_publicly_projectable");
    assert.equal(after.snapshot.presentation.visualIdentity, null);
    assert.deepEqual(after.pointer, before.pointer);
  }
});

test("visual identity cannot be projected into candidate/fixture presentation state", async () => {
  const infra = createMemoryInfraDriver();
  const server = createThreadPresentationServer({ infra });
  const bundle = await liveBundle();
  bundle.presentation.manifest.lifecycleStatus = "genesis_candidate";
  bundle.presentation.manifest.fixture = true;
  await server.publishSnapshot({
    channelId: CHANNEL_ID,
    objectRef: "snapshot_genesis_candidate_visual_identity",
    snapshotVersion: "genesis-candidate-visual-identity",
    bundle,
    expectedSequence: 0,
    catalog: { publiclyVisible: false },
  });
  const service = createThreadPresentationEmbodimentRewriteService({ presentationServer: server });
  await assert.rejects(
    () => service.project({ channelId: CHANNEL_ID, embodiment: embodiment() }),
    ThreadPresentationVisualIdentityConflictError,
  );
});
