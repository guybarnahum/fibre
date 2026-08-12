import { randomUUID, timingSafeEqual } from "node:crypto";
import { URL } from "node:url";

import { IntegrityError } from "./persistence-common.mjs";
import { DEFAULT_MAX_HTTP_BODY_BYTES } from "./http-server.mjs";
import { createCausalWorldKernelHttpServer } from "./causal-http-server.mjs";
import { StructuredObligationInspectionNotFoundError } from "./structured-obligation-inspection-store.mjs";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PRIVATE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const OBLIGATION_ID_PATTERN = /^obl_[0-9a-f]{64}$/;

function requestId(value) {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value)
    ? value
    : `req_${randomUUID()}`;
}

function tokenEqual(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function writeJson(response, status, payload, id, headers = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    ...headers,
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'",
    "x-request-id": id,
  });
  response.end(body);
}

function loopbackHost(value) {
  if (typeof value !== "string") return false;
  const authority = value.toLowerCase();
  return /^(?:localhost|127\.0\.0\.1)(?::[0-9]{1,5})?$/.test(authority) ||
    /^\[::1\](?::[0-9]{1,5})?$/.test(authority);
}

function httpError(status, code, message, headers = {}) {
  const value = new TypeError(message);
  value.httpStatus = status;
  value.httpCode = code;
  value.httpHeaders = headers;
  return value;
}

function requirePrivate(request, privateToken) {
  if (privateToken === null) {
    throw httpError(503, "PRIVATE_ACCESS_DISABLED", "Private request access is not enabled");
  }
  if (!tokenEqual(request.headers["x-fibre-private-token"], privateToken)) {
    throw httpError(403, "PRIVATE_TOKEN_REQUIRED", "A valid private-access token is required");
  }
}

function decodedParts(target) {
  if (typeof target !== "string" || !target.startsWith("/") || target.startsWith("//")) return null;
  const url = new URL(target, "http://world-kernel.local");
  if (url.search !== "") return null;
  try {
    return url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
  } catch {
    return null;
  }
}

function inspectionRoute(target) {
  const parts = decodedParts(target);
  if (parts === null || parts[0] !== "threads" || parts[2] !== "private") return null;
  const threadId = parts[1];
  if (parts.length === 4 && parts[3] === "obligations") {
    return { kind: "obligation_list", threadId };
  }
  if (parts.length === 5 && parts[3] === "obligations" && parts[4] === "integrity") {
    return { kind: "obligation_integrity", threadId };
  }
  if (parts.length === 5 && parts[3] === "obligations") {
    return { kind: "obligation_detail", threadId, obligationId: parts[4] };
  }
  if (parts.length === 6 && parts[3] === "requests" && parts[5] === "obligation-applicability") {
    return { kind: "request_applicability", threadId, requestId: parts[4] };
  }
  if (parts.length === 6 && parts[3] === "runtime" && parts[5] === "obligation-discharge") {
    return { kind: "runtime_discharge", threadId, sessionId: parts[4] };
  }
  if (parts.length === 6 && parts[3] === "runtime" && parts[5] === "authority-withdrawal") {
    return { kind: "runtime_authority_withdrawal", threadId, sessionId: parts[4] };
  }
  return null;
}

function assertRouteId(name, value, pattern = PRIVATE_ID_PATTERN) {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw httpError(400, "INVALID_REQUEST", `${name} is invalid`);
  }
}

function validateRoute(route) {
  assertRouteId("threadId", route.threadId);
  if (route.obligationId !== undefined) {
    assertRouteId("obligationId", route.obligationId, OBLIGATION_ID_PATTERN);
  }
  if (route.requestId !== undefined) assertRouteId("requestId", route.requestId);
  if (route.sessionId !== undefined) assertRouteId("sessionId", route.sessionId);
}

function inspectPersistedEvidence(action) {
  try {
    return action();
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.httpStatus === undefined &&
      error.httpCode === undefined
    ) {
      throw new IntegrityError(`Structured Obligation persisted evidence is invalid: ${error.message}`);
    }
    throw error;
  }
}

