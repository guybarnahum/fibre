// World state usage for one UTC day: account-wide Durable Object rows read
// and written, by hour, against the free-tier daily limits. Shows when a day's
// quota went, so its cause can be found in that hour's world-state-cost logs.
import { pathToFileURL } from "node:url";
import { RESOURCE_HEALTH_DEFAULT_LIMITS } from "../../infra/providers/cloudflare/resource-health.mjs";

const USAGE="usage: infra:state-usage [-- --date YYYY-MM-DD]";
const QUERY=`query FibreStateUsage($accountTag:String!,$date:Date!){viewer{accounts(filter:{accountTag:$accountTag}){
  durableObjectsPeriodicGroups(limit:10000,filter:{date_geq:$date,date_leq:$date}){
    sum{rowsRead rowsWritten} dimensions{datetimeHour}}}}}`;

function hourlyStateUsage(groups){
  const hours=new Map();
  for(const group of groups){
    const hour=group.dimensions.datetimeHour.slice(11,13);
    const total=hours.get(hour)??{hour,read:0,written:0};
    total.read+=group.sum.rowsRead;
    total.written+=group.sum.rowsWritten;
    hours.set(hour,total);
  }
  return [...hours.values()].sort((a,b)=>a.hour.localeCompare(b.hour));
}

async function main(argv){
  let date=new Date().toISOString().slice(0,10);
  for(let i=0;i<argv.length;i++){
    if(argv[i]==="--date"&&/^\d{4}-\d{2}-\d{2}$/u.test(argv[i+1]??""))date=argv[++i];
    else throw new TypeError(USAGE);
  }
  const accountTag=process.env.CLOUDFLARE_ACCOUNT_ID;
  const token=process.env.FIBRE_CLOUDFLARE_ANALYTICS_TOKEN??process.env.CLOUDFLARE_API_TOKEN;
  if(!accountTag||!token)throw new Error("CLOUDFLARE_ACCOUNT_ID and an analytics token are required");
  const response=await fetch("https://api.cloudflare.com/client/v4/graphql",{method:"POST",
    headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
    body:JSON.stringify({query:QUERY,variables:{accountTag,date}}),signal:AbortSignal.timeout(30_000)});
  const payload=await response.json();
  if(!response.ok||payload.errors?.length)
    throw new Error(payload.errors?.map(item=>item.message).join("; ")??`HTTP ${response.status}`);
  const hours=hourlyStateUsage(payload.data.viewer.accounts[0].durableObjectsPeriodicGroups);
  const limits=RESOURCE_HEALTH_DEFAULT_LIMITS;
  const number=(value)=>value.toLocaleString("en-US");
  for(const {hour,read,written} of hours)
    console.log(`${hour}:00 UTC  read ${number(read).padStart(11)}  written ${number(written).padStart(8)}`);
  const read=hours.reduce((sum,item)=>sum+item.read,0);
  const written=hours.reduce((sum,item)=>sum+item.written,0);
  console.log(`UTC ${date}: read ${number(read)} of ${number(limits.durableObjectRowsReadDaily)}`
    +` · written ${number(written)} of ${number(limits.durableObjectRowsWrittenDaily)} (account-wide)`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main(process.argv.slice(2)).catch(error=>{
    process.stderr.write(`State usage: ${error.message}\n`);
    process.exitCode=1;
  });
}
