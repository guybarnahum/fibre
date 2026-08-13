import { canonicalJson, sha256 } from "./persistence-common.mjs";
import { normalizeLifeRelation, normalizePlaceEpisode } from "./situated-life-domain.mjs";

export function lifeRelationRevisionRef(candidate) {
  const record = normalizeLifeRelation(candidate);
  return `lrr_${sha256(canonicalJson(record))}`;
}

export function placeEpisodeRevisionRef(candidate) {
  const record = normalizePlaceEpisode(candidate);
  return `per_${sha256(canonicalJson(record))}`;
}

export function situatedLifeEvidenceSummary({ lifeRelations = [], placeEpisodes = [] }) {
  return {
    lifeRelations: lifeRelations.map((record) => ({
      ref: lifeRelationRevisionRef(record),
      relationId: record.relationId,
      revision: record.revision,
      relationKind: record.relationKind,
      relatedPartyKind: record.relatedParty.kind,
    })),
    placeEpisodes: placeEpisodes.map((record) => ({
      ref: placeEpisodeRevisionRef(record),
      episodeId: record.episodeId,
      revision: record.revision,
      episodeKind: record.episodeKind,
      placeId: record.place.placeId,
    })),
  };
}
