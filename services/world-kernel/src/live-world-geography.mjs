import {
  IntegrityError,assertId,assertNonEmpty,
  assertPlainObject,canonicalJson,sha256,
} from "./persistence-common.mjs";
import { resolveLivePhysicalVenue } from "./live-world-place.mjs";

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
    CREATE TABLE IF NOT EXISTS world_private_place_locations(
      thread_id TEXT NOT NULL,
      place_ref TEXT NOT NULL,
      record_json TEXT NOT NULL CHECK(json_valid(record_json)),
      record_digest TEXT NOT NULL,
      PRIMARY KEY(thread_id,place_ref)
    ) STRICT;
  `);
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

export function listLocalWorldPublicPlaces(db,{locality,countryCode,limit=12}){
  text("World locality",locality);text("World countryCode",countryCode);
  if(!Number.isSafeInteger(limit)||limit<1||limit>20){
    throw new TypeError("World venue discovery must be bounded");
  }
  return db.prepare(`SELECT record_json,record_digest
    FROM world_public_places WHERE country_code=? AND locality=?
    ORDER BY place_ref LIMIT ?`).all(countryCode,locality,limit)
    .map(row=>stored(row,"public World place"));
}

// This is a current-life World attestation, never a rewriting of Genesis history.
export function admitWorldPrivatePlace(db,input){
  assertPlainObject("private World place",input);
  const {
    threadId,placeRef,specificPlace,streetAddress,locality,country,countryCode,
    lat,long,timeZone:zone,evidenceRef,
  }=input;
  assertId("private World Thread",threadId);
  assertId("private World placeRef",placeRef);
  for(const [name,value] of Object.entries({
    specificPlace,streetAddress,locality,country,countryCode,timeZone:zone,evidenceRef,
  }))text(`private World place ${name}`,value);
  coordinates(lat,long);timeZone(zone);
  const evidence=db.prepare(`SELECT 1 AS present FROM situated_evidence_witnesses
    WHERE thread_id=? AND reference=? AND witness_kind='place_episode_revision'
    LIMIT 1`).get(threadId,placeRef);
  if(!evidence)throw new TypeError("private World place requires a Thread-owned situated place");
  const record=Object.freeze({
    threadId,placeRef,specificPlace:specificPlace.trim(),
    streetAddress:streetAddress.trim(),locality:locality.trim(),
    country:country.trim(),countryCode:countryCode.trim(),
    lat,long,timeZone:zone,evidenceRef:evidenceRef.trim(),
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
  if(typeof placeRef!=="string"||!placeRef.startsWith("per:"))return null;
  return stored(db.prepare(`SELECT record_json,record_digest
    FROM world_private_place_locations WHERE thread_id=? AND place_ref=?`
  ).get(threadId,placeRef),"private World place");
}

export function coarseWorldPlace(privatePlace){
  if(privatePlace===null)return null;
  return Object.freeze({
    displayName:`${privatePlace.locality}, ${privatePlace.country}`,region:null,
  });
}
