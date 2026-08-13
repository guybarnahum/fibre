import assert from "node:assert/strict";
import test from "node:test";

import {
  embodimentId,
  embodimentSpecificationDigest,
  normalizeEmbodimentRepresentation,
} from "../src/embodiment-domain.mjs";

function portrait(overrides = {}) {
  const specification = overrides.specification ?? {
    method: "generated",
    description: "A neutral portrait representation of Mina.",
    model: "replaceable-renderer",
  };
  return {
    embodimentId: embodimentId({ threadId: "thread_mina", kind: "portrait" }),
    revision: 1,
    threadId: "thread_mina",
    kind: "portrait",
    representationKind: overrides.representationKind ?? "synthetic_generation",
    truthStatus: overrides.truthStatus ?? "synthetic_representation_not_historical_evidence",
    rightsBasis: overrides.rightsBasis ?? "generated_no_human_source",
    permissionReferences: overrides.permissionReferences ?? [],
    sourceReferences: ["ias_identity_source"],
    specification,
    specificationDigest: embodimentSpecificationDigest(specification),
    status: overrides.status ?? "pending_generation",
    unavailableReason: overrides.unavailableReason ?? null,
    asset: overrides.asset ?? null,
    visibility: "private",
    recordedAt: "2026-08-13T16:00:00Z",
  };
}

test("synthetic embodiment can never claim captured historical truth", () => {
  assert.equal(normalizeEmbodimentRepresentation(portrait()).truthStatus, "synthetic_representation_not_historical_evidence");
  assert.throws(
    () => normalizeEmbodimentRepresentation(portrait({ truthStatus: "captured_source_evidence" })),
    /synthetic embodiment cannot claim captured historical truth/,
  );
});

test("human-source derivative requires a legitimate rights basis", () => {
  assert.throws(
    () => normalizeEmbodimentRepresentation(portrait({
      representationKind: "human_source_derivative",
      truthStatus: "source_derivative_not_historical_evidence",
    })),
    /requires consent or public-domain rights basis/,
  );
  const permitted = normalizeEmbodimentRepresentation(portrait({
    representationKind: "human_source_derivative",
    truthStatus: "source_derivative_not_historical_evidence",
    rightsBasis: "explicit_consent",
    permissionReferences: ["consent_echo_source"],
  }));
  assert.equal(permitted.rightsBasis, "explicit_consent");
});

test("available portrait binds asset hash and dimensions to the representation", () => {
  const available = normalizeEmbodimentRepresentation(portrait({
    status: "available",
    asset: {
      assetRef: "cache://portrait/mina/v1",
      sha256: `sha256:${"a".repeat(64)}`,
      mediaType: "image/png",
      width: 1024,
      height: 1024,
      durationMs: null,
    },
  }));
  assert.equal(available.asset.width, 1024);
  assert.match(available.specificationDigest, /^sha256:[0-9a-f]{64}$/);
});
