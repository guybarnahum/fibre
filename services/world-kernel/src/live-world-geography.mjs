import {
  IntegrityError,assertId,assertNonEmpty,
  assertPlainObject,canonicalJson,sha256,
} from "./persistence-common.mjs";
import { resolveLivePhysicalVenue,resolveLiveWorldPlace } from "./live-world-place.mjs";

const WORLD_PLACE_AUTHORITY="world-public-place-v1";
const PRIVATE_PLACE_AUTHORITY="world-private-place-v1";

function digest(value){return `sha256:${sha256(canonicalJson(value))}`;}
function text(name,value){assertNonEmpty(name,value);return value.trim();}
function coordinates(lat,long){
  if(!Number.isFinite(lat)||lat < -90||lat > 90
    ||!Number.isFinite(long)||long < -180||long > 180){
    throw new TypeError("World place requires valid geographical coordinates");
  }
}
function timeZone(value){
  text("World place timeZone",value);
  try{new Intl.DateTimeFormat("en",{timeZone:value});}
  catch{throw new TypeError("World place timeZone must be an IANA zone");}
}
function stored(row,label){
  if(!row)return null;
  const value=JSON.parse(row.record_json);
  if(row.record_digest!==digest(value)||canonicalJson(value)!==row.record_json){
    throw new IntegrityError(`${label} failed World record integrity`);
  }
  return Object.freeze(value);
}

export function createLiveWorldGeographyTables(db){
  db.exec(`
    CREATE TABLE IF NOT EXISTS world_public_places(
      place_ref TEXT PRIMARY KEY,
      venue_ref TEXT NOT NULL UNIQUE,
      locality TEXT NOT NULL,
      country_code TEXT NOT NULL,
      record_json TEXT NOT NULL CHECK(json_valid(record_json)),
      record_digest TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_world_public_places_locality
      ON world_public_places(country_code,locality,place_ref);
    CREATE INDEX IF NOT EXISTS idx_world_public_places_city
      ON world_public_places(locality COLLATE NOCASE,place_ref);
    CREATE TABLE IF NOT EXISTS world_private_place_locations(
      thread_id TEXT NOT NULL,
      place_ref TEXT NOT NULL,
      record_json TEXT NOT NULL CHECK(json_valid(record_json)),
      record_digest TEXT NOT NULL,
      PRIMARY KEY(thread_id,place_ref)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS world_places(
      place_ref TEXT PRIMARY KEY,
      record_json TEXT NOT NULL CHECK(json_valid(record_json)),
      record_digest TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS thread_known_places(
      thread_id TEXT NOT NULL,
      place_ref TEXT NOT NULL,
      PRIMARY KEY(thread_id,place_ref)
    ) STRICT;
  `);
}



function placeKey(value){return text("World place name",value).normalize("NFKC").toLocaleLowerCase("en-US");}

// One World entity for a city. An unverified specific place is scoped to its
// discoverer until its physical identity can be independently established.
export function getWorldPlaceEntity(db,threadId,placeRef){
  if(typeof placeRef!=="string"||!placeRef.startsWith("wpl_"))return null;
  const row=db.prepare(`SELECT p.record_json,p.record_digest
    FROM world_places p JOIN thread_known_places k ON k.place_ref=p.place_ref
    WHERE p.place_ref=? AND k.thread_id=?`).get(placeRef,threadId);
  return stored(row,"World place");
}

export function listKnownWorldPlaces(db,threadId,{limit=24}={}){
  assertId("known World Thread",threadId);
  if(!Number.isSafeInteger(limit)||limit<1||limit>64)
    throw new TypeError("known World places need bounded limit");
  return Object.freeze(db.prepare(`SELECT p.record_json,p.record_digest
    FROM thread_known_places k JOIN world_places p ON p.place_ref=k.place_ref
    WHERE k.thread_id=? ORDER BY p.place_ref LIMIT ?`
  ).all(threadId,limit).map(row=>stored(row,"World place")));
}

