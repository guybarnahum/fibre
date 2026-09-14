const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;

function id(name, value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw new TypeError(`${name} must be a Fibre identifier`);
  return value;
}

function clean(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function cleanStrings(value) {
  return Array.isArray(value) ? value.map(clean).filter((item) => item !== null) : [];
}

export function presentationOrigin(environment) {
  if (environment === "production") return "https://api.insidefibre.com";
  if (environment === "staging") return "https://api.staging.insidefibre.com";
  throw new TypeError("FIBRE_ENVIRONMENT must be staging or production");
}

function publicMedia(presentationOriginValue, snapshot) {
  const assets = Array.isArray(snapshot?.media?.assets) ? snapshot.media.assets : [];
  return Object.freeze(assets
    .filter((asset) => asset?.status === "ready" && clean(asset.locator) !== null)
    .map((asset) => {
      const objectRef = id("media objectRef", clean(asset.locator));
      return Object.freeze({
        mediaId: clean(asset.mediaId),
        kind: clean(asset.kind),
        role: clean(asset.role),
        objectRef,
        mediaType: clean(asset.mediaType),
        sha256: clean(asset.sha256),
        width: Number.isFinite(asset.width) ? asset.width : null,
        height: Number.isFinite(asset.height) ? asset.height : null,
        durationMs: Number.isFinite(asset.durationMs) ? asset.durationMs : null,
        url: `${presentationOriginValue}/api/assets/${encodeURIComponent(objectRef)}`,
        source: "current_public_presentation",
      });
    }));
}

function visualIdentity(presentation) {
  const visual = presentation?.visualIdentity;
  if (!visual || typeof visual !== "object") return null;
  return Object.freeze({
    embodimentId: clean(visual.embodimentId),
    embodimentRevision: Number.isFinite(visual.embodimentRevision) ? visual.embodimentRevision : null,
    referenceObjectRefs: Object.freeze(cleanStrings(visual.referenceObjectRefs)),
  });
}

function worldEmbodimentMedia(world) {
  const embodiments = Array.isArray(world?.embodiments) ? world.embodiments : [];
  return embodiments.flatMap((embodiment) => {
    const asset = embodiment?.asset;
    const objectRef = clean(asset?.referenceObjectRef);
    if (
      embodiment?.status !== "available" ||
      embodiment?.visibility !== "public" ||
      objectRef === null ||
      clean(asset?.mediaType) === null
    ) return [];
    id("World embodiment objectRef", objectRef);
    return [Object.freeze({
      mediaId: clean(asset?.assetRef) ?? objectRef,
      kind: clean(embodiment?.kind) ?? "image",
      role: embodiment?.kind === "portrait" ? "canonical_portrait" : clean(embodiment?.kind),
      objectRef,
      mediaType: clean(asset?.mediaType),
      sha256: clean(asset?.sha256),
      width: Number.isFinite(asset?.width) ? asset.width : null,
      height: Number.isFinite(asset?.height) ? asset.height : null,
      durationMs: Number.isFinite(asset?.durationMs) ? asset.durationMs : null,
      url: null,
      source: "world_embodiment",
      embodimentId: clean(embodiment?.embodimentId),
      embodimentRevision: Number.isFinite(embodiment?.revision) ? embodiment.revision : null,
    })];
  });
}

function mergeMedia(world, presentation) {
  const merged = [];
  const seen = new Set();
  for (const asset of [...(presentation?.assets ?? []), ...worldEmbodimentMedia(world)]) {
    if (!asset?.objectRef || seen.has(asset.objectRef)) continue;
    seen.add(asset.objectRef);
    merged.push(asset);
  }
  return Object.freeze(merged);
}

async function responsePayload(response) {
  try { return await response.json(); }
  catch { return null; }
}

export async function resolveAdminWorldThreadIdentity({ threadId, fetchImpl = globalThis.fetch } = {}) {
  const resolvedThreadId = id("threadId", threadId);
  if (typeof fetchImpl !== "function") throw new TypeError("World Thread identity resolver requires fetch()");
  const response = await fetchImpl(`https://world.internal/internal/threads/${encodeURIComponent(resolvedThreadId)}/identity`, {
    headers: { Accept:"application/json" },
  });
  const payload = await responsePayload(response);
  if (response.status === 404 && payload?.error?.code === "THREAD_NOT_FOUND") return null;
  if (!response.ok) {
    const code = payload?.error?.code ?? payload?.error ?? `HTTP_${response.status}`;
    throw new Error(`World Thread identity lookup unavailable (${code})`);
  }
  const identity = payload?.identity;
  if (identity?.threadId !== resolvedThreadId) throw new Error("World returned a mismatched Thread identity");
  return Object.freeze({
    threadId: resolvedThreadId,
    fibreIdentityNumber: clean(identity.fibreIdentityNumber),
    lifecycleStatus: clean(identity.lifecycleStatus),
    thread: identity.thread && typeof identity.thread === "object" ? structuredClone(identity.thread) : null,
    civilRegistration: identity.civilRegistration && typeof identity.civilRegistration === "object" ? structuredClone(identity.civilRegistration) : null,
    embodiments: Object.freeze(Array.isArray(identity.embodiments) ? structuredClone(identity.embodiments) : []),
    symbolicGenomes: Object.freeze(Array.isArray(identity.symbolicGenomes) ? structuredClone(identity.symbolicGenomes) : []),
  });
}

export async function resolveAdminThreadIdentity({ environment, threadId, fetchImpl = globalThis.fetch } = {}) {
  const resolvedThreadId = id("threadId", threadId);
  const origin = presentationOrigin(environment);
  if (typeof fetchImpl !== "function") throw new TypeError("Thread identity resolver requires fetch()");
  const response = await fetchImpl(`${origin}/api/threads/${encodeURIComponent(resolvedThreadId)}/snapshot`, {
    headers: { Accept:"application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Thread Presentation identity lookup failed with HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.pointer?.threadId !== resolvedThreadId) throw new Error("Thread Presentation returned a mismatched Thread identity");
  const snapshot = payload?.snapshot;
  const presentation = snapshot?.presentation;
  if (!presentation || typeof presentation !== "object") throw new Error("Thread Presentation snapshot lacks public Presentation");
  return Object.freeze({
    threadId: resolvedThreadId,
    displayName: clean(presentation.subject?.displayName),
    fibreIdentityNumber: clean(presentation.civilIdentity?.fibreIdentityNumber),
    birthDate: clean(presentation.subject?.birthDate),
    lifecycleStatus: clean(presentation.manifest?.lifecycleStatus),
    visualIdentity: visualIdentity(presentation),
    assets: publicMedia(origin, snapshot),
    snapshot: structuredClone(snapshot),
    provenance: Object.freeze({
      displayName: "resolved_after_fact",
      fibreIdentityNumber: "resolved_after_fact",
      assets: "current_public_presentation",
      source: "current_public_presentation",
    }),
  });
}

export function combineAdminThreadIdentity({ world, presentation } = {}) {
  if (world === null || world === undefined) return null;
  if (presentation?.threadId && presentation.threadId !== world.threadId) throw new Error("World and Presentation resolved different Threads");
  if (
    world.fibreIdentityNumber
    && presentation?.fibreIdentityNumber
    && world.fibreIdentityNumber !== presentation.fibreIdentityNumber
  ) throw new Error("World and Presentation disagree on Fibre identity number");

  const assets = mergeMedia(world, presentation);
  const worldPortrait = assets.find((asset) => asset.source === "world_embodiment" && asset.role === "canonical_portrait") ?? null;
  return Object.freeze({
    threadId: world.threadId,
    displayName: presentation?.displayName ?? null,
    fibreIdentityNumber: world.fibreIdentityNumber ?? presentation?.fibreIdentityNumber ?? null,
    birthDate: presentation?.birthDate ?? null,
    lifecycleStatus: world.lifecycleStatus ?? presentation?.lifecycleStatus ?? null,
    visualIdentity: presentation?.visualIdentity ?? (worldPortrait ? Object.freeze({
      embodimentId: worldPortrait.embodimentId,
      embodimentRevision: worldPortrait.embodimentRevision,
      referenceObjectRefs: Object.freeze([worldPortrait.objectRef]),
    }) : null),
    assets,
    worldStatus: "admitted",
    presentationStatus: presentation === null || presentation === undefined ? "unavailable" : "current",
    world: Object.freeze({
      thread: world.thread ?? null,
      civilRegistration: world.civilRegistration ?? null,
      embodiments: Object.freeze([...(world.embodiments ?? [])]),
      symbolicGenomes: Object.freeze([...(world.symbolicGenomes ?? [])]),
    }),
    presentation: presentation?.snapshot ?? null,
    provenance: Object.freeze({
      displayName: presentation ? "resolved_after_fact" : "unavailable",
      fibreIdentityNumber: world.fibreIdentityNumber ? "world_civil_registry" : "resolved_after_fact",
      lifecycleStatus: world.lifecycleStatus ? "world" : "resolved_after_fact",
      assets: presentation?.assets?.length ? "current_public_presentation" : (assets.length ? "world_embodiment" : "unavailable"),
      source: presentation ? "world_plus_current_public_presentation" : "world_only",
    }),
  });
}