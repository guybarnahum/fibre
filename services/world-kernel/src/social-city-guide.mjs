const GUIDE_VERSION="fibre-city-guide-v1";
const MAX_PLACES=12;

export function cityGuideKey(city,countryCode){
  if(typeof city!=="string"||!city.trim()
    ||typeof countryCode!=="string"||!/^[A-Z]{2}$/u.test(countryCode)){
    throw new TypeError("City Guide requires a city and ISO country code");
  }
  const slug=city.trim().toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/gu,"")
    .replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/gu,"");
  if(!slug)throw new TypeError("City Guide requires a named city");
  return `${slug}-${countryCode}`;
}

// Editorial possibilities, not World presence, visitor availability or a
// recommendation authored by a particular Thread.
export function listSocialCityGuide(manifest,{city,countryCode,limit=MAX_PLACES}={}){
  if(manifest?.version!==GUIDE_VERSION||!manifest.cities
    ||typeof manifest.cities!=="object"||Array.isArray(manifest.cities)){
    throw new TypeError("Invalid Fibre City Guide manifest");
  }
  if(!Number.isSafeInteger(limit)||limit<1||limit>MAX_PLACES){
    throw new TypeError("City Guide list must be bounded");
  }
  const key=cityGuideKey(city,countryCode);
  const section=manifest.cities[key];
  if(section===undefined){
    return {version:GUIDE_VERSION,cityKey:key,status:"not_listed",
      description:"No places are listed for this city yet; other places may exist.",
      places:[]};
  }
  if(cityGuideKey(section.city,section.countryCode)!==key||section.countryCode!==countryCode
    ||typeof section.country!=="string"||!section.country.trim()
    ||!section.places||typeof section.places!=="object"
    ||Array.isArray(section.places)){
    throw new TypeError("City Guide city identity does not match its key");
  }
  const places=Object.entries(section.places).slice(0,limit).map(([id,item])=>{
    if(typeof item.name!=="string"||!item.name.trim()
      ||typeof item.address!=="string"||!item.address.trim()
      ||typeof item.description!=="string"||!item.description.trim()
      ||typeof item.lastRecommendedAt!=="string"
      ||!/^\d{4}-\d{2}-\d{2}$/u.test(item.lastRecommendedAt)
      ||!Array.isArray(item.activities)
      ||item.activities.some(x=>typeof x!=="string"||!x.trim())
      ||typeof item.source?.directory!=="string"
      ||typeof item.source.url!=="string"||!/^https?:\/\//u.test(item.source.url)
      ||(item.worldPlaceRef!=null
        &&(typeof item.worldPlaceRef!=="string"
          ||!item.worldPlaceRef.startsWith("wpl_")))){
      throw new TypeError("City Guide contains an ungrounded place entry");
    }
    return {
      id,name:item.name,address:item.address,description:item.description,
      activities:[...item.activities],lastRecommendedAt:item.lastRecommendedAt,
      source:{directory:item.source.directory,url:item.source.url},
      worldPlaceRef:item.worldPlaceRef??null,
    };
  });
  return {version:GUIDE_VERSION,cityKey:key,status:"listed",
    city:section.city,country:section.country,countryCode,
    description:"Places to discover, not promises of company.",
    places};
}

 
// Editorial entries become possible *planning* destinations only after
// independent World admission in the Thread's own known locality.
export function localCityGuideChoices(manifest,{
  location,getPublicPlace,limit=6,asOf=null,
}={}){
  if(location?.locality==null||location?.countryCode==null)return [];
  if(typeof getPublicPlace!=="function")return [];
  const guide=listSocialCityGuide(manifest,{
    city:location.locality,countryCode:location.countryCode,limit,
  });
  return guide.places.flatMap(item=>{
    if(item.worldPlaceRef===null
      ||(asOf!==null && item.lastRecommendedAt>asOf.slice(0,10)))return [];
    const world=getPublicPlace(item.worldPlaceRef);
    if(world?.ref!==item.worldPlaceRef||world.placeKind!=="public_venue"
      ||world.authority!=="world-public-place-v1"
      ||world.countryCode!==location.countryCode
      ||world.locality.toLowerCase()!==location.locality.toLowerCase()
      ||world.streetAddress!==item.address
      ||world.evidenceRef!==item.source.url)return [];
    return [{
      ref:world.ref,description:item.description,
      activities:[...item.activities],source:item.source,
      lastRecommendedAt:item.lastRecommendedAt,
    }];
  });
}
