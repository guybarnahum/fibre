import { IntegrityError } from "./persistence-common.mjs";
import { lifeRelationRevisionRef, placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";

function hasThreadEvent(database, threadId, reference) {
  return database.prepare(
    "SELECT 1 AS present FROM thread_events WHERE thread_id=? AND event_id=?",
  ).get(threadId, reference) !== undefined;
}

function hasRelationRevision(database, threadId, reference) {
  const rows = database.prepare(
    "SELECT record_json FROM life_relation_records WHERE thread_id=? ORDER BY relation_id,revision",
  ).all(threadId);
  return rows.some((row) => lifeRelationRevisionRef(JSON.parse(row.record_json)) === reference);
}

function hasPlaceRevision(database, threadId, reference) {
  const rows = database.prepare(
    "SELECT record_json FROM place_episode_records WHERE thread_id=? ORDER BY episode_id,revision",
  ).all(threadId);
  return rows.some((row) => placeEpisodeRevisionRef(JSON.parse(row.record_json)) === reference);
}

function hasEmbodimentRevision(database, threadId, reference) {
  const rows = database.prepare(
    "SELECT record_json FROM embodiment_records WHERE thread_id=? ORDER BY embodiment_id,revision",
  ).all(threadId);
  return rows.some((row) => {
    const record = JSON.parse(row.record_json);
    return record.sourceReferences?.includes(reference) ||
      record.permissionReferences?.includes(reference) ||
      record.embodimentId === reference;
  });
}

export function assertSituatedIdentityWitnesses(database, assertion, definition) {
  const policy = definition.witnessPolicy ?? null;
  if (policy === null) return;
  const references = assertion.sourceReferences;
  const predicates = {
    thread_event: hasThreadEvent,
    life_relation_revision: hasRelationRevision,
    place_episode_revision: hasPlaceRevision,
    embodiment_revision: hasEmbodimentRevision,
  };
  const predicate = predicates[policy];
  if (predicate === undefined) throw new IntegrityError(`unknown identity witness policy ${policy}`);
  if (!references.some((reference) => predicate(database, assertion.threadId, reference))) {
    throw new IntegrityError(
      `identity domain ${assertion.domain} requires a resolved ${policy} witness for Thread ${assertion.threadId}`,
    );
  }
}
