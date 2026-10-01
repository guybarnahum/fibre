export async function readAdminAppearanceCoverage({
  worldKernel,
  privateToken,
} = {}) {
  if (!worldKernel?.fetch) throw new TypeError("WORLD_KERNEL binding is required");
  if (typeof privateToken !== "string" || privateToken.trim().length < 16) {
    throw new TypeError("Fibre private service token is required");
  }
  const response = await worldKernel.fetch(new Request(
    "https://world.internal/internal/appearance/coverage",
    {
      method:"GET",
      headers:{
        Accept:"application/json",
        "x-fibre-private-token":privateToken.trim(),
      },
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