export function resolveWorldPlace(db,{threadId,name,city=null,country=null,kind="place",geography=null}={}){
  assertId("World place Thread",threadId);
  const title=text("World place name",name);
  if(!["city","place"].includes(kind))throw new TypeError("World place kind must be city or place");
  const locality=kind==="city"?title:(city===null?null:text("World place city",city));
  const nation=country===null?null:text("World place country",country);
  const identity={kind,name:placeKey(title),city:locality===null?null:placeKey(locality),
    country:nation===null?null:placeKey(nation),
    ...(kind==="place"?{threadId}:{})};
  const ref=`wpl_${sha256(canonicalJson(identity))}`;
  const row=db.prepare("SELECT record_json,record_digest FROM world_places WHERE place_ref=?").get(ref);
  const prior=stored(row,"World place");
  if(geography!==null){
    assertPlainObject("World place geography",geography);
    if(nation===null||locality===null
      ||placeKey(geography.locality)!==placeKey(locality)
      ||placeKey(geography.country)!==placeKey(nation)){
      throw new TypeError("World place geography must match its named city and country");
    }
    coordinates(geography.lat,geography.long);
    timeZone(geography.timeZone);
  }
  const knownGeo=geography??(prior?.lat===null?null:{
    locality:prior.locality,country:prior.country,countryCode:prior.countryCode,
    lat:prior.lat,long:prior.long,timeZone:prior.timeZone,
    evidenceRef:prior.evidenceRef,
  });
  if(prior!==null&&geography!==null&&prior.lat!==null
    &&(prior.lat!==geography.lat||prior.long!==geography.long)){
    throw new IntegrityError("World place geographic evidence conflicts with existing location");
  }
  const record=Object.freeze({
    ref,displayName:kind==="city"&&nation!==null?`${title}, ${nation}`:title,
    placeKind:kind,locality,country:nation,
    countryCode:knownGeo?.countryCode??null,
    lat:knownGeo?.lat??null,long:knownGeo?.long??null,
    timeZone:knownGeo?.timeZone??null,evidenceRef:knownGeo?.evidenceRef??null,
    mapPrecision:knownGeo===null?null:"city",
    ...(kind==="place"?{ownerThreadId:threadId}:{}),
    authority:"world-place-v1",
  });
  if(prior===null){
    db.prepare(`INSERT INTO world_places(place_ref,record_json,record_digest)
      VALUES(?,?,?)`).run(ref,canonicalJson(record),digest(record));
  }else if(canonicalJson(prior)!==canonicalJson(record)){
    db.prepare(`UPDATE world_places SET record_json=?,record_digest=?
      WHERE place_ref=?`).run(canonicalJson(record),digest(record),ref);
  }
  db.prepare(`INSERT OR IGNORE INTO thread_known_places(thread_id,place_ref)
    VALUES(?,?)`).run(threadId,ref);
  return record;
}

export function admitWorldPublicPlace(db,input){
  assertPlainObject("public World place",input);
  const {
    venueIdentity,displayName,streetAddress,locality,country,countryCode,
    lat,long,timeZone:zone,evidenceRef,affordances,
  }=input;
  for(const [name,value] of Object.entries({
    venueIdentity,displayName,streetAddress,locality,country,countryCode,
    timeZone:zone,evidenceRef,
  }))text(`public World place ${name}`,value);
  coordinates(lat,long);timeZone(zone);
  if(!Array.isArray(affordances)||affordances.length===0||affordances.length>8
    ||affordances.some((item)=>typeof item!=="string"||!item.trim())){
    throw new TypeError("public World place requires bounded real affordances");
  }
  const venueRef=`venue_${sha256(canonicalJson({
    identity:venueIdentity.trim(),country:country.trim(),
  }))}`;
  const priorVenue=resolveLivePhysicalVenue(db,venueRef);
  if(priorVenue!==null&&(priorVenue.displayName!==displayName.trim()
    ||priorVenue.locality!==locality.trim()||priorVenue.country!==country.trim())){
    throw new IntegrityError("public World venue contradicts an existing attestation");
  }
  const record=Object.freeze({
    ref:`wpl_${sha256(canonicalJson({venueRef}))}`,
    placeKind:"public_venue",
    displayName:displayName.trim(),streetAddress:streetAddress.trim(),
    locality:locality.trim(),country:country.trim(),countryCode:countryCode.trim(),
    lat,long,timeZone:zone,evidenceRef:evidenceRef.trim(),
    affordances:Object.freeze([...new Set(affordances.map(s=>s.trim()))]),
    physicalVenue:Object.freeze({
      ref:venueRef,displayName:displayName.trim(),locality:locality.trim(),
      country:country.trim(),evidenceRef:evidenceRef.trim(),
    }),
    authority:WORLD_PLACE_AUTHORITY,
  });
  const existing=stored(db.prepare(
    "SELECT record_json,record_digest FROM world_public_places WHERE place_ref=?",
  ).get(record.ref),"public World place");
  if(existing!==null){
    if(canonicalJson(existing)!==canonicalJson(record)){
      throw new IntegrityError("public World venue identity has conflicting facts");
    }
    return existing;
  }
  db.prepare(`INSERT INTO world_public_places(
    place_ref,venue_ref,locality,country_code,record_json,record_digest
  ) VALUES(?,?,?,?,?,?)`).run(
    record.ref,venueRef,record.locality,record.countryCode,canonicalJson(record),digest(record),
  );
  return record;
}

export function getWorldPublicPlace(db,placeRef){
  if(typeof placeRef!=="string"||!placeRef.startsWith("wpl_"))return null;
  return stored(db.prepare(
    "SELECT record_json,record_digest FROM world_public_places WHERE place_ref=?",
  ).get(placeRef),"public World place");
}

