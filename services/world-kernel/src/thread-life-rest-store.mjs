import {
  assertId,
  assertIsoTimestamp,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { migrateDatabase } from "./persistence-sqlite.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

export const THREAD_RESTING_OUTCOME="thread_resting";

function short(name,value,maximum){
  if(typeof value!=="string"||!value.trim()||value.trim().length>maximum){
    throw new TypeError(`${name} must be 1-${maximum} characters`);
  }
  return value.trim();
}

// Rest and wake are World lifecycle facts about a Thread's autonomous life,
// never deletion. Runtime status, records and history stay untouched.
export function openThreadLifeRestStore(storage,{readOnly=false}={}){
  const database=openWorldStateDatabase(storage,{readOnly,storeName:"ThreadLifeRestStore"});
  try{
    if(!readOnly&&!storage.schemaReady)migrateDatabase(database);
  }catch(error){database.close();throw error;}

  const resting=(threadId)=>database.prepare(
    "SELECT rest_event_id FROM thread_life_rest WHERE thread_id=?",
  ).get(threadId)!==undefined;

  function record({threadId,kind,reason,actor,at}){
    assertId("life rest Thread",threadId);
    assertIsoTimestamp("life rest time",at);
    const fact={threadId,kind,occurredAt:at,
      reason:short("life rest reason",reason,200),actor:short("life rest actor",actor,120)};
    const thread=database.prepare("SELECT status FROM threads WHERE thread_id=?").get(threadId);
    if(thread===undefined)throw new TypeError(`Thread ${threadId} was not found`);
    if(thread.status==="retired")throw new TypeError(`Thread ${threadId} is retired`);
    const eventId=`life_${kind}_${sha256(canonicalJson(fact))}`;
    database.prepare(`
      INSERT INTO thread_life_rest_events(event_id,thread_id,kind,occurred_at,reason,actor)
      VALUES(?,?,?,?,?,?)
    `).run(eventId,threadId,kind,at,fact.reason,fact.actor);
    return eventId;
  }

  return Object.freeze({
    rest({threadId,reason,actor,at}){
      return database.transaction(()=>{
        if(resting(threadId))return Object.freeze({threadId,changed:false});
        const eventId=record({threadId,kind:"rest",reason,actor,at});
        // Park the next lived boundary so due-work queries never scan past
        // resting lives; waking makes it due at once.
        database.prepare(`
          UPDATE lived_now_next_boundaries SET due_at=NULL
          WHERE thread_id=? AND due_at IS NOT NULL
        `).run(threadId);
        // Pending one-shot social chances would fire stale on wake. Settle
        // them, as chooser or counterpart, like a superseding conversation.
        const own=database.prepare(`
          UPDATE world_social_opportunities
          SET started_at=?,completed_at=?,outcome='${THREAD_RESTING_OUTCOME}'
          WHERE started_at IS NULL AND thread_id=?
        `).run(at,at,threadId).changes;
        const observed=database.prepare(`
          UPDATE world_observed_social_opportunities
          SET started_at=?,completed_at=?,outcome='${THREAD_RESTING_OUTCOME}',
            decision_json=json_object('counterpartyThreadId',counterparty_thread_id,
              'restEventRef',?)
          WHERE started_at IS NULL AND (thread_id=? OR counterparty_thread_id=?)
        `).run(at,at,eventId,threadId,threadId).changes;
        return Object.freeze({threadId,changed:true,eventId,
          settledSocialOpportunities:own+observed});
      });
    },

    wake({threadId,reason,actor,at}){
      return database.transaction(()=>{
        if(!resting(threadId))return Object.freeze({threadId,changed:false});
        const eventId=record({threadId,kind:"wake",reason,actor,at});
        database.prepare(`
          UPDATE lived_now_next_boundaries SET due_at=?,blocked_reason=NULL
          WHERE thread_id=? AND due_at IS NULL
        `).run(at,threadId);
        return Object.freeze({threadId,changed:true,eventId});
      });
    },

    // Operator view of every non-retired Thread's autonomous-life state.
    listLives(){
      return database.prepare(`
        SELECT t.thread_id,r.rested_at,e.reason,e.actor
        FROM threads t
        LEFT JOIN thread_life_rest r ON r.thread_id=t.thread_id
        LEFT JOIN thread_life_rest_events e ON e.event_id=r.rest_event_id
        WHERE t.status<>'retired'
        ORDER BY t.thread_id
      `).all().map(row=>Object.freeze({
        threadId:row.thread_id,resting:row.rested_at!==null,
        restedAt:row.rested_at,reason:row.reason,actor:row.actor,
      }));
    },

    history(threadId){
      assertId("life rest Thread",threadId);
      return database.prepare(`
        SELECT event_id,kind,occurred_at,reason,actor FROM thread_life_rest_events
        WHERE thread_id=? ORDER BY occurred_at,event_id
      `).all(threadId).map(row=>Object.freeze({
        eventId:row.event_id,kind:row.kind,occurredAt:row.occurred_at,
        reason:row.reason,actor:row.actor,
      }));
    },

    close(){database.close();},
  });
}
