import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";

import {
  embodimentId,
  embodimentSpecificationDigest,
  normalizeEmbodimentRepresentation,
} from "../src/embodiment-domain.mjs";
import { openEmbodimentStore } from "../src/embodiment-store.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import {
  createCanonicalVisualIdentityRepairService,
  renewCanonicalVisualIdentity,
  repairCanonicalVisualIdentity,
} from "../src/canonical-visual-identity-repair.mjs";

const THREAD_ID = "thr_visual_identity_repair_001";
const EMBODIMENT_ID = "emb_visual_identity_repair_001";

function specification(subjectDescription) {
  return {
    subject: {
      partyId: THREAD_ID,
      description: subjectDescription,
    },
    method: "canonical synthetic portrait specification from authoritative textual phenotype",
    description: "Preserve stable facial geometry, proportions, skin, hair, asymmetries, and identity landmarks across age transformations while keeping time-local appearance separate.",
    model: "replaceable-renderer",
  };
}

function currentEmbodiment() {
  const currentSpecification = specification(
    "adult male person; softly angular oval face; medium-set dark-brown eyes; narrow straight nasal bridge; medium-width mouth; tapered jaw; medium warm-beige skin; dense near-black loosely curled hair; attached earlobes; lean frame; small pale scar above the left eyebrow",
  );
  return normalizeEmbodimentRepresentation({
    embodimentId: EMBODIMENT_ID,
    revision: 2,
    supersedesRevision: 1,
    threadId: THREAD_ID,
    kind: "portrait",
    representationKind: "synthetic_generation",
    truthStatus: "synthetic_representation_not_historical_evidence",
    rightsBasis: "thread_self_owned",
    permissionReferences: [],
    sourceReferences: ["evt_visual_identity_origin_001"],
    specification: currentSpecification,
    specificationDigest: embodimentSpecificationDigest(currentSpecification),
    respecification: null,
    status: "available",
    unavailableReason: null,
    asset: {
      assetRef: "asset://visual_identity_reference_old",
      referenceObjectRef: "visual_identity_reference_old",
      sha256: `sha256:${"a".repeat(64)}`,
      mediaType: "image/png",
      width: 1024,
      height: 1024,
      durationMs: null,
    },
    visibility: "public",
    recordedAt: "2026-09-24T04:00:00.000Z",
  });
}

test("canonical correction preserves lineage and reopens root generation", () => {
  const current = currentEmbodiment();
  const correctedSpecification = specification(
    "adult male person; long oval face with gently tapered cheeks; deep-brown almond-shaped eyes; medium-width nose with a softly rounded tip; full balanced lips; softly defined jaw and rounded chin; warm medium-brown skin with ordinary tonal variation; dense tightly curled near-black hair with a natural rounded hairline; medium detached earlobes; lean-to-average frame; subtle left-right brow asymmetry",
  );

  const repaired = repairCanonicalVisualIdentity({
    currentEmbodiment: current,
    correctedSpecification,
    reason: "Correct the admitted canonical visual identity after the prior root failed to faithfully realize the authoritative appearance specification.",
    evidenceReferences: ["evt_visual_identity_correction_001"],
    recordedAt: "2026-09-24T05:00:00.000Z",
  });

  assert.equal(repaired.embodimentId, current.embodimentId);
  assert.equal(repaired.threadId, current.threadId);
  assert.equal(repaired.revision, current.revision + 1);
  assert.equal(repaired.supersedesRevision, current.revision);
  assert.equal(repaired.status, "pending_generation");
  assert.equal(repaired.asset, null);
  assert.notEqual(repaired.specificationDigest, current.specificationDigest);
  assert.equal(repaired.respecification.priorSpecificationDigest, current.specificationDigest);
  assert.deepEqual(repaired.respecification.evidenceReferences, ["evt_visual_identity_correction_001"]);
  assert.equal(current.status, "available");
  assert.equal(current.asset.referenceObjectRef, "visual_identity_reference_old");
});


test("canonical renewal preserves the exact visual identity specification", () => {
  const current = currentEmbodiment();
  const renewed = renewCanonicalVisualIdentity({
    currentEmbodiment:current,
    reason:"Renew the canonical reference under the current Fibre rendering profile without changing the Thread's visual identity.",
    evidenceReferences:["evt_visual_identity_origin_001"],
    recordedAt:"2026-09-24T05:00:00.000Z",
  });

  assert.equal(renewed.specificationDigest, current.specificationDigest, "renewal changed canonical identity");
  assert.deepEqual(renewed.specification, current.specification, "renewal rewrote canonical semantics");
  assert.equal(renewed.revision, current.revision + 1, "renewal did not append one revision");
  assert.equal(renewed.supersedesRevision, current.revision, "renewal broke Embodiment lineage");
  assert.equal(renewed.status, "pending_generation", "renewal did not request a fresh root");
  assert.equal(renewed.asset, null, "renewal reused the old root bytes");
  assert.equal(renewed.respecification, null, "renewal masqueraded as a respecification");
  assert.equal(renewed.renewal.priorSpecificationDigest, current.specificationDigest);
  assert.equal(renewed.renewal.priorReferenceObjectRef, current.asset.referenceObjectRef);
  assert.deepEqual(renewed.renewal.evidenceReferences, ["evt_visual_identity_origin_001"]);
  assert.equal(current.asset.referenceObjectRef, "visual_identity_reference_old", "renewal mutated prior root history");
});


