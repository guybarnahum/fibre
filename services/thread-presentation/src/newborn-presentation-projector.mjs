import { normalizeFibreCivilRegistration } from "#core/src/fibre-civil-identity.mjs";
import {
  PRESENTATION_PROVENANCE_VERSION,
  THREAD_MEDIA_PACKET_VERSION,
  THREAD_PRESENTATION_PACKET_CURRENT_VERSION,
  normalizeThreadPresentationBundle,
} from "#services/world-kernel/src/thread-presentation-domain.mjs";
import { civilRegistrationToPresentationCivilIdentity } from "./civil-identity-projection.mjs";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} is required`);
  }
  return value;
}

function object(name, value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function projectionIds(genesisId) {
  return Object.freeze({
    presentationId: `presentation_${genesisId}`,
    mediaPacketId: `media_${genesisId}`,
    provenancePacketId: `provenance_${genesisId}`,
    subjectProvenanceId: `prov_birth_subject_${genesisId}`,
    introductionProvenanceId: `prov_birth_projection_${genesisId}`,
    civilIdentityProvenanceId: `prov_civil_identity_${genesisId}`,
  });
}

/**
 * Derive the first public Thread Presentation bundle from committed birth facts.
 *
 * This projector intentionally does not invent embodiment, identity-card, media,
 * memories, meanings, relationships, places, or historical narrative. Those
 * projections require their own authoritative inputs. In particular, the
 * official identity image must remain deferred until canonical visual identity
 * exists.
 */
export function projectNewbornThreadPresentation({ thread, manifest, civilRegistration }) {
  const authoritativeThread = object("thread", thread);
  const genesis = object("manifest", manifest);
  const identity = object("thread.identity", authoritativeThread.identity);
  const registration = normalizeFibreCivilRegistration(civilRegistration);

  const threadId = nonEmpty("thread.threadId", authoritativeThread.threadId);
  const genesisId = nonEmpty("manifest.genesisId", genesis.genesisId);
  const publishedAt = nonEmpty("manifest.publication.publishedAt", genesis.publication?.publishedAt);
  const displayName = nonEmpty("thread.identity.name", identity.name);
  const selfDescription = nonEmpty("thread.identity.selfDescription", identity.selfDescription);

  if (genesis.threadId !== threadId) throw new TypeError("Genesis manifest Thread does not match authoritative Thread");
  if (registration.threadId !== threadId) throw new TypeError("Civil Registration Thread does not match authoritative Thread");
  if (genesis.publication?.status !== "published") throw new TypeError("newborn presentation requires a published Genesis manifest");

  const ids = projectionIds(genesisId);
  const authoritativeSources = [threadId, genesisId];
  const civilSources = [registration.registrationId, registration.birthEventRef, registration.worldRef];

  const bundle = {
    presentation: {
      schemaVersion: THREAD_PRESENTATION_PACKET_CURRENT_VERSION,
      manifest: {
        presentationId: ids.presentationId,
        threadId,
        lifecycleStatus: authoritativeThread.status,
        fixture: false,
        generatedAt: publishedAt,
        mediaPacketId: ids.mediaPacketId,
        provenancePacketId: ids.provenancePacketId,
      },
      subject: {
        displayName,
        birthDate: typeof identity.birthDate === "string" ? identity.birthDate : null,
        languages: Array.isArray(identity.languages) ? [...identity.languages] : [],
        homePlaceRef: null,
        provenanceRef: ids.subjectProvenanceId,
      },
      introduction: {
        headline: displayName,
        summary: selfDescription,
        sourceReferences: authoritativeSources,
        provenanceRef: ids.introductionProvenanceId,
        mediaRefs: [],
      },
      origins: [],
      places: [],
      relationships: [],
      life: { timeline: [] },
      memories: [],
      meanings: [],
      civilIdentity: civilRegistrationToPresentationCivilIdentity(registration, {
        provenanceRef: ids.civilIdentityProvenanceId,
      }),
      visualIdentity: null,
      identityCard: null,
    },
    media: {
      schemaVersion: THREAD_MEDIA_PACKET_VERSION,
      mediaPacketId: ids.mediaPacketId,
      threadId,
      generatedAt: publishedAt,
      assets: [],
    },
    provenance: {
      schemaVersion: PRESENTATION_PROVENANCE_VERSION,
      provenancePacketId: ids.provenancePacketId,
      threadId,
      generatedAt: publishedAt,
      entries: [
        {
          provenanceId: ids.subjectProvenanceId,
          kind: "authoritative_fact",
          sourceReferences: authoritativeSources,
          note: "Subject identity projected from the authoritative newborn Thread and published Genesis manifest.",
        },
        {
          provenanceId: ids.introductionProvenanceId,
          kind: "fibre_projection",
          sourceReferences: authoritativeSources,
          note: "Initial public introduction projected from the Thread's own authoritative self-description.",
        },
        {
          provenanceId: ids.civilIdentityProvenanceId,
          kind: "authoritative_fact",
          sourceReferences: civilSources,
          note: "Civil identity projected from the authoritative Fibre Civil Registration.",
        },
      ],
    },
  };

  return normalizeThreadPresentationBundle(bundle);
}
