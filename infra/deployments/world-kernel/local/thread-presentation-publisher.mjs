function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function endpoint(baseUrl) {
  const url = new URL(nonEmpty("Thread Presentation URL", baseUrl));
  url.pathname = "/internal/genesis/presentations";
  url.search = "";
  url.hash = "";
  return url;
}

export function createThreadPresentationPublisher({
  baseUrl,
  privateToken,
  fetchImpl = fetch,
} = {}) {
  const url = endpoint(baseUrl);
  const token = nonEmpty("Fibre private token", privateToken);
  if (typeof fetchImpl !== "function") throw new TypeError("Thread Presentation fetch implementation is required");

  return Object.freeze({
    async publishGenesisPresentation({ genesisId, publicationDigest, bundle }) {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-fibre-private-token": token,
        },
        body: JSON.stringify({ genesisId, publicationDigest, bundle }),
      });
      let body = null;
      try { body = await response.json(); } catch {}
      if (!response.ok) {
        const detail = body?.detail ?? body?.error ?? response.statusText ?? `HTTP ${response.status}`;
        const error = new Error(`Thread Presentation rejected Genesis projection: ${detail}`);
        error.code = "THREAD_PRESENTATION_PUBLICATION_FAILED";
        error.httpStatus = response.status;
        throw error;
      }
      return body;
    },
  });
}
