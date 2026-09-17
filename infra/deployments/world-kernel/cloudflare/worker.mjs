import { DurableObject } from "cloudflare:workers";

import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
import { ThreadDirectoryStore } from "#services/world-kernel/src/thread-directory-store.mjs";
import { createThreadDirectoryService } from "#services/world-kernel/src/thread-directory-service.mjs";
import { createCloudflareDurableObjectServiceRouter } from "../../cloudflare-do-service-router.mjs";
import { createWorldCloudflareRuntime } from "./runtime.mjs";

const WORLD_SCOPE_ID = "world";
const TOKEN_ENCODER = new TextEncoder();
const THREAD_IDENTITY_ROUTE = /^\/internal\/threads\/([A-Za-z0-9][A-Za-z0-9._:-]{0,255})\/identity$/u;
const THREAD_DIRECTORY_ROUTE = "/internal/thread-directory/search";

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftBytes = TOKEN_ENCODER.encode(left);
  const rightBytes = TOKEN_ENCODER.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  return difference === 0;
}

function privateOperatorAuthorized(request, env) {
  return constantTimeEqual(request.headers.get("x-fibre-private-token"), env?.FIBRE_PRIVATE_TOKEN);
}

function directorySearch(url) {
  const allowed = new Set(["q", "fin", "limit"]);
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key)) throw new TypeError(`unsupported Thread directory parameter ${key}`);
  }
  const limitText = url.searchParams.get("limit") ?? "50";
  if (!/^\d+$/u.test(limitText)) throw new TypeError("Thread directory limit is invalid");
  const limit = Number(limitText);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new TypeError("Thread directory limit is invalid");
  const query = url.searchParams.get("q");
  const fin = url.searchParams.get("fin");
  if (query !== null && query.length > 240) throw new TypeError("Thread directory query is too long");
  if (fin !== null && fin.length > 64) throw new TypeError("Thread directory FIN is too long");
  return { query, fin, limit };
}

async function reconciliationState(runtime) {
  const scheduledTimeMs = await runtime.infraDriver.scheduler.get(WORLD_SCOPE_ID);
  return Object.freeze({
    scheduled: scheduledTimeMs !== null,
    scheduledTimeMs,
    running: runtime.reconciliationProcess.running,
  });
}

function threadIdentity(runtime, threadId) {
  const thread = runtime.worldStore.getThread(threadId, { required:false });
  if (thread === null) return null;
  const registration = runtime.civilRegistryStore.getCivilRegistrationByThreadId(threadId, { required:false });
  const embodiments = runtime.embodimentStore.listCurrent(threadId);
  const symbolicGenomes = runtime.symbolicGenomeStore.listThreadGenomes(threadId);
  return Object.freeze({
    threadId,
    fibreIdentityNumber: registration?.fibreIdentityNumber ?? null,
    lifecycleStatus: typeof thread.status === "string" ? thread.status : null,
    thread: structuredClone(thread),
    civilRegistration: registration === null ? null : structuredClone(registration),
    embodiments: structuredClone(embodiments),
    symbolicGenomes: structuredClone(symbolicGenomes),
  });
}

