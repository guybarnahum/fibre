import { normalizeGenesisSex } from "#core/src/genesis-sex.mjs";
import {
  boundedThreadScopedId,
  canonicalJson,
  sha256,
  threadStateHash,
} from "./persistence-common.mjs";
import { validateThreadSnapshot } from "./persistence-domain.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

function normalizeWitness(threadId, witness) {
  if (!witness || typeof witness !== "object") {
    throw new TypeError(`Thread ${threadId} Genesis sex migration requires authoritative birth evidence`);
  }
  if (witness.source !== "genesis_birth_publication") {
    throw new TypeError("Genesis sex migration evidence must come from genesis_birth_publication");
  }
  if (typeof witness.genesisId !== "string" || witness.genesisId.trim() === "") {
    throw new TypeError("Genesis sex migration evidence requires genesisId");
  }
  if (typeof witness.resultDigest !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(witness.resultDigest)) {
    throw new TypeError("Genesis sex migration evidence requires a SHA-256 resultDigest");
  }
  return Object.freeze({
    sex:normalizeGenesisSex(witness.sex),
    genesisId:witness.genesisId,
    resultDigest:witness.resultDigest,
    source:witness.source,
  });
}

function eventId(threadId, witness) {
  const digest = sha256(canonicalJson({ threadId, witness })).slice(0, 24);
  return boundedThreadScopedId({
    prefix:"evt",
    threadId,
    suffix:`genesis_sex_migration_${digest}`,
  });
}

export class GenesisSexMigrationStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { storeName:"GenesisSexMigrationStore" });
  }

  close() { this.#database.close(); }

  migrate(thread, { evidence, migratedAt = new Date().toISOString() } = {}) {
    validateThreadSnapshot(thread);
    const witness = normalizeWitness(thread.threadId, evidence);
    if (thread.identity.sex !== undefined) {
      if (thread.identity.sex !== witness.sex) {
        throw new Error(`Thread ${thread.threadId} sex conflicts with preserved Genesis birth evidence`);
      }
      return Object.freeze({ migrated:false, reused:true, sex:witness.sex, eventId:thread.provenance.lastEventId, evidence:witness });
    }

    const migrationEventId = eventId(thread.threadId, witness);
    const existing = this.#database.prepare(
      "SELECT state_hash FROM thread_events WHERE event_id=?",
    ).get(migrationEventId);
    if (existing !== undefined) {
      const currentRow = this.#database.prepare("SELECT state_json FROM threads WHERE thread_id=?").get(thread.threadId);
      const current = currentRow === undefined ? null : JSON.parse(currentRow.state_json);
      if (current?.identity?.sex !== witness.sex) {
        throw new Error(`Genesis sex migration ${migrationEventId} exists without matching Thread state`);
      }
      return Object.freeze({ migrated:false, reused:true, sex:witness.sex, eventId:migrationEventId, evidence:witness });
    }

    const next = structuredClone(thread);
    next.version += 1;
    next.identity = { ...next.identity, sex:witness.sex };
    next.provenance = { ...next.provenance, lastEventId:migrationEventId };
    validateThreadSnapshot(next);

    const stateJson = canonicalJson(next);
    const stateHash = threadStateHash(next);
    const payload = {
      sex:witness.sex,
      genesisId:witness.genesisId,
      resultDigest:witness.resultDigest,
    };
    const actor = {
      entityId:"fibre.genesis.migration",
      kind:"system",
      displayName:"Fibre Genesis Migration",
    };
    const provenance = {
      source:"genesis_birth_publication",
      genesisId:witness.genesisId,
      resultDigest:witness.resultDigest,
      notThreadLifeEvent:true,
    };

    this.#database.transaction(() => {
      const currentRow = this.#database.prepare(
        "SELECT version,state_json,last_event_id FROM threads WHERE thread_id=?",
      ).get(thread.threadId);
      if (currentRow === undefined) throw new Error(`Thread ${thread.threadId} was not found`);
      if (Number(currentRow.version) !== thread.version || currentRow.last_event_id !== thread.provenance.lastEventId) {
        throw new Error(`Thread ${thread.threadId} changed before Genesis migration`);
      }
      const current = JSON.parse(currentRow.state_json);
      if (current.identity?.sex !== undefined) {
        if (current.identity.sex !== witness.sex) throw new Error(`Thread ${thread.threadId} acquired conflicting sex before migration`);
        return;
      }
      const sequence = Number(this.#database.prepare(
        "SELECT COALESCE(MAX(sequence),0) AS n FROM thread_events WHERE thread_id=?",
      ).get(thread.threadId).n) + 1;
      this.#database.prepare(`
        INSERT INTO thread_events (
          event_id,thread_id,sequence,expected_version,resulting_version,event_type,
          command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
          authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
        ) VALUES (?,?,?,?,?,'GENESIS_SEX_MIGRATED',NULL,NULL,?,?,?,?,NULL,?,?,1,?)
      `).run(
        migrationEventId,
        thread.threadId,
        sequence,
        thread.version,
        next.version,
        canonicalJson(payload),
        canonicalJson(actor),
        migratedAt,
        stateHash,
        thread.provenance.lastEventId,
        migrationEventId,
        canonicalJson(provenance),
      );
      const updated = this.#database.prepare(`
        UPDATE threads
        SET version=?,state_json=?,state_hash=?,last_event_id=?,updated_at=?
        WHERE thread_id=? AND version=?
      `).run(
        next.version,
        stateJson,
        stateHash,
        migrationEventId,
        migratedAt,
        thread.threadId,
        thread.version,
      );
      if (Number(updated.changes) !== 1) throw new Error(`Thread ${thread.threadId} changed during Genesis migration`);
    });

    return Object.freeze({ migrated:true, reused:false, sex:witness.sex, eventId:migrationEventId, evidence:witness });
  }
}
