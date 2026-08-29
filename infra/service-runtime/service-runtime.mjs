const TOKEN_ENCODER = new TextEncoder();

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function plainObject(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${name} must be a plain object`);
  }
  return value;
}

function jsonResponse(status, payload, headers = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { status, headers: responseHeaders });
}

function constantTimeEqual(left, right) {
  const leftBytes = TOKEN_ENCODER.encode(left);
  const rightBytes = TOKEN_ENCODER.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

function requestBearerToken(request) {
  const authorization = request.headers.get("Authorization");
  if (authorization === null || !authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length);
  return token.length === 0 ? null : token;
}

function normalizedAuth(auth) {
  if (auth === null || auth === undefined || auth === "none") return null;
  if (!auth || typeof auth !== "object" || Array.isArray(auth) || auth.type !== "bearer") {
    throw new TypeError("service route auth must be none or bearer auth");
  }
  if (!Array.isArray(auth.tokens) || auth.tokens.length === 0) {
    throw new TypeError("bearer auth requires at least one token");
  }
  return Object.freeze({
    type: "bearer",
    tokens: Object.freeze(auth.tokens.map((token, index) => nonEmpty(`bearer token ${index}`, token))),
  });
}

function isAuthorized(request, auth) {
  if (auth === null) return true;
  const actual = requestBearerToken(request);
  if (actual === null) return false;
  let matched = false;
  for (const expected of auth.tokens) {
    matched = constantTimeEqual(actual, expected) || matched;
  }
  return matched;
}

function normalizedRoute(route, index) {
  plainObject(`service route ${index}`, route);
  const method = nonEmpty(`service route ${index} method`, route.method).toUpperCase();
  const path = nonEmpty(`service route ${index} path`, route.path);
  if (!path.startsWith("/")) throw new TypeError(`service route ${index} path must start with /`);
  if (path === "/healthz") throw new TypeError("/healthz is reserved by the service runtime");
  if (typeof route.handler !== "function") throw new TypeError(`service route ${index} handler must be a function`);
  return Object.freeze({ method, path, auth: normalizedAuth(route.auth), handler: route.handler });
}

export class ServiceHttpError extends Error {
  constructor(status, code, { detail = null } = {}) {
    super(nonEmpty("service HTTP error code", code));
    if (!Number.isInteger(status) || status < 400 || status > 599) {
      throw new TypeError("service HTTP error status must be between 400 and 599");
    }
    if (detail !== null && (typeof detail !== "string" || detail.length === 0)) {
      throw new TypeError("service HTTP error detail must be null or a non-empty string");
    }
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export function bearerAuth(...tokens) {
  return Object.freeze({ type: "bearer", tokens: Object.freeze(tokens) });
}

export async function readJsonRequest(request) {
  try {
    return await request.json();
  } catch {
    throw new ServiceHttpError(400, "invalid_json");
  }
}

export function createServiceRuntime({
  serviceName,
  health = {},
  routes = [],
  logger = console,
} = {}) {
  const normalizedServiceName = nonEmpty("serviceName", serviceName);
  plainObject("health", health);
  if (Object.hasOwn(health, "ok") || Object.hasOwn(health, "service")) {
    throw new TypeError("health details must not override ok or service");
  }
  if (!Array.isArray(routes)) throw new TypeError("routes must be an array");

  const routeTable = new Map();
  routes.forEach((candidate, index) => {
    const route = normalizedRoute(candidate, index);
    const key = `${route.method} ${route.path}`;
    if (routeTable.has(key)) throw new TypeError(`duplicate service route ${key}`);
    routeTable.set(key, route);
  });

  const healthPayload = Object.freeze({ ok: true, service: normalizedServiceName, ...health });

  return Object.freeze({
    serviceName: normalizedServiceName,
    async fetch(request) {
      if (!request || typeof request.url !== "string" || typeof request.method !== "string" || !request.headers) {
        throw new TypeError("service runtime requires a Fetch Request");
      }
      const url = new URL(request.url);
      const method = request.method.toUpperCase();

      if (method === "GET" && url.pathname === "/healthz") {
        return jsonResponse(200, healthPayload);
      }

      const route = routeTable.get(`${method} ${url.pathname}`);
      if (!route) return jsonResponse(404, { error: "not_found" });

      if (!isAuthorized(request, route.auth)) {
        return jsonResponse(401, { error: "unauthorized" }, { "WWW-Authenticate": "Bearer" });
      }

      try {
        const result = await route.handler({ request, url, serviceName: normalizedServiceName });
        return result instanceof Response ? result : jsonResponse(200, result ?? { ok: true });
      } catch (error) {
        if (error instanceof ServiceHttpError) {
          return jsonResponse(
            error.status,
            error.detail === null ? { error: error.code } : { error: error.code, detail: error.detail },
          );
        }
        if (error instanceof TypeError) {
          return jsonResponse(400, { error: "invalid_request", detail: error.message });
        }
        logger?.error?.(JSON.stringify({
          event: "service_request_failed",
          service: normalizedServiceName,
          method,
          path: url.pathname,
          error: error instanceof Error ? error.message : String(error),
        }));
        return jsonResponse(500, { error: "internal_error" });
      }
    },
  });
}
