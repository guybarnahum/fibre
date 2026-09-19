const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function fibreId(name, value) {
  const id = nonEmpty(name, value);
  if (!ID.test(id)) throw new TypeError(`${name} is invalid`);
  return id;
}

function endpoint(baseUrl, pathname) {
  const url = new URL(nonEmpty("service base URL", baseUrl));
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  return url;
}

async function json(response, label) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload === null) {
    throw new Error(`${label} failed: HTTP ${response.status}`);
  }
  return payload;
}

function officialPhoto(presentation, media) {
  const cardRef = presentation.identityCard?.officialPhotoMediaRef ?? null;
  const candidates = media.filter((asset) => asset?.role === "official_id_photo");
  if (cardRef !== null) {
    const match = candidates.find((asset) => asset.mediaId === cardRef) ?? null;
    if (match === null) throw new Error("Thread Identity Card official photo is missing from presentation media");
    return match;
  }
  const ready = candidates.filter((asset) => asset.status === "ready");
  if (ready.length !== 1) {
    throw new Error(`Thread presentation requires exactly one ready official ID photo, found ${ready.length}`);
  }
  return ready[0];
}

export async function resolveCloudThreadFidSource({
  threadId:candidateThreadId,
  worldBaseUrl,
  presentationBaseUrl,
  viewerOrigin,
  privateToken,
  fetchImpl = globalThis.fetch,
  requestTimeoutMs = 30_000,
} = {}) {
  const threadId = fibreId("threadId", candidateThreadId);
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  const token = nonEmpty("FIBRE_PRIVATE_TOKEN", privateToken);
  const origin = nonEmpty("viewer origin", viewerOrigin);

  const [worldResponse, presentationResponse] = await Promise.all([
    fetchImpl(endpoint(worldBaseUrl, `/internal/threads/${encodeURIComponent(threadId)}/observatory`), {
      headers:{ Accept:"application/json", "x-fibre-private-token":token },
      signal:AbortSignal.timeout(requestTimeoutMs),
    }),
    fetchImpl(endpoint(presentationBaseUrl, `/api/threads/${encodeURIComponent(threadId)}/snapshot`), {
      headers:{ Accept:"application/json", Origin:origin },
      signal:AbortSignal.timeout(requestTimeoutMs),
    }),
  ]);
  const [worldPayload, presentationPayload] = await Promise.all([
    json(worldResponse, "World Observatory lookup"),
    json(presentationResponse, "Thread Presentation lookup"),
  ]);

  const observatory = worldPayload?.observatory;
  const snapshot = presentationPayload?.snapshot;
  if (observatory?.threadId !== threadId || presentationPayload?.pointer?.threadId !== threadId) {
    throw new Error("cloud Thread lookup returned a different Thread");
  }
  const presentation = snapshot?.presentation;
  const media = snapshot?.media?.assets;
  if (!presentation || !Array.isArray(media)) throw new Error("Thread Presentation lacks presentation/media bundles");

  const civil = observatory.civilRegistration;
  if (!civil || civil.threadId !== threadId) throw new Error("Thread has no authoritative civil registration");
  if (presentation.civilIdentity?.registrationId !== civil.registrationId
    || presentation.civilIdentity?.fibreIdentityNumber !== civil.fibreIdentityNumber) {
    throw new Error("Thread Presentation civil identity does not match World");
  }

  const displayName = nonEmpty("Thread displayName", presentation.subject?.displayName);
  const birthDate = presentation.subject?.birthDate ?? null;
  if (birthDate !== null && (typeof birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(birthDate))) {
    throw new Error("Thread birthDate is invalid");
  }

  const visualRefs = presentation.visualIdentity?.referenceObjectRefs;
  if (!Array.isArray(visualRefs) || visualRefs.length !== 1) {
    throw new Error("Thread requires exactly one canonical visual identity reference");
  }
  const canonicalRef = fibreId("canonical visual reference", visualRefs[0]);
  const embodiment = (observatory.embodiments ?? []).find(
    (value) => value?.asset?.referenceObjectRef === canonicalRef,
  ) ?? null;
  const canonicalDigest = embodiment?.asset?.sha256;
  if (typeof canonicalDigest !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(canonicalDigest)) {
    throw new Error("World embodiment lacks the canonical visual reference digest");
  }

  const photo = officialPhoto(presentation, media);
  if (photo.status !== "ready") throw new Error(`Thread official ID photo is ${String(photo.status)}`);
  if (photo.mediaType !== "image/png") throw new Error("Thread official ID photo is not PNG");
  const objectRef = fibreId("official ID photo locator", photo.locator);
  const provenanceRef = fibreId("official ID photo provenanceRef", photo.provenanceRef);
  if (!Array.isArray(photo.generation?.inputReferences) || !photo.generation.inputReferences.includes(canonicalRef)) {
    throw new Error("Thread official ID photo is not derived from the canonical visual identity");
  }

  const photoResponse = await fetchImpl(endpoint(
    presentationBaseUrl,
    `/api/assets/${encodeURIComponent(objectRef)}`,
  ), {
    headers:{ Origin:origin },
    signal:AbortSignal.timeout(requestTimeoutMs),
  });
  if (!photoResponse.ok) throw new Error(`Thread official ID photo fetch failed: HTTP ${photoResponse.status}`);
  const bytes = new Uint8Array(await photoResponse.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("Thread official ID photo is empty");

  return Object.freeze({
    threadId,
    displayName,
    birthDate,
    civilRegistration:Object.freeze(structuredClone(civil)),
    visualIdentity:Object.freeze({
      referenceObjectRef:canonicalRef,
      digest:canonicalDigest,
    }),
    photo:Object.freeze({
      objectRef,
      bytes,
      sha256:photo.sha256,
      provenanceRef,
      sourceReferences:Object.freeze([...(photo.sourceReferences ?? [])]),
    }),
  });
}
