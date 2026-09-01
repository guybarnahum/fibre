import { createNodeServiceHandler } from "#infra/providers/local/service";

const THREAD_INSPECTION_ROUTE = /^\/internal\/threads(?:\/[A-Za-z0-9][A-Za-z0-9._:-]{0,255}\/inspection)?$/u;

function routeMatches(target) {
  if (typeof target !== "string" || !target.startsWith("/") || target.startsWith("//")) return false;
  const url = new URL(target, "http://world-kernel.local");
  return url.search === "" && THREAD_INSPECTION_ROUTE.test(url.pathname);
}

export function attachThreadInspectionHttpBoundary({ server, inspectionApi } = {}) {
  if (!server || typeof server.listeners !== "function") {
    throw new TypeError("Thread inspection HTTP boundary requires a Node HTTP server");
  }
  if (!inspectionApi || typeof inspectionApi.fetch !== "function") {
    throw new TypeError("Thread inspection HTTP boundary requires inspectionApi.fetch(request)");
  }
  const handlers = server.listeners("request");
  if (handlers.length !== 1) {
    throw new TypeError("Thread inspection HTTP boundary requires exactly one existing request handler");
  }
  const [baseHandler] = handlers;
  const inspectionHandler = createNodeServiceHandler({ service: inspectionApi });
  server.removeAllListeners("request");
  server.on("request", (request, response) => {
    if (!routeMatches(request.url)) return baseHandler(request, response);
    return inspectionHandler(request, response);
  });
  return server;
}
