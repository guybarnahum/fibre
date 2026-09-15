const TOKEN_ENCODER = new TextEncoder();
const REPAIR_ROUTE = /^\/internal\/threads\/([A-Za-z0-9][A-Za-z0-9._:-]{0,255})\/repair$/u;

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
      "cache-control":"no-store",
      "x-content-type-options":"nosniff",
      "content-security-policy":"default-src 'none'",
    },
  });
}

async function repairBody(request) {
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    if (typeof value.repairKey !== "string" || value.repairKey.trim() === "") throw new TypeError();
    return Object.freeze({ repairKey:value.repairKey.trim() });
  } catch {
    throw new TypeError("Thread repair body must contain non-empty repairKey");
  }
}

export function createThreadGenesisRepairApi({ repairService, privateToken, onRepair = null } = {}) {
  if (!repairService || typeof repairService.diagnose !== "function" || typeof repairService.repair !== "function") {
    throw new TypeError("Thread repair API requires diagnose() and repair()");
  }
  if (typeof privateToken !== "string" || privateToken.length < 16) {
    throw new TypeError("Thread repair privateToken must be at least 16 characters");
  }
  if (onRepair !== null && typeof onRepair !== "function") {
    throw new TypeError("Thread repair onRepair must be a function or null");
  }

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      const match = REPAIR_ROUTE.exec(url.pathname);
      if (match === null) return null;
      if (url.search !== "") return json(400, { error:{ code:"QUERY_NOT_SUPPORTED" } });
      if (!["GET", "POST"].includes(request.method)) return json(405, { error:{ code:"METHOD_NOT_ALLOWED" } });
      if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
        return json(403, { error:{ code:"PRIVATE_TOKEN_REQUIRED" } });
      }

      const threadId = match[1];
      try {
        if (request.method === "GET") {
          const diagnosis = await repairService.diagnose(threadId);
          return json(diagnosis.exists ? 200 : 404, {
            contract:"fibre-thread-repair-v0.1",
            diagnosis,
          });
        }
        const { repairKey } = await repairBody(request);
        const result = await repairService.repair(threadId, { repairKey });
        await onRepair?.({ threadId, result });
        return json(result.before.exists ? 200 : 404, {
          contract:"fibre-thread-repair-v0.1",
          result,
        });
      } catch (error) {
        if (error instanceof TypeError) return json(400, { error:{ code:"INVALID_REPAIR_REQUEST", detail:error.message } });
        return json(503, {
          error:{
            code:typeof error?.code === "string" ? error.code : "THREAD_REPAIR_FAILED",
            detail:error instanceof Error ? error.message : String(error),
            retryable:error?.retryable !== false,
          },
        });
      }
    },
  });
}
