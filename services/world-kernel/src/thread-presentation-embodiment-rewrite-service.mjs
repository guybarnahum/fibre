import { normalizeEmbodimentRepresentation } from "./embodiment-domain.mjs";
import { canonicalJson, assertId, sha256 } from "./persistence-common.mjs";
import { projectPublicEmbodimentVisualIdentity } from "./thread-presentation-embodiment-projection.mjs";
import { normalizeThreadPresentationBundle } from "./thread-presentation-domain.mjs";

export class ThreadPresentationVisualIdentityConflictError extends Error {}

function projectionProvenanceRef(embodiment) {
  const digest = sha256(canonicalJson({
    threadId: embodiment.threadId,
    embodimentId: embodiment.embodimentId,
    embodimentRevision: embodiment.revision,
    specificationDigest: embodiment.specificationDigest,
    referenceObjectRef: embodiment.asset?.referenceObjectRef ?? null,
  }));
  return `prov_visual_identity_${digest}`;
}

function projectionRecordedAt(bundle, embodiment) {
  const candidates = [
    bundle.presentation.manifest.generatedAt,
    bundle.provenance.generatedAt,
    embodiment.recordedAt,
  ];
  return candidates.reduce((latest, candidate) =>
    Date.parse(candidate) > Date.parse(latest) ? candidate : latest);
}

