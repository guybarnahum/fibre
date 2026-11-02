// Account-wide Durable Object free-tier headroom, sampled once before upload.
// Use the same Cloudflare analytics dataset as Fibre's infrastructure monitor.
const GRAPHQL_URL="https://api.cloudflare.com/client/v4/graphql";
const QUERY=`query FibreDeployDoHeadroom($accountTag:String!,$date:Date!){
  viewer{accounts(filter:{accountTag:$accountTag}){
    durableObjectsPeriodicGroups(limit:10000,filter:{date_geq:$date,date_leq:$date}){
      sum{rowsWritten}
    }
  }}
}`;

export async function checkDoWriteHeadroom({
  accountId=process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken=process.env.FIBRE_CLOUDFLARE_ANALYTICS_TOKEN??process.env.CLOUDFLARE_API_TOKEN,
  limit=Number(process.env.FIBRE_DO_ROWS_WRITTEN_DAILY_LIMIT??100_000),
  minimumFraction=0.10,
  now=new Date(),
  fetchImpl=globalThis.fetch,
  log=console.log,
}={}){
  if(typeof accountId!=="string"||!accountId.trim()
    ||typeof apiToken!=="string"||!apiToken.trim())
    throw new Error("DO WRITE HEADROOM UNAVAILABLE: Cloudflare account ID and analytics token are required; upload refused");
  if(!Number.isFinite(limit)||limit<=0||!Number.isFinite(minimumFraction)
    ||minimumFraction<0||minimumFraction>=1)
    throw new TypeError("DO write headroom policy is invalid");
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
    throw new Error(`DO WRITE HEADROOM UNAVAILABLE: ${error?.message??error}; upload refused`,{cause:error});
  }
  let written=0;
  for(const group of groups){
    const count=Number(group?.sum?.rowsWritten);
    if(!Number.isSafeInteger(count)||count<0)
      throw new Error("DO WRITE HEADROOM UNAVAILABLE: invalid rowsWritten metric; upload refused");
    written+=count;
  }
  const remaining=Math.max(0,limit-written);
  log(`DO WRITE HEADROOM UTC ${date}: ${remaining}/${limit} rows remaining (used ${written}; account-wide, sampled)`);
  if(remaining<limit*minimumFraction)
    throw new Error(`DO WRITE HEADROOM LOW: ${remaining}/${limit} remaining, below ${Math.round(minimumFraction*100)}%; upload refused`);
  return Object.freeze({date,written,remaining,limit});
}
