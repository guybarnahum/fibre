import { IntegrityError } from "./persistence-common.mjs";

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

// Place/relation revisions already have immutable, Thread-owned witnesses
// maintained by insertion triggers. Resolve by the reference index instead of
// replaying every prior relationship and place episode at each life boundary.
function hasRevisionWitness(database, threadId, reference, kind) {
  if (!reference.startsWith(kind === "life_relation_revision" ? "lrr:" : "per:")) return false;
  if (!tableExists(database, "situated_evidence_witnesses")) return false;
  return database.prepare(`
    SELECT 1 FROM situated_evidence_witnesses
    WHERE reference=? AND thread_id=? AND witness_kind=?
  `).get(reference, threadId, kind) !== undefined;
}

function hasRelationRevision(database, threadId, reference) {
  return hasRevisionWitness(database, threadId, reference, "life_relation_revision");
}

function hasPlaceRevision(database, threadId, reference) {
  return hasRevisionWitness(database, threadId, reference, "place_episode_revision");
}

function hasEmbodimentRevision(database, threadId, reference) {
  if (!tableExists(database, "embodiment_reference_index")) return false;
  return database.prepare(`
    SELECT 1 FROM embodiment_reference_index
    WHERE thread_id=? AND reference=? LIMIT 1
  `).get(threadId, reference) !== undefined;
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
