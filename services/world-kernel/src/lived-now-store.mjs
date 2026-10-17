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
import {openWorldStateDatabase,worldSchemaReady} from "./world-state-storage.mjs";
import {
  normalizeLivedPlan,
  normalizeCurrentSituation,
  resolveCurrentSituation,
} from "./lived-now.mjs";
import {
  resolveSituatedReference,
} from "./situated-identity-grounding.mjs";
import {
  normalizeLifeRelation,
  normalizePlaceEpisode,
  situatedLifeRecordIsCurrent,
} from "./situated-life-domain.mjs";
import { placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";
import {genesisContextLocations,isModernGenesisPlace,isModernGenesisWorldPlace} from "./current-thread-location.mjs";
import {resolveLocalityGeography} from "#core/src/locality-geography.mjs";
import {
  bindLivePhysicalVenue,
  createLiveWorldPlaceTables,
  ensureLiveWorldPlaces,
  liveWorldContext,
  listLiveWorldPlaces,
  resolveLivePhysicalVenue,
  resolveLiveWorldPlace,
} from "./live-world-place.mjs";

import {
  admitWorldPublicPlace,admitWorldPrivatePlace,admitWorldLocality,createLiveWorldGeographyTables,
  getWorldLocality,getWorldPrivatePlace,getWorldPublicPlace,listLocalWorldPublicPlaces,
  coarseWorldPlace,
} from "./live-world-geography.mjs";

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
  const needsFrontier=database.prepare(`
    SELECT 1 FROM sqlite_master
    WHERE type='table' AND name='current_situation_frontier'
  `).get()===undefined;
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

    CREATE INDEX IF NOT EXISTS idx_current_situations_recent
      ON current_situation_records(established_at DESC);
    -- Public venue presence is discovered by the enacted place ref, not by
    -- scanning every Thread or relying on legacy per-Thread venue bindings.
    CREATE INDEX IF NOT EXISTS idx_current_situations_place
      ON current_situation_records(
        json_extract(record_json,'$.location.placeRef'),
        established_at DESC,thread_id
      )
      WHERE json_extract(record_json,'$.location.kind')='place';

    -- One authoritative current record per Thread; history stays immutable.
    CREATE TABLE IF NOT EXISTS current_situation_frontier (
      thread_id TEXT PRIMARY KEY,
      situation_id TEXT NOT NULL,
      established_at TEXT NOT NULL,
      record_json TEXT NOT NULL,
      record_digest TEXT NOT NULL,
      place_ref TEXT,
      wakefulness TEXT,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (situation_id) REFERENCES current_situation_records(situation_id)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_current_frontier_place
      ON current_situation_frontier(place_ref,thread_id)
      WHERE place_ref IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_current_frontier_recent
      ON current_situation_frontier(established_at DESC,situation_id DESC);
    CREATE TRIGGER IF NOT EXISTS current_situations_advance_frontier
      AFTER INSERT ON current_situation_records
      BEGIN
        INSERT INTO current_situation_frontier (
          thread_id,situation_id,established_at,record_json,record_digest,place_ref,wakefulness
        ) VALUES (
          NEW.thread_id,NEW.situation_id,NEW.established_at,NEW.record_json,NEW.record_digest,
          CASE WHEN json_extract(NEW.record_json,'$.location.kind')='place'
            THEN json_extract(NEW.record_json,'$.location.placeRef') ELSE NULL END,
          json_extract(NEW.record_json,'$.wakefulness')
        )
        ON CONFLICT(thread_id) DO UPDATE SET
          situation_id=excluded.situation_id,
          established_at=excluded.established_at,
          record_json=excluded.record_json,
          record_digest=excluded.record_digest,
          place_ref=excluded.place_ref,
          wakefulness=excluded.wakefulness
        WHERE excluded.established_at>current_situation_frontier.established_at
          OR (excluded.established_at=current_situation_frontier.established_at
            AND excluded.situation_id>current_situation_frontier.situation_id);
      END;

    CREATE TRIGGER IF NOT EXISTS current_situations_no_update
      BEFORE UPDATE ON current_situation_records
      BEGIN SELECT RAISE(ABORT,'current_situation_records is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS current_situations_no_delete
      BEFORE DELETE ON current_situation_records
      BEGIN SELECT RAISE(ABORT,'current_situation_records is append-only'); END;

    CREATE TABLE IF NOT EXISTS lived_now_next_boundaries (
      thread_id TEXT PRIMARY KEY,
      situation_id TEXT NOT NULL,
      due_at TEXT,
      blocked_reason TEXT,
      failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK(failed_attempts>=0),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (situation_id) REFERENCES current_situation_records(situation_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_lived_now_next_boundaries_due
      ON lived_now_next_boundaries(due_at)
      WHERE due_at IS NOT NULL;
  `);
  // One-time migration from append-only evidence, using the existing
  // (thread_id,established_at,situation_id) index. Never replay histories
  // during ordinary runtime initialization after the frontier exists.
  if(needsFrontier){
    database.exec(`
      INSERT INTO current_situation_frontier(
        thread_id,situation_id,established_at,record_json,record_digest,place_ref,wakefulness
      )
      SELECT s.thread_id,s.situation_id,s.established_at,s.record_json,s.record_digest,
        CASE WHEN json_extract(s.record_json,'$.location.kind')='place'
          THEN json_extract(s.record_json,'$.location.placeRef') ELSE NULL END,
        json_extract(s.record_json,'$.wakefulness')
      FROM threads t JOIN current_situation_records s ON s.situation_id=(
        SELECT situation_id FROM current_situation_records
        WHERE thread_id=t.thread_id
        ORDER BY established_at DESC,situation_id DESC LIMIT 1
      )
    `);
  }
  createLiveWorldPlaceTables(database);
  createLiveWorldGeographyTables(database);
}

function parseJson(name, value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

function worldPlaceEvidence(ref, json, storedDigest) {
  if (json === null) return null;
  const record = parseJson(`live World place ${ref}`, json);
  if (
    record?.ref !== ref
    || canonicalJson(record) !== json
    || digest(record) !== storedDigest
  ) {
    throw new IntegrityError(`live World place ${ref} integrity mismatch`);
  }
  return Object.freeze(record);
}

function privatePlaceEvidence(threadId, placeRef, json, storedDigest) {
  const record = parseJson(`private World place ${placeRef}`, json);
  if (record.threadId !== threadId || record.placeRef !== placeRef
    || canonicalJson(record) !== json || digest(record) !== storedDigest) {
    throw new IntegrityError(`private World place ${placeRef} failed integrity`);
  }
  return Object.freeze(record);
}

function placeEpisodeEvidence(ref, json, recordDigest, witnessDigest) {
  if (json === null) return null;
  const record = normalizePlaceEpisode(parseJson(`place episode ${ref}`, json));
  if (
    placeEpisodeRevisionRef(record) !== ref
    || canonicalJson(record) !== json
    || recordDigest !== witnessDigest
  ) {
    throw new IntegrityError(`place episode ${ref} integrity mismatch`);
  }
  return record;
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

function physicalPlaceRefs(plan) {
  return [...new Set(plan.stops.map((stop) => stop.physicalPlaceRef))];
}

function observedPlaceRefs(situation) {
  if (situation.location.kind === "place") return [situation.location.placeRef];
  return [situation.location.fromPlaceRef, situation.location.toPlaceRef];
}

export class LivedNowStore {
  #database;
  #readOnly;

  constructor(storage, { readOnly = false } = {}) {
    this.#readOnly = readOnly;
    this.#database = openWorldStateDatabase(storage, { readOnly, storeName: "LivedNowStore" });
    try {
      if (!readOnly && !storage.schemaReady) {
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

  #resolveLivedReference(threadId, reference) {
    const situated = resolveSituatedReference(this.#database, threadId, reference);
    if (situated !== null) return situated;
    const worldPlace = resolveLiveWorldPlace(this.#database, threadId, reference)
      ??getWorldPublicPlace(this.#database,reference);
    if (worldPlace !== null) return { kind:"world_place", reference, worldPlace };
    if(!worldSchemaReady(this.#database)){
      const workTable=this.#database.prepare(`
        SELECT 1 AS present FROM sqlite_master
        WHERE type='table' AND name='inside_fibre_work_commitments'
      `).get();
      if(workTable===undefined)return null;
    }
    const work = this.#database.prepare(`
      SELECT commitment_id
      FROM inside_fibre_work_commitments
      WHERE commitment_id=? AND thread_id=?
    `).get(reference,threadId);
    return work === undefined
      ? null
      : { kind:"work_commitment", reference };
  }

  #resolveLivedReferences(threadId, references) {
    return references.map((reference) => {
      const witness = this.#resolveLivedReference(threadId, reference);
      if (witness === null) {
        throw new IntegrityError(`unresolved lived reference ${reference} for Thread ${threadId}`);
      }
      return witness;
    });
  }

  #requirePlace(threadId, reference) {
    const witness = this.#resolveLivedReference(threadId, reference);
    if (!["place_episode_revision","world_place"].includes(witness?.kind)) {
      throw new LivedNowConflictError(
        `physical place ${reference} must resolve to situated or shared World-place authority`,
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
        const resolved = this.#resolveLivedReferences(
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

  getPlan(threadId,planId){
    this.#requireThread(threadId);
    assertId("Flight Plan reference",planId);
    const row=this.#database.prepare(`
      SELECT * FROM lived_now_plans
      WHERE subject_thread_id=? AND plan_id=?
    `).get(threadId,planId);
    return row===undefined?null:planFromRow(row);
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
    this.#requireThread(threadId);
    if (!["personal", "care"].includes(kind)) throw new TypeError("plan kind is invalid");
    const row = this.#database.prepare(`
      SELECT * FROM lived_now_plans
      WHERE subject_thread_id=? AND plan_kind=?
        AND authored_at<=?
        AND json_extract(record_json,'$.horizonStart')<=?
        AND json_extract(record_json,'$.horizonEnd')>=?
      ORDER BY authored_at DESC,plan_id DESC
      LIMIT 1
    `).get(threadId, kind, at, at, at);
    return row === undefined ? null : planFromRow(row);
  }

  ensureWorldPlaces(threadId) {
    this.#requireThread(threadId);
    if (this.#readOnly) {
      throw new LivedNowConflictError("read-only LivedNow store cannot admit shared World places");
    }
    return ensureLiveWorldPlaces(this.#database, threadId);
  }

  getWorldContext(threadId, { required = false } = {}) {
    this.#requireThread(threadId);
    const context = liveWorldContext(this.#database, threadId);
    if (context === null && required) {
      throw new LivedNowNotFoundError(`live World context was not found for Thread ${threadId}`);
    }
    return context;
  }

  listWorldPlaces(threadId) {
    this.#requireThread(threadId);
    const historic=listLiveWorldPlaces(this.#database,threadId);
    // A current public visit must resolve to exactly the same World venue
    // for perception and meeting compatibility. Do not list the whole city.
    const location=this.getCurrentSituation(threadId)?.location;
    const current=location?.kind==="place"
      ?getWorldPublicPlace(this.#database,location.placeRef):null;
    return current===null?historic:[...historic,current];
  }

  admitPublicPlace(candidate){
    if(this.#readOnly)throw new LivedNowConflictError("read-only World cannot admit a public venue");
    return this.#database.transaction(()=>admitWorldPublicPlace(this.#database,candidate));
  }

  // Geographical knowledge can precede a visit: a future destination, a
  // familiar place, or a new city must not require fabricated current presence.
  groundPlace({place,localityEvidence=null}={}){
    if(this.#readOnly)throw new LivedNowConflictError("read-only World cannot ground a place");
    assertPlainObject("World place grounding",place);
    this.#requireThread(place.threadId);
    this.#requirePlace(place.threadId,place.placeRef);
    const existing=this.getPrivatePlace(place.threadId,place.placeRef);
    if(existing!==null)return {
      status:"grounded",place:admitWorldPrivatePlace(this.#database,place),
      locality:this.getWorldLocality({locality:place.locality,countryCode:place.countryCode}),
    };
    const known=this.getWorldLocality({locality:place.locality,countryCode:place.countryCode});
    const catalog=known===null?resolveLocalityGeography(`${place.country}/${place.locality}`):null;
    const locality=localityEvidence??known??(catalog?.countryCode===place.countryCode?{
      locality:catalog.city,country:catalog.country,countryCode:catalog.countryCode,
      lat:catalog.lat,long:catalog.long,timeZone:place.timeZone,
      evidenceRef:place.evidenceRef,
    }:null);
    if(locality===null)return Object.freeze({
      status:"unlocated",placeRef:place.placeRef,reason:"locality_evidence_missing",
    });
    if(locality.locality.toLowerCase()!==place.locality.toLowerCase()
      ||locality.countryCode!==place.countryCode||locality.country!==place.country
      ||locality.timeZone!==place.timeZone){
      throw new LivedNowConflictError("World place locality evidence contradicts the proposed place");
    }
    return this.#database.transaction(()=>({
      status:"grounded",
      locality:admitWorldLocality(this.#database,locality),
      place:admitWorldPrivatePlace(this.#database,place),
    }));
  }

  getWorldLocality(query){
    return getWorldLocality(this.#database,query);
  }

  admitPrivatePlace(candidate){
    if(this.#readOnly)throw new LivedNowConflictError("read-only World cannot locate a private place");
    this.#requireThread(candidate.threadId);
    const current=this.getCurrentSituation(candidate.threadId);
    if(current?.phase!=="at_place"||current.location?.kind!=="place"
      ||current.location.placeRef!==candidate.placeRef){
      throw new LivedNowConflictError("private location must describe the Thread's enacted present");
    }
    return this.#database.transaction(()=>admitWorldPrivatePlace(this.#database,candidate));
  }

  getPrivatePlace(threadId,placeRef){
    this.#requireThread(threadId);
    return getWorldPrivatePlace(this.#database,threadId,placeRef);
  }

  getPublicPlace(placeRef){
    return getWorldPublicPlace(this.#database,placeRef);
  }

  listPublicPlacesByLocality({locality,countryCode,limit=12}){
    return listLocalWorldPublicPlaces(this.#database,{locality,countryCode,limit});
  }

  listPublicPlacesNearCurrentLife(threadId,{limit=12}={}){
    const situation=this.getCurrentSituation(threadId);
    if(situation?.location?.kind!=="place")return [];
    const privatePlace=this.getPrivatePlace(threadId,situation.location.placeRef);
    if(privatePlace===null)return [];
    return listLocalWorldPublicPlaces(this.#database,{
      locality:privatePlace.locality,countryCode:privatePlace.countryCode,limit,
    });
  }

  coarseCurrentPlace(threadId,placeRef){
    const privatePlace=this.getPrivatePlace(threadId,placeRef);
    // undefined: no World disclosure authority; null: explicitly hidden.
    return privatePlace===null?undefined:coarseWorldPlace(privatePlace);
  }

  currentLocationTimeZone(threadId){
    const situation=this.getCurrentSituation(threadId);
    if(situation?.location?.kind!=="place")return null;
    return this.getPrivatePlace(threadId,situation.location.placeRef)?.timeZone??null;
  }

  bindPhysicalVenue(candidate){
    if(this.#readOnly)throw new LivedNowConflictError("read-only World cannot attest a physical venue");
    return this.#database.transaction(()=>bindLivePhysicalVenue(this.#database,candidate));
  }

  getPhysicalVenue(reference){
    return resolveLivePhysicalVenue(this.#database,reference);
  }

  getWorldPlace(threadId, reference, { required = true } = {}) {
    this.#requireThread(threadId);
    const place = resolveLiveWorldPlace(this.#database, threadId, reference)
      ??getWorldPublicPlace(this.#database,reference);
    if (place === null && required) {
      throw new LivedNowNotFoundError(`shared World place ${reference} was not found for Thread ${threadId}`);
    }
    return place;
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

  scheduleNextLivedBoundary({threadId,situationId,dueAt}){
    if(this.#readOnly)throw new LivedNowConflictError("read-only lived-now store cannot schedule");
    assertId("lived boundary threadId",threadId);
    assertId("lived boundary situationId",situationId);
    if(dueAt!==null)assertIsoTimestamp("lived boundary dueAt",dueAt);
    const current=this.getCurrentSituation(threadId);
    if(current?.situationId!==situationId)return {scheduled:false,stale:true};
    const prior=this.#database.prepare(`
      SELECT situation_id,due_at FROM lived_now_next_boundaries WHERE thread_id=?
    `).get(threadId);
    if(prior?.situation_id===situationId&&prior.due_at===dueAt){
      return {scheduled:false,stale:false};
    }
    this.#database.prepare(`
      INSERT INTO lived_now_next_boundaries(thread_id,situation_id,due_at,blocked_reason,failed_attempts)
      VALUES(?,?,?,NULL,0)
      ON CONFLICT(thread_id) DO UPDATE SET
        situation_id=excluded.situation_id,
        due_at=excluded.due_at,
        blocked_reason=NULL,
        failed_attempts=0
    `).run(threadId,situationId,dueAt);
    return {scheduled:dueAt!==null,stale:false};
  }

  nextLivedBoundaryAt(){
    return this.#database.prepare(`
      SELECT due_at FROM lived_now_next_boundaries
      WHERE due_at IS NOT NULL ORDER BY due_at LIMIT 1
    `).get()?.due_at??null;
  }

  listDueLivedBoundaries({at,limit=1}){
    assertIsoTimestamp("due lived boundaries at",at);
    if(!Number.isSafeInteger(limit)||limit<1||limit>4){
      throw new TypeError("lived boundary limit must be 1-4");
    }
    return this.#database.prepare(`
      SELECT thread_id,situation_id,due_at FROM lived_now_next_boundaries
      WHERE due_at IS NOT NULL AND due_at<=?
      ORDER BY due_at,thread_id LIMIT ?
    `).all(at,limit).map((row)=>Object.freeze({
      threadId:row.thread_id,situationId:row.situation_id,dueAt:row.due_at,
    }));
  }

  failLivedBoundary({threadId,situationId,dueAt,message}){
    if(this.#readOnly)throw new LivedNowConflictError("read-only lived-now store cannot fail");
    assertId("failed lived boundary threadId",threadId);
    assertId("failed lived boundary situationId",situationId);
    assertIsoTimestamp("failed lived boundary dueAt",dueAt);
    if(typeof message!=="string"||!message||message.length>180){
      throw new TypeError("failed lived boundary needs short error");
    }
    // Bounded transients: after three unsuccessful wakes, stop until a new
    // authoritative LivedNow update re-arms the frontier.
    this.#database.prepare(`
      UPDATE lived_now_next_boundaries
      SET failed_attempts=failed_attempts+1,
        blocked_reason=CASE WHEN failed_attempts>=2 THEN ? ELSE NULL END,
        due_at=CASE WHEN failed_attempts>=2 THEN NULL ELSE due_at END
      WHERE thread_id=? AND situation_id=? AND due_at=?
    `).run(message,threadId,situationId,dueAt);
    const row=this.#database.prepare(`
      SELECT due_at,failed_attempts
      FROM lived_now_next_boundaries WHERE thread_id=?
    `).get(threadId);
    return {blocked:row?.due_at===null,attempts:row?.failed_attempts??0};
  }

  inspectLivedBoundary(threadId){
    this.#requireThread(threadId);
    // An existing World may be inspected before its first post-upgrade
    // writable LivedNow session creates this optional frontier.
    if(this.#readOnly&&!worldSchemaReady(this.#database)
      &&!this.#database.prepare(`
        SELECT 1 FROM sqlite_master
        WHERE type='table' AND name='lived_now_next_boundaries'
      `).get())return null;
    const row=this.#database.prepare(`
      SELECT situation_id,due_at,blocked_reason,failed_attempts
      FROM lived_now_next_boundaries WHERE thread_id=?
    `).get(threadId);
    return row===undefined?null:Object.freeze({
      situationId:row.situation_id,dueAt:row.due_at,
      blockedReason:row.blocked_reason,failedAttempts:row.failed_attempts,
    });
  }

  settleLivedBoundary({threadId,situationId,dueAt,blockedReason=null}){
    if(this.#readOnly)throw new LivedNowConflictError("read-only lived-now store cannot settle");
    assertId("settled lived boundary threadId",threadId);
    assertId("settled lived boundary situationId",situationId);
    assertIsoTimestamp("settled lived boundary dueAt",dueAt);
    if(blockedReason!==null&&(typeof blockedReason!=="string"
      ||blockedReason.length===0||blockedReason.length>180)){
      throw new TypeError("lived boundary reason must be short");
    }
    return this.#database.prepare(`
      UPDATE lived_now_next_boundaries
      SET due_at=NULL,blocked_reason=?
      WHERE thread_id=? AND situation_id=? AND due_at=?
    `).run(blockedReason,threadId,situationId,dueAt).changes===1;
  }

  getCurrentSituation(threadId) {
    this.#requireThread(threadId);
    const row = this.#database.prepare(`
      SELECT situation_id,thread_id,established_at,record_json,record_digest
      FROM current_situation_frontier WHERE thread_id=?
    `).get(threadId);
    return row === undefined ? null : situationFromRow(row);
  }

  getPreviousSituation(threadId, before) {
    this.#requireThread(threadId);
    assertIsoTimestamp("previous situation before", before);
    const row = this.#database.prepare(`
      SELECT * FROM current_situation_records
      WHERE thread_id=? AND established_at<?
      ORDER BY established_at DESC,situation_id DESC LIMIT 1
    `).get(threadId, before);
    return row === undefined ? null : situationFromRow(row);
  }

  listRecentSituations(threadId,{limit=8}={}){
    this.#requireThread(threadId);
    if(!Number.isSafeInteger(limit)||limit<1||limit>16){
      throw new TypeError("recent Thread situation read must be bounded");
    }
    return this.#database.prepare(`
      SELECT situation_id,thread_id,established_at,record_json,record_digest
      FROM current_situation_records WHERE thread_id=?
      ORDER BY established_at DESC,situation_id DESC LIMIT ?
    `).all(threadId,limit).map(situationFromRow);
  }

  listCurrentSituations({ at, livingOnly = false, includeLifeContinuity = false } = {}) {
    if (!at) throw new TypeError("listCurrentSituations requires an at timestamp");
    assertIsoTimestamp("listCurrentSituations at", at);
    const rows = this.#database.prepare(`
      SELECT f.situation_id,f.thread_id AS thread_id,f.established_at,f.record_json,f.record_digest
        ${includeLifeContinuity ? `,json_extract(p.record_json,'$.horizonEnd') AS life_horizon_end,
          b.situation_id AS life_boundary_situation_id,
          b.due_at AS life_due_at,b.blocked_reason AS life_blocked_reason,
          b.failed_attempts AS life_failed_attempts` : ""}
      FROM current_situation_frontier f
      JOIN threads t ON t.thread_id=f.thread_id
      ${includeLifeContinuity ? `LEFT JOIN lived_now_plans p ON p.plan_id=
          json_extract(f.record_json,'$.sourcePlanRefs[0]') AND p.plan_kind='personal'
        LEFT JOIN lived_now_next_boundaries b ON b.thread_id=f.thread_id
          AND b.situation_id=f.situation_id` : ""}
      WHERE f.established_at<=?
        ${livingOnly ? "AND t.status<>'retired'" : ""}
      UNION ALL
      SELECT s.situation_id,s.thread_id,s.established_at,s.record_json,s.record_digest
        ${includeLifeContinuity ? `,json_extract(p.record_json,'$.horizonEnd') AS life_horizon_end,
          b.situation_id AS life_boundary_situation_id,
          b.due_at AS life_due_at,b.blocked_reason AS life_blocked_reason,
          b.failed_attempts AS life_failed_attempts` : ""}
      FROM current_situation_frontier f
      JOIN threads t ON t.thread_id=f.thread_id
      JOIN current_situation_records s ON s.situation_id=(
        SELECT prior.situation_id FROM current_situation_records prior
        WHERE prior.thread_id=f.thread_id AND prior.established_at<=?
        ORDER BY prior.established_at DESC,prior.situation_id DESC LIMIT 1
      )
      ${includeLifeContinuity ? `LEFT JOIN lived_now_plans p ON p.plan_id=
          json_extract(s.record_json,'$.sourcePlanRefs[0]') AND p.plan_kind='personal'
        LEFT JOIN lived_now_next_boundaries b ON b.thread_id=s.thread_id
          AND b.situation_id=s.situation_id` : ""}
      WHERE f.established_at>?
        ${livingOnly ? "AND t.status<>'retired'" : ""}
      ORDER BY thread_id
    `).all(at,at,at);
    return rows.map(row=>{
      const situation=situationFromRow(row);
      if(!includeLifeContinuity)return situation;
      return Object.freeze({
        ...situation,
        lifeContinuity:Object.freeze({
          currentAt:situation.establishedAt,
          planHorizonEnd:row.life_horizon_end??null,
          nextAutonomousBoundary:row.life_boundary_situation_id===null?null:Object.freeze({
            situationId:row.life_boundary_situation_id,
            dueAt:row.life_due_at,
            blockedReason:row.life_blocked_reason,
            failedAttempts:row.life_failed_attempts,
          }),
        }),
      });
    });
  }

  // The venue index narrows the search; the result limit applies only after
  // resolving each Thread's latest enacted presence, not to historical bindings.
  listCurrentVenueSituations({venueRef,at,limit=8,excludeThreadId=null}={}){
    assertId("shared venue reference",venueRef);
    assertIsoTimestamp("venue presence time",at);
    if(excludeThreadId!==null)assertId("excluded venue Thread",excludeThreadId);
    if(!Number.isSafeInteger(limit)||limit<1||limit>16){
      throw new TypeError("venue presence limit must be 1-16");
    }
    const rows=this.#database.prepare(`
      SELECT s.situation_id,s.thread_id,s.established_at,s.record_json,s.record_digest
      FROM live_physical_venue_bindings v
      JOIN current_situation_frontier f ON f.thread_id=v.thread_id
      JOIN current_situation_records s ON s.situation_id=(
        CASE WHEN f.established_at<=? THEN f.situation_id
        ELSE (SELECT latest.situation_id FROM current_situation_records latest
          WHERE latest.thread_id=v.thread_id AND latest.established_at<=?
          ORDER BY latest.established_at DESC,latest.situation_id DESC LIMIT 1)
        END
      )
      WHERE v.venue_ref=?
        AND (? IS NULL OR v.thread_id<>?)
        AND json_extract(s.record_json,'$.location.kind')='place'
        AND json_extract(s.record_json,'$.location.placeRef')=v.context_place_ref
        AND COALESCE(json_extract(s.record_json,'$.wakefulness'),'unknown')<>'asleep'
        AND s.thread_id IN (SELECT thread_id FROM threads WHERE status<>'retired')
      ORDER BY v.thread_id LIMIT ?
    `).all(at,at,venueRef,excludeThreadId,excludeThreadId,limit);
    // Newly admitted public venues have a shared wpl_* ref and do not need
    // one historical binding per Thread. Search the indexed enacted ref,
    // then confirm it is still that person's latest actual situation.
    const publicRows=this.#database.prepare(`
      SELECT f.situation_id,f.thread_id AS thread_id,f.established_at,f.record_json,f.record_digest
      FROM world_public_places p
      JOIN current_situation_frontier f ON f.place_ref=p.place_ref
      JOIN threads t ON t.thread_id=f.thread_id
      WHERE p.venue_ref=? AND f.established_at<=?
        AND (? IS NULL OR f.thread_id<>?)
        AND COALESCE(f.wakefulness,'unknown')<>'asleep'
        AND t.status<>'retired'
      UNION ALL
      SELECT s.situation_id,s.thread_id,s.established_at,s.record_json,s.record_digest
      FROM current_situation_frontier f
      JOIN threads t ON t.thread_id=f.thread_id
      JOIN world_public_places p ON p.venue_ref=?
      JOIN current_situation_records s ON s.situation_id=(
        SELECT latest.situation_id FROM current_situation_records latest
        WHERE latest.thread_id=f.thread_id AND latest.established_at<=?
        ORDER BY latest.established_at DESC,latest.situation_id DESC LIMIT 1
      )
      WHERE f.established_at>?
        AND (? IS NULL OR f.thread_id<>?)
        AND json_extract(s.record_json,'$.location.kind')='place'
        AND json_extract(s.record_json,'$.location.placeRef')=p.place_ref
        AND COALESCE(json_extract(s.record_json,'$.wakefulness'),'unknown')<>'asleep'
        AND t.status<>'retired'
      ORDER BY thread_id LIMIT ?
    `).all(
      venueRef,at,excludeThreadId,excludeThreadId,
      venueRef,at,at,excludeThreadId,excludeThreadId,limit,
    );
    const present=new Map([...rows,...publicRows]
      .map(row=>[row.thread_id,situationFromRow(row)]));
    return [...present.values()].sort((a,b)=>a.threadId.localeCompare(b.threadId))
      .slice(0,limit);
  }

  listRecentCurrentSituations({at,since,limit=8}={}){
    assertIsoTimestamp("recent situations at",at);
    assertIsoTimestamp("recent situations since",since);
    if(!Number.isSafeInteger(limit)||limit<1||limit>32){
      throw new TypeError("recent situations limit must be 1-32");
    }
    const rows=this.#database.prepare(`
      -- The live frontier already holds the latest situation per Thread.
      SELECT f.situation_id,f.thread_id,f.established_at,f.record_json,f.record_digest
      FROM current_situation_frontier f
      JOIN threads t ON t.thread_id=f.thread_id
      WHERE f.established_at BETWEEN ? AND ? AND t.status<>'retired'
      UNION ALL
      -- For a delayed World event, that frontier may be in the future.
      -- Recover precisely the latest situation inside the original window.
      SELECT s.situation_id,s.thread_id,s.established_at,s.record_json,s.record_digest
      FROM current_situation_frontier f
      JOIN threads t ON t.thread_id=f.thread_id
      JOIN current_situation_records s ON s.situation_id=(
        SELECT prior.situation_id FROM current_situation_records prior
        WHERE prior.thread_id=f.thread_id AND prior.established_at BETWEEN ? AND ?
        ORDER BY prior.established_at DESC,prior.situation_id DESC LIMIT 1
      )
      WHERE f.established_at>? AND t.status<>'retired'
      ORDER BY established_at DESC,situation_id DESC LIMIT ?
    `).all(since,at,since,at,at,limit);
    return rows.map(situationFromRow);
  }

  listLocatedGenesisContexts(threadIds){
    if(!Array.isArray(threadIds)||threadIds.length===0)return [];
    const rows=this.#database.prepare(`
      SELECT p.thread_id,p.place_ref,
        p.record_json AS private_json,p.record_digest AS private_digest,
        e.record_json AS episode_json,e.record_digest AS episode_digest,
        w.record_digest AS witness_digest
      FROM world_private_place_locations p
      JOIN situated_evidence_witnesses w
        ON w.thread_id=p.thread_id AND w.reference=p.place_ref
        AND w.witness_kind='place_episode_revision'
      JOIN place_episode_records e
        ON e.thread_id=p.thread_id AND e.episode_id=w.source_id
        AND e.revision=w.revision
      WHERE p.thread_id IN (SELECT value FROM json_each(?))
      ORDER BY p.thread_id,p.place_ref
    `).all(JSON.stringify([...new Set(threadIds)]));
    return rows.map(row=>Object.freeze({
      threadId:row.thread_id,
      privatePlace:privatePlaceEvidence(row.thread_id,row.place_ref,
        row.private_json,row.private_digest),
      placeEpisode:placeEpisodeEvidence(row.place_ref,row.episode_json,
        row.episode_digest,row.witness_digest),
    }));
  }

  listCurrentLocationEvidence({ at } = {}) {
    const situations = this.listCurrentSituations({ at, livingOnly:true, includeLifeContinuity:true });
    if (situations.length === 0) return [];

    const references = [...new Set(situations.flatMap(observedPlaceRefs))];
    const rows = this.#database.prepare(`
      WITH refs(ref) AS (SELECT value FROM json_each(?))
      SELECT
        refs.ref,
        w.record_json AS world_json,
        w.record_digest AS world_digest,
        p.record_json AS place_json,
        p.record_digest AS place_digest,
        e.record_digest AS witness_digest
      FROM refs
      LEFT JOIN live_world_place_records w
        ON w.place_ref=refs.ref
      LEFT JOIN situated_evidence_witnesses e
        ON e.reference=refs.ref
       AND e.witness_kind='place_episode_revision'
      LEFT JOIN place_episode_records p
        ON p.thread_id=e.thread_id
       AND p.episode_id=e.source_id
       AND p.revision=e.revision
      ORDER BY refs.ref
    `).all(JSON.stringify(references));

    const evidenceByRef = new Map(rows.map((row) => [row.ref, Object.freeze({
      worldPlace:worldPlaceEvidence(row.ref, row.world_json, row.world_digest),
      placeEpisode:placeEpisodeEvidence(
        row.ref,
        row.place_json,
        row.place_digest,
        row.witness_digest,
      ),
    })]));

    // One indexed lookup for present privately located places. A private
    // address stays in World; only a locality-level projection leaves here.
    const privateTargets = situations
      .filter(situation => situation.location.kind === "place"
        && (situation.location.placeRef.startsWith("per:")
          || situation.location.placeRef.startsWith("wpl_")))
      .map(situation => [situation.threadId, situation.location.placeRef]);
    const privateRows = privateTargets.length === 0 ? [] : this.#database.prepare(`
      WITH targets AS (
        SELECT json_extract(value,'$[0]') AS thread_id,
               json_extract(value,'$[1]') AS place_ref
        FROM json_each(?)
      )
      SELECT p.thread_id,p.place_ref,p.record_json,p.record_digest
      FROM targets t
      JOIN world_private_place_locations p
        ON p.thread_id=t.thread_id AND p.place_ref=t.place_ref
    `).all(JSON.stringify(privateTargets));
    const privateByThread = new Map(privateRows.map(row => [
      row.thread_id,privatePlaceEvidence(
        row.thread_id,row.place_ref,row.record_json,row.record_digest,
      ),
    ]));

    const needsContext=[...new Set(situations.filter(situation=>
      observedPlaceRefs(situation).some(ref=>{
        const evidence=evidenceByRef.get(ref);
        return isModernGenesisPlace(evidence?.placeEpisode)
          ||isModernGenesisWorldPlace(evidence?.worldPlace);
      })&&!privateByThread.has(situation.threadId)
    ).map(situation=>situation.threadId))];
    const anchorsByThread=new Map();
    for(const anchor of this.listLocatedGenesisContexts(needsContext)){
      const items=anchorsByThread.get(anchor.threadId)??[];
      items.push(anchor);
      anchorsByThread.set(anchor.threadId,items);
    }
    return situations.map((currentSituation) => {
      const evidence = observedPlaceRefs(currentSituation)
        .map((ref) => evidenceByRef.get(ref))
        .filter(Boolean);
      if (evidence.some((item) =>
        item.placeEpisode !== null
        && item.placeEpisode.threadId !== currentSituation.threadId
      )) {
        throw new IntegrityError(`current place evidence belongs to another Thread ${currentSituation.threadId}`);
      }
      const worldPlaces=observedPlaceRefs(currentSituation)
        .map(ref=>this.getWorldPlace(currentSituation.threadId,ref,{required:false}))
        .filter(Boolean);
      const placeEpisodes=evidence.map(item=>item.placeEpisode).filter(Boolean);
      const anchors=anchorsByThread.get(currentSituation.threadId)??[];
      const ownedWorld={
        worldPlaces,threadId:currentSituation.threadId,
      };
      return Object.freeze({
        threadId:currentSituation.threadId,
        currentSituation,
        lifeContinuity:currentSituation.lifeContinuity??null,
        privatePlace:privateByThread.get(currentSituation.threadId)??null,
        contextLocations:Object.freeze(genesisContextLocations(
          placeEpisodes,anchors,ownedWorld,
        )),
        privateContextLocations:Object.freeze(genesisContextLocations(
          placeEpisodes,anchors,{...ownedWorld,privatePerspective:true},
        )),
        worldPlaces:Object.freeze(worldPlaces),
        placeEpisodes:Object.freeze(placeEpisodes),
      });
    });
  }

  enactCurrentSituation(input) {
    if (this.#readOnly) throw new LivedNowConflictError("read-only lived-now store cannot write");
    assertPlainObject("enact current situation input", input);
    assertExactKeys("enact current situation input", input, [
      "threadId",
      "situationId",
      "establishedAt",
      "observation",
      "materialization",
    ]);
    assertId("enact current situation input.threadId", input.threadId);
    assertId("enact current situation input.situationId", input.situationId);
    assertIsoTimestamp("enact current situation input.establishedAt", input.establishedAt);
    this.#requireThreadTime(input.threadId, "current situation", input.establishedAt);

    try {
      return this.#database.transaction(() => {
        const personalPlan = this.latestPlan(input.threadId, "personal", { at: input.establishedAt });
        if (personalPlan === null) {
          throw new LivedNowConflictError("World cannot establish a current situation without a personal plan");
        }
        const carePlan = this.latestPlan(input.threadId, "care", { at: input.establishedAt });
        const situation = resolveCurrentSituation({
          situationId: input.situationId,
          establishedAt: input.establishedAt,
          personalPlan,
          carePlan,
          observation: input.observation,
          ...(input.materialization === undefined ? {} : { materialization: input.materialization }),
        });

        for (const reference of observedPlaceRefs(situation)) {
          this.#requirePlace(input.threadId, reference);
        }
        this.#resolveLivedReferences(
          input.threadId,
          situation.evidenceRefs,
        );

        const existing = this.getSituation(input.situationId, { required: false });
        if (existing !== null) {
          if (canonicalJson(existing) === canonicalJson(situation)) return existing;
          throw new LivedNowConflictError(
            `current situation ${input.situationId} already exists differently`,
          );
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
