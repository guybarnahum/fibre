import {
  IntegrityError,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { normalizeGenesisWorldSpec } from "./genesis-domain.mjs";
import { normalizeGenesisHistoricalEnvelopePlan } from "./genesis-historical-envelope-authority.mjs";

export const LIVE_WORLD_PLACE_POLICY = Object.freeze({
  version:"live-world-place-admission-v1",
  admittedPlaceKinds:Object.freeze(["library_or_learning"]),
});

function tableExists(database, name) {
  return database.prepare(
    "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name=?",
  ).get(name) !== undefined;
}

function parseRecord(name, value) {
  try { return JSON.parse(value); }
  catch (error) { throw new IntegrityError(`${name} is not valid JSON: ${error.message}`); }
}

function digest(record) {
  return `sha256:${sha256(canonicalJson(record))}`;
}

export function liveWorldRef(sourceWorldRef) {
  return `lworld_${sha256(canonicalJson({
    policy:LIVE_WORLD_PLACE_POLICY.version,
    sourceWorldRef,
  }))}`;
}

export function liveWorldPlaceRef({ sourceWorldRef, sourcePlaceId, placeKind }) {
  return `wpl_${sha256(canonicalJson({
    policy:LIVE_WORLD_PLACE_POLICY.version,
    sourceWorldRef,
    sourcePlaceId,
    placeKind,
  }))}`;
}

export function createLiveWorldPlaceTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS live_world_place_records (
      place_ref TEXT PRIMARY KEY,
      live_world_ref TEXT NOT NULL,
      source_world_ref TEXT NOT NULL,
      source_place_id TEXT NOT NULL,
      place_kind TEXT NOT NULL,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      UNIQUE(source_world_ref,source_place_id,place_kind)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_live_world_places_world
      ON live_world_place_records(source_world_ref,place_kind,place_ref);

    CREATE TRIGGER IF NOT EXISTS live_world_place_records_no_update
      BEFORE UPDATE ON live_world_place_records
      BEGIN SELECT RAISE(ABORT,'live_world_place_records is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS live_world_place_records_no_delete
      BEFORE DELETE ON live_world_place_records
      BEGIN SELECT RAISE(ABORT,'live_world_place_records is immutable'); END;
  `);
}

function worldRefForThread(database, threadId) {
  if (!tableExists(database, "fibre_civil_registrations")) return null;
  return database.prepare(
    "SELECT world_ref FROM fibre_civil_registrations WHERE thread_id=?",
  ).get(threadId)?.world_ref ?? null;
}

function envelopeAuthorityForWorld(database, sourceWorldRef) {
  const kinds = new Map();
  let timeZone = null;
  if (!tableExists(database, "genesis_historical_envelope_plans")) {
    return { kinds, timeZone };
  }
  const rows = database.prepare(
    "SELECT record_json FROM genesis_historical_envelope_plans WHERE world_spec_id=? ORDER BY thread_id",
  ).all(sourceWorldRef);
  for (const row of rows) {
    const plan = normalizeGenesisHistoricalEnvelopePlan(
      parseRecord(`historical-envelope plan for ${sourceWorldRef}`, row.record_json),
      IntegrityError,
    );
    if (timeZone !== null && timeZone !== plan.timeZone) {
      throw new IntegrityError(`Genesis World ${sourceWorldRef} has conflicting time zones`);
    }
    timeZone = plan.timeZone;
    for (const envelope of plan.envelopes) {
      const previous = kinds.get(envelope.placeRef);
      if (previous !== undefined && previous !== envelope.placeKind) {
        throw new IntegrityError(
          `Genesis place ${envelope.placeRef} has conflicting kinds ${previous}/${envelope.placeKind}`,
        );
      }
      kinds.set(envelope.placeRef, envelope.placeKind);
    }
  }
  return { kinds, timeZone };
}

function worldSpecFor(database, sourceWorldRef) {
  if (!tableExists(database, "genesis_world_specs")) return null;
  const row = database.prepare(
    "SELECT record_json FROM genesis_world_specs WHERE world_spec_id=?",
  ).get(sourceWorldRef);
  if (row === undefined) return null;
  return normalizeGenesisWorldSpec(
    parseRecord(`Genesis WorldSpec ${sourceWorldRef}`, row.record_json),
  );
}

function recordFromRow(row) {
  const record = parseRecord(`live World place ${row.place_ref}`, row.record_json);
  if (canonicalJson(record) !== row.record_json || digest(record) !== row.record_digest) {
    throw new IntegrityError(`live World place ${row.place_ref} failed canonical/digest verification`);
  }
  return Object.freeze(record);
}

export function ensureLiveWorldPlaces(database, threadId) {
  const sourceWorldRef = worldRefForThread(database, threadId);
  if (sourceWorldRef === null) return Object.freeze([]);
  const world = worldSpecFor(database, sourceWorldRef);
  if (world === null) return Object.freeze([]);
  const { kinds } = envelopeAuthorityForWorld(database, sourceWorldRef);
  const admittedKinds = new Set(LIVE_WORLD_PLACE_POLICY.admittedPlaceKinds);
  const liveWorld = liveWorldRef(sourceWorldRef);

  for (const place of world.places) {
    const placeKind = kinds.get(place.placeId) ?? null;
    if (!admittedKinds.has(placeKind)) continue;
    const record = Object.freeze({
      ref:liveWorldPlaceRef({
        sourceWorldRef,
        sourcePlaceId:place.placeId,
        placeKind,
      }),
      liveWorldRef:liveWorld,
      sourceWorldRef,
      sourcePlaceId:place.placeId,
      placeKind,
      displayName:place.description,
      authority:LIVE_WORLD_PLACE_POLICY.version,
    });
    database.prepare(`
      INSERT OR IGNORE INTO live_world_place_records(
        place_ref,live_world_ref,source_world_ref,source_place_id,place_kind,
        record_json,record_digest
      ) VALUES (?,?,?,?,?,?,?)
    `).run(
      record.ref,
      record.liveWorldRef,
      record.sourceWorldRef,
      record.sourcePlaceId,
      record.placeKind,
      canonicalJson(record),
      digest(record),
    );
  }
  return listLiveWorldPlaces(database, threadId);
}

export function listLiveWorldPlaces(database, threadId) {
  const sourceWorldRef = worldRefForThread(database, threadId);
  if (sourceWorldRef === null || !tableExists(database, "live_world_place_records")) {
    return Object.freeze([]);
  }
  const rows = database.prepare(`
    SELECT place_ref,record_json,record_digest
    FROM live_world_place_records
    WHERE source_world_ref=?
    ORDER BY place_kind,place_ref
  `).all(sourceWorldRef);
  return Object.freeze(rows.map(recordFromRow));
}

export function resolveLiveWorldPlace(database, threadId, reference) {
  if (typeof reference !== "string" || !reference.startsWith("wpl_")) return null;
  return listLiveWorldPlaces(database, threadId)
    .find((place) => place.ref === reference) ?? null;
}

export function liveWorldContext(database, threadId) {
  const sourceWorldRef = worldRefForThread(database, threadId);
  if (sourceWorldRef === null) return null;
  const { timeZone } = envelopeAuthorityForWorld(database, sourceWorldRef);
  if (timeZone === null) return null;
  return Object.freeze({
    sourceWorldRef,
    liveWorldRef:liveWorldRef(sourceWorldRef),
    timeZone,
    places:listLiveWorldPlaces(database, threadId),
  });
}
