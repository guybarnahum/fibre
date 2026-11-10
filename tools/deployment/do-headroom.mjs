// Account-wide Durable Object free-tier headroom, sampled once before upload.
// Both daily budgets stop the World when spent: rows written, and rows read
// (on November 9, 2026, one schema install read 16 million rows and the World
// stopped until the next UTC day). Use the same Cloudflare analytics dataset
// as Fibre's infrastructure monitor.
import {RESOURCE_HEALTH_DEFAULT_LIMITS} from "#infra/providers/cloudflare";

const GRAPHQL_URL="https://api.cloudflare.com/client/v4/graphql";
const QUERY=`query FibreDeployDoHeadroom($accountTag:String!,$date:Date!){
  viewer{accounts(filter:{accountTag:$accountTag}){
    durableObjectsPeriodicGroups(limit:10000,filter:{date_geq:$date,date_leq:$date}){
      sum{rowsRead rowsWritten}
    }
  }}
}`;

export async function checkDoHeadroom({
  accountId=process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken=process.env.FIBRE_CLOUDFLARE_ANALYTICS_TOKEN??process.env.CLOUDFLARE_API_TOKEN,
  readLimit=Number(process.env.FIBRE_DO_ROWS_READ_DAILY_LIMIT??RESOURCE_HEALTH_DEFAULT_LIMITS.durableObjectRowsReadDaily),
  writeLimit=Number(process.env.FIBRE_DO_ROWS_WRITTEN_DAILY_LIMIT??RESOURCE_HEALTH_DEFAULT_LIMITS.durableObjectRowsWrittenDaily),
  minimumFraction=0.10,
  now=new Date(),
  fetchImpl=globalThis.fetch,
  log=console.log,
}={}){
  if(typeof accountId!=="string"||!accountId.trim()
    ||typeof apiToken!=="string"||!apiToken.trim())
    throw new Error("DO HEADROOM UNAVAILABLE: Cloudflare account ID and analytics token are required; upload refused");
  if(![readLimit,writeLimit].every(limit=>Number.isFinite(limit)&&limit>0)
    ||!Number.isFinite(minimumFraction)||minimumFraction<0||minimumFraction>=1)
    throw new TypeError("DO headroom policy is invalid");
  const date=now.toISOString().slice(0,10);
  let groups;
  try{
    const response=await fetchImpl(GRAPHQL_URL,{
      method:"POST",
      headers:{Authorization:`Bearer ${apiToken}`,"Content-Type":"application/json",Accept:"application/json"},
      body:JSON.stringify({query:QUERY,variables:{accountTag:accountId,date}}),
    });
    const payload=await response.json();
    if(!response.ok||payload?.errors?.length)
      throw new Error(payload?.errors?.map(x=>x.message).join("; ")??`HTTP ${response.status}`);
    groups=payload?.data?.viewer?.accounts?.[0]?.durableObjectsPeriodicGroups;
    if(!Array.isArray(groups)||groups.length>=10_000)
      throw new Error("account-wide DO usage is missing or truncated");
  }catch(error){
    throw new Error(`DO HEADROOM UNAVAILABLE: ${error?.message??error}; upload refused`,{cause:error});
  }
  const used={read:0,written:0};
  for(const group of groups){
    for(const [key,metric] of [["read","rowsRead"],["written","rowsWritten"]]){
      const count=Number(group?.sum?.[metric]);
      if(!Number.isSafeInteger(count)||count<0)
        throw new Error(`DO HEADROOM UNAVAILABLE: invalid ${metric} metric; upload refused`);
      used[key]+=count;
    }
  }
  const budgets=[["read",readLimit],["written",writeLimit]].map(([key,limit])=>
    ({key,limit,used:used[key],remaining:Math.max(0,limit-used[key])}));
  log(`DO HEADROOM UTC ${date}: `+budgets.map(item=>
    `${item.remaining}/${item.limit} rows ${item.key} remaining`).join(" · ")+" (account-wide, sampled)");
  for(const item of budgets){
    if(item.remaining<item.limit*minimumFraction)
      throw new Error(`DO HEADROOM LOW: ${item.remaining}/${item.limit} rows ${item.key} remaining, below ${Math.round(minimumFraction*100)}%; upload refused`);
  }
  return Object.freeze({date,read:budgets[0],written:budgets[1]});
}
