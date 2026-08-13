import { DatabaseSync } from "node:sqlite";
import { canonicalJson, sha256 } from "./persistence-common.mjs";
import { normalizeDatabasePath } from "./persistence-sqlite.mjs";
import { openIdentityStore } from "./identity-store.mjs";
import { openSituatedLifeStore } from "./situated-life-store.mjs";
import { livedLanguageFormationClaim } from "./lived-language-formation-authoring.mjs";

function exactRevision(history, revision, name) {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new TypeError(`${name}.revision must be a positive integer`);
  const record = history[revision - 1];
  if (record === undefined || record.revision !== revision) throw new TypeError(`${name} revision ${revision} does not exist`);
  return record;
}

export class SituatedLanguageService {
  #databasePath;
  constructor(databasePath) { this.#databasePath = normalizeDatabasePath(databasePath); }

  recordLanguageFormation({ threadId, kind, claimPredicate, meaning, eventReferences, relationWitnesses = [], placeWitnesses = [], recordedAt, effectiveAt = recordedAt, visibility = "private" }) {
    const evidenceDb = new DatabaseSync(this.#databasePath, { readOnly: true, enableForeignKeyConstraints: true });
    evidenceDb.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=5000;");
    try {
      for (const eventId of eventReferences) {
        const row = evidenceDb.prepare("SELECT 1 AS present FROM thread_events WHERE thread_id=? AND event_id=?").get(threadId, eventId);
        if (row === undefined) throw new TypeError(`language event witness ${eventId} does not exist for Thread ${threadId}`);
      }
    } finally { evidenceDb.close(); }

    const situated = openSituatedLifeStore(this.#databasePath);
    let lifeRelations;
    let placeEpisodes;
    try {
      lifeRelations = relationWitnesses.map((w, i) => exactRevision(situated.lifeRelationHistory(threadId, w.relationId), w.revision, `relationWitnesses[${i}]`));
      placeEpisodes = placeWitnesses.map((w, i) => exactRevision(situated.placeEpisodeHistory(threadId, w.episodeId), w.revision, `placeWitnesses[${i}]`));
    } finally { situated.close(); }

    const candidate = livedLanguageFormationClaim({ threadId, kind, claimPredicate, meaning, eventReferences, lifeRelations, placeEpisodes, recordedAt, effectiveAt, visibility });
    const identity = openIdentityStore(this.#databasePath);
    try {
      const stored = identity.recordAssertion(candidate);
      const evidenceBody = {
        eventReferences: [...eventReferences],
        relationWitnesses: lifeRelations.map((r) => ({ relationId: r.relationId, revision: r.revision })),
        placeWitnesses: placeEpisodes.map((p) => ({ episodeId: p.episodeId, revision: p.revision })),
      };
      return { ...stored, evidence: { ...evidenceBody, digest: `sha256:${sha256(canonicalJson(evidenceBody))}` } };
    } finally { identity.close(); }
  }
}
