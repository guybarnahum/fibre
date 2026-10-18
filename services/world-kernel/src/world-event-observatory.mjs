import {openWorldStateDatabase} from "./world-state-storage.mjs";
import {enactedActorOccurrence} from "./world-occurrence.mjs";

// This is a read-side projection, never another World-event authority.
// Both source windows are explicitly capped before joining witnesses.
const PLACE_LIMIT=240;
const SOURCE_LIMIT=240;

function iso(value){
  return typeof value==="string"&&Number.isFinite(Date.parse(value))?value:null;
}
function parse(value){return typeof value==="string"?JSON.parse(value):null;}
function eventPlace(placeByRef,ref){
  return typeof ref==="string"?placeByRef.get(ref)??null:null;
}

export function projectWorldEventOverview({placeRows=[],situationRows=[],storyRows=[],now,
  hours=24,sourceLimit=SOURCE_LIMIT}={}){
  const byRef=new Map();
  const places=[];
  for(const row of placeRows){
    const place=parse(row.record_json);
    if(!place?.ref||!Number.isFinite(place.lat)||!Number.isFinite(place.long))continue;
    const site=Object.freeze({
      placeRef:place.ref,venueRef:place.physicalVenue?.ref??null,
      name:place.displayName,city:place.locality,country:place.country,
      countryCode:place.countryCode,lat:place.lat,long:place.long,
      discoveryListed:parse(row.discovery_json)?.listed===true,
    });
    byRef.set(site.placeRef,site);
    if(site.venueRef)byRef.set(site.venueRef,site);
    places.push(site);
  }

  const events=[];
  for(const row of situationRows){
    const current=parse(row.record_json),prior=parse(row.previous_json);
    const event=enactedActorOccurrence(prior,current);
    if(!event)continue;
    const site=eventPlace(byRef,event.placeRef);
    if(!site)continue;
    events.push({
      eventRef:event.occurrenceRef,kind:event.kind,occurredAt:event.occurredAt,
      placeRef:site.placeRef,source:"world_enacted",summary:
        event.kind==="arrival"?"Thread arrived":"Thread departed",
      actorThreadId:event.actorThreadId,
      witnesses:[],sourcePlaceEvidence:"enacted_movement",
    });
  }

  const stories=new Map();
  for(const row of storyRows){
    let event=stories.get(row.encounter_id);
    if(!event){
      const story=parse(row.story_json);
      const refs=parse(row.visualization_source_refs_json)??[];
      const beats=story?.beats??[];
      const explicit=refs.map(ref=>eventPlace(byRef,ref)).find(Boolean)??null;
      event={
        eventRef:row.encounter_id,kind:beats.some(b=>b.kind==="utterance"||b.kind==="action")
          ?"encounter":"ambient",
        occurredAt:row.occurred_at,placeRef:explicit?.placeRef??null,
        source:"encounter_story",
        summary:beats.filter(b=>typeof b.text==="string").map(b=>b.text).join(" · ").slice(0,440),
        actorThreadId:beats.find(b=>b.actorThreadId)?.actorThreadId??null,
        sourcePlaceEvidence:explicit?"source_reference":null,
        witnesses:[],_locations:new Set(),
      };
      stories.set(row.encounter_id,event);
    }
    if(!row.thread_id)continue;
    const situation=parse(row.situation_json);
    const place=situation?.location?.kind==="place"
      ?eventPlace(byRef,situation.location.placeRef):null;
    if(place)event._locations.add(place.placeRef);
    event.witnesses.push({
      threadId:row.thread_id,situationId:row.situation_id,
      attention:row.attention_outcome??"not_appraised",
      experienceId:row.experience_id??null,
      memoryLink:row.memory_id??null,impactLink:null,
    });
  }
  for(const event of stories.values()){
    if(!event.placeRef&&event._locations.size===1){
      event.placeRef=[...event._locations][0];
      event.sourcePlaceEvidence="single_verified_witness_place";
    }
    delete event._locations;
    if(!event.placeRef)continue; // A remote witness does not locate a storm.
    event.witnesses.sort((a,b)=>a.threadId.localeCompare(b.threadId));
    events.push(event);
  }

  events.sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)
    ||a.eventRef.localeCompare(b.eventRef));
  const eventsByPlace=new Map();
  for(const event of events){
    const current=eventsByPlace.get(event.placeRef)??[];
    current.push(event);
    eventsByPlace.set(event.placeRef,current);
  }
  const activePlaces=places.map(place=>({
    ...place,eventCount:eventsByPlace.get(place.placeRef)?.length??0,
    latestEventAt:eventsByPlace.get(place.placeRef)?.[0]?.occurredAt??null,
  }));
  const cities=new Map();
  for(const place of activePlaces){
    const key=[place.countryCode,place.city].join(":");
    let city=cities.get(key);
    if(!city){
      city={key,name:place.city,country:place.country,countryCode:place.countryCode,
        lat:place.lat,long:place.long,eventCount:0,placeCount:0,latestEventAt:null};
      cities.set(key,city);
    }
    city.placeCount++;
    city.eventCount+=place.eventCount;
    if(place.latestEventAt&&(!city.latestEventAt||place.latestEventAt>city.latestEventAt)){
      city.latestEventAt=place.latestEventAt;
    }
  }
  return Object.freeze({
    contract:"fibre-world-event-observatory-v0.1",asOf:now,hours,
    coverage:{
      publicVerifiedPlacesOnly:true,
      placeLimit:PLACE_LIMIT,sourceLimit,
      placesTruncated:placeRows.length>=PLACE_LIMIT,
      situationsTruncated:situationRows.length>=sourceLimit,
      storiesTruncated:new Set(storyRows.map(r=>r.encounter_id)).size>=sourceLimit,
      privateCityActivity:"not_included",
      memory:"consolidated_current_records_only",laterImpact:"not_linked",
    },
    cities:[...cities.values()].sort((a,b)=>b.eventCount-a.eventCount
      ||a.name.localeCompare(b.name)),
    places:activePlaces.sort((a,b)=>b.eventCount-a.eventCount
      ||a.name.localeCompare(b.name)),
    events,
  });
}

