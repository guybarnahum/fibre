import { assertId, canonicalJson, sha256 } from "./persistence-common.mjs";
import { semanticStateDigest } from "./semantic-state.mjs";

const HASH = /^sha256:[0-9a-f]{64}$/;
const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;

function binding(ref, kind, contentDigest, {
  revision = null,
  visibility = null,
  status = null,
  provenance = null,
} = {}) {
  assertId("identity context source ref", ref);
  if (!HASH.test(contentDigest)) {
    throw new TypeError(`identity context source ${ref} has an invalid content digest`);
  }
  if (revision !== null && (!Number.isSafeInteger(revision) || revision < 1)) {
    throw new TypeError(`identity context source ${ref} has an invalid revision`);
  }
  return { ref, kind, revision, contentDigest, visibility, status, provenance };
}

export function buildIdentityContextSourceBindings(sources) {
  const items = [
    ...sources.identityView.assertions.map((item) => binding(
      item.assertionId, "identity_assertion", item.assertionDigest, {
        revision: item.revision,
        visibility: item.visibility,
        status: item.status,
        provenance: {
          claimId: item.claimId,
          registryVersion: item.registryVersion,
          domain: item.domain,
          assertionKind: item.kind,
          projectionClass: item.projectionClass,
          behavioralStatus: item.behavioralStatus,
          provenanceClass: item.provenanceClass,
          authorship: item.authorship,
          sourceReferences: [...item.sourceReferences],
          effectiveAt: item.effectiveAt,
          recordedAt: item.recordedAt,
        },
      },
    )),
    ...sources.semanticState.map((item) => binding(
      item.stateId, "semantic_state", semanticStateDigest(item), {
        visibility: item.visibility,
        status: item.staleness,
        provenance: {
          domain: item.domain,
          dimension: item.dimension,
          target: item.target,
          evidenceReferences: [...item.evidenceReferences],
          asOf: item.asOf,
          recordProvenance: item.provenance,
        },
      },
    )),
    ...sources.memories.map((item) => binding(
      item.memoryId, "autobiographical_memory", digest(item), {
        revision: item.revision,
        visibility: item.visibility,
        status: item.status,
        provenance: {
          subject: item.subject,
          eventRefs: [...item.eventRefs],
          authorship: item.authorship,
          asOf: item.asOf,
          recordedAt: item.recordedAt,
          accessibility: item.accessibility,
          retentionState: item.retentionState,
        },
      },
    )),
    ...sources.lifeRelations.map((item) => binding(
      item.relationId, "life_relation", digest(item), {
        revision: item.revision,
        visibility: item.visibility,
        status: item.status ?? "current",
        provenance: {
          relationKind: item.relationKind,
          relatedParty: item.relatedParty,
          sourceReferences: [...item.sourceReferences],
          recordedAt: item.recordedAt,
          recordProvenance: item.provenance,
        },
      },
    )),
    ...sources.placeEpisodes.map((item) => binding(
      item.episodeId, "place_episode", digest(item), {
        revision: item.revision,
        visibility: item.visibility,
        status: item.status ?? "current",
        provenance: {
          episodeKind: item.episodeKind,
          place: item.place,
          sourceReferences: [...item.sourceReferences],
          recordedAt: item.recordedAt,
          recordProvenance: item.provenance,
        },
      },
    )),
    ...sources.embodiment.map((item) => binding(
      item.embodimentId, "embodiment", digest(item), {
        revision: item.revision,
        visibility: item.visibility,
        status: item.status ?? "current",
        provenance: {
          representationKind: item.representationKind,
          sourceReferences: [...item.sourceReferences],
          permissionReferences: [...item.permissionReferences],
          recordedAt: item.recordedAt,
          rightsBasis: item.rightsBasis,
        },
      },
    )),
    ...sources.genomes.flatMap((bundle) => bundle.loci.map((locus) => binding(
      locus.locusId, "genome_locus", digest(locus), {
        revision: locus.ordinal,
        status: "context_only",
        provenance: {
          genomeId: bundle.header.genomeId,
          genomeDigest: bundle.genomeDigest,
          originKind: bundle.header.originKind,
          locusProvenance: locus.provenance,
        },
      },
    ))),
  ].sort((a, b) => `${a.kind}:${a.ref}`.localeCompare(`${b.kind}:${b.ref}`));
  if (new Set(items.map((item) => item.ref)).size !== items.length) {
    throw new TypeError("identity context authoritative source refs must be unique");
  }
  return items;
}
