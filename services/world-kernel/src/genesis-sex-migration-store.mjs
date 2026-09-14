import { GENESIS_SEX_RULE, genesisSexForThread, normalizeGenesisSex } from "#core/src/genesis-sex.mjs";
import {
  boundedThreadScopedId,
  canonicalJson,
  sha256,
  threadStateHash,
} from "./persistence-common.mjs";
import { validateThreadSnapshot } from "./persistence-domain.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

function eventId(threadId, sex) {
  const witness = sha256(canonicalJson({
    threadId,
    sex,
    rule:GENESIS_SEX_RULE,
  })).slice(0, 24);
  return boundedThreadScopedId({
    prefix:"evt",
    threadId,
    suffix:`genesis_sex_migration_${witness}`,
  });
}

export class GenesisSexMigrationStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { storeName:"GenesisSexMigrationStore" });
  }

  close() { this.#database.close(); }

  migrate(thread, { migratedAt = new Date().toISOString() } = {}) {
    validateThreadSnapshot(thread);
    const expectedSex = normalizeGenesisSex(genesisSexForThread({ threadId:thread.threadId }));
    if (thread.identity.sex !== undefined) {
      if (thread.identity.sex !== expectedSex) {
        throw new Error(`Thread ${thread.threadId} sex conflicts with ${GENESIS_SEX_RULE.id}`);
      }
      return Object.freeze({ migrated:false, reused:true, sex:expectedSex, eventId:thread.provenance.lastEventId });
    }

    const migrationEventId = eventId(thread.threadId, expectedSex);
    const existing = this.#database.prepare(
      "SELECT state_hash FROM thread_events WHERE event_id=?",
    ).get(migrationEventId);
    if (existing !== undefined) {
      const currentRow = this.#database.prepare("SELECT state_json FROM threads WHERE thread_id=?").get(thread.threadId);
      const current = currentRow === undefined ? null : JSON.parse(currentRow.state_json);
      if (current?.identity?.sex !== expectedSex) {
        throw new Error(`Genesis sex migration ${migrationEventId} exists without matching Thread state`);
      }
      return Object.freeze({ migrated:false, reused:true, sex:expectedSex, eventId:migrationEventId });
    }

    const next = structuredClone(thread);
    next.version += 1;
    next.identity = { ...next.identity, sex:expectedSex };
    next.provenance = { ...next.provenance, lastEventId:migrationEventId };
    validateThreadSnapshot(next);

    const stateJson = canonicalJson(next);
    const stateHash = threadStateHash(next);
    const payload = {
      sex:expectedSex,
      ruleId:GENESIS_SEX_RULE.id,
      ruleVersion:GENESIS_SEX_RULE.version,
    };
    const actor = {
      entityId:"fibre.genesis.migration",
      kind:"system",
      displayName:"Fibre Genesis Migration",
    };
    const provenance = {
      source:"genesis_migration",
      ruleId:GENESIS_SEX_RULE.id,
      ruleVersion:GENESIS_SEX_RULE.version,
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
        if (current.identity.sex !== expectedSex) throw new Error(`Thread ${thread.threadId} acquired conflicting sex before migration`);
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

    return Object.freeze({ migrated:true, reused:false, sex:expectedSex, eventId:migrationEventId });
  }
}
