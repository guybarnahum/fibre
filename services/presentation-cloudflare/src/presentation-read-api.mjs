const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;

function assertId(name, value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function channelIdForThread(threadId) {
  return `presentation:${assertId("threadId", threadId)}`;
}

function json(value, { status = 200, headers = {} } = {}) {
  return Response.json(value, { status, headers });
}

function allowedOrigin(request, viewerOrigin) {
  const origin = request.headers.get("Origin");
  if (origin === null) return null;
  if (viewerOrigin === null || viewerOrigin === undefined || origin !== viewerOrigin) return false;
  return origin;
}

function corsHeaders(request, viewerOrigin) {
  const origin = allowedOrigin(request, viewerOrigin);
  if (origin === false || origin === null) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

async function requirePublicChannel(infra, threadId) {
  const channelId = channelIdForThread(threadId);
  const record = await infra.catalog.get(channelId);
  if (record === null
    || record.threadId !== threadId
    || record.publiclyVisible !== true) {
    return null;
  }
  return { channelId, record };
}

function route(pathname) {
  const snapshot = pathname.match(/^\/api\/threads\/([^/]+)\/snapshot$/);
  if (snapshot) return { kind: "snapshot", threadId: decodeURIComponent(snapshot[1]) };
  const events = pathname.match(/^\/api\/threads\/([^/]+)\/events$/);
  if (events) return { kind: "events", threadId: decodeURIComponent(events[1]) };
  const stream = pathname.match(/^\/api\/threads\/([^/]+)\/stream$/);
  if (stream) return { kind: "stream", threadId: decodeURIComponent(stream[1]) };
  const media = pathname.match(/^\/api\/threads\/([^/]+)\/media\/([^/]+)$/);
  if (media) return {
    kind: "media",
    threadId: decodeURIComponent(media[1]),
    objectRef: decodeURIComponent(media[2]),
  };
  return null;
}

export function createPresentationReadApi({
  infra,
  presentationServer,
  openStream,
  viewerOrigin = null,
}) {
  if (!infra?.catalog || !infra?.objects) throw new TypeError("presentation read API requires infra catalog and objects ports");
  if (!presentationServer || typeof presentationServer.getSnapshot !== "function" || typeof presentationServer.readEvents !== "function") {
    throw new TypeError("presentation read API requires PresentationServer read methods");
  }
  if (typeof openStream !== "function") throw new TypeError("presentation read API requires openStream");

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      const cors = corsHeaders(request, viewerOrigin);
      if (request.headers.get("Origin") !== null && allowedOrigin(request, viewerOrigin) === false) {
        return json({ error: "origin_not_allowed" }, { status: 403 });
      }
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
      if (request.method !== "GET") return json({ error: "method_not_allowed" }, { status: 405, headers: cors });
      if (url.pathname === "/healthz") return json({ ok: true }, { headers: cors });

      const matched = route(url.pathname);
      if (matched === null) return json({ error: "not_found" }, { status: 404, headers: cors });
      try {
        assertId("threadId", matched.threadId);
        const publicChannel = await requirePublicChannel(infra, matched.threadId);
        if (publicChannel === null) return json({ error: "not_found" }, { status: 404, headers: cors });
        const { channelId } = publicChannel;

        if (matched.kind === "snapshot") {
          const result = await presentationServer.getSnapshot(channelId);
          if (result === null || result.pointer.threadId !== matched.threadId) {
            return json({ error: "not_found" }, { status: 404, headers: cors });
          }
          return json(result, {
            headers: {
              ...cors,
              "Cache-Control": "no-cache",
              "ETag": `\"${result.pointer.snapshotDigest}\"`,
            },
          });
        }

        if (matched.kind === "events") {
          const afterText = url.searchParams.get("after") ?? "0";
          const limitText = url.searchParams.get("limit") ?? "100";
          if (!/^\d+$/.test(afterText) || !/^\d+$/.test(limitText)) {
            return json({ error: "invalid_cursor" }, { status: 400, headers: cors });
          }
          const after = Number(afterText);
          const limit = Number(limitText);
          if (!Number.isSafeInteger(after) || after < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
            return json({ error: "invalid_cursor" }, { status: 400, headers: cors });
          }
          const events = await presentationServer.readEvents({ channelId, after, limit });
          const head = await presentationServer.getHead(channelId);
          return json({ channelId, after, head: head.sequence, events }, { headers: { ...cors, "Cache-Control": "no-store" } });
        }

        if (matched.kind === "stream") {
          if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
            return json({ error: "websocket_required" }, { status: 426, headers: cors });
          }
          return openStream({ channelId, request });
        }

        assertId("objectRef", matched.objectRef);
        const media = await infra.catalog.get(`media:${matched.objectRef}`);
        if (media === null
          || media.publiclyVisible !== true
          || media.kind !== "public_presentation_media"
          || media.threadId !== matched.threadId
          || media.objectRef !== matched.objectRef) {
          return json({ error: "not_found" }, { status: 404, headers: cors });
        }
        const stored = await infra.objects.get(matched.objectRef);
        if (stored === null || stored.digest !== media.digest) {
          return json({ error: "media_integrity_failure" }, { status: 503, headers: cors });
        }
        return new Response(stored.bytes, {
          status: 200,
          headers: {
            ...cors,
            "Content-Type": media.mediaType,
            "Content-Length": String(stored.bytes.byteLength ?? stored.bytes.length),
            "Cache-Control": "public, max-age=31536000, immutable",
            "ETag": `\"${stored.digest}\"`,
            "X-Fibre-Provenance": media.provenanceClass,
          },
        });
      } catch (error) {
        if (error instanceof TypeError) return json({ error: "invalid_request" }, { status: 400, headers: cors });
        throw error;
      }
    },
  });
}

export { channelIdForThread };