export class FibreWorldDurableObject extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.runtime = null;
    this.infraDriver = createCloudflareInfraDriver({ stateScopes:{ [WORLD_SCOPE_ID]:ctx.storage } });
    this.health = this.infraDriver.health;
    this.threadDirectoryStore = null;
    this.threadDirectory = null;
  }

  runtimeForRequest() {
    if (this.runtime === null) {
      this.runtime = createWorldCloudflareRuntime({ storage: this.ctx.storage, env: this.env });
    }
    return this.runtime;
  }

  directoryForRequest() {
    if (this.threadDirectory === null) {
      this.threadDirectoryStore = new ThreadDirectoryStore({
        infraDriver:this.infraDriver,
        stateScopeId:WORLD_SCOPE_ID,
      });
      this.threadDirectory = createThreadDirectoryService({ directoryStore:this.threadDirectoryStore });
    }
    return this.threadDirectory;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET"
      && (url.pathname === "/internal/health/state" || url.pathname === "/internal/health/infra")) {
      const health = await this.health.check();
      return Response.json({
        ok: health.level === "normal",
        service: "world-kernel",
        provider: health.provider,
        stateScopeId: WORLD_SCOPE_ID,
        stateChecked: true,
        capabilities:["state"],
        health,
      }, { status:health.level === "normal" ? 200 : 503 });
    }
    if (url.pathname === THREAD_DIRECTORY_ROUTE) {
      if (request.method !== "GET") return Response.json({ error:{ code:"METHOD_NOT_ALLOWED" } }, { status:405 });
      if (!privateOperatorAuthorized(request, this.env)) {
        return Response.json({ error:{ code:"PRIVATE_TOKEN_REQUIRED" } }, { status:403 });
      }
      try {
        return Response.json({
          contract:"fibre-world-thread-registry-v0.1",
          ...this.directoryForRequest().search(directorySearch(url)),
        });
      } catch (error) {
        if (error instanceof TypeError) return Response.json({ error:{ code:"INVALID_REQUEST", detail:error.message } }, { status:400 });
        throw error;
      }
    }
    const runtime = this.runtimeForRequest();
    const identityMatch = THREAD_IDENTITY_ROUTE.exec(url.pathname);
    if (identityMatch !== null) {
      if (url.search !== "") return Response.json({ error:{ code:"QUERY_NOT_SUPPORTED" } }, { status:400 });
      if (request.method !== "GET") return Response.json({ error:{ code:"METHOD_NOT_ALLOWED" } }, { status:405 });
      const identity = threadIdentity(runtime, decodeURIComponent(identityMatch[1]));
      if (identity === null) return Response.json({ error:{ code:"THREAD_NOT_FOUND" } }, { status:404 });
      return Response.json({ contract:"fibre-world-thread-identity-v0.2", identity });
    }
    if (url.pathname === "/internal/reconciliation/stop" || url.pathname === "/internal/reconciliation/wake") {
      if (url.search !== "") return Response.json({ error: { code: "QUERY_NOT_SUPPORTED" } }, { status: 400 });
      if (request.method !== "POST") return Response.json({ error: { code: "METHOD_NOT_ALLOWED" } }, { status: 405 });
      if (!privateOperatorAuthorized(request, this.env)) {
        return Response.json({ error: { code: "PRIVATE_TOKEN_REQUIRED" } }, { status: 403 });
      }
      if (url.pathname.endsWith("/stop")) {
        const cancelled = await runtime.reconciliationRuntime.stop();
        return Response.json({ ok: true, action: "stop", cancelled, reconciliation: await reconciliationState(runtime) });
      }
      const wake = await runtime.reconciliationRuntime.requestWake();
      return Response.json({ ok: true, action: "wake", wake, reconciliation: await reconciliationState(runtime) });
    }
    const repairResponse = await runtime.repairApi.fetch(request);
    if (repairResponse !== null) return repairResponse;
    const recoveryResponse = await runtime.visualRecoveryApi.fetch(request);
    if (recoveryResponse !== null) return recoveryResponse;
    const inspectionResponse = await runtime.inspectionApi.fetch(request);
    if (inspectionResponse !== null) return inspectionResponse;
    const birthResponse = await runtime.birthApi.fetch(request);
    if (birthResponse !== null) return birthResponse;
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  async alarm(alarmInfo) {
    const runtime = this.runtimeForRequest();
    console.log(JSON.stringify({
      event: "world-reconciliation-alarm-started",
      retryCount: alarmInfo?.retryCount ?? 0,
      isRetry: alarmInfo?.isRetry === true,
    }));
    try {
      const result = await runtime.reconciliationRuntime.handleWake();
      console.log(JSON.stringify({
        event: "world-reconciliation-alarm-completed",
        reconciliationPending: result.reconciliationPending,
        retryDelayMs: result.retryDelayMs,
      }));
      return result;
    } catch (error) {
      console.error(JSON.stringify({
        event: "world-reconciliation-alarm-failed",
        errorName: error?.constructor?.name ?? "Error",
        message: String(error?.message ?? error).slice(0, 512),
      }));
      throw error;
    }
  }
}

export default createCloudflareDurableObjectServiceRouter({
  service: "world-kernel",
  bindingName: "WORLD_STATE",
  stateScopeId: WORLD_SCOPE_ID,
});
