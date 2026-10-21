// Interpret authoritative World instants in the venue's attested IANA zone.
// An unlocated occurrence has no grounded local zone: label UTC explicitly.
export function formatWorldEventTime(value,timeZone=null,{clockOnly=false}={}){
  if(typeof value!=="string"||!Number.isFinite(Date.parse(value)))return "Unknown time";
  const options={
    timeZone:timeZone??"UTC",
    ...(clockOnly?{}:{month:"short",day:"numeric"}),
    hour:"numeric",minute:"2-digit",
    ...(clockOnly?{}:{timeZoneName:timeZone?"short":"short"}),
  };
  return new Intl.DateTimeFormat("en-US",options).format(new Date(value))
    .replace(/\bGMT(?=\s|$)/gu,"UTC");
}

export function formatWorldTimeRange(overview,timeZone=null){
  const end=Date.parse(overview?.asOf);
  if(!Number.isFinite(end)||!Number.isFinite(overview?.hours)){
    return "Unknown window";
  }
  return `${formatWorldEventTime(new Date(end-overview.hours*3_600_000).toISOString(),timeZone)} – ${formatWorldEventTime(overview.asOf,timeZone)}`;
}

// A city-level time zone is defensible only if all sampled World venues agree.
export function worldCityTimeZone(overview,cityKey){
  const places=(overview?.places??[]).filter(place=>
    [place.countryCode,place.city].join(":")===cityKey);
  if(!places.length||!places[0].timeZone)return null;
  return places.every(place=>place.timeZone===places[0].timeZone)
    ?places[0].timeZone:null;
}
