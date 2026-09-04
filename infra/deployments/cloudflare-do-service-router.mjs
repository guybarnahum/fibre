function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
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
      return binding.getByName(stateScopeId).fetch(request);
    },
  });
}
