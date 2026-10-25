const DAILY_QUOTAS=new Map([
  ["DURABLE_OBJECT_ROWS_READ_LIMIT","Durable Objects daily read quota exhausted."],
  ["DURABLE_OBJECT_ROWS_WRITE_LIMIT","Durable Objects daily write quota exhausted."],
  ["D1_ROWS_READ_LIMIT","D1 daily read quota exhausted."],
  ["D1_ROWS_WRITE_LIMIT","D1 daily write quota exhausted."],
]);

// Actual failed health checks, not analytics thresholds, determine outage.
// A single ancillary-service failure should not lock the entire dashboard.
export function criticalInfrastructureState(payload,now=Date.now()){
  const sample=payload?.sample;
  if(sample?.level!=="critical")return null;
  const failures=(sample.checks??[]).filter(check=>
    check.level==="critical"&&check.error);
  const quota=failures.find(check=>DAILY_QUOTAS.has(check.error.code));
  const core=failures.find(check=>
    ["world-kernel","admin-dashboard"].includes(check.service));
  const affected=new Set(failures.map(check=>check.service??check.resource).filter(Boolean));
  const first=quota??core??(affected.size>1?failures[0]:null);
  if(!first)return null;
  const code=first.error.code??null;
  const observedAt=sample.infra?.observedAt??sample.observedAt??null;
  const observedMs=Date.parse(observedAt??"");
  // Midnight is a potential reset only for explicitly reported daily quota
  // failures, anchored to the observation date, never an arbitrary next day.
  const resetAt=quota&&Number.isFinite(observedMs)&&observedMs<=now+60_000
    ?new Date(Math.floor(observedMs/86_400_000)*86_400_000+86_400_000).toISOString()
    :null;
  return Object.freeze({
    reason:quota?DAILY_QUOTAS.get(code)
      :first.error.detail??"Core infrastructure is reporting a critical condition.",
    code,resetAt,observedAt,
  });
}
