import { normalizeGenesisSex } from "#core/src/genesis-sex.mjs";
import {
  boundedThreadScopedId,
  canonicalJson,
  sha256,
  threadStateHash,
} from "./persistence-common.mjs";
import { validateThreadSnapshot } from "./persistence-domain.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

const OPERATION_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,220}$/u;

function normalizeName(value) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("Thread name is required");
  const normalized = value.trim().replace(/\s+/gu, " ");
  if (normalized.length > 160) throw new TypeError("Thread name must be at most 160 characters");
  return normalized;
}

function canonicalBirthDate(year, month, day) {
  const normalized = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(normalized) || Number(year) < 1000) return null;
  const instant = new Date(`${normalized}T00:00:00.000Z`);
  if (!Number.isFinite(instant.getTime()) || instant.toISOString().slice(0, 10) !== normalized) return null;
  return normalized;
}

function normalizeBirthDate(value) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("Thread birth date is required");
  const raw = value.trim();

  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/u.exec(raw);
  if (match !== null) {
    const normalized = canonicalBirthDate(match[1], match[2], match[3]);
    if (normalized === null) throw new TypeError("Thread birth date is invalid");
    return normalized;
  }

  match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/u.exec(raw);
  if (match !== null) {
    const normalized = canonicalBirthDate(match[3], match[1], match[2]);
    if (normalized === null) throw new TypeError("Thread birth date is invalid");
    return normalized;
  }

  if (/^\d{8}$/u.test(raw)) {
    const ymd = canonicalBirthDate(raw.slice(0, 4), raw.slice(4, 6), raw.slice(6, 8));
    if (ymd !== null) return ymd;
    const mdy = canonicalBirthDate(raw.slice(4, 8), raw.slice(0, 2), raw.slice(2, 4));
    if (mdy !== null) return mdy;
    throw new TypeError("Thread birth date is invalid");
  }

  throw new TypeError("Thread birth date must be YYYY-MM-DD, YYYYMMDD, MM/DD/YYYY, or MMDDYYYY");
}

function normalizeOperationKey(value) {
  if (typeof value !== "string" || !OPERATION_KEY.test(value)) {
    throw new TypeError("identity operationKey must be a Fibre identifier up to 221 characters");
  }
  return value;
}

function eventId(threadId, operationKey) {
  return boundedThreadScopedId({
    prefix:"evt",
    threadId,
    suffix:`identity_${sha256(operationKey).slice(0, 24)}`,
  });
}

function derivedSelfModelRename(selfModel, previousName, nextName) {
  if (
    selfModel === "I am a Fibre Thread."
    || selfModel === `I am ${previousName}.`
  ) {
    return `I am ${nextName}.`;
  }
  return selfModel;
}

function requestMatchesExisting(thread, changes, { name, sex, birthDate }) {
  const matches = (field, requested) => {
    if (requested === undefined) return true;
    if (Object.prototype.hasOwnProperty.call(changes, field)) return changes[field] === requested;
    return thread.identity?.[field] === requested;
  };
  return matches("name", name) && matches("sex", sex) && matches("birthDate", birthDate);
}

export class ThreadIdentityUpdateStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { storeName:"ThreadIdentityUpdateStore" });
  }

  close() { this.#database.close(); }

  update(thread, { name, sex, birthDate, operationKey, changedAt = new Date().toISOString() } = {}) {
    validateThreadSnapshot(thread);
    const key = normalizeOperationKey(operationKey);
    const nextName = normalizeName(name);
    const nextSex = sex === undefined ? undefined : normalizeGenesisSex(sex);
    const nextBirthDate = normalizeBirthDate(birthDate);
    if (nextName === undefined && nextSex === undefined && nextBirthDate === undefined) {
      throw new TypeError("identity update requires name, sex, or birthDate");
    }

    const updateEventId = eventId(thread.threadId, key);
    const existing = this.#database.prepare(
      "SELECT event_type,payload_json FROM thread_events WHERE event_id=?",
    ).get(updateEventId);
    if (existing !== undefined) {
      if (existing.event_type !== "THREAD_IDENTITY_UPDATED") {
        throw new Error(`identity operationKey ${key} resolved to an incompatible World event`);
      }
      const payload = JSON.parse(existing.payload_json);
      const existingChanges = payload?.changes ?? {};
      if (payload?.operationKey !== key || !requestMatchesExisting(thread, existingChanges, { name:nextName, sex:nextSex, birthDate:nextBirthDate })) {
        throw new TypeError(`identity operationKey ${key} was already used with different identity input`);
      }
      const currentRow = this.#database.prepare("SELECT state_json FROM threads WHERE thread_id=?").get(thread.threadId);
      if (currentRow === undefined) throw new Error(`Thread ${thread.threadId} was not found`);
      return Object.freeze({
        changed:false,
        reused:true,
        eventId:updateEventId,
        changes:Object.freeze({ ...existingChanges }),
        thread:JSON.parse(currentRow.state_json),
      });
    }

    if (nextSex !== undefined && thread.identity.sex !== undefined && thread.identity.sex !== nextSex) {
      throw new TypeError("sex is already authoritative for this Thread");
    }

    const changes = {};
    const previous = {};
    if (nextName !== undefined && nextName !== thread.identity.name) {
      changes.name = nextName;
      previous.name = thread.identity.name;
    }
    if (nextSex !== undefined && thread.identity.sex === undefined) {
      changes.sex = nextSex;
      previous.sex = null;
    }
    if (nextBirthDate !== undefined && nextBirthDate !== thread.identity.birthDate) {
      changes.birthDate = nextBirthDate;
      previous.birthDate = thread.identity.birthDate ?? null;
    }
    if (Object.keys(changes).length === 0) {
      return Object.freeze({ changed:false, reused:true, eventId:thread.provenance.lastEventId, changes:Object.freeze({}), thread });
    }

    const next = structuredClone(thread);
    next.version += 1;
    next.identity = { ...next.identity, ...changes };
    const derivedSelfModel = changes.name === undefined
      ? null
      : derivedSelfModelRename(thread.currentState.selfModel, thread.identity.name, changes.name);
    const selfModelChange = derivedSelfModel !== thread.currentState.selfModel
      ? { previous:thread.currentState.selfModel, next:derivedSelfModel }
      : null;
    if (selfModelChange !== null) {
      next.currentState = { ...next.currentState, selfModel:selfModelChange.next };
    }
    next.provenance = { ...next.provenance, lastEventId:updateEventId };
    validateThreadSnapshot(next);

    const stateJson = canonicalJson(next);
    const stateHash = threadStateHash(next);
    const payload = { changes, previous, operationKey:key, derivedSelfModel:selfModelChange };
    const actor = { entityId:"fibre.admin.operator", kind:"operator", displayName:"Fibre Admin" };
    const provenance = { source:"admin_operator", operationKey:key, notThreadLifeEvent:true };

    this.#database.transaction(() => {
      const currentRow = this.#database.prepare(
        "SELECT version,last_event_id FROM threads WHERE thread_id=?",
      ).get(thread.threadId);
      if (currentRow === undefined) throw new Error(`Thread ${thread.threadId} was not found`);
      if (Number(currentRow.version) !== thread.version || currentRow.last_event_id !== thread.provenance.lastEventId) {
        throw new Error(`Thread ${thread.threadId} changed before identity update`);
      }
      const sequence = Number(this.#database.prepare(
        "SELECT COALESCE(MAX(sequence),0) AS n FROM thread_events WHERE thread_id=?",
      ).get(thread.threadId).n) + 1;
      this.#database.prepare(`
        INSERT INTO thread_events (
          event_id,thread_id,sequence,expected_version,resulting_version,event_type,
          command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
          authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
        ) VALUES (?,?,?,?,?,'THREAD_IDENTITY_UPDATED',NULL,NULL,?,?,?,?,NULL,?,?,2,?)
      `).run(
        updateEventId,
        thread.threadId,
        sequence,
        thread.version,
        next.version,
        canonicalJson(payload),
        canonicalJson(actor),
        changedAt,
        stateHash,
        thread.provenance.lastEventId,
        updateEventId,
        canonicalJson(provenance),
      );
      const updated = this.#database.prepare(`
        UPDATE threads
        SET version=?,state_json=?,state_hash=?,last_event_id=?,updated_at=?
        WHERE thread_id=? AND version=?
      `).run(next.version, stateJson, stateHash, updateEventId, changedAt, thread.threadId, thread.version);
      if (Number(updated.changes) !== 1) throw new Error(`Thread ${thread.threadId} changed during identity update`);
    });

    return Object.freeze({ changed:true, reused:false, eventId:updateEventId, changes:Object.freeze(changes), thread:next });
  }
}
