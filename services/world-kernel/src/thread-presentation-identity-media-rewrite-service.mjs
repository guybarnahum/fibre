import {
  FIBRE_IDENTITY_CARD_CREDENTIAL_VERSION,
  threadVisualIdentityProjectionDigest,
} from "./thread-presentation-identity-domain.mjs";
import { normalizeThreadPresentationBundle } from "./thread-presentation-domain.mjs";
import { assertId, canonicalJson, sha256 } from "./persistence-common.mjs";

export class ThreadPresentationIdentityMediaConflictError extends Error {}

function assertIsoTimestamp(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${name} must be an ISO timestamp`);
  }
  return value;
}

function unique(values) {
  return [...new Set(values)];
}

function cardSourceReferences(presentation) {
  const civil = presentation.civilIdentity;
  const visual = presentation.visualIdentity;
  return unique([
    civil.registrationId,
    civil.provenanceRef,
    ...civil.sourceReferences,
    visual.embodimentId,
    visual.provenanceRef,
    visual.specificationDigest,
    ...visual.sourceReferences,
    ...visual.permissionReferences,
    ...visual.referenceObjectRefs,
  ]);
}

function identityMediaIdentity(presentation, issuedAt) {
  const visualIdentityDigest = threadVisualIdentityProjectionDigest(presentation.visualIdentity);
  const digest = sha256(canonicalJson({
    threadId: presentation.manifest.threadId,
    registrationId: presentation.civilIdentity.registrationId,
    visualIdentityDigest,
    issuedAt,
  }));
  return Object.freeze({
    digest,
    visualIdentityDigest,
    credentialId: `fibre_card_${digest}`,
    cardSerial: `FIC-${digest.slice(0, 16).toUpperCase()}`,
    photoMediaId: `media_official_id_photo_${digest.slice(0, 32)}`,
    cardProvenanceRef: `prov_identity_card_${digest}`,
    photoProvenanceRef: `prov_official_id_photo_${digest}`,
  });
}

function cardDateField(presentation) {
  if (presentation.subject.birthDate !== null) {
    return { kind: "birth_date", value: presentation.subject.birthDate };
  }
  return { kind: "entry_date", value: presentation.civilIdentity.registeredAt.slice(0, 10) };
}

function buildIdentityCard(presentation, identity, issuedAt, sourceReferences) {
  return {
    credentialVersion: FIBRE_IDENTITY_CARD_CREDENTIAL_VERSION,
    credentialId: identity.credentialId,
    cardSerial: identity.cardSerial,
    revision: 1,
    supersedesCredentialId: null,
    registrationId: presentation.civilIdentity.registrationId,
    displayName: presentation.subject.displayName,
    dateField: cardDateField(presentation),
    issuedAt,
    expiresAt: null,
    status: "active",
    visibility: "public",
    officialPhotoMediaRef: identity.photoMediaId,
    machineReadableCredentialRef: null,
    sourceReferences,
    provenanceRef: identity.cardProvenanceRef,
  };
}

function buildOfficialPhotoPlaceholder(identityCard, identity, sourceReferences) {
  return {
    mediaId: identity.photoMediaId,
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
    sourceReferences: unique([
      identityCard.credentialId,
      identityCard.provenanceRef,
      ...sourceReferences,
    ]),
    provenanceRef: identity.photoProvenanceRef,
    generation: null,
  };
}

function provenanceEntries(photo, identity, sourceReferences) {
  return [
    {
      provenanceId: identity.cardProvenanceRef,
      kind: "fibre_projection",
      sourceReferences,
      note: "Fibre Identity Card metadata projected from the current authoritative civil identity and admitted public visual identity. The credential does not create or redefine either authority.",
    },
    {
      provenanceId: identity.photoProvenanceRef,
      kind: "generated_reconstruction",
      sourceReferences: photo.sourceReferences,
      note: "Official identity-photo placeholder. Generation must use the admitted canonical visual-identity root and chronology-derived target age; the resulting image remains derived presentation media.",
    },
  ];
}

function existingIdentityMedia(bundle) {
  const card = bundle.presentation.identityCard;
  if (card === null) return null;
  const photo = bundle.media.assets.find((asset) => asset.mediaId === card.officialPhotoMediaRef);
  if (!photo || photo.kind !== "image" || photo.role !== "official_id_photo") {
    throw new ThreadPresentationIdentityMediaConflictError(
      "existing Fibre Identity Card does not resolve to its official identity-photo media slot",
    );
  }
  const visual = bundle.presentation.visualIdentity;
  const civil = bundle.presentation.civilIdentity;
  const currentSourcesPresent = card.registrationId === civil.registrationId
    && card.sourceReferences.includes(visual.provenanceRef)
    && visual.referenceObjectRefs.every((reference) => card.sourceReferences.includes(reference));
  if (!currentSourcesPresent) {
    throw new ThreadPresentationIdentityMediaConflictError(
      "existing Fibre Identity Card is not grounded in the current civil/visual identity; explicit credential reissue is required",
    );
  }
  return { card, photo };
}

function publicationIdentity(current, identityCard) {
  const digest = sha256(canonicalJson({
    priorSnapshotDigest: current.pointer.snapshotDigest,
    credentialId: identityCard.credentialId,
    officialPhotoMediaRef: identityCard.officialPhotoMediaRef,
  }));
  return Object.freeze({
    objectRef: `snapshot_identity_media_${digest}`,
    snapshotVersion: `identity-media-${digest.slice(0, 24)}`,
  });
}

export function createThreadPresentationIdentityMediaRewriteService({ presentationServer } = {}) {
  if (!presentationServer
    || typeof presentationServer.getSnapshot !== "function"
    || typeof presentationServer.publishSnapshot !== "function") {
    throw new TypeError("identity media rewrite service requires a PresentationServer");
  }

  return Object.freeze({
    async ensureOfficialIdentityMedia({ channelId, issuedAt } = {}) {
      assertId("channelId", channelId);
      assertIsoTimestamp("issuedAt", issuedAt);
      const current = await presentationServer.getSnapshot(channelId);
      if (current === null) {
        throw new ThreadPresentationIdentityMediaConflictError(
          "Fibre Identity Card issuance requires an existing Thread presentation snapshot",
        );
      }
      const bundle = normalizeThreadPresentationBundle({
        presentation: current.snapshot.presentation,
        media: current.snapshot.media,
        provenance: current.snapshot.provenance,
      });
      const { presentation } = bundle;
      if (current.pointer.threadId !== presentation.manifest.threadId) {
        throw new ThreadPresentationIdentityMediaConflictError(
          "presentation snapshot pointer belongs to a different Thread",
        );
      }
      if (presentation.manifest.fixture === true || presentation.manifest.lifecycleStatus === "genesis_candidate") {
        throw new ThreadPresentationIdentityMediaConflictError(
          "Fibre Identity Card cannot be issued into a Genesis candidate or fixture presentation",
        );
      }
      if (presentation.civilIdentity === null) {
        throw new ThreadPresentationIdentityMediaConflictError(
          "Fibre Identity Card issuance requires authoritative civil identity projection",
        );
      }
      if (presentation.visualIdentity === null || presentation.visualIdentity.referenceObjectRefs.length !== 1) {
        throw new ThreadPresentationIdentityMediaConflictError(
          "Fibre Identity Card issuance requires one admitted canonical visual-identity reference",
        );
      }

      const existing = existingIdentityMedia(bundle);
      if (existing !== null) {
        return Object.freeze({
          rewritten: false,
          reused: true,
          identityCard: existing.card,
          officialPhoto: existing.photo,
          publication: current,
        });
      }
      if (bundle.media.assets.some((asset) => asset.role === "official_id_photo")) {
        throw new ThreadPresentationIdentityMediaConflictError(
          "an unbound official identity-photo slot already exists in the presentation",
        );
      }
      if (Date.parse(issuedAt) < Date.parse(presentation.manifest.generatedAt)
        || Date.parse(issuedAt) < Date.parse(presentation.civilIdentity.registeredAt)) {
        throw new ThreadPresentationIdentityMediaConflictError(
          "Fibre Identity Card issuedAt cannot precede its presentation or civil identity authority",
        );
      }

      const identity = identityMediaIdentity(presentation, issuedAt);
      const sourceReferences = cardSourceReferences(presentation);
      const identityCard = buildIdentityCard(presentation, identity, issuedAt, sourceReferences);
      const officialPhoto = buildOfficialPhotoPlaceholder(identityCard, identity, sourceReferences);
      const addedProvenance = provenanceEntries(officialPhoto, identity, sourceReferences);

      const nextBundle = normalizeThreadPresentationBundle({
        presentation: {
          ...bundle.presentation,
          manifest: {
            ...bundle.presentation.manifest,
            generatedAt: issuedAt,
          },
          identityCard,
        },
        media: {
          ...bundle.media,
          generatedAt: issuedAt,
          assets: [...bundle.media.assets, officialPhoto],
        },
        provenance: {
          ...bundle.provenance,
          generatedAt: issuedAt,
          entries: [...bundle.provenance.entries, ...addedProvenance],
        },
      });
      const publicationIdentityValue = publicationIdentity(current, identityCard);
      const expectedSequence = current.pointer.sequence ?? current.snapshot.cursor;
      const publication = await presentationServer.publishSnapshot({
        channelId,
        objectRef: publicationIdentityValue.objectRef,
        snapshotVersion: publicationIdentityValue.snapshotVersion,
        bundle: nextBundle,
        expectedSequence,
        catalog: {
          projectionKind: "identity_card_official_photo",
          identityCardCredentialId: identityCard.credentialId,
          officialPhotoMediaId: identityCard.officialPhotoMediaRef,
          visualIdentityDigest: identity.visualIdentityDigest,
        },
      });

      return Object.freeze({
        rewritten: true,
        reused: false,
        identityCard,
        officialPhoto,
        publication,
      });
    },
  });
}
