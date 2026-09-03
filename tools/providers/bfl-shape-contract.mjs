function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sortedKeys(value) {
  return plain(value) ? Object.keys(value).sort() : [];
}

function safeUrlShape(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const url = new URL(value);
    return Object.freeze({
      protocol: url.protocol,
      hostname: url.hostname,
      pathname: url.pathname,
      hasQuery: url.search.length > 0,
    });
  } catch {
    return Object.freeze({ invalid: true });
  }
}

export function inspectBflSubmissionShape({ status, payload }) {
  const objectPayload = plain(payload) ? payload : null;
  const id = typeof objectPayload?.id === "string" ? objectPayload.id : null;
  const pollingUrl = typeof objectPayload?.polling_url === "string" ? objectPayload.polling_url : null;
  return Object.freeze({
    httpStatus: Number.isSafeInteger(status) ? status : null,
    payloadKind: objectPayload === null ? (Array.isArray(payload) ? "array" : typeof payload) : "object",
    topLevelKeys: sortedKeys(objectPayload),
    idPresent: id !== null && id.length > 0,
    idLength: id?.length ?? 0,
    pollingUrlPresent: pollingUrl !== null && pollingUrl.length > 0,
    pollingUrl: safeUrlShape(pollingUrl),
  });
}

export function inspectBflPollShape({ status, payload }) {
  const objectPayload = plain(payload) ? payload : null;
  const result = plain(objectPayload?.result) ? objectPayload.result : null;
  const sample = typeof result?.sample === "string" ? result.sample : null;
  return Object.freeze({
    httpStatus: Number.isSafeInteger(status) ? status : null,
    payloadKind: objectPayload === null ? (Array.isArray(payload) ? "array" : typeof payload) : "object",
    topLevelKeys: sortedKeys(objectPayload),
    status: typeof objectPayload?.status === "string" ? objectPayload.status : null,
    resultKeys: sortedKeys(result),
    sampleUrlPresent: sample !== null && sample.length > 0,
    sampleUrl: safeUrlShape(sample),
  });
}
