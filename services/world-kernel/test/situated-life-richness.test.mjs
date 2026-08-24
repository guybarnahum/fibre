import assert from "node:assert/strict";
import test from "node:test";

import { identityAssertionDigest } from "../src/identity-provenance-domain.mjs";
import { IDENTITY_DOMAIN_REGISTRY_V2_VERSION } from "../src/identity-domain-registry-v2.mjs";
import { livedCulturalFormationClaim } from "../src/lived-cultural-formation-authoring.mjs";
import {
  lifeRelationId,
  normalizeLifeRelation,
  normalizePlaceEpisode,
  placeEpisodeId,
} from "../src/situated-life-domain.mjs";
import {
  lifeRelationRevisionRef,
  placeEpisodeRevisionRef,
  situatedLifeEvidenceSummary,
} from "../src/situated-life-evidence.mjs";

const THREAD_ID = "thr_situated_richness_001";
const EVENT_REF = "evt_lived_library_walk_001";

function socialRelationship() {
  return normalizeLifeRelation({
    relationId: lifeRelationId({ threadId: THREAD_ID, partyId: "human_neighbor_lee" }),
    revision: 1,
    threadId: THREAD_ID,
    relatedParty: {
      partyId: "human_neighbor_lee",
      kind: "human_source",
      displayName: "Ms. Lee",
    },
    relationKind: "social_contact",
    geneticContributionRole: "none",
    factualRoleRefs: ["neighbor", "library_companion"],
    relationshipFacts: [
      "Ms. Lee lives in the same apartment building and regularly walks with the child to the neighborhood library.",
      "She encourages the child to choose her own books rather than choosing for her.",
    ],
    sourceReferences: [EVENT_REF],
    validFrom: "2009-09-01T00:00:00Z",
    validTo: "2014-06-30T23:59:59Z",
    visibility: "private",
    status: "current",
    provenance: "thread_history",
    recordedAt: "2026-08-24T17:00:00Z",
  });
}

function formativePlace() {
  return normalizePlaceEpisode({
    episodeId: placeEpisodeId({ threadId: THREAD_ID, placeId: "place_neighborhood_library" }),
    revision: 1,
    threadId: THREAD_ID,
    episodeKind: "formative_presence",
    place: {
      placeId: "place_neighborhood_library",
      displayName: "Neighborhood Public Library",
      countryCode: "US",
      region: "Arizona",
      locality: "Tucson",
      precision: "locality",
    },
    startAt: "2009-09-01T00:00:00Z",
    endAt: "2014-06-30T23:59:59Z",
    sourceReferences: [EVENT_REF],
    visibility: "private",
    status: "current",
    provenance: "thread_history",
    recordedAt: "2026-08-24T17:00:00Z",
  });
}

function culturalClaim({ lifeRelations, placeEpisodes }) {
  return livedCulturalFormationClaim({
    threadId: THREAD_ID,
    kind: "independent_library_choice",
    claimPredicate: {
      subject: "self",
      predicate: "formed_practice",
      object: "choosing_books_independently_with_familiar_social_support",
    },
    meaning: "Repeated library visits with a familiar neighbor gave independent book choice a stable social and local context.",
    eventReferences: [EVENT_REF],
    lifeRelations,
    placeEpisodes,
    recordedAt: "2026-08-24T17:10:00Z",
  });
}

test("a social relationship is specific lived context rather than a generic related-party label", () => {
  const relation = socialRelationship();
  assert.equal(relation.relationKind, "social_contact");
  assert.deepEqual(relation.factualRoleRefs, ["neighbor", "library_companion"]);
  assert.equal(relation.relationshipFacts.length, 2);
  assert.notEqual(relation.relationshipFacts[0], relation.relationshipFacts[1]);
  assert.equal(relation.sourceReferences.includes(EVENT_REF), true);
  assert.equal(Date.parse(relation.validTo) > Date.parse(relation.validFrom), true);

  assert.throws(
    () => normalizeLifeRelation({
      ...structuredClone(relation),
      factualRoleRefs: [],
    }),
    /factualRoleRefs must not be empty/,
  );
});

test("relationship and place witnesses materially change the evidence basis of the same cultural claim", () => {
  const relation = socialRelationship();
  const place = formativePlace();
  const contextual = culturalClaim({ lifeRelations: [relation], placeEpisodes: [place] });
  const eventOnly = culturalClaim({ lifeRelations: [], placeEpisodes: [] });

  const relationRef = lifeRelationRevisionRef(relation);
  const placeRef = placeEpisodeRevisionRef(place);
  assert.deepEqual(contextual.sourceReferences, [EVENT_REF, relationRef, placeRef]);
  assert.deepEqual(eventOnly.sourceReferences, [EVENT_REF]);

  // Claim identity stays stable because the proposition is the same; the evidence-bearing
  // assertion digest changes because relationship and place are functional witnesses.
  assert.equal(contextual.claimId, eventOnly.claimId);
  assert.equal(contextual.assertionId, eventOnly.assertionId);
  assert.notEqual(
    identityAssertionDigest(contextual, { registryVersion: IDENTITY_DOMAIN_REGISTRY_V2_VERSION }),
    identityAssertionDigest(eventOnly, { registryVersion: IDENTITY_DOMAIN_REGISTRY_V2_VERSION }),
  );
  assert.equal(contextual.behavioralStatus, "context_only");
});

test("situated evidence exposes distinct relationship and place coordinates without inventing autobiographical meaning", () => {
  const relation = socialRelationship();
  const place = formativePlace();
  const summary = situatedLifeEvidenceSummary({ lifeRelations: [relation], placeEpisodes: [place] });

  assert.deepEqual(summary.lifeRelations, [{
    ref: lifeRelationRevisionRef(relation),
    relationId: relation.relationId,
    revision: 1,
    relationKind: "social_contact",
    relatedPartyKind: "human_source",
  }]);
  assert.deepEqual(summary.placeEpisodes, [{
    ref: placeEpisodeRevisionRef(place),
    episodeId: place.episodeId,
    revision: 1,
    episodeKind: "formative_presence",
    placeId: "place_neighborhood_library",
  }]);
  assert.equal(Object.hasOwn(relation, "meaning"), false);
  assert.equal(Object.hasOwn(place, "meaning"), false);
});
