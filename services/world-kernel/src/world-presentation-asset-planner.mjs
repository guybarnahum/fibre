import {
  assertJsonValue,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
} from "./persistence-common.mjs";
import { presentationAssetSourceDigest } from "./presentation-asset-demand.mjs";

function text(name, value) {
  assertNonEmpty(name, value);
  return value.trim();
}

function textOrEmpty(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : "";
}

function displayValue(value) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") return canonicalJson(value);
  return "";
}

function textList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string" && item.trim() !== "")
    .map((item) => item.trim());
}

function unique(values) { return [...new Set(values)]; }

function shotIdeaText(value) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of ["description", "summary", "title"]) {
      if (typeof value[key] === "string" && value[key].trim() !== "") return value[key].trim();
    }
    return canonicalJson(value);
  }
  return "";
}

function normalizeRequest(value, index) {
  const name = `world asset request[${index}]`;
  assertPlainObject(name, value);
  text(`${name}.mediaId`, value.mediaId);
  text(`${name}.role`, value.role);
  text(`${name}.description`, value.description);
  const variant = value.variant ?? "default";
  text(`${name}.variant`, variant);
  const status = value.status ?? "missing";
  if (!["missing", "ready", "unavailable", "deferred"].includes(status)) {
    throw new TypeError(`${name}.status is unsupported`);
  }
  const temporalLayer = value.temporalLayer ?? null;
  if (temporalLayer !== null) text(`${name}.temporalLayer`, temporalLayer);
  const deferredReason = value.deferredReason ?? null;
  if (status === "deferred") text(`${name}.deferredReason`, deferredReason);
  else if (deferredReason !== null) throw new TypeError(`${name}.deferredReason is only valid when deferred`);
  const sourceReferences = value.sourceReferences ?? [];
  const referenceObjectRefs = value.referenceObjectRefs ?? [];
  if (!Array.isArray(sourceReferences) || !Array.isArray(referenceObjectRefs)) {
    throw new TypeError(`${name} references must be arrays`);
  }
  sourceReferences.forEach((item, i) => text(`${name}.sourceReferences[${i}]`, item));
  referenceObjectRefs.forEach((item, i) => text(`${name}.referenceObjectRefs[${i}]`, item));
  return {
    mediaId: value.mediaId,
    role: value.role,
    description: value.description,
    variant,
    status,
    temporalLayer,
    deferredReason,
    sourceReferences: unique(sourceReferences),
    referenceObjectRefs: unique(referenceObjectRefs),
  };
}

function visualGrounding(presentation, request) {
  const profile = presentation.visualProfile;
  const temporalLayers = profile.temporalLayers ?? {};
  if (request.temporalLayer !== null && !(request.temporalLayer in temporalLayers)) {
    throw new TypeError(`WorldPresentation does not contain temporal layer ${request.temporalLayer}`);
  }
  const temporal = request.temporalLayer === null
    ? ""
    : displayValue(temporalLayers[request.temporalLayer]);
  const continuities = displayValue(temporalLayers.continuities);
  const anchors = textList(profile.visualAnchors);
  const avoid = textList(profile.avoid);
  const shotIdeas = (presentation.assetShotIdeas ?? []).map(shotIdeaText).filter(Boolean);

  const details = [
    ["Overall visual character", profile.overallCharacter],
    ["Geography and climate", profile.geographyAndClimate],
    ["Built environment", profile.builtEnvironment],
    ["Streets and public realm", profile.streetsAndPublicRealm],
    ["Interiors", profile.interiors],
    ["Materials and textures", profile.materialsAndTextures],
    ["Light and atmosphere", profile.lightAndAtmosphere],
    ["Vegetation and landscape", profile.vegetationAndLandscape],
    ["Mobility and vehicles", profile.mobilityAndVehicles],
    ["Signage and language", profile.signageAndLanguage],
    ["Clothing and everyday objects", profile.clothingAndEverydayObjects],
    ["Technology and infrastructure", profile.technologyAndInfrastructure],
    ["Public institutions", profile.publicInstitutions],
  ]
    .map(([label, value]) => [label, textOrEmpty(value)])
    .filter(([, value]) => value !== "")
    .map(([label, value]) => `${label}: ${value}.`);

  if (anchors.length > 0) details.push(`Visual anchors: ${anchors.join("; ")}.`);
  if (request.temporalLayer !== null) {
    details.push(`Temporal layer ${request.temporalLayer}: ${temporal}.`);
  }
  if (continuities !== "") details.push(`Temporal continuities: ${continuities}.`);
  if (shotIdeas.length > 0) details.push(`WorldPresentation shot ideas: ${shotIdeas.join("; ")}.`);

  return {
    description: [
      `Generated ${request.role} reconstruction for a World presentation.`,
      `${presentation.displayName}.`,
      request.description,
      ...details,
    ].join(" "),
    constraints: [
      "WorldPresentation is derived, non-cognitive presentation grounding; this generated image is not World authority.",
      "Do not invent Thread biography, memory, meaning, personality, ideology, profession, destiny, or formative significance from the environment.",
      "Do not invent a canonical likeness for any Thread or identifiable person.",
      "Preserve the requested chronology and ordinary environmental conditions without presenting the image as documentary evidence.",
      "Avoid stereotypes and provider-added narrative claims.",
      ...avoid.map((item) => `Avoid: ${item}`),
    ],
  };
}

