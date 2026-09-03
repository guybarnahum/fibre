const TOKEN_ENCODER = new TextEncoder();
const RECOVERY_ROUTE = /^\/internal\/threads\/([A-Za-z0-9][A-Za-z0-9._:-]{0,255})\/visual-publication\/recover$/u;

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftBytes = TOKEN_ENCODER.encode(left);
  const rightBytes = TOKEN_ENCODER.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  return difference === 0;
}

function json(status, payload) {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'",
    },
  });
}

async function body(request) {
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    if (typeof value.recoveryKey !== "string" || value.recoveryKey.trim() === "") throw new TypeError();
    return Object.freeze({ recoveryKey: value.recoveryKey.trim() });
  } catch {
    throw new TypeError("visual recovery body must contain non-empty recoveryKey");
  }
}

export function createThreadVisualPublicationRecoveryApi({ reconciler, privateToken } = {}) {
  if (!reconciler || typeof reconciler.reconcileThread !== "function") {
    throw new TypeError("Thread visual recovery API requires reconcileThread()");
  }
  if (typeof privateToken !== "string" || privateToken.length < 16) {
    throw new TypeError("Thread visual recovery privateToken must be at least 16 characters");
  }

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      const match = RECOVERY_ROUTE.exec(url.pathname);
      if (match === null) return null;
      if (url.search !== "") return json(400, { error: { code: "QUERY_NOT_SUPPORTED" } });
      if (request.method !== "POST") return json(405, { error: { code: "METHOD_NOT_ALLOWED" } });
      if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
        return json(403, { error: { code: "PRIVATE_TOKEN_REQUIRED" } });
      }

      try {
        const { recoveryKey } = await body(request);
        const result = await reconciler.reconcileThread({
          threadId: match[1],
          regenerationKey: recoveryKey,
          activityContext: { recoveryKey },
        });
        return json(200, { ok: true, recoveryKey, result });
      } catch (error) {
        if (error instanceof TypeError) return json(400, { error: { code: "INVALID_RECOVERY_REQUEST", detail: error.message } });
        return json(503, {
          error: {
            code: typeof error?.code === "string" ? error.code : "THREAD_VISUAL_RECOVERY_FAILED",
            detail: error instanceof Error ? error.message : String(error),
            retryable: error?.retryable !== false,
          },
        });
      }
    },
  });
}
