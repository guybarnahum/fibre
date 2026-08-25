import {
  assertIsoTimestamp,
  assertJsonValue,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
} from "./persistence-common.mjs";
import { presentationAssetSourceDigest } from "./presentation-asset-demand.mjs";

function nonEmpty(name, value) {
  assertNonEmpty(name, value);
  return value.trim();
}

function unique(values) { return [...new Set(values)]; }

function refs(name, value) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  value.forEach((item, index) => nonEmpty(`${name}[${index}]`, item));
  return value;
}

function displayValue(value) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") return canonicalJson(value);
  return "";
}

function normalizeExperience(value) {
  assertPlainObject("presented experience", value);
  nonEmpty("presented experience.eventRef", value.eventRef);
  nonEmpty("presented experience.title", value.title);
  nonEmpty("presented experience.summary", value.summary);
  assertIsoTimestamp("presented experience.occurredAt", value.occurredAt);
  refs("presented experience.sourceReferences", value.sourceReferences);
  if (value.sourceReferences.length === 0) {
    throw new TypeError("presented experience.sourceReferences must not be empty");
  }
  if (value.placeRef !== null && value.placeRef !== undefined) {
    nonEmpty("presented experience.placeRef", value.placeRef);
  }
  if (value.provenanceRef !== null && value.provenanceRef !== undefined) {
    nonEmpty("presented experience.provenanceRef", value.provenanceRef);
  }
  return value;
}

function normalizePlace(value) {
  if (value === null) return null;
  assertPlainObject("presented place", value);
  nonEmpty("presented place.placeRef", value.placeRef);
  nonEmpty("presented place.displayName", value.displayName);
  nonEmpty("presented place.summary", value.summary);
  refs("presented place.sourceReferences", value.sourceReferences ?? []);
  return value;
}

function normalizeMemory(value) {
  if (value === null) return null;
  assertPlainObject("presented memory", value);
  nonEmpty("presented memory.memoryRef", value.memoryRef);
  nonEmpty("presented memory.rememberedContent", value.rememberedContent);
  if (!Array.isArray(value.uncertainty)) throw new TypeError("presented memory.uncertainty must be an array");
  value.uncertainty.forEach((item, index) => nonEmpty(`presented memory.uncertainty[${index}]`, item));
  refs("presented memory.sourceReferences", value.sourceReferences ?? []);
  return value;
}

function normalizeWorld(value) {
  if (value === null) return null;
  assertPlainObject("WorldPresentation", value);
  if (value.authority !== "derived_non_cognitive_presentation") {
    throw new TypeError("WorldPresentation.authority must be derived_non_cognitive_presentation");
  }
  nonEmpty("WorldPresentation.worldSpecRef", value.worldSpecRef);
  nonEmpty("WorldPresentation.worldSpecDigest", value.worldSpecDigest);
  nonEmpty("WorldPresentation.presentationRevision", value.presentationRevision);
  assertPlainObject("WorldPresentation.visualProfile", value.visualProfile);
  assertJsonValue("WorldPresentation.visualProfile", value.visualProfile);
  return value;
}

function experienceBrief({
  experience,
  place,
  world,
  memory,
  temporalLayer,
}) {
  const sections = [
    "Generated scene reconstruction for an Experience presentation.",
    `Presented historical/event context: ${experience.title}. ${experience.summary}`,
    `Occurred at: ${experience.occurredAt}.`,
  ];
  if (place !== null) {
    sections.push(
      `Presented place context: ${place.displayName}${place.region ? ` — ${place.region}` : ""}. ${place.summary}`,
    );
  }
  if (world !== null) {
    const profile = world.visualProfile;
    const grounding = [
      displayValue(profile.overallCharacter),
      displayValue(profile.geographyAndClimate),
      displayValue(profile.builtEnvironment),
      displayValue(profile.streetsAndPublicRealm),
      displayValue(profile.interiors),
      displayValue(profile.materialsAndTextures),
      displayValue(profile.lightAndAtmosphere),
      displayValue(profile.publicInstitutions),
    ].filter(Boolean);
    if (grounding.length > 0) {
      sections.push(`WorldPresentation visual grounding: ${grounding.join(" ")}`);
    }
    const anchors = Array.isArray(profile.visualAnchors)
      ? profile.visualAnchors.map(displayValue).filter(Boolean)
      : [];
    if (anchors.length > 0) sections.push(`Visual anchors: ${anchors.join("; ")}.`);
    if (temporalLayer !== null) {
      const layers = profile.temporalLayers ?? {};
      if (!(temporalLayer in layers)) {
        throw new TypeError(`WorldPresentation does not contain temporal layer ${temporalLayer}`);
      }
      sections.push(`Temporal presentation layer ${temporalLayer}: ${displayValue(layers[temporalLayer])}.`);
      if (layers.continuities !== undefined) {
        sections.push(`Temporal continuities: ${displayValue(layers.continuities)}.`);
      }
    }
    const avoid = Array.isArray(profile.avoid)
      ? profile.avoid.map(displayValue).filter(Boolean)
      : [];
    if (avoid.length > 0) sections.push(`WorldPresentation avoid guidance: ${avoid.join("; ")}.`);
  }
  if (memory !== null) {
    sections.push(
      `Remembered perspective (memory, not historical authority): ${memory.rememberedContent}`,
    );
    if (memory.uncertainty.length > 0) {
      sections.push(`Memory uncertainty: ${memory.uncertainty.join("; ")}.`);
    }
  }

  return {
    description: sections.join(" "),
    constraints: [
      "The presented event/history is distinct from autobiographical memory and from this generated reconstruction.",
      "Do not treat WorldPresentation metadata as evidence that the event occurred.",
      "Do not add historical facts that are absent from the presented event context.",
      "If memory perspective is supplied, do not convert remembered uncertainty into precise event history.",
      "Do not invent a canonical likeness for the Thread or other identifiable people without separate embodiment authority.",
      "Do not present the generated image as documentary, photographic, memory, or historical evidence.",
    ],
  };
}

