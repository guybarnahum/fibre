function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function boundedDiagnostic(value) {
  const text = value instanceof Error ? value.message : String(value);
  return text.length <= 1000 ? text : `${text.slice(0, 999)}…`;
}

function deepHealthFailure(service, stateScopeId, error) {
  return Response.json({
    ok: false,
    service,
    provider: "cloudflare",
    stateScopeId,
    stateChecked: false,
    error: {
      code: "DURABLE_OBJECT_STATE_HEALTH_FAILED",
      name: error?.name ?? error?.constructor?.name ?? "Error",
      detail: boundedDiagnostic(error),
      retryable: error?.retryable === true,
      overloaded: error?.overloaded === true,
    },
  }, { status: 503 });
}

export function createCloudflareDurableObjectServiceRouter({
  service,
  bindingName,
  stateScopeId,
  provider = "cloudflare",
  health = {},
} = {}) {
  nonEmpty("service", service);
  nonEmpty("bindingName", bindingName);
  nonEmpty("stateScopeId", stateScopeId);
  nonEmpty("provider", provider);
  if (health === null || typeof health !== "object" || Array.isArray(health)) {
    throw new TypeError("health must be a plain object");
  }

  return Object.freeze({
    async fetch(request, env) {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/healthz") {
        return Response.json({
          ok: true,
          service,
          provider,
          stateScopeId,
          stateChecked: false,
          ...health,
        });
      }

      const binding = env?.[bindingName];
      if (!binding || typeof binding.getByName !== "function") {
        throw new TypeError(`${service} Worker requires ${bindingName} Durable Object binding`);
      }

      if (request.method === "GET" && url.pathname === "/internal/health/state") {
        try {
          return await binding.getByName(stateScopeId).fetch(request);
        } catch (error) {
          console.error(JSON.stringify({
            event: "durable_object_state_health_failed",
            service,
            stateScopeId,
            errorName: error?.name ?? error?.constructor?.name ?? "Error",
            detail: boundedDiagnostic(error),
            retryable: error?.retryable === true,
            overloaded: error?.overloaded === true,
            stack: error instanceof Error ? error.stack ?? null : null,
          }));
          return deepHealthFailure(service, stateScopeId, error);
        }
      }

      return binding.getByName(stateScopeId).fetch(request);
    },
  });
}
