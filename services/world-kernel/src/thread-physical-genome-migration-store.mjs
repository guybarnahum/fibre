import {
  PHYSICAL_GENOME_VERSION,
  expressInheritedAppearance,
  normalizePhysicalLineage,
  resolveHumanPhysicalInheritance,
} from "#core/src/human-appearance/index.mjs";
import {
  appearanceCalibrationDependencies,
  planAppearanceCalibrationMigration,
} from "#core/src/population-context/index.mjs";
import {
  boundedThreadScopedId,
  canonicalJson,
  sha256,
  threadStateHash,
} from "./persistence-common.mjs";
import { validateThreadSnapshot } from "./persistence-domain.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

const OPERATION_KEY=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,220}$/u;

function normalizeOperationKey(value){
  if(typeof value!=="string"||!OPERATION_KEY.test(value))throw new TypeError("physical genome migration operationKey must be a Fibre identifier up to 221 characters");
  return value;
}

function normalizePhysicalAncestry(value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("physicalAncestry must be an object");
  const maternal=normalizePhysicalLineage(value.maternal);
  const paternal=normalizePhysicalLineage(value.paternal);
  return Object.freeze({maternal,paternal});
}

function eventId(threadId,operationKey){
  return boundedThreadScopedId({
    prefix:"evt",
    threadId,
    suffix:`physical_genome_${sha256(operationKey).slice(0,24)}`,
  });
}

function resultGenome(threadId,physicalAncestry){
  const ancestryDigest=sha256(canonicalJson(physicalAncestry));
  return resolveHumanPhysicalInheritance({
    maternal:{physicalLineage:physicalAncestry.maternal},
    paternal:{physicalLineage:physicalAncestry.paternal},
    conceptionSeed:`legacy-physical-embodiment:${threadId}:${ancestryDigest}`,
  }).physicalGenome;
}

export class ThreadPhysicalGenomeMigrationStore{
  #database;

  constructor(storage){
    this.#database=openWorldStateDatabase(storage,{storeName:"ThreadPhysicalGenomeMigrationStore"});
  }

