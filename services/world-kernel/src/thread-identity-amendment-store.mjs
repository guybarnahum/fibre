import { normalizeGenesisSex } from "#core/src/genesis-sex.mjs";
import {
  boundedThreadScopedId,
  canonicalJson,
  sha256,
  threadStateHash,
} from "./persistence-common.mjs";
import { validateThreadSnapshot } from "./persistence-domain.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

function operation(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,220}$/u.test(value)) {
    throw new TypeError("identity operationKey must be a Fibre identifier up to 221 characters");
  }
  return value;
}

function name(value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("Thread name is required");
  const normalized = value.trim().replace(/\s+/gu, " ");
  if (normalized.length > 160) throw new TypeError("Thread name must be at most 160 characters");
  return normalized;
}

function eventId(threadId, kind, operationKey) {
  return boundedThreadScopedId({
    prefix:"evt",
    threadId,
    suffix:`${kind}_${sha256(operationKey).slice(0, 24)}`,
  });
}

function actor() {
  return {
    entityId:"fibre.admin.operator",
    kind:"operator",
    displayName:"Fibre Admin",
  };
}

export class ThreadIdentityAmendmentStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { storeName:"ThreadIdentityAmendmentStore" });
  }

  close() { this.#database.close(); }

  #commit(thread, { eventType, operationKey, payload, nextIdentity, changedAt }) {
    validateThreadSnapshot(thread);
    const key = operation(operationKey);
    const amendmentEventId = eventId(thread.threadId, eventType.toLowerCase(), key);
    const existing = this.#database.prepare("SELECT state_hash FROM thread_events WHERE event_id=?").get(amendmentEventId);
    if (existing !== undefined) {
      const currentRow = this.#database.prepare("SELECT state_json FROM threads WHERE thread_id=?").get(thread.threadId);
      if (currentRow === undefined) throw new Error(`Thread ${thread.threadId} was not found`);
      return Object.freeze({ changed:false, reused:true, eventId:amendmentEventId, thread:JSON.parse(currentRow.state_json) });
    }

    const next = structuredClone(thread);
    next.version += 1;
    next.identity = nextIdentity(next.identity);
    next.provenance = { ...next.provenance, lastEventId:amendmentEventId };
    validateThreadSnapshot(next);
    const stateJson = canonicalJson(next);
    const stateHash = threadStateHash(next);
    const provenance = {
      source:"admin_operator",
      operationKey:key,
      notThreadLifeEvent:true,
    };

    this.#database.transaction(() => {
      const currentRow = this.#database.prepare(
        "SELECT version,last_event_id FROM threads WHERE thread_id=?",
      ).get(thread.threadId);
      if (currentRow === undefined) throw new Error(`Thread ${thread.threadId} was not found`);
      if (Number(currentRow.version) !== thread.version || currentRow.last_event_id !== thread.provenance.lastEventId) {
        throw new Error(`Thread ${thread.threadId} changed before identity amendment`);
      }
      const sequence = Number(this.#database.prepare(
        "SELECT COALESCE(MAX(sequence),0) AS n FROM thread_events WHERE thread_id=?",
      ).get(thread.threadId).n) + 1;
      this.#database.prepare(`
        INSERT INTO thread_events (
          event_id,thread_id,sequence,expected_version,resulting_version,event_type,
          command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
          authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
        ) VALUES (?,?,?,?,?,?,NULL,NULL,?,?,?,?,NULL,?,?,1,?)
      `).run(
        amendmentEventId,
        thread.threadId,
        sequence,
        thread.version,
        next.version,
        eventType,
        canonicalJson(payload),
        canonicalJson(actor()),
        changedAt,
        stateHash,
        thread.provenance.lastEventId,
        amendmentEventId,
        canonicalJson(provenance),
      );
      const updated = this.#database.prepare(`
        UPDATE threads
        SET version=?,state_json=?,state_hash=?,last_event_id=?,updated_at=?
        WHERE thread_id=? AND version=?
      `).run(next.version, stateJson, stateHash, amendmentEventId, changedAt, thread.threadId, thread.version);
      if (Number(updated.changes) !== 1) throw new Error(`Thread ${thread.threadId} changed during identity amendment`);
    });

    return Object.freeze({ changed:true, reused:false, eventId:amendmentEventId, thread:next });
  }

  assignLegacySex(thread, { sex, operationKey, changedAt = new Date().toISOString() } = {}) {
    const normalized = normalizeGenesisSex(sex);
    if (thread.identity.sex !== undefined) {
      if (thread.identity.sex !== normalized) throw new Error(`Thread ${thread.threadId} already has a different sex`);
      return Object.freeze({ changed:false, reused:true, eventId:thread.provenance.lastEventId, thread });
    }
    return this.#commit(thread, {
      eventType:"LEGACY_SEX_ASSIGNED",
      operationKey,
      changedAt,
      payload:{ sex:normalized, operationKey:operation(operationKey) },
      nextIdentity:(identity) => ({ ...identity, sex:normalized }),
    });
  }

  changeName(thread, { name:newName, operationKey, changedAt = new Date().toISOString() } = {}) {
    const normalized = name(newName);
    const key = operation(operationKey);
    if (thread.identity.name === normalized) {
      return Object.freeze({ changed:false, reused:true, eventId:thread.provenance.lastEventId, thread });
    }
    return this.#commit(thread, {
      eventType:"THREAD_NAME_CHANGED",
      operationKey:key,
      changedAt,
      payload:{ from:thread.identity.name, to:normalized, operationKey:key },
      nextIdentity:(identity) => ({ ...identity, name:normalized }),
    });
  }
}
