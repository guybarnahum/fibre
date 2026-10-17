import { createHash } from "node:crypto";

import { normalizeFidIssuanceWorkflowRecord } from "./fid-card-issuance-domain.mjs";
import { FID_PHOTO_POLICY_VERSION } from "./fid-photo-admission.mjs";

export class FidPhotoDerivationUnavailableError extends Error {}

function digest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function unique(values) {
  return [...new Set(values)];
}

function ageInstruction(targetAgeYears) {
  return targetAgeYears === null
    ? "Preserve a natural age consistent with the Thread's current issuance context; do not invent an unsupported exact age."
    : `Preserve identity while naturally depicting the Thread at ${targetAgeYears} years old.`;
}

export function buildFidPhotoDerivationJob({
  workflow: candidateWorkflow = null,
  threadId = null,
  correctionId = null,
  source,
  requestedAt,
  providerProfile,
  createGenerationJob,
}) {
  const ownerId = candidateWorkflow === null ? threadId : normalizeFidIssuanceWorkflowRecord(candidateWorkflow).threadId;
  if (typeof ownerId !== "string" || ownerId.trim() === "") {
    throw new TypeError("FID photo derivation requires a Thread");
  }
  if (correctionId !== null && (typeof correctionId !== "string"
    || !/^fid_photo_correction_[A-Za-z0-9._:-]+$/.test(correctionId))) {
    throw new TypeError("FID photo correction ID is invalid");
  }
  if (source?.threadId !== ownerId) {
    throw new FidPhotoDerivationUnavailableError("FID photo derivation source belongs to a different Thread");
  }
  if (typeof source.canonicalVisualReferenceRef !== "string"
    || typeof source.canonicalVisualReferenceDigest !== "string"
    || !Array.isArray(source.sourceReferences)
    || !source.sourceReferences.includes(source.canonicalVisualReferenceRef)) {
    throw new FidPhotoDerivationUnavailableError("FID photo derivation requires admitted canonical visual-reference provenance");
  }
  if (typeof providerProfile !== "string" || providerProfile.trim() === "") {
    throw new TypeError("FID photo derivation providerProfile is required");
  }
  if (typeof createGenerationJob !== "function") {
    throw new TypeError("FID photo derivation requires an Asset Generation job factory");
  }

  const identityDigest = digest({
    kind: "fid_photo_derivation",
    policyVersion: FID_PHOTO_POLICY_VERSION,
    threadId: ownerId,
    ...(correctionId === null ? {} : { correctionId }),
    canonicalVisualReferenceRef: source.canonicalVisualReferenceRef,
    canonicalVisualReferenceDigest: source.canonicalVisualReferenceDigest,
    targetAgeYears: source.targetAgeYears ?? null,
  });

  return createGenerationJob({
    identityDigest,
    assetKind: "image",
    role: "official_id_photo",
    variant: "fid-card",
    brief: {
      description: [
        correctionId === null
          ? "Derived Fibre Identity Card photograph using the admitted canonical visual reference as the sole identity anchor."
          : "Correct a previously mismatched Fibre Identity Card photo. Retain the exact same person and recognizable facial features as the supplied canonical portrait; change only what is essential for ID-photo framing.",
        ageInstruction(source.targetAgeYears ?? null),
      ].join(" "),
      constraints: [
        "Preserve the Thread's recognizable canonical visual identity; do not redesign facial or body identity.",
        "Use front-facing or almost front-facing head-and-shoulders administrative ID-photo framing.",
        "Use a plain neutral background, even administrative lighting, and ordinary focus.",
        "Use muted natural color; do not render the photograph in black-and-white.",
        "No glamour, editorial, cinematic, dramatic, or beauty-retouched styling.",
        "Do not add text, badges, document graphics, borders, QR codes, signatures, or watermarks.",
      ],
    },
    inputReferences: unique([
      source.canonicalVisualReferenceRef,
      source.canonicalVisualReferenceDigest,
      ...source.sourceReferences,
    ]),
    referenceObjectRefs: [source.canonicalVisualReferenceRef],
    requestedAt,
    providerProfile,
    context: {
      kind: "fid_photo_derivation",
      threadId: ownerId,
      ...(correctionId === null ? {} : { correctionId }),
      policyVersion: FID_PHOTO_POLICY_VERSION,
      canonicalVisualReferenceDigest: source.canonicalVisualReferenceDigest,
      targetAgeYears: source.targetAgeYears ?? null,
    },
  });
}
