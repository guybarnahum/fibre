import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export const THREAD_PRESENTATION_PACKET_VERSION = "thread-presentation-packet-v0.1";
export const THREAD_MEDIA_PACKET_VERSION = "thread-media-packet-v0.1";
export const PRESENTATION_PROVENANCE_VERSION = "presentation-provenance-v0.1";

export const PRESENTATION_LIFECYCLE_STATUSES = Object.freeze([
  "genesis_candidate", "frozen", "thawing", "active", "freezing", "dormant", "retired",
]);
export const PRESENTATION_PROVENANCE_KINDS = Object.freeze([
  "authoritative_fact", "thread_memory", "thread_meaning", "thread_expression", "belief",
  "fibre_projection", "editorial", "generated_reconstruction", "fixture",
]);
export const PRESENTATION_MEDIA_KINDS = Object.freeze(["image", "audio", "video"]);
export const PRESENTATION_MEDIA_STATUSES = Object.freeze(["placeholder", "pending", "ready", "unavailable"]);

function assertEnum(name, value, allowed) {
  if (!allowed.includes(value)) throw new TypeError(`${name} is invalid`);
}

function nullableText(name, value) {
  if (value === null) return null;
  assertNonEmpty(name, value);
  return value;
}

function dateOnly(name, value) {
  if (value === null) return null;
  assertNonEmpty(name, value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError(`${name} must use YYYY-MM-DD`);
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) {
    throw new TypeError(`${name} must be a valid calendar date`);
  }
  return value;
}

function refs(name, value, { required = false } = {}) {
  assertStringArray(name, value);
  if (required && value.length === 0) throw new TypeError(`${name} must not be empty`);
  if (new Set(value).size !== value.length) throw new TypeError(`${name} must be unique`);
  value.forEach((ref, index) => assertId(`${name}[${index}]`, ref));
  return [...value];
}

function nullableRef(name, value) {
  if (value === null) return null;
  assertId(name, value);
  return value;
}

function unique(name, items, key) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item[key])) throw new TypeError(`${name} contains duplicate ${key}: ${item[key]}`);
    seen.add(item[key]);
  }
}

function array(name, value, normalize) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  return value.map((item, index) => normalize(item, index));
}

function normalizeIntroduction(value) {
  const name = "presentation.introduction";
  assertPlainObject(name, value);
  assertExactKeys(name, value, ["headline", "summary", "sourceReferences", "provenanceRef", "mediaRefs"]);
  assertNonEmpty(`${name}.headline`, value.headline);
  assertNonEmpty(`${name}.summary`, value.summary);
  assertId(`${name}.provenanceRef`, value.provenanceRef);
  return {
    headline: value.headline,
    summary: value.summary,
    sourceReferences: refs(`${name}.sourceReferences`, value.sourceReferences, { required: true }),
    provenanceRef: value.provenanceRef,
    mediaRefs: refs(`${name}.mediaRefs`, value.mediaRefs),
  };
}

function normalizeSubject(value) {
  const name = "presentation.subject";
  assertPlainObject(name, value);
  assertExactKeys(name, value, ["displayName", "birthDate", "languages", "homePlaceRef", "provenanceRef"]);
  const displayName = nullableText(`${name}.displayName`, value.displayName);
  const birthDate = dateOnly(`${name}.birthDate`, value.birthDate);
  assertStringArray(`${name}.languages`, value.languages);
  if (new Set(value.languages).size !== value.languages.length) throw new TypeError(`${name}.languages must be unique`);
  assertId(`${name}.provenanceRef`, value.provenanceRef);
  return {
    displayName,
    birthDate,
    languages: [...value.languages],
    homePlaceRef: nullableRef(`${name}.homePlaceRef`, value.homePlaceRef),
    provenanceRef: value.provenanceRef,
  };
}

