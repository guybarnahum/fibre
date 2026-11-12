import {
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { migrateDatabase, translateStorageError } from "./persistence-sqlite.mjs";
import { createLivedExperienceTables } from "./lived-experience-schema.mjs";
import { openWorldStateDatabase,worldTableExists } from "./world-state-storage.mjs";
import { spokenNameDisclosure } from "./spoken-name.mjs";
import {
  recordAppointmentOutcomeActs,recordAppointmentRelationalActs,
  recordInvitationRelationalActs,recordStoryRelationalActs,
} from "./relationship-doors.mjs";

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function encounterEventId(record) {
  return `enc_${sha256(canonicalJson({
    threadId:record.threadId,
    situationId:record.situationId,
    occurredAt:record.occurredAt,
    visitorUtterance:record.visitorUtterance,
    responseText:record.responseText,
  })).slice(0, 48)}`;
}

function encounterStoryId(record) {
  return `story_${sha256(canonicalJson({
    occurredAt:record.occurredAt,
    threadPresence:record.threadPresence,
    story:record.story,
    sourceReferences:record.visualization?.visualizationSourceReferences ?? [],
  })).slice(0, 48)}`;
}

function socialInteractionId(record) {
  return `social_${sha256(canonicalJson({
    occurredAt:record.occurredAt,
    initiatorThreadId:record.initiatorThreadId,
    recipientThreadId:record.recipientThreadId,
    initiatorSituationId:record.initiatorSituationId,
    recipientSituationId:record.recipientSituationId,
    requestText:record.requestText,
    responseDecision:record.responseDecision,
    responseExpression:record.responseExpression ?? null,
    suggestedAt:record.suggestedAt ?? null,
  })).slice(0, 48)}`;
}

function threadExperienceId({ threadId, encounterRef }) {
  return `exp_${sha256(canonicalJson({ threadId, encounterRef })).slice(0, 48)}`;
}

function experienceJournalEntryId({ threadId, aboutExperienceRef, writtenAt, entryText }) {
  return `journal_${sha256(canonicalJson({ threadId, aboutExperienceRef, writtenAt, entryText })).slice(0, 48)}`;
}

function journalEntryId({ threadId, aboutEventRef, writtenAt, entryText }) {
  return `journal_${sha256(canonicalJson({ threadId, aboutEventRef, writtenAt, entryText })).slice(0, 48)}`;
}

function experienceConsolidationId({ threadId, experienceRefs }) {
  return `consolidation_${sha256(canonicalJson({ threadId, experienceRefs })).slice(0, 48)}`;
}

function consolidationJournalEntryId({ consolidationId, threadId, writtenAt, entryText }) {
  return `journal_${sha256(canonicalJson({ consolidationId, threadId, writtenAt, entryText })).slice(0, 48)}`;
}

function normalizeVisualization(candidate, participantIds) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError("encounter visualization is required");
  }
  assertNonEmpty("encounter visualization.visualizationPrompt", candidate.visualizationPrompt);
  assertNonEmpty("encounter visualization.visualizationPromptDigest", candidate.visualizationPromptDigest);
  if (!candidate.visualizationPromptDigest.startsWith("sha256:")) {
    throw new TypeError("encounter visualization prompt digest is invalid");
  }
  if (!Array.isArray(candidate.visualizationSourceReferences)) {
    throw new TypeError("encounter visualization source references must be an array");
  }
  if (!Array.isArray(candidate.depictedThreadRefs)) {
    throw new TypeError("encounter visualization depicted Thread refs must be an array");
  }
  for (const ref of candidate.visualizationSourceReferences) {
    assertId("encounter visualization sourceReference", ref);
  }
  for (const threadId of candidate.depictedThreadRefs) {
    assertId("encounter visualization depictedThreadRef", threadId);
    if (!participantIds.has(threadId)) {
      throw new TypeError("depicted Thread must be present in Encounter Story");
    }
  }
  if (`sha256:${sha256(candidate.visualizationPrompt)}` !== candidate.visualizationPromptDigest) {
    throw new TypeError("encounter visualization prompt digest does not match prompt");
  }
  return {
    visualizationPrompt:candidate.visualizationPrompt,
    visualizationPromptDigest:candidate.visualizationPromptDigest,
    visualizationSourceReferences:[...new Set(candidate.visualizationSourceReferences)],
    depictedThreadRefs:[...new Set(candidate.depictedThreadRefs)],
  };
}

function normalizeStory(candidate, participantIds) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError("encounter story must be an object");
  }
  if (!Array.isArray(candidate.beats) || candidate.beats.length < 1) {
    throw new TypeError("encounter story requires at least one beat");
  }
  const continuationOfEncounterRef = candidate.continuationOfEncounterRef ?? null;
  if (continuationOfEncounterRef !== null) {
    assertId("encounter story.continuationOfEncounterRef", continuationOfEncounterRef);
  }
  return {
    storyVersion:candidate.storyVersion ?? "encounter-story-v0.1",
    ...(continuationOfEncounterRef === null ? {} : { continuationOfEncounterRef }),
    beats:candidate.beats.map((beat) => {
      if (beat === null || typeof beat !== "object" || Array.isArray(beat)) {
        throw new TypeError("encounter story beat must be an object");
      }
      if (!["utterance","action","occurrence"].includes(beat.kind)) {
        throw new TypeError("encounter story beat kind is invalid");
      }
      if (beat.actorThreadId !== null && beat.actorThreadId !== undefined) {
        assertId("encounter story beat.actorThreadId", beat.actorThreadId);
        if (!participantIds.has(beat.actorThreadId)) {
          throw new TypeError("encounter story beat actor must be present");
        }
      }
      assertNonEmpty("encounter story beat.text", beat.text);
      const spokenText=beat.spokenText??null;
      if(spokenText!==null){
        if(beat.kind!=="utterance")
          throw new TypeError("only an utterance can contain spoken words");
        assertNonEmpty("encounter story beat.spokenText",spokenText);
      }
      const disclosesSpeakerName=beat.disclosesSpeakerName??false;
      if(typeof disclosesSpeakerName!=="boolean"
        ||(disclosesSpeakerName&&beat.kind!=="utterance")){
        throw new TypeError("self-introduction requires an actual spoken beat");
      }
      const completion=beat.completion??null;
      if(completion!==null){
        if(beat.kind!=="utterance"||completion!=="interrupted"){
          throw new TypeError("encounter story beat completion is invalid");
        }
      }
      // Proposing to meet, or agreeing to the other's proposal, is speech.
      const meeting=["proposesMeeting","agreesToMeet"].filter(key=>beat[key]===true);
      if(meeting.length>1||(meeting.length===1&&beat.kind!=="utterance"))
        throw new TypeError("proposing or agreeing to meet requires one spoken beat");
      // Taking up a thing at a place names the World holding it was.
      const holdingRef=beat.holdingRef??null;
      if(holdingRef!==null){
        if(beat.kind!=="action")throw new TypeError("only an action can take up a holding");
        assertId("encounter story beat.holdingRef",holdingRef);
      }
      // A pause: a non-verbal moment in talk (a smile, a nod, a doubt).
      const pause=beat.pause??false;
      if(typeof pause!=="boolean"||(pause&&beat.kind!=="action"))
        throw new TypeError("only an action can be a pause in talk");
      return {
        actorThreadId:beat.actorThreadId ?? null,
        kind:beat.kind,
        text:beat.text,
        ...(spokenText===null?{}:{spokenText}),
        ...(disclosesSpeakerName?{disclosesSpeakerName:true}:{}),
        ...(disclosesSpeakerName&&typeof beat.disclosedName==="string"
          ?{disclosedName:beat.disclosedName}:{}),
        ...(completion===null?{}:{completion}),
        ...(meeting.length===0?{}:{[meeting[0]]:true}),
        ...(holdingRef===null?{}:{holdingRef}),
        ...(pause?{pause:true}:{}),
      };
    }),
  };
}

// A fixed internal SQL table selection, never a value authored by cognition.
function environmentOpportunityTable(kind){
  if(kind==="arrival")return "world_environment_opportunities";
  if(kind==="stay")return "world_environment_stay_opportunities";
  if(kind==="scene")return "world_ambient_scene_frontier";
  throw new TypeError("World opportunity kind must be arrival or stay");
}

function readingFromRow(row){
  return Object.freeze({threadId:row.thread_id,workRef:row.work_ref,holdingRef:row.holding_ref,title:row.title,
    nextByte:row.next_byte,status:row.status,lastReadAt:row.last_read_at});
}

function glanceFromRow(row){
  return Object.freeze({glanceId:row.glance_id,threadId:row.thread_id,situationId:row.situation_id,
    occurredAt:row.occurred_at,items:Object.freeze(JSON.parse(row.items_json)),focus:row.focus,
    focusEncounterRef:row.focus_encounter_ref});
}

function appointmentFromRow(row){
  return Object.freeze({
    appointmentId:row.appointment_id,proposerThreadId:row.proposer_thread_id,
    partnerThreadId:row.partner_thread_id,placeRef:row.place_ref,venueRef:row.venue_ref,
    placeName:row.place_name,
    startsAt:row.starts_at,agreedAt:row.agreed_at,encounterRef:row.encounter_ref,
    outcome:row.outcome??null,absent:row.absent_json?Object.freeze(JSON.parse(row.absent_json)):null,
    settledAt:row.settled_at??null,
  });
}

// One act of regard as this Thread perceived it, with how many others saw it.
function regardFromRow(row){
  return Object.freeze({regardId:row.regard_id,personThreadId:row.person_thread_id,act:row.act,
    actorThreadId:row.actor_thread_id,account:row.account,
    evidenceRefs:Object.freeze(JSON.parse(row.evidence_refs_json)),sourceRef:row.source_ref,asOf:row.as_of,
    witnesses:Math.max(0,Number(row.present)-2)});
}

export class LivedExperienceStore {
  #database;

