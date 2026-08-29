class RequestBodyTooLargeError extends Error {}

function normalizedLimit(value) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError("maxBodyBytes must be a positive safe integer");
  }
  return value;
}

async function readRequestBody(request, maxBodyBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBodyBytes) throw new RequestBodyTooLargeError("request body too large");
    chunks.push(chunk);
  }
  return chunks.length === 0 ? null : Buffer.concat(chunks);
}

function fetchHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, String(value));
    }
  }
  return headers;
}

async function toFetchRequest(request, maxBodyBytes) {
  const method = (request.method ?? "GET").toUpperCase();
  const init = { method, headers: fetchHeaders(request.headers) };
  if (method !== "GET" && method !== "HEAD") {
    const body = await readRequestBody(request, maxBodyBytes);
    if (body !== null) init.body = body;
  }
  return new Request(new URL(request.url ?? "/", "http://fibre.local"), init);
}

async function writeFetchResponse(response, nodeResponse) {
  for (const [name, value] of response.headers.entries()) nodeResponse.setHeader(name, value);
  nodeResponse.statusCode = response.status;
  nodeResponse.end(Buffer.from(await response.arrayBuffer()));
}

function adapterErrorResponse(error) {
  if (error instanceof RequestBodyTooLargeError) {
    return Response.json({ error: "request_too_large" }, { status: 413 });
  }
  return Response.json({ error: "invalid_request" }, { status: 400 });
}

export function createNodeServiceHandler({ service, maxBodyBytes = 1024 * 1024 } = {}) {
  if (!service || typeof service.fetch !== "function") {
    throw new TypeError("Node service provider requires a Fibre service");
  }
  const bodyLimit = normalizedLimit(maxBodyBytes);

  return async function nodeServiceHandler(request, response) {
    try {
      const fetchRequest = await toFetchRequest(request, bodyLimit);
      await writeFetchResponse(await service.fetch(fetchRequest), response);
    } catch (error) {
      await writeFetchResponse(adapterErrorResponse(error), response);
    }
  };
}