function normalizeSimpleClaim(section, idKey, value, index) {
  const name = `presentation.${section}[${index}]`;
  assertPlainObject(name, value);
  assertExactKeys(name, value, [idKey, "title", "summary", "sourceReferences", "provenanceRef", "mediaRefs"]);
  assertId(`${name}.${idKey}`, value[idKey]);
  assertNonEmpty(`${name}.title`, value.title);
  assertNonEmpty(`${name}.summary`, value.summary);
  assertId(`${name}.provenanceRef`, value.provenanceRef);
  return {
    [idKey]: value[idKey],
    title: value.title,
    summary: value.summary,
    sourceReferences: refs(`${name}.sourceReferences`, value.sourceReferences, { required: true }),
    provenanceRef: value.provenanceRef,
    mediaRefs: refs(`${name}.mediaRefs`, value.mediaRefs),
  };
}

function normalizePlace(value, index) {
  const name = `presentation.places[${index}]`;
  assertPlainObject(name, value);
  assertExactKeys(name, value, [
    "placeRef", "displayName", "region", "summary", "sourceReferences", "provenanceRef", "mediaRefs",
  ]);
  assertId(`${name}.placeRef`, value.placeRef);
  assertNonEmpty(`${name}.displayName`, value.displayName);
  assertNonEmpty(`${name}.summary`, value.summary);
  assertId(`${name}.provenanceRef`, value.provenanceRef);
  return {
    placeRef: value.placeRef,
    displayName: value.displayName,
    region: nullableText(`${name}.region`, value.region),
    summary: value.summary,
    sourceReferences: refs(`${name}.sourceReferences`, value.sourceReferences, { required: true }),
    provenanceRef: value.provenanceRef,
    mediaRefs: refs(`${name}.mediaRefs`, value.mediaRefs),
  };
}

function normalizeRelationship(value, index) {
  const name = `presentation.relationships[${index}]`;
  assertPlainObject(name, value);
  assertExactKeys(name, value, [
    "relationshipRef", "displayLabel", "relationshipKind", "summary",
    "sourceReferences", "provenanceRef", "mediaRefs",
  ]);
  assertId(`${name}.relationshipRef`, value.relationshipRef);
  assertNonEmpty(`${name}.displayLabel`, value.displayLabel);
  assertNonEmpty(`${name}.summary`, value.summary);
  assertId(`${name}.provenanceRef`, value.provenanceRef);
  return {
    relationshipRef: value.relationshipRef,
    displayLabel: value.displayLabel,
    relationshipKind: nullableText(`${name}.relationshipKind`, value.relationshipKind),
    summary: value.summary,
    sourceReferences: refs(`${name}.sourceReferences`, value.sourceReferences, { required: true }),
    provenanceRef: value.provenanceRef,
    mediaRefs: refs(`${name}.mediaRefs`, value.mediaRefs),
  };
}

function normalizeTimelineItem(value, index) {
  const name = `presentation.life.timeline[${index}]`;
  assertPlainObject(name, value);
  assertExactKeys(name, value, [
    "eventRef", "title", "summary", "occurredAt", "placeRef", "participantRefs",
    "sourceReferences", "provenanceRef", "mediaRefs",
  ]);
  assertId(`${name}.eventRef`, value.eventRef);
  assertNonEmpty(`${name}.title`, value.title);
  assertNonEmpty(`${name}.summary`, value.summary);
  assertIsoTimestamp(`${name}.occurredAt`, value.occurredAt);
  assertId(`${name}.provenanceRef`, value.provenanceRef);
  return {
    eventRef: value.eventRef,
    title: value.title,
    summary: value.summary,
    occurredAt: value.occurredAt,
    placeRef: nullableRef(`${name}.placeRef`, value.placeRef),
    participantRefs: refs(`${name}.participantRefs`, value.participantRefs),
    sourceReferences: refs(`${name}.sourceReferences`, value.sourceReferences, { required: true }),
    provenanceRef: value.provenanceRef,
    mediaRefs: refs(`${name}.mediaRefs`, value.mediaRefs),
  };
}

