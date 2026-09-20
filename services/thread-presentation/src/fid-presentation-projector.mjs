import { requireInfraCapabilities } from "#infra";
import {
  FIBRE_IDENTITY_CARD_CURRENT_VERSION,
  THREAD_PRESENTATION_STREAM_VERSION,
  normalizeThreadPresentationBundle,
} from "fibre/world-kernel/thread-presentation-contracts";
import { threadPresentationChannelId } from "./public-asset-resolver.mjs";

const CARD_ROLES = new Set(["fibre_identity_card", "fibre_identity_card_front", "fibre_identity_card_back"]);
const FID_CARD_ASSET_MEDIA_TYPE = "application/vnd.fibre.identity-card+json";
const FID_CARD_ASSET_SCHEMA_VERSION = "fibre-identity-card-asset-v0.1";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function iso(name, value) {
  nonEmpty(name, value);
  if (!Number.isFinite(Date.parse(value))) throw new TypeError(`${name} must be an ISO timestamp`);
  return new Date(value).toISOString();
}

function utf8(value) {
  return new TextEncoder().encode(value);
}

async function sha256Digest(bytes) {
  const raw = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return `sha256:${[...raw].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function createFidCardAssetDescriptor(active) {
  return Object.freeze({
    schemaVersion:FID_CARD_ASSET_SCHEMA_VERSION,
    credentialId:active.credentialId,
    revision:active.revision,
    aspectRatio:1.586,
    interaction:Object.freeze({ flip:"click", initialSide:"front" }),
    front:Object.freeze({
      objectRef:active.front.objectRef,
      digest:active.front.digest,
      mediaType:active.front.mediaType,
      width:active.front.width,
      height:active.front.height,
    }),
    back:Object.freeze({
      objectRef:active.back.objectRef,
      digest:active.back.digest,
      mediaType:active.back.mediaType,
      width:active.back.width,
      height:active.back.height,
    }),
  });
}

export async function materializeFidCardAsset(infra, active) {
  if (active === null) return null;
  const descriptor = createFidCardAssetDescriptor(active);
  const bytes = utf8(JSON.stringify(descriptor));
  const digest = await sha256Digest(bytes);
  const objectRef = `fidcard_${active.credentialId}_card`;
  await infra.objects.putImmutable(objectRef, bytes, digest, {
    kind:"fibre_identity_card_asset",
    credentialId:active.credentialId,
    revision:active.revision,
    mediaType:FID_CARD_ASSET_MEDIA_TYPE,
  });
  return Object.freeze({
    ...active,
    cardAsset:Object.freeze({
      objectRef,
      digest,
      mediaType:FID_CARD_ASSET_MEDIA_TYPE,
      descriptor,
    }),
  });
}

function mediaId(credentialId, side) { return `media_fid_${credentialId}_${side}`; }
function provenanceId(credentialId) { return `prov_fid_${credentialId}`; }

function activeFid(value, threadId) {
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("active FID projection is invalid");
  if (value.threadId !== threadId || value.status !== "active") throw new TypeError("Thread Presentation accepts only this Thread's active FID");
  for (const name of ["credentialId", "registrationId", "issuerAuthorityId", "issuanceRecordDigest", "photoAdmissionId", "photoDigest"]) {
    nonEmpty(`active FID ${name}`, value[name]);
  }
  if (!Number.isSafeInteger(value.revision) || value.revision < 1) throw new TypeError("active FID revision is invalid");
  if (value.proofStatus !== "verified") throw new TypeError("active FID proof must be verified");
  for (const side of ["front", "back"]) {
    const media = value[side];
    if (!media || typeof media !== "object") throw new TypeError(`active FID ${side} media is required`);
    nonEmpty(`active FID ${side} objectRef`, media.objectRef);
    nonEmpty(`active FID ${side} digest`, media.digest);
    if (media.mediaType !== "image/png" || !Number.isSafeInteger(media.width) || !Number.isSafeInteger(media.height)) {
      throw new TypeError(`active FID ${side} media must be a sized PNG`);
    }
  }
  if (value.cardAsset !== undefined && value.cardAsset !== null) {
    nonEmpty("active FID card asset objectRef", value.cardAsset.objectRef);
    nonEmpty("active FID card asset digest", value.cardAsset.digest);
    if (value.cardAsset.mediaType !== FID_CARD_ASSET_MEDIA_TYPE) {
      throw new TypeError("active FID card asset media type is invalid");
    }
  }
  return value;
}

function withoutPriorCard(bundle) {
  const card = bundle.presentation.identityCard;
  if (card === null) return bundle;
  const cardMedia = new Set([
    card.frontMediaRef,
    card.backMediaRef,
  ].filter(Boolean));
  const removedAssets = bundle.media.assets.filter((asset) => cardMedia.has(asset.mediaId) || CARD_ROLES.has(asset.role));
  const removedProvenance = new Set([card.provenanceRef, ...removedAssets.map((asset) => asset.provenanceRef)]);
  return {
    presentation: { ...bundle.presentation, identityCard: null },
    media: { ...bundle.media, assets: bundle.media.assets.filter((asset) => !removedAssets.includes(asset)) },
    provenance: { ...bundle.provenance, entries: bundle.provenance.entries.filter((entry) => !removedProvenance.has(entry.provenanceId)) },
  };
}

function fidMedia(active, side, provenanceRef, sourceReferences) {
  const media = active[side];
  return {
    mediaId: mediaId(active.credentialId, side),
    kind: "image",
    role: `fibre_identity_card_${side}`,
    status: "ready",
    locator: media.objectRef,
    mediaType: media.mediaType,
    sha256: media.digest,
    width: media.width,
    height: media.height,
    durationMs: null,
    posterRef: null,
    unavailableReason: null,
    sourceReferences,
    provenanceRef,
    generation: null,
  };
}

function fidCardMedia(active, provenanceRef, sourceReferences) {
  if (!active.cardAsset) return null;
  return {
    mediaId:mediaId(active.credentialId, "card"),
    kind:"document",
    role:"fibre_identity_card",
    status:"ready",
    locator:active.cardAsset.objectRef,
    mediaType:active.cardAsset.mediaType,
    sha256:active.cardAsset.digest,
    width:null,
    height:null,
    durationMs:null,
    posterRef:null,
    unavailableReason:null,
    sourceReferences,
    provenanceRef,
    generation:null,
  };
}

function alreadyProjectsActiveFid(bundle, active, visibility) {
  const card = bundle.presentation.identityCard;
  if (active === null) return card === null;
  if (card?.credentialVersion !== FIBRE_IDENTITY_CARD_CURRENT_VERSION
    || card.credentialId !== active.credentialId
    || card.visibility !== visibility
    || card.status !== "active"
    || card.proofStatus !== active.proofStatus) return false;
  for (const side of ["front", "back"]) {
    const ref = card[`${side}MediaRef`];
    const media = bundle.media.assets.find((asset) => asset.mediaId === ref);
    if (!media || media.locator !== active[side].objectRef || media.sha256 !== active[side].digest) return false;
  }
  if (active.cardAsset) {
    const cardMedia = bundle.media.assets.find((asset) => asset.mediaId === mediaId(active.credentialId, "card"));
    if (!cardMedia || cardMedia.role !== "fibre_identity_card"
      || cardMedia.locator !== active.cardAsset.objectRef || cardMedia.sha256 !== active.cardAsset.digest) return false;
  }
  return true;
}

export function projectFidThreadPresentation({ bundle: candidate, activeFid: candidateFid, projectedAt, visibility = "public" } = {}) {
  const current = normalizeThreadPresentationBundle(candidate);
  const threadId = current.presentation.manifest.threadId;
  const fid = activeFid(candidateFid, threadId);
  const at = iso("FID projectedAt", projectedAt);
  if (!new Set(["public", "restricted", "private"]).has(visibility)) throw new TypeError("FID visibility is invalid");
  if (Date.parse(at) < Date.parse(current.presentation.manifest.generatedAt)) {
    throw new TypeError("FID projection cannot predate the current presentation");
  }
  if (alreadyProjectsActiveFid(current, fid, visibility)) return current;

  const base = withoutPriorCard(current);
  if (fid === null) {
    return normalizeThreadPresentationBundle({
      presentation: { ...base.presentation, manifest: { ...base.presentation.manifest, generatedAt: at } },
      media: { ...base.media, generatedAt: at },
      provenance: { ...base.provenance, generatedAt: at },
    });
  }
  if (base.presentation.civilIdentity?.registrationId !== fid.registrationId) {
    throw new TypeError("active FID registration does not match presented civil identity");
  }

  const provenanceRef = provenanceId(fid.credentialId);
  const sourceReferences = [fid.credentialId, fid.issuanceRecordDigest, fid.photoAdmissionId, fid.photoDigest];
  const front = fidMedia(fid, "front", provenanceRef, sourceReferences);
  const back = fidMedia(fid, "back", provenanceRef, sourceReferences);
  const cardAsset = fidCardMedia(fid, provenanceRef, sourceReferences);
  const identityCard = {
    credentialVersion: FIBRE_IDENTITY_CARD_CURRENT_VERSION,
    credentialId: fid.credentialId,
    revision: fid.revision,
    supersedesCredentialId: fid.supersedesCredentialId,
    registrationId: fid.registrationId,
    issuedAt: fid.issuedAt,
    expiresAt: fid.expiresAt,
    status: "active",
    visibility,
    frontMediaRef: front.mediaId,
    backMediaRef: back.mediaId,
    issuerAuthorityId: fid.issuerAuthorityId,
    proofStatus: fid.proofStatus,
    sourceReferences,
    provenanceRef,
  };

  return normalizeThreadPresentationBundle({
    presentation: { ...base.presentation, manifest: { ...base.presentation.manifest, generatedAt: at }, identityCard },
    media: { ...base.media, generatedAt: at, assets: [...base.media.assets, front, back, ...(cardAsset ? [cardAsset] : [])] },
    provenance: {
      ...base.provenance,
      generatedAt: at,
      entries: [...base.provenance.entries, {
        provenanceId: provenanceRef,
        kind: "fibre_projection",
        sourceReferences,
        note: "Active Fibre Identity Card projected from Fibre Identity Authority; presentation does not issue or alter the credential.",
      }],
    },
  });
}

async function requireStoredMedia(infra, active) {
  if (active === null) return;
  for (const side of ["front", "back"]) {
    const stored = await infra.objects.get(active[side].objectRef);
    if (stored === null || stored.digest !== active[side].digest) {
      throw new Error(`active FID ${side} does not match immutable object storage`);
    }
  }
  if (active.cardAsset) {
    const stored = await infra.objects.get(active.cardAsset.objectRef);
    if (stored === null || stored.digest !== active.cardAsset.digest) {
      throw new Error("active FID rich card asset does not match immutable object storage");
    }
  }
}

export function createFidPresentationProjectionService({ presentationServer, infra } = {}) {
  requireInfraCapabilities(infra, "objects", "catalog");
  if (!presentationServer || typeof presentationServer.getSnapshot !== "function"
    || typeof presentationServer.publishSnapshot !== "function" || typeof presentationServer.appendEvent !== "function") {
    throw new TypeError("FID presentation projection requires a PresentationServer");
  }

  return Object.freeze({
    async reconcile({ threadId: candidateThreadId, activeFid: candidateFid, projectedAt, visibility = "public" } = {}) {
      const threadId = nonEmpty("threadId", candidateThreadId);
      const authoritativeActive = activeFid(candidateFid, threadId);
      const active = await materializeFidCardAsset(infra, authoritativeActive);
      const at = iso("FID projectedAt", projectedAt);
      const channelId = threadPresentationChannelId(threadId);
      const current = await presentationServer.getSnapshot(channelId);
      if (current === null) return Object.freeze({ changed: false, active: false, reason: "presentation_missing" });
      await requireStoredMedia(infra, active);
      const currentBundle = {
        presentation: current.snapshot.presentation,
        media: current.snapshot.media,
        provenance: current.snapshot.provenance,
      };
      if (alreadyProjectsActiveFid(currentBundle, active, visibility)) {
        return Object.freeze({ changed: false, active: active !== null, credentialId: active?.credentialId ?? null });
      }
      const projected = projectFidThreadPresentation({ bundle: currentBundle, activeFid: active, projectedAt: at, visibility });

      const events = [];
      if (active !== null) {
        for (const part of ["front", "back", "card"]) {
          const media = projected.media.assets.find((asset) => asset.mediaId === mediaId(active.credentialId, part));
          if (!media) continue;
          const accepted = await presentationServer.appendEvent({
            streamVersion: THREAD_PRESENTATION_STREAM_VERSION,
            eventId: `fid_media_${active.credentialId}_${part}`,
            threadId,
            channelId,
            occurredAt: at,
            emittedAt: at,
            kind: "media.ready",
            provenanceRef: media.provenanceRef,
            sourceReferences: media.sourceReferences,
            payload: { mediaId: media.mediaId, objectRef: media.locator, mediaType: media.mediaType, digest: media.sha256 },
          });
          events.push({ media, event: accepted.event });
        }
      }

      const head = await presentationServer.getHead(channelId);
      const publication = await presentationServer.publishSnapshot({
        channelId,
        objectRef: `snapshot_fid_${threadId}_${active?.credentialId ?? "none"}_${head.sequence}`,
        snapshotVersion: `fid-${active?.credentialId ?? "none"}`,
        bundle: projected,
        expectedSequence: head.sequence,
        catalog: { publiclyVisible: true, projectionKind: "fibre_identity_card", activeFidCredentialId: active?.credentialId ?? null },
      });
      for (const { media, event } of events) {
        await infra.catalog.upsert(`media:${media.locator}`, {
          kind: "public_presentation_media",
          publiclyVisible: visibility === "public",
          identityCredentialMedia: true,
          threadId,
          mediaId: media.mediaId,
          role: media.role,
          objectRef: media.locator,
          digest: media.sha256,
          mediaType: media.mediaType,
          provenanceClass: "fibre_projection",
          eventId: event.eventId,
          eventSequence: event.sequence,
        });
      }
      return Object.freeze({ changed: true, active: active !== null, credentialId: active?.credentialId ?? null, publication });
    },
  });
}
