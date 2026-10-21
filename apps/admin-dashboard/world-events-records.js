// Read-only export scopes. World remains the authority; never infer missing events.
export function worldEventPlaceTimeline(overview,placeRef){
  return (overview?.events??[])
    .filter(event=>event.placeRef===placeRef)
    .sort((a,b)=>String(b.occurredAt).localeCompare(String(a.occurredAt))
      ||String(a.eventRef).localeCompare(String(b.eventRef)));
}

export function worldEventPlaceDayRecord(overview,place){
  if(overview?.hours!==24)throw new TypeError("venue day export needs a 24-hour World view");
  if(typeof place?.placeRef!=="string"||!place.placeRef){
    throw new TypeError("venue day export needs an attested place");
  }
  const events=worldEventPlaceTimeline(overview,place.placeRef);
  return {
    contract:overview.contract,
    scope:"venue_rolling_24_hours",asOf:overview.asOf,hours:24,
    since:new Date(Date.parse(overview.asOf)-24*3_600_000).toISOString(),
    coverage:overview.coverage,
    place:{placeRef:place.placeRef,name:place.name,city:place.city,
      country:place.country,sourcePlaceEvidence:"verified_public"},
    eventCount:events.length,events,
    note:"Events returned for this venue in the bounded World 24-hour overview; a source cap may omit events.",
  };
}

// A venue stay is known only when two enacted movement facts bracket it.
// Incomplete/capped windows do not authorize us to extend a stay to "now".
export function worldVenueCoPresence(overview,placeRef){
  const movements=worldEventPlaceTimeline(overview,placeRef)
    .filter(event=>event.source==="world_enacted"
      &&["arrival","departure"].includes(event.kind)
      &&typeof event.actorThreadId==="string"
      &&Number.isFinite(Date.parse(event.occurredAt)))
    .sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt)
      ||a.eventRef.localeCompare(b.eventRef));
  const open=new Map(),stays=[];
  let unmatched=0;
  for(const event of movements){
    const threadId=event.actorThreadId;
    if(event.kind==="arrival"){
      if(open.has(threadId))unmatched++;
      open.set(threadId,event);
      continue;
    }
    const arrival=open.get(threadId);
    if(arrival===undefined){unmatched++;continue;}
    open.delete(threadId);
    const start=Date.parse(arrival.occurredAt),end=Date.parse(event.occurredAt);
    if(end<=start){unmatched++;continue;}
    stays.push({
      threadId,enteredAt:arrival.occurredAt,leftAt:event.occurredAt,
      arrivalRef:arrival.eventRef,departureRef:event.eventRef,
    });
  }
  unmatched+=open.size;
  stays.sort((a,b)=>a.enteredAt.localeCompare(b.enteredAt)
    ||a.threadId.localeCompare(b.threadId));
  // Sweep current overlapping stays rather than comparing every pair.
  const active=[],overlaps=[];
  let additionalOverlaps=false;
  for(const stay of stays){
    const start=Date.parse(stay.enteredAt),end=Date.parse(stay.leftAt);
    for(let i=active.length-1;i>=0;i--){
      if(Date.parse(active[i].leftAt)<=start)active.splice(i,1);
    }
    for(const other of active){
      if(other.threadId===stay.threadId)continue;
      const until=Math.min(end,Date.parse(other.leftAt));
      if(until<=start)continue;
      if(overlaps.length>=20){additionalOverlaps=true;continue;}
      overlaps.push({
        threadIds:[other.threadId,stay.threadId],
        from:new Date(start).toISOString(),until:new Date(until).toISOString(),
        durationMinutes:(until-start)/60_000,
        arrivalRefs:[other.arrivalRef,stay.arrivalRef],
      });
    }
    active.push(stay);
  }
  overlaps.sort((a,b)=>a.from.localeCompare(b.from));
  return {
    stays,overlaps,additionalOverlaps,unmatchedMovements:unmatched,
    sourceCapped:Object.entries(overview?.coverage??{}).some(([key,value])=>
      key.endsWith("Truncated")&&value===true),
  };
}