  constructor(storage,{readOnly=false}={}) {
    this.#database = openWorldStateDatabase(storage, {
      readOnly,storeName:"LivedExperienceStore",
    });
    try {
      if(!readOnly && !storage.schemaReady){
        migrateDatabase(this.#database);
        this.#database.transaction(()=>createLivedExperienceTables(this.#database));
      }
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() { this.#database.close(); }

  // Independent stores may be opened before their LivedNow frontier exists
  // (Genesis and isolated replay fixtures). No phantom life debt is inferred.
  #hasLivedBoundaryFrontier(){
    return worldTableExists(this.#database,"lived_now_next_boundaries");
  }

  enqueueArrivalPerception({situationId,venueRef,dueAt,witnesses}){
    assertId("arrival situation",situationId);
    assertId("arrival venue",venueRef);
    assertIsoTimestamp("arrival occurrence time",dueAt);
    // The arriver always perceives its arrival (an empty library still has
    // books); at most two others already present may witness it.
    if(!Array.isArray(witnesses)||witnesses.length>2){
      throw new TypeError("arrival has at most two grounded observers");
    }
    const seen=new Set();
    for(const person of witnesses){
      assertId("arrival witness Thread",person.threadId);
      assertId("arrival witness situation",person.situationId);
      if(seen.has(person.threadId))throw new TypeError("arrival witnesses must be distinct");
      seen.add(person.threadId);
    }
    const inserted=this.#database.prepare(`
      INSERT OR IGNORE INTO world_arrival_perception_work(
        situation_id,venue_ref,due_at,witness_situations_json
      ) VALUES(?,?,?,?)
    `).run(situationId,venueRef,dueAt,canonicalJson(witnesses)).changes===1;
    return Object.freeze({situationId,dueAt,inserted});
  }

  nextArrivalPerceptionAt(){
    const debtFilter=this.#hasLivedBoundaryFrontier()?`
        AND NOT EXISTS (
          SELECT 1 FROM lived_now_next_boundaries b
          WHERE (b.thread_id=(SELECT s.thread_id FROM current_situation_records s
                               WHERE s.situation_id=w.situation_id)
            OR b.thread_id IN (
              SELECT json_extract(value,'$.threadId')
              FROM json_each(w.witness_situations_json)
            ))
            AND (b.failed_attempts>0 OR b.due_at<=w.due_at)
            AND NOT EXISTS (SELECT 1 FROM thread_life_rest life_rest WHERE life_rest.thread_id=b.thread_id)
        )`:"";
    return this.#database.prepare(`
      SELECT w.due_at FROM world_arrival_perception_work w
      WHERE w.completed_at IS NULL
        ${debtFilter}
      ORDER BY w.due_at LIMIT 1
    `).get()?.due_at??null;
  }

  listDueArrivalPerceptions({at}){
    assertIsoTimestamp("arrival perception now",at);
    const debtFilter=this.#hasLivedBoundaryFrontier()?`
        AND NOT EXISTS (
          SELECT 1 FROM lived_now_next_boundaries b
          WHERE (b.thread_id=(SELECT s.thread_id FROM current_situation_records s
                               WHERE s.situation_id=w.situation_id)
            OR b.thread_id IN (
              SELECT json_extract(value,'$.threadId')
              FROM json_each(w.witness_situations_json)
            ))
            AND (b.failed_attempts>0 OR b.due_at<=w.due_at)
            AND NOT EXISTS (SELECT 1 FROM thread_life_rest life_rest WHERE life_rest.thread_id=b.thread_id)
        )`:"";
    // Only affected witnesses wait; an unrelated later event can go first.
    const row=this.#database.prepare(`
      SELECT w.situation_id,w.venue_ref,w.due_at,w.witness_situations_json
      FROM world_arrival_perception_work w
      WHERE w.completed_at IS NULL AND w.due_at<=?
        ${debtFilter}
      ORDER BY w.due_at,w.situation_id LIMIT 1
    `).get(at);
    return row===undefined?[]:[Object.freeze({
      situationId:row.situation_id,venueRef:row.venue_ref,sourceKind:row.source_kind,dueAt:row.due_at,
      witnesses:Object.freeze(JSON.parse(row.witness_situations_json)),
    })];
  }

  arrivalPerceptionPending(situationId){
    assertId("arrival social prerequisite",situationId);
    return this.#database.prepare(`
      SELECT 1 FROM world_arrival_perception_work
      WHERE situation_id=? AND completed_at IS NULL
    `).get(situationId)!==undefined;
  }

  completeArrivalPerception({situationId,encounterRef=null,at}){
    assertId("arrival perception situation",situationId);
    if(encounterRef!==null)assertId("arrival perception story",encounterRef);
    assertIsoTimestamp("arrival perception completed",at);
    const prior=this.#database.prepare(`
      SELECT result_encounter_ref,completed_at FROM world_arrival_perception_work
      WHERE situation_id=?
    `).get(situationId);
    if(prior===undefined)throw new TypeError("arrival perception work missing");
    if(prior.completed_at!==null){
      if(prior.result_encounter_ref!==encounterRef)throw new TypeError("arrival perception conflicts");
      return;
    }
    this.#database.prepare(`
      UPDATE world_arrival_perception_work
      SET result_encounter_ref=?,completed_at=?
      WHERE situation_id=? AND completed_at IS NULL
    `).run(encounterRef,at,situationId);
  }

  enqueueSocialOpportunity({
    threadId,situationId,dueAt,trigger="arrival",needBand=null,visitSince=null,
  }){
    assertId("social opportunity Thread",threadId);
    assertId("social opportunity situation",situationId);
    assertIsoTimestamp("social opportunity due",dueAt);
    if(!["arrival","activity_change","need_band"].includes(trigger)){
      throw new TypeError("social opportunity trigger is invalid");
    }
    if(trigger!=="arrival")assertIsoTimestamp("social visit start",visitSince);
    if(trigger==="need_band"&&![0.4,0.6].includes(needBand)){
      throw new TypeError("social need band is invalid");
    }
    return this.#database.transaction(()=>{
      // A Body crossing belongs to a continuous lived visit, not to each
      // situation enacted inside that visit. Completed rows remain evidence
      // and cannot be replayed by subsequent activity changes or renewals.
      const key=trigger==="arrival"?situationId
        :`social_${sha256(canonicalJson(trigger==="need_band"
          ?{threadId,visitSince,trigger,needBand}
          :{threadId,situationId,trigger,needBand}))}`;
      if(trigger!=="arrival"){
        if(trigger==="need_band"&&this.#database.prepare(`
          SELECT 1 FROM world_social_opportunities WHERE situation_id=?
        `).get(key)!==undefined){
          return Object.freeze({inserted:false,alreadyScheduled:true,dueAt});
        }
        const used=this.#database.prepare(`
          SELECT COUNT(*) AS n FROM world_social_opportunities
          WHERE thread_id=? AND visit_since=? AND trigger_kind!='arrival'
        `).get(threadId,visitSince).n;
        if(used>=3)return Object.freeze({inserted:false,capped:true,dueAt});
      }
      const inserted=this.#database.prepare(`
        INSERT OR IGNORE INTO world_social_opportunities(
          situation_id,anchor_situation_id,thread_id,due_at,
          trigger_kind,need_band,visit_since
        ) VALUES(?,?,?,?,?,?,?)
      `).run(key,trigger==="arrival"?null:situationId,threadId,dueAt,
        trigger,needBand,visitSince).changes===1;
      return Object.freeze({inserted,capped:false,dueAt});
    });
  }

  socialChoicesThisVisit({threadId,counterpartyThreadId,visitSince,limit=3}){
    assertId("social choice Thread",threadId);
    assertId("social choice counterpart",counterpartyThreadId);
    assertIsoTimestamp("social shared visit",visitSince);
    return this.#database.prepare(`
      SELECT due_at,decision_json FROM (
        SELECT due_at,decision_json
        FROM world_social_opportunities
        WHERE thread_id=? AND due_at>=? AND completed_at IS NOT NULL
        UNION ALL
        SELECT due_at,decision_json
        FROM world_observed_social_opportunities
        WHERE thread_id=? AND due_at>=? AND completed_at IS NOT NULL
      ) WHERE decision_json IS NOT NULL
        AND (json_extract(decision_json,'$.counterpartyThreadId')=?
          OR EXISTS (SELECT 1 FROM json_each(decision_json,'$.consideredThreadIds')
            WHERE value=?))
        AND json_extract(decision_json,'$.initiation.act') IS NOT NULL
      ORDER BY due_at DESC LIMIT ?
    `).all(threadId,visitSince,threadId,visitSince,counterpartyThreadId,
      counterpartyThreadId,limit)
      .reverse().map(row=>{
        const witness=JSON.parse(row.decision_json);
        return Object.freeze({
          at:row.due_at,act:witness.initiation?.act??null,
          towardThreadId:witness.counterpartyThreadId??null,
          expression:witness.initiation?.expression??null,
          reportedReason:witness.initiation?.reportedReason??null,
        });
      });
  }

  reconsiderationCountForPair({threadId,counterpartyThreadId,visitSince}){
    return this.#database.prepare(`
      SELECT COUNT(*) AS n FROM world_social_opportunities
      WHERE thread_id=? AND visit_since=? AND trigger_kind!='arrival'
        AND completed_at IS NOT NULL
        AND (json_extract(decision_json,'$.counterpartyThreadId')=?
          OR EXISTS (SELECT 1 FROM json_each(decision_json,'$.consideredThreadIds')
            WHERE value=?))
    `).get(threadId,visitSince,counterpartyThreadId,counterpartyThreadId).n;
  }

  // A conversation between two people answers the one-shot chances they still
  // held toward each other; settle them rather than start a parallel talk.
  supersedePairSocialOpportunities({threadIds,at,encounterRef}){
    const [first,second]=threadIds;
    assertId("conversation participant",first);
    assertId("conversation participant",second);
    assertIsoTimestamp("conversation time",at);
    assertId("conversation encounterRef",encounterRef);
    return this.#database.prepare(`
      UPDATE world_observed_social_opportunities
      SET started_at=?,completed_at=?,outcome='superseded_by_conversation',
        decision_json=json_object('counterpartyThreadId',counterparty_thread_id,
          'encounterRef',?)
      WHERE started_at IS NULL
        AND ((thread_id=? AND counterparty_thread_id=?)
          OR (thread_id=? AND counterparty_thread_id=?))
    `).run(at,at,encounterRef,first,second,second,first).changes;
  }

  enqueueObservedSocialOpportunity({
    encounterRef,threadId,situationId,counterpartyThreadId,venueRef,dueAt,
    sourceKind="arrival",visitSince=null,
  }){
    for(const [name,id] of Object.entries({
      encounterRef,threadId,situationId,counterpartyThreadId,venueRef,
    }))assertId(`noticed social ${name}`,id);
    assertIsoTimestamp("noticed social time",dueAt);
    if(threadId===counterpartyThreadId)throw new TypeError("social observer must be another person");
    if(!["arrival","social_act"].includes(sourceKind)){
      throw new TypeError("social opportunity source is invalid");
    }
    if(sourceKind==="social_act")assertIsoTimestamp("shared visit start",visitSince);
    return this.#database.transaction(()=>{
      if(sourceKind==="social_act"){
        const count=this.#database.prepare(`
          SELECT COUNT(*) AS n FROM world_observed_social_opportunities
          WHERE source_kind='social_act' AND venue_ref=?
            AND due_at>=? AND due_at<=?
            AND ((thread_id=? AND counterparty_thread_id=?)
              OR (thread_id=? AND counterparty_thread_id=?))
        `).get(venueRef,visitSince,dueAt,threadId,counterpartyThreadId,
          counterpartyThreadId,threadId).n;
        if(count>=4)return Object.freeze({inserted:false,capped:true,dueAt});
      }
      const inserted=this.#database.prepare(`
        INSERT OR IGNORE INTO world_observed_social_opportunities(
          encounter_ref,thread_id,situation_id,counterparty_thread_id,
          venue_ref,due_at,source_kind
        ) VALUES(?,?,?,?,?,?,?)
      `).run(encounterRef,threadId,situationId,counterpartyThreadId,venueRef,
        dueAt,sourceKind).changes===1;
      return Object.freeze({inserted,capped:false,dueAt});
    });
  }

  nextSocialOpportunityAt({after=null,asOf=null}={}){
    if(after!==null)assertIsoTimestamp("social opportunity after",after);
    if(asOf!==null)assertIsoTimestamp("social opportunity asOf",asOf);
    const hasDebt=this.#hasLivedBoundaryFrontier();
    const debtFilter=hasDebt?`
        AND NOT EXISTS (
          SELECT 1 FROM lived_now_next_boundaries b
          WHERE (b.thread_id=o.thread_id OR b.thread_id=o.counterparty_thread_id)
            AND (b.failed_attempts>0 OR b.due_at<=o.due_at
              OR (? IS NOT NULL AND b.due_at<=?))
        )`:"";
    return this.#database.prepare(`
      SELECT o.due_at FROM (
        SELECT thread_id,NULL AS counterparty_thread_id,due_at
        FROM world_social_opportunities WHERE started_at IS NULL
        UNION ALL
        SELECT thread_id,counterparty_thread_id,due_at
        FROM world_observed_social_opportunities WHERE started_at IS NULL
      ) o
      WHERE (? IS NULL OR o.due_at>?)
        AND NOT EXISTS (SELECT 1 FROM thread_life_rest life_rest WHERE life_rest.thread_id IN (o.thread_id,o.counterparty_thread_id))
        ${debtFilter}
      ORDER BY o.due_at LIMIT 1
    `).get(...(hasDebt?[after,after,asOf,asOf]:[after,after]))?.due_at??null;
  }

  listDueSocialOpportunities({at,limit=8}){
    assertIsoTimestamp("social opportunity now",at);
    const hasDebt=this.#hasLivedBoundaryFrontier();
    const debtFilter=hasDebt?`
      AND NOT EXISTS (
        SELECT 1 FROM lived_now_next_boundaries b
        WHERE (b.thread_id=o.thread_id OR b.thread_id=o.counterparty_thread_id)
          AND (b.failed_attempts>0 OR b.due_at<=?)
      )`:"";
    if(!Number.isSafeInteger(limit)||limit<1||limit>16){
      throw new TypeError("bounded social opportunity read requires 1-16 entries");
    }
    // Filter known parties' unresolved life in SQL *before* the bound.
    // Arrival candidates must additionally be checked against their venue.
    return this.#database.prepare(`
      SELECT o.* FROM (
        SELECT 'arrival' AS kind,NULL AS encounter_ref,thread_id,
          COALESCE(anchor_situation_id,situation_id) AS situation_id,
          situation_id AS opportunity_id,trigger_kind,need_band,visit_since,
          NULL AS counterparty_thread_id,NULL AS venue_ref,NULL AS source_kind,due_at
        FROM world_social_opportunities WHERE started_at IS NULL AND due_at<=?
        UNION ALL
        SELECT 'observed' AS kind,encounter_ref,thread_id,situation_id,
          NULL AS opportunity_id,'observed' AS trigger_kind,NULL AS need_band,
          NULL AS visit_since,counterparty_thread_id,venue_ref,source_kind,due_at
        FROM world_observed_social_opportunities
        WHERE started_at IS NULL AND due_at<=?
      ) o
      WHERE NOT EXISTS (SELECT 1 FROM thread_life_rest life_rest WHERE life_rest.thread_id IN (o.thread_id,o.counterparty_thread_id))
        ${debtFilter}
      ORDER BY o.due_at,o.kind,o.situation_id LIMIT ?
    `).all(...(hasDebt?[at,at,at,limit]:[at,at,limit])).map(row=>Object.freeze({
      kind:row.kind,sourceEncounterRef:row.encounter_ref,
      threadId:row.thread_id,situationId:row.situation_id,
      opportunityId:row.opportunity_id,trigger:row.trigger_kind,
      needBand:row.need_band,visitSince:row.visit_since,
      counterpartyThreadId:row.counterparty_thread_id,
      venueRef:row.venue_ref,sourceKind:row.source_kind,dueAt:row.due_at,
    }));
  }

  isClaimedSpokenSocialOpportunity({encounterRef,threadId,counterpartyThreadId}){
    return this.#database.prepare(`
      SELECT 1 FROM world_observed_social_opportunities
      WHERE encounter_ref=? AND thread_id=? AND counterparty_thread_id=?
        AND source_kind='social_act' AND started_at IS NOT NULL
        AND completed_at IS NULL
      LIMIT 1
    `).get(encounterRef,threadId,counterpartyThreadId)!==undefined;
  }

  claimDueSocialOpportunity({at,selected=null}){
    assertIsoTimestamp("social opportunity now",at);
    return this.#database.transaction(()=>{
      const row=this.#database.prepare(`
        SELECT * FROM (
          SELECT 'arrival' AS kind,NULL AS encounter_ref,thread_id,
            COALESCE(anchor_situation_id,situation_id) AS situation_id,
            situation_id AS opportunity_id,trigger_kind,need_band,visit_since,
            NULL AS counterparty_thread_id,NULL AS venue_ref,NULL AS source_kind,due_at
          FROM world_social_opportunities
          WHERE started_at IS NULL AND due_at<=?
          UNION ALL
          SELECT 'observed' AS kind,encounter_ref,thread_id,situation_id,
            NULL AS opportunity_id,'observed' AS trigger_kind,NULL AS need_band,
            NULL AS visit_since,counterparty_thread_id,venue_ref,source_kind,due_at
          FROM world_observed_social_opportunities
          WHERE started_at IS NULL AND due_at<=?
        ) o
        WHERE NOT EXISTS (SELECT 1 FROM thread_life_rest life_rest WHERE life_rest.thread_id IN (o.thread_id,o.counterparty_thread_id))
          AND (? IS NULL OR (o.kind=? AND o.thread_id=?
          AND COALESCE(o.opportunity_id,o.situation_id)=?
          AND (? IS NULL OR o.encounter_ref=?)))
        ORDER BY o.due_at,o.kind,o.situation_id LIMIT 1
      `).get(at,at,selected?.kind??null,selected?.kind??null,
        selected?.threadId??null,selected?.opportunityId??selected?.situationId??null,
        selected?.sourceEncounterRef??null,selected?.sourceEncounterRef??null);
      if(row===undefined)return null;
      const observed=row.kind==="observed";
      const changed=observed
        ?this.#database.prepare(`
          UPDATE world_observed_social_opportunities SET started_at=?
          WHERE encounter_ref=? AND thread_id=? AND started_at IS NULL
        `).run(at,row.encounter_ref,row.thread_id).changes
        :this.#database.prepare(`
          UPDATE world_social_opportunities SET started_at=?
          WHERE situation_id=? AND started_at IS NULL
        `).run(at,row.opportunity_id).changes;
      if(changed!==1)return null;
      return Object.freeze({
        kind:row.kind,sourceEncounterRef:row.encounter_ref,
        threadId:row.thread_id,situationId:row.situation_id,
        opportunityId:row.opportunity_id,trigger:row.trigger_kind,
        needBand:row.need_band,visitSince:row.visit_since,
        counterpartyThreadId:row.counterparty_thread_id,
        venueRef:row.venue_ref,sourceKind:row.source_kind,dueAt:row.due_at,
      });
    });
  }

  completeSocialOpportunity({
    situationId,at,outcome,sourceEncounterRef=null,threadId=null,decision=null,
    opportunityId=null,
  }){
    assertId("social opportunity situation",situationId);
    const observed=sourceEncounterRef!==null;
    if(observed){
      assertId("observed social source",sourceEncounterRef);
      assertId("observed social Thread",threadId);
    }
    assertIsoTimestamp("social opportunity completion",at);
    if(!["no_co_presence","missed_window","expired","life_unresolved","background","not_initiated","acted","not_met","met","scene_changed",
      "need_unreached","pair_limit","interrupted"].includes(outcome)){
      throw new TypeError("social opportunity outcome is invalid");
    }
    const table=observed
      ?"world_observed_social_opportunities":"world_social_opportunities";
    const where=observed?"encounter_ref=? AND thread_id=?":"situation_id=?";
    const args=observed?[sourceEncounterRef,threadId]:[opportunityId??situationId];
    if(decision!==null&&(typeof decision!=="object"||Array.isArray(decision))){
      throw new TypeError("social decision witness must be structured evidence");
    }
    const decisionJson=decision===null?null:canonicalJson(decision);
    const row=this.#database.prepare(`
      SELECT started_at,completed_at,outcome,decision_json FROM ${table} WHERE ${where}
    `).get(...args);
    if(!row?.started_at)throw new TypeError("social opportunity was not started");
    if(row.completed_at!==null){
      if(row.outcome!==outcome||row.decision_json!==decisionJson){
        throw new TypeError("social opportunity outcome or evidence conflicts");
      }
      return;
    }
    this.#database.prepare(`
      UPDATE ${table} SET completed_at=?,outcome=?,decision_json=?
      WHERE ${where} AND completed_at IS NULL
    `).run(at,outcome,decisionJson,...args);
  }

  inspectSocialOpportunities(threadId,{limit=12}={}){
    assertId("social opportunity Thread",threadId);
    if(!Number.isSafeInteger(limit)||limit<1||limit>40){
      throw new TypeError("social opportunity inspection limit must be 1-40");
    }
    return this.#database.prepare(`
      SELECT * FROM (
        SELECT 'arrival' AS kind,NULL AS encounter_ref,
          COALESCE(anchor_situation_id,situation_id) AS situation_id,
          due_at,started_at,completed_at,outcome,decision_json,
          trigger_kind,need_band,visit_since
        FROM world_social_opportunities WHERE thread_id=?
        UNION ALL
        SELECT 'observed' AS kind,encounter_ref,
          situation_id,due_at,started_at,completed_at,outcome,decision_json,
          CASE WHEN source_kind='social_act' THEN 'social_act'
            ELSE 'observed' END AS trigger_kind,
          NULL AS need_band,NULL AS visit_since
        FROM world_observed_social_opportunities WHERE thread_id=?
      ) ORDER BY due_at DESC LIMIT ?
    `).all(threadId,threadId,limit).map(row=>Object.freeze({
      kind:row.kind,sourceEncounterRef:row.encounter_ref,
      situationId:row.situation_id,dueAt:row.due_at,
      trigger:row.trigger_kind,needBand:row.need_band,
      visitSince:row.visit_since,startedAt:row.started_at,
      outcome:row.outcome??(row.started_at===null?"pending":"interrupted"),
      decision:row.decision_json===null?null:JSON.parse(row.decision_json),
      completedAt:row.completed_at,
    }));
  }

  enqueueEnvironmentalOpportunity({threadId,situationId,dueAt,kind="arrival"}){
    assertId("World opportunity threadId",threadId);
    assertId("World opportunity situationId",situationId);
    assertIsoTimestamp("World opportunity dueAt",dueAt);
    const table=environmentOpportunityTable(kind);
    const inserted=this.#database.prepare(`
      INSERT OR IGNORE INTO ${table}(situation_id,thread_id,due_at)
      VALUES(?,?,?)
    `).run(situationId,threadId,dueAt).changes===1;
    return Object.freeze({threadId,situationId,dueAt,kind,inserted});
  }

  enqueueSceneAmbientOpportunity({sceneRef,threadId,situationId,dueAt}){
    assertId("World ambient scene",sceneRef);
    assertId("World ambient Thread",threadId);
    assertId("World ambient situation",situationId);
    assertIsoTimestamp("World ambient consideration",dueAt);
    const inserted=this.#database.prepare(`
      INSERT INTO world_ambient_scene_frontier(scene_ref,thread_id,situation_id,due_at)
      VALUES(?,?,?,?)
      ON CONFLICT(scene_ref) DO UPDATE SET
        thread_id=excluded.thread_id,situation_id=excluded.situation_id,
        due_at=excluded.due_at,decision_json=NULL,
        result_encounter_ref=NULL,completed_at=NULL
      WHERE world_ambient_scene_frontier.completed_at IS NOT NULL
        AND excluded.due_at>world_ambient_scene_frontier.due_at
    `).run(sceneRef,threadId,situationId,dueAt).changes===1;
    return Object.freeze({sceneRef,threadId,situationId,dueAt,inserted});
  }

  inspectEnvironmentalOpportunities(threadId,{limit=12}={}){
    assertId("World opportunity Thread",threadId);
    if(!Number.isSafeInteger(limit)||limit<1||limit>40){
      throw new TypeError("World opportunity inspection limit must be 1-40");
    }
    return this.#database.prepare(`
      SELECT * FROM (
        SELECT 'arrival' AS kind,situation_id,due_at,decision_json,result_encounter_ref,completed_at
        FROM world_environment_opportunities WHERE thread_id=?
        UNION ALL
        SELECT 'stay' AS kind,situation_id,due_at,decision_json,result_encounter_ref,completed_at
        FROM world_environment_stay_opportunities WHERE thread_id=?
        UNION ALL
        SELECT 'scene' AS kind,situation_id,due_at,decision_json,result_encounter_ref,completed_at
        FROM world_ambient_scene_frontier WHERE thread_id=?
      ) ORDER BY due_at DESC,situation_id DESC LIMIT ?
    `).all(threadId,threadId,threadId,limit).map((row)=>Object.freeze({
      kind:row.kind,
      situationId:row.situation_id,
      dueAt:row.due_at,
      outcome:row.decision_json===null?"pending":JSON.parse(row.decision_json).outcome,
      encounterId:row.result_encounter_ref,
      completedAt:row.completed_at,
    }));
  }

  nextEnvironmentalOpportunityAt(){
    return this.#database.prepare(`
      SELECT due_at FROM (
        SELECT thread_id,due_at FROM world_environment_opportunities WHERE completed_at IS NULL
        UNION ALL
        SELECT thread_id,due_at FROM world_environment_stay_opportunities WHERE completed_at IS NULL
        UNION ALL
        SELECT thread_id,due_at FROM world_ambient_scene_frontier WHERE completed_at IS NULL
      ) o WHERE NOT EXISTS (SELECT 1 FROM thread_life_rest life_rest WHERE life_rest.thread_id=o.thread_id)
      ORDER BY due_at LIMIT 1
    `).get()?.due_at??null;
  }

  listDueEnvironmentalOpportunities({at,limit=1}){
    assertIsoTimestamp("World opportunity at",at);
    if(!Number.isSafeInteger(limit)||limit<1||limit>4){
      throw new TypeError("World opportunity limit must be 1-4");
    }
    return this.#database.prepare(`
      SELECT * FROM (
        SELECT 'arrival' AS kind,NULL AS scene_ref,thread_id,situation_id,due_at,decision_json
        FROM world_environment_opportunities
        WHERE completed_at IS NULL AND due_at<=?
        UNION ALL
        SELECT 'stay' AS kind,NULL AS scene_ref,thread_id,situation_id,due_at,decision_json
        FROM world_environment_stay_opportunities
        WHERE completed_at IS NULL AND due_at<=?
        UNION ALL
        SELECT 'scene' AS kind,scene_ref,thread_id,situation_id,due_at,decision_json
        FROM world_ambient_scene_frontier
        WHERE completed_at IS NULL AND due_at<=?
      ) o WHERE NOT EXISTS (SELECT 1 FROM thread_life_rest life_rest WHERE life_rest.thread_id=o.thread_id)
      ORDER BY due_at,situation_id LIMIT ?
    `).all(at,at,at,limit).map((row)=>Object.freeze({
      kind:row.kind,sceneRef:row.scene_ref,
      threadId:row.thread_id,situationId:row.situation_id,dueAt:row.due_at,
      decision:row.decision_json===null?null:JSON.parse(row.decision_json),
    }));
  }

  recordEnvironmentalOpportunityDecision({situationId,sceneRef=null,decision,kind="arrival"}){
    assertId("World opportunity situationId",situationId);
    const table=environmentOpportunityTable(kind);
    const key=kind==="scene"?sceneRef:situationId;
    if(kind==="scene")assertId("World ambient scene",key);
    if(!["no_change","changed","not_observable"].includes(decision?.outcome)
      ||typeof decision.occurredAt!=="string"
      ||(decision.outcome==="changed")!==
        (typeof decision.occurrenceText==="string"&&decision.occurrenceText.trim().length>0)
      ||!Array.isArray(decision.presence)
      ||(decision.outcome==="changed")!==(decision.presence.length>0)
      ||decision.presence.length>2){
      throw new TypeError("World initial event decision is invalid");
    }
    assertIsoTimestamp("World initial occurredAt",decision.occurredAt);
    for(const item of decision.presence){
      assertId("World potential observer",item.threadId);
      assertId("World observer situation",item.situationId);
    }
    if(new Set(decision.presence.map((item)=>item.threadId)).size!==decision.presence.length){
      throw new TypeError("World initial observers must be distinct");
    }
    const body=canonicalJson(decision);
    this.#database.prepare(`
      UPDATE ${table} SET decision_json=?
      WHERE ${kind==="scene"?"scene_ref":"situation_id"}=? AND decision_json IS NULL AND completed_at IS NULL
    `).run(body,key);
    const recorded=this.#database.prepare(`
      SELECT decision_json FROM ${table} WHERE ${kind==="scene"?"scene_ref":"situation_id"}=?
    `).get(key);
    if(recorded?.decision_json!==body)throw new TypeError("World initial decision conflicts");
    return Object.freeze(JSON.parse(body));
  }

  completeEnvironmentalOpportunity({situationId,sceneRef=null,resultEncounterRef=null,completedAt,kind="arrival"}){
    assertId("World opportunity situationId",situationId);
    const table=environmentOpportunityTable(kind);
    const key=kind==="scene"?sceneRef:situationId;
    if(kind==="scene")assertId("World ambient scene",key);
    if(resultEncounterRef!==null)assertId("World initial result",resultEncounterRef);
    assertIsoTimestamp("World initial completedAt",completedAt);
    const row=this.#database.prepare(`
      SELECT decision_json,result_encounter_ref,completed_at
      FROM ${table} WHERE ${kind==="scene"?"scene_ref":"situation_id"}=?
    `).get(key);
    if(!row?.decision_json)throw new TypeError("World initial decision not recorded");
    const decision=JSON.parse(row.decision_json);
    if((decision.outcome==="changed")!==(resultEncounterRef!==null)){
      throw new TypeError("World initial result conflicts with decision");
    }
    if(row.completed_at!==null){
      if(row.result_encounter_ref!==resultEncounterRef){
        throw new TypeError("World initial completion conflicts");
      }
      return;
    }
    this.#database.prepare(`
      UPDATE ${table} SET result_encounter_ref=?,completed_at=?
      WHERE ${kind==="scene"?"scene_ref":"situation_id"}=? AND completed_at IS NULL
    `).run(resultEncounterRef,completedAt,key);
  }

  getThreadEnvironmentalStory({threadId,situationId,occurredAt}){
    assertId("environmental story Thread",threadId);
    assertId("environmental story situation",situationId);
    assertIsoTimestamp("environmental story time",occurredAt);
    const row=this.#database.prepare(`
      SELECT e.encounter_id FROM encounter_story_records e
      JOIN encounter_story_thread_presence p ON p.encounter_ref=e.encounter_id
      WHERE e.occurred_at=? AND p.thread_id=? AND p.situation_id=?
        AND json_array_length(json_extract(e.story_json,'$.beats'))=1
        AND json_extract(e.story_json,'$.beats[0].kind')='occurrence'
        AND json_extract(e.story_json,'$.beats[0].actorThreadId') IS NULL
        AND (SELECT COUNT(*) FROM encounter_story_thread_presence other
          WHERE other.encounter_ref=e.encounter_id)=1
      ORDER BY e.encounter_id LIMIT 1
    `).get(occurredAt,threadId,situationId);
    return row===undefined?null:this.getEncounterStory(row.encounter_id);
  }

  getSharedEnvironmentalStory({occurredAt,placeRef}) {
    assertIsoTimestamp("shared occurrence occurredAt",occurredAt);
    assertId("shared occurrence placeRef",placeRef);
    const row=this.#database.prepare(`
      SELECT encounter_id FROM encounter_story_records
      WHERE occurred_at=?
        AND json_array_length(json_extract(story_json,'$.beats'))=1
        AND json_extract(story_json,'$.beats[0].kind')='occurrence'
        AND json_extract(story_json,'$.beats[0].actorThreadId') IS NULL
        AND EXISTS (
          SELECT 1 FROM json_each(visualization_source_refs_json)
          WHERE value=?
        )
      ORDER BY encounter_id LIMIT 1
    `).get(occurredAt,placeRef);
    return row===undefined?null:this.getEncounterStory(row.encounter_id);
  }

  inspectEnvironmentalFollowup(sourceEncounterRef) {
    assertId("World follow-up source",sourceEncounterRef);
    const row=this.#database.prepare(`
      SELECT place_ref,due_at,decision_json,result_encounter_ref,completed_at
      FROM world_environment_followups WHERE source_encounter_ref=?
    `).get(sourceEncounterRef);
    if(row===undefined)return null;
    return Object.freeze({
      sourceEncounterRef,
      placeRef:row.place_ref,
      dueAt:row.due_at,
      outcome:row.decision_json===null?"pending":JSON.parse(row.decision_json).outcome,
      completedAt:row.completed_at,
      continuation:row.result_encounter_ref===null
        ?null:this.getEncounterStory(row.result_encounter_ref),
    });
  }

  nextEnvironmentalFollowupAt() {
    const row=this.#database.prepare(`
      SELECT due_at FROM world_environment_followups
      WHERE completed_at IS NULL ORDER BY due_at LIMIT 1
    `).get();
    return row?.due_at??null;
  }

  listDueEnvironmentalFollowups({at,limit=2}) {
    assertIsoTimestamp("World follow-up at",at);
    if(!Number.isSafeInteger(limit)||limit<1||limit>8){
      throw new TypeError("World follow-up limit must be 1-8");
    }
    return this.#database.prepare(`
      SELECT source_encounter_ref,place_ref,due_at,decision_json
      FROM world_environment_followups
      WHERE completed_at IS NULL AND due_at<=?
      ORDER BY due_at,source_encounter_ref LIMIT ?
    `).all(at,limit).map((row)=>Object.freeze({
      sourceEncounterRef:row.source_encounter_ref,
      placeRef:row.place_ref,
      dueAt:row.due_at,
      decision:row.decision_json===null?null:JSON.parse(row.decision_json),
    }));
  }

  recordEnvironmentalFollowupDecision({sourceEncounterRef,decision}) {
    assertId("World follow-up source",sourceEncounterRef);
    if(!["not_observable","no_change","changed","unobserved"].includes(decision?.outcome)){
      throw new TypeError("World follow-up outcome is invalid");
    }
    if((decision.outcome==="changed")!==(
      typeof decision.occurrenceText==="string"&&decision.occurrenceText.trim()!==""
    )){
      throw new TypeError("World follow-up occurrence is inconsistent");
    }
    if(!Array.isArray(decision.potentialObservers)||decision.potentialObservers.length>4
      ||(decision.outcome==="changed"&&decision.potentialObservers.length===0)
      ||(decision.outcome!=="changed"&&decision.potentialObservers.length!==0)){
      throw new TypeError("World change requires potential observers");
    }
    const ids=new Set();
    for(const observer of decision.potentialObservers){
      assertId("World observer Thread",observer.threadId);
      assertId("World observer situation",observer.situationId);
      if(ids.has(observer.threadId))throw new TypeError("World observer is duplicated");
      ids.add(observer.threadId);
    }
    const body=canonicalJson({
      outcome:decision.outcome,
      occurrenceText:decision.outcome==="changed"?decision.occurrenceText.trim():null,
      potentialObservers:decision.potentialObservers,
    });
    try{
      this.#database.prepare(`
        UPDATE world_environment_followups SET decision_json=?
        WHERE source_encounter_ref=? AND decision_json IS NULL AND completed_at IS NULL
      `).run(body,sourceEncounterRef);
      const row=this.#database.prepare(`
        SELECT decision_json FROM world_environment_followups WHERE source_encounter_ref=?
      `).get(sourceEncounterRef);
      if(row===undefined||row.decision_json!==body){
        throw new TypeError("World follow-up decision conflicts");
      }
      return Object.freeze(JSON.parse(body));
    }catch(error){throw translateStorageError(error);}
  }

  completeEnvironmentalFollowup({sourceEncounterRef,resultEncounterRef=null,completedAt}) {
    assertId("World follow-up source",sourceEncounterRef);
    if(resultEncounterRef!==null)assertId("World follow-up result",resultEncounterRef);
    assertIsoTimestamp("World follow-up completedAt",completedAt);
    try{
      const row=this.#database.prepare(`
        SELECT decision_json,result_encounter_ref,completed_at FROM world_environment_followups
        WHERE source_encounter_ref=?
      `).get(sourceEncounterRef);
      if(row===undefined||row.decision_json===null){
        throw new TypeError("World follow-up must be decided before completion");
      }
      const decision=JSON.parse(row.decision_json);
      if((decision.outcome==="changed")!==(resultEncounterRef!==null)){
        throw new TypeError("World follow-up result contradicts decision");
      }
      if(row.completed_at!==null){
        if(row.result_encounter_ref!==resultEncounterRef){
          throw new TypeError("World follow-up completion conflicts");
        }
        return Object.freeze({sourceEncounterRef,resultEncounterRef,completedAt:row.completed_at});
      }
      this.#database.prepare(`
        UPDATE world_environment_followups SET result_encounter_ref=?,completed_at=?
        WHERE source_encounter_ref=? AND completed_at IS NULL
      `).run(resultEncounterRef,completedAt,sourceEncounterRef);
      return Object.freeze({sourceEncounterRef,resultEncounterRef,completedAt});
    }catch(error){throw translateStorageError(error);}
  }

  recordEncounterStory(candidate,{uniquePlaceOccurrenceRef=null,followupAfterMs=null,publicRequest=null,publicCheckpoint=null}={}) {
    if(publicRequest!==null){
      assertId("public encounter requestId",publicRequest.requestId);
      assertId("public encounter threadId",publicRequest.threadId);
      assertNonEmpty("public encounter requestDigest",publicRequest.requestDigest);
      if(!publicRequest.requestDigest.startsWith("sha256:"))throw new TypeError("public encounter request digest is invalid");
      if(candidate.threadPresence?.length!==1||candidate.threadPresence[0].threadId!==publicRequest.threadId){
        throw new TypeError("public encounter admission must name its participating Thread");
      }
    }
    if(publicCheckpoint!==null){
      assertId("public checkpoint requestId",publicCheckpoint.requestId);
      assertId("public checkpoint threadId",publicCheckpoint.threadId);
      assertNonEmpty("public checkpoint requestDigest",publicCheckpoint.requestDigest);
      if(!publicCheckpoint.requestDigest.startsWith("sha256:")
        ||!Number.isSafeInteger(publicCheckpoint.position)
        ||publicCheckpoint.position<0){
        throw new TypeError("public encounter checkpoint identity is invalid");
      }
      if(candidate.threadPresence?.length!==1
        ||candidate.threadPresence[0].threadId!==publicCheckpoint.threadId
        ||(publicCheckpoint.position===0&&(
          publicRequest?.requestId!==publicCheckpoint.requestId
          ||publicRequest.requestDigest!==publicCheckpoint.requestDigest))
        ||(publicCheckpoint.position>0&&publicRequest!==null)){
        throw new TypeError("public checkpoint must continue its admitted request");
      }
    }
    assertIsoTimestamp("encounter story.occurredAt", candidate.occurredAt);
    if(followupAfterMs!==null&&(
      uniquePlaceOccurrenceRef===null||!Number.isSafeInteger(followupAfterMs)
      ||followupAfterMs<60_000||followupAfterMs>3_600_000
    )){
      throw new TypeError("World follow-up requires shared place and 1-60 minute delay");
    }
    if(uniquePlaceOccurrenceRef!==null){
      assertId("shared occurrence placeRef",uniquePlaceOccurrenceRef);
      if(candidate.story?.beats?.length!==1
        ||candidate.story.beats[0]?.kind!=="occurrence"
        ||candidate.story.beats[0]?.actorThreadId!==null
        ||!candidate.visualization?.visualizationSourceReferences?.includes(uniquePlaceOccurrenceRef)){
        throw new TypeError("shared occurrence must be one place-grounded objective beat");
      }
    }
    if (!Array.isArray(candidate.threadPresence)||candidate.threadPresence.length<1){
      throw new TypeError("encounter story requires a potentially perceiving Thread");
    }
    const participantIds = new Set();
    const threadPresence = candidate.threadPresence.map((participant) => {
      if (participant === null || typeof participant !== "object" || Array.isArray(participant)) {
        throw new TypeError("encounter story Thread presence must be an object");
      }
      assertId("encounter story presence.threadId", participant.threadId);
      assertId("encounter story presence.situationId", participant.situationId);
      if (participantIds.has(participant.threadId)) throw new TypeError("encounter story Thread presence is duplicated");
      participantIds.add(participant.threadId);
      return { threadId:participant.threadId, situationId:participant.situationId };
    });
    const story = normalizeStory(candidate.story, participantIds);
    for(const beat of story.beats){
      if(!beat.disclosesSpeakerName)continue;
      const speaker=this.#database.prepare(`
        SELECT state_json FROM threads WHERE thread_id=?
      `).get(beat.actorThreadId);
      const name=speaker===undefined?null:JSON.parse(speaker.state_json)
        .identity?.name;
      // World only admits the name part present in spoken, attributed words.
      const heard=spokenNameDisclosure(beat.spokenText??beat.text,name);
      if(heard===null){
        delete beat.disclosesSpeakerName;
        delete beat.disclosedName;
      }else{
        beat.disclosedName=heard;
      }
    }
    const visualization = normalizeVisualization(candidate.visualization, participantIds);
    const normalized = { occurredAt:candidate.occurredAt, threadPresence, story, visualization };
    const encounterId = encounterStoryId(normalized);
    const record = { encounterId, ...normalized };
    const recordDigest = digest(record);

    try {
      return this.#database.transaction(() => {
        if(publicRequest!==null){
          const previous=this.getPublicEncounterAdmission(publicRequest.requestId);
          if(previous!==null){
            if(previous.threadId!==publicRequest.threadId||previous.requestDigest!==publicRequest.requestDigest){
              throw new TypeError(`public encounter request ${publicRequest.requestId} conflicts with its existing admission`);
            }
            return this.getEncounterStory(previous.encounterRef);
          }
        }
        if(publicCheckpoint!==null&&publicCheckpoint.position>0){
          const admission=this.getPublicEncounterAdmission(publicCheckpoint.requestId);
          if(admission===null
            ||admission.threadId!==publicCheckpoint.threadId
            ||admission.requestDigest!==publicCheckpoint.requestDigest){
            throw new TypeError("public checkpoint has no matching admitted request");
          }
          const latest=this.#database.prepare(`
            SELECT position,encounter_ref FROM public_encounter_checkpoints
            WHERE request_id=? ORDER BY position DESC LIMIT 1
          `).get(publicCheckpoint.requestId);
          if(latest===undefined)throw new TypeError("public checkpoint lost its first Story");
          if(latest.position>=publicCheckpoint.position){
            const saved=this.#database.prepare(`
              SELECT encounter_ref FROM public_encounter_checkpoints
              WHERE request_id=? AND position=?
            `).get(publicCheckpoint.requestId,publicCheckpoint.position);
            if(saved===undefined)throw new TypeError("public checkpoints are not contiguous");
            return this.getEncounterStory(saved.encounter_ref);
          }
          if(latest.position!==publicCheckpoint.position-1
            ||story.continuationOfEncounterRef!==latest.encounter_ref){
            throw new TypeError("public checkpoint must continue the last admitted Story");
          }
        }
        const admitRequest=()=>{
          if(publicRequest===null)return;
          this.#database.prepare(`
            INSERT INTO public_encounter_admissions(request_id,thread_id,request_digest,encounter_ref)
            VALUES(?,?,?,?)
          `).run(publicRequest.requestId,publicRequest.threadId,publicRequest.requestDigest,encounterId);
        };
        const admitCheckpoint=()=>{
          if(publicCheckpoint===null)return;
          this.#database.prepare(`
            INSERT INTO public_encounter_checkpoints(request_id,position,encounter_ref)
            VALUES(?,?,?)
          `).run(publicCheckpoint.requestId,publicCheckpoint.position,encounterId);
        };
        if(uniquePlaceOccurrenceRef!==null){
          const admitted=this.getSharedEnvironmentalStory({
            occurredAt:normalized.occurredAt,placeRef:uniquePlaceOccurrenceRef,
          });
          if(admitted!==null)return admitted;
        }
        if (story.continuationOfEncounterRef !== undefined) {
          const prior = this.#database.prepare(
            "SELECT occurred_at FROM encounter_story_records WHERE encounter_id=?",
          ).get(story.continuationOfEncounterRef);
          if (prior === undefined) {
            throw new TypeError(`continued Encounter Story ${story.continuationOfEncounterRef} was not found`);
          }
          if (Date.parse(prior.occurred_at) > Date.parse(normalized.occurredAt)) {
            throw new TypeError("Encounter Story continuation cannot point forward in time");
          }
          if(uniquePlaceOccurrenceRef!==null){
            const source=this.getEncounterStory(story.continuationOfEncounterRef);
            if(source.story.beats.length!==1||source.story.beats[0].kind!=="occurrence"
              ||!source.visualization.visualizationSourceReferences.includes(uniquePlaceOccurrenceRef)){
              throw new TypeError("World continuation requires an objective prior occurrence at the same place");
            }
          }
        }
        for (const participant of threadPresence) {
          const thread = this.#database.prepare(
            "SELECT 1 AS present FROM threads WHERE thread_id=?",
          ).get(participant.threadId);
          if (thread === undefined) throw new TypeError(`Thread ${participant.threadId} was not found`);
        }
        const prior = this.#database.prepare(
          "SELECT record_digest FROM encounter_story_records WHERE encounter_id=?",
        ).get(encounterId);
        if (prior !== undefined) {
          if (prior.record_digest !== recordDigest) throw new TypeError(`encounter story ${encounterId} conflicts`);
          admitRequest();
          admitCheckpoint();
          return record;
        }
        this.#database.prepare(`
          INSERT INTO encounter_story_records(
            encounter_id,occurred_at,story_json,visualization_prompt,visualization_prompt_digest,
            visualization_source_refs_json,depicted_thread_refs_json,record_digest
          ) VALUES (?,?,?,?,?,?,?,?)
        `).run(
          encounterId,
          normalized.occurredAt,
          canonicalJson(story),
          visualization.visualizationPrompt,
          visualization.visualizationPromptDigest,
          canonicalJson(visualization.visualizationSourceReferences),
          canonicalJson(visualization.depictedThreadRefs),
          recordDigest,
        );
        const insertPresence = this.#database.prepare(`
          INSERT INTO encounter_story_thread_presence(encounter_ref,thread_id,situation_id)
          VALUES (?,?,?)
        `);
        for (const participant of threadPresence) {
          insertPresence.run(encounterId,participant.threadId,participant.situationId);
        }
        recordStoryRelationalActs(this.#database,record);
        if(followupAfterMs!==null){
          const dueAt=new Date(Date.parse(normalized.occurredAt)+followupAfterMs).toISOString();
          this.#database.prepare(`
            INSERT INTO world_environment_followups(source_encounter_ref,place_ref,due_at)
            VALUES (?,?,?)
          `).run(encounterId,uniquePlaceOccurrenceRef,dueAt);
        }
        admitRequest();
        admitCheckpoint();
        return record;
      });
    } catch (error) { throw translateStorageError(error); }
  }

  getEncounterStory(encounterId, { required = true } = {}) {
    assertId("encounterId", encounterId);
    const row = this.#database.prepare(
      "SELECT encounter_id,occurred_at,story_json,visualization_prompt,visualization_prompt_digest,visualization_source_refs_json,depicted_thread_refs_json FROM encounter_story_records WHERE encounter_id=?",
    ).get(encounterId);
    if (row === undefined) {
      if (!required) return null;
      throw new TypeError(`encounter story ${encounterId} was not found`);
    }
    const threadPresence = this.#database.prepare(`
      SELECT thread_id,situation_id
      FROM encounter_story_thread_presence
      WHERE encounter_ref=?
      ORDER BY thread_id
    `).all(encounterId).map((participant) => ({
      threadId:participant.thread_id,
      situationId:participant.situation_id,
    }));
    return {
      encounterId:row.encounter_id,
      occurredAt:row.occurred_at,
      threadPresence,
      story:JSON.parse(row.story_json),
      visualization:{
        visualizationPrompt:row.visualization_prompt,
        visualizationPromptDigest:row.visualization_prompt_digest,
        visualizationSourceReferences:JSON.parse(row.visualization_source_refs_json),
        depictedThreadRefs:JSON.parse(row.depicted_thread_refs_json),
      },
    };
  }

  getPublicEncounterAdmission(requestId) {
    assertId("public encounter admission requestId",requestId);
    const row=this.#database.prepare(`
      SELECT request_id,thread_id,request_digest,encounter_ref
      FROM public_encounter_admissions WHERE request_id=?
    `).get(requestId);
    return row===undefined?null:{
      requestId:row.request_id,
      threadId:row.thread_id,
      requestDigest:row.request_digest,
      encounterRef:row.encounter_ref,
    };
  }

  listPublicEncounterCheckpointStories(requestId) {
    assertId("public checkpoint requestId",requestId);
    return this.#database.prepare(`
      SELECT encounter_ref FROM public_encounter_checkpoints
      WHERE request_id=? ORDER BY position
    `).all(requestId).map((row)=>this.getEncounterStory(row.encounter_ref));
  }

  getPublicEncounterReceipt(requestId, { required = false } = {}) {
    assertId("public encounter receipt requestId", requestId);
    const row = this.#database.prepare(
      "SELECT request_id,thread_id,request_digest,result_json,recorded_at FROM public_encounter_receipts WHERE request_id=?",
    ).get(requestId);
    if (row === undefined) {
      if (required) throw new TypeError(`public encounter receipt ${requestId} was not found`);
      return null;
    }
    return {
      requestId:row.request_id,
      threadId:row.thread_id,
      requestDigest:row.request_digest,
      result:JSON.parse(row.result_json),
      recordedAt:row.recorded_at,
    };
  }

  recordPublicEncounterReceipt(candidate) {
    assertId("public encounter receipt.requestId", candidate.requestId);
    assertId("public encounter receipt.threadId", candidate.threadId);
    assertNonEmpty("public encounter receipt.requestDigest", candidate.requestDigest);
    if (!candidate.requestDigest.startsWith("sha256:")) {
      throw new TypeError("public encounter receipt requestDigest is invalid");
    }
    assertIsoTimestamp("public encounter receipt.recordedAt", candidate.recordedAt);
    if (candidate.result === null || typeof candidate.result !== "object" || Array.isArray(candidate.result)) {
      throw new TypeError("public encounter receipt result must be an object");
    }
    const record = {
      requestId:candidate.requestId,
      threadId:candidate.threadId,
      requestDigest:candidate.requestDigest,
      result:structuredClone(candidate.result),
      recordedAt:candidate.recordedAt,
    };
    try {
      const thread = this.#database.prepare(
        "SELECT 1 AS present FROM threads WHERE thread_id=?",
      ).get(record.threadId);
      if (thread === undefined) throw new TypeError(`Thread ${record.threadId} was not found`);

      const prior = this.getPublicEncounterReceipt(record.requestId);
      if (prior !== null) {
        if (prior.threadId !== record.threadId
          || prior.requestDigest !== record.requestDigest
          || canonicalJson(prior.result) !== canonicalJson(record.result)) {
          throw new TypeError(`public encounter receipt ${record.requestId} conflicts`);
        }
        return prior;
      }

      this.#database.prepare(`
        INSERT INTO public_encounter_receipts(
          request_id,thread_id,request_digest,result_json,recorded_at
        ) VALUES (?,?,?,?,?)
      `).run(
        record.requestId,
        record.threadId,
        record.requestDigest,
        canonicalJson(record.result),
        record.recordedAt,
      );
      return record;
    } catch (error) { throw translateStorageError(error); }
  }

  recordSocialInteraction(candidate) {
    assertIsoTimestamp("social interaction.occurredAt", candidate.occurredAt);
    assertId("social interaction.initiatorThreadId", candidate.initiatorThreadId);
    assertId("social interaction.recipientThreadId", candidate.recipientThreadId);
    if (candidate.initiatorThreadId === candidate.recipientThreadId) {
      throw new TypeError("social interaction requires two different Threads");
    }
    assertId("social interaction.initiatorSituationId", candidate.initiatorSituationId);
    assertId("social interaction.recipientSituationId", candidate.recipientSituationId);
    assertNonEmpty("social interaction.requestText", candidate.requestText);
    if (!["accept","decline","defer"].includes(candidate.responseDecision)) {
      throw new TypeError("social interaction responseDecision is invalid");
    }
    if (candidate.responseExpression !== null && candidate.responseExpression !== undefined) {
      assertNonEmpty("social interaction.responseExpression", candidate.responseExpression);
    }
    if (candidate.suggestedAt !== null && candidate.suggestedAt !== undefined) {
      assertIsoTimestamp("social interaction.suggestedAt", candidate.suggestedAt);
    }

    const normalized = {
      occurredAt:candidate.occurredAt,
      initiatorThreadId:candidate.initiatorThreadId,
      recipientThreadId:candidate.recipientThreadId,
      initiatorSituationId:candidate.initiatorSituationId,
      recipientSituationId:candidate.recipientSituationId,
      requestText:candidate.requestText,
      responseDecision:candidate.responseDecision,
      responseExpression:candidate.responseExpression ?? null,
      suggestedAt:candidate.suggestedAt ?? null,
    };
    const interactionId = socialInteractionId(normalized);
    const record = { interactionId, ...normalized };
    const recordDigest = digest(record);

    try {
      return this.#database.transaction(() => {
        for (const threadId of [record.initiatorThreadId,record.recipientThreadId]) {
          const thread = this.#database.prepare(
            "SELECT 1 AS present FROM threads WHERE thread_id=?",
          ).get(threadId);
          if (thread === undefined) throw new TypeError(`Thread ${threadId} was not found`);
        }
        const prior = this.#database.prepare(
          "SELECT record_digest FROM social_interaction_records WHERE interaction_id=?",
        ).get(interactionId);
        if (prior !== undefined) {
          if (prior.record_digest !== recordDigest) {
            throw new TypeError(`social interaction ${interactionId} conflicts`);
          }
          return record;
        }
        this.#database.prepare(`
          INSERT INTO social_interaction_records(
            interaction_id,occurred_at,initiator_thread_id,recipient_thread_id,
            initiator_situation_id,recipient_situation_id,request_text,response_decision,
            response_expression,suggested_at,record_digest
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
        `).run(
          record.interactionId,record.occurredAt,record.initiatorThreadId,record.recipientThreadId,
          record.initiatorSituationId,record.recipientSituationId,record.requestText,record.responseDecision,
          record.responseExpression,record.suggestedAt,recordDigest,
        );
        recordInvitationRelationalActs(this.#database,record);
        return record;
      });
    } catch (error) { throw translateStorageError(error); }
  }

  listSocialInteractions(threadId, { withThreadId = null, limit = 8, newestFirst = true } = {}) {
    assertId("social interaction threadId", threadId);
    if (withThreadId !== null) assertId("social interaction withThreadId", withThreadId);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new TypeError("social interaction limit must be 1-100");
    }
    if (typeof newestFirst !== "boolean") throw new TypeError("social interaction newestFirst must be boolean");

    const rows = this.#database.prepare(`
      SELECT interaction_id,occurred_at,initiator_thread_id,recipient_thread_id,
        initiator_situation_id,recipient_situation_id,request_text,response_decision,
        response_expression,suggested_at
      FROM social_interaction_records
      WHERE (initiator_thread_id=? OR recipient_thread_id=?)
        AND (? IS NULL OR initiator_thread_id=? OR recipient_thread_id=?)
      ORDER BY occurred_at ${newestFirst?"DESC":"ASC"}, interaction_id ${newestFirst?"DESC":"ASC"}
      LIMIT ?
    `).all(threadId,threadId,withThreadId,withThreadId,withThreadId,limit).map((row) => ({
      interactionId:row.interaction_id,
      occurredAt:row.occurred_at,
      initiatorThreadId:row.initiator_thread_id,
      recipientThreadId:row.recipient_thread_id,
      initiatorSituationId:row.initiator_situation_id,
      recipientSituationId:row.recipient_situation_id,
      requestText:row.request_text,
      responseDecision:row.response_decision,
      responseExpression:row.response_expression,
      suggestedAt:row.suggested_at,
    }));
    return rows;
  }

  // A prior accepted exchange alone is not acquaintance. Both people
  // must also share a later admitted spoken Encounter Story.
  hasMetEncounter(observerId,otherId,{before}={}){
    assertId("known person observer",observerId);
    assertId("known person candidate",otherId);
    assertIsoTimestamp("known person before",before);
    return this.#database.prepare(`
      SELECT 1 FROM social_interaction_records i
      WHERE i.response_decision='accept' AND i.occurred_at<?
        AND ((i.initiator_thread_id=? AND i.recipient_thread_id=?)
          OR (i.initiator_thread_id=? AND i.recipient_thread_id=?))
        AND EXISTS (
          SELECT 1 FROM encounter_story_records e
          JOIN encounter_story_thread_presence p1
            ON p1.encounter_ref=e.encounter_id AND p1.thread_id=?
          JOIN encounter_story_thread_presence p2
            ON p2.encounter_ref=e.encounter_id AND p2.thread_id=?
          WHERE e.occurred_at=i.occurred_at
            AND EXISTS (
              SELECT 1 FROM json_each(e.story_json,'$.beats') beat
              WHERE json_extract(beat.value,'$.kind')='utterance'
            )
        ) LIMIT 1
    `).get(before,observerId,otherId,otherId,observerId,observerId,otherId)!==undefined;
  }

  // Conversations this Thread took part in: it spoke and someone spoke with it.
  // A one-shot small act holds one speaker, so a greeting alone never qualifies.
  listReciprocalConversations(threadId,{since,until,limit=8}={}){
    assertId("Reciprocal conversation threadId",threadId);
    assertIsoTimestamp("Reciprocal conversation since",since);
    assertIsoTimestamp("Reciprocal conversation until",until);
    if(!Number.isSafeInteger(limit)||limit<1||limit>32){
      throw new TypeError("Reciprocal conversation limit must be 1-32");
    }
    return this.#database.prepare(`
      SELECT own.encounter_ref AS encounterRef,own.occurred_at AS occurredAt
      FROM thread_encounter_story_timeline own
      JOIN encounter_story_records e ON e.encounter_id=own.encounter_ref
      WHERE own.thread_id=? AND own.occurred_at BETWEEN ? AND ?
        AND EXISTS (SELECT 1 FROM json_each(e.story_json,'$.beats') beat
          WHERE json_extract(beat.value,'$.kind')='utterance'
            AND json_extract(beat.value,'$.actorThreadId')=?)
        AND EXISTS (SELECT 1 FROM json_each(e.story_json,'$.beats') beat
          WHERE json_extract(beat.value,'$.kind')='utterance'
            AND json_extract(beat.value,'$.actorThreadId')<>?)
      ORDER BY own.occurred_at DESC,own.encounter_ref DESC
      LIMIT ?
    `).all(threadId,since,until,threadId,threadId,limit);
  }

  // Lived social exposure in a window, newest first: each conversation the
  // Thread spoke in (with how many turns passed and who else spoke) and each
  // message it sent or received. Facts for the social Body; no judgment.
  listSocialExposures(threadId,{since,until,limit=16}={}){
    assertId("social exposure threadId",threadId);
    assertIsoTimestamp("social exposure since",since);
    assertIsoTimestamp("social exposure until",until);
    if(!Number.isSafeInteger(limit)||limit<1||limit>32)throw new TypeError("social exposure limit must be 1-32");
    const talk=this.#database.prepare(`
      SELECT own.encounter_ref AS ref,own.occurred_at AS at,e.story_json AS story
      FROM thread_encounter_story_timeline own
      JOIN encounter_story_records e ON e.encounter_id=own.encounter_ref
      WHERE own.thread_id=? AND own.occurred_at BETWEEN ? AND ?
        AND EXISTS (SELECT 1 FROM json_each(e.story_json,'$.beats') beat
          WHERE json_extract(beat.value,'$.kind')='utterance'
            AND json_extract(beat.value,'$.actorThreadId')=?)
      ORDER BY own.occurred_at DESC,own.encounter_ref DESC LIMIT ?
    `).all(threadId,since,until,threadId,limit).map(row=>{
      const spoken=JSON.parse(row.story).beats.filter(beat=>beat.kind==="utterance");
      const other=spoken.find(beat=>beat.actorThreadId!==threadId)??null;
      return {kind:"conversation",ref:row.ref,at:row.at,turns:spoken.length,
        otherThreadId:other?.actorThreadId??null};
    });
    const messages=!worldTableExists(this.#database,"thread_contact_messages")?[]:this.#database.prepare(`
      SELECT message_id AS ref,sent_at AS at,sender_thread_id AS sender,recipient_party_id AS recipient,
        recipient_kind AS recipientKind
      FROM thread_contact_messages
      WHERE (sender_thread_id=? OR (recipient_kind='thread' AND recipient_party_id=?))
        AND sent_at BETWEEN ? AND ?
      ORDER BY sent_at DESC,message_id DESC LIMIT ?
    `).all(threadId,threadId,since,until,limit).map(row=>{
      const other=row.sender===threadId?row.recipient:row.sender;
      return {kind:"message",ref:row.ref,at:row.at,turns:1,
        otherThreadId:other.startsWith("thr_")?other:null};
    });
    return Object.freeze([...talk,...messages]
      .sort((a,b)=>b.at.localeCompare(a.at)||b.ref.localeCompare(a.ref)).slice(0,limit)
      .map(item=>Object.freeze(item)));
  }

  // The relational acts World recorded between two Threads before a time,
  // newest first: facts (offered, accepted, declined, kept, broken, …), each
  // by the Thread that did it.
  listPairActs(threadId,otherThreadId,{before,limit=48}={}){
    assertId("relational acts Thread",threadId);
    assertId("relational acts person",otherThreadId);
    assertIsoTimestamp("relational acts before",before);
    if(!Number.isSafeInteger(limit)||limit<1||limit>96)throw new TypeError("relational acts must be bounded");
    if(threadId===otherThreadId||!worldTableExists(this.#database,"relationship_ledger"))return Object.freeze([]);
    const [a,b]=threadId<otherThreadId?[threadId,otherThreadId]:[otherThreadId,threadId];
    return Object.freeze(this.#database.prepare(`
      SELECT door,kind,actor_thread_id AS actorThreadId,occurred_at AS occurredAt FROM relationship_ledger
      WHERE thread_a=? AND thread_b=? AND occurred_at<?
      ORDER BY occurred_at DESC LIMIT ?
    `).all(a,b,before,limit).map(row=>Object.freeze({...row})));
  }

  // The doors two Threads have open to each other at a time: facts, for the
  // social Body's bond (ADR-0036 R2).
  listOpenDoors(threadId,otherThreadId,{before}={}){
    assertId("open doors Thread",threadId);
    assertId("open doors person",otherThreadId);
    assertIsoTimestamp("open doors before",before);
    if(threadId===otherThreadId||!worldTableExists(this.#database,"relationship_doors"))return Object.freeze([]);
    const [a,b]=threadId<otherThreadId?[threadId,otherThreadId]:[otherThreadId,threadId];
    return Object.freeze(this.#database.prepare(`
      SELECT door FROM relationship_doors WHERE thread_a=? AND thread_b=? AND opened_at<? ORDER BY door
    `).all(a,b,before).map(row=>row.door));
  }

  // What this Thread has lived with another, newest first, for the social
  // Body: Stories with both present that it noticed or in which both spoke
  // (a conversation, with its turns), and messages between them. The most
  // recent are enough: past sixty-odd contacts a person is fully known.
  listSharedContact(threadId,otherThreadId,{before,limit=64}={}){
    assertId("shared contact Thread",threadId);
    assertId("shared contact person",otherThreadId);
    assertIsoTimestamp("shared contact before",before);
    if(!Number.isSafeInteger(limit)||limit<1||limit>96)throw new TypeError("shared contact must be bounded");
    const stories=this.#database.prepare(`
      SELECT t.occurred_at AS at,
        (SELECT COUNT(*) FROM json_each(e.story_json,'$.beats') beat WHERE json_extract(beat.value,'$.kind')='utterance'
          AND json_extract(beat.value,'$.actorThreadId')=t.thread_id) AS mine,
        (SELECT COUNT(*) FROM json_each(e.story_json,'$.beats') beat WHERE json_extract(beat.value,'$.kind')='utterance'
          AND json_extract(beat.value,'$.actorThreadId')=other.thread_id) AS theirs,
        (SELECT COUNT(*) FROM json_each(e.story_json,'$.beats') beat WHERE json_extract(beat.value,'$.completion')='interrupted'
          AND json_extract(beat.value,'$.actorThreadId')=t.thread_id) AS mineCut,
        (SELECT COUNT(*) FROM json_each(e.story_json,'$.beats') beat WHERE json_extract(beat.value,'$.completion')='interrupted'
          AND json_extract(beat.value,'$.actorThreadId')=other.thread_id) AS theirsCut,
        (SELECT COUNT(*) FROM encounter_story_thread_presence present WHERE present.encounter_ref=t.encounter_ref) AS present
      FROM thread_encounter_story_timeline t
      JOIN encounter_story_thread_presence other
        ON other.encounter_ref=t.encounter_ref AND other.thread_id=?
      JOIN encounter_story_records e ON e.encounter_id=t.encounter_ref
      LEFT JOIN thread_encounter_attention a
        ON a.encounter_ref=t.encounter_ref AND a.thread_id=t.thread_id
      WHERE t.thread_id=? AND t.occurred_at<?
        AND (a.outcome='noticed' OR (mine>0 AND theirs>0))
      ORDER BY t.occurred_at DESC LIMIT ?
    `).all(otherThreadId,threadId,before,limit)
      .map(row=>row.mine>0&&row.theirs>0
        ?{at:row.at,kind:"conversation",turns:row.mine+row.theirs,
          interrupted:{me:row.mineCut,them:row.theirsCut},witnesses:Math.max(0,row.present-2)}
        :{at:row.at,kind:"noticed",turns:0});
    const messages=!worldTableExists(this.#database,"thread_contact_messages")?[]:this.#database.prepare(`
      SELECT sent_at AS at FROM thread_contact_messages
      WHERE ((sender_thread_id=? AND recipient_party_id=?) OR (sender_thread_id=? AND recipient_party_id=?))
        AND sent_at<?
      ORDER BY sent_at DESC LIMIT ?
    `).all(threadId,otherThreadId,otherThreadId,threadId,before,limit).map(row=>({at:row.at,kind:"message",turns:1}));
    return Object.freeze([...stories,...messages].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,limit)
      .map(item=>Object.freeze(item)));
  }

  listAcceptedHumanMeetings(threadId,{since,until,limit=8}={}){
    assertId("Human meeting threadId",threadId);
    assertIsoTimestamp("Human meeting since",since);
    assertIsoTimestamp("Human meeting until",until);
    if(!Number.isSafeInteger(limit)||limit<1||limit>32){
      throw new TypeError("Human meeting limit must be 1-32");
    }
    return this.#database.prepare(`
      SELECT a.encounter_ref AS encounterRef,e.occurred_at AS occurredAt
      FROM public_encounter_admissions a
      JOIN encounter_story_records e ON e.encounter_id=a.encounter_ref
      WHERE a.thread_id=? AND e.occurred_at BETWEEN ? AND ?
      ORDER BY e.occurred_at DESC,e.encounter_id DESC
      LIMIT ?
    `).all(threadId,since,until,limit);
  }

  recordThreadExperience(candidate) {
    assertId("Thread experience.threadId", candidate.threadId);
    assertId("Thread experience.encounterRef", candidate.encounterRef);
    assertId("Thread experience.situationId", candidate.situationId);
    assertIsoTimestamp("Thread experience.occurredAt", candidate.occurredAt);
    if (candidate.experienceText !== null && candidate.experienceText !== undefined) {
      assertNonEmpty("Thread experience.experienceText", candidate.experienceText);
    }
    const normalizedCandidate = { ...candidate, experienceText:candidate.experienceText ?? null };
    const experienceId = threadExperienceId(normalizedCandidate);
    const record = { experienceId, ...normalizedCandidate };
    const recordDigest = digest(record);

    try {
      const presence = this.#database.prepare(`
        SELECT situation_id FROM encounter_story_thread_presence
        WHERE encounter_ref=? AND thread_id=?
      `).get(candidate.encounterRef,candidate.threadId);
      if (presence === undefined) throw new TypeError("Thread experience requires admitted encounter presence");
      if (presence.situation_id !== candidate.situationId) {
        throw new TypeError("Thread experience situation does not match encounter presence");
      }
      const encounter = this.#database.prepare(
        "SELECT occurred_at FROM encounter_story_records WHERE encounter_id=?",
      ).get(candidate.encounterRef);
      if (encounter === undefined) throw new TypeError(`encounter story ${candidate.encounterRef} was not found`);
      if (encounter.occurred_at !== candidate.occurredAt) {
        throw new TypeError("Thread experience time must match encounter story");
      }
      const prior = this.#database.prepare(
        "SELECT record_digest FROM thread_encounter_experiences WHERE experience_id=?",
      ).get(experienceId);
      if (prior !== undefined) {
        if (prior.record_digest !== recordDigest) throw new TypeError(`Thread experience ${experienceId} conflicts`);
        return record;
      }
      this.#database.prepare(`
        INSERT INTO thread_encounter_experiences(
          experience_id,thread_id,encounter_ref,situation_id,occurred_at,experience_text,record_digest
        ) VALUES (?,?,?,?,?,?,?)
      `).run(
        experienceId,normalizedCandidate.threadId,normalizedCandidate.encounterRef,
        normalizedCandidate.situationId,normalizedCandidate.occurredAt,
        normalizedCandidate.experienceText,recordDigest,
      );
      return record;
    } catch (error) { throw translateStorageError(error); }
  }

  getThreadExperience(experienceId,{required=true}={}) {
    assertId("Thread experienceId",experienceId);
    const row=this.#database.prepare(`
      SELECT experience_id,thread_id,encounter_ref,situation_id,occurred_at,experience_text
      FROM thread_encounter_experiences
      WHERE experience_id=?
    `).get(experienceId);
    if(row===undefined){
      if(!required)return null;
      throw new TypeError(`Thread experience ${experienceId} was not found`);
    }
    return {
      experienceId:row.experience_id,
      threadId:row.thread_id,
      encounterRef:row.encounter_ref,
      situationId:row.situation_id,
      occurredAt:row.occurred_at,
      experienceText:row.experience_text,
    };
  }

  getThreadEncounterAttention(threadId, encounterRef) {
    assertId("attention threadId", threadId);
    assertId("attention encounterRef", encounterRef);
    const row = this.#database.prepare(`
      SELECT thread_id,encounter_ref,situation_id,occurred_at,outcome,passed_reason
      FROM thread_encounter_attention
      WHERE thread_id=? AND encounter_ref=?
    `).get(threadId,encounterRef);
    if (row === undefined) return null;
    const experience = row.outcome === "noticed"
      ? this.#database.prepare(`
          SELECT experience_id,thread_id,encounter_ref,situation_id,occurred_at,experience_text
          FROM thread_encounter_experiences
          WHERE thread_id=? AND encounter_ref=?
        `).get(threadId,encounterRef)
      : null;
    if (row.outcome === "noticed" && experience === undefined) {
      throw new TypeError("noticed encounter is missing Thread Experience");
    }
    return {
      threadId:row.thread_id,
      encounterRef:row.encounter_ref,
      situationId:row.situation_id,
      occurredAt:row.occurred_at,
      outcome:row.outcome,
      passedReason:row.passed_reason,
      experience:experience === null ? null : {
        experienceId:experience.experience_id,
        threadId:experience.thread_id,
        encounterRef:experience.encounter_ref,
        situationId:experience.situation_id,
        occurredAt:experience.occurred_at,
        experienceText:experience.experience_text,
      },
    };
  }

  recordThreadEncounterAttention(candidate) {
    assertId("attention.threadId", candidate.threadId);
    assertId("attention.encounterRef", candidate.encounterRef);
    assertId("attention.situationId", candidate.situationId);
    assertIsoTimestamp("attention.occurredAt", candidate.occurredAt);
    if (!["noticed","not_noticed"].includes(candidate.outcome)) {
      throw new TypeError("attention outcome is invalid");
    }
    if (candidate.outcome === "noticed") assertNonEmpty("attention.experienceText", candidate.experienceText);
    if (candidate.outcome === "not_noticed" && candidate.experienceText !== null) {
      throw new TypeError("not_noticed cannot carry experience text");
    }
    const passedReason=candidate.passedReason??null;
    if(passedReason!==null){
      if(candidate.outcome!=="not_noticed")
        throw new TypeError("noticed cannot carry a passed reason");
      assertNonEmpty("attention.passedReason",passedReason);
      if(passedReason.length>300)throw new TypeError("attention.passedReason exceeds 300 characters");
    }
    const attention = {
      threadId:candidate.threadId,
      encounterRef:candidate.encounterRef,
      situationId:candidate.situationId,
      occurredAt:candidate.occurredAt,
      outcome:candidate.outcome,
    };
    // Preserve the historical digest contract: this private explanation
    // is not part of the immutable attention identity or replay digest.
    const attentionDigest = digest(attention);

    try {
      return this.#database.transaction(() => {
        const presence = this.#database.prepare(`
          SELECT situation_id FROM encounter_story_thread_presence
          WHERE encounter_ref=? AND thread_id=?
        `).get(candidate.encounterRef,candidate.threadId);
        if (presence === undefined) throw new TypeError("attention requires admitted encounter presence");
        if (presence.situation_id !== candidate.situationId) {
          throw new TypeError("attention situation does not match encounter presence");
        }
        const encounter = this.#database.prepare(
          "SELECT occurred_at FROM encounter_story_records WHERE encounter_id=?",
        ).get(candidate.encounterRef);
        if (encounter === undefined || encounter.occurred_at !== candidate.occurredAt) {
          throw new TypeError("attention time must match Encounter Story");
        }

        const prior = this.#database.prepare(`
          SELECT record_digest,passed_reason FROM thread_encounter_attention
          WHERE thread_id=? AND encounter_ref=?
        `).get(candidate.threadId,candidate.encounterRef);
        if (prior !== undefined) {
          if (prior.record_digest !== attentionDigest||prior.passed_reason!==passedReason)
            throw new TypeError("encounter attention conflicts");
          return this.getThreadEncounterAttention(candidate.threadId,candidate.encounterRef);
        }

        this.#database.prepare(`
          INSERT INTO thread_encounter_attention(
            thread_id,encounter_ref,situation_id,occurred_at,outcome,passed_reason,record_digest
          ) VALUES (?,?,?,?,?,?,?)
        `).run(
          candidate.threadId,candidate.encounterRef,candidate.situationId,
          candidate.occurredAt,candidate.outcome,passedReason,attentionDigest,
        );

        let experience = null;
        if (candidate.outcome === "noticed") {
          const experienceId = threadExperienceId(candidate);
          const experienceRecord = {
            experienceId,
            threadId:candidate.threadId,
            encounterRef:candidate.encounterRef,
            situationId:candidate.situationId,
            occurredAt:candidate.occurredAt,
            experienceText:candidate.experienceText,
          };
          this.#database.prepare(`
            INSERT INTO thread_encounter_experiences(
              experience_id,thread_id,encounter_ref,situation_id,occurred_at,experience_text,record_digest
            ) VALUES (?,?,?,?,?,?,?)
          `).run(
            experienceId,candidate.threadId,candidate.encounterRef,candidate.situationId,
            candidate.occurredAt,candidate.experienceText,digest(experienceRecord),
          );
          experience = experienceRecord;
        }

        return { ...attention,passedReason, experience };
      });
    } catch (error) { throw translateStorageError(error); }
  }

  recordThreadExperienceJournalEntry(candidate) {
    assertId("experience journal.threadId", candidate.threadId);
    assertId("experience journal.aboutExperienceRef", candidate.aboutExperienceRef);
    assertIsoTimestamp("experience journal.writtenAt", candidate.writtenAt);
    assertNonEmpty("experience journal.entryText", candidate.entryText);
    const journalEntryIdValue = experienceJournalEntryId(candidate);
    const record = { journalEntryId:journalEntryIdValue, ...candidate };
    const recordDigest = digest(record);

    try {
      const experience = this.#database.prepare(`
        SELECT thread_id,occurred_at FROM thread_encounter_experiences
        WHERE experience_id=?
      `).get(candidate.aboutExperienceRef);
      if (experience === undefined) throw new TypeError(`Thread experience ${candidate.aboutExperienceRef} was not found`);
      if (experience.thread_id !== candidate.threadId) {
        throw new TypeError("experience journal cannot cite another Thread's experience");
      }
      if (Date.parse(candidate.writtenAt) < Date.parse(experience.occurred_at)) {
        throw new TypeError("experience journal cannot predate its experience");
      }
      const prior = this.#database.prepare(`
        SELECT journal_entry_id,entry_text,written_at
        FROM thread_encounter_journal_entries
        WHERE thread_id=? AND about_experience_ref=?
      `).get(candidate.threadId,candidate.aboutExperienceRef);
      if (prior !== undefined) {
        if (prior.journal_entry_id !== journalEntryIdValue
          || prior.entry_text !== candidate.entryText
          || prior.written_at !== candidate.writtenAt) {
          throw new TypeError(`Thread experience ${candidate.aboutExperienceRef} already has a different journal entry`);
        }
        return record;
      }
      this.#database.prepare(`
        INSERT INTO thread_encounter_journal_entries(
          journal_entry_id,thread_id,about_experience_ref,written_at,entry_text,record_digest
        ) VALUES (?,?,?,?,?,?)
      `).run(
        journalEntryIdValue,candidate.threadId,candidate.aboutExperienceRef,
        candidate.writtenAt,candidate.entryText,recordDigest,
      );
      return record;
    } catch (error) { throw translateStorageError(error); }
  }

  queueThreadExperienceConsolidation({ experienceId, queuedAt }) {
    assertId("consolidation queue experienceId", experienceId);
    assertIsoTimestamp("consolidation queue queuedAt", queuedAt);
    try {
      const experience=this.#database.prepare(`
        SELECT thread_id,occurred_at FROM thread_encounter_experiences WHERE experience_id=?
      `).get(experienceId);
      if(experience===undefined)throw new TypeError(`Thread experience ${experienceId} was not found`);
      if(Date.parse(queuedAt)<Date.parse(experience.occurred_at)){
        throw new TypeError("consolidation queue cannot predate its Thread experience");
      }
      const record={
        experienceId,
        threadId:experience.thread_id,
        queuedAt,
      };
      const recordDigest=digest(record);
      const prior=this.#database.prepare(`
        SELECT thread_id,queued_at,record_digest
        FROM thread_experience_consolidation_queue
        WHERE experience_id=?
      `).get(experienceId);
      if(prior!==undefined){
        if(prior.thread_id!==record.threadId
          ||prior.queued_at!==record.queuedAt
          ||prior.record_digest!==recordDigest){
          throw new TypeError(`consolidation queue ${experienceId} conflicts`);
        }
        return record;
      }
      this.#database.prepare(`
        INSERT INTO thread_experience_consolidation_queue(
          experience_id,thread_id,queued_at,record_digest
        ) VALUES (?,?,?,?)
      `).run(experienceId,record.threadId,queuedAt,recordDigest);
      return record;
    }catch(error){throw translateStorageError(error);}
  }

  listUnclaimedExperienceConsolidationCandidates({ limit=32 }={}) {
    if(!Number.isSafeInteger(limit)||limit<1||limit>128){
      throw new TypeError("consolidation candidate limit must be 1-128");
    }
    return this.#database.prepare(`
      SELECT q.experience_id,q.thread_id,q.queued_at,
        e.encounter_ref,e.situation_id,e.occurred_at,e.experience_text
      FROM thread_experience_pending_work w
      JOIN thread_experience_consolidation_queue q ON q.experience_id=w.reference
      JOIN thread_encounter_experiences e ON e.experience_id=w.reference
      WHERE w.kind='unclaimed' AND NOT EXISTS (SELECT 1 FROM thread_life_rest life_rest WHERE life_rest.thread_id=q.thread_id)
      ORDER BY w.due_at,w.reference
      LIMIT ?
    `).all(limit).map((row)=>({
      experienceId:row.experience_id,
      threadId:row.thread_id,
      queuedAt:row.queued_at,
      encounterRef:row.encounter_ref,
      situationId:row.situation_id,
      occurredAt:row.occurred_at,
      experienceText:row.experience_text,
    }));
  }

  createThreadExperienceConsolidation({ threadId, experienceRefs, startedAt }) {
    assertId("experience consolidation threadId",threadId);
    assertIsoTimestamp("experience consolidation startedAt",startedAt);
    if(!Array.isArray(experienceRefs)||experienceRefs.length<1){
      throw new TypeError("experience consolidation requires experienceRefs");
    }
    const refs=[...new Set(experienceRefs)];
    if(refs.length!==experienceRefs.length)throw new TypeError("experience consolidation experienceRefs must be unique");
    for(const ref of refs)assertId("experience consolidation experienceRef",ref);
    const consolidationId=experienceConsolidationId({threadId,experienceRefs:refs});
    const record={consolidationId,threadId,startedAt,experienceRefs:refs};
    const recordDigest=digest(record);

    try{
      return this.#database.transaction(()=>{
        for(const ref of refs){
          const row=this.#database.prepare(`
            SELECT e.thread_id,e.occurred_at,q.experience_id AS queued_experience_id,
              m.consolidation_id AS claimed_by
            FROM thread_encounter_experiences e
            LEFT JOIN thread_experience_consolidation_queue q ON q.experience_id=e.experience_id
            LEFT JOIN thread_experience_consolidation_members m ON m.experience_id=e.experience_id
            WHERE e.experience_id=?
          `).get(ref);
          if(row===undefined||row.thread_id!==threadId){
            throw new TypeError("consolidation experience belongs to another Thread");
          }
          if(row.queued_experience_id===null){
            throw new TypeError("consolidation experience was not queued");
          }
          if(Date.parse(startedAt)<Date.parse(row.occurred_at)){
            throw new TypeError("experience consolidation cannot predate its lived evidence");
          }
          if(row.claimed_by!==null&&row.claimed_by!==consolidationId){
            throw new TypeError(`Thread experience ${ref} already belongs to another consolidation`);
          }
        }

        const prior=this.#database.prepare(`
          SELECT thread_id,started_at,experience_refs_json,record_digest
          FROM thread_experience_consolidations WHERE consolidation_id=?
        `).get(consolidationId);
        if(prior!==undefined){
          if(prior.thread_id!==threadId||prior.started_at!==startedAt
            ||prior.experience_refs_json!==canonicalJson(refs)||prior.record_digest!==recordDigest){
            throw new TypeError(`experience consolidation ${consolidationId} conflicts`);
          }
          return record;
        }

        this.#database.prepare(`
          INSERT INTO thread_experience_consolidations(
            consolidation_id,thread_id,started_at,experience_refs_json,record_digest
          ) VALUES (?,?,?,?,?)
        `).run(consolidationId,threadId,startedAt,canonicalJson(refs),recordDigest);

        const insertMember=this.#database.prepare(`
          INSERT INTO thread_experience_consolidation_members(
            experience_id,consolidation_id,ordinal
          ) VALUES (?,?,?)
        `);
        refs.forEach((ref,ordinal)=>insertMember.run(ref,consolidationId,ordinal));
        return record;
      });
    }catch(error){throw translateStorageError(error);}
  }

  getThreadExperienceConsolidation(consolidationId,{required=true}={}) {
    assertId("experience consolidationId",consolidationId);
    const row=this.#database.prepare(`
      SELECT consolidation_id,thread_id,started_at,experience_refs_json
      FROM thread_experience_consolidations WHERE consolidation_id=?
    `).get(consolidationId);
    if(row===undefined){
      if(!required)return null;
      throw new TypeError(`experience consolidation ${consolidationId} was not found`);
    }
    return {
      consolidationId:row.consolidation_id,
      threadId:row.thread_id,
      startedAt:row.started_at,
      experienceRefs:JSON.parse(row.experience_refs_json),
    };
  }

  listPendingThreadExperienceConsolidations({limit=4}={}) {
    if(!Number.isSafeInteger(limit)||limit<1||limit>32){
      throw new TypeError("pending consolidation limit must be 1-32");
    }
    return this.#database.prepare(`
      SELECT c.consolidation_id,c.thread_id,c.started_at,c.experience_refs_json
      FROM thread_experience_pending_work w
      JOIN thread_experience_consolidations c ON c.consolidation_id=w.reference
      WHERE w.kind='consolidation' AND NOT EXISTS (SELECT 1 FROM thread_life_rest life_rest WHERE life_rest.thread_id=c.thread_id)
      ORDER BY w.due_at,w.reference
      LIMIT ?
    `).all(limit).map((row)=>({
      consolidationId:row.consolidation_id,
      threadId:row.thread_id,
      startedAt:row.started_at,
      experienceRefs:JSON.parse(row.experience_refs_json),
    }));
  }

  recordThreadExperienceConsolidationStage({
    consolidationId,
    stage,
    recordedAt,
    payload,
  }) {
    assertId("experience consolidation stage consolidationId",consolidationId);
    if(!["decision","complete"].includes(stage)){
      throw new TypeError("experience consolidation stage is invalid");
    }
    assertIsoTimestamp("experience consolidation stage recordedAt",recordedAt);
    if(payload===null||typeof payload!=="object"||Array.isArray(payload)){
      throw new TypeError("experience consolidation stage payload must be an object");
    }
    const record={consolidationId,stage,recordedAt,payload:structuredClone(payload)};
    const recordDigest=digest(record);
    try{
      const consolidation=this.getThreadExperienceConsolidation(consolidationId,{required:false});
      if(consolidation===null){
        throw new TypeError(`experience consolidation ${consolidationId} was not found`);
      }
      if(Date.parse(recordedAt)<Date.parse(consolidation.startedAt)){
        throw new TypeError("experience consolidation stage cannot predate its claim");
      }
      if(stage==="complete"
        &&this.getThreadExperienceConsolidationStage(consolidationId,"decision")===null){
        throw new TypeError("experience consolidation cannot complete before its decision");
      }
      const prior=this.#database.prepare(`
        SELECT recorded_at,payload_json,record_digest
        FROM thread_experience_consolidation_stages
        WHERE consolidation_id=? AND stage=?
      `).get(consolidationId,stage);
      if(prior!==undefined){
        if(prior.recorded_at!==recordedAt
          ||prior.payload_json!==canonicalJson(record.payload)
          ||prior.record_digest!==recordDigest){
          throw new TypeError(`experience consolidation ${consolidationId} stage ${stage} conflicts`);
        }
        return record;
      }
      this.#database.prepare(`
        INSERT INTO thread_experience_consolidation_stages(
          consolidation_id,stage,recorded_at,payload_json,record_digest
        ) VALUES (?,?,?,?,?)
      `).run(consolidationId,stage,recordedAt,canonicalJson(record.payload),recordDigest);
      return record;
    }catch(error){throw translateStorageError(error);}
  }

  getThreadExperienceConsolidationStage(consolidationId,stage) {
    assertId("experience consolidation stage consolidationId",consolidationId);
    if(!["decision","complete"].includes(stage)){
      throw new TypeError("experience consolidation stage is invalid");
    }
    const row=this.#database.prepare(`
      SELECT recorded_at,payload_json
      FROM thread_experience_consolidation_stages
      WHERE consolidation_id=? AND stage=?
    `).get(consolidationId,stage);
    return row===undefined?null:{
      consolidationId,
      stage,
      recordedAt:row.recorded_at,
      payload:JSON.parse(row.payload_json),
    };
  }

  recordThreadExperienceConsolidationJournal({
    consolidationId,
    threadId,
    writtenAt,
    entryText,
  }) {
    assertId("consolidation journal consolidationId",consolidationId);
    assertId("consolidation journal threadId",threadId);
    assertIsoTimestamp("consolidation journal writtenAt",writtenAt);
    assertNonEmpty("consolidation journal entryText",entryText);
    const journalEntryIdValue=consolidationJournalEntryId({
      consolidationId,threadId,writtenAt,entryText,
    });
    const record={
      journalEntryId:journalEntryIdValue,
      consolidationId,
      threadId,
      writtenAt,
      entryText,
    };
    const recordDigest=digest(record);
    try{
      const consolidation=this.getThreadExperienceConsolidation(consolidationId);
      if(consolidation.threadId!==threadId)throw new TypeError("consolidation journal belongs to another Thread");
      if(Date.parse(writtenAt)<Date.parse(consolidation.startedAt)){
        throw new TypeError("consolidation journal cannot predate its claim");
      }
      const prior=this.#database.prepare(`
        SELECT journal_entry_id,written_at,entry_text,record_digest
        FROM thread_experience_consolidation_journal_entries
        WHERE consolidation_id=?
      `).get(consolidationId);
      if(prior!==undefined){
        if(prior.journal_entry_id!==journalEntryIdValue||prior.written_at!==writtenAt
          ||prior.entry_text!==entryText||prior.record_digest!==recordDigest){
          throw new TypeError(`experience consolidation ${consolidationId} already has a different journal entry`);
        }
        return record;
      }
      this.#database.prepare(`
        INSERT INTO thread_experience_consolidation_journal_entries(
          journal_entry_id,consolidation_id,thread_id,written_at,entry_text,record_digest
        ) VALUES (?,?,?,?,?,?)
      `).run(journalEntryIdValue,consolidationId,threadId,writtenAt,entryText,recordDigest);
      return record;
    }catch(error){throw translateStorageError(error);}
  }

  getThreadExperienceConsolidationJournal(consolidationId) {
    assertId("consolidation journal consolidationId",consolidationId);
    const row=this.#database.prepare(`
      SELECT journal_entry_id,consolidation_id,thread_id,written_at,entry_text
      FROM thread_experience_consolidation_journal_entries
      WHERE consolidation_id=?
    `).get(consolidationId);
    return row===undefined?null:{
      journalEntryId:row.journal_entry_id,
      consolidationId:row.consolidation_id,
      threadId:row.thread_id,
      writtenAt:row.written_at,
      entryText:row.entry_text,
    };
  }

  listCompletedAfterthoughtConsolidations({limit=64}={}) {
    if(!Number.isSafeInteger(limit)||limit<1||limit>256){
      throw new TypeError("completed afterthought consolidation limit must be 1-256");
    }
    return this.#database.prepare(`
      SELECT c.consolidation_id,c.thread_id,c.started_at,c.experience_refs_json,
        decision.recorded_at AS decision_recorded_at,
        decision.payload_json AS decision_payload_json,
        complete.recorded_at AS completed_at
      FROM thread_experience_consolidations c
      JOIN thread_experience_consolidation_stages decision
        ON decision.consolidation_id=c.consolidation_id AND decision.stage='decision'
      JOIN thread_experience_consolidation_stages complete
        ON complete.consolidation_id=c.consolidation_id AND complete.stage='complete'
      ORDER BY complete.recorded_at DESC,c.consolidation_id DESC
      LIMIT ?
    `).all(limit).map((row)=>{
      const payload=JSON.parse(row.decision_payload_json);
      return Object.freeze({
        consolidationId:row.consolidation_id,
        threadId:row.thread_id,
        startedAt:row.started_at,
        completedAt:row.completed_at,
        decisionRecordedAt:row.decision_recorded_at,
        experienceRefs:Object.freeze(JSON.parse(row.experience_refs_json)),
        afterthoughts:Object.freeze(
          Array.isArray(payload.afterthoughts)
            ?payload.afterthoughts.map((item)=>Object.freeze(structuredClone(item)))
            :[],
        ),
      });
    }).filter((item)=>item.afterthoughts.length>0);
  }

  inspectThreadExperienceConsolidation(threadId,{limit=100}={}) {
    assertId("threadId",threadId);
    if(!Number.isSafeInteger(limit)||limit<1||limit>500){
      throw new TypeError("experience consolidation inspection limit must be 1-500");
    }

    const queued=this.#database.prepare(`
      SELECT q.experience_id,q.queued_at,
        e.encounter_ref,e.situation_id,e.occurred_at,e.experience_text
      FROM thread_experience_consolidation_queue q
      JOIN thread_encounter_experiences e ON e.experience_id=q.experience_id
      LEFT JOIN thread_experience_consolidation_members m ON m.experience_id=q.experience_id
      WHERE q.thread_id=? AND m.experience_id IS NULL
      ORDER BY e.occurred_at,q.experience_id
      LIMIT ?
    `).all(threadId,limit).map((row)=>({
      experienceId:row.experience_id,
      queuedAt:row.queued_at,
      encounterRef:row.encounter_ref,
      situationId:row.situation_id,
      occurredAt:row.occurred_at,
      experienceText:row.experience_text,
    }));

    const consolidations=this.#database.prepare(`
      SELECT consolidation_id,started_at,experience_refs_json
      FROM thread_experience_consolidations
      WHERE thread_id=?
      ORDER BY started_at DESC,consolidation_id DESC
      LIMIT ?
    `).all(threadId,limit).map((row)=>{
      const consolidationId=row.consolidation_id;
      return {
        consolidationId,
        threadId,
        startedAt:row.started_at,
        experienceRefs:JSON.parse(row.experience_refs_json),
        decision:this.getThreadExperienceConsolidationStage(consolidationId,"decision"),
        complete:this.getThreadExperienceConsolidationStage(consolidationId,"complete"),
        journal:this.getThreadExperienceConsolidationJournal(consolidationId),
      };
    });

    return Object.freeze({
      queued:Object.freeze(queued),
      consolidations:Object.freeze(consolidations),
    });
  }

  hasPendingExperienceConsolidation() {
    return this.#database.prepare(`
      SELECT 1 AS pending FROM thread_experience_pending_work w
      LEFT JOIN thread_experience_consolidation_queue q
        ON w.kind='unclaimed' AND q.experience_id=w.reference
      LEFT JOIN thread_experience_consolidations c
        ON w.kind='consolidation' AND c.consolidation_id=w.reference
      WHERE w.kind IN ('unclaimed','consolidation')
        AND NOT EXISTS (SELECT 1 FROM thread_life_rest life_rest WHERE life_rest.thread_id IN (q.thread_id,c.thread_id)) LIMIT 1
    `).get()!==undefined;
  }

  recordEncounter(candidate) {
    assertId("encounter.threadId", candidate.threadId);
    assertId("encounter.situationId", candidate.situationId);
    assertIsoTimestamp("encounter.occurredAt", candidate.occurredAt);
    assertNonEmpty("encounter.visitorUtterance", candidate.visitorUtterance);
    assertNonEmpty("encounter.responseText", candidate.responseText);
    const core = {
      threadId:candidate.threadId,
      situationId:candidate.situationId,
      occurredAt:candidate.occurredAt,
      visitorUtterance:candidate.visitorUtterance,
      responseText:candidate.responseText,
    };
    const eventId = encounterEventId(core);
    const record = { eventId, ...core };
    const recordDigest = digest(record);

    try {
      const thread = this.#database.prepare(
        "SELECT 1 AS present FROM threads WHERE thread_id=?",
      ).get(candidate.threadId);
      if (thread === undefined) throw new TypeError(`Thread ${candidate.threadId} was not found`);
      const prior = this.#database.prepare(
        "SELECT record_digest FROM lived_encounter_records WHERE event_id=?",
      ).get(eventId);
      if (prior !== undefined) {
        if (prior.record_digest !== recordDigest) throw new TypeError(`encounter ${eventId} conflicts with its existing record`);
        return record;
      }
      this.#database.prepare(`
        INSERT INTO lived_encounter_records(
          event_id,thread_id,situation_id,occurred_at,visitor_utterance,response_text,record_digest
        ) VALUES (?,?,?,?,?,?,?)
      `).run(
        eventId,core.threadId,core.situationId,core.occurredAt,
        core.visitorUtterance,core.responseText,recordDigest,
      );
      return record;
    } catch (error) { throw translateStorageError(error); }
  }

  recordJournalEntry(candidate) {
    assertId("journal.threadId", candidate.threadId);
    assertId("journal.aboutEventRef", candidate.aboutEventRef);
    assertIsoTimestamp("journal.writtenAt", candidate.writtenAt);
    assertNonEmpty("journal.entryText", candidate.entryText);
    const journalEntryIdValue = journalEntryId(candidate);
    const record = { journalEntryId:journalEntryIdValue, ...candidate };
    const recordDigest = digest(record);

    try {
      const encounter = this.#database.prepare(
        "SELECT thread_id,occurred_at FROM lived_encounter_records WHERE event_id=?",
      ).get(candidate.aboutEventRef);
      if (encounter === undefined) throw new TypeError(`journal event ${candidate.aboutEventRef} was not found`);
      if (encounter.thread_id !== candidate.threadId) {
        throw new TypeError("journal entry cannot cite another Thread's encounter");
      }
      if (Date.parse(candidate.writtenAt) < Date.parse(encounter.occurred_at)) {
        throw new TypeError("journal entry cannot predate its encounter");
      }
      const prior = this.#database.prepare(
        "SELECT journal_entry_id,entry_text,written_at FROM thread_journal_entries WHERE thread_id=? AND about_event_ref=?",
      ).get(candidate.threadId,candidate.aboutEventRef);
      if (prior !== undefined) {
        if (prior.journal_entry_id !== journalEntryIdValue
          || prior.entry_text !== candidate.entryText
          || prior.written_at !== candidate.writtenAt) {
          throw new TypeError(`encounter ${candidate.aboutEventRef} already has a different journal entry`);
        }
        return record;
      }
      this.#database.prepare(`
        INSERT INTO thread_journal_entries(
          journal_entry_id,thread_id,about_event_ref,written_at,entry_text,record_digest
        ) VALUES (?,?,?,?,?,?)
      `).run(
        journalEntryIdValue,candidate.threadId,candidate.aboutEventRef,
        candidate.writtenAt,candidate.entryText,recordDigest,
      );
      return record;
    } catch (error) { throw translateStorageError(error); }
  }

  // One bounded newest-first operator read: story, presence, this Thread's
  // experienced attention, enacted situation and World follow-up are joined
  // after selecting the recent stories. No per-story store calls.
  inspectRecentEncounterStories(threadId,{limit=12}={}){
    assertId("story inspection Thread",threadId);
    if(!Number.isSafeInteger(limit)||limit<1||limit>24){
      throw new TypeError("recent story inspection must be bounded");
    }
    const rows=this.#database.prepare(`
      WITH recent AS (
        SELECT e.* FROM thread_encounter_story_timeline own
        JOIN encounter_story_records e ON e.encounter_id=own.encounter_ref
        WHERE own.thread_id=?
        ORDER BY own.occurred_at DESC,own.encounter_ref DESC LIMIT ?
      )
      SELECT e.*,
        p.thread_id AS participant_thread_id,p.situation_id AS participant_situation_id,
        sit.record_json AS situation_json,
        a.situation_id AS attention_situation_id,a.occurred_at AS attention_at,
        a.outcome AS attention_outcome,a.passed_reason AS attention_passed_reason,
        x.experience_id,x.situation_id AS experience_situation_id,
        x.occurred_at AS experience_at,x.experience_text,
        f.place_ref AS followup_place,f.due_at AS followup_due,
        f.decision_json AS followup_decision,
        f.result_encounter_ref AS followup_result,f.completed_at AS followup_completed,
        c.encounter_id AS continuation_id,c.occurred_at AS continuation_at,
        c.story_json AS continuation_story,
        c.visualization_prompt AS continuation_prompt,
        c.visualization_prompt_digest AS continuation_digest,
        c.visualization_source_refs_json AS continuation_sources,
        c.depicted_thread_refs_json AS continuation_depicted,
        cp.thread_id AS continuation_thread_id,cp.situation_id AS continuation_situation_id
      FROM recent e
      JOIN encounter_story_thread_presence p ON p.encounter_ref=e.encounter_id
      LEFT JOIN encounter_story_thread_presence own
        ON own.encounter_ref=e.encounter_id AND own.thread_id=?
      LEFT JOIN current_situation_records sit ON sit.situation_id=own.situation_id
      LEFT JOIN thread_encounter_attention a
        ON a.encounter_ref=e.encounter_id AND a.thread_id=?
      LEFT JOIN thread_encounter_experiences x
        ON x.encounter_ref=e.encounter_id AND x.thread_id=?
      LEFT JOIN world_environment_followups f ON f.source_encounter_ref=e.encounter_id
      LEFT JOIN encounter_story_records c ON c.encounter_id=f.result_encounter_ref
      LEFT JOIN encounter_story_thread_presence cp ON cp.encounter_ref=c.encounter_id
      ORDER BY e.occurred_at DESC,e.encounter_id DESC,p.thread_id,cp.thread_id
    `).all(threadId,limit,threadId,threadId,threadId);
    const stories=new Map();
    for(const row of rows){
      let story=stories.get(row.encounter_id);
      if(story===undefined){
        if(row.attention_outcome==="noticed"&&row.experience_id===null){
          throw new TypeError("noticed encounter is missing Thread Experience");
        }
        const continuation=row.continuation_id===null?null:{
          encounterId:row.continuation_id,occurredAt:row.continuation_at,
          threadPresence:[],story:JSON.parse(row.continuation_story),
          visualization:{
            visualizationPrompt:row.continuation_prompt,
            visualizationPromptDigest:row.continuation_digest,
            visualizationSourceReferences:JSON.parse(row.continuation_sources),
            depictedThreadRefs:JSON.parse(row.continuation_depicted),
          },
        };
        story={
          encounterId:row.encounter_id,occurredAt:row.occurred_at,
          threadPresence:[],story:JSON.parse(row.story_json),
          visualization:{
            visualizationPrompt:row.visualization_prompt,
            visualizationPromptDigest:row.visualization_prompt_digest,
            visualizationSourceReferences:JSON.parse(row.visualization_source_refs_json),
            depictedThreadRefs:JSON.parse(row.depicted_thread_refs_json),
          },
          situation:row.situation_json===null?null:JSON.parse(row.situation_json),
          attention:row.attention_outcome===null?null:{
            threadId,encounterRef:row.encounter_id,
            situationId:row.attention_situation_id,occurredAt:row.attention_at,
            outcome:row.attention_outcome,
            passedReason:row.attention_passed_reason,
            experience:row.experience_id===null?null:{
              experienceId:row.experience_id,threadId,
              encounterRef:row.encounter_id,situationId:row.experience_situation_id,
              occurredAt:row.experience_at,experienceText:row.experience_text,
            },
          },
          worldEnvironmentFollowup:row.followup_place===null?null:{
            sourceEncounterRef:row.encounter_id,placeRef:row.followup_place,
            dueAt:row.followup_due,
            outcome:row.followup_decision===null?"pending":JSON.parse(row.followup_decision).outcome,
            completedAt:row.followup_completed,continuation,
          },
        };
        stories.set(row.encounter_id,story);
      }
      if(!story.threadPresence.some(p=>p.threadId===row.participant_thread_id)){
        story.threadPresence.push({
          threadId:row.participant_thread_id,
          situationId:row.participant_situation_id,
        });
      }
      const continued=story.worldEnvironmentFollowup?.continuation;
      if(continued&&row.continuation_thread_id!==null
        &&!continued.threadPresence.some(p=>p.threadId===row.continuation_thread_id)){
        continued.threadPresence.push({
          threadId:row.continuation_thread_id,
          situationId:row.continuation_situation_id,
        });
      }
    }
    return [...stories.values()];
  }

  // Indexed, observer-owned noticed history of one actual co-present person.
  // The bounded read never substitutes another participant's private attention.
  listNoticedSharedHistory(observerThreadId,otherThreadId,{before,limit=12}={}){
    assertId("familiarity observer",observerThreadId);
    assertId("familiarity counterpart",otherThreadId);
    assertIsoTimestamp("familiarity before",before);
    if(!Number.isSafeInteger(limit)||limit<1||limit>24)
      throw new TypeError("familiarity history must be bounded");
    return this.#database.prepare(`
      SELECT a.encounter_ref,a.occurred_at,a.situation_id,
        x.experience_text
      FROM thread_encounter_story_timeline t
      JOIN encounter_story_thread_presence other
        ON other.encounter_ref=t.encounter_ref AND other.thread_id=?
      JOIN thread_encounter_attention a
        ON a.encounter_ref=t.encounter_ref AND a.thread_id=t.thread_id
      JOIN thread_encounter_experiences x
        ON x.encounter_ref=a.encounter_ref AND x.thread_id=a.thread_id
      WHERE t.thread_id=? AND t.occurred_at<? AND a.outcome='noticed'
      ORDER BY t.occurred_at DESC,t.encounter_ref DESC LIMIT ?
    `).all(otherThreadId,observerThreadId,before,limit).map(row=>Object.freeze({
      encounterRef:row.encounter_ref,occurredAt:row.occurred_at,
      situationId:row.situation_id,experienceText:row.experience_text,
    }));
  }

  // Prefer a Memory for a particular person only when that person acted in
  // the Thread's noticed Story. Mere bystander presence does not establish
  // what the observer's Experience was about. Other Memories remain eligible
  // for ordinary (non-person-specific) retrieval.
  listSharedExperienceRefs(threadId,otherThreadId,{before,limit=64}={}){
    assertId("social memory Thread",threadId);
    assertId("social memory person",otherThreadId);
    assertIsoTimestamp("social memory before",before);
    if(!Number.isSafeInteger(limit)||limit<1||limit>128)
      throw new TypeError("social memory linkage must be bounded");
    return this.#database.prepare(`
      SELECT x.experience_id
      FROM thread_encounter_story_timeline t
      JOIN encounter_story_thread_presence other
        ON other.encounter_ref=t.encounter_ref AND other.thread_id=?
      JOIN thread_encounter_experiences x
        ON x.encounter_ref=t.encounter_ref AND x.thread_id=t.thread_id
      JOIN encounter_story_records story
        ON story.encounter_id=t.encounter_ref
      WHERE t.thread_id=? AND t.occurred_at<=?
        AND EXISTS (
          SELECT 1 FROM json_each(story.story_json,'$.beats') beat
          WHERE json_extract(beat.value,'$.actorThreadId')=?
        )
      ORDER BY t.occurred_at DESC,t.encounter_ref DESC LIMIT ?
    `).all(otherThreadId,threadId,before,otherThreadId,limit)
      .map(row=>row.experience_id);
  }

  heardSelfIntroductionName(observerThreadId,otherThreadId,{before}={}){
    assertId("heard introduction observer",observerThreadId);
    assertId("heard introduction speaker",otherThreadId);
    assertIsoTimestamp("heard introduction before",before);
    return this.#database.prepare(`
      SELECT json_extract(beat.value,'$.disclosedName') AS name
      FROM thread_encounter_story_timeline t
      JOIN encounter_story_thread_presence speaker
        ON speaker.encounter_ref=t.encounter_ref AND speaker.thread_id=?
      JOIN thread_encounter_attention attention
        ON attention.thread_id=t.thread_id
          AND attention.encounter_ref=t.encounter_ref
          AND attention.outcome='noticed'
      JOIN encounter_story_records story
        ON story.encounter_id=t.encounter_ref
      JOIN json_each(story.story_json,'$.beats') beat
      WHERE t.thread_id=? AND t.occurred_at<?
        AND json_extract(beat.value,'$.actorThreadId')=?
        AND json_extract(beat.value,'$.kind')='utterance'
        AND json_extract(beat.value,'$.disclosesSpeakerName')=1
        AND json_type(beat.value,'$.disclosedName')='text'
      ORDER BY t.occurred_at DESC,t.encounter_ref DESC
      LIMIT 1
    `).get(otherThreadId,observerThreadId,before,otherThreadId)?.name??null;
  }

  listEncounterStories(threadId,{limit=null}={}) {
    assertId("threadId", threadId);
    if(limit!==null&&(!Number.isSafeInteger(limit)||limit<1||limit>100)){
      throw new TypeError("recent Encounter Story limit must be 1-100");
    }
    const rows=limit===null?this.#database.prepare(`
      SELECT encounter_ref FROM encounter_story_thread_presence
      WHERE thread_id=? ORDER BY encounter_ref
    `).all(threadId):this.#database.prepare(`
      SELECT encounter_ref FROM thread_encounter_story_timeline
      WHERE thread_id=? ORDER BY occurred_at DESC,encounter_ref DESC LIMIT ?
    `).all(threadId,limit);
    return rows.map(({encounter_ref})=>this.getEncounterStory(encounter_ref));
  }

  listThreadJournalEntries(threadId) {
    assertId("journal threadId",threadId);
    return this.#database.prepare(`
      SELECT journal_entry_id AS journalEntryId,
             written_at AS writtenAt, entry_text AS entryText
      FROM thread_experience_consolidation_journal_entries WHERE thread_id=?
      UNION ALL
      SELECT journal_entry_id, written_at, entry_text
      FROM thread_encounter_journal_entries WHERE thread_id=?
      UNION ALL
      SELECT journal_entry_id, written_at, entry_text
      FROM thread_journal_entries WHERE thread_id=?
      ORDER BY writtenAt,journalEntryId
    `).all(threadId,threadId,threadId);
  }

  // A Thread's current interests: the latest revision of each not let go.
  listCurrentInterests(threadId,{limit=4}={}){
    assertId("interests threadId",threadId);
    return this.#database.prepare(`
      SELECT i.interest_id,i.revision,i.interest_json,i.evidence_refs_json,i.as_of
      FROM thread_interests i
      WHERE i.thread_id=? AND i.status='current' AND i.revision=(
        SELECT MAX(revision) FROM thread_interests
        WHERE thread_id=i.thread_id AND interest_id=i.interest_id)
      ORDER BY i.as_of DESC,i.interest_id LIMIT ?
    `).all(threadId,limit).map(row=>Object.freeze({
      interestId:row.interest_id,revision:row.revision,asOf:row.as_of,
      ...JSON.parse(row.interest_json),
      evidenceRefs:Object.freeze(JSON.parse(row.evidence_refs_json)),
    }));
  }

  hasFormedInterests(threadId){
    assertId("interests threadId",threadId);
    return this.#database.prepare(
      "SELECT 1 FROM thread_interests WHERE thread_id=? LIMIT 1",
    ).get(threadId)!==undefined;
  }

  // One revision of one interest, once per source: a retried reflection
  // returns what it already recorded rather than a second revision.
  recordInterest({threadId,interestId,status,interest,evidenceRefs,formedBy,sourceRef,asOf}){
    assertId("interest threadId",threadId);
    assertId("interestId",interestId);
    assertId("interest sourceRef",sourceRef);
    assertIsoTimestamp("interest asOf",asOf);
    if(!["current","let_go"].includes(status))throw new TypeError("interest status is invalid");
    if(!Array.isArray(evidenceRefs)||evidenceRefs.length===0)
      throw new TypeError("an interest rests on at least one memory or experience");
    return this.#database.transaction(()=>{
      const existing=this.#database.prepare(`
        SELECT revision FROM thread_interests
        WHERE thread_id=? AND interest_id=? AND source_ref=?
      `).get(threadId,interestId,sourceRef);
      if(existing!==undefined)return Object.freeze({interestId,revision:existing.revision,inserted:false});
      const revision=(this.#database.prepare(`
        SELECT MAX(revision) AS r FROM thread_interests WHERE thread_id=? AND interest_id=?
      `).get(threadId,interestId).r??0)+1;
      this.#database.prepare(`
        INSERT INTO thread_interests(thread_id,interest_id,revision,status,interest_json,
          evidence_refs_json,formed_by,source_ref,as_of)
        VALUES (?,?,?,?,?,?,?,?,?)
      `).run(threadId,interestId,revision,status,canonicalJson(interest),
        canonicalJson(evidenceRefs),formedBy,sourceRef,asOf);
      return Object.freeze({interestId,revision,inserted:true});
    });
  }

  // A moment, once per reflection and position: a retried reflection adds nothing.
  recordSocialMoment({momentId,threadId,kind,personThreadId,interestId,moment,evidenceRefs,sourceRef,asOf}){
    assertId("moment id",momentId);
    assertId("moment threadId",threadId);
    assertId("moment person",personThreadId);
    if(interestId!==null)assertId("moment interestId",interestId);
    assertId("moment sourceRef",sourceRef);
    assertIsoTimestamp("moment asOf",asOf);
    if(!["useful","learning"].includes(kind))throw new TypeError("moment kind is invalid");
    if(!Array.isArray(evidenceRefs)||evidenceRefs.length===0)
      throw new TypeError("a moment rests on at least one experience");
    const inserted=this.#database.prepare(`
      INSERT INTO thread_social_moments(moment_id,thread_id,kind,person_thread_id,interest_id,
        moment_json,evidence_refs_json,source_ref,as_of)
      VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(moment_id) DO NOTHING
    `).run(momentId,threadId,kind,personThreadId,interestId,canonicalJson(moment),
      canonicalJson(evidenceRefs),sourceRef,asOf).changes===1;
    return Object.freeze({momentId,inserted});
  }

  // Perceived regard, once per reflection and position: a retried reflection
  // adds nothing.
  recordPerceivedRegard({regardId,threadId,personThreadId,act,actorThreadId,account,evidenceRefs,sourceRef,asOf}){
    assertId("regard id",regardId);
    assertId("regard threadId",threadId);
    assertId("regard person",personThreadId);
    assertId("regard sourceRef",sourceRef);
    assertIsoTimestamp("regard asOf",asOf);
    assertNonEmpty("regard account",account);
    if(!Array.isArray(evidenceRefs)||evidenceRefs.length===0)
      throw new TypeError("perceived regard rests on at least one experience");
    const inserted=this.#database.prepare(`
      INSERT INTO thread_perceived_regard(regard_id,thread_id,person_thread_id,act,actor_thread_id,
        account,evidence_refs_json,source_ref,as_of)
      VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(regard_id) DO NOTHING
    `).run(regardId,threadId,personThreadId,act,actorThreadId,account,
      canonicalJson(evidenceRefs),sourceRef,asOf).changes===1;
    return Object.freeze({regardId,inserted});
  }

  // The regard this Thread perceived with one person before a time, newest
  // first, each with how many others witnessed it (others present in the
  // Story its experience belongs to).
  listPerceivedRegard(threadId,personThreadId,{before,limit=48}={}){
    assertId("regard threadId",threadId);
    assertId("regard person",personThreadId);
    assertIsoTimestamp("regard before",before);
    if(!Number.isSafeInteger(limit)||limit<1||limit>96)throw new TypeError("perceived regard must be bounded");
    return Object.freeze(this.#database.prepare(`
      SELECT r.regard_id,r.person_thread_id,r.act,r.actor_thread_id,r.account,r.evidence_refs_json,r.source_ref,r.as_of,
        (SELECT COUNT(*) FROM thread_encounter_experiences e
          JOIN encounter_story_thread_presence p ON p.encounter_ref=e.encounter_ref
          WHERE e.experience_id=json_extract(r.evidence_refs_json,'$[0]')) AS present
      FROM thread_perceived_regard r WHERE r.thread_id=? AND r.person_thread_id=? AND r.as_of<?
      ORDER BY r.as_of DESC,r.regard_id LIMIT ?
    `).all(threadId,personThreadId,before,limit).map(regardFromRow));
  }

  // The regard this Thread perceived with anyone, newest first: its own
  // record of how it has been treated and has treated others.
  listRecentPerceivedRegard(threadId,{before,limit=96}={}){
    assertId("regard threadId",threadId);
    assertIsoTimestamp("regard before",before);
    if(!Number.isSafeInteger(limit)||limit<1||limit>96)throw new TypeError("perceived regard must be bounded");
    return Object.freeze(this.#database.prepare(`
      SELECT r.regard_id,r.person_thread_id,r.act,r.actor_thread_id,r.account,r.evidence_refs_json,r.source_ref,r.as_of,
        (SELECT COUNT(*) FROM thread_encounter_experiences e
          JOIN encounter_story_thread_presence p ON p.encounter_ref=e.encounter_ref
          WHERE e.experience_id=json_extract(r.evidence_refs_json,'$[0]')) AS present
      FROM thread_perceived_regard r WHERE r.thread_id=? AND r.as_of<?
      ORDER BY r.as_of DESC,r.regard_id LIMIT ?
    `).all(threadId,before,limit).map(regardFromRow));
  }

  // How an exchange held this Thread, in its own reading; once per source.
  recordEngagementReading({threadId,reading,sourceKind,sourceRef,at}){
    assertId("engagement threadId",threadId);
    assertNonEmpty("engagement source",sourceRef);
    assertIsoTimestamp("engagement at",at);
    const readingId=`eng_${sha256(canonicalJson({threadId,sourceKind,sourceRef})).slice(0,32)}`;
    this.#database.prepare(`
      INSERT INTO thread_engagement_readings(reading_id,thread_id,reading,source_kind,source_ref,at)
      VALUES (?,?,?,?,?,?) ON CONFLICT(reading_id) DO NOTHING
    `).run(readingId,threadId,reading,sourceKind,sourceRef,at);
    return Object.freeze({readingId});
  }

  // Its own readings in a window, newest first.
  listEngagementReadings(threadId,{since,until,limit=48}={}){
    assertId("engagement threadId",threadId);
    assertIsoTimestamp("engagement since",since);
    assertIsoTimestamp("engagement until",until);
    if(!Number.isSafeInteger(limit)||limit<1||limit>96)throw new TypeError("engagement readings must be bounded");
    return Object.freeze(this.#database.prepare(`
      SELECT reading,source_kind AS sourceKind,at FROM thread_engagement_readings
      WHERE thread_id=? AND at>=? AND at<? ORDER BY at DESC LIMIT ?
    `).all(threadId,since,until,limit).map(row=>Object.freeze({...row})));
  }

  // What this Thread's recent exchanges said, newest first: the words of the
  // conversations it spoke in and of the messages it sent or received.
  // Facts, for measuring how much a new exchange repeats them.
  listRecentExchangeTexts(threadId,{since,until,limit=12}={}){
    assertId("exchanges threadId",threadId);
    assertIsoTimestamp("exchanges since",since);
    assertIsoTimestamp("exchanges until",until);
    if(!Number.isSafeInteger(limit)||limit<1||limit>24)throw new TypeError("recent exchanges must be bounded");
    const talk=this.#database.prepare(`
      SELECT own.occurred_at AS at,own.encounter_ref AS ref,
        (SELECT group_concat(json_extract(beat.value,'$.text'),' ') FROM json_each(e.story_json,'$.beats') beat
          WHERE json_extract(beat.value,'$.kind')='utterance') AS text
      FROM thread_encounter_story_timeline own
      JOIN encounter_story_records e ON e.encounter_id=own.encounter_ref
      WHERE own.thread_id=? AND own.occurred_at>=? AND own.occurred_at<?
        AND EXISTS (SELECT 1 FROM json_each(e.story_json,'$.beats') beat
          WHERE json_extract(beat.value,'$.kind')='utterance'
            AND json_extract(beat.value,'$.actorThreadId')=?)
      ORDER BY own.occurred_at DESC LIMIT ?
    `).all(threadId,since,until,threadId,limit);
    const messages=!worldTableExists(this.#database,"thread_contact_messages")?[]:this.#database.prepare(`
      SELECT sent_at AS at,message_id AS ref,message_text AS text FROM thread_contact_messages
      WHERE (sender_thread_id=? OR (recipient_kind='thread' AND recipient_party_id=?))
        AND sent_at>=? AND sent_at<?
      ORDER BY sent_at DESC LIMIT ?
    `).all(threadId,threadId,since,until,limit);
    return Object.freeze([...talk,...messages].filter(item=>typeof item.text==="string"&&item.text.trim()!=="")
      .sort((a,b)=>b.at.localeCompare(a.at)).slice(0,limit).map(item=>Object.freeze({...item})));
  }

  // A Thread's newest moments, optionally only those with some people.
  listSocialMoments(threadId,{limit=6,personIds=null}={}){
    assertId("moments threadId",threadId);
    if(!Number.isSafeInteger(limit)||limit<1||limit>48)throw new TypeError("moments must be bounded");
    const people=personIds===null?null:[...personIds];
    if(people!==null&&people.length===0)return [];
    const rows=this.#database.prepare(`
      SELECT moment_id,kind,person_thread_id,interest_id,moment_json,evidence_refs_json,source_ref,as_of
      FROM thread_social_moments WHERE thread_id=?
        ${people===null?"":`AND person_thread_id IN (${people.map(()=>"?").join(",")})`}
      ORDER BY as_of DESC,moment_id LIMIT ?
    `).all(threadId,...(people??[]),limit);
    return rows.map(row=>Object.freeze({
      momentId:row.moment_id,kind:row.kind,personThreadId:row.person_thread_id,
      interestId:row.interest_id,...JSON.parse(row.moment_json),
      evidenceRefs:Object.freeze(JSON.parse(row.evidence_refs_json)),
      sourceRef:row.source_ref,asOf:row.as_of,
    }));
  }

  // An appointment agreed in a Story, once; agreeing opens the time door.
  // A shelf is filled once, from attested works, and then kept: a second
  // filling of the same section keeps the first.
  recordVenueHoldings({venueRef,section,works,at}){
    assertId("holdings venue",venueRef);
    assertNonEmpty("holdings section",section);
    assertIsoTimestamp("holdings recordedAt",at);
    if(!Array.isArray(works)||works.length<1||works.length>64)throw new TypeError("a shelf holds a bounded set of works");
    for(const work of works){
      if(typeof work?.source!=="string"||typeof work?.sourceId!=="string"||typeof work?.evidenceRef!=="string"){
        throw new TypeError("a holding must be a catalogue-attested work");
      }
    }
    this.#database.transaction(()=>{
      if(this.#database.prepare("SELECT 1 FROM venue_holdings WHERE venue_ref=? AND section=? LIMIT 1")
        .get(venueRef,section)!==undefined)return;
      const insert=this.#database.prepare(`INSERT INTO venue_holdings(holding_ref,venue_ref,section,position,work_json,recorded_at)
        VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING`);
      works.forEach((work,position)=>insert.run(
        `hld_${sha256(canonicalJson([venueRef,section,work.source,work.sourceId])).slice(0,40)}`,
        venueRef,section,position,canonicalJson(work),at));
    });
    return this.listVenueHoldings(venueRef,section);
  }

  listVenueHoldings(venueRef,section){
    assertId("holdings venue",venueRef);
    assertNonEmpty("holdings section",section);
    return Object.freeze(this.#database.prepare(`SELECT * FROM venue_holdings
      WHERE venue_ref=? AND section=? ORDER BY position`).all(venueRef,section)
      .map(row=>Object.freeze({holdingRef:row.holding_ref,venueRef:row.venue_ref,section:row.section,
        position:row.position,work:Object.freeze(JSON.parse(row.work_json))})));
  }

  getVenueHolding(holdingRef){
    assertId("holding",holdingRef);
    const row=this.#database.prepare("SELECT * FROM venue_holdings WHERE holding_ref=?").get(holdingRef);
    return row===undefined?null:Object.freeze({holdingRef:row.holding_ref,venueRef:row.venue_ref,
      section:row.section,position:row.position,work:Object.freeze(JSON.parse(row.work_json))});
  }

  getThreadReading(threadId,workRef){
    assertId("reading threadId",threadId);
    assertNonEmpty("reading work",workRef);
    const row=this.#database.prepare("SELECT * FROM thread_readings WHERE thread_id=? AND work_ref=?")
      .get(threadId,workRef);
    return row===undefined?null:readingFromRow(row);
  }

  recordThreadReading({threadId,workRef,holdingRef,title,nextByte,status,at}){
    assertId("reading threadId",threadId);
    assertNonEmpty("reading work",workRef);
    assertId("reading holding",holdingRef);
    assertNonEmpty("reading title",title);
    if(nextByte!==null&&(!Number.isSafeInteger(nextByte)||nextByte<0))throw new TypeError("a reading position is a byte offset");
    if(!["reading","set_aside","finished"].includes(status))throw new TypeError("reading status is invalid");
    assertIsoTimestamp("reading at",at);
    this.#database.prepare(`INSERT INTO thread_readings(thread_id,work_ref,holding_ref,title,next_byte,status,last_read_at)
      VALUES (?,?,?,?,?,?,?) ON CONFLICT(thread_id,work_ref) DO UPDATE SET holding_ref=excluded.holding_ref,
      next_byte=excluded.next_byte,status=excluded.status,last_read_at=excluded.last_read_at`)
      .run(threadId,workRef,holdingRef,title.trim(),nextByte,status,at);
    return this.getThreadReading(threadId,workRef);
  }

  listThreadReadings(threadId,{limit=12}={}){
    assertId("readings threadId",threadId);
    if(!Number.isSafeInteger(limit)||limit<1||limit>48)throw new TypeError("readings must be bounded");
    return Object.freeze(this.#database.prepare(`SELECT * FROM thread_readings WHERE thread_id=?
      ORDER BY last_read_at DESC,work_ref LIMIT ?`).all(threadId,limit).map(readingFromRow));
  }

  // One glance per entered scene; a retried arrival keeps the first.
  recordThreadGlance({threadId,situationId,occurredAt,items,focus,focusEncounterRef=null}){
    assertId("glance threadId",threadId);
    assertId("glance situationId",situationId);
    assertIsoTimestamp("glance occurredAt",occurredAt);
    if(!Array.isArray(items)||items.length<1||items.length>8)throw new TypeError("a glance is a short list");
    if(focus!==null&&(!Number.isSafeInteger(focus)||focus<0||focus>=items.length))throw new TypeError("a glance focus is one of its items");
    if(focusEncounterRef!==null)assertId("glance focus encounter",focusEncounterRef);
    const glanceId=`glance_${sha256(canonicalJson({threadId,situationId})).slice(0,40)}`;
    this.#database.prepare(`INSERT INTO thread_glances(glance_id,thread_id,situation_id,occurred_at,items_json,focus,focus_encounter_ref)
      VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`)
      .run(glanceId,threadId,situationId,occurredAt,canonicalJson(items),focus,focusEncounterRef);
    return this.getThreadGlance(threadId,situationId);
  }

  getThreadGlance(threadId,situationId){
    assertId("glance threadId",threadId);
    assertId("glance situationId",situationId);
    const row=this.#database.prepare("SELECT * FROM thread_glances WHERE thread_id=? AND situation_id=?")
      .get(threadId,situationId);
    return row===undefined?null:glanceFromRow(row);
  }

  listThreadGlances(threadId,{limit=12}={}){
    assertId("glances threadId",threadId);
    if(!Number.isSafeInteger(limit)||limit<1||limit>48)throw new TypeError("glances must be bounded");
    return Object.freeze(this.#database.prepare(`SELECT * FROM thread_glances WHERE thread_id=?
      ORDER BY occurred_at DESC,glance_id LIMIT ?`).all(threadId,limit).map(glanceFromRow));
  }

  recordAppointment({appointmentId,proposerThreadId,partnerThreadId,placeRef,venueRef,placeName,
    startsAt,agreedAt,encounterRef}){
    assertId("appointment id",appointmentId);
    assertId("appointment proposer",proposerThreadId);
    assertId("appointment partner",partnerThreadId);
    assertId("appointment place",placeRef);
    assertId("appointment venue",venueRef);
    assertNonEmpty("appointment place name",placeName);
    assertIsoTimestamp("appointment startsAt",startsAt);
    assertIsoTimestamp("appointment agreedAt",agreedAt);
    assertId("appointment encounter",encounterRef);
    if(Date.parse(startsAt)<=Date.parse(agreedAt))throw new TypeError("an appointment is for later");
    const appointment=Object.freeze({appointmentId,proposerThreadId,partnerThreadId,placeRef,
      venueRef,placeName:placeName.trim(),startsAt,agreedAt,encounterRef});
    return this.#database.transaction(()=>{
      const inserted=this.#database.prepare(`
        INSERT INTO thread_appointments(appointment_id,proposer_thread_id,partner_thread_id,
          place_ref,venue_ref,place_name,starts_at,agreed_at,encounter_ref)
        VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING
      `).run(appointmentId,proposerThreadId,partnerThreadId,placeRef,venueRef,appointment.placeName,
        startsAt,agreedAt,encounterRef).changes===1;
      if(inserted)recordAppointmentRelationalActs(this.#database,appointment);
      return Object.freeze({...appointment,inserted});
    });
  }

  // A Thread's appointments, newest first, each with its outcome once settled.
  listAppointments(threadId,{from=null,to=null,limit=12}={}){
    assertId("appointments threadId",threadId);
    if(from!==null)assertIsoTimestamp("appointments from",from);
    if(to!==null)assertIsoTimestamp("appointments to",to);
    if(!Number.isSafeInteger(limit)||limit<1||limit>48)throw new TypeError("appointments must be bounded");
    return this.#database.prepare(`
      SELECT a.*,o.outcome,o.absent_json,o.settled_at FROM thread_appointments a
      LEFT JOIN thread_appointment_outcomes o ON o.appointment_id=a.appointment_id
      WHERE (a.proposer_thread_id=? OR a.partner_thread_id=?)
        AND (? IS NULL OR a.starts_at>=?) AND (? IS NULL OR a.starts_at<=?)
      ORDER BY a.starts_at DESC,a.appointment_id LIMIT ?
    `).all(threadId,threadId,from,from,to,to,limit).map(appointmentFromRow);
  }

  listDueAppointments({before,limit=4}){
    assertIsoTimestamp("due appointments before",before);
    return this.#database.prepare(`
      SELECT a.*,NULL AS outcome,NULL AS absent_json,NULL AS settled_at FROM thread_appointments a
      WHERE a.starts_at<=? AND NOT EXISTS (
        SELECT 1 FROM thread_appointment_outcomes o WHERE o.appointment_id=a.appointment_id)
      ORDER BY a.starts_at,a.appointment_id LIMIT ?
    `).all(before,limit).map(appointmentFromRow);
  }

  nextUnsettledAppointmentStart(){
    return this.#database.prepare(`
      SELECT MIN(a.starts_at) AS at FROM thread_appointments a WHERE NOT EXISTS (
        SELECT 1 FROM thread_appointment_outcomes o WHERE o.appointment_id=a.appointment_id)
    `).get().at??null;
  }

  // Whether each came, once: the outcome and its time-door acts together.
  settleAppointment({appointmentId,absent,settledAt}){
    assertId("appointment id",appointmentId);
    assertIsoTimestamp("appointment settledAt",settledAt);
    return this.#database.transaction(()=>{
      const row=this.#database.prepare(
        "SELECT * FROM thread_appointments WHERE appointment_id=?").get(appointmentId);
      if(row===undefined)throw new TypeError("appointment was not found");
      const appointment=appointmentFromRow(row);
      const parties=[appointment.proposerThreadId,appointment.partnerThreadId];
      if(!Array.isArray(absent)||absent.some(id=>!parties.includes(id)))
        throw new TypeError("only a party to an appointment can be absent from it");
      const outcome=absent.length===0?"kept":"broken";
      const inserted=this.#database.prepare(`
        INSERT INTO thread_appointment_outcomes(appointment_id,outcome,absent_json,settled_at)
        VALUES (?,?,?,?) ON CONFLICT DO NOTHING
      `).run(appointmentId,outcome,canonicalJson([...new Set(absent)].sort()),settledAt).changes===1;
      if(inserted)recordAppointmentOutcomeActs(this.#database,{appointment,absent,at:settledAt});
      return Object.freeze({appointmentId,outcome,inserted});
    });
  }

  inspectThreadInterests(threadId,{limit=24}={}){
    assertId("interests threadId",threadId);
    return this.#database.prepare(`
      SELECT interest_id,revision,status,interest_json,evidence_refs_json,formed_by,source_ref,as_of
      FROM thread_interests WHERE thread_id=? ORDER BY as_of DESC,interest_id,revision DESC LIMIT ?
    `).all(threadId,limit).map(row=>({
      interestId:row.interest_id,revision:row.revision,status:row.status,
      ...JSON.parse(row.interest_json),evidenceRefs:JSON.parse(row.evidence_refs_json),
      formedBy:row.formed_by,sourceRef:row.source_ref,asOf:row.as_of,
    }));
  }

  listThreadExperienceJournal(threadId,{limit=null}={}) {
    assertId("threadId", threadId);
    if(limit!==null&&(!Number.isSafeInteger(limit)||limit<1||limit>100)){
      throw new TypeError("experience journal inspection must be bounded");
    }
    const rows=limit===null?this.#database.prepare(`
      SELECT journal_entry_id,thread_id,about_experience_ref,written_at,entry_text
      FROM thread_encounter_journal_entries
      WHERE thread_id=? ORDER BY written_at,journal_entry_id
    `).all(threadId):this.#database.prepare(`
      SELECT journal_entry_id,thread_id,about_experience_ref,written_at,entry_text
      FROM thread_encounter_journal_entries
      WHERE thread_id=? ORDER BY written_at DESC,journal_entry_id DESC LIMIT ?
    `).all(threadId,limit);
    return rows.map((row) => ({
      journalEntryId:row.journal_entry_id,
      threadId:row.thread_id,
      aboutExperienceRef:row.about_experience_ref,
      writtenAt:row.written_at,
      entryText:row.entry_text,
    }));
  }

  listEncounters(threadId) {
    assertId("threadId", threadId);
    return this.#database.prepare(`
      SELECT event_id,thread_id,situation_id,occurred_at,visitor_utterance,response_text
      FROM lived_encounter_records WHERE thread_id=? ORDER BY occurred_at,event_id
    `).all(threadId).map((row) => ({
      eventId:row.event_id,
      threadId:row.thread_id,
      situationId:row.situation_id,
      occurredAt:row.occurred_at,
      visitorUtterance:row.visitor_utterance,
      responseText:row.response_text,
    }));
  }

  listJournal(threadId) {
    assertId("threadId", threadId);
    return this.#database.prepare(`
      SELECT journal_entry_id,thread_id,about_event_ref,written_at,entry_text
      FROM thread_journal_entries WHERE thread_id=? ORDER BY written_at,journal_entry_id
    `).all(threadId).map((row) => ({
      journalEntryId:row.journal_entry_id,
      threadId:row.thread_id,
      aboutEventRef:row.about_event_ref,
      writtenAt:row.written_at,
      entryText:row.entry_text,
    }));
  }
}

export function openLivedExperienceStore(storage) {
  return new LivedExperienceStore(storage);
}

export function openLivedExperienceInspectionStore(storage){
  return new LivedExperienceStore(storage,{readOnly:true});
}
