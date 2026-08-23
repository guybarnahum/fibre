import { IntegrityError, canonicalJson } from "./persistence-common.mjs";
import { normalizeLifeRelation, normalizePlaceEpisode } from "./situated-life-domain.mjs";
import { lifeRelationRevisionRef, placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";
import { situatedRecordDigest } from "./situated-life-integrity.mjs";

export function appendLifeRelationRevisionInTransaction(
  database,
  candidate,
  { previousDigest = null } = {},
) {
  const record = normalizeLifeRelation(candidate);
  const digest = situatedRecordDigest("life_relation", record, previousDigest);
  database.prepare(`
    INSERT INTO life_relation_records(
      relation_id,revision,thread_id,related_party_id,relation_kind,
      genetic_contribution_role,visibility,provenance,recorded_at,
      supersedes_revision,record_json,record_digest
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    record.relationId,
    record.revision,
    record.threadId,
    record.relatedParty.partyId,
    record.relationKind,
    record.geneticContributionRole,
    record.visibility,
    record.provenance,
    record.recordedAt,
    record.supersedesRevision ?? null,
    canonicalJson(record),
    digest,
  );
  database.prepare(`
    INSERT INTO situated_life_lineage_heads(
      ledger_kind,lineage_id,revision,thread_id,head_digest,recorded_at
    ) VALUES ('life_relation',?,?,?,?,?)
  `).run(
    record.relationId,
    record.revision,
    record.threadId,
    digest,
    record.recordedAt,
  );

  const witnessRef = lifeRelationRevisionRef(record);
  const witness = database.prepare(`
    SELECT reference,thread_id,witness_kind,source_id,revision,record_digest
    FROM situated_evidence_witnesses WHERE reference=?
  `).get(witnessRef);
  if (
    witness === undefined ||
    witness.thread_id !== record.threadId ||
    witness.witness_kind !== "life_relation_revision" ||
    witness.source_id !== record.relationId ||
    Number(witness.revision) !== record.revision ||
    witness.record_digest !== digest
  ) {
    throw new IntegrityError(
      `life relation ${record.relationId} did not publish its canonical evidence witness`,
    );
  }
  return { record, recordDigest: digest, witnessRef };
}

export function appendPlaceEpisodeRevisionInTransaction(
  database,
  candidate,
  { previousDigest = null } = {},
) {
  const record = normalizePlaceEpisode(candidate);
  const digest = situatedRecordDigest("place_episode", record, previousDigest);
  database.prepare(`
    INSERT INTO place_episode_records(
      episode_id,revision,thread_id,episode_kind,place_id,visibility,
      provenance,recorded_at,supersedes_revision,record_json,record_digest
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    record.episodeId,
    record.revision,
    record.threadId,
    record.episodeKind,
    record.place.placeId,
    record.visibility,
    record.provenance,
    record.recordedAt,
    record.supersedesRevision ?? null,
    canonicalJson(record),
    digest,
  );
  database.prepare(`
    INSERT INTO situated_life_lineage_heads(
      ledger_kind,lineage_id,revision,thread_id,head_digest,recorded_at
    ) VALUES ('place_episode',?,?,?,?,?)
  `).run(
    record.episodeId,
    record.revision,
    record.threadId,
    digest,
    record.recordedAt,
  );

  const witnessRef = placeEpisodeRevisionRef(record);
  const witness = database.prepare(`
    SELECT reference,thread_id,witness_kind,source_id,revision,record_digest
    FROM situated_evidence_witnesses WHERE reference=?
  `).get(witnessRef);
  if (
    witness === undefined ||
    witness.thread_id !== record.threadId ||
    witness.witness_kind !== "place_episode_revision" ||
    witness.source_id !== record.episodeId ||
    Number(witness.revision) !== record.revision ||
    witness.record_digest !== digest
  ) {
    throw new IntegrityError(
      `place episode ${record.episodeId} did not publish its canonical evidence witness`,
    );
  }
  return { record, recordDigest: digest, witnessRef };
}
