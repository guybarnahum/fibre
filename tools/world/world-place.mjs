import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {normalizeCloudflareEnvironment} from "../deployment/cloudflare-operator.mjs";
import {topology} from "../validation/encounter-autonomy-probe.mjs";

function required(name,value){
  if(typeof value!=="string"||!value.trim())throw new TypeError(`${name} is required`);
  return value.trim();
}
function args(argv){
  let env=null,command=null,file=null,locality=null,countryCode=null;
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(arg==="--env")env=argv[++i];
    else if(arg==="--file")file=argv[++i];
    else if(arg==="--locality")locality=argv[++i];
    else if(arg==="--country-code")countryCode=argv[++i];
    else if(command===null&&["admit-public","locate-private","discovery","list"].includes(arg))command=arg;
    else throw new TypeError(`unsupported World place argument: ${arg}`);
  }
  const environment=normalizeCloudflareEnvironment(required("--env",env));
  if(command===null)throw new TypeError("use admit-public, locate-private, discovery or list");
  if(command==="list"){
    required("--locality",locality);required("--country-code",countryCode);
    if(file!==null)throw new TypeError("list does not accept --file");
  }else{
    required("--file",file);
    if(locality!==null||countryCode!==null)throw new TypeError("admission uses only --file");
  }
  return {environment,command,file,locality,countryCode};
}
async function main(argv){
  const {environment,command,file,locality,countryCode}=args(argv);
  const token=required("FIBRE_PRIVATE_TOKEN",process.env.FIBRE_PRIVATE_TOKEN);
  const base=topology(environment).worldBaseUrl;
  const url=new URL(base);
  url.pathname=`/internal/world-venues/${command==="list"?"places":command}`;
  if(command==="list"){
    url.searchParams.set("locality",locality);
    url.searchParams.set("countryCode",countryCode);
  }
  const body=command==="list"?null:JSON.parse(readFileSync(file,"utf8"));
  const response=await fetch(url,{
    method:command==="list"?"GET":"POST",
    headers:{
      Accept:"application/json",
      "x-fibre-private-token":token,
      ...(body===null?{}:{"content-type":"application/json"}),
    },
    ...(body===null?{}:{body:JSON.stringify(body)}),
    signal:AbortSignal.timeout(20000),
  });
  const result=await response.json();
  if(!response.ok||result.ok!==true){
    throw new Error(`World place ${command} failed HTTP ${response.status}: ${result.detail??result.error??"unknown"}`);
  }
  if(command==="list"){
    process.stdout.write(JSON.stringify({
      event:"world-places-listed",environment,locality,countryCode,
      places:result.places.map(place=>({
        ref:place.ref,venueRef:place.physicalVenue.ref,
        name:place.displayName,address:place.streetAddress,
        evidenceRef:place.evidenceRef,discovery:place.discovery??null,
      })),
    },null,2)+"\n");
    return;
  }
  // Exact homes remain in the private World, never in operator console logs.
  const place=result.place;
  process.stdout.write(JSON.stringify(command==="locate-private"?{
    event:"private-world-place-admitted",environment,threadId:place.threadId,
    placeRef:place.placeRef,locality:place.locality,country:place.country,
    precision:place.streetAddress===null?"locality":"address",
    publicGranularity:place.publicGranularity,
  }:command==="discovery"?{
    event:"public-world-place-discovery-updated",environment,placeRef:place.ref,
    name:place.displayName,discovery:place.discovery??null,
  }:{
    event:"public-world-place-admitted",environment,placeRef:place.ref,
    venueRef:place.physicalVenue.ref,name:place.displayName,
    locality:place.locality,country:place.country,
  })+"\n");
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
  main(process.argv.slice(2)).catch(error=>{
    process.stderr.write(`World place: ${String(error.message??error).slice(0,300)}\n`);
    process.exitCode=1;
  });
}
