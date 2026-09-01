const TOKEN_ENCODER = new TextEncoder();
const THREAD_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const THREAD_INSPECTION_ROUTE = /^\/internal\/threads\/([A-Za-z0-9][A-Za-z0-9._:-]{0,255})\/inspection$/u;
const THREAD_LIST_ROUTE = "/internal/threads";

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

function assertReader(name, reader, methods) {
  if (!reader || typeof reader !== "object") throw new TypeError(`${name} is required`);
  for (const method of methods) {
    if (typeof reader[method] !== "function") throw new TypeError(`${name} must expose ${method}()`);
  }
  return reader;
}

function normalizeThreadIds(values) {
  if (!Array.isArray(values)) throw new TypeError("Thread inspection directory must return an array");
  const ids = [];
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== "string" || !THREAD_ID_PATTERN.test(value)) {
      throw new TypeError("Thread inspection directory returned an invalid Thread ID");
    }
    if (seen.has(value)) continue;
    seen.add(value);
    ids.push(value);
  }
  return ids.sort((left, right) => left.localeCompare(right));
}

function clone(value) {
  return value === null || value === undefined ? value ?? null : structuredClone(value);
}

export function createThreadInspectionApi({
  worldReader,
  threadDirectory,
  identityReader,
  memoryReader,
  situatedLifeReader,
  genomeReader,
  civilRegistry,
  embodimentReader,
  privateToken,
  onError = () => {},
} = {}) {
  const world = assertReader("Thread inspection worldReader", worldReader, [
    "getThread",
    "listEvents",
    "verifyThreadIntegrity",
  ]);
  const directory = assertReader("Thread inspection threadDirectory", threadDirectory, ["listThreadIds"]);
  const identity = assertReader("Thread inspection identityReader", identityReader, [
    "getPassport",
    "getCurrentIdentityView",
    "verifyThreadIdentityIntegrity",
    "listMemoryVisualCompanions",
  ]);
  const memories = assertReader("Thread inspection memoryReader", memoryReader, ["listCurrentMemories"]);
  const situated = assertReader("Thread inspection situatedLifeReader", situatedLifeReader, [
    "listCurrentLifeRelations",
    "listCurrentPlaceEpisodes",
  ]);
  const genomes = assertReader("Thread inspection genomeReader", genomeReader, ["listThreadGenomes"]);
  const registry = assertReader("Thread inspection civilRegistry", civilRegistry, ["getCivilRegistrationByThreadId"]);
  const embodiment = assertReader("Thread inspection embodimentReader", embodimentReader, ["listCurrent"]);
  if (typeof privateToken !== "string" || privateToken.length < 16) {
    throw new TypeError("Thread inspection privateToken must be at least 16 characters");
  }
  if (typeof onError !== "function") throw new TypeError("Thread inspection onError must be a function");

  function listThreads() {
    const threadIds = normalizeThreadIds(directory.listThreadIds());
    return threadIds.map((threadId) => {
      const thread = world.getThread(threadId, { required: false });
      const registration = registry.getCivilRegistrationByThreadId(threadId, { required: false });
      return Object.freeze({
        threadId,
        authoritativeThreadExists: thread !== null,
        name: thread?.identity?.name ?? null,
        originOrientation: thread?.identity?.originOrientation ?? null,
        status: thread?.status ?? null,
        version: thread?.version ?? null,
        fibreIdentityNumber: registration?.fibreIdentityNumber ?? null,
      });
    });
  }

  function inspectThread(threadId) {
    const thread = world.getThread(threadId, { required: false });
    if (thread === null) return null;
    return Object.freeze({
      threadId,
      thread: clone(thread),
      events: clone(world.listEvents(threadId)),
      integrity: Object.freeze({
        world: clone(world.verifyThreadIntegrity(threadId)),
        identity: clone(identity.verifyThreadIdentityIntegrity(threadId)),
      }),
      civilRegistration: clone(registry.getCivilRegistrationByThreadId(threadId, { required: false })),
      identity: Object.freeze({
        passport: clone(identity.getPassport(threadId)),
        current: clone(identity.getCurrentIdentityView(threadId)),
        memoryVisualCompanions: clone(identity.listMemoryVisualCompanions(threadId)),
      }),
      autobiographicalMemories: clone(memories.listCurrentMemories(threadId)),
      situatedLife: Object.freeze({
        relations: clone(situated.listCurrentLifeRelations(threadId)),
        places: clone(situated.listCurrentPlaceEpisodes(threadId)),
      }),
      symbolicGenomes: clone(genomes.listThreadGenomes(threadId)),
      embodiment: Object.freeze({
        current: clone(embodiment.listCurrent(threadId)),
      }),
    });
  }

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      const inspectionMatch = THREAD_INSPECTION_ROUTE.exec(url.pathname);
      if (url.pathname !== THREAD_LIST_ROUTE && inspectionMatch === null) return null;
      try {
        if (url.search !== "") return json(400, { error: { code: "QUERY_NOT_SUPPORTED" } });
        if (request.method !== "GET") return json(405, { error: { code: "METHOD_NOT_ALLOWED" } });
        if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
          return json(403, { error: { code: "PRIVATE_TOKEN_REQUIRED" } });
        }
        if (inspectionMatch === null) {
          const threads = listThreads();
          return json(200, { ok: true, threadCount: threads.length, threads });
        }
        const inspection = inspectThread(inspectionMatch[1]);
        return inspection === null
          ? json(404, { error: { code: "THREAD_NOT_FOUND" } })
          : json(200, { ok: true, inspection });
      } catch (error) {
        try { onError(error); } catch {}
        return json(500, { error: { code: "THREAD_INSPECTION_FAILED" } });
      }
    },
  });
}
