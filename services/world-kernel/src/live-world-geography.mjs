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
      record_digest TEXT NOT NULL,
      discovery_json TEXT NOT NULL DEFAULT 'null' CHECK(json_valid(discovery_json)),
      appearance_json TEXT NOT NULL DEFAULT 'null' CHECK(json_valid(appearance_json))
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
  // Migrate old World venue rows at schema installation, never per request.
  const columns=db.prepare("PRAGMA table_info(world_public_places)").all();
  if(!columns.some(column=>column.name==="discovery_json")){
    db.exec("ALTER TABLE world_public_places ADD COLUMN discovery_json TEXT NOT NULL DEFAULT 'null' CHECK(json_valid(discovery_json))");
  }
  if(!columns.some(column=>column.name==="appearance_json")){
    db.exec("ALTER TABLE world_public_places ADD COLUMN appearance_json TEXT NOT NULL DEFAULT 'null' CHECK(json_valid(appearance_json))");
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_world_public_places_discovery
    ON world_public_places(country_code,locality,place_ref)
    WHERE json_extract(discovery_json,'$.listed')=1`);
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

export function resolveWorldPlace(db,{threadId,name,city=null,country=null,kind="place",geography=null,parentRef=null}={}){
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
    if(geography.timeZone!==null&&geography.timeZone!==undefined)timeZone(geography.timeZone);
  }
  // The existing World entity wins over a later approximate city lookup.
  // Choosing the same place must not fail because two map catalogs round a
  // city's centroid differently.
  const knownGeo=prior!==null&&prior.lat!==null?{
    locality:prior.locality,country:prior.country,countryCode:prior.countryCode,
    lat:prior.lat,long:prior.long,
    timeZone:prior.timeZone??geography?.timeZone??null,
    evidenceRef:prior.evidenceRef,
  }:geography;
  const record=Object.freeze({
    ref,displayName:kind==="city"&&nation!==null?`${title}, ${nation}`:title,
    placeKind:kind,locality,country:nation,
    countryCode:knownGeo?.countryCode??null,
    lat:knownGeo?.lat??null,long:knownGeo?.long??null,
    timeZone:knownGeo?.timeZone??null,evidenceRef:knownGeo?.evidenceRef??null,
    mapPrecision:knownGeo===null?null:"city",
    ...(kind==="place"?{ownerThreadId:threadId,parentRef}:{}),
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
    "SELECT record_json,record_digest,discovery_json,appearance_json FROM world_public_places WHERE place_ref=?",
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

function publicPlaceFromRow(row){
  const place=stored(row,"public World place");
  if(place===null)return null;
  return Object.freeze({
    ...place,
    ...(row.discovery_json&&row.discovery_json!=="null"
      ?{discovery:Object.freeze(JSON.parse(row.discovery_json))}:{}),
    ...(row.appearance_json&&row.appearance_json!=="null"
      ?{appearance:Object.freeze(JSON.parse(row.appearance_json))}:{}),
  });
}

export function getWorldPublicPlace(db,placeRef){
  if(typeof placeRef!=="string"||!placeRef.startsWith("wpl_"))return null;
  return publicPlaceFromRow(db.prepare(
    "SELECT record_json,record_digest,discovery_json,appearance_json FROM world_public_places WHERE place_ref=?",
  ).get(placeRef));
}

// A visual seed describes one possible view; it never becomes evidence of
// the place's actual geometry or of events that happened there.
export function setWorldPublicPlaceAppearance(db,{placeRef,appearance}={}){
  if(getWorldPublicPlace(db,placeRef)===null){
    throw new TypeError("appearance requires an admitted public World place");
  }
  if(appearance!==null){
    assertPlainObject("World place appearance",appearance);
    const keys=Object.keys(appearance).sort();
    if(canonicalJson(keys)!==canonicalJson(["assetRef","projection","prompt","viewpoint"])){
      throw new TypeError("appearance requires prompt, viewpoint, projection and assetRef");
    }
    text("World place appearance prompt",appearance.prompt);
    text("World place appearance viewpoint",appearance.viewpoint);
    if(!["perspective","equirectangular"].includes(appearance.projection)){
      throw new TypeError("World place projection must be perspective or equirectangular");
    }
    if(appearance.assetRef!==null){
      text("World place appearance assetRef",appearance.assetRef);
    }
  }
  const json=appearance===null?"null":canonicalJson({
    prompt:appearance.prompt.trim(),viewpoint:appearance.viewpoint.trim(),
    projection:appearance.projection,assetRef:appearance.assetRef,
  });
  db.prepare("UPDATE world_public_places SET appearance_json=? WHERE place_ref=?")
    .run(json,placeRef);
  return getWorldPublicPlace(db,placeRef);
}

// Curating a venue is not changing its attested physical identity.
export function setWorldPublicPlaceDiscovery(db,{placeRef,discovery}={}){
  if(getWorldPublicPlace(db,placeRef)===null){
    throw new TypeError("discovery requires an admitted public World place");
  }
  if(discovery!==null){
    assertPlainObject("World place discovery",discovery);
    const keys=Object.keys(discovery).sort();
    if(canonicalJson(keys)!==canonicalJson(["description","lastRecommendedAt","listed"])){
      throw new TypeError("discovery requires listed, description and lastRecommendedAt");
    }
    if(typeof discovery.listed!=="boolean")throw new TypeError("discovery listed must be boolean");
    text("discovery description",discovery.description);
    if(typeof discovery.lastRecommendedAt!=="string"
      ||!/^\d{4}-\d{2}-\d{2}$/u.test(discovery.lastRecommendedAt)
      ||!Number.isFinite(Date.parse(discovery.lastRecommendedAt+"T00:00:00Z"))){
      throw new TypeError("discovery requires a valid recommendation date");
    }
  }
  const json=discovery===null?"null":canonicalJson({
    listed:discovery.listed,description:discovery.description.trim(),
    lastRecommendedAt:discovery.lastRecommendedAt,
  });
  db.prepare("UPDATE world_public_places SET discovery_json=? WHERE place_ref=?")
    .run(json,placeRef);
  return getWorldPublicPlace(db,placeRef);
}

export function listDiscoverableWorldPublicPlaces(db,{locality,countryCode,limit=6}={}){
  text("World locality",locality);
  text("World countryCode",countryCode);
  if(!Number.isSafeInteger(limit)||limit<1||limit>12){
    throw new TypeError("World discoverable places need bounded limit");
  }
  return Object.freeze(db.prepare(`SELECT record_json,record_digest,discovery_json
    FROM world_public_places
    WHERE country_code=? AND locality=? COLLATE NOCASE
      AND json_extract(discovery_json,'$.listed')=1
    ORDER BY place_ref LIMIT ?`
  ).all(countryCode,locality,limit).map(publicPlaceFromRow));
}

export function listLocalWorldPublicPlaces(db,{locality,countryCode=null,limit=12}){
  text("World locality",locality);
  if(countryCode!==null)text("World countryCode",countryCode);
  if(!Number.isSafeInteger(limit)||limit<1||limit>20){
    throw new TypeError("World venue discovery must be bounded");
  }
  const sql=countryCode===null
    ?`SELECT record_json,record_digest,discovery_json,appearance_json FROM world_public_places
       WHERE locality=? COLLATE NOCASE ORDER BY place_ref LIMIT ?`
    :`SELECT record_json,record_digest,discovery_json,appearance_json FROM world_public_places
       WHERE country_code=? AND locality=? COLLATE NOCASE
       ORDER BY place_ref LIMIT ?`;
  const rows=countryCode===null
    ?db.prepare(sql).all(locality,limit)
    :db.prepare(sql).all(countryCode,locality,limit);
  return rows.map(publicPlaceFromRow);
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
