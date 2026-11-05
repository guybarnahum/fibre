import { assertIsoTimestamp } from "./persistence-common.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";
import { storyRelationalPair } from "./relationship-doors.mjs";

const ROUTE="/internal/relationships";
const TOKEN_ENCODER=new TextEncoder();

function constantTimeEqual(left,right){
  if(typeof left!=="string"||typeof right!=="string")return false;
  const a=TOKEN_ENCODER.encode(left),b=TOKEN_ENCODER.encode(right);
  let difference=a.length^b.length;
  for(let index=0;index<Math.max(a.length,b.length);index+=1){
    difference|=(a[index]??0)^(b[index]??0);
  }
  return difference===0;
}

// Operator-only, bounded reads of World relationship facts and of the spoken
// shape of recent Stories. Never model-visible; spoken words do not leave.
export function openRelationshipInspectionStore(storage){
  const database=openWorldStateDatabase(storage,{readOnly:true,storeName:"RelationshipInspection"});
  return Object.freeze({
    inspect({since,limit=500}){
      assertIsoTimestamp("relationships since",since);
      if(!Number.isSafeInteger(limit)||limit<1||limit>2000)
        throw new TypeError("relationships limit must be 1-2000");
      const names=Object.fromEntries(database.prepare(`
        SELECT thread_id,json_extract(state_json,'$.identity.name') AS name
        FROM threads WHERE status<>'retired' ORDER BY thread_id LIMIT 512
      `).all().map(row=>[row.thread_id,row.name??null]));
      const doors=database.prepare(`
        SELECT thread_a,thread_b,door,opened_at,opened_by FROM relationship_doors
        ORDER BY thread_a,thread_b,opened_at,door LIMIT 4096
      `).all().map(row=>({threadIds:[row.thread_a,row.thread_b],door:row.door,
        openedAt:row.opened_at,openedBy:row.opened_by}));
      const ledger=database.prepare(`
        SELECT thread_a,thread_b,door,kind,actor_thread_id,occurred_at,source_ref
        FROM relationship_ledger WHERE occurred_at>=? ORDER BY occurred_at DESC,seq DESC LIMIT ?
      `).all(since,limit).map(row=>({threadIds:[row.thread_a,row.thread_b],door:row.door,
        kind:row.kind,actorThreadId:row.actor_thread_id,occurredAt:row.occurred_at,
        sourceRef:row.source_ref}));
      const presence=database.prepare(`
        SELECT thread_id FROM encounter_story_thread_presence WHERE encounter_ref=?
      `);
      const stories=database.prepare(`
        SELECT e.encounter_id,e.occurred_at,e.story_json FROM encounter_story_records e
        WHERE e.occurred_at>=? AND EXISTS (
          SELECT 1 FROM json_each(e.story_json,'$.beats') beat
          WHERE json_extract(beat.value,'$.kind')='utterance'
            AND json_extract(beat.value,'$.actorThreadId') IS NOT NULL)
        ORDER BY e.occurred_at DESC,e.encounter_id DESC LIMIT ?
      `).all(since,limit).flatMap(row=>{
        const story=JSON.parse(row.story_json);
        const pair=storyRelationalPair({story,threadPresence:presence.all(row.encounter_id)
          .map(item=>({threadId:item.thread_id}))});
        if(pair===null)return [];
        const turns=story.beats.filter(beat=>beat.kind==="utterance"&&pair.includes(beat.actorThreadId));
        const per=(test=()=>true)=>Object.fromEntries(pair.map(id=>[id,
          turns.filter(beat=>beat.actorThreadId===id&&test(beat)).length]));
        return [{encounterId:row.encounter_id,occurredAt:row.occurred_at,threadIds:pair,
          turns:per(),questions:per(beat=>(beat.spokenText??beat.text).includes("?")),
          interrupted:turns.filter(beat=>beat.completion==="interrupted").length,
          lastSpeaker:turns.at(-1)?.actorThreadId??null}];
      });
      const messages=database.prepare(`
        SELECT sender_thread_id,recipient_party_id,sent_at FROM thread_contact_messages
        WHERE recipient_kind='thread' AND sent_at>=? ORDER BY sent_at DESC LIMIT ?
      `).all(since,limit).map(row=>({senderThreadId:row.sender_thread_id,
        recipientThreadId:row.recipient_party_id,sentAt:row.sent_at}));
      return {contract:"fibre-relationships-v1",since,limit,names,doors,ledger,stories,messages};
    },
    close(){database.close();},
  });
}

export function createRelationshipInspectionApi({inspectionStore,privateToken,now=()=>new Date().toISOString()}={}){
  if(typeof inspectionStore?.inspect!=="function")throw new TypeError("relationship API requires inspect()");
  if(typeof privateToken!=="string"||!privateToken.trim())throw new TypeError("relationship API requires privateToken");
  return Object.freeze({
    async fetch(request){
      const url=new URL(request.url);
      if(url.pathname!==ROUTE)return null;
      if(!constantTimeEqual(request.headers.get("x-fibre-private-token"),privateToken))
        return Response.json({error:"private_token_required"},{status:403});
      if(request.method!=="GET")return Response.json({error:"method_not_allowed"},{status:405});
      const since=url.searchParams.get("since")
        ??new Date(Date.parse(now())-7*86_400_000).toISOString();
      const limit=Number(url.searchParams.get("limit")??500);
      try{
        return Response.json(inspectionStore.inspect({since,limit}),
          {headers:{"cache-control":"no-store"}});
      }catch(error){
        if(error instanceof TypeError)
          return Response.json({error:"invalid_relationships_query",detail:error.message},{status:400});
        throw error;
      }
    },
  });
}