  close(){this.#database.close();}

  latestEvidence(threadId){
    const row=this.#database.prepare(`
      SELECT event_id,payload_json,occurred_at
      FROM thread_events
      WHERE thread_id=? AND event_type='THREAD_PHYSICAL_GENOME_MIGRATED'
      ORDER BY sequence DESC
      LIMIT 1
    `).get(threadId);
    if(row===undefined)return null;
    const payload=JSON.parse(row.payload_json);
    if(payload?.physicalAncestry===undefined)return null;
    return Object.freeze({
      eventId:row.event_id,
      recordedAt:row.occurred_at,
      physicalAncestry:normalizePhysicalAncestry(payload.physicalAncestry),
      physicalGenomeVersion:payload?.physicalGenome?.version??null,
      previousPhysicalGenomeVersion:payload?.previousPhysicalGenomeVersion??null,
      calibrationDependencies:Array.isArray(payload?.calibrationDependencies)
        ? Object.freeze(structuredClone(payload.calibrationDependencies))
        : null,
      previousCalibrationDependencies:Array.isArray(payload?.previousCalibrationDependencies)
        ? Object.freeze(structuredClone(payload.previousCalibrationDependencies))
        : null,
    });
  }

  listLatestEvidence(threadIds=null){
    const normalized=threadIds===null
      ? null
      : [...new Set(threadIds.map((threadId)=>{
          if(typeof threadId!=="string"||threadId.trim()==="")throw new TypeError("Thread ancestry scan requires non-empty Thread IDs");
          return threadId.trim();
        }))];
    if(normalized!==null&&normalized.length===0)return Object.freeze([]);
    const rows=this.#database.prepare(`
      WITH ranked AS (
        SELECT
          event_id,thread_id,payload_json,occurred_at,
          ROW_NUMBER() OVER (PARTITION BY thread_id ORDER BY sequence DESC) AS ordinal
        FROM thread_events
        WHERE event_type='THREAD_PHYSICAL_GENOME_MIGRATED'
          ${normalized===null ? "" : "AND thread_id IN (SELECT value FROM json_each(?))"}
      )
      SELECT event_id,thread_id,payload_json,occurred_at
      FROM ranked
      WHERE ordinal=1
      ORDER BY thread_id
    `).all(...(normalized===null?[]:[JSON.stringify(normalized)]));
    return Object.freeze(rows.flatMap((row)=>{
      const payload=JSON.parse(row.payload_json);
      if(payload?.physicalAncestry===undefined)return [];
      return [Object.freeze({
        threadId:row.thread_id,
        eventId:row.event_id,
        recordedAt:row.occurred_at,
        physicalAncestry:normalizePhysicalAncestry(payload.physicalAncestry),
        physicalGenomeVersion:payload?.physicalGenome?.version??null,
        previousPhysicalGenomeVersion:payload?.previousPhysicalGenomeVersion??null,
        calibrationDependencies:Array.isArray(payload?.calibrationDependencies)
          ? Object.freeze(structuredClone(payload.calibrationDependencies))
          : null,
        previousCalibrationDependencies:Array.isArray(payload?.previousCalibrationDependencies)
          ? Object.freeze(structuredClone(payload.previousCalibrationDependencies))
          : null,
      })];
    }));
  }

  migrate(thread,{physicalAncestry,operationKey,changedAt=new Date().toISOString()}={}){
    validateThreadSnapshot(thread);
    const key=normalizeOperationKey(operationKey);
    const ancestry=normalizePhysicalAncestry(physicalAncestry);
    const calibrationDependencies=appearanceCalibrationDependencies(ancestry);
    const previousEvidence=this.latestEvidence(thread.threadId);
    const previousCalibrationDependencies=previousEvidence?.calibrationDependencies??null;
    const calibrationPlan=planAppearanceCalibrationMigration({
      storedDependencies:previousCalibrationDependencies,
      currentDependencies:calibrationDependencies,
    });
    const genome=resultGenome(thread.threadId,ancestry);
    expressInheritedAppearance({physicalGenome:genome,sex:thread.identity?.sex});

    const migrationEventId=eventId(thread.threadId,key);
    const existing=this.#database.prepare(
      "SELECT event_type,payload_json,payload_schema_version FROM thread_events WHERE event_id=?",
    ).get(migrationEventId);
    if(existing!==undefined){
      if(existing.event_type!=="THREAD_PHYSICAL_GENOME_MIGRATED"){
        throw new Error(`physical genome operationKey ${key} resolved to an incompatible World event`);
      }
      const payload=JSON.parse(existing.payload_json);
      if(
        payload?.operationKey!==key
        || canonicalJson(payload?.physicalAncestry??null)!==canonicalJson(ancestry)
        || canonicalJson(payload?.calibrationDependencies??null)!==canonicalJson(calibrationDependencies)
        || canonicalJson(payload?.physicalGenome??null)!==canonicalJson(genome)
      ){
        throw new TypeError(`physical genome operationKey ${key} was already used with different migration input`);
      }
      const currentRow=this.#database.prepare("SELECT state_json FROM threads WHERE thread_id=?").get(thread.threadId);
      if(currentRow===undefined)throw new Error(`Thread ${thread.threadId} was not found`);
      return Object.freeze({
        migrated:false,
        reused:true,
        eventId:migrationEventId,
        physicalAncestry:ancestry,
        calibrationDependencies,
        previousCalibrationDependencies,
        calibrationPlan,
        physicalGenome:genome,
        thread:JSON.parse(currentRow.state_json),
      });
    }

    const previousPhysicalGenomeVersion=thread.genome.physical?.version??null;
    if(previousPhysicalGenomeVersion===PHYSICAL_GENOME_VERSION&&!calibrationPlan.migrationRequired){
      throw new TypeError("physical genome already uses the current appearance model and calibration");
    }

    const next=structuredClone(thread);
    next.version+=1;
    next.genome={...next.genome,physical:structuredClone(genome)};
    next.provenance={...next.provenance,lastEventId:migrationEventId};
    validateThreadSnapshot(next);

    const stateJson=canonicalJson(next);
    const stateHash=threadStateHash(next);
    const payload={
      operationKey:key,
      physicalAncestry:ancestry,
      calibrationDependencies,
      previousCalibrationDependencies,
      physicalGenome:genome,
      previousPhysicalGenomeVersion,
    };
    const actor={entityId:"fibre.admin.operator",kind:"operator",displayName:"Fibre Admin"};
    const provenance={
      source:"operator_confirmed_physical_ancestry",
      migrationId:"physical_embodiment_v2",
      notThreadLifeEvent:true,
    };

    this.#database.transaction(()=>{
      const currentRow=this.#database.prepare(
        "SELECT version,last_event_id FROM threads WHERE thread_id=?",
      ).get(thread.threadId);
      if(currentRow===undefined)throw new Error(`Thread ${thread.threadId} was not found`);
      if(Number(currentRow.version)!==thread.version||currentRow.last_event_id!==thread.provenance.lastEventId){
        throw new Error(`Thread ${thread.threadId} changed before physical genome migration`);
      }
      const sequence=Number(this.#database.prepare(
        "SELECT COALESCE(MAX(sequence),0) AS n FROM thread_events WHERE thread_id=?",
      ).get(thread.threadId).n)+1;
      this.#database.prepare(`
        INSERT INTO thread_events (
          event_id,thread_id,sequence,expected_version,resulting_version,event_type,
          command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
          authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
        ) VALUES (?,?,?,?,?,'THREAD_PHYSICAL_GENOME_MIGRATED',NULL,NULL,?,?,?,?,NULL,?,?,3,?)
      `).run(
        migrationEventId,
        thread.threadId,
        sequence,
        thread.version,
        next.version,
        canonicalJson(payload),
        canonicalJson(actor),
        changedAt,
        stateHash,
        thread.provenance.lastEventId,
        migrationEventId,
        canonicalJson(provenance),
      );
      const updated=this.#database.prepare(`
        UPDATE threads
        SET version=?,state_json=?,state_hash=?,last_event_id=?,updated_at=?
        WHERE thread_id=? AND version=?
      `).run(next.version,stateJson,stateHash,migrationEventId,changedAt,thread.threadId,thread.version);
      if(Number(updated.changes)!==1)throw new Error(`Thread ${thread.threadId} changed during physical genome migration`);
    });

    return Object.freeze({
      migrated:true,
      reused:false,
      eventId:migrationEventId,
      physicalAncestry:ancestry,
      calibrationDependencies,
      previousCalibrationDependencies,
      calibrationPlan,
      physicalGenome:genome,
      thread:next,
    });
  }
}
