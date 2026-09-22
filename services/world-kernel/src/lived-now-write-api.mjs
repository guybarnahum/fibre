import {
  assertExactKeys,
  assertId,
  assertPlainObject,
} from "./persistence-common.mjs";
import { LivedNowCoverageError } from "./lived-now-service.mjs";

const TOKEN_ENCODER = new TextEncoder();

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftBytes = TOKEN_ENCODER.encode(left);
  const rightBytes = TOKEN_ENCODER.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

function requireMethod(owner, name) {
  if (!owner || typeof owner[name] !== "function") {
    throw new TypeError(`${name} is required for the LivedNow write API`);
  }
}

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function safeText(value, maximum = 1200) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim().slice(0, maximum);
}

function reconciliationDiagnostics(error, fallbackStage) {
  return Object.freeze({
    stage:safeText(error?.fibreStage, 120) ?? fallbackStage,
    errorName:safeText(error?.name, 120) ?? error?.constructor?.name ?? "Error",
    retryable:typeof error?.retryable === "boolean" ? error.retryable : null,
    httpStatus:Number.isInteger(error?.httpStatus) ? error.httpStatus : null,
    providerErrorCode:safeText(error?.providerErrorCode, 240),
    providerErrorType:safeText(error?.providerErrorType, 240),
    actionHint:safeText(error?.actionHint, 500),
    interior:error?.fibreDiagnostics && typeof error.fibreDiagnostics === "object"
      ? structuredClone(error.fibreDiagnostics)
      : null,
  });
}

export function createLivedNowWriteApi({
  livedNow,
  publication,
  privateToken,
  now = () => new Date().toISOString(),
} = {}) {
  requireMethod(livedNow, "ensure");
  requireMethod(publication, "publishCurrentSituation");
  if (typeof privateToken !== "string" || privateToken === "") {
    throw new TypeError("privateToken is required for the LivedNow write API");
  }
  if (typeof now !== "function") throw new TypeError("now must be a function");

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== "/internal/lived-now/ensure") return null;
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
        return json({ error: "private_token_required" }, 403);
      }

      let body;
      try {
        body = await request.json();
        assertPlainObject("ensure LivedNow request", body);
        assertExactKeys("ensure LivedNow request", body, ["threadId"]);
        assertId("ensure LivedNow request.threadId", body.threadId);
      } catch (error) {
        return json({ error: "invalid_lived_now_request", detail: error.message }, 400);
      }

      let stage = "lived_now.ensure";
      try {
        const situation = await livedNow.ensure({
          threadId: body.threadId,
          at: now(),
        });
        stage = "lived_now.publish_current_situation";
        const published = await publication.publishCurrentSituation(situation);
        return json({
          ok: true,
          result: {
            threadId: situation.threadId,
            situationId: situation.situationId,
            establishedAt: situation.establishedAt,
            present: published.present,
          },
        });
      } catch (error) {
        if (error instanceof LivedNowCoverageError) {
          return json({ error: "lived_now_unavailable", detail: error.message }, 409);
        }
        const code = typeof error?.code === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u.test(error.code)
          ? error.code
          : "LIVED_NOW_RECONCILIATION_FAILED";
        const detail = safeText(error?.message);
        const diagnostics = reconciliationDiagnostics(error, stage);
        console.error(JSON.stringify({
          event:"lived-now-reconciliation-failed",
          threadId:body.threadId,
          code,
          detail,
          diagnostics,
        }));
        return json({
          error: "lived_now_reconciliation_failed",
          code,
          ...(detail === null ? {} : { detail }),
          diagnostics,
        }, 503);
      }
    },
  });
}
