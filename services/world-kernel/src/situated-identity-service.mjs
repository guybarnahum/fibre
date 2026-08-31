
import { canonicalJson, sha256 } from "./persistence-common.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";
import { openIdentityStore } from "./identity-store.mjs";
import { openSituatedLifeStore } from "./situated-life-store.mjs";
import { livedCulturalFormationClaim } from "./lived-cultural-formation-authoring.mjs";

function exactRevision(history, revision, name) {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new TypeError(`${name}.revision must be a positive integer`);
  const record = history[revision - 1];
  if (record === undefined || record.revision !== revision) {
    throw new TypeError(`${name} revision ${revision} does not exist`);
  }
  return record;
}

export class SituatedIdentityService {
  #storage;

  constructor(storage) {
    this.#storage = storage;
  }

  recordCulturalFormation({
    threadId,
    kind,
    claimPredicate,
    meaning,
    eventReferences,
    relationWitnesses = [],
    placeWitnesses = [],
    recordedAt,
    effectiveAt = recordedAt,
    visibility = "private",
  }) {
    const evidenceDb = openWorldStateDatabase(this.#storage, { readOnly: true, storeName: "SituatedIdentityService evidence" });
        try {
      for (const eventId of eventReferences) {
        const row = evidenceDb.prepare(
          "SELECT 1 AS present FROM thread_events WHERE thread_id=? AND event_id=?",
        ).get(threadId, eventId);
        if (row === undefined) throw new TypeError(`cultural event witness ${eventId} does not exist for Thread ${threadId}`);
      }
    } finally {
      evidenceDb.close();
    }

    const situated = openSituatedLifeStore(this.#storage);
    let lifeRelations;
    let placeEpisodes;
    try {
      lifeRelations = relationWitnesses.map((witness, index) =>
        exactRevision(
          situated.lifeRelationHistory(threadId, witness.relationId),
          witness.revision,
          `relationWitnesses[${index}]`,
        ));
      placeEpisodes = placeWitnesses.map((witness, index) =>
        exactRevision(
          situated.placeEpisodeHistory(threadId, witness.episodeId),
          witness.revision,
          `placeWitnesses[${index}]`,
        ));
    } finally {
      situated.close();
    }

    const candidate = livedCulturalFormationClaim({
      threadId,
      kind,
      claimPredicate,
      meaning,
      eventReferences,
      lifeRelations,
      placeEpisodes,
      recordedAt,
      effectiveAt,
      visibility,
    });
    const identity = openIdentityStore(this.#storage);
    try {
      const stored = identity.recordAssertion(candidate);
      const evidenceBody = {
        eventReferences: [...eventReferences],
        relationWitnesses: lifeRelations.map((record) => ({ relationId: record.relationId, revision: record.revision })),
        placeWitnesses: placeEpisodes.map((record) => ({ episodeId: record.episodeId, revision: record.revision })),
      };
      return {
        ...stored,
        evidence: {
          ...evidenceBody,
          digest: `sha256:${sha256(canonicalJson(evidenceBody))}`,
        },
      };
    } finally {
      identity.close();
    }
  }
}
