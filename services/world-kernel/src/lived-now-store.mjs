import {
  IntegrityError,
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { migrateDatabase, translateStorageError } from "./persistence-sqlite.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";
import {
  normalizeLivedPlan,
  normalizeCurrentSituation,
  resolveCurrentSituation,
} from "./lived-now.mjs";
import {
  assertAllSituatedReferencesResolve,
  resolveSituatedReference,
} from "./situated-identity-grounding.mjs";
import {
  normalizeLifeRelation,
  situatedLifeRecordIsCurrent,
} from "./situated-life-domain.mjs";

export class LivedNowConflictError extends Error {}
export class LivedNowNotFoundError extends Error {}

const CARE_AUTHORITY_RELATION_KINDS = new Set([
  "biological_parent",
  "adoptive_parent",
  "social_parent",
]);

function digest(record) {
  return `sha256:${sha256(canonicalJson(record))}`;
}

function createTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS lived_now_plans (
      plan_id TEXT PRIMARY KEY,
      subject_thread_id TEXT NOT NULL,
      plan_kind TEXT NOT NULL CHECK (plan_kind IN ('personal','care')),
      owner_party_id TEXT NOT NULL,
      authored_at TEXT NOT NULL,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (subject_thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_lived_now_plans_subject_time
      ON lived_now_plans(subject_thread_id,plan_kind,authored_at,plan_id);

    CREATE TRIGGER IF NOT EXISTS lived_now_plans_no_update
      BEFORE UPDATE ON lived_now_plans
      BEGIN SELECT RAISE(ABORT,'lived_now_plans is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS lived_now_plans_no_delete
      BEFORE DELETE ON lived_now_plans
      BEGIN SELECT RAISE(ABORT,'lived_now_plans is append-only'); END;

    CREATE TABLE IF NOT EXISTS current_situation_records (
      situation_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      established_at TEXT NOT NULL,
      record_json TEXT NOT NULL CHECK (json_valid(record_json)),
      record_digest TEXT NOT NULL CHECK (record_digest LIKE 'sha256:%'),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_current_situations_thread_time
      ON current_situation_records(thread_id,established_at,situation_id);

    CREATE TRIGGER IF NOT EXISTS current_situations_no_update
      BEFORE UPDATE ON current_situation_records
      BEGIN SELECT RAISE(ABORT,'current_situation_records is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS current_situations_no_delete
      BEFORE DELETE ON current_situation_records
      BEGIN SELECT RAISE(ABORT,'current_situation_records is append-only'); END;
  `);
}

function parseJson(name, value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

function planFromRow(row) {
  const record = normalizeLivedPlan(parseJson(`lived plan ${row.plan_id}`, row.record_json));
  if (
    record.planId !== row.plan_id ||
    record.subjectThreadId !== row.subject_thread_id ||
    record.kind !== row.plan_kind ||
    record.owner.partyId !== row.owner_party_id ||
    record.authoredAt !== row.authored_at
  ) {
    throw new IntegrityError(`lived plan ${row.plan_id} columns do not match its record`);
  }
  if (row.record_json !== canonicalJson(record) || row.record_digest !== digest(record)) {
    throw new IntegrityError(`lived plan ${row.plan_id} integrity mismatch`);
  }
  return record;
}

function situationFromRow(row) {
  const record = normalizeCurrentSituation(
    parseJson(`current situation ${row.situation_id}`, row.record_json),
  );
  if (
    record.situationId !== row.situation_id ||
    record.threadId !== row.thread_id ||
    record.establishedAt !== row.established_at
  ) {
    throw new IntegrityError(`current situation ${row.situation_id} columns do not match its record`);
  }
  if (row.record_json !== canonicalJson(record) || row.record_digest !== digest(record)) {
    throw new IntegrityError(`current situation ${row.situation_id} integrity mismatch`);
  }
  return record;
}

function isActiveAt(plan, at) {
  const instant = Date.parse(at);
  return Date.parse(plan.authoredAt) <= instant &&
    Date.parse(plan.horizonStart) <= instant &&
    Date.parse(plan.horizonEnd) >= instant;
}

function physicalPlaceRefs(plan) {
  return [...new Set(plan.stops.map((stop) => stop.physicalPlaceRef))];
}

export class LivedNowStore {
  #database;
  #readOnly;

  constructor(storage, { readOnly = false } = {}) {
    this.#readOnly = readOnly;
    this.#database = openWorldStateDatabase(storage, { readOnly, storeName: "LivedNowStore" });
    try {
      if (!readOnly) {
        migrateDatabase(this.#database);
        this.#database.transaction(() => createTables(this.#database));
      }
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() { this.#database.close(); }
  queryOnly() { return this.#readOnly; }

  #requireThread(threadId) {
    assertId("threadId", threadId);
    const row = this.#database.prepare(
      "SELECT created_at FROM threads WHERE thread_id=?",
    ).get(threadId);
    if (row === undefined) throw new LivedNowNotFoundError(`Thread ${threadId} was not found`);
    return row;
  }

  #requireThreadTime(threadId, name, at) {
    const thread = this.#requireThread(threadId);
    if (Date.parse(at) < Date.parse(thread.created_at)) {
      throw new LivedNowConflictError(`${name} cannot precede Thread creation`);
    }
  }

  #requirePlace(threadId, reference) {
    const witness = resolveSituatedReference(this.#database, threadId, reference);
    if (witness?.kind !== "place_episode_revision") {
      throw new LivedNowConflictError(
        `physical place ${reference} must resolve to this Thread's situated place authority`,
      );
    }
  }

  #requireCareAuthority(plan) {
    const witness = this.#database.prepare(`
      SELECT source_id,revision
      FROM situated_evidence_witnesses
      WHERE reference=? AND thread_id=? AND witness_kind='life_relation_revision'
    `).get(plan.authority.relationRef, plan.subjectThreadId);
    if (witness === undefined) {
      throw new LivedNowConflictError("care plan authority must resolve to a life relation revision");
    }
    const latest = this.#database.prepare(`
      SELECT MAX(revision) AS revision
      FROM life_relation_records
      WHERE relation_id=? AND thread_id=?
    `).get(witness.source_id, plan.subjectThreadId);
    if (Number(latest.revision) !== Number(witness.revision)) {
      throw new LivedNowConflictError("care plan authority must use the current relation revision");
    }
    const row = this.#database.prepare(`
      SELECT record_json
      FROM life_relation_records
      WHERE relation_id=? AND revision=? AND thread_id=?
    `).get(witness.source_id, witness.revision, plan.subjectThreadId);
    const relation = normalizeLifeRelation(parseJson("care authority relation", row.record_json));
    if (!situatedLifeRecordIsCurrent(relation)) {
      throw new LivedNowConflictError("care plan authority relation is not current");
    }
    if (!CARE_AUTHORITY_RELATION_KINDS.has(relation.relationKind)) {
      throw new LivedNowConflictError("care plan authority requires a current parent relation");
    }
    if (
      relation.relatedParty.partyId !== plan.owner.partyId ||
      relation.relatedParty.kind !== plan.owner.kind
    ) {
      throw new LivedNowConflictError("care plan owner does not match its authority relation");
    }
  }

  recordPlan(candidate) {
    if (this.#readOnly) throw new LivedNowConflictError("read-only lived-now store cannot write");
    const record = normalizeLivedPlan(candidate);
    this.#requireThreadTime(record.subjectThreadId, "lived plan", record.authoredAt);

    try {
      return this.#database.transaction(() => {
        const existingRow = this.#database.prepare(
          "SELECT * FROM lived_now_plans WHERE plan_id=?",
        ).get(record.planId);
        if (existingRow !== undefined) {
          const existing = planFromRow(existingRow);
          if (canonicalJson(existing) === canonicalJson(record)) return existing;
          throw new LivedNowConflictError(`lived plan ${record.planId} already exists differently`);
        }

        const placeRefs = physicalPlaceRefs(record);
        placeRefs.forEach((reference) => this.#requirePlace(record.subjectThreadId, reference));
        const resolved = assertAllSituatedReferencesResolve(
          this.#database,
          record.subjectThreadId,
          record.sourceReferences,
        );
        for (const reference of placeRefs) {
          if (!record.sourceReferences.includes(reference)) {
            throw new LivedNowConflictError("lived plan must cite each physical place authority");
          }
        }
        if (record.kind === "personal") {
          if (!resolved.some((item) => item.kind === "thread_event")) {
            throw new LivedNowConflictError(
              "personal plan requires a Thread-event witness from the life it was formed within",
            );
          }
        } else {
          this.#requireCareAuthority(record);
        }

        const recordJson = canonicalJson(record);
        this.#database.prepare(`
          INSERT INTO lived_now_plans(
            plan_id,subject_thread_id,plan_kind,owner_party_id,authored_at,record_json,record_digest
          ) VALUES (?,?,?,?,?,?,?)
        `).run(
          record.planId,
          record.subjectThreadId,
          record.kind,
          record.owner.partyId,
          record.authoredAt,
          recordJson,
          digest(record),
        );
        return record;
      });
    } catch (error) {
      throw translateStorageError(error);
    }
  }

  listPlans(threadId, { kind = null } = {}) {
    this.#requireThread(threadId);
    if (kind !== null && !["personal", "care"].includes(kind)) {
      throw new TypeError("plan kind is invalid");
    }
    const rows = kind === null
      ? this.#database.prepare(`
          SELECT * FROM lived_now_plans
          WHERE subject_thread_id=? ORDER BY authored_at,plan_id
        `).all(threadId)
      : this.#database.prepare(`
          SELECT * FROM lived_now_plans
          WHERE subject_thread_id=? AND plan_kind=? ORDER BY authored_at,plan_id
        `).all(threadId, kind);
    return rows.map(planFromRow);
  }

  latestPlan(threadId, kind, { at } = {}) {
    if (!at) throw new TypeError("latestPlan requires an at timestamp");
    assertIsoTimestamp("latestPlan at", at);
    return this.listPlans(threadId, { kind })
      .filter((plan) => isActiveAt(plan, at))
      .at(-1) ?? null;
  }

  getSituation(situationId, { required = true } = {}) {
    assertId("situationId", situationId);
    const row = this.#database.prepare(
      "SELECT * FROM current_situation_records WHERE situation_id=?",
    ).get(situationId);
    if (row === undefined) {
      if (!required) return null;
      throw new LivedNowNotFoundError(`current situation ${situationId} was not found`);
    }
    return situationFromRow(row);
  }

  getCurrentSituation(threadId) {
    this.#requireThread(threadId);
    const row = this.#database.prepare(`
      SELECT * FROM current_situation_records
      WHERE thread_id=? ORDER BY established_at DESC,situation_id DESC LIMIT 1
    `).get(threadId);
    return row === undefined ? null : situationFromRow(row);
  }

  enactCurrentSituation(input) {
    if (this.#readOnly) throw new LivedNowConflictError("read-only lived-now store cannot write");
    assertPlainObject("enact current situation input", input);
    assertExactKeys("enact current situation input", input, ["threadId", "situationId", "establishedAt"]);
    assertId("enact current situation input.threadId", input.threadId);
    assertId("enact current situation input.situationId", input.situationId);
    assertIsoTimestamp("enact current situation input.establishedAt", input.establishedAt);
    this.#requireThreadTime(input.threadId, "current situation", input.establishedAt);

    try {
      return this.#database.transaction(() => {
        const existing = this.getSituation(input.situationId, { required: false });
        if (existing !== null) {
          if (existing.threadId === input.threadId && existing.establishedAt === input.establishedAt) {
            return existing;
          }
          throw new LivedNowConflictError(
            `current situation ${input.situationId} already exists for another enactment`,
          );
        }

        const personalPlan = this.latestPlan(input.threadId, "personal", { at: input.establishedAt });
        if (personalPlan === null) {
          throw new LivedNowConflictError("World cannot enact a current situation without a personal plan");
        }
        const carePlan = this.latestPlan(input.threadId, "care", { at: input.establishedAt });
        const situation = resolveCurrentSituation({
          situationId: input.situationId,
          establishedAt: input.establishedAt,
          personalPlan,
          carePlan,
        });
        if (situation.location.kind === "place") {
          this.#requirePlace(input.threadId, situation.location.placeRef);
        } else {
          this.#requirePlace(input.threadId, situation.location.fromPlaceRef);
          this.#requirePlace(input.threadId, situation.location.toPlaceRef);
        }

        const recordJson = canonicalJson(situation);
        this.#database.prepare(`
          INSERT INTO current_situation_records(
            situation_id,thread_id,established_at,record_json,record_digest
          ) VALUES (?,?,?,?,?)
        `).run(
          situation.situationId,
          situation.threadId,
          situation.establishedAt,
          recordJson,
          digest(situation),
        );
        return situation;
      });
    } catch (error) {
      throw translateStorageError(error);
    }
  }
}

export function openLivedNowStore(storage) {
  return new LivedNowStore(storage);
}

export function openLivedNowInspectionStore(storage) {
  return new LivedNowStore(storage, { readOnly: true });
}