export function readWorldEventOverview(storage,{hours=24,now=new Date().toISOString()}={}){
  if(!Number.isSafeInteger(hours)||hours<1||hours>168)throw new TypeError("World event window must be 1–168 hours");
  if(!iso(now))throw new TypeError("World event query needs an ISO timestamp");
  const since=new Date(Date.parse(now)-hours*3_600_000).toISOString();
  const db=openWorldStateDatabase(storage,{readOnly:true,storeName:"WorldEventObservatory"});
  try{
    const placeRows=db.prepare(`SELECT record_json,discovery_json
      FROM world_public_places ORDER BY country_code,locality,place_ref
      LIMIT ?`).all(PLACE_LIMIT);
    const situationRows=db.prepare(`
      SELECT r.record_json,
        (SELECT prior.record_json FROM current_situation_records prior
         WHERE prior.thread_id=r.thread_id
           AND (prior.established_at<r.established_at
             OR (prior.established_at=r.established_at AND prior.situation_id<r.situation_id))
         ORDER BY prior.established_at DESC,prior.situation_id DESC LIMIT 1) AS previous_json
      FROM (SELECT situation_id,thread_id,established_at,record_json
        FROM current_situation_records WHERE established_at>=?
        ORDER BY established_at DESC,situation_id DESC LIMIT ?) r
    `).all(since,SOURCE_LIMIT);
    const storyRows=db.prepare(`
      SELECT e.encounter_id,e.occurred_at,e.story_json,e.visualization_source_refs_json,
        p.thread_id,p.situation_id,s.record_json AS situation_json,
        a.outcome AS attention_outcome,x.experience_id,
        memory.memory_id
      FROM (SELECT encounter_id,occurred_at,story_json,visualization_source_refs_json
        FROM encounter_story_records WHERE occurred_at>=?
        ORDER BY occurred_at DESC,encounter_id DESC LIMIT ?) e
      LEFT JOIN encounter_story_thread_presence p ON p.encounter_ref=e.encounter_id
      LEFT JOIN current_situation_records s ON s.situation_id=p.situation_id
      LEFT JOIN thread_encounter_attention a ON a.thread_id=p.thread_id
        AND a.encounter_ref=e.encounter_id
      LEFT JOIN thread_encounter_experiences x ON x.thread_id=p.thread_id
        AND x.encounter_ref=e.encounter_id
      LEFT JOIN thread_experience_consolidation_members member
        ON member.experience_id=x.experience_id
      LEFT JOIN thread_experience_consolidation_stages completed
        ON completed.consolidation_id=member.consolidation_id AND completed.stage='complete'
      LEFT JOIN autobiographical_memory_current_heads memory_head
        ON memory_head.memory_id=json_extract(completed.payload_json,'$.memoryId')
        AND memory_head.thread_id=p.thread_id
      LEFT JOIN autobiographical_memory_records memory
        ON memory.memory_id=memory_head.memory_id AND memory.revision=memory_head.revision
        AND memory.status='current'
      ORDER BY e.occurred_at DESC,e.encounter_id,p.thread_id
    `).all(since,SOURCE_LIMIT);
    return projectWorldEventOverview({
      placeRows,situationRows,storyRows,now,hours,sourceLimit:SOURCE_LIMIT,
    });
  }finally{db.close();}
}
