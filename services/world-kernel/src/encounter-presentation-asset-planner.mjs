import { ASSET_KINDS } from "#services/asset-generator/src/index.mjs";
import {
  normalizeThreadVisualIdentityProjection,
  threadVisualIdentityProjectionDigest,
} from "./thread-presentation-identity-domain.mjs";
import { presentationAssetSourceDigest } from "./presentation-asset-demand.mjs";
import {
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  sha256,
} from "./persistence-common.mjs";
import {
  CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,
  ageYearsAt,
} from "./visual-identity-reference-domain.mjs";

function unique(values) { return [...new Set(values)]; }

function visualBindingMap(values) {
  if (!Array.isArray(values)) throw new TypeError("encounter visual identities must be an array");
  const byThread = new Map();
  for (const value of values) {
    assertPlainObject("encounter visual identity binding", value);
    assertId("encounter visual identity threadId", value.threadId);
    if (byThread.has(value.threadId)) throw new TypeError("encounter visual identity binding is duplicated");
    const visualIdentity = normalizeThreadVisualIdentityProjection(value.visualIdentity ?? null);
    if (visualIdentity === null) throw new TypeError("encounter visual identity projection is required");
    byThread.set(value.threadId, Object.freeze({
      threadId:value.threadId,
      birthDate:value.birthDate ?? null,
      visualIdentity,
    }));
  }
  return byThread;
}

function normalizedEncounter(encounterStory) {
  assertPlainObject("Encounter Story", encounterStory);
  assertId("Encounter Story.encounterId", encounterStory.encounterId);
  assertIsoTimestamp("Encounter Story.occurredAt", encounterStory.occurredAt);
  if (!Array.isArray(encounterStory.threadPresence) || encounterStory.threadPresence.length < 1) {
    throw new TypeError("Encounter Story threadPresence is required");
  }
  if (!Array.isArray(encounterStory.story?.beats) || encounterStory.story.beats.length < 1) {
    throw new TypeError("Encounter Story beats are required");
  }
  assertPlainObject("Encounter Story visualization", encounterStory.visualization);
  assertNonEmpty("Encounter Story visualizationPrompt", encounterStory.visualization.visualizationPrompt);
  assertNonEmpty("Encounter Story visualizationPromptDigest", encounterStory.visualization.visualizationPromptDigest);
  if (`sha256:${sha256(encounterStory.visualization.visualizationPrompt)}`
    !== encounterStory.visualization.visualizationPromptDigest) {
    throw new TypeError("Encounter Story visualization prompt digest does not match prompt");
  }
  if (!Array.isArray(encounterStory.visualization.visualizationSourceReferences)
    || !Array.isArray(encounterStory.visualization.depictedThreadRefs)) {
    throw new TypeError("Encounter Story visualization lineage is incomplete");
  }
  return encounterStory;
}

function identityInstructions(depicted) {
  return depicted.map(({ threadId, visualIdentity, targetAgeYears }) => [
    `Thread ${threadId}: ${visualIdentity.subjectDescription}`,
    `Rendering continuity: ${visualIdentity.renderDescription}`,
    targetAgeYears === null
      ? `Preserve this identity from the canonical reference at normalized age ${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS} without asserting an unsupported exact encounter age.`
      : `Preserve this identity while age-transforming naturally from normalized reference age ${CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS} to ${targetAgeYears} years old at the encounter time.`,
  ].join(" "));
}

