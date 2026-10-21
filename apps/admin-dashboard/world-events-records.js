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