function normalizeMemory(value, index) {
  const name = `presentation.memories[${index}]`;
  assertPlainObject(name, value);
  assertExactKeys(name, value, [
    "memoryRef", "title", "rememberedContent", "uncertainty", "formedAt",
    "sourceReferences", "meaningRefs", "provenanceRef", "mediaRefs",
  ]);
  assertId(`${name}.memoryRef`, value.memoryRef);
  assertNonEmpty(`${name}.title`, value.title);
  assertNonEmpty(`${name}.rememberedContent`, value.rememberedContent);
  assertStringArray(`${name}.uncertainty`, value.uncertainty);
  if (value.formedAt !== null) assertIsoTimestamp(`${name}.formedAt`, value.formedAt);
  assertId(`${name}.provenanceRef`, value.provenanceRef);
  return {
    memoryRef: value.memoryRef,
    title: value.title,
    rememberedContent: value.rememberedContent,
    uncertainty: [...value.uncertainty],
    formedAt: value.formedAt,
    sourceReferences: refs(`${name}.sourceReferences`, value.sourceReferences, { required: true }),
    meaningRefs: refs(`${name}.meaningRefs`, value.meaningRefs),
    provenanceRef: value.provenanceRef,
    mediaRefs: refs(`${name}.mediaRefs`, value.mediaRefs),
  };
}

function normalizeMeaning(value, index) {
  const name = `presentation.meanings[${index}]`;
  assertPlainObject(name, value);
  assertExactKeys(name, value, [
    "meaningRef", "title", "summary", "formedAt", "memoryRefs", "sourceReferences",
    "supersedesMeaningRef", "provenanceRef", "mediaRefs",
  ]);
  assertId(`${name}.meaningRef`, value.meaningRef);
  assertNonEmpty(`${name}.title`, value.title);
  assertNonEmpty(`${name}.summary`, value.summary);
  if (value.formedAt !== null) assertIsoTimestamp(`${name}.formedAt`, value.formedAt);
  assertId(`${name}.provenanceRef`, value.provenanceRef);
  return {
    meaningRef: value.meaningRef,
    title: value.title,
    summary: value.summary,
    formedAt: value.formedAt,
    memoryRefs: refs(`${name}.memoryRefs`, value.memoryRefs, { required: true }),
    sourceReferences: refs(`${name}.sourceReferences`, value.sourceReferences, { required: true }),
    supersedesMeaningRef: nullableRef(`${name}.supersedesMeaningRef`, value.supersedesMeaningRef),
    provenanceRef: value.provenanceRef,
    mediaRefs: refs(`${name}.mediaRefs`, value.mediaRefs),
  };
}

export function normalizeThreadPresentationPacket(value) {
  assertPlainObject("presentation", value);
  assertExactKeys("presentation", value, [
    "schemaVersion", "manifest", "subject", "introduction", "origins", "places",
    "relationships", "life", "memories", "meanings",
  ]);
  if (value.schemaVersion !== THREAD_PRESENTATION_PACKET_VERSION) throw new TypeError("presentation.schemaVersion is invalid");

  assertPlainObject("presentation.manifest", value.manifest);
  assertExactKeys("presentation.manifest", value.manifest, [
    "presentationId", "threadId", "lifecycleStatus", "fixture", "generatedAt",
    "mediaPacketId", "provenancePacketId",
  ]);
  assertId("presentation.manifest.presentationId", value.manifest.presentationId);
  assertId("presentation.manifest.threadId", value.manifest.threadId);
  assertEnum("presentation.manifest.lifecycleStatus", value.manifest.lifecycleStatus, PRESENTATION_LIFECYCLE_STATUSES);
  if (typeof value.manifest.fixture !== "boolean") throw new TypeError("presentation.manifest.fixture must be boolean");
  if (value.manifest.lifecycleStatus === "genesis_candidate" && !value.manifest.fixture) {
    throw new TypeError("genesis_candidate presentation must remain an explicit fixture");
  }
  assertIsoTimestamp("presentation.manifest.generatedAt", value.manifest.generatedAt);
  assertId("presentation.manifest.mediaPacketId", value.manifest.mediaPacketId);
  assertId("presentation.manifest.provenancePacketId", value.manifest.provenancePacketId);

  const subject = normalizeSubject(value.subject);
  const origins = array("presentation.origins", value.origins, (item, index) =>
    normalizeSimpleClaim("origins", "originRef", item, index));
  const places = array("presentation.places", value.places, normalizePlace);
  const relationships = array("presentation.relationships", value.relationships, normalizeRelationship);

  assertPlainObject("presentation.life", value.life);
  assertExactKeys("presentation.life", value.life, ["timeline"]);
  const timeline = array("presentation.life.timeline", value.life.timeline, normalizeTimelineItem);
  const memories = array("presentation.memories", value.memories, normalizeMemory);
  const meanings = array("presentation.meanings", value.meanings, normalizeMeaning);

  unique("presentation.origins", origins, "originRef");
  unique("presentation.places", places, "placeRef");
  unique("presentation.relationships", relationships, "relationshipRef");
  unique("presentation.life.timeline", timeline, "eventRef");
  unique("presentation.memories", memories, "memoryRef");
  unique("presentation.meanings", meanings, "meaningRef");

  return {
    schemaVersion: THREAD_PRESENTATION_PACKET_VERSION,
    manifest: { ...value.manifest },
    subject,
    introduction: normalizeIntroduction(value.introduction),
    origins,
    places,
    relationships,
    life: { timeline },
    memories,
    meanings,
  };
}

