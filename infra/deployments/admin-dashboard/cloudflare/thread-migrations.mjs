function requireBinding(worldKernel){
  if(!worldKernel?.fetch)throw new Error("WORLD_KERNEL binding is unavailable");
  return worldKernel;
}

function headers(privateToken){
  if(typeof privateToken!=="string"||privateToken.trim()==="")throw new Error("Fibre private service token is unavailable");
  return {Accept:"application/json","x-fibre-private-token":privateToken};
}

export async function readAdminThreadMigrations({worldKernel,privateToken}={}){
  const response=await requireBinding(worldKernel).fetch(new Request(
    "https://world.internal/internal/thread-migrations",
    {method:"GET",headers:headers(privateToken)},
  ));
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.error?.detail??payload?.error?.code??`HTTP ${response.status}`);
  if(payload?.contract!=="fibre-thread-migration-summary-v0.1"||!Array.isArray(payload.threads)){
    throw new Error("World Thread migration summary is invalid");
  }
  return payload.threads;
}

export async function readAdminThreadMigration({worldKernel,privateToken,threadId}={}){
  if(typeof threadId!=="string"||threadId.trim()==="")throw new TypeError("threadId is required");
  const id=threadId.trim();
  const response=await requireBinding(worldKernel).fetch(new Request(
    `https://world.internal/internal/thread-migrations/${encodeURIComponent(id)}`,
    {method:"GET",headers:headers(privateToken)},
  ));
  const payload=await response.json().catch(()=>null);
  if(response.status===404&&payload?.error?.code==="THREAD_NOT_FOUND")return null;
  if(!response.ok)throw new Error(payload?.error?.detail??payload?.error?.code??`HTTP ${response.status}`);
  if(payload?.contract!=="fibre-thread-migration-summary-entry-v0.1"||payload?.migration?.threadId!==id){
    throw new Error("World Thread migration response is invalid");
  }
  return payload.migration;
}

export function attachAdminMigrationSummary(thread,migration){
  const domains=Array.isArray(migration?.domains)?[...migration.domains]:[];
  if(domains.length===0)return Object.freeze({...thread,migrationDomains:Object.freeze([]),migrationReasons:Object.freeze({})});
  return Object.freeze({
    ...thread,
    health:"migration_required",
    migrationDomains:Object.freeze(domains),
    migrationReasons:Object.freeze(structuredClone(migration?.reasons??{})),
  });
}

export async function optionalAdminThreadMigrations(input){
  try{return await readAdminThreadMigrations(input)}
  catch{return []}
}

export async function optionalAdminThreadMigration(input){
  try{return await readAdminThreadMigration(input)}
  catch{return null}
}
