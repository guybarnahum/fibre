import { createServer } from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { URL } from "node:url";

import {
  IdempotencyConflictError,
  IntegrityError,
  LifecycleCommandError,
  PrivateRequestConflictError,
  PrivateRequestNotFoundError,
  PrivateStanceConflictError,
  StaleAppraisalError,
  StaleThreadVersionError,
  StorageBusyError,
  ThreadAlreadyExistsError,
  ThreadNotFoundError,
  assertExactKeys,
  assertPlainObject,
} from "./persistence-common.mjs";
import {
  PreviewMismatchError,
  RouteThreadMismatchError,
  WorldKernelService,
  assertRouteThread,
} from "./kernel-service.mjs";
import {
  ParticipationAuthorizationRejectedError,
  RuntimeConflictError,
  RuntimeLeaseExpiredError,
  RuntimeNotFoundError,
  RuntimeOrderError,
  RuntimeStateChangedError,
  ThawLeaseConflictError,
} from "./runtime-domain.mjs";

export const DEFAULT_MAX_HTTP_BODY_BYTES = 1024 * 1024;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const LOOPBACK_BIND_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

class HttpProblemError extends Error {
  constructor(status, code, message, headers = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

function safeRequestId(value) {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value)
    ? value
    : `req_${randomUUID()}`;
}

function safeTokenEqual(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(actualBytes, expectedBytes);
}

function writeJson(response, status, payload, requestId, headers = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    ...headers,
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'",
    "x-request-id": requestId,
  });
  response.end(body);
}

function ensureJsonContentType(request) {
  const contentType = request.headers["content-type"];
  if (typeof contentType !== "string" || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new HttpProblemError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type must be application/json",
    );
  }
}

async function readJson(request, maxBodyBytes) {
  ensureJsonContentType(request);
  let length = 0;
  const chunks = [];
  for await (const chunk of request) {
    length += chunk.length;
    if (length > maxBodyBytes) {
      throw new HttpProblemError(
        413,
        "REQUEST_TOO_LARGE",
        `Request body exceeds ${maxBodyBytes} bytes`,
      );
    }
    chunks.push(chunk);
  }
  if (length === 0) {
    throw new HttpProblemError(400, "INVALID_JSON", "A JSON request body is required");
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    assertPlainObject("request body", parsed);
    return parsed;
  } catch (error) {
    if (error instanceof TypeError) throw error;
    throw new HttpProblemError(400, "INVALID_JSON", "Request body is not valid JSON");
  }
}

function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    throw new HttpProblemError(400, "INVALID_PATH", "Path contains invalid percent encoding");
  }
}