export function listLocalWorldPublicPlaces(db,{locality,countryCode=null,limit=12}){
  text("World locality",locality);
  if(countryCode!==null)text("World countryCode",countryCode);
  if(!Number.isSafeInteger(limit)||limit<1||limit>20){
    throw new TypeError("World venue discovery must be bounded");
  }
  const sql=countryCode===null
    ?`SELECT record_json,record_digest FROM world_public_places
       WHERE locality=? COLLATE NOCASE ORDER BY place_ref LIMIT ?`
    :`SELECT record_json,record_digest FROM world_public_places
       WHERE country_code=? AND locality=? COLLATE NOCASE
       ORDER BY place_ref LIMIT ?`;
  const rows=countryCode===null
    ?db.prepare(sql).all(locality,limit)
    :db.prepare(sql).all(countryCode,locality,limit);
  return rows.map(row=>stored(row,"public World place"));
}

// This is a current-life World attestation, never a rewriting of Genesis history.
export function admitWorldPrivatePlace(db,input){
  assertPlainObject("private World place",input);
  const {
    threadId,placeRef,specificPlace,streetAddress,locality,country,countryCode,
    lat,long,timeZone:zone,evidenceRef,publicGranularity="hidden",
  }=input;
  assertId("private World Thread",threadId);
  assertId("private World placeRef",placeRef);
  for(const [name,value] of Object.entries({
    specificPlace,locality,country,countryCode,timeZone:zone,evidenceRef,
  }))text(`private World place ${name}`,value);
  if(streetAddress!==null&&streetAddress!==undefined)text("private World streetAddress",streetAddress);
  if((lat===null||lat===undefined)!==(long===null||long===undefined)){
    throw new TypeError("private World coordinates must be known together");
  }
  if(lat!==null&&lat!==undefined)coordinates(lat,long);
  if((streetAddress===null||streetAddress===undefined)
    &&lat!==null&&lat!==undefined){
    throw new TypeError("private World precise coordinates need an attested street address");
  }
  timeZone(zone);
  if(!["hidden","country","city"].includes(publicGranularity)){
    throw new TypeError("private place publicGranularity must be hidden, country or city");
  }
  if(placeRef.startsWith("wpl_")){
    // Genesis World learning/home contexts have historically used wpl_ refs,
    // but they are not independently attested public venues. A locality
    // attestation belongs to this Thread's context only.
    const context=resolveLiveWorldPlace(db,threadId,placeRef);
    if((context?.authority!=="live-world-place-admission-v1"||context.physicalVenue)
      &&getWorldPlaceEntity(db,threadId,placeRef)===null){
      throw new TypeError("private World locality requires an owned nonpublic place");
    }
  }else{
    const evidence=db.prepare(`SELECT 1 AS present FROM situated_evidence_witnesses
      WHERE thread_id=? AND reference=? AND witness_kind='place_episode_revision'
      LIMIT 1`).get(threadId,placeRef);
    if(!evidence)throw new TypeError("private World place requires a Thread-owned situated place");
  }
  const record=Object.freeze({
    threadId,placeRef,specificPlace:specificPlace.trim(),
    streetAddress:streetAddress==null?null:streetAddress.trim(),
    locality:locality.trim(),country:country.trim(),countryCode:countryCode.trim(),
    lat:lat??null,long:long??null,timeZone:zone,
    evidenceRef:evidenceRef.trim(),publicGranularity,
    authority:PRIVATE_PLACE_AUTHORITY,
  });
  const existing=getWorldPrivatePlace(db,threadId,placeRef);
  if(existing!==null){
    if(canonicalJson(existing)!==canonicalJson(record)){
      throw new IntegrityError("private World place has conflicting identity; admit a new lived place instead");
    }
    return existing;
  }
  db.prepare(`INSERT INTO world_private_place_locations(
    thread_id,place_ref,record_json,record_digest
  ) VALUES(?,?,?,?)`).run(threadId,placeRef,canonicalJson(record),digest(record));
  return record;
}

export function getWorldPrivatePlace(db,threadId,placeRef){
  if(typeof placeRef!=="string"||(!placeRef.startsWith("per:")
    &&!placeRef.startsWith("wpl_")))return null;
  return stored(db.prepare(`SELECT record_json,record_digest
    FROM world_private_place_locations WHERE thread_id=? AND place_ref=?`
  ).get(threadId,placeRef),"private World place");
}

export function coarseWorldPlace(privatePlace){
  if(privatePlace===null||privatePlace.publicGranularity==="hidden")return null;
  return Object.freeze({
    displayName:privatePlace.publicGranularity==="city"
      ?`${privatePlace.locality}, ${privatePlace.country}`
      :privatePlace.country,
    region:null,
  });
}
