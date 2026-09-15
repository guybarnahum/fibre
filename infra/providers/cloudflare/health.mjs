const HEALTH_CHANNEL_ID = "fibre-infra-health";
const HEALTH_OBJECT_KEY = "fibre/health";

function bounded(value) {
  const text = value instanceof Error ? value.message : String(value ?? "Cloudflare infrastructure failure");
  return text.length <= 512 ? text : `${text.slice(0, 511)}…`;
}

export function classifyCloudflareInfraError(error, fallbackCode = "CLOUDFLARE_INFRA_UNAVAILABLE") {
  const detail = bounded(error);
  let code = fallbackCode;
  if (/Exceeded allowed rows read in Durable Objects free tier/iu.test(detail)) code = "DURABLE_OBJECT_ROWS_READ_LIMIT";
  else if (/Exceeded allowed rows written in Durable Objects free tier/iu.test(detail)) code = "DURABLE_OBJECT_ROWS_WRITE_LIMIT";
  else if (/exceeded D1's free tier daily row read limit/iu.test(detail)) code = "D1_ROWS_READ_LIMIT";
  else if (/exceeded D1's free tier daily row write limit/iu.test(detail)) code = "D1_ROWS_WRITE_LIMIT";
  return Object.freeze({
    code,
    detail,
    retryable:error?.retryable !== false,
    overloaded:error?.overloaded === true,
  });
}

export function normalCloudflareCheck(kind, resource, extra = {}) {
  return Object.freeze({ kind, resource, provider:"cloudflare", level:"normal", ...extra });
}

export async function probeCloudflareHealth(kind, resource, operation, fallbackCode) {
  try {
    const detail = await operation();
    return normalCloudflareCheck(kind, resource, detail && typeof detail === "object" ? detail : {});
  } catch (error) {
    return Object.freeze({
      kind,
      resource,
      provider:"cloudflare",
      level:"critical",
      error:classifyCloudflareInfraError(error, fallbackCode),
    });
  }
}

function level(checks) {
  return checks.some((check) => check.level === "critical") ? "critical" : "normal";
}

async function d1Check(kind, resource, database) {
  return probeCloudflareHealth(kind, resource, async () => {
    await database.prepare("SELECT 1 AS fibre_health").first();
  }, "D1_UNAVAILABLE");
}

export function createCloudflareHealthPort({
  stateScopes = {},
  objectBucket = null,
  workflowBindings = {},
  presentationChannels = null,
  catalogDatabase = null,
  telemetryDatabase = null,
} = {}) {
  return Object.freeze({
    async check() {
      const checks = [];
      for (const [scopeId, storage] of Object.entries(stateScopes)) {
        checks.push(await probeCloudflareHealth("state", scopeId, async () => {
          storage.sql.exec("SELECT 1 AS fibre_health").toArray();
        }, "DURABLE_OBJECT_STATE_UNAVAILABLE"));
      }
      if (objectBucket !== null) {
        checks.push(await probeCloudflareHealth("objects", "r2", async () => {
          await objectBucket.head(HEALTH_OBJECT_KEY);
        }, "R2_UNAVAILABLE"));
      }
      if (catalogDatabase !== null) checks.push(await d1Check("catalog", "d1", catalogDatabase));
      if (telemetryDatabase !== null) checks.push(await d1Check("telemetry", "d1", telemetryDatabase));
      if (presentationChannels !== null) {
        checks.push(await probeCloudflareHealth("streams", "durable_objects", async () => {
          await presentationChannels.getByName(HEALTH_CHANNEL_ID).getHead();
        }, "DURABLE_OBJECT_STREAM_UNAVAILABLE"));
      }
      for (const workflowName of Object.keys(workflowBindings)) {
        checks.push(normalCloudflareCheck("workflows", workflowName, { mode:"configured" }));
      }
      return Object.freeze({
        contract:"fibre-infra-driver-health-v0.1",
        driverId:"cloudflare-v1",
        provider:"cloudflare",
        observedAt:new Date().toISOString(),
        level:level(checks),
        checks:Object.freeze(checks),
      });
    },
  });
}

export function extendCloudflareHealth(baseHealth, extraCheck) {
  if (!baseHealth || typeof baseHealth.check !== "function") throw new TypeError("Cloudflare health extension requires base health.check()");
  if (typeof extraCheck !== "function") throw new TypeError("Cloudflare health extension requires extraCheck()");
  return Object.freeze({
    async check() {
      const base = await baseHealth.check();
      const extra = await extraCheck();
      const checks = Object.freeze([...base.checks, ...extra]);
      return Object.freeze({ ...base, observedAt:new Date().toISOString(), level:level(checks), checks });
    },
  });
}