test("operator renewal preserves identity while reopening canonical generation", () => {
  let current = currentEmbodiment();
  const service = createCanonicalVisualIdentityRepairService({
    embodimentStore:{
      listCurrent(threadId) {
        return threadId === THREAD_ID ? [structuredClone(current)] : [];
      },
      record(candidate) {
        current = structuredClone(candidate);
        return structuredClone(current);
      },
    },
    now:() => "2026-09-24T05:10:00.000Z",
  });

  const result = service.renew({
    threadId:THREAD_ID,
    operationKey:"renew_visual_001",
    reason:"Renew a legacy canonical root using the current renderer without changing authoritative visual identity.",
  });

  assert.equal(result.previous.specificationDigest, result.embodiment.specificationDigest, "renewal changed visual identity authority");
  assert.equal(result.embodiment.status, "pending_generation", "renewal did not reopen generation");
  assert.equal(result.embodiment.respecification, null, "renewal changed canonical specification authority");
  assert.deepEqual(
    result.embodiment.renewal.evidenceReferences,
    ["evt_visual_identity_origin_001"],
    "renewal lost durable visual identity provenance",
  );
});

test("operator renewal is accepted by real Embodiment authority", () => {
  const fixture = JSON.parse(
    readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
  );
  const dir = mkdtempSync(join(tmpdir(), "fibre-canonical-renewal-"));
  try {
    const storage = localWorldStateStorage(join(dir, "world.sqlite"));
    const world = openWorldStore(storage);
    const seeded = world.seedThread(structuredClone(fixture)).thread;
    world.close();

    const threadId = seeded.threadId;
    const eventRef = seeded.provenance.lastEventId;
    const spec = {
      subject:{
        partyId:threadId,
        description:"adult female person; stable individual facial proportions, dark eyes, natural dark hair, ordinary skin texture, and subtle facial asymmetry",
      },
      method:"canonical synthetic portrait specification",
      description:"Preserve the listed stable individual identity cues across age transformations in a neutral realistic portrait.",
      model:"replaceable-renderer",
    };
    const id = embodimentId({ threadId, kind:"portrait", lineage:"canonical" });
    const store = openEmbodimentStore(storage);
    store.record({
      embodimentId:id,
      revision:1,
      threadId,
      kind:"portrait",
      representationKind:"synthetic_generation",
      truthStatus:"synthetic_representation_not_historical_evidence",
      rightsBasis:"thread_self_owned",
      permissionReferences:[],
      sourceReferences:[eventRef],
      specification:spec,
      specificationDigest:embodimentSpecificationDigest(spec),
      respecification:null,
      status:"pending_generation",
      unavailableReason:null,
      asset:null,
      visibility:"public",
      recordedAt:"2026-08-02T17:01:00Z",
    });
    store.record({
      embodimentId:id,
      revision:2,
      supersedesRevision:1,
      threadId,
      kind:"portrait",
      representationKind:"synthetic_generation",
      truthStatus:"synthetic_representation_not_historical_evidence",
      rightsBasis:"thread_self_owned",
      permissionReferences:[],
      sourceReferences:[eventRef],
      specification:spec,
      specificationDigest:embodimentSpecificationDigest(spec),
      respecification:null,
      status:"available",
      unavailableReason:null,
      asset:{
        assetRef:"asset://visual_identity_reference_mina_old",
        referenceObjectRef:"visual_identity_reference_mina_old",
        sha256:`sha256:${"b".repeat(64)}`,
        mediaType:"image/png",
        width:1024,
        height:1024,
        durationMs:null,
      },
      visibility:"public",
      recordedAt:"2026-08-02T17:02:00Z",
    });

    const service = createCanonicalVisualIdentityRepairService({
      embodimentStore:store,
      now:() => "2026-08-02T17:03:00Z",
    });
    const result = service.renew({
      threadId,
      operationKey:"renew_visual_mina_001",
      reason:"Renew the admitted canonical root under the current renderer without changing the Thread's visual identity.",
    });

    assert.equal(result.embodiment.status, "pending_generation", "renewal did not reach Embodiment authority");
    assert.equal(result.embodiment.specificationDigest, result.previous.specificationDigest, "renewal changed canonical identity");
    assert.equal(result.embodiment.renewal.priorReferenceObjectRef, "visual_identity_reference_mina_old", "renewal lost the prior root witness");
    store.close();
  } finally {
    rmSync(dir, { recursive:true, force:true });
  }
});

