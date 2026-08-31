const TOKEN_ENCODER = new TextEncoder();
const INSPECTION_ROUTE = /^\/internal\/genesis\/([A-Za-z0-9][A-Za-z0-9._:-]{0,255})\/threads\/([A-Za-z0-9][A-Za-z0-9._:-]{0,255})\/inspection$/u;

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

function assertReader(name, reader, methods) {
  if (!reader || typeof reader !== "object") throw new TypeError(`${name} is required`);
  for (const method of methods) {
    if (typeof reader[method] !== "function") throw new TypeError(`${name} must expose ${method}()`);
  }
  return reader;
}

function summarizeCivilRegistration(record) {
  if (record === null) return null;
  return Object.freeze({
    registrationId: record.registrationId,
    fibreIdentityNumber: record.fibreIdentityNumber,
    birthEventRef: record.birthEventRef,
    worldRef: record.worldRef,
    registrationDigest: record.registrationDigest,
  });
}

function summarizeEmbodiment(record) {
  return Object.freeze({
    embodimentId: record.embodimentId,
    revision: record.revision,
    kind: record.kind,
    representationKind: record.representationKind,
    visibility: record.visibility,
    specificationDigest: record.specificationDigest,
    referenceObjectRef: record.asset?.referenceObjectRef ?? null,
  });
}

export function createGenesisThreadInspectionApi({
  worldReader,
  genesisReader,
  genomeReader,
  civilRegistry,
  embodimentReader,
  privateToken,
} = {}) {
  const world = assertReader("Genesis Thread inspection worldReader", worldReader, ["getThread", "listEvents"]);
  const genesis = assertReader("Genesis Thread inspection genesisReader", genesisReader, ["inspectGenesis"]);
  const genomes = assertReader("Genesis Thread inspection genomeReader", genomeReader, ["listThreadGenomes"]);
  const registry = assertReader("Genesis Thread inspection civilRegistry", civilRegistry, ["getCivilRegistrationByThreadId"]);
  const embodiment = assertReader("Genesis Thread inspection embodimentReader", embodimentReader, ["listCurrent"]);
  if (typeof privateToken !== "string" || privateToken.length < 16) {
    throw new TypeError("Genesis Thread inspection privateToken must be at least 16 characters");
  }

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      const match = INSPECTION_ROUTE.exec(url.pathname);
      if (match === null) return null;
      if (url.search !== "") return json(400, { error: { code: "QUERY_NOT_SUPPORTED" } });
      if (request.method !== "GET") return json(405, { error: { code: "METHOD_NOT_ALLOWED" } });
      if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
        return json(403, { error: { code: "PRIVATE_TOKEN_REQUIRED" } });
      }

      const [, genesisId, threadId] = match;
      const genesisInspection = genesis.inspectGenesis(genesisId);
      const manifestThreadId = genesisInspection.manifest?.manifest?.threadId ?? null;
      if (manifestThreadId !== null && manifestThreadId !== threadId) {
        return json(409, { error: { code: "GENESIS_THREAD_IDENTITY_MISMATCH" } });
      }

      const thread = world.getThread(threadId, { required: false });
      const events = thread === null ? [] : world.listEvents(threadId);
      const threadGenomes = genomes.listThreadGenomes(threadId);
      const registration = registry.getCivilRegistrationByThreadId(threadId, { required: false });
      const currentEmbodiment = thread === null ? [] : embodiment.listCurrent(threadId);
      return json(200, {
        ok: true,
        inspection: {
          genesisId,
          threadId,
          authoritativeThread: thread === null ? {
            exists: false,
            version: null,
            status: null,
            eventCount: 0,
            lastEventId: null,
          } : {
            exists: true,
            version: thread.version,
            status: thread.status,
            eventCount: events.length,
            lastEventId: thread.provenance?.lastEventId ?? null,
          },
          genesis: {
            manifestExists: genesisInspection.manifest !== null,
            threadPublished: genesisInspection.threadPublished === true,
            manifestDigest: genesisInspection.manifest?.manifestDigest ?? null,
            worldSpecId: genesisInspection.worldSpec?.record?.worldSpecId ?? null,
            worldSpecDigest: genesisInspection.worldSpec?.recordDigest ?? null,
            historicalEnvelopePlanDigest: genesisInspection.historicalEnvelopePlan?.planDigest ?? null,
          },
          symbolicGenomes: {
            count: threadGenomes.length,
            genomes: threadGenomes.map((record) => ({
              genomeId: record.header.genomeId,
              genomeDigest: record.genomeDigest,
            })),
          },
          civilRegistration: summarizeCivilRegistration(registration),
          embodiment: {
            currentCount: currentEmbodiment.length,
            current: currentEmbodiment.map(summarizeEmbodiment),
          },
        },
      });
    },
  });
}