function problem(error) {
  if (error instanceof StructuredObligationInspectionNotFoundError) {
    return [404, "STRUCTURED_OBLIGATION_INSPECTION_NOT_FOUND", error.message, {}];
  }
  if (error instanceof IntegrityError) {
    return [503, "INTEGRITY_FAILURE", "Structured Obligation evidence failed integrity validation", {}];
  }
  if (error instanceof TypeError) {
    return [error.httpStatus ?? 400, error.httpCode ?? "INVALID_REQUEST", error.message, error.httpHeaders ?? {}];
  }
  return [500, "INTERNAL_ERROR", "The world-kernel could not complete the inspection request", {}];
}

export function createStructuredObligationInspectionHttpServer({
  service,
  inspectionStore,
  privateToken = null,
  adminToken = null,
  maxBodyBytes = DEFAULT_MAX_HTTP_BODY_BYTES,
  onError = () => {},
  ...baseOptions
} = {}) {
  if (inspectionStore === null || typeof inspectionStore !== "object") {
    throw new TypeError("inspectionStore is required");
  }
  for (const method of [
    "listObligations",
    "inspectObligation",
    "listRequestApplicability",
    "getRuntimeDischarge",
    "getRuntimeAuthorityWithdrawal",
    "verifyThread",
  ]) {
    if (typeof inspectionStore[method] !== "function") {
      throw new TypeError(`inspectionStore.${method} is required`);
    }
  }
  const server = createCausalWorldKernelHttpServer({
    service,
    privateToken,
    adminToken,
    maxBodyBytes,
    onError,
    ...baseOptions,
  });
  const [baseHandler] = server.listeners("request");
  server.removeAllListeners("request");
  server.on("request", async (request, response) => {
    const route = inspectionRoute(request.url);
    if (route === null) return baseHandler(request, response);
    if (route.kind === "runtime_authority_withdrawal" && request.method !== "GET") {
      return baseHandler(request, response);
    }
    const id = requestId(request.headers["x-request-id"]);
    try {
      if (!loopbackHost(request.headers.host)) {
        throw httpError(421, "MISDIRECTED_REQUEST", "The Fibre world-kernel accepts only loopback Host headers");
      }
      requirePrivate(request, privateToken);
      if (request.method !== "GET") {
        throw httpError(405, "METHOD_NOT_ALLOWED", "Method is not allowed; use GET", { allow: "GET" });
      }
      validateRoute(route);
      if (route.kind === "obligation_list") {
        return writeJson(response, 200, {
          obligations: inspectPersistedEvidence(() => inspectionStore.listObligations(route.threadId)),
        }, id);
      }
      if (route.kind === "obligation_integrity") {
        return writeJson(
          response,
          200,
          inspectPersistedEvidence(() => inspectionStore.verifyThread(route.threadId)),
          id,
        );
      }
      if (route.kind === "obligation_detail") {
        return writeJson(response, 200, {
          obligation: inspectPersistedEvidence(
            () => inspectionStore.inspectObligation(route.threadId, route.obligationId),
          ),
        }, id);
      }
      if (route.kind === "request_applicability") {
        return writeJson(response, 200, {
          applicability: inspectPersistedEvidence(
            () => inspectionStore.listRequestApplicability(route.threadId, route.requestId),
          ),
        }, id);
      }
      if (route.kind === "runtime_discharge") {
        return writeJson(response, 200, {
          discharge: inspectPersistedEvidence(
            () => inspectionStore.getRuntimeDischarge(route.threadId, route.sessionId),
          ),
        }, id);
      }
      if (route.kind === "runtime_authority_withdrawal") {
        return writeJson(response, 200, {
          authorityWithdrawal: inspectPersistedEvidence(
            () => inspectionStore.getRuntimeAuthorityWithdrawal(route.threadId, route.sessionId),
          ),
        }, id);
      }
      return baseHandler(request, response);
    } catch (error) {
      const [status, code, message, headers] = problem(error);
      if (status >= 500) {
        try { onError(error, { requestId: id, method: request.method, url: request.url }); } catch {}
      }
      if (!response.headersSent) {
        return writeJson(response, status, { error: { code, message, requestId: id } }, id, headers);
      }
      response.destroy();
    }
  });
  return server;
}
