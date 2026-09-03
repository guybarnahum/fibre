function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function positiveInteger(name, value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer`);
  return value;
}

function endpoint(baseUrl, pathname) {
  const url = new URL(nonEmpty("service base URL", baseUrl));
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  return url;
}

class SliceGOfficialPhotoPendingError extends Error {
  constructor(status) {
    super(`Slice G official ID photo is not ready: ${String(status)}`);
    this.name = "SliceGOfficialPhotoPendingError";
    this.status = status;
  }
}

async function responseJson(response, label) {
  const payload = await response.json().catch(() => null);
  if (payload === null) throw new Error(`${label} returned non-JSON HTTP ${response.status}`);
  return payload;
}

async function fetchSnapshot({ fetchImpl, presentationBaseUrl, viewerOrigin, threadId, requestTimeoutMs }) {
  const response = await fetchImpl(endpoint(presentationBaseUrl, `/api/threads/${encodeURIComponent(threadId)}/snapshot`), {
    headers: { Origin: viewerOrigin, Accept: "application/json" },
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const payload = await responseJson(response, "Slice G final Thread Presentation snapshot");
  if (!response.ok || payload?.pointer?.threadId !== threadId) {
    throw new Error(`Slice G final Thread Presentation snapshot failed: HTTP ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function fetchPublicAsset({ fetchImpl, presentationBaseUrl, viewerOrigin, objectRef, requestTimeoutMs }) {
  const response = await fetchImpl(endpoint(presentationBaseUrl, `/api/assets/${encodeURIComponent(objectRef)}`), {
    headers: { Origin: viewerOrigin },
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  if (!response.ok) throw new Error(`Slice G official-photo public asset failed with HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("Slice G official-photo public asset is empty");
  const provenanceClass = response.headers.get("x-fibre-provenance");
  if (provenanceClass !== "generated_reconstruction") {
    throw new Error(`Slice G official-photo public asset provenance is ${String(provenanceClass)}, expected generated_reconstruction`);
  }
  return Object.freeze({
    objectRef,
    status: response.status,
    byteLength: bytes.byteLength,
    mediaType: response.headers.get("content-type"),
    etag: response.headers.get("etag"),
    provenanceClass,
  });
}

export function inspectSliceGPublicClosure(snapshot, evidence) {
  const threadId = nonEmpty("Slice G threadId", evidence?.request?.developmentPlanThreadId);
  if (snapshot?.pointer?.threadId !== threadId) throw new Error("Slice G final snapshot belongs to a different Thread");
  const presentation = snapshot?.snapshot?.presentation;
  const mediaAssets = snapshot?.snapshot?.media?.assets;
  if (!presentation || !Array.isArray(mediaAssets)) throw new Error("Slice G final snapshot lacks presentation/media bundles");

  const card = presentation.identityCard;
  if (!card || card.status !== "active" || card.visibility !== "public") {
    throw new Error("Slice G requires one active public Fibre Identity Card");
  }
  const registrationId = evidence?.world?.civilRegistration?.registrationId;
  if (typeof registrationId !== "string" || card.registrationId !== registrationId) {
    throw new Error("Slice G Identity Card is not linked to the authoritative civil registration");
  }
  const mediaId = nonEmpty("Slice G officialPhotoMediaRef", card.officialPhotoMediaRef);
  const matches = mediaAssets.filter((asset) => asset?.mediaId === mediaId && asset?.role === "official_id_photo");
  if (matches.length !== 1) throw new Error(`Slice G expected exactly one official ID photo slot, found ${matches.length}`);
  const officialPhoto = matches[0];
  if (officialPhoto.kind !== "image") {
    throw new Error(`Slice G official ID photo has invalid kind: ${String(officialPhoto.kind)}`);
  }
  if (officialPhoto.status !== "ready") {
    if (officialPhoto.status === "placeholder" || officialPhoto.status === "pending") {
      throw new SliceGOfficialPhotoPendingError(officialPhoto.status);
    }
    throw new Error(`Slice G official ID photo is not ready: ${String(officialPhoto.status)}`);
  }
  const objectRef = nonEmpty("Slice G official-photo locator", officialPhoto.locator);
  const generation = officialPhoto.generation;
  if (!generation || !Array.isArray(generation.inputReferences)) {
    throw new Error("Slice G official ID photo lacks durable generation input references");
  }
  const canonicalReferences = presentation?.visualIdentity?.referenceObjectRefs;
  if (!Array.isArray(canonicalReferences) || canonicalReferences.length !== 1) {
    throw new Error("Slice G final presentation must retain exactly one canonical visual reference");
  }
  const canonicalRootObjectRef = nonEmpty("Slice G canonical root object reference", canonicalReferences[0]);
  if (!generation.inputReferences.includes(canonicalRootObjectRef)) {
    throw new Error("Slice G official ID photo was not generated from the admitted canonical root reference");
  }
  if (objectRef === canonicalRootObjectRef) {
    throw new Error("Slice G official ID photo must be a derived asset distinct from the canonical root");
  }
  return Object.freeze({
    threadId,
    credentialId: card.credentialId,
    cardSerial: card.cardSerial,
    registrationId: card.registrationId,
    mediaId,
    objectRef,
    canonicalRootObjectRef,
    generation: Object.freeze({
      provider: generation.provider,
      model: generation.model,
      generatedAt: generation.generatedAt,
      inputReferences: Object.freeze([...generation.inputReferences]),
    }),
  });
}

export async function verifySliceGPublicClosure({
  evidence,
  fetchImpl = globalThis.fetch,
  requestTimeoutMs = 120_000,
  convergenceWaitMs = 300_000,
  pollMs = 2_000,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  nowMs = Date.now,
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("Slice G fetchImpl must be a function");
  if (typeof sleep !== "function") throw new TypeError("Slice G sleep must be a function");
  if (typeof nowMs !== "function") throw new TypeError("Slice G nowMs must be a function");
  positiveInteger("Slice G requestTimeoutMs", requestTimeoutMs);
  positiveInteger("Slice G convergenceWaitMs", convergenceWaitMs);
  positiveInteger("Slice G pollMs", pollMs);
  const presentationBaseUrl = nonEmpty("Slice G Thread Presentation endpoint", evidence?.endpoints?.threadPresentation);
  const viewerOrigin = nonEmpty("Slice G Viewer endpoint", evidence?.endpoints?.viewer);
  const threadId = nonEmpty("Slice G threadId", evidence?.request?.developmentPlanThreadId);
  const deadline = nowMs() + convergenceWaitMs;
  let snapshot;
  let closure;
  let lastPendingStatus = null;

  for (;;) {
    snapshot = await fetchSnapshot({ fetchImpl, presentationBaseUrl, viewerOrigin, threadId, requestTimeoutMs });
    try {
      closure = inspectSliceGPublicClosure(snapshot, evidence);
      break;
    } catch (error) {
      if (!(error instanceof SliceGOfficialPhotoPendingError)) throw error;
      lastPendingStatus = error.status;
      if (nowMs() >= deadline) {
        throw new Error(
          `Slice G official ID photo did not become ready within ${convergenceWaitMs}ms; last status ${String(lastPendingStatus)}`,
        );
      }
      await sleep(pollMs);
    }
  }

  const officialPhotoAsset = await fetchPublicAsset({
    fetchImpl,
    presentationBaseUrl,
    viewerOrigin,
    objectRef: closure.objectRef,
    requestTimeoutMs,
  });
  return Object.freeze({ closure, officialPhotoAsset, snapshot });
}