function mapError(error) {
  if (error instanceof HttpProblemError) return error;
  if (error instanceof ThreadNotFoundError) {
    return new HttpProblemError(404, "THREAD_NOT_FOUND", error.message);
  }
  if (error instanceof PrivateRequestNotFoundError) {
    return new HttpProblemError(404, "PRIVATE_REQUEST_NOT_FOUND", error.message);
  }
  if (error instanceof RuntimeNotFoundError) {
    return new HttpProblemError(404, "RUNTIME_NOT_FOUND", error.message);
  }
  if (error instanceof ThreadAlreadyExistsError) {
    return new HttpProblemError(409, "THREAD_ALREADY_EXISTS", error.message);
  }
  if (error instanceof PrivateRequestConflictError) {
    return new HttpProblemError(409, "PRIVATE_REQUEST_CONFLICT", error.message);
  }
  if (error instanceof PrivateStanceConflictError) {
    return new HttpProblemError(409, "PRIVATE_STANCE_CONFLICT", error.message);
  }
  if (error instanceof StaleAppraisalError) {
    return new HttpProblemError(409, "STALE_APPRAISAL", error.message);
  }
  if (error instanceof StaleThreadVersionError) {
    return new HttpProblemError(409, "STALE_THREAD_VERSION", error.message);
  }
  if (error instanceof IdempotencyConflictError) {
    return new HttpProblemError(409, "IDEMPOTENCY_CONFLICT", error.message);
  }
  if (error instanceof PreviewMismatchError) {
    return new HttpProblemError(409, "PREVIEW_MISMATCH", error.message);
  }
  if (error instanceof RouteThreadMismatchError) {
    return new HttpProblemError(409, "ROUTE_THREAD_MISMATCH", error.message);
  }
  if (error instanceof RuntimeStateChangedError) {
    return new HttpProblemError(409, "RUNTIME_STATE_CHANGED", error.message);
  }
  if (error instanceof RuntimeConflictError) {
    return new HttpProblemError(409, "RUNTIME_CONFLICT", error.message);
  }
  if (error instanceof ThawLeaseConflictError) {
    return new HttpProblemError(409, "THAW_LEASE_CONFLICT", error.message);
  }
  if (error instanceof RuntimeOrderError) {
    return new HttpProblemError(409, "RUNTIME_ORDER_REJECTED", error.message);
  }
  if (error instanceof RuntimeLeaseExpiredError) {
    return new HttpProblemError(409, "THAW_LEASE_EXPIRED", error.message);
  }
  if (error instanceof ParticipationAuthorizationRejectedError) {
    return new HttpProblemError(
      422,
      "PARTICIPATION_AUTHORIZATION_REJECTED",
      error.message,
    );
  }
  if (error instanceof LifecycleCommandError) {
    return new HttpProblemError(422, "LIFECYCLE_COMMAND_REJECTED", error.message);
  }
  if (error instanceof StorageBusyError) {
    return new HttpProblemError(
      503,
      "STORAGE_BUSY",
      "World storage is temporarily busy",
      { "retry-after": "1" },
    );
  }
  if (error instanceof IntegrityError) {
    return new HttpProblemError(
      503,
      "INTEGRITY_FAILURE",
      "Authoritative Thread data failed integrity validation",
    );
  }
  if (error instanceof TypeError) {
    return new HttpProblemError(400, "INVALID_REQUEST", error.message);
  }
  return new HttpProblemError(
    500,
    "INTERNAL_ERROR",
    "The world-kernel could not complete the request",
  );
}

export function assertLoopbackBindHost(host) {
  if (typeof host !== "string" || !LOOPBACK_BIND_HOSTS.has(host)) {
    throw new TypeError("The M1 world-kernel server may bind only to a loopback host");
  }
}

function assertLoopbackHostHeader(value) {
  if (typeof value !== "string") {
    throw new HttpProblemError(400, "HOST_REQUIRED", "A Host header is required");
  }
  const authority = value.toLowerCase();
  if (
    !/^(?:localhost|127\.0\.0\.1)(?::[0-9]{1,5})?$/.test(authority) &&
    !/^\[::1\](?::[0-9]{1,5})?$/.test(authority)
  ) {
    throw new HttpProblemError(
      421,
      "MISDIRECTED_REQUEST",
      "The M1 world-kernel accepts only loopback Host headers",
    );
  }
}

function methodNotAllowed(allow) {
  return new HttpProblemError(
    405,
    "METHOD_NOT_ALLOWED",
    `Method is not allowed; use ${allow}`,
    { allow },
  );
}

function routeParts(request) {
  const target = request.url ?? "/";
  if (!target.startsWith("/") || target.startsWith("//")) {
    throw new HttpProblemError(
      421,
      "MISDIRECTED_REQUEST",
      "Absolute and network-path request targets are not accepted",
    );
  }
  const url = new URL(target, "http://world-kernel.local");
  if (url.search !== "") {
    throw new HttpProblemError(400, "QUERY_NOT_SUPPORTED", "Query parameters are not supported");
  }
  return url.pathname.split("/").filter(Boolean).map(decodeSegment);
}

function requirePrivateAccess(request, privateToken) {
  if (privateToken === null) {
    throw new HttpProblemError(
      503,
      "PRIVATE_ACCESS_DISABLED",
      "Private request access is not enabled",
    );
  }
  if (!safeTokenEqual(request.headers["x-fibre-private-token"], privateToken)) {
    throw new HttpProblemError(
      403,
      "PRIVATE_TOKEN_REQUIRED",
      "A valid private-access token is required",
    );
  }
}