export function planExperiencePresentationAssetSlots({
  experience: rawExperience,
  placePresentation = null,
  worldPresentation = null,
  worldRef = null,
  memoryPresentation = null,
  mediaId,
  variant = "default",
  temporalLayer = null,
  status = "missing",
  deferredReason = null,
  referenceObjectRefs = [],
}) {
  const experience = normalizeExperience(rawExperience);
  const place = normalizePlace(placePresentation);
  const world = normalizeWorld(worldPresentation);
  const memory = normalizeMemory(memoryPresentation);
  nonEmpty("mediaId", mediaId);
  nonEmpty("variant", variant);
  if (temporalLayer !== null) nonEmpty("temporalLayer", temporalLayer);
  if (!["missing", "ready", "unavailable", "deferred"].includes(status)) {
    throw new TypeError("experience asset status is unsupported");
  }
  if (status === "deferred") nonEmpty("deferredReason", deferredReason);
  else if (deferredReason !== null) throw new TypeError("deferredReason is only valid when deferred");
  refs("referenceObjectRefs", referenceObjectRefs);

  if (place !== null && experience.placeRef && place.placeRef !== experience.placeRef) {
    throw new TypeError("presented place does not match experience.placeRef");
  }
  if (world !== null && worldRef === null) {
    throw new TypeError("worldRef is required when WorldPresentation grounding is supplied");
  }
  if (worldRef !== null) nonEmpty("worldRef", worldRef);

  const brief = experienceBrief({ experience, place, world, memory, temporalLayer });
  const source = {
    experience: {
      eventRef: experience.eventRef,
      title: experience.title,
      summary: experience.summary,
      occurredAt: experience.occurredAt,
      placeRef: experience.placeRef ?? null,
      sourceReferences: experience.sourceReferences,
      provenanceRef: experience.provenanceRef ?? null,
    },
    place,
    world: world === null ? null : {
      worldRef,
      worldSpecRef: world.worldSpecRef,
      worldSpecDigest: world.worldSpecDigest,
      visualProfile: world.visualProfile,
    },
    memory,
    temporalLayer,
  };
  const inputReferences = unique([
    experience.eventRef,
    ...experience.sourceReferences,
    ...(place?.sourceReferences ?? []),
    ...(world === null ? [] : [worldRef, world.worldSpecRef]),
    ...(memory?.sourceReferences ?? []),
  ]);

  const slot = {
    slotKey: `experience:${experience.eventRef}:media:${mediaId}`,
    entityKind: "experience",
    entityRef: experience.eventRef,
    mediaId,
    assetKind: "image",
    role: "experience_scene",
    variant,
    status,
    brief: status === "missing" ? brief : null,
    inputReferences,
    referenceObjectRefs: unique(referenceObjectRefs),
    sourceDigest: presentationAssetSourceDigest(source),
    provenanceRef: experience.provenanceRef ?? null,
    deferredReason: status === "deferred" ? deferredReason : null,
    context: {
      kind: "experience_presentation_media",
      eventRef: experience.eventRef,
      occurredAt: experience.occurredAt,
      placeRef: experience.placeRef ?? null,
      worldRef,
      worldSpecRef: world?.worldSpecRef ?? null,
      worldSpecDigest: world?.worldSpecDigest ?? null,
      worldPresentationRevision: world?.presentationRevision ?? null,
      memoryRef: memory?.memoryRef ?? null,
      mediaId,
      temporalLayer,
    },
  };

  return Object.freeze({
    experienceRef: experience.eventRef,
    slots: Object.freeze([slot]),
  });
}
