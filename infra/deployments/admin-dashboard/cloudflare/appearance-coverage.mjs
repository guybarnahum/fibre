function requireWorld(worldKernel,privateToken){
  if(!worldKernel?.fetch)throw new TypeError("WORLD_KERNEL binding is required");
  if(typeof privateToken!=="string"||privateToken.trim().length<16){
    throw new TypeError("Fibre private service token is required");
  }
  return {
    worldKernel,
    headers:{
      Accept:"application/json",
      "x-fibre-private-token":privateToken.trim(),
    },
  };
}

export async function readAdminAppearanceCoverage({
  worldKernel,
  privateToken,
} = {}) {
  const boundary=requireWorld(worldKernel,privateToken);
  const response = await boundary.worldKernel.fetch(new Request(
    "https://world.internal/internal/appearance/coverage",
    {
      method:"GET",
      headers:boundary.headers,
    },
  ));
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.detail ?? payload?.error?.code ?? `HTTP ${response.status}`);
  }
  if (payload?.contract !== "fibre-appearance-coverage-v0.1") {
    throw new Error("World appearance coverage response is invalid");
  }
  return payload;
}

export async function readAdminAppearanceOrigins({
  worldKernel,
  privateToken,
  threadIds,
} = {}) {
  if(!Array.isArray(threadIds))throw new TypeError("Appearance origins require threadIds");
  const boundary=requireWorld(worldKernel,privateToken);
  const response=await boundary.worldKernel.fetch(new Request(
    "https://world.internal/internal/appearance/origins",
    {
      method:"POST",
      headers:{...boundary.headers,"content-type":"application/json"},
      body:JSON.stringify({threadIds}),
    },
  ));
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.error?.detail??payload?.error?.code??`HTTP ${response.status}`);
  if(payload?.contract!=="fibre-appearance-origins-v0.1"||!Array.isArray(payload.threads)){
    throw new Error("World appearance origins response is invalid");
  }
  return payload.threads;
}

export async function optionalAdminAppearanceOrigins(input){
  try{return await readAdminAppearanceOrigins(input)}
  catch{return []}
}
