import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";
import { topology } from "../validation/encounter-autonomy-probe.mjs";

const guideFile=new URL("../../data/social-city-guide.json",import.meta.url);
const admissionsFile=new URL("../../data/social-city-guide-admissions.json",import.meta.url);

export function pendingCityGuideAdmissions(guide,admissions){
  if(guide?.version!=="fibre-city-guide-v1"
    ||admissions?.version!=="fibre-city-guide-admissions-v1"
    ||!Array.isArray(admissions.venues)){
    throw new TypeError("City Guide and its venue admissions must be current");
  }
  const keys=new Set();
  return admissions.venues.flatMap(entry=>{
    const key=`${entry.cityKey}/${entry.placeKey}`;
    if(keys.has(key))throw new Error("duplicate City Guide admission: "+key);
    keys.add(key);
    const city=guide.cities?.[entry.cityKey];
    const place=city?.places?.[entry.placeKey];
    if(!place)throw new Error("missing City Guide place: "+key);
    if(place.worldPlaceRef!==null)return [];
    if(!Number.isFinite(entry.lat)||!Number.isFinite(entry.long)
      ||entry.lat < -90||entry.lat > 90||entry.long < -180||entry.long > 180
      ||typeof entry.coordinateSource!=="string"
      ||!entry.coordinateSource.startsWith("https://")
      ||!Array.isArray(place.activities)||place.activities.length<1
      ||place.activities.length>8){
      throw new Error("ungrounded World venue: "+key);
    }
    return [{
      cityKey:entry.cityKey,placeKey:entry.placeKey,
      coordinateSource:entry.coordinateSource,
      admission:{
        venueIdentity:entry.venueIdentity,
        displayName:place.name,
        streetAddress:place.address,
        locality:city.city,country:city.country,countryCode:city.countryCode,
        lat:entry.lat,long:entry.long,timeZone:entry.timeZone,
        evidenceRef:place.source.url,affordances:place.activities,
      },
    }];
  });
}

async function main(argv){
  let env=null,plan=false,apply=false;
  for(let i=0;i<argv.length;i++){
    if(argv[i]==="--env")env=normalizeCloudflareEnvironment(argv[++i]);
    else if(argv[i]==="--plan")plan=true;
    else if(argv[i]==="--apply")apply=true;
    else throw new TypeError("unsupported City Guide admission argument "+argv[i]);
  }
  if(!env||plan===apply){
    throw new TypeError("usage: --env staging|production (--plan | --apply)");
  }
  const guide=JSON.parse(readFileSync(guideFile,"utf8"));
  const admissionSpecs=JSON.parse(readFileSync(admissionsFile,"utf8"));
  const pending=pendingCityGuideAdmissions(guide,admissionSpecs);
  if(plan){
    process.stdout.write(JSON.stringify({
      environment:env,pending:pending.length,
      venues:pending.map(({cityKey,placeKey,coordinateSource,admission})=>({
        cityKey,placeKey,address:admission.streetAddress,coordinateSource,
        lat:admission.lat,long:admission.long,source:admission.evidenceRef,
      })),
    },null,2)+"\n");
    return;
  }
  if(!pending.length){
    process.stdout.write("City Guide World admissions are already recorded locally.\n");
    return;
  }
  const token=process.env.FIBRE_PRIVATE_TOKEN;
  if(!token)throw new Error("FIBRE_PRIVATE_TOKEN is required");
  const base=topology(env).worldBaseUrl;
  for(const {cityKey,placeKey,admission} of pending){
    const response=await fetch(base+"/internal/world-venues/admit-public",{
      method:"POST",
      headers:{Accept:"application/json",
        "content-type":"application/json","x-fibre-private-token":token},
      body:JSON.stringify(admission),signal:AbortSignal.timeout(30000),
    });
    const json=await response.json().catch(()=>null);
    if(!response.ok||json?.ok!==true){
      throw new Error(`World venue ${cityKey}/${placeKey}: HTTP ${response.status} ${json?.detail??json?.error??"unknown"}`);
    }
    const place=json.place;
    if(place?.authority!=="world-public-place-v1"
      ||place.ref?.startsWith("wpl_")!==true
      ||place.streetAddress!==admission.streetAddress
      ||place.evidenceRef!==admission.evidenceRef
      ||place.locality!==admission.locality
      ||place.countryCode!==admission.countryCode){
      throw new Error("World admission did not match City Guide evidence: "+placeKey);
    }
    guide.cities[cityKey].places[placeKey].worldPlaceRef=place.ref;
    // Each successful admission is saved immediately; reruns resume safely
    // after network errors and the World independently enforces idempotence.
    writeFileSync(guideFile,JSON.stringify(guide,null,2)+"\n");
    process.stdout.write(JSON.stringify({
      city:admission.locality,venue:admission.displayName,
      worldPlaceRef:place.ref,
    })+"\n");
  }
  process.stdout.write("World venues admitted. Commit the modified City Guide and deploy it before expecting Thread planning to discover these places.\n");
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  main(process.argv.slice(2)).catch(error=>{
    process.stderr.write(String(error?.message??error)+"\n");
    process.exitCode=1;
  });
}
