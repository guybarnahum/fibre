import { assertId, assertStringArray } from "./persistence-common.mjs";
import { IDENTITY_ATOMIC_CLAIM_POLICY } from "./identity-claim-discipline.mjs";
import { identityDomainV2Definition } from "./identity-domain-registry-v2.mjs";
import { identityAssertionId, identityClaimId } from "./identity-provenance-domain.mjs";
import { lifeRelationRevisionRef, placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";
import { normalizeLifeRelation, normalizePlaceEpisode } from "./situated-life-domain.mjs";

export function livedLanguageFormationClaim({
  threadId,
  kind,
  claimPredicate,
  meaning,
  eventReferences,
  lifeRelations = [],
  placeEpisodes = [],
  recordedAt,
  effectiveAt = recordedAt,
  visibility = "private",
}) {
  assertStringArray("eventReferences", eventReferences);
  if (eventReferences.length === 0) {
    throw new TypeError("language formation requires a lived-event witness; ancestry, geography, name, or embodiment alone are insufficient");
  }
  eventReferences.forEach((ref, index) => assertId(`eventReferences[${index}]`, ref));

  const refs = [...eventReferences];
  for (const candidate of lifeRelations) {
    const relation = normalizeLifeRelation(candidate);
    if (relation.threadId !== threadId) throw new TypeError("language relation evidence belongs to another Thread");
    refs.push(lifeRelationRevisionRef(relation));
  }
  for (const candidate of placeEpisodes) {
    const episode = normalizePlaceEpisode(candidate);
    if (episode.threadId !== threadId) throw new TypeError("language place evidence belongs to another Thread");
    refs.push(placeEpisodeRevisionRef(episode));
  }

  const claimId = identityClaimId({ threadId, kind, claimPredicate });
  return {
    assertionId: identityAssertionId({ claimId, revision: 1, recordedAt, meaning }),
    claimId,
    revision: 1,
    threadId,
    domain: "language_formation",
    kind,
    claimPredicate,
    meaning,
    provenanceClass: "upbringing_cultural",
    authorship: { kind: "fibre_policy_derived", entityId: "fibre.world-kernel" },
    sourceReferences: [...new Set(refs)],
    effectiveAt,
    recordedAt,
    visibility,
    status: "current",
    projectionClass: identityDomainV2Definition("language_formation").projectionSection,
    behavioralStatus: "context_only",
    admission: {
      policy: { id: "situated_identity_projection", version: "1" },
      claimDiscipline: { ...IDENTITY_ATOMIC_CLAIM_POLICY },
      admittedBy: { entityId: "fibre.world-kernel", kind: "institution", displayName: "Fibre World Kernel" },
      evidenceClassification: "exogenous",
      sourceMode: "fibre_derivation",
    },
  };
}