function normalizeWorldPresentation(presentation) {
  assertPlainObject("WorldPresentation", presentation);
  if (presentation.authority !== "derived_non_cognitive_presentation") {
    throw new TypeError("WorldPresentation.authority must be derived_non_cognitive_presentation");
  }
  text("WorldPresentation.worldSpecRef", presentation.worldSpecRef);
  text("WorldPresentation.worldSpecDigest", presentation.worldSpecDigest);
  text("WorldPresentation.presentationRevision", presentation.presentationRevision);
  text("WorldPresentation.displayName", presentation.displayName);
  assertPlainObject("WorldPresentation.visualProfile", presentation.visualProfile);
  assertJsonValue("WorldPresentation.visualProfile", presentation.visualProfile);
  if (presentation.assetShotIdeas !== undefined) {
    if (!Array.isArray(presentation.assetShotIdeas)) {
      throw new TypeError("WorldPresentation.assetShotIdeas must be an array");
    }
    assertJsonValue("WorldPresentation.assetShotIdeas", presentation.assetShotIdeas);
  }
  return presentation;
}

export function planWorldPresentationAssetSlots({
  worldRef,
  presentation: rawPresentation,
  assetRequests,
}) {
  text("worldRef", worldRef);
  const presentation = normalizeWorldPresentation(rawPresentation);
  if (!Array.isArray(assetRequests) || assetRequests.length === 0) {
    throw new TypeError("assetRequests must be a non-empty presentation-owned array");
  }
  const requests = assetRequests.map(normalizeRequest);
  const seen = new Set();
  const slots = requests.map((request) => {
    if (seen.has(request.mediaId)) throw new TypeError(`duplicate World presentation mediaId ${request.mediaId}`);
    seen.add(request.mediaId);
    const brief = visualGrounding(presentation, request);
    const source = {
      worldRef,
      worldSpecRef: presentation.worldSpecRef,
      worldSpecDigest: presentation.worldSpecDigest,
      visualProfile: presentation.visualProfile,
      assetShotIdeas: presentation.assetShotIdeas ?? [],
      request,
    };
    return {
      slotKey: `world:${worldRef}:media:${request.mediaId}`,
      entityKind: "world",
      entityRef: worldRef,
      mediaId: request.mediaId,
      assetKind: "image",
      role: request.role,
      variant: request.variant,
      status: request.status,
      brief: request.status === "missing" ? brief : null,
      inputReferences: unique([
        worldRef,
        presentation.worldSpecRef,
        ...request.sourceReferences,
      ]),
      referenceObjectRefs: request.referenceObjectRefs,
      sourceDigest: presentationAssetSourceDigest(source),
      provenanceRef: null,
      deferredReason: request.status === "deferred" ? request.deferredReason : null,
      context: {
        kind: "world_presentation_media",
        worldRef,
        worldSpecRef: presentation.worldSpecRef,
        worldSpecDigest: presentation.worldSpecDigest,
        presentationRevision: presentation.presentationRevision,
        mediaId: request.mediaId,
        temporalLayer: request.temporalLayer,
      },
    };
  });

  return Object.freeze({
    worldRef,
    worldSpecRef: presentation.worldSpecRef,
    worldSpecDigest: presentation.worldSpecDigest,
    presentationRevision: presentation.presentationRevision,
    slots: Object.freeze(slots),
  });
}
