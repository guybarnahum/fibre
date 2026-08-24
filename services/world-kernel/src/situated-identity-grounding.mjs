import { IntegrityError } from "./persistence-common.mjs";
import { lifeRelationRevisionRef, placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";

function tableExists(database, table) {
  return database.prepare(
    "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name=?",
  ).get(table) !== undefined;
}

function hasThreadEvent(database, threadId, reference) {
  return database.prepare(
    "SELECT 1 AS present FROM thread_events WHERE thread_id=? AND event_id=?",
  ).get(threadId, reference) !== undefined;
}

function hasRelationRevision(database, threadId, reference) {
  if (!tableExists(database, "life_relation_records")) return false;
  const rows = database.prepare(
    "SELECT record_json FROM life_relation_records WHERE thread_id=? ORDER BY relation_id,revision",
  ).all(threadId);
  return rows.some((row) => lifeRelationRevisionRef(JSON.parse(row.record_json)) === reference);
}

function hasPlaceRevision(database, threadId, reference) {
  if (!tableExists(database, "place_episode_records")) return false;
  const rows = database.prepare(
    "SELECT record_json FROM place_episode_records WHERE thread_id=? ORDER BY episode_id,revision",
  ).all(threadId);
  return rows.some((row) => placeEpisodeRevisionRef(JSON.parse(row.record_json)) === reference);
}

function hasEmbodimentRevision(database, threadId, reference) {
  if (!tableExists(database, "embodiment_records")) return false;
  const rows = database.prepare(
    "SELECT record_json FROM embodiment_records WHERE thread_id=? ORDER BY embodiment_id,revision",
  ).all(threadId);
  return rows.some((row) => {
    const record = JSON.parse(row.record_json);
    return record.embodimentId === reference ||
      record.sourceReferences?.includes(reference) ||
      record.permissionReferences?.includes(reference);
  });
}

const WITNESS_CHECKS = Object.freeze({
  thread_event: hasThreadEvent,
  life_relation_revision: hasRelationRevision,
  place_episode_revision: hasPlaceRevision,
  embodiment_revision: hasEmbodimentRevision,
});

export function resolveSituatedReference(database, threadId, reference) {
  for (const [kind, check] of Object.entries(WITNESS_CHECKS)) {
    if (check(database, threadId, reference)) return { kind, reference };
  }
  return null;
}

export function assertAllSituatedReferencesResolve(database, threadId, references) {
  return references.map((reference) => {
    const witness = resolveSituatedReference(database, threadId, reference);
    if (witness === null) {
      throw new IntegrityError(`unresolved evidence reference ${reference} for Thread ${threadId}`);
    }
    return witness;
  });
}

export function assertSituatedIdentityWitnesses(database, assertion, definition) {
  const policy = definition.witnessPolicy ?? null;
  if (policy === null) return;
  const resolved = assertAllSituatedReferencesResolve(
    database,
    assertion.threadId,
    assertion.sourceReferences,
  );
  if (!resolved.some((witness) => witness.kind === policy)) {
    throw new IntegrityError(
      `identity domain ${assertion.domain} requires a resolved ${policy} witness for Thread ${assertion.threadId}`,
    );
  }
}
