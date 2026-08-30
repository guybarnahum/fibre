import {
  PublicPresentationAssetIntegrityError,
  createPublicPresentationAssetResolver,
  threadPresentationChannelId,
} from "#services/thread-presentation/src/index.mjs";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const PRESENTATION_CHANNEL_PREFIX = "presentation:";
const DISCOVERY_SCAN_PAGE_SIZE = 100;

function assertId(name, value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
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
  const channelId = threadPresentationChannelId(threadId);
  const record = await infra.catalog.get(channelId);
  if (record === null
    || record.threadId !== threadId
    || record.publiclyVisible !== true) {
    return null;
  }
  return { channelId, record };
}

function publicIdentityCredentialAllowed(snapshot) {
  const card = snapshot?.presentation?.identityCard ?? null;
  return card === null || card.visibility === "public";
}

function route(pathname) {
  if (pathname === "/api/threads") return { kind: "threads" };
  const asset = pathname.match(/^\/api\/assets\/([^/]+)$/);
  if (asset) return { kind: "asset", objectRef: decodeURIComponent(asset[1]) };
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

function discoveryPage(url) {
  const limitText = url.searchParams.get("limit") ?? "50";
  if (!/^\d+$/.test(limitText)) throw new TypeError("discovery limit is invalid");
  const limit = Number(limitText);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new TypeError("discovery limit is invalid");
  const cursor = url.searchParams.get("cursor");
  if (cursor !== null) assertId("discovery cursor", cursor);
  return { limit, cursor };
}

function publicDiscoveryEntry({ key, value, current }) {
  if (value?.publiclyVisible !== true || value?.channelId !== key) return null;
  try {
    assertId("discovery threadId", value.threadId);
  } catch {
    return null;
  }
  if (threadPresentationChannelId(value.threadId) !== key) return null;
  if (current === null
    || current.pointer.threadId !== value.threadId
    || !publicIdentityCredentialAllowed(current.snapshot)) {
    return null;
  }
  return {
    threadId: value.threadId,
    lifecycleStatus: value.lifecycleStatus ?? null,
    snapshotVersion: current.pointer.snapshotVersion,
    snapshotDigest: current.pointer.snapshotDigest,
  };
}

async function discoverPublicThreads({ infra, presentationServer, url }) {
  const { limit, cursor } = discoveryPage(url);
  const threads = [];
  let after = cursor;

  while (threads.length < limit) {
    const page = await infra.catalog.list({
      prefix: PRESENTATION_CHANNEL_PREFIX,
      after,
      limit: DISCOVERY_SCAN_PAGE_SIZE,
    });
    if (page.entries.length === 0) return { threads, nextCursor: null };

    for (const { key, value } of page.entries) {
      after = key;
      const current = await presentationServer.getSnapshot(key);
      const entry = publicDiscoveryEntry({ key, value, current });
      if (entry !== null) threads.push(entry);
      if (threads.length === limit) {
        const moreCatalogEntries = key !== page.entries.at(-1).key || page.nextCursor !== null;
        return { threads, nextCursor: moreCatalogEntries ? key : null };
      }
    }

    if (page.nextCursor === null) return { threads, nextCursor: null };
    after = page.nextCursor;
  }

  return { threads, nextCursor: after };
}

export function createPresentationReadApi({
  infra,
  presentationServer,
  openStream,
  viewerOrigin = null,
}) {
  if (!infra?.catalog || !infra?.objects || typeof infra.catalog.list !== "function") {
    throw new TypeError("presentation read API requires infra catalog and objects ports");
  }
  if (!presentationServer || typeof presentationServer.getSnapshot !== "function" || typeof presentationServer.readEvents !== "function") {
    throw new TypeError("presentation read API requires PresentationServer read methods");
  }
  if (typeof openStream !== "function") throw new TypeError("presentation read API requires openStream");

  const assetResolver = createPublicPresentationAssetResolver({
    infra,
    presentationReader: presentationServer,
  });

  async function serveAsset(objectRef, cors, { expectedThreadId = null } = {}) {
    const resolved = await assetResolver.resolve(objectRef, { expectedThreadId });
    if (resolved === null) return json({ error: "not_found" }, { status: 404, headers: cors });
    return new Response(resolved.bytes, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": resolved.mediaType,
        "Content-Length": String(resolved.bytes.byteLength ?? resolved.bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "ETag": `\"${resolved.digest}\"`,
        "X-Fibre-Provenance": resolved.provenanceClass,
      },
    });
  }

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
        if (matched.kind === "threads") {
          return json(await discoverPublicThreads({ infra, presentationServer, url }), {
            headers: { ...cors, "Cache-Control": "no-cache" },
          });
        }

        if (matched.kind === "asset") {
          assertId("objectRef", matched.objectRef);
          return await serveAsset(matched.objectRef, cors);
        }

        assertId("threadId", matched.threadId);
        if (matched.kind === "media") {
          assertId("objectRef", matched.objectRef);
          return await serveAsset(matched.objectRef, cors, { expectedThreadId: matched.threadId });
        }

        const publicChannel = await requirePublicChannel(infra, matched.threadId);
        if (publicChannel === null) return json({ error: "not_found" }, { status: 404, headers: cors });
        const { channelId } = publicChannel;

        if (matched.kind === "snapshot") {
          const result = await presentationServer.getSnapshot(channelId);
          if (result === null || result.pointer.threadId !== matched.threadId || !publicIdentityCredentialAllowed(result.snapshot)) {
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

        if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
          return json({ error: "websocket_required" }, { status: 426, headers: cors });
        }
        return openStream({ channelId, request });
      } catch (error) {
        if (error instanceof PublicPresentationAssetIntegrityError) {
          return json({ error: "media_integrity_failure" }, { status: 503, headers: cors });
        }
        if (error instanceof TypeError) return json({ error: "invalid_request" }, { status: 400, headers: cors });
        throw error;
      }
    },
  });
}

const channelIdForThread = threadPresentationChannelId;
export { channelIdForThread };
