import { normalizeFibreCivilRegistration } from "#core/src/fibre-civil-identity.mjs";
import {
  PRESENTATION_PROVENANCE_VERSION,
  THREAD_MEDIA_PACKET_VERSION,
  THREAD_PRESENTATION_PACKET_CURRENT_VERSION,
  normalizeThreadPresentationBundle,
} from "#services/thread-presentation/src/index.mjs";
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

function optionalText(name, value) {
  if (value === undefined || value === null) return null;
  return nonEmpty(name, value);
}

function optionalStrings(name, value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  const result = value.map((item, index) => nonEmpty(`${name}[${index}]`, item));
  if (new Set(result).size !== result.length) throw new TypeError(`${name} must be unique`);
  return result;
}

function projectionIds(genesisId) {
  return Object.freeze({
    presentationId: `presentation_${genesisId}`,
    mediaPacketId: `media_${genesisId}`,
    provenancePacketId: `provenance_${genesisId}`,
    subjectProvenanceId: `prov_birth_subject_${genesisId}`,
    introductionProvenanceId: `prov_birth_projection_${genesisId}`,
    identityContextProvenanceId: `prov_birth_identity_context_${genesisId}`,
    civilIdentityProvenanceId: `prov_civil_identity_${genesisId}`,
  });
}

function projectIdentityContext(identity, genesisId, provenanceRef, sourceReferences) {
  const birthCity = optionalText("thread.identity.birthCity", identity.birthCity);
  const currentWorkCity = optionalText("thread.identity.currentWorkCity", identity.currentWorkCity);
  const culture = optionalStrings("thread.identity.culture", identity.culture);

  const places = [];
  if (birthCity !== null) {
    places.push({
      placeRef: `place_birth_${genesisId}`,
      displayName: birthCity,
      region: null,
      summary: `Birthplace recorded in the authoritative Thread identity: ${birthCity}.`,
      sourceReferences,
      provenanceRef,
      mediaRefs: [],
    });
  }
  if (currentWorkCity !== null && currentWorkCity !== birthCity) {
    places.push({
      placeRef: `place_current_work_${genesisId}`,
      displayName: currentWorkCity,
      region: null,
      summary: `Current work city recorded in the authoritative Thread identity: ${currentWorkCity}.`,
      sourceReferences,
      provenanceRef,
      mediaRefs: [],
    });
  }

  const origins = culture.map((summary, index) => ({
    originRef: `origin_culture_${index + 1}_${genesisId}`,
    title: "Cultural context",
    summary,
    sourceReferences,
    provenanceRef,
    mediaRefs: [],
  }));

  return Object.freeze({ origins, places });
}

/**
 * Derive the first public Thread Presentation bundle from committed birth facts.
 *
 * This projector exposes only identity-context facts that are explicitly carried
 * by the authoritative Thread snapshot. It does not infer biography from genome,
 * current state, opaque memory/relationship references, or legacy portrait/voice
 * references. Genesis life, memory, relationship, and place ledgers are separate
 * authorities and are private by default; they require an explicit authorized
 * presentation projection before they may enter a public packet.
 *
 * Official identity media remains deferred until canonical visual identity exists.
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
  const birthDate = optionalText("thread.identity.birthDate", identity.birthDate);
  const languages = optionalStrings("thread.identity.languages", identity.languages);

  if (genesis.threadId !== threadId) throw new TypeError("Genesis manifest Thread does not match authoritative Thread");
  if (registration.threadId !== threadId) throw new TypeError("Civil Registration Thread does not match authoritative Thread");
  if (genesis.publication?.status !== "published") throw new TypeError("newborn presentation requires a published Genesis manifest");

  const ids = projectionIds(genesisId);
  const authoritativeSources = [threadId, genesisId];
  const civilSources = [registration.registrationId, registration.birthEventRef, registration.worldRef];
  const identityContext = projectIdentityContext(
    identity,
    genesisId,
    ids.identityContextProvenanceId,
    authoritativeSources,
  );

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
        birthDate,
        languages,
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
      origins: identityContext.origins,
      places: identityContext.places,
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
          provenanceId: ids.identityContextProvenanceId,
          kind: "authoritative_fact",
          sourceReferences: authoritativeSources,
          note: "Birth place, current work place, and cultural context are projected only when explicitly present on the authoritative Thread identity.",
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
