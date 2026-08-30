import {
  FIBRE_IDENTITY_CARD_CREDENTIAL_VERSION,
  normalizeThreadPresentationBundle,
  normalizeThreadVisualIdentityProjection,
  threadVisualIdentityProjectionDigest,
} from "#services/thread-presentation/src/index.mjs";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function isoTimestamp(name, value) {
  nonEmpty(name, value);
  if (!Number.isFinite(Date.parse(value))) throw new TypeError(`${name} must be an ISO timestamp`);
  return value;
}

function unique(values) {
  return [...new Set(values)];
}

function officialPhotoMediaId(threadId) {
  return `media_official_id_photo_${threadId}`;
}

function cardProvenanceId(visualIdentity, revision) {
  return `prov_identity_card_${visualIdentity.embodimentId}_r${revision}`;
}

function photoProvenanceId(visualIdentity) {
  return `prov_official_id_photo_${visualIdentity.embodimentId}_r${visualIdentity.embodimentRevision}`;
}

function currentOfficialPhoto(bundle, mediaId) {
  return bundle.media.assets.find((asset) => asset.mediaId === mediaId) ?? null;
}

function sameVisualIdentity(left, right) {
  if (left === null || right === null) return left === right;
  return threadVisualIdentityProjectionDigest(left) === threadVisualIdentityProjectionDigest(right);
}

/**
 * Apply a bounded, authority-validated visual-identity projection to the current
 * public Thread Presentation.
 *
 * Thread Presentation owns the derived credential and media policy. The
 * official photo slot is created as a placeholder; generation remains a later
 * downstream action and cannot establish or alter visual identity.
 */
export function projectVisualIdentityThreadPresentation({
  bundle: bundleCandidate,
  threadId: requestedThreadId,
  visualIdentity: visualIdentityCandidate,
  projectedAt,
} = {}) {
  const current = normalizeThreadPresentationBundle(bundleCandidate);
  const visualIdentity = normalizeThreadVisualIdentityProjection(visualIdentityCandidate);
  if (visualIdentity === null) throw new TypeError("visualIdentity is required");
  const threadId = nonEmpty("threadId", requestedThreadId);
  isoTimestamp("projectedAt", projectedAt);

  if (current.presentation.manifest.threadId !== threadId) {
    throw new TypeError("visual identity projection Thread does not match current presentation");
  }
  if (current.presentation.manifest.fixture) {
    throw new TypeError("authorized visual identity cannot rewrite a fixture presentation");
  }
  if (Date.parse(projectedAt) < Date.parse(current.presentation.manifest.generatedAt)) {
    throw new TypeError("visual identity projection cannot predate the current presentation");
  }
  if (current.presentation.civilIdentity === null) {
    throw new TypeError("visual identity projection requires authoritative civil identity");
  }

  const currentVisual = current.presentation.visualIdentity;
  if (currentVisual !== null && currentVisual.embodimentId === visualIdentity.embodimentId) {
    if (currentVisual.embodimentRevision > visualIdentity.embodimentRevision) {
      throw new TypeError("visual identity projection cannot roll back embodiment revision");
    }
    if (
      currentVisual.embodimentRevision === visualIdentity.embodimentRevision
      && !sameVisualIdentity(currentVisual, visualIdentity)
    ) {
      throw new TypeError("same embodiment revision cannot project different visual identity content");
    }
  }

  const mediaId = officialPhotoMediaId(threadId);
  const currentPhoto = currentOfficialPhoto(current, mediaId);
  if (
    sameVisualIdentity(currentVisual, visualIdentity)
    && current.presentation.identityCard !== null
    && current.presentation.identityCard.officialPhotoMediaRef === mediaId
    && currentPhoto?.role === "official_id_photo"
  ) {
    return current;
  }

  const priorCard = current.presentation.identityCard;
  const cardRevision = priorCard === null ? 1 : priorCard.revision + 1;
  const cardProv = cardProvenanceId(visualIdentity, cardRevision);
  const photoProv = photoProvenanceId(visualIdentity);
  const civil = current.presentation.civilIdentity;
  const subject = current.presentation.subject;
  const authoritySources = unique([
    visualIdentity.embodimentId,
    ...visualIdentity.sourceReferences,
    ...visualIdentity.permissionReferences,
  ]);
  const cardSources = unique([
    civil.registrationId,
    ...civil.sourceReferences,
    ...authoritySources,
  ]);
  const dateField = subject.birthDate !== null
    ? { kind: "birth_date", value: subject.birthDate }
    : { kind: "entry_date", value: civil.registeredAt.slice(0, 10) };
  const credentialId = `fic_${civil.registrationId}_${visualIdentity.embodimentId}_r${cardRevision}`;

  const identityCard = {
    credentialVersion: FIBRE_IDENTITY_CARD_CREDENTIAL_VERSION,
    credentialId,
    cardSerial: `FIC-${civil.registrationId}-R${cardRevision}`,
    revision: cardRevision,
    supersedesCredentialId: priorCard?.credentialId ?? null,
    registrationId: civil.registrationId,
    displayName: subject.displayName,
    dateField,
    issuedAt: projectedAt,
    expiresAt: null,
    status: "active",
    visibility: "public",
    officialPhotoMediaRef: mediaId,
    machineReadableCredentialRef: null,
    sourceReferences: cardSources,
    provenanceRef: cardProv,
  };

  const photo = {
    mediaId,
    kind: "image",
    role: "official_id_photo",
    status: "placeholder",
    locator: null,
    mediaType: null,
    sha256: null,
    width: null,
    height: null,
    durationMs: null,
    posterRef: null,
    unavailableReason: null,
    sourceReferences: authoritySources,
    provenanceRef: photoProv,
    generation: null,
  };

  const retainedAssets = current.media.assets.filter((asset) => asset.mediaId !== mediaId);
  const retainedProvenance = current.provenance.entries.filter((entry) => ![
    visualIdentity.provenanceRef,
    cardProv,
    photoProv,
  ].includes(entry.provenanceId));

  return normalizeThreadPresentationBundle({
    presentation: {
      ...current.presentation,
      manifest: { ...current.presentation.manifest, generatedAt: projectedAt },
      visualIdentity,
      identityCard,
    },
    media: {
      ...current.media,
      generatedAt: projectedAt,
      assets: [...retainedAssets, photo],
    },
    provenance: {
      ...current.provenance,
      generatedAt: projectedAt,
      entries: [
        ...retainedProvenance,
        {
          provenanceId: visualIdentity.provenanceRef,
          kind: "fibre_projection",
          sourceReferences: authoritySources,
          note: "Public visual identity projected from canonical World Kernel embodiment authority.",
        },
        {
          provenanceId: cardProv,
          kind: "fibre_projection",
          sourceReferences: cardSources,
          note: "Fibre identity card derived from civil identity plus the current authorized visual identity.",
        },
        {
          provenanceId: photoProv,
          kind: "generated_reconstruction",
          sourceReferences: authoritySources,
          note: "Official ID photo is downstream generated presentation media and does not establish embodiment identity.",
        },
      ],
    },
  });
}
