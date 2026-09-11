import baseWorker from "./worker.mjs";
import { createPublicEncounterApi } from "#services/thread-presentation/src/http/encounter-api.mjs";

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

async function worldEncounter(env, input) {
  const response = await binding(env, "WORLD_KERNEL").fetch(new Request("https://world-kernel.internal/internal/lived-encounter", {
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
    situationId: body.result.grounding.situationId,
    responseText: body.result.responseText,
  };
}

export default {
  async fetch(request, env, ctx) {
    const encounterApi = createPublicEncounterApi({
      viewerOrigin: env.VIEWER_ORIGIN ?? null,
      async readPublicPresent(threadId, originalRequest) {
        const response = await baseWorker.fetch(snapshotRequest(originalRequest, threadId), env, ctx);
        if (!response.ok) return null;
        const body = await response.json();
        return body?.currentPresent?.payload ?? null;
      },
      encounter(input) { return worldEncounter(env, input); },
    });
    const response = await encounterApi.fetch(request);
    return response ?? baseWorker.fetch(request, env, ctx);
  },
  queue(batch, env, ctx) { return baseWorker.queue(batch, env, ctx); },
};
