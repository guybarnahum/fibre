import { IDENTITY_ATOMIC_CLAIM_POLICY } from "./identity-claim-discipline.mjs";
import { identityDomainV2Definition } from "./identity-domain-registry-v2.mjs";
import { identityAssertionId, identityClaimId } from "./identity-provenance-domain.mjs";
import { lifeRelationRevisionRef, placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";
import { normalizeLifeRelation, normalizePlaceEpisode } from "./situated-life-domain.mjs";

export function culturalFormationIdentityClaim({
  threadId,
  kind,
  claimPredicate,
  meaning,
  evidence,
  recordedAt,
  effectiveAt = recordedAt,
  visibility = "private",
}) {
  const refs = [];
  for (const relation of evidence.lifeRelations ?? []) {
    const item = normalizeLifeRelation(relation);
    if (item.threadId !== threadId) throw new TypeError("cultural evidence relation belongs to another Thread");
    refs.push(lifeRelationRevisionRef(item));
  }
  for (const episode of evidence.placeEpisodes ?? []) {
    const item = normalizePlaceEpisode(episode);
    if (item.threadId !== threadId) throw new TypeError("cultural evidence place episode belongs to another Thread");
    refs.push(placeEpisodeRevisionRef(item));
  }
  if (refs.length === 0) {
    throw new TypeError("cultural formation requires explicit lived evidence; ancestry or demographic labels alone are insufficient");
  }
  const claimId = identityClaimId({ threadId, kind, claimPredicate });
  const assertionId = identityAssertionId({ claimId, revision: 1, recordedAt, meaning });
  return {
    assertionId,
    claimId,
    revision: 1,
    threadId,
    domain: "cultural_formation",
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
    projectionClass: identityDomainV2Definition("cultural_formation").projectionSection,
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
