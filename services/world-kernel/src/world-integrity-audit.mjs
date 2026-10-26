import {openWorldStateDatabase} from "./world-state-storage.mjs";
import {openWorldStore} from "./persistence.mjs";
import {openSituatedLifeInspectionStore} from "./situated-life-store.mjs";
import {normalizeLivedPlan,normalizeCurrentSituation} from "./lived-now.mjs";
import {canonicalJson,sha256} from "./persistence-common.mjs";

const FAMILIES=Object.freeze({
  threads:{table:"threads",key:"thread_id"},
  lived_plans:{table:"lived_now_plans",key:"plan_id"},
  situations:{table:"current_situation_records",key:"situation_id"},
  world_places:{table:"world_places",key:"place_ref"},
  life_relations:{table:"life_relation_records",key:"relation_id"},
  place_episodes:{table:"place_episode_records",key:"episode_id"},
});
export const WORLD_INTEGRITY_AUDIT_FAMILIES=Object.freeze(Object.keys(FAMILIES));

function verifyRecord(row,family){
  const value=JSON.parse(row.record_json);
  const normalized=family==="lived_plans"?normalizeLivedPlan(value)
    :family==="situations"?normalizeCurrentSituation(value):value;
  if(canonicalJson(normalized)!==row.record_json)
    throw new Error("record is not canonical JSON");
  if("sha256:"+sha256(canonicalJson(normalized))!==row.record_digest)
    throw new Error("record digest mismatch");
}

// Bounded operator-only work. No timer, reconcile hook, or automatic scan.
export function auditWorldIntegrityBatch(storage,{
  family="threads",cursor=null,limit=100,
}={}){
  const spec=FAMILIES[family];
  if(!spec)throw new TypeError("unknown World integrity family");
  if(cursor!==null&&(typeof cursor!=="string"||cursor.length>256))
    throw new TypeError("World integrity cursor must be a bounded string or null");
  if(!Number.isSafeInteger(limit)||limit<1||limit>500)
    throw new TypeError("World integrity audit limit must be 1-500");
  const db=openWorldStateDatabase(storage,{readOnly:true,storeName:"WorldIntegrityAudit"});
  const world=family==="threads"?openWorldStore(storage):null;
  const situated=["life_relations","place_episodes"].includes(family)
    ?openSituatedLifeInspectionStore(storage):null;
  try{
    const columns=family==="threads"?spec.key
      :["life_relations","place_episodes"].includes(family)
        ?`DISTINCT ${spec.key}`
        :`${spec.key},record_json,record_digest`;
    const rows=db.prepare(`
      SELECT ${columns} FROM ${spec.table}
      WHERE ${spec.key}>? ORDER BY ${spec.key} LIMIT ?
    `).all(cursor??"",limit);
    const findings=[];
    for(const row of rows){
      const ref=row[spec.key];
      try{
        if(family==="threads")world.verifyThreadIntegrity(ref);
        else if(family==="life_relations"||family==="place_episodes"){
          const owner=db.prepare(`SELECT thread_id FROM ${spec.table}
            WHERE ${spec.key}=? LIMIT 1`).get(ref)?.thread_id;
          if(!owner)throw new Error("lineage has no owning Thread");
          if(family==="life_relations")situated.lifeRelationHistory(owner,ref);
          else situated.placeEpisodeHistory(owner,ref);
        }else verifyRecord(row,family);
      }catch(error){
        findings.push({ref,problem:String(error?.message??error).slice(0,240)});
      }
    }
    return Object.freeze({
      family,checked:rows.length,findings,
      nextCursor:rows.length===limit?rows.at(-1)[spec.key]:null,
    });
  }finally{situated?.close();world?.close();db.close();}
}
