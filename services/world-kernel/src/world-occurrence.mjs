import {assertIsoTimestamp} from "./persistence-common.mjs";

// An enacted CurrentSituation is already a World fact. This projection
// identifies objective movement without inventing an Encounter Story or
// equating a new plan with an actor's arrival.
export function enactedActorOccurrence(previous,current){
  if(current?.provenance!=="world_enacted"
    ||typeof current?.threadId!=="string"
    ||typeof current?.situationId!=="string")return null;
  assertIsoTimestamp("World occurrence time",current.establishedAt);
  if(previous===null||previous===undefined)return null; // Being born somewhere is not arriving.

  const before=previous.location,after=current.location;
  const from=before?.kind==="place"?before.placeRef
    :before?.kind==="transit"?before.fromPlaceRef:null;
  const to=after?.kind==="place"?after.placeRef
    :after?.kind==="transit"?after.toPlaceRef:null;
  const isArrival=after?.kind==="place"
    &&before?.kind==="transit"
    &&before.toPlaceRef===to;
  const isDeparture=after?.kind==="transit"
    &&before?.kind==="place"
    &&after.fromPlaceRef===from;
  if(!isArrival&&!isDeparture)return null;

  return Object.freeze({
    occurrenceRef:current.situationId,
    sourceAuthority:"world-enacted-current-situation",
    occurredAt:current.establishedAt,
    kind:isArrival?"arrival":"departure",
    actorThreadId:current.threadId,
    placeRef:isArrival?to:from,
    destinationPlaceRef:isDeparture?to:null,
  });
}

 
// A public arrival creates a *possibility*, not a meeting or attention.
// Ask the authoritative venue index at the actual occurrence time, including
// long-stayers. An empty scene, sleeper or future visitor is no counterpart.
export function coPresentAtActorArrival(livedNowStore,occurrence,venueRef){
  if(occurrence?.kind!=="arrival"||typeof venueRef!=="string")return [];
  return livedNowStore.listCurrentVenueSituations({
    venueRef,at:occurrence.occurredAt,limit:8,
    excludeThreadId:occurrence.actorThreadId,
  }).filter(candidate=>candidate.threadId!==occurrence.actorThreadId
    &&candidate.location?.kind==="place"
    &&candidate.wakefulness!=="asleep"
    &&Date.parse(candidate.establishedAt)<=Date.parse(occurrence.occurredAt));
}
