import {
  normalizeThreadPresentationBundle,
  presentationProvenanceDigest,
  threadMediaPacketDigest,
  threadPresentationPacketDigest,
} from "#services/thread-presentation/src/index.mjs";
import { threadPresentationChannelId } from "../public-asset-resolver.mjs";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

function assertId(name, value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function assertDigest(name, value) {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function sameBundle(snapshot, bundle) {
  return threadPresentationPacketDigest(snapshot.presentation) === threadPresentationPacketDigest(bundle.presentation)
    && threadMediaPacketDigest(snapshot.media) === threadMediaPacketDigest(bundle.media)
    && presentationProvenanceDigest(snapshot.provenance) === presentationProvenanceDigest(bundle.provenance);
}

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

export function createGenesisPresentationWriteApi({ presentationServer, privateToken } = {}) {
  if (!presentationServer || typeof presentationServer.getSnapshot !== "function"
    || typeof presentationServer.publishSnapshot !== "function") {
    throw new TypeError("Genesis presentation write API requires a presentation server");
  }

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== "/internal/genesis/presentations") return null;
      if (request.method !== "POST") {
        return Response.json({ error: "method_not_allowed" }, { status: 405, headers: { Allow: "POST" } });
      }
      if (!authorized(request, privateToken)) {
        return Response.json({ error: "private_token_required" }, { status: 403 });
      }

      try {
        const body = await jsonBody(request);
        const genesisId = assertId("genesisId", body.genesisId);
        const publicationDigest = assertDigest("publicationDigest", body.publicationDigest);
        const bundle = normalizeThreadPresentationBundle(body.bundle);
        const threadId = bundle.presentation.manifest.threadId;
        const channelId = threadPresentationChannelId(threadId);
        const current = await presentationServer.getSnapshot(channelId);

        if (current !== null) {
          if (!sameBundle(current.snapshot, bundle)) {
            return Response.json({ error: "presentation_conflict", threadId, genesisId }, { status: 409 });
          }
          return Response.json({
            ok: true,
            reused: true,
            genesisId,
            threadId,
            channelId,
            presentationId: bundle.presentation.manifest.presentationId,
            snapshotVersion: current.pointer.snapshotVersion,
            snapshotDigest: current.pointer.snapshotDigest,
          });
        }

        const result = await presentationServer.publishSnapshot({
          channelId,
          objectRef: `snapshot_${bundle.presentation.manifest.presentationId}`,
          snapshotVersion: `genesis-${genesisId}`,
          bundle,
          catalog: {
            publiclyVisible: true,
            genesisId,
            publicationDigest,
            projectionKind: "genesis_birth",
          },
        });
        return Response.json({
          ok: true,
          reused: false,
          genesisId,
          threadId,
          channelId,
          presentationId: bundle.presentation.manifest.presentationId,
          snapshotVersion: result.pointer.snapshotVersion,
          snapshotDigest: result.pointer.snapshotDigest,
        }, { status: 201 });
      } catch (error) {
        return Response.json({ error: "invalid_genesis_presentation", detail: error.message }, { status: 400 });
      }
    },
  });
}