test("operator repair service records one corrected canonical lineage head", () => {
  let current = currentEmbodiment();
  const priorRoot = current.asset.referenceObjectRef;
  const service = createCanonicalVisualIdentityRepairService({
    embodimentStore: {
      listCurrent(threadId) {
        return threadId === THREAD_ID ? [structuredClone(current)] : [];
      },
      record(candidate) {
        current = structuredClone(candidate);
        return structuredClone(current);
      },
    },
    now: () => "2026-09-24T05:10:00.000Z",
  });
  const correctedSpecification = specification(
    "adult male person; long oval face with gently tapered cheeks; deep-brown almond-shaped eyes; medium-width nose with softly rounded tip; full balanced lips; softly defined jaw and rounded chin; warm medium-brown skin with ordinary tonal variation; dense tightly curled near-black hair with a natural rounded hairline; medium detached earlobes; lean-to-average frame; subtle left-right brow asymmetry",
  );

  const result = service.repair({
    threadId: THREAD_ID,
    operationKey: "repair_kaleb_visual_001",
    correctedSpecification,
    reason: "Correct the canonical visual identity after the admitted root failed to faithfully realize the intended appearance.",
  });

  assert.equal(result.previous.referenceObjectRef, priorRoot, "prior root history was lost");
  assert.equal(result.embodiment.status, "pending_generation", "correction did not reopen root generation");
  assert.deepEqual(
    result.embodiment.respecification.evidenceReferences,
    ["evt_visual_identity_origin_001"],
    "correction was not grounded in durable Thread evidence",
  );
  assert.equal(current.revision, 3, "corrected lineage head was not recorded");
});


test("operator repair is accepted by real Embodiment authority", () => {
  const fixture = JSON.parse(
    readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
  );
  const dir = mkdtempSync(join(tmpdir(), "fibre-canonical-repair-"));
  const databasePath = join(dir, "world.sqlite");
  try {
    const storage = localWorldStateStorage(databasePath);
    const world = openWorldStore(storage);
    const seeded = world.seedThread(structuredClone(fixture)).thread;
    world.close();

    const threadId = seeded.threadId;
    const eventRef = seeded.provenance.lastEventId;
    const spec = {
      subject:{
        partyId:threadId,
        description:"adult female person; stable individual facial proportions, dark eyes, natural dark hair, ordinary skin texture, and subtle facial asymmetry",
      },
      method:"canonical synthetic portrait specification",
      description:"Preserve the listed stable individual identity cues across age transformations in a neutral realistic portrait.",
      model:"replaceable-renderer",
    };
    const id = embodimentId({ threadId, kind:"portrait", lineage:"canonical" });
    const store = openEmbodimentStore(storage);
    store.record({
      embodimentId:id,
      revision:1,
      threadId,
      kind:"portrait",
      representationKind:"synthetic_generation",
      truthStatus:"synthetic_representation_not_historical_evidence",
      rightsBasis:"thread_self_owned",
      permissionReferences:[],
      sourceReferences:[eventRef],
      specification:spec,
      specificationDigest:embodimentSpecificationDigest(spec),
      respecification:null,
      status:"pending_generation",
      unavailableReason:null,
      asset:null,
      visibility:"public",
      recordedAt:"2026-08-02T17:01:00Z",
    });
    store.record({
      embodimentId:id,
      revision:2,
      supersedesRevision:1,
      threadId,
      kind:"portrait",
      representationKind:"synthetic_generation",
      truthStatus:"synthetic_representation_not_historical_evidence",
      rightsBasis:"thread_self_owned",
      permissionReferences:[],
      sourceReferences:[eventRef],
      specification:spec,
      specificationDigest:embodimentSpecificationDigest(spec),
      respecification:null,
      status:"available",
      unavailableReason:null,
      asset:{
        assetRef:"asset://visual_identity_reference_mina_old",
        referenceObjectRef:"visual_identity_reference_mina_old",
        sha256:`sha256:${"b".repeat(64)}`,
        mediaType:"image/png",
        width:1024,
        height:1024,
        durationMs:null,
      },
      visibility:"public",
      recordedAt:"2026-08-02T17:02:00Z",
    });

    const corrected = {
      ...spec,
      subject:{
        ...spec.subject,
        description:"adult female person; softly oval face with balanced proportions, deep-brown eyes, natural dark hairline, ordinary skin texture, and subtle left-right brow asymmetry",
      },
    };
    const service = createCanonicalVisualIdentityRepairService({
      embodimentStore:store,
      now:() => "2026-08-02T17:03:00Z",
    });
    const result = service.repair({
      threadId,
      operationKey:"repair_visual_mina_001",
      correctedSpecification:corrected,
      reason:"Correct a materially inaccurate admitted canonical visual identity.",
    });

    assert.equal(result.embodiment.status, "pending_generation", "repair did not reach Embodiment authority");
    assert.deepEqual(
      result.embodiment.respecification.evidenceReferences,
      [eventRef],
      "repair did not retain a durable Thread witness",
    );
    store.close();
  } finally {
    rmSync(dir, { recursive:true, force:true });
  }
});
