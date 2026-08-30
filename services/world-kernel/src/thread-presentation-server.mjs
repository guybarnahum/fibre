import { canonicalJson, assertId, assertNonEmpty, sha256 } from "./persistence-common.mjs";
import { requireInfraCapabilities } from "#infra";
import { normalizeThreadPresentationBundle } from "./thread-presentation-domain.mjs";
import {
  materializeThreadPresentationEvent,
  normalizeThreadPresentationEventInput,
} from "./thread-presentation-stream-domain.mjs";

export class PresentationSnapshotSequenceConflictError extends Error {}

export function createThreadPresentationServer({ infra }) {
  requireInfraCapabilities(infra, "streams", "objects", "catalog", "realtime");

  return Object.freeze({
    async appendEvent(input, { expectedSequence } = {}) {
      const normalized = normalizeThreadPresentationEventInput(input);
      const accepted = await infra.streams.append(normalized.channelId, normalized, {
        idempotencyKey: normalized.eventId,
        expectedSequence,
      });
      const event = materializeThreadPresentationEvent(accepted.value, accepted.sequence);
      if (!accepted.duplicate) await infra.realtime.publish(normalized.channelId, event);
      return { event, duplicate: accepted.duplicate };
    },

    async readEvents({ channelId, after = 0, limit = 100 }) {
      assertId("channelId", channelId);
      const entries = await infra.streams.readAfter(channelId, after, limit);
      return entries.map(({ sequence, value }) => materializeThreadPresentationEvent(value, sequence));
    },

    async getHead(channelId) {
      assertId("channelId", channelId);
      return infra.streams.getHead(channelId);
    },

    async publishSnapshot({
      channelId,
      objectRef,
      snapshotVersion,
      bundle,
      expectedSequence,
      catalog = {},
    }) {
      assertId("channelId", channelId);
      assertId("objectRef", objectRef);
      assertNonEmpty("snapshotVersion", snapshotVersion);
      const normalized = normalizeThreadPresentationBundle(bundle);
      const head = await infra.streams.getHead(channelId);
      if (expectedSequence !== undefined && head.sequence !== expectedSequence) {
        throw new PresentationSnapshotSequenceConflictError(
          `snapshot expected sequence ${expectedSequence}, current ${head.sequence}`,
        );
      }
      const snapshot = {
        snapshotVersion,
        cursor: head.sequence,
        presentation: normalized.presentation,
        media: normalized.media,
        provenance: normalized.provenance,
      };
      const bytes = canonicalJson(snapshot);
      const digest = `sha256:${sha256(bytes)}`;
      await infra.objects.putImmutable(objectRef, bytes, digest, {
        kind: "thread_presentation_snapshot",
        channelId,
        threadId: normalized.presentation.manifest.threadId,
        snapshotVersion,
        cursor: head.sequence,
      });
      const pointer = await infra.streams.publishSnapshot(channelId, {
        objectRef,
        snapshotVersion,
        snapshotDigest: digest,
        threadId: normalized.presentation.manifest.threadId,
      }, { expectedSequence: head.sequence });
      const priorCatalog = await infra.catalog.get(channelId);
      await infra.catalog.upsert(channelId, {
        ...(priorCatalog ?? {}),
        channelId,
        threadId: normalized.presentation.manifest.threadId,
        lifecycleStatus: normalized.presentation.manifest.lifecycleStatus,
        fixture: normalized.presentation.manifest.fixture,
        latestSnapshotVersion: snapshotVersion,
        latestSnapshotDigest: digest,
        ...catalog,
      });
      return { snapshot, pointer, digest, objectRef };
    },

    async getSnapshot(channelId) {
      assertId("channelId", channelId);
      const pointer = await infra.streams.getSnapshotPointer(channelId);
      if (pointer === null) return null;
      const stored = await infra.objects.get(pointer.objectRef);
      if (stored === null) throw new Error("snapshot pointer references a missing immutable object");
      if (stored.digest !== pointer.snapshotDigest) throw new Error("snapshot object digest does not match stream pointer");
      return {
        pointer,
        snapshot: JSON.parse(typeof stored.bytes === "string" ? stored.bytes : new TextDecoder().decode(stored.bytes)),
      };
    },
  });
}
