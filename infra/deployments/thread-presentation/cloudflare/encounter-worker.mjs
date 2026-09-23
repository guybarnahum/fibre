import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
import baseWorker, { FibrePresentationChannelDurableObject } from "./worker.mjs";
import { createCloudflareActivityRecorder } from "../../cloudflare-activity.mjs";
import { createPublicEncounterApi } from "#services/thread-presentation/src/http/encounter-api.mjs";
import { selectCommittedAvailableThread } from "#services/thread-presentation/src/committed-meet-selection.mjs";

export { FibrePresentationChannelDurableObject };

function binding(env, name) {
  const value = env?.[name];
  if (!value || typeof value.fetch !== "function") throw new TypeError(`${name} service binding is required`);
  return value;
}

function snapshotRequest(request, threadId) {
  const url = new URL(request.url);
  url.pathname = `/api/threads/${encodeURIComponent(threadId)}/snapshot`;
  url.search = "";
  return new Request(url, {
    method: "GET",
    headers: request.headers.get("Origin") === null ? {} : { Origin: request.headers.get("Origin") },
  });
}

async function callWorldMeetingEntry(env, threadId) {
  const response = await binding(env, "WORLD_KERNEL").fetch(new Request("https://world-kernel.internal/internal/inside-fibre/meeting-entry", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-fibre-private-token": env.FIBRE_PRIVATE_TOKEN,
    },
    body: JSON.stringify({ threadId }),
  }));
  let body = null;
  try { body = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(body?.detail ?? body?.error ?? `World LivedNow failed with HTTP ${response.status}`);
    error.status = response.status;
    error.body = body;
    if (typeof body?.code === "string") error.code = body.code;
    throw error;
  }
  if (body?.result?.present?.situationId !== body?.result?.situationId) {
    throw new Error("World LivedNow returned an inconsistent present");
  }
  return body.result;
}

function worldMeetingEntry(env, activityRecorder, threadId) {
  if (activityRecorder === null) return callWorldMeetingEntry(env, threadId);
  return activityRecorder.runStage({
    threadId,
    stage: "presentation.meet.committed_entry",
  }, () => callWorldMeetingEntry(env, threadId));
}

async function callWorldEncounter(env, input) {
  const response = await binding(env, "WORLD_KERNEL").fetch(new Request("https://world-kernel.internal/internal/inside-fibre/visitor-encounter", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-fibre-private-token": env.FIBRE_PRIVATE_TOKEN,
    },
    body: JSON.stringify(input),
  }));
  let body = null;
  try { body = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(body?.error ?? `World encounter failed with HTTP ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return {
    situationId: body.result.situationId,
    responseText: body.result.responseText,
  };
}

function worldEncounter(env, activityRecorder, input) {
  if (activityRecorder === null) return callWorldEncounter(env, input);
  return activityRecorder.runStage({
    threadId: input.threadId,
    correlationId: input.expectedSituationId,
    stage: "presentation.encounter.world_submit",
  }, () => callWorldEncounter(env, input));
}

function selectionRequest(original, url) {
  const headers = new Headers();
  const origin = original.headers.get("Origin");
  if (origin !== null) headers.set("Origin", origin);
  return new Request(url, { method:"GET", headers });
}

async function committedMeetSelection(request, env, ctx, activityRecorder) {
  const selected = await selectCommittedAvailableThread({
    requestUrl:request.url,
    async selectCandidate(url) {
      const response = await baseWorker.fetch(selectionRequest(request, url), env, ctx);
      if (!response.ok) {
        const error = new Error(`Thread directory selection failed with HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return response.json();
    },
    async admitCandidate(threadId) {
      try {
        return await worldMeetingEntry(env, activityRecorder, threadId);
      } catch (error) {
        if (error?.status === 409) return null;
        throw error;
      }
    },
  });
  return Response.json(selected, {
    status:200,
    headers:{
      "Cache-Control":"no-store",
      ...(request.headers.get("Origin") === null
        ? {}
        : {
            "Access-Control-Allow-Origin":request.headers.get("Origin"),
            "Vary":"Origin",
          }),
    },
  });
}

async function infraHealth(env) {
  const health = await createCloudflareInfraDriver({
    objectBucket:env.PRESENTATION_OBJECTS,
    presentationChannels:env.PRESENTATION_CHANNELS,
    catalogDatabase:env.PRESENTATION_CATALOG,
    workflowBindings:env.ASSET_GENERATION ? { asset_generation_v1:env.ASSET_GENERATION } : {},
  }).health.check();
  return Response.json({
    ok:health.level === "normal",
    service:"thread-presentation",
    provider:health.provider,
    health,
  }, { status:health.level === "normal" ? 200 : 503 });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/internal/health/infra") return infraHealth(env);

    const activityRecorder = createCloudflareActivityRecorder({ env, service: "thread-presentation" });
    if (request.method === "GET" && url.pathname === "/api/threads/meet") {
      return committedMeetSelection(request, env, ctx, activityRecorder);
    }
    const encounterApi = createPublicEncounterApi({
      viewerOrigin: env.VIEWER_ORIGIN ?? null,
      ensurePublicPresent(threadId) {
        return worldMeetingEntry(env, activityRecorder, threadId);
      },
      async readPublicPresent(threadId, originalRequest) {
        const response = await baseWorker.fetch(snapshotRequest(originalRequest, threadId), env, ctx);
        if (!response.ok) return null;
        const body = await response.json();
        return body?.currentPresent?.payload ?? null;
      },
      encounter(input) { return worldEncounter(env, activityRecorder, input); },
    });
    const response = await encounterApi.fetch(request);
    return response ?? baseWorker.fetch(request, env, ctx);
  },
  queue(batch, env, ctx) { return baseWorker.queue(batch, env, ctx); },
};