export function planEncounterPresentationAssetSlot({
  encounterStory: rawEncounterStory,
  visualIdentities = [],
  mediaId,
  assetKind = "image",
  variant = "objective",
} = {}) {
  const encounterStory = normalizedEncounter(rawEncounterStory);
  assertId("encounter mediaId", mediaId);
  assertNonEmpty("encounter media variant", variant);
  if (!ASSET_KINDS.includes(assetKind) || !["image", "video"].includes(assetKind)) {
    throw new TypeError("encounter rendering supports image or video");
  }

  const present = new Set(encounterStory.threadPresence.map((entry) => entry.threadId));
  const depictedThreadRefs = unique(encounterStory.visualization.depictedThreadRefs);
  for (const threadId of depictedThreadRefs) {
    assertId("Encounter Story depictedThreadRef", threadId);
    if (!present.has(threadId)) throw new TypeError("depicted Thread must be present in Encounter Story");
  }

  const bindings = visualBindingMap(visualIdentities);
  const depicted = [];
  let deferredReason = null;
  for (const threadId of depictedThreadRefs) {
    const binding = bindings.get(threadId) ?? null;
    if (binding === null || binding.visualIdentity.referenceObjectRefs.length !== 1) {
      deferredReason = "deferred_missing_visual_identity_reference";
      continue;
    }
    depicted.push(Object.freeze({
      threadId,
      visualIdentity:binding.visualIdentity,
      visualIdentityDigest:threadVisualIdentityProjectionDigest(binding.visualIdentity),
      targetAgeYears:ageYearsAt(binding.birthDate, encounterStory.occurredAt),
    }));
  }

  const ready = deferredReason === null;
  const referenceObjectRefs = ready
    ? unique(depicted.flatMap((entry) => entry.visualIdentity.referenceObjectRefs))
    : [];
  const identityInputs = ready
    ? unique(depicted.flatMap((entry) => [
        entry.visualIdentity.embodimentId,
        entry.visualIdentity.provenanceRef,
        ...entry.visualIdentity.sourceReferences,
        ...entry.visualIdentity.permissionReferences,
      ]))
    : [];
  const source = {
    encounterId:encounterStory.encounterId,
    visualizationPromptDigest:encounterStory.visualization.visualizationPromptDigest,
    visualizationSourceReferences:encounterStory.visualization.visualizationSourceReferences,
    depictedThreads:depicted.map((entry) => ({
      threadId:entry.threadId,
      visualIdentityDigest:entry.visualIdentityDigest,
      targetAgeYears:entry.targetAgeYears,
    })),
  };
  const brief = ready ? {
    description:[
      encounterStory.visualization.visualizationPrompt,
      ...identityInstructions(depicted),
    ].join("\n\n"),
    constraints:[
      "Use the Encounter Story visualization prompt as the objective scene authority; identity conditioning may only establish who a depicted Thread is and their encounter-time age.",
      "Generated encounter media is replaceable representation, not World evidence, Thread Experience, journal, memory, relationship state, or identity authority.",
      "Use each supplied canonical reference only for its matching Thread; never reuse one person\'s likeness for another.",
      "Do not add dialogue, action, emotion, motive, or hidden participants that are absent from the admitted Encounter Story.",
      ...(assetKind === "video"
        ? ["Do not invent identity-specific voices; absent an authorized voice reference, keep spoken audio non-identifying or omit it."]
        : []),
    ],
  } : null;

  return Object.freeze({
    slotKey:`encounter:${encounterStory.encounterId}:media:${mediaId}`,
    entityKind:"experience",
    entityRef:encounterStory.encounterId,
    mediaId,
    assetKind,
    role:"encounter_scene",
    variant,
    status:ready ? "missing" : "deferred",
    brief,
    inputReferences:unique([
      encounterStory.encounterId,
      ...encounterStory.visualization.visualizationSourceReferences,
      ...identityInputs,
    ]),
    referenceObjectRefs,
    sourceDigest:presentationAssetSourceDigest(source),
    provenanceRef:encounterStory.encounterId,
    deferredReason:ready ? null : deferredReason,
    context:{
      kind:"experience_presentation_media",
      eventRef:encounterStory.encounterId,
      mediaId,
      encounterStory:true,
      visualizationPromptDigest:encounterStory.visualization.visualizationPromptDigest,
      depictedThreads:source.depictedThreads,
    },
  });
}
