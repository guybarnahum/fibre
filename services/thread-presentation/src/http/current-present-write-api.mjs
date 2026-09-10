import { THREAD_PRESENTATION_STREAM_VERSION } from "fibre/world-kernel/thread-presentation-contracts";
import { threadPresentationChannelId } from "../public-asset-resolver.mjs";

function authorized(request, privateToken) {
  return typeof privateToken === "string"
    && privateToken.length > 0
    && request.headers.get("x-fibre-private-token") === privateToken;
}

async function jsonBody(request) {
  try {
    const value = await request.json();
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    return value;
  } catch {
    throw new TypeError("request body must be a JSON object");
  }
}

function failureResponse(error) {
  const detail = error instanceof Error ? error.message : String(error);
  if (error instanceof TypeError) {
    return Response.json({ error: "invalid_current_present_handoff", detail, retryable: false }, { status: 400 });
  }
  const retryable = error?.retryable !== false;
  const code = typeof error?.code === "string" && error.code !== ""
    ? error.code
    : "CURRENT_PRESENT_PUBLICATION_FAILED";
  return Response.json({ error: "current_present_publication_failed", code, detail, retryable }, { status: 503 });
}

export function createCurrentPresentWriteApi({
  infra,
  presentationServer,
  scheduleDepiction = null,
  privateToken,
} = {}) {
  if (!infra?.catalog || typeof infra.catalog.get !== "function") {
    throw new TypeError("current present write API requires presentation catalog access");
  }
  if (!presentationServer
    || typeof presentationServer.appendEvent !== "function"
    || typeof presentationServer.getSnapshot !== "function") {
    throw new TypeError("current present write API requires a presentation server");
  }
  if (scheduleDepiction !== null && typeof scheduleDepiction !== "function") {
    throw new TypeError("scheduleDepiction must be a function or null");
  }

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== "/internal/current-present") return null;
      if (request.method !== "POST") {
        return Response.json({ error: "method_not_allowed" }, { status: 405, headers: { Allow: "POST" } });
      }
      if (!authorized(request, privateToken)) {
        return Response.json({ error: "private_token_required" }, { status: 403 });
      }

      try {
        const body = await jsonBody(request);
        const threadId = body.threadId;
        const present = body.present;
        const channelId = threadPresentationChannelId(threadId);
        const [current, catalog] = await Promise.all([
          presentationServer.getSnapshot(channelId),
          infra.catalog.get(channelId),
        ]);
        if (current === null || current.pointer.threadId !== threadId || catalog?.publiclyVisible !== true) {
          const error = new Error(`Thread ${threadId} does not have an admitted public presentation`);
          error.code = "THREAD_PRESENTATION_NOT_PUBLIC";
          error.retryable = true;
          throw error;
        }

        const accepted = await presentationServer.appendEvent({
          streamVersion: THREAD_PRESENTATION_STREAM_VERSION,
          eventId: `present_${present?.situationId ?? "invalid"}`,
          threadId,
          channelId,
          occurredAt: present?.establishedAt,
          emittedAt: present?.establishedAt,
          kind: "present.updated",
          provenanceRef: present?.situationId,
          sourceReferences: [present?.situationId],
          payload: present,
        });
        const depiction = scheduleDepiction === null
          ? null
          : await scheduleDepiction({
              present: accepted.event.payload,
              presentation: current.snapshot.presentation,
            });
        return Response.json({ ok: true, event: accepted.event, duplicate: accepted.duplicate, depiction });
      } catch (error) {
        return failureResponse(error);
      }
    },
  });
}
