import { normalizeCurrentSituation } from "./lived-now.mjs";
import { normalizePlaceEpisode } from "./situated-life-domain.mjs";
import { placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";
import { IntegrityError, canonicalJson, sha256 } from "./persistence-common.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

function parse(name, value) {
  if (value === null || value === undefined) return null;
  try { return JSON.parse(value); }
  catch (error) { throw new IntegrityError(`${name} is not valid JSON: ${error.message}`); }
}

function digest(record) {
  return `sha256:${sha256(canonicalJson(record))}`;
}

function verifiedSituation(row) {
  const record = normalizeCurrentSituation(parse(`current situation ${row.situation_id}`, row.situation_json));
  if (
    record.situationId !== row.situation_id
    || record.threadId !== row.thread_id
    || record.establishedAt !== row.established_at
    || canonicalJson(record) !== row.situation_json
    || digest(record) !== row.situation_digest
  ) {
    throw new IntegrityError(`current situation ${row.situation_id} failed projection integrity`);
  }
  return record;
}

function verifiedWorldPlace(ref, json, storedDigest) {
  if (json === null) return null;
  const record = parse(`live World place ${ref}`, json);
  if (
    record?.ref !== ref
    || canonicalJson(record) !== json
    || digest(record) !== storedDigest
  ) {
    throw new IntegrityError(`live World place ${ref} failed projection integrity`);
  }
  return Object.freeze(record);
}

function verifiedPlaceEpisode(ref, json, recordDigest, witnessDigest) {
  if (json === null) return null;
  const record = normalizePlaceEpisode(parse(`place episode ${ref}`, json));
  if (
    placeEpisodeRevisionRef(record) !== ref
    || canonicalJson(record) !== json
    || recordDigest !== witnessDigest
  ) {
    throw new IntegrityError(`place episode ${ref} failed projection integrity`);
  }
  return record;
}

function distinct(records) {
  const seen = new Set();
  return Object.freeze(records.filter((record) => {
    if (record === null) return false;
    const key = record.ref ?? placeEpisodeRevisionRef(record);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }));
}

export class CurrentWorldLocationStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, {
      readOnly:true,
      storeName:"CurrentWorldLocationStore",
    });
  }

  close() { this.#database.close(); }

  list({ at = new Date().toISOString() } = {}) {
    const tables = new Set(this.#database.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'",
    ).all().map((row) => row.name));
    if (!tables.has("current_situation_records")) return Object.freeze([]);

    const world = tables.has("live_world_place_records");
    const situated = tables.has("situated_evidence_witnesses")
      && tables.has("place_episode_records");

    const worldSelect = (alias) => world
      ? `${alias}.record_json AS ${alias}_json, ${alias}.record_digest AS ${alias}_digest`
      : `NULL AS ${alias}_json, NULL AS ${alias}_digest`;
    const worldJoin = (alias, jsonPath) => world
      ? `LEFT JOIN live_world_place_records ${alias}
           ON ${alias}.place_ref=json_extract(s.situation_json,'${jsonPath}')`
      : "";

    const situatedSelect = (witness, episode) => situated
      ? `${episode}.record_json AS ${episode}_json,
         ${episode}.record_digest AS ${episode}_digest,
         ${witness}.record_digest AS ${witness}_digest`
      : `NULL AS ${episode}_json, NULL AS ${episode}_digest, NULL AS ${witness}_digest`;
    const situatedJoin = (witness, episode, jsonPath) => situated
      ? `LEFT JOIN situated_evidence_witnesses ${witness}
           ON ${witness}.reference=json_extract(s.situation_json,'${jsonPath}')
          AND ${witness}.witness_kind='place_episode_revision'
         LEFT JOIN place_episode_records ${episode}
           ON ${episode}.thread_id=${witness}.thread_id
          AND ${episode}.episode_id=${witness}.source_id
          AND ${episode}.revision=${witness}.revision`
      : "";

    const rows = this.#database.prepare(`
      WITH ranked AS (
        SELECT
          situation_id,
          thread_id,
          established_at,
          record_json AS situation_json,
          record_digest AS situation_digest,
          ROW_NUMBER() OVER (
            PARTITION BY thread_id
            ORDER BY established_at DESC,situation_id DESC
          ) AS rank
        FROM current_situation_records
        WHERE established_at<=?
          AND thread_id IN (
            SELECT thread_id FROM threads WHERE status<>'retired'
          )
      )
      SELECT
        s.situation_id,s.thread_id,s.established_at,s.situation_json,s.situation_digest,
        ${worldSelect("wp")},
        ${worldSelect("wf")},
        ${worldSelect("wt")},
        ${situatedSelect("epw","ep")},
        ${situatedSelect("efw","ef")},
        ${situatedSelect("etw","et")}
      FROM ranked s
      ${worldJoin("wp","$.location.placeRef")}
      ${worldJoin("wf","$.location.fromPlaceRef")}
      ${worldJoin("wt","$.location.toPlaceRef")}
      ${situatedJoin("epw","ep","$.location.placeRef")}
      ${situatedJoin("efw","ef","$.location.fromPlaceRef")}
      ${situatedJoin("etw","et","$.location.toPlaceRef")}
      WHERE s.rank=1
      ORDER BY s.thread_id
    `).all(at);

    return Object.freeze(rows.map((row) => {
      const situation = verifiedSituation(row);
      const refs = situation.location.kind === "place"
        ? [situation.location.placeRef]
        : [situation.location.fromPlaceRef, situation.location.toPlaceRef];
      return Object.freeze({
        threadId:row.thread_id,
        currentSituation:situation,
        worldPlaces:distinct([
          verifiedWorldPlace(refs[0], row.wp_json ?? row.wf_json, row.wp_digest ?? row.wf_digest),
          refs.length > 1 ? verifiedWorldPlace(refs[1], row.wt_json, row.wt_digest) : null,
        ]),
        placeEpisodes:distinct([
          verifiedPlaceEpisode(refs[0], row.ep_json ?? row.ef_json, row.ep_digest ?? row.ef_digest, row.epw_digest ?? row.efw_digest),
          refs.length > 1 ? verifiedPlaceEpisode(refs[1], row.et_json, row.et_digest, row.etw_digest) : null,
        ]),
      });
    }));
  }
}
