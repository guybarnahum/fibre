function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function monitorStub(env, environment) {
  if (!env.INFRA_MONITOR?.getByName) throw new Error("INFRA_MONITOR binding is unavailable");
  return env.INFRA_MONITOR.getByName(nonEmpty("environment", environment));
}

async function readJson(response) {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail ?? payload.error ?? `HTTP ${response.status}`);
  return payload;
}

export async function readAdminInfraMonitor({ env, environment, force = false } = {}) {
  const target = new URL("https://infra-monitor.internal/sample");
  target.searchParams.set("environment", nonEmpty("environment", environment));
  const response = await monitorStub(env, environment).fetch(new Request(target, {
    method:force ? "POST" : "GET",
    headers:{ Accept:"application/json" },
  }));
  return readJson(response);
}

export async function readCachedInfraHealth({ env, environment } = {}) {
  const target = new URL("https://infra-monitor.internal/cached");
  target.searchParams.set("environment", nonEmpty("environment", environment));
  return readJson(await monitorStub(env, environment).fetch(new Request(target, {
    headers:{ Accept:"application/json" },
  })));
}