function same(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function appendProjectionProvenance(bundle, projection, embodiment) {
  const entry = {
    provenanceId: projection.provenanceRef,
    kind: "fibre_projection",
    sourceReferences: [...projection.sourceReferences],
    note: `Public visual identity projected from admitted Embodiment ${embodiment.embodimentId} revision ${embodiment.revision}; presentation does not own or redefine the underlying identity.`,
  };
  const prior = bundle.provenance.entries.find((candidate) => candidate.provenanceId === entry.provenanceId);
  if (prior !== undefined) {
    if (!same(prior, entry)) {
      throw new ThreadPresentationVisualIdentityConflictError(
        `visual identity provenance ${entry.provenanceId} already exists with different content`,
      );
    }
    return bundle.provenance.entries;
  }
  return [...bundle.provenance.entries, entry];
}

function ensureProgression(current, next) {
  if (current === null) return;
  if (current.embodimentId !== next.embodimentId) {
    throw new ThreadPresentationVisualIdentityConflictError(
      "public visual identity cannot switch to a different canonical Embodiment lineage",
    );
  }
  if (current.embodimentRevision > next.embodimentRevision) {
    throw new ThreadPresentationVisualIdentityConflictError(
      `stale Embodiment revision ${next.embodimentRevision} cannot replace projected revision ${current.embodimentRevision}`,
    );
  }
  if (current.embodimentRevision === next.embodimentRevision && !same(current, next)) {
    throw new ThreadPresentationVisualIdentityConflictError(
      "the projected Embodiment revision already exists with different visual identity content",
    );
  }
}

function rewriteIdentity({ current, projection, embodiment }) {
  const bundle = normalizeThreadPresentationBundle({
    presentation: current.snapshot.presentation,
    media: current.snapshot.media,
    provenance: current.snapshot.provenance,
  });
  const manifest = bundle.presentation.manifest;
  if (manifest.threadId !== embodiment.threadId || current.pointer.threadId !== embodiment.threadId) {
    throw new ThreadPresentationVisualIdentityConflictError(
      "Embodiment Thread does not match the current presentation snapshot",
    );
  }
  if (manifest.fixture === true || manifest.lifecycleStatus === "genesis_candidate") {
    throw new ThreadPresentationVisualIdentityConflictError(
      "canonical Embodiment cannot be projected into a Genesis candidate or fixture presentation",
    );
  }

  ensureProgression(bundle.presentation.visualIdentity, projection);
  if (bundle.presentation.visualIdentity !== null && same(bundle.presentation.visualIdentity, projection)) {
    return { bundle, reused: true };
  }

  const recordedAt = projectionRecordedAt(bundle, embodiment);
  return {
    reused: false,
    bundle: normalizeThreadPresentationBundle({
      presentation: {
        ...bundle.presentation,
        manifest: {
          ...bundle.presentation.manifest,
          generatedAt: recordedAt,
        },
        visualIdentity: projection,
      },
      media: bundle.media,
      provenance: {
        ...bundle.provenance,
        generatedAt: recordedAt,
        entries: appendProjectionProvenance(bundle, projection, embodiment),
      },
    }),
  };
}

function publicationIdentity(current, projection) {
  const digest = sha256(canonicalJson({
    priorSnapshotDigest: current.pointer.snapshotDigest,
    embodimentId: projection.embodimentId,
    embodimentRevision: projection.embodimentRevision,
    specificationDigest: projection.specificationDigest,
    referenceObjectRefs: projection.referenceObjectRefs,
  }));
  return Object.freeze({
    objectRef: `snapshot_visual_identity_${digest}`,
    snapshotVersion: `visual-identity-${digest.slice(0, 24)}`,
  });
}

async function readCurrentEmbodiment(embodimentReader, threadId, embodimentId) {
  const current = await embodimentReader.listCurrent(threadId);
  if (!Array.isArray(current)) throw new TypeError("Embodiment authority listCurrent() must return an array");
  const matches = current.filter((candidate) => candidate?.embodimentId === embodimentId);
  if (matches.length !== 1) {
    throw new ThreadPresentationVisualIdentityConflictError(
      matches.length === 0
        ? `Embodiment ${embodimentId} is not current authoritative state for Thread ${threadId}`
        : `Embodiment authority returned duplicate current records for ${embodimentId}`,
    );
  }
  return normalizeEmbodimentRepresentation(matches[0]);
}

export function createThreadPresentationEmbodimentRewriteService({
  presentationServer,
  embodimentReader,
} = {}) {
  if (!presentationServer
    || typeof presentationServer.getSnapshot !== "function"
    || typeof presentationServer.publishSnapshot !== "function") {
    throw new TypeError("visual identity rewrite service requires a PresentationServer");
  }
  if (!embodimentReader || typeof embodimentReader.listCurrent !== "function") {
    throw new TypeError("visual identity rewrite service requires the Embodiment authority reader");
  }

  return Object.freeze({
    async project({ channelId, embodimentId } = {}) {
      assertId("channelId", channelId);
      assertId("embodimentId", embodimentId);
      const current = await presentationServer.getSnapshot(channelId);
      if (current === null) {
        throw new ThreadPresentationVisualIdentityConflictError(
          "public visual identity requires an existing Thread presentation snapshot",
        );
      }
      assertId("presentation threadId", current.pointer.threadId);
      const embodiment = await readCurrentEmbodiment(
        embodimentReader,
        current.pointer.threadId,
        embodimentId,
      );
      const provenanceRef = projectionProvenanceRef(embodiment);
      const projection = projectPublicEmbodimentVisualIdentity(embodiment, { provenanceRef });
      if (projection === null) {
        return Object.freeze({
          rewritten: false,
          reused: false,
          reason: "embodiment_not_publicly_projectable",
          projection: null,
          publication: null,
        });
      }

      const rewrite = rewriteIdentity({ current, projection, embodiment });
      if (rewrite.reused) {
        return Object.freeze({
          rewritten: false,
          reused: true,
          reason: null,
          projection,
          publication: current,
        });
      }

      const identity = publicationIdentity(current, projection);
      const expectedSequence = current.pointer.sequence ?? current.snapshot.cursor;
      const publication = await presentationServer.publishSnapshot({
        channelId,
        objectRef: identity.objectRef,
        snapshotVersion: identity.snapshotVersion,
        bundle: rewrite.bundle,
        expectedSequence,
        catalog: {
          projectionKind: "embodiment_visual_identity",
          visualIdentityEmbodimentId: projection.embodimentId,
          visualIdentityEmbodimentRevision: projection.embodimentRevision,
        },
      });
      return Object.freeze({
        rewritten: true,
        reused: false,
        reason: null,
        projection,
        publication,
      });
    },
  });
}