export function createWorldKernelHttpServer({
  service,
  adminToken = null,
  privateToken = null,
  maxBodyBytes = DEFAULT_MAX_HTTP_BODY_BYTES,
  onError = () => {},
} = {}) {
  if (!(service instanceof WorldKernelService)) {
    throw new TypeError("service must be a WorldKernelService");
  }
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 1024) {
    throw new TypeError("maxBodyBytes must be an integer of at least 1024");
  }
  for (const [name, token] of [["adminToken", adminToken], ["privateToken", privateToken]]) {
    if (token !== null && (typeof token !== "string" || token.length < 16)) {
      throw new TypeError(`${name} must be null or at least 16 characters`);
    }
  }
  if (typeof onError !== "function") throw new TypeError("onError must be a function");

  const server = createServer(async (request, response) => {
    const requestId = safeRequestId(request.headers["x-request-id"]);
    try {
      assertLoopbackHostHeader(request.headers.host);
      const parts = routeParts(request);
      const method = request.method ?? "GET";

      if (parts.length === 1 && parts[0] === "health") {
        if (method !== "GET") throw methodNotAllowed("GET");
        return writeJson(
          response,
          200,
          { ...service.health(), repairEnabled: adminToken !== null },
          requestId,
        );
      }

      if (parts.length === 1 && parts[0] === "threads") {
        if (method !== "POST") throw methodNotAllowed("POST");
        const body = await readJson(request, maxBodyBytes);
        assertExactKeys("request body", body, ["thread", "occurredAt"]);
        const result = service.seedThread(body);
        return writeJson(response, result.created ? 201 : 200, result, requestId);
      }

      if (parts.length >= 2 && parts[0] === "threads") {
        const threadId = parts[1];

        if (parts.length === 2) {
          if (method !== "GET") throw methodNotAllowed("GET");
          return writeJson(response, 200, { thread: service.getThread(threadId) }, requestId);
        }
        if (parts.length === 3 && parts[2] === "events") {
          if (method !== "GET") throw methodNotAllowed("GET");
          return writeJson(response, 200, { events: service.listEvents(threadId) }, requestId);
        }
        if (parts.length === 3 && parts[2] === "integrity") {
          if (method !== "GET") throw methodNotAllowed("GET");
          return writeJson(response, 200, service.verifyThreadIntegrity(threadId), requestId);
        }

        if (parts.length >= 3 && parts[2] === "private") {
          requirePrivateAccess(request, privateToken);
          if (parts.length >= 4 && parts[3] === "requests") {
            if (parts.length === 4) {
              if (method === "GET") {
                return writeJson(
                  response,
                  200,
                  { requests: service.listPrivateRequestSummaries(threadId) },
                  requestId,
                );
              }
              if (method === "POST") {
                const body = await readJson(request, maxBodyBytes);
                assertExactKeys("request body", body, [
                  "request",
                  "selection",
                  "policy",
                  "occurredAt",
                  "causationId",
                  "correlationId",
                ]);
                const result = service.recordRequestAppraisal(threadId, body);
                return writeJson(response, result.idempotent ? 200 : 201, result, requestId);
              }
              throw methodNotAllowed("GET, POST");
            }
            const privateRequestId = parts[4];
            if (parts.length === 5) {
              if (method !== "GET") throw methodNotAllowed("GET");
              return writeJson(
                response,
                200,
                { trace: service.getPrivateRequestTrace(threadId, privateRequestId) },
                requestId,
              );
            }
            if (parts.length === 6 && parts[5] === "integrity") {
              if (method !== "GET") throw methodNotAllowed("GET");
              return writeJson(
                response,
                200,
                service.verifyPrivateRequestTrace(threadId, privateRequestId),
                requestId,
              );
            }
            if (parts.length === 6 && parts[5] === "stance") {
              if (method !== "POST") throw methodNotAllowed("POST");
              const body = await readJson(request, maxBodyBytes);
              assertExactKeys("request body", body, [
                "assessment",
                "recordedAt",
                "causationId",
                "correlationId",
              ]);
              const result = service.recordPrivateStance(threadId, privateRequestId, body);
              return writeJson(response, result.idempotent ? 200 : 201, result, requestId);
            }
            if (parts.length === 6 && parts[5] === "runtime") {
              if (method !== "POST") throw methodNotAllowed("POST");
              if (typeof service.acquireThawRuntime !== "function") {
                throw new HttpProblemError(503, "RUNTIME_DISABLED", "M1 runtime is not enabled");
              }
              const body = await readJson(request, maxBodyBytes);
              assertExactKeys("request body", body, [
                "operationId",
                "decision",
                "selection",
                "causationId",
                "correlationId",
              ]);
              const result = service.acquireThawRuntime(threadId, privateRequestId, body);
              return writeJson(response, result.idempotent ? 200 : 201, result, requestId);
            }
          }

          if (parts.length >= 4 && parts[3] === "runtime") {
            if (typeof service.getRuntime !== "function") {
              throw new HttpProblemError(503, "RUNTIME_DISABLED", "M1 runtime is not enabled");
            }
            if (parts.length === 4) {
              if (method !== "GET") throw methodNotAllowed("GET");
              return writeJson(
                response,
                200,
                { runtimes: service.listRuntimeSummaries(threadId) },
                requestId,
              );
            }
            const sessionId = parts[4];
            if (parts.length === 5) {
              if (method !== "GET") throw methodNotAllowed("GET");
              return writeJson(
                response,
                200,
                { runtime: service.getRuntime(threadId, sessionId) },
                requestId,
              );
            }
            if (parts.length === 6 && parts[5] === "integrity") {
              if (method !== "GET") throw methodNotAllowed("GET");
              return writeJson(
                response,
                200,
                service.verifyRuntimeIntegrity(threadId, sessionId),
                requestId,
              );
            }
            if (parts.length === 6 && parts[5] === "actor") {
              if (method !== "POST") throw methodNotAllowed("POST");
              const body = await readJson(request, maxBodyBytes);
              assertExactKeys("request body", body, ["operationId"]);
              const result = service.runDeterministicActor(threadId, sessionId, body);
              return writeJson(response, result.idempotent ? 200 : 201, result, requestId);
            }
            if (parts.length === 6 && parts[5] === "goal-guardian") {
              if (method !== "POST") throw methodNotAllowed("POST");
              const body = await readJson(request, maxBodyBytes);
              assertExactKeys("request body", body, ["operationId"]);
              const result = service.runGoalGuardian(threadId, sessionId, body);
              return writeJson(response, result.idempotent ? 200 : 201, result, requestId);
            }
          }
        }

        if (parts.length === 4 && parts[2] === "commands" && parts[3] === "preview") {
          if (method !== "POST") throw methodNotAllowed("POST");
          const body = await readJson(request, maxBodyBytes);
          assertExactKeys("request body", body, ["command"]);
          assertRouteThread(threadId, body.command);
          return writeJson(response, 200, service.previewCommandRequest(body), requestId);
        }
        if (parts.length === 3 && parts[2] === "commands") {
          if (method !== "POST") throw methodNotAllowed("POST");
          const body = await readJson(request, maxBodyBytes);
          assertExactKeys("request body", body, ["previewId", "command"]);
          assertRouteThread(threadId, body.command);
          const result = service.applyPreviewedCommand(body);
          return writeJson(response, result.idempotent ? 200 : 201, result, requestId);
        }
        if (parts.length === 3 && parts[2] === "repair-projection") {
          if (method !== "POST") throw methodNotAllowed("POST");
          if (adminToken === null) {
            throw new HttpProblemError(503, "REPAIR_DISABLED", "Projection repair is not enabled");
          }
          if (!safeTokenEqual(request.headers["x-fibre-admin-token"], adminToken)) {
            throw new HttpProblemError(
              403,
              "ADMIN_TOKEN_REQUIRED",
              "A valid administrative token is required",
            );
          }
          const body = await readJson(request, maxBodyBytes);
          assertExactKeys("request body", body, []);
          return writeJson(response, 200, service.repairThreadProjection(threadId), requestId);
        }
      }

      throw new HttpProblemError(
        404,
        "ROUTE_NOT_FOUND",
        "No world-kernel route matches this request",
      );
    } catch (error) {
      const problem = mapError(error);
      if (problem.status >= 500) {
        try {
          onError(error, { requestId, method: request.method, url: request.url });
        } catch {}
      }
      if (!response.headersSent) {
        writeJson(
          response,
          problem.status,
          { error: { code: problem.code, message: problem.message, requestId } },
          requestId,
          problem.headers,
        );
      } else {
        response.destroy();
      }
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.maxConnections = 64;
  return server;
}

export async function listenWorldKernelHttpServer(
  server,
  { host = "127.0.0.1", port = 0 } = {},
) {
  assertLoopbackBindHost(host);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) {
    throw new TypeError("port must be between 0 and 65535");
  }
  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("world-kernel did not expose a TCP address");
  }
  return { host: address.address, port: address.port };
}

export async function closeWorldKernelHttpServer(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