function normalizeGeneration(value, name) {
  if (value === null) return null;
  assertPlainObject(name, value);
  assertExactKeys(name, value, ["provider", "model", "generatedAt", "inputReferences"]);
  assertNonEmpty(`${name}.provider`, value.provider);
  assertNonEmpty(`${name}.model`, value.model);
  assertIsoTimestamp(`${name}.generatedAt`, value.generatedAt);
  return {
    provider: value.provider,
    model: value.model,
    generatedAt: value.generatedAt,
    inputReferences: refs(`${name}.inputReferences`, value.inputReferences, { required: true }),
  };
}

function positiveIntegerOrNull(name, value) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive safe integer or null`);
  return value;
}

function normalizeMediaAsset(value, index) {
  const name = `media.assets[${index}]`;
  assertPlainObject(name, value);
  assertExactKeys(name, value, [
    "mediaId", "kind", "role", "status", "locator", "mediaType", "sha256",
    "width", "height", "durationMs", "posterRef", "unavailableReason",
    "sourceReferences", "provenanceRef", "generation",
  ]);
  assertId(`${name}.mediaId`, value.mediaId);
  assertEnum(`${name}.kind`, value.kind, PRESENTATION_MEDIA_KINDS);
  assertNonEmpty(`${name}.role`, value.role);
  assertEnum(`${name}.status`, value.status, PRESENTATION_MEDIA_STATUSES);
  const locator = nullableText(`${name}.locator`, value.locator);
  const mediaType = nullableText(`${name}.mediaType`, value.mediaType);
  const digest = nullableText(`${name}.sha256`, value.sha256);
  if (digest !== null && !/^sha256:[0-9a-f]{64}$/.test(digest)) throw new TypeError(`${name}.sha256 is invalid`);
  const width = positiveIntegerOrNull(`${name}.width`, value.width);
  const height = positiveIntegerOrNull(`${name}.height`, value.height);
  const durationMs = positiveIntegerOrNull(`${name}.durationMs`, value.durationMs);
  const posterRef = nullableRef(`${name}.posterRef`, value.posterRef);
  const unavailableReason = nullableText(`${name}.unavailableReason`, value.unavailableReason);
  assertId(`${name}.provenanceRef`, value.provenanceRef);
  const generation = normalizeGeneration(value.generation, `${name}.generation`);

  if (value.status === "ready") {
    if (locator === null || mediaType === null || digest === null) {
      throw new TypeError(`${name} ready media requires locator, mediaType, and sha256`);
    }
  } else if (locator !== null || mediaType !== null || digest !== null) {
    throw new TypeError(`${name} non-ready media cannot claim a resolved asset`);
  }
  if (value.status === "unavailable" && unavailableReason === null) {
    throw new TypeError(`${name} unavailable media requires unavailableReason`);
  }
  if (value.status !== "unavailable" && unavailableReason !== null) {
    throw new TypeError(`${name} unavailableReason is only valid for unavailable media`);
  }

  if (value.kind === "image") {
    if (durationMs !== null || posterRef !== null) throw new TypeError(`${name} image has invalid temporal fields`);
    if (value.status === "ready" && (width === null || height === null)) {
      throw new TypeError(`${name} ready image requires width and height`);
    }
  } else if (value.kind === "audio") {
    if (width !== null || height !== null || posterRef !== null) throw new TypeError(`${name} audio has invalid visual fields`);
    if (value.status === "ready" && durationMs === null) throw new TypeError(`${name} ready audio requires durationMs`);
  } else if (value.status === "ready" && (width === null || height === null || durationMs === null)) {
    throw new TypeError(`${name} ready video requires width, height, and durationMs`);
  }

  return {
    mediaId: value.mediaId,
    kind: value.kind,
    role: value.role,
    status: value.status,
    locator,
    mediaType,
    sha256: digest,
    width,
    height,
    durationMs,
    posterRef,
    unavailableReason,
    sourceReferences: refs(`${name}.sourceReferences`, value.sourceReferences, { required: true }),
    provenanceRef: value.provenanceRef,
    generation,
  };
}

export function normalizeThreadMediaPacket(value) {
  assertPlainObject("media", value);
  assertExactKeys("media", value, ["schemaVersion", "mediaPacketId", "threadId", "generatedAt", "assets"]);
  if (value.schemaVersion !== THREAD_MEDIA_PACKET_VERSION) throw new TypeError("media.schemaVersion is invalid");
  assertId("media.mediaPacketId", value.mediaPacketId);
  assertId("media.threadId", value.threadId);
  assertIsoTimestamp("media.generatedAt", value.generatedAt);
  const assets = array("media.assets", value.assets, normalizeMediaAsset);
  unique("media.assets", assets, "mediaId");
  return { ...value, assets };
}

function normalizeProvenanceEntry(value, index) {
  const name = `provenance.entries[${index}]`;
  assertPlainObject(name, value);
  assertExactKeys(name, value, ["provenanceId", "kind", "sourceReferences", "note"]);
  assertId(`${name}.provenanceId`, value.provenanceId);
  assertEnum(`${name}.kind`, value.kind, PRESENTATION_PROVENANCE_KINDS);
  return {
    provenanceId: value.provenanceId,
    kind: value.kind,
    sourceReferences: refs(`${name}.sourceReferences`, value.sourceReferences, { required: true }),
    note: nullableText(`${name}.note`, value.note),
  };
}

export function normalizePresentationProvenance(value) {
  assertPlainObject("provenance", value);
  assertExactKeys("provenance", value, ["schemaVersion", "provenancePacketId", "threadId", "generatedAt", "entries"]);
  if (value.schemaVersion !== PRESENTATION_PROVENANCE_VERSION) throw new TypeError("provenance.schemaVersion is invalid");
  assertId("provenance.provenancePacketId", value.provenancePacketId);
  assertId("provenance.threadId", value.threadId);
  assertIsoTimestamp("provenance.generatedAt", value.generatedAt);
  const entries = array("provenance.entries", value.entries, normalizeProvenanceEntry);
  unique("provenance.entries", entries, "provenanceId");
  return { ...value, entries };
}

function claims(presentation) {
  return [
    { path: "subject", value: presentation.subject, allowed: ["authoritative_fact", "fibre_projection", "fixture"] },
    { path: "introduction", value: presentation.introduction, allowed: ["thread_expression", "fibre_projection", "editorial", "fixture"] },
    ...presentation.origins.map((value, i) => ({ path: `origins[${i}]`, value, allowed: ["authoritative_fact", "fibre_projection", "fixture"] })),
    ...presentation.places.map((value, i) => ({ path: `places[${i}]`, value, allowed: ["authoritative_fact", "fibre_projection", "fixture"] })),
    ...presentation.relationships.map((value, i) => ({ path: `relationships[${i}]`, value, allowed: ["authoritative_fact", "fibre_projection", "fixture"] })),
    ...presentation.life.timeline.map((value, i) => ({ path: `life.timeline[${i}]`, value, allowed: ["authoritative_fact", "fibre_projection", "fixture"] })),
    ...presentation.memories.map((value, i) => ({ path: `memories[${i}]`, value, allowed: ["thread_memory"] })),
    ...presentation.meanings.map((value, i) => ({ path: `meanings[${i}]`, value, allowed: ["thread_meaning"] })),
  ];
}

function requireKnown(label, values, known) {
  for (const value of values) {
    if (!known.has(value)) throw new TypeError(`${label} references unknown id: ${value}`);
  }
}

export function normalizeThreadPresentationBundle({ presentation, media, provenance }) {
  const p = normalizeThreadPresentationPacket(presentation);
  const m = normalizeThreadMediaPacket(media);
  const v = normalizePresentationProvenance(provenance);
  const threadId = p.manifest.threadId;

  if (m.threadId !== threadId || v.threadId !== threadId) {
    throw new TypeError("presentation bundle threadId values must match");
  }
  if (p.manifest.mediaPacketId !== m.mediaPacketId) {
    throw new TypeError("presentation manifest mediaPacketId does not match media packet");
  }
  if (p.manifest.provenancePacketId !== v.provenancePacketId) {
    throw new TypeError("presentation manifest provenancePacketId does not match provenance packet");
  }

  const provenanceById = new Map(v.entries.map((entry) => [entry.provenanceId, entry]));
  const mediaById = new Map(m.assets.map((asset) => [asset.mediaId, asset]));
  const memories = new Map(p.memories.map((item) => [item.memoryRef, item]));
  const meanings = new Map(p.meanings.map((item) => [item.meaningRef, item]));
  const places = new Map(p.places.map((item) => [item.placeRef, item]));

  for (const claim of claims(p)) {
    const provenanceEntry = provenanceById.get(claim.value.provenanceRef);
    if (!provenanceEntry) throw new TypeError(`presentation.${claim.path} references unknown provenance`);
    if (!claim.allowed.includes(provenanceEntry.kind)) {
      throw new TypeError(`presentation.${claim.path} cannot use ${provenanceEntry.kind} provenance`);
    }
    const covered = new Set(provenanceEntry.sourceReferences);
    for (const ref of claim.value.sourceReferences ?? []) {
      if (!covered.has(ref)) throw new TypeError(`presentation.${claim.path} sourceReferences must be covered by provenance`);
    }
    requireKnown(`presentation.${claim.path}.mediaRefs`, claim.value.mediaRefs ?? [], mediaById);
  }

  if (p.subject.homePlaceRef !== null && !places.has(p.subject.homePlaceRef)) {
    throw new TypeError("presentation.subject.homePlaceRef must resolve to a presented place");
  }
  p.life.timeline.forEach((item, index) => {
    if (item.placeRef !== null && !places.has(item.placeRef)) {
      throw new TypeError(`presentation.life.timeline[${index}].placeRef must resolve to a presented place`);
    }
  });
  p.memories.forEach((item, index) =>
    requireKnown(`presentation.memories[${index}].meaningRefs`, item.meaningRefs, meanings));
  p.meanings.forEach((item, index) => {
    requireKnown(`presentation.meanings[${index}].memoryRefs`, item.memoryRefs, memories);
    if (item.supersedesMeaningRef !== null && !meanings.has(item.supersedesMeaningRef)) {
      throw new TypeError(`presentation.meanings[${index}].supersedesMeaningRef must resolve`);
    }
  });

  m.assets.forEach((asset, index) => {
    const provenanceEntry = provenanceById.get(asset.provenanceRef);
    if (!provenanceEntry) throw new TypeError(`media.assets[${index}] references unknown provenance`);
    const covered = new Set(provenanceEntry.sourceReferences);
    for (const ref of asset.sourceReferences) {
      if (!covered.has(ref)) throw new TypeError(`media.assets[${index}] sourceReferences must be covered by provenance`);
    }
    if (asset.generation !== null && provenanceEntry.kind !== "generated_reconstruction") {
      throw new TypeError(`media.assets[${index}] generated media must use generated_reconstruction provenance`);
    }
    if (asset.posterRef !== null) {
      const poster = mediaById.get(asset.posterRef);
      if (!poster) throw new TypeError(`media.assets[${index}].posterRef must resolve`);
      if (poster.kind !== "image") throw new TypeError(`media.assets[${index}].posterRef must reference an image`);
    }
  });

  return { presentation: p, media: m, provenance: v };
}

export function threadPresentationPacketDigest(value) {
  return `sha256:${sha256(canonicalJson(normalizeThreadPresentationPacket(value)))}`;
}
export function threadMediaPacketDigest(value) {
  return `sha256:${sha256(canonicalJson(normalizeThreadMediaPacket(value)))}`;
}
export function presentationProvenanceDigest(value) {
  return `sha256:${sha256(canonicalJson(normalizePresentationProvenance(value)))}`;
}
