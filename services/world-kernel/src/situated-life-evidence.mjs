import { normalizeLifeRelation, normalizePlaceEpisode } from "./situated-life-domain.mjs";

export function lifeRelationRevisionRef(candidate) {
  const record = normalizeLifeRelation(candidate);
  return `lrr:${record.relationId}:${record.revision}`;
}

export function placeEpisodeRevisionRef(candidate) {
  const record = normalizePlaceEpisode(candidate);
  return `per:${record.episodeId}:${record.revision}`;
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
