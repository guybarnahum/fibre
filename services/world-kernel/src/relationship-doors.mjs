// Kinds of access two people may open to each other. A door opens only when
// both consent (one offers, the other accepts); either may close it alone.
export const RELATIONSHIP_DOORS=Object.freeze([
  "attention","name","conversation","contact","time","place",
  "confidence","care","romance","commitment",
]);
// Observable relational acts: facts, never judgments. World never derives
// trust or attitude from them; a Thread's stance toward another is its own.
export const RELATIONAL_ACTS=Object.freeze([
  "offered","accepted","declined","opened","closed","kept","broken","repaired",
]);

const ordered=(x,y)=>x<y?[x,y]:[y,x];

// Each source record is admitted once, so its acts are appended once.
function append(database,{pair,door,kind,actor,at,sourceRef}){
  const [a,b]=pair;
  database.prepare(`
    INSERT INTO relationship_ledger(
      thread_a,thread_b,door,seq,kind,actor_thread_id,occurred_at,source_ref
    ) SELECT ?,?,?,COALESCE(MAX(seq),0)+1,?,?,?,? FROM relationship_ledger
      WHERE thread_a=? AND thread_b=? AND door=?
  `).run(a,b,door,kind,actor,at,sourceRef,a,b,door);
}

function isOpen(database,[a,b],door){
  return database.prepare(`
    SELECT 1 FROM relationship_doors WHERE thread_a=? AND thread_b=? AND door=?
  `).get(a,b,door)!==undefined;
}

function latest(database,[a,b],door){
  return database.prepare(`
    SELECT kind,actor_thread_id AS actor FROM relationship_ledger
    WHERE thread_a=? AND thread_b=? AND door=? ORDER BY seq DESC LIMIT 1
  `).get(a,b,door)??null;
}

// A door that needs no spoken consent opens when one person's act toward the
// other is answered in kind: the first act offers, the answer accepts. An
// unanswered offer is recorded once; repeating it adds nothing.
function answer(database,{from,to,door,at,sourceRef}){
  const pair=ordered(from,to);
  if(isOpen(database,pair,door))return;
  const last=latest(database,pair,door);
  const step=(kind)=>append(database,{pair,door,kind,actor:from,at,sourceRef});
  if(last?.kind==="offered"&&last.actor===to){
    step("accepted");
    step("opened");
  }else if(!(last?.kind==="offered"&&last.actor===from))step("offered");
}

// The two people a Story's speech passes between: its two speakers, or the
// sole speaker and the only other person present. Otherwise none.
export function storyRelationalPair({threadPresence,story}){
  const speakers=[...new Set(story.beats
    .filter(beat=>beat.kind==="utterance"&&beat.actorThreadId)
    .map(beat=>beat.actorThreadId))];
  if(speakers.length===2)return speakers;
  if(speakers.length===1&&threadPresence.length===2)
    return threadPresence.map(person=>person.threadId);
  return null;
}

// Called inside the transaction that admits a new Encounter Story.
export function recordStoryRelationalActs(database,record){
  const pair=storyRelationalPair(record);
  if(pair===null)return;
  const at=record.occurredAt,sourceRef=record.encounterId;
  const speech=record.story.beats.filter(beat=>
    beat.kind==="utterance"&&pair.includes(beat.actorThreadId));
  for(const beat of speech){
    const from=beat.actorThreadId,to=from===pair[0]?pair[1]:pair[0];
    answer(database,{from,to,door:"attention",at,sourceRef});
    // An introduction offers a name; the other's introduction accepts it.
    if(beat.disclosedName)answer(database,{from,to,door:"name",at,sourceRef});
  }
  const speakers=[...new Set(speech.map(beat=>beat.actorThreadId))];
  if(speakers.length<2)return;
  const both=ordered(...speakers);
  const last=latest(database,both,"conversation");
  if(last?.kind==="accepted"){
    // An accepted invitation, now actually spoken. ADR-0029 founds
    // acquaintance here, which already lets each know the other's name.
    for(const door of ["conversation","name"]){
      if(!isOpen(database,both,door))append(database,{
        pair:both,door,kind:"opened",actor:last.actor,at,sourceRef,
      });
    }
  }else if(!isOpen(database,both,"conversation")){
    // A conversation entered without an invitation (an ongoing exchange
    // someone chose to continue): the first speaker offered, the other took it up.
    const [first,second]=speakers;
    append(database,{pair:both,door:"conversation",kind:"offered",actor:first,at,sourceRef});
    append(database,{pair:both,door:"conversation",kind:"accepted",actor:second,at,sourceRef});
    append(database,{pair:both,door:"conversation",kind:"opened",actor:second,at,sourceRef});
  }
}

