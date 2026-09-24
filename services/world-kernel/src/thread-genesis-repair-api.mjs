const TOKEN_ENCODER = new TextEncoder();
const REPAIR_ROUTE = /^\/internal\/threads\/([A-Za-z0-9][A-Za-z0-9._:-]{0,255})\/repair$/u;
const CONTRACT = "fibre-thread-repair-v0.7";

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
    if (value.action === "recover") return Object.freeze({ action:"recover" });
    if (value.action === "identity") {
      if (typeof value.operationKey !== "string" || value.operationKey.trim() === "") throw new TypeError();
      const name = value.name === undefined ? undefined : value.name;
      const sex = value.sex === undefined ? undefined : value.sex;
      const birthDate = value.birthDate === undefined ? undefined : value.birthDate;
      if (name === undefined && sex === undefined && birthDate === undefined) throw new TypeError();
      return Object.freeze({ action:"identity", operationKey:value.operationKey.trim(), name, sex, birthDate });
    }
    if (value.action === "raised_languages") {
      if (typeof value.operationKey !== "string" || value.operationKey.trim() === "") throw new TypeError();
      if (!Array.isArray(value.languages)) throw new TypeError();
      return Object.freeze({ action:"raised_languages", operationKey:value.operationKey.trim(), languages:value.languages });
    }
    if (value.action === "canonical_visual_identity") {
      if (typeof value.operationKey !== "string" || value.operationKey.trim() === "") throw new TypeError();
      if (!value.correctedSpecification || typeof value.correctedSpecification !== "object" || Array.isArray(value.correctedSpecification)) throw new TypeError();
      if (typeof value.reason !== "string" || value.reason.trim() === "") throw new TypeError();
      const evidenceReferences = value.evidenceReferences ?? [];
      if (!Array.isArray(evidenceReferences) || !evidenceReferences.every((entry) => typeof entry === "string" && entry.trim() !== "")) throw new TypeError();
      return Object.freeze({
        action:"canonical_visual_identity",
        operationKey:value.operationKey.trim(),
        correctedSpecification:value.correctedSpecification,
        reason:value.reason.trim(),
        evidenceReferences:Object.freeze(evidenceReferences.map((entry) => entry.trim())),
      });
    }
    if (value.action === "migrate") {
      if (typeof value.migrationId !== "string" || value.migrationId.trim() === "") throw new TypeError();
      if (typeof value.migrationKey !== "string" || value.migrationKey.trim() === "") throw new TypeError();
      const input = value.input ?? null;
      if (input !== null && (!input || typeof input !== "object" || Array.isArray(input))) throw new TypeError();
      return Object.freeze({
        action:"migrate",
        migrationId:value.migrationId.trim(),
        migrationKey:value.migrationKey.trim(),
        input,
      });
    }
    if (typeof value.repairKey !== "string" || value.repairKey.trim() === "") throw new TypeError();
    return Object.freeze({ action:"repair", repairKey:value.repairKey.trim() });
  } catch {
    throw new TypeError("Thread command is invalid");
  }
}

export function createThreadGenesisRepairApi({
  repairService,
  identityService,
  visualIdentityRepairService,
  privateToken,
  reconciliationWorkset = null,
  onRepair = null,
  onRecover = null,
  onIdentityUpdate = null,
  onVisualIdentityCorrection = null,
} = {}) {
  if (!repairService
    || typeof repairService.diagnose !== "function"
    || typeof repairService.migrate !== "function"
    || typeof repairService.repair !== "function") {
    throw new TypeError("Thread repair API requires diagnose(), migrate(), and repair()");
  }
  if (!identityService || typeof identityService.update !== "function") {
    throw new TypeError("Thread repair API requires identityService.update()");
  }
  if (!visualIdentityRepairService || typeof visualIdentityRepairService.repair !== "function") {
    throw new TypeError("Thread repair API requires visualIdentityRepairService.repair()");
  }
  if (typeof privateToken !== "string" || privateToken.length < 16) {
    throw new TypeError("Thread repair privateToken must be at least 16 characters");
  }
  if (reconciliationWorkset !== null
    && (typeof reconciliationWorkset.get !== "function" || typeof reconciliationWorkset.requeue !== "function")) {
    throw new TypeError("Thread repair reconciliationWorkset must expose get() and requeue()");
  }
  if (onRepair !== null && typeof onRepair !== "function") {
    throw new TypeError("Thread repair onRepair must be a function or null");
  }
  if (onRecover !== null && typeof onRecover !== "function") {
    throw new TypeError("Thread repair onRecover must be a function or null");
  }
  if (onIdentityUpdate !== null && typeof onIdentityUpdate !== "function") {
    throw new TypeError("Thread repair onIdentityUpdate must be a function or null");
  }
  if (onVisualIdentityCorrection !== null && typeof onVisualIdentityCorrection !== "function") {
    throw new TypeError("Thread repair onVisualIdentityCorrection must be a function or null");
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
            contract:CONTRACT,
            diagnosis,
            reconciliation:reconciliationWorkset?.get(threadId) ?? null,
          });
        }
        const command = await repairBody(request);
        if (command.action === "recover") {
          if (reconciliationWorkset === null) return json(409, { error:{ code:"THREAD_RECOVERY_UNAVAILABLE" } });
          const before = reconciliationWorkset.get(threadId);
          if (before?.state !== "dead_letter") return json(409, { error:{ code:"THREAD_NOT_DEAD_LETTER" } });
          reconciliationWorkset.requeue(threadId);
          await onRecover?.({ threadId, before });
          return json(200, {
            contract:CONTRACT,
            recovery:{ threadId, before, after:reconciliationWorkset.get(threadId) },
          });
        }
        if (command.action === "identity") {
          const result = await identityService.update(threadId, command);
          const identityProjection = result.exists
            ? await onIdentityUpdate?.({ threadId, result }) ?? null
            : null;
          return json(result.exists ? 200 : 404, {
            contract:CONTRACT,
            identityUpdate:result,
            identityProjection,
            reconciliation:reconciliationWorkset?.get(threadId) ?? null,
          });
        }
        if (command.action === "raised_languages") {
          const result = await repairService.updateRaisedLanguages(threadId, command);
          return json(result.before.exists ? 200 : 404, {
            contract:CONTRACT,
            raisedLanguagesUpdate:result,
            reconciliation:reconciliationWorkset?.get(threadId) ?? null,
          });
        }
        if (command.action === "canonical_visual_identity") {
          const result = visualIdentityRepairService.repair({ threadId, ...command });
          const requeued = reconciliationWorkset?.requeue(threadId) ?? false;
          await onVisualIdentityCorrection?.({ threadId, result, requeued });
          return json(200, {
            contract:CONTRACT,
            visualIdentityCorrection:result,
            reconciliation:reconciliationWorkset?.get(threadId) ?? null,
          });
        }
        if (command.action === "migrate") {
          const result = await repairService.migrate(threadId, command);
          return json(result.before.exists ? 200 : 404, {
            contract:CONTRACT,
            migration:result,
            reconciliation:reconciliationWorkset?.get(threadId) ?? null,
          });
        }
        const result = await repairService.repair(threadId, { repairKey:command.repairKey });
        await onRepair?.({ threadId, result });
        return json(result.before.exists ? 200 : 404, {
          contract:CONTRACT,
          result,
          reconciliation:reconciliationWorkset?.get(threadId) ?? null,
        });
      } catch (error) {
        if (error instanceof TypeError) return json(400, { error:{ code:"INVALID_THREAD_COMMAND", detail:error.message } });
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
