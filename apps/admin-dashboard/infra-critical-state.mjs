const DAILY_QUOTAS=new Map([
  ["DURABLE_OBJECT_ROWS_READ_LIMIT","Durable Objects daily read quota (5 million rows)"],
  ["DURABLE_OBJECT_ROWS_WRITE_LIMIT","Durable Objects daily write quota"],
  ["D1_ROWS_READ_LIMIT","D1 daily read quota"],
  ["D1_ROWS_WRITE_LIMIT","D1 daily write quota"],
]);

// Monitor state remains authoritative. An unavailable monitor is not, by
// itself, proof of a catastrophic infrastructure failure.
export function criticalInfrastructureState(payload,now=Date.now()){
  const sample=payload?.sample;
  const checks=sample?.checks??[];
  const quota=checks.find(check=>check.level==="critical"&&DAILY_QUOTAS.has(check.error?.code));
  if(sample?.level!=="critical")return null;
  const first=quota??checks.find(check=>check.level==="critical");
  const code=first?.error?.code??null;
  const reason=quota
    ?DAILY_QUOTAS.get(code)+" reached."
    :first?.error?.detail??"Core infrastructure is reporting a critical condition.";
  const resetAt=quota
    ?new Date(Math.floor(now/86_400_000)*86_400_000+86_400_000).toISOString()
    :null;
  return Object.freeze({reason,code,resetAt,observedAt:sample.observedAt??null});
}