// An invitation is an explicit offer; the invitee's own stance accepts or
// declines it (a deferral declines this offer). Only the spoken
// conversation that follows an acceptance opens the door.
export function recordInvitationRelationalActs(database,interaction){
  const pair=ordered(interaction.initiatorThreadId,interaction.recipientThreadId);
  const at=interaction.occurredAt,sourceRef=interaction.interactionId;
  append(database,{pair,door:"conversation",kind:"offered",
    actor:interaction.initiatorThreadId,at,sourceRef});
  append(database,{pair,door:"conversation",
    kind:interaction.responseDecision==="accept"?"accepted":"declined",
    actor:interaction.recipientThreadId,at,sourceRef});
}

// A message to another Thread offers contact; a message back accepts it.
export function recordMessageRelationalActs(database,message){
  if(message.recipientKind!=="thread")return;
  answer(database,{from:message.senderThreadId,to:message.recipientPartyId,
    door:"contact",at:message.sentAt,sourceRef:message.messageId});
}

// One-time installation backfill: replay the World's existing invitations,
// spoken Stories and Thread messages in order through the same rules.
export function replayRelationalHistory(database){
  const presence=database.prepare(`
    SELECT thread_id FROM encounter_story_thread_presence WHERE encounter_ref=?
  `);
  const events=[
    ...database.prepare(`
      SELECT interaction_id,occurred_at,initiator_thread_id,recipient_thread_id,response_decision
      FROM social_interaction_records
    `).all().map(row=>({at:row.occurred_at,rank:0,apply:()=>recordInvitationRelationalActs(database,{
      interactionId:row.interaction_id,occurredAt:row.occurred_at,
      initiatorThreadId:row.initiator_thread_id,recipientThreadId:row.recipient_thread_id,
      responseDecision:row.response_decision,
    })})),
    ...database.prepare(`
      SELECT e.encounter_id,e.occurred_at,e.story_json FROM encounter_story_records e
      WHERE EXISTS (SELECT 1 FROM json_each(e.story_json,'$.beats') beat
        WHERE json_extract(beat.value,'$.kind')='utterance'
          AND json_extract(beat.value,'$.actorThreadId') IS NOT NULL)
    `).all().map(row=>({at:row.occurred_at,rank:1,apply:()=>recordStoryRelationalActs(database,{
      encounterId:row.encounter_id,occurredAt:row.occurred_at,
      story:JSON.parse(row.story_json),
      threadPresence:presence.all(row.encounter_id).map(item=>({threadId:item.thread_id})),
    })})),
    ...database.prepare(`
      SELECT message_id,sender_thread_id,recipient_party_id,recipient_kind,sent_at
      FROM thread_contact_messages WHERE recipient_kind='thread'
    `).all().map(row=>({at:row.sent_at,rank:2,apply:()=>recordMessageRelationalActs(database,{
      messageId:row.message_id,senderThreadId:row.sender_thread_id,
      recipientPartyId:row.recipient_party_id,recipientKind:row.recipient_kind,sentAt:row.sent_at,
    })})),
  ].sort((x,y)=>x.at.localeCompare(y.at)||x.rank-y.rank);
  for(const event of events)event.apply();
  return events.length;
}
