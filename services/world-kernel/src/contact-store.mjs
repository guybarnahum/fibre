import {
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  migrateDatabase,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";
import { createContactTables } from "./contact-schema.mjs";

function digest(value){
  return `sha256:${sha256(canonicalJson(value))}`;
}

function capabilityIdFor({partyId,registeredAt}){
  return `pcap_${sha256(canonicalJson({partyId,registeredAt}))}`;
}

function attemptIdFor({threadId,consolidationId}){
  return `cat_${sha256(canonicalJson({threadId,consolidationId}))}`;
}

function messageIdFor({contactAttemptId,recipientPartyId,messageText}){
  return `cmsg_${sha256(canonicalJson({contactAttemptId,recipientPartyId,messageText}))}`;
}

export class ContactStore {
  #database;

  constructor(storage){
    this.#database=openWorldStateDatabase(storage,{storeName:"ContactStore"});
    try{
      migrateDatabase(this.#database);
      createContactTables(this.#database);
    }catch(error){
      this.#database.close();
      throw error;
    }
  }

  close(){ this.#database.close(); }

  registerPersonCapability({partyId,displayName,registeredAt}={}){
    assertId("person contact partyId",partyId);
    if(partyId.startsWith("thr_")){
      throw new TypeError("person contact capability cannot target a Thread id");
    }
    assertNonEmpty("person contact displayName",displayName);
    assertIsoTimestamp("person contact registeredAt",registeredAt);
    const capabilityId=capabilityIdFor({partyId,registeredAt});
    const record={capabilityId,partyId,displayName:displayName.trim(),registeredAt};
    const recordDigest=digest(record);
    try{
      const prior=this.#database.prepare(`
        SELECT party_id,display_name,registered_at,record_digest
        FROM person_contact_capabilities WHERE capability_id=?
      `).get(capabilityId);
      if(prior!==undefined){
        if(prior.party_id!==partyId||prior.display_name!==record.displayName
          ||prior.registered_at!==registeredAt||prior.record_digest!==recordDigest){
          throw new TypeError(`person contact capability ${capabilityId} conflicts`);
        }
        return Object.freeze(record);
      }
      this.#database.prepare(`
        INSERT INTO person_contact_capabilities(
          capability_id,party_id,display_name,registered_at,record_digest
        ) VALUES (?,?,?,?,?)
      `).run(capabilityId,partyId,record.displayName,registeredAt,recordDigest);
      return Object.freeze(record);
    }catch(error){ throw translateStorageError(error); }
  }

  revokePersonCapability({partyId,revokedAt,reason}={}){
    assertId("person contact partyId",partyId);
    assertIsoTimestamp("person contact revokedAt",revokedAt);
    assertNonEmpty("person contact revocation reason",reason);
    const capability=this.getPersonCapability(partyId,{required:true});
    const record={
      capabilityId:capability.capabilityId,
      revokedAt,
      reason:reason.trim(),
    };
    const recordDigest=digest(record);
    try{
      const prior=this.#database.prepare(`
        SELECT revoked_at,reason,record_digest
        FROM person_contact_capability_revocations WHERE capability_id=?
      `).get(capability.capabilityId);
      if(prior!==undefined){
        if(prior.revoked_at!==revokedAt||prior.reason!==record.reason||prior.record_digest!==recordDigest){
          throw new TypeError(`person contact capability ${capability.capabilityId} revocation conflicts`);
        }
        return Object.freeze(record);
      }
      this.#database.prepare(`
        INSERT INTO person_contact_capability_revocations(
          capability_id,revoked_at,reason,record_digest
        ) VALUES (?,?,?,?)
      `).run(capability.capabilityId,revokedAt,record.reason,recordDigest);
      return Object.freeze(record);
    }catch(error){ throw translateStorageError(error); }
  }

  getPersonCapability(partyId,{required=false}={}){
    assertId("person contact partyId",partyId);
    const row=this.#database.prepare(`
      SELECT c.capability_id,c.party_id,c.display_name,c.registered_at,
        r.revoked_at,r.reason
      FROM person_contact_capabilities c
      LEFT JOIN person_contact_capability_revocations r
        ON r.capability_id=c.capability_id
      WHERE c.party_id=?
      ORDER BY c.registered_at DESC,c.capability_id DESC
      LIMIT 1
    `).get(partyId);
    if(row===undefined){
      if(required)throw new TypeError(`person contact capability for ${partyId} was not found`);
      return null;
    }
    return Object.freeze({
      capabilityId:row.capability_id,
      partyId:row.party_id,
      displayName:row.display_name,
      registeredAt:row.registered_at,
      active:row.revoked_at===null,
      revokedAt:row.revoked_at,
      revocationReason:row.reason,
    });
  }

  claimAttempt({threadId,consolidationId,startedAt}={}){
    assertId("contact attempt threadId",threadId);
    assertId("contact attempt consolidationId",consolidationId);
    assertIsoTimestamp("contact attempt startedAt",startedAt);
    const contactAttemptId=attemptIdFor({threadId,consolidationId});
    const record={contactAttemptId,threadId,consolidationId,startedAt};
    const recordDigest=digest(record);
    try{
      const prior=this.#database.prepare(`
        SELECT contact_attempt_id,thread_id,consolidation_id,started_at,record_digest
        FROM thread_contact_attempts WHERE consolidation_id=?
      `).get(consolidationId);
      if(prior!==undefined){
        if(prior.contact_attempt_id!==contactAttemptId||prior.thread_id!==threadId
          ||prior.started_at!==startedAt||prior.record_digest!==recordDigest){
          throw new TypeError(`contact attempt for ${consolidationId} conflicts`);
        }
        return Object.freeze(record);
      }
      this.#database.prepare(`
        INSERT INTO thread_contact_attempts(
          contact_attempt_id,thread_id,consolidation_id,started_at,record_digest
        ) VALUES (?,?,?,?,?)
      `).run(contactAttemptId,threadId,consolidationId,startedAt,recordDigest);
      return Object.freeze(record);
    }catch(error){ throw translateStorageError(error); }
  }

  getAttemptByConsolidation(consolidationId){
    assertId("contact consolidationId",consolidationId);
    const row=this.#database.prepare(`
      SELECT contact_attempt_id,thread_id,consolidation_id,started_at
      FROM thread_contact_attempts WHERE consolidation_id=?
    `).get(consolidationId);
    return row===undefined?null:Object.freeze({
      contactAttemptId:row.contact_attempt_id,
      threadId:row.thread_id,
      consolidationId:row.consolidation_id,
      startedAt:row.started_at,
    });
  }

  listUnconsideredAfterthoughtSources({limit=4}={}){
    if(!Number.isSafeInteger(limit)||limit<1||limit>32){
      throw new TypeError("contact source limit must be 1-32");
    }
    return this.#database.prepare(`
      SELECT c.consolidation_id,c.thread_id,complete.recorded_at AS completed_at
      FROM thread_experience_consolidations c
      JOIN thread_experience_consolidation_stages decision
        ON decision.consolidation_id=c.consolidation_id AND decision.stage='decision'
      JOIN thread_experience_consolidation_stages complete
        ON complete.consolidation_id=c.consolidation_id AND complete.stage='complete'
      LEFT JOIN thread_contact_attempts attempt
        ON attempt.consolidation_id=c.consolidation_id
      WHERE attempt.contact_attempt_id IS NULL
        AND json_array_length(decision.payload_json,'$.afterthoughts') > 0
      ORDER BY complete.recorded_at,c.consolidation_id
      LIMIT ?
    `).all(limit).map((row)=>Object.freeze({
      consolidationId:row.consolidation_id,
      threadId:row.thread_id,
      completedAt:row.completed_at,
    }));
  }

  listPendingAttempts({limit=4}={}){
    if(!Number.isSafeInteger(limit)||limit<1||limit>32){
      throw new TypeError("contact pending limit must be 1-32");
    }
    return this.#database.prepare(`
      SELECT a.contact_attempt_id,a.thread_id,a.consolidation_id,a.started_at
      FROM thread_contact_attempts a
      WHERE NOT EXISTS (
        SELECT 1 FROM thread_contact_attempt_stages s
        WHERE s.contact_attempt_id=a.contact_attempt_id AND s.stage='complete'
      )
      ORDER BY a.started_at,a.contact_attempt_id
      LIMIT ?
    `).all(limit).map((row)=>Object.freeze({
      contactAttemptId:row.contact_attempt_id,
      threadId:row.thread_id,
      consolidationId:row.consolidation_id,
      startedAt:row.started_at,
    }));
  }

  recordStage({contactAttemptId,stage,recordedAt,payload}={}){
    assertId("contact attempt id",contactAttemptId);
    if(!["decision","expression","complete"].includes(stage)){
      throw new TypeError("contact attempt stage is invalid");
    }
    assertIsoTimestamp("contact attempt stage recordedAt",recordedAt);
    if(payload===null||typeof payload!=="object"||Array.isArray(payload)){
      throw new TypeError("contact attempt stage payload must be an object");
    }
    const attempt=this.#database.prepare(`
      SELECT started_at FROM thread_contact_attempts WHERE contact_attempt_id=?
    `).get(contactAttemptId);
    if(attempt===undefined)throw new TypeError(`contact attempt ${contactAttemptId} was not found`);
    if(Date.parse(recordedAt)<Date.parse(attempt.started_at)){
      throw new TypeError("contact attempt stage cannot predate its attempt");
    }
    if(stage==="expression"&&this.getStage(contactAttemptId,"decision")===null){
      throw new TypeError("contact expression cannot precede contact decision");
    }
    if(stage==="complete"
      &&this.getStage(contactAttemptId,"decision")===null
      &&payload.outcome!=="no_route"){
      throw new TypeError("contact completion cannot precede contact decision");
    }
    const record={contactAttemptId,stage,recordedAt,payload:structuredClone(payload)};
    const recordDigest=digest(record);
    try{
      const prior=this.#database.prepare(`
        SELECT recorded_at,payload_json,record_digest
        FROM thread_contact_attempt_stages
        WHERE contact_attempt_id=? AND stage=?
      `).get(contactAttemptId,stage);
      if(prior!==undefined){
        if(prior.recorded_at!==recordedAt
          ||prior.payload_json!==canonicalJson(record.payload)
          ||prior.record_digest!==recordDigest){
          throw new TypeError(`contact attempt ${contactAttemptId} stage ${stage} conflicts`);
        }
        return Object.freeze(record);
      }
      this.#database.prepare(`
        INSERT INTO thread_contact_attempt_stages(
          contact_attempt_id,stage,recorded_at,payload_json,record_digest
        ) VALUES (?,?,?,?,?)
      `).run(contactAttemptId,stage,recordedAt,canonicalJson(record.payload),recordDigest);
      return Object.freeze(record);
    }catch(error){ throw translateStorageError(error); }
  }

  getStage(contactAttemptId,stage){
    assertId("contact attempt id",contactAttemptId);
    if(!["decision","expression","complete"].includes(stage)){
      throw new TypeError("contact attempt stage is invalid");
    }
    const row=this.#database.prepare(`
      SELECT recorded_at,payload_json
      FROM thread_contact_attempt_stages
      WHERE contact_attempt_id=? AND stage=?
    `).get(contactAttemptId,stage);
    return row===undefined?null:Object.freeze({
      contactAttemptId,
      stage,
      recordedAt:row.recorded_at,
      payload:JSON.parse(row.payload_json),
    });
  }

  recordMessage({
    contactAttemptId,
    senderThreadId,
    recipientPartyId,
    recipientKind,
    sentAt,
    messageText,
    sourceConsolidationId,
  }={}){
    assertId("contact message attempt",contactAttemptId);
    assertId("contact message senderThreadId",senderThreadId);
    assertId("contact message recipientPartyId",recipientPartyId);
    if(!["thread","person"].includes(recipientKind)){
      throw new TypeError("contact message recipientKind is invalid");
    }
    if(recipientKind==="thread"&&!recipientPartyId.startsWith("thr_")){
      throw new TypeError("Thread contact recipient must use a thr_ id");
    }
    if(recipientKind==="person"&&recipientPartyId.startsWith("thr_")){
      throw new TypeError("Person contact recipient cannot use a thr_ id");
    }
    assertIsoTimestamp("contact message sentAt",sentAt);
    assertNonEmpty("contact message text",messageText);
    assertId("contact message sourceConsolidationId",sourceConsolidationId);
    const messageId=messageIdFor({
      contactAttemptId,
      recipientPartyId,
      messageText:messageText.trim(),
    });
    const record={
      messageId,
      contactAttemptId,
      senderThreadId,
      recipientPartyId,
      recipientKind,
      sentAt,
      messageText:messageText.trim(),
      sourceConsolidationId,
    };
    const recordDigest=digest(record);
    try{
      const prior=this.#database.prepare(`
        SELECT message_id,sender_thread_id,recipient_party_id,recipient_kind,
          sent_at,message_text,source_consolidation_id,record_digest
        FROM thread_contact_messages WHERE contact_attempt_id=?
      `).get(contactAttemptId);
      if(prior!==undefined){
        if(prior.message_id!==messageId||prior.sender_thread_id!==senderThreadId
          ||prior.recipient_party_id!==recipientPartyId||prior.recipient_kind!==recipientKind
          ||prior.sent_at!==sentAt||prior.message_text!==record.messageText
          ||prior.source_consolidation_id!==sourceConsolidationId||prior.record_digest!==recordDigest){
          throw new TypeError(`contact message for ${contactAttemptId} conflicts`);
        }
        return Object.freeze(record);
      }
      this.#database.prepare(`
        INSERT INTO thread_contact_messages(
          message_id,contact_attempt_id,sender_thread_id,recipient_party_id,
          recipient_kind,sent_at,message_text,source_consolidation_id,record_digest
        ) VALUES (?,?,?,?,?,?,?,?,?)
      `).run(
        messageId,contactAttemptId,senderThreadId,recipientPartyId,
        recipientKind,sentAt,record.messageText,sourceConsolidationId,recordDigest,
      );
      return Object.freeze(record);
    }catch(error){ throw translateStorageError(error); }
  }

  listInbox(partyId,{limit=100}={}){
    assertId("contact inbox partyId",partyId);
    if(!Number.isSafeInteger(limit)||limit<1||limit>500){
      throw new TypeError("contact inbox limit must be 1-500");
    }
    return this.#database.prepare(`
      SELECT message_id,contact_attempt_id,sender_thread_id,recipient_party_id,
        recipient_kind,sent_at,message_text,source_consolidation_id
      FROM thread_contact_messages
      WHERE recipient_party_id=?
      ORDER BY sent_at DESC,message_id DESC
      LIMIT ?
    `).all(partyId,limit).map((row)=>Object.freeze({
      messageId:row.message_id,
      contactAttemptId:row.contact_attempt_id,
      senderThreadId:row.sender_thread_id,
      recipientPartyId:row.recipient_party_id,
      recipientKind:row.recipient_kind,
      sentAt:row.sent_at,
      messageText:row.message_text,
      sourceConsolidationId:row.source_consolidation_id,
    }));
  }

  inspectThreadContact(threadId,{limit=100}={}){
    assertId("contact inspection threadId",threadId);
    if(!Number.isSafeInteger(limit)||limit<1||limit>500){
      throw new TypeError("contact inspection limit must be 1-500");
    }
    const attempts=this.#database.prepare(`
      SELECT contact_attempt_id,thread_id,consolidation_id,started_at
      FROM thread_contact_attempts
      WHERE thread_id=?
      ORDER BY started_at DESC,contact_attempt_id DESC
      LIMIT ?
    `).all(threadId,limit).map((row)=>({
      contactAttemptId:row.contact_attempt_id,
      threadId:row.thread_id,
      consolidationId:row.consolidation_id,
      startedAt:row.started_at,
      decision:this.getStage(row.contact_attempt_id,"decision"),
      expression:this.getStage(row.contact_attempt_id,"expression"),
      complete:this.getStage(row.contact_attempt_id,"complete"),
    }));
    return Object.freeze({
      attempts:Object.freeze(attempts),
      sent:Object.freeze(this.listSent(threadId,{limit})),
    });
  }

  listSent(threadId,{limit=100}={}){
    assertId("contact sent threadId",threadId);
    if(!Number.isSafeInteger(limit)||limit<1||limit>500){
      throw new TypeError("contact sent limit must be 1-500");
    }
    return this.#database.prepare(`
      SELECT message_id,contact_attempt_id,sender_thread_id,recipient_party_id,
        recipient_kind,sent_at,message_text,source_consolidation_id
      FROM thread_contact_messages
      WHERE sender_thread_id=?
      ORDER BY sent_at DESC,message_id DESC
      LIMIT ?
    `).all(threadId,limit).map((row)=>Object.freeze({
      messageId:row.message_id,
      contactAttemptId:row.contact_attempt_id,
      senderThreadId:row.sender_thread_id,
      recipientPartyId:row.recipient_party_id,
      recipientKind:row.recipient_kind,
      sentAt:row.sent_at,
      messageText:row.message_text,
      sourceConsolidationId:row.source_consolidation_id,
    }));
  }

  hasPendingAttempts(){
    return this.#database.prepare(`
      SELECT 1 AS pending FROM thread_contact_attempts a
      WHERE NOT EXISTS (
        SELECT 1 FROM thread_contact_attempt_stages s
        WHERE s.contact_attempt_id=a.contact_attempt_id AND s.stage='complete'
      ) LIMIT 1
    `).get()!==undefined;
  }
}

export function openContactStore(storage){
  return new ContactStore(storage);
}
