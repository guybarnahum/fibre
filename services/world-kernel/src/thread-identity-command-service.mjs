import { canonicalJson } from "./persistence-common.mjs";

function requireMethod(name, value, method) {
  if (!value || typeof value[method] !== "function") throw new TypeError(`${name} must expose ${method}()`);
  return value;
}

function optionalActivity(value) {
  if (value === null || value === undefined) return null;
  if (typeof value.record !== "function") throw new TypeError("identity activity recorder must expose record()");
  return value;
}

async function record(activity, entry) {
  if (activity === null) return;
  try { await activity.record(entry); } catch {}
}

function persistenceMismatch(threadId, detail) {
  const error = new Error(`Thread ${threadId} identity update was not durably readable: ${detail}`);
  error.code = "THREAD_IDENTITY_PERSISTENCE_MISMATCH";
  error.retryable = false;
  return error;
}

function persistedIdentityUpdate(worldReader, threadId, result) {
  const persisted = worldReader.getThread(threadId, { required:false });
  if (persisted === null) throw persistenceMismatch(threadId, "Thread disappeared after update");
  if (persisted.version !== result.thread.version) {
    throw persistenceMismatch(threadId, `expected version ${result.thread.version}, read version ${persisted.version}`);
  }
  if (persisted.provenance?.lastEventId !== result.thread.provenance?.lastEventId) {
    throw persistenceMismatch(threadId, "last identity event did not become authoritative");
  }
  for (const field of Object.keys(result.changes ?? {})) {
    if (canonicalJson(persisted.identity?.[field] ?? null) !== canonicalJson(result.thread.identity?.[field] ?? null)) {
      throw persistenceMismatch(threadId, `${field} did not match the committed value`);
    }
  }
  return persisted;
}

export function createThreadIdentityCommandService({
  worldReader,
  genesisSexEvidence,
  identityUpdater,
  activityRecorder = null,
} = {}) {
  requireMethod("worldReader", worldReader, "getThread");
  requireMethod("genesisSexEvidence", genesisSexEvidence, "resolve");
  requireMethod("identityUpdater", identityUpdater, "update");
  const activity = optionalActivity(activityRecorder);

  return Object.freeze({
    async update(threadId, { operationKey, name, sex, birthDate, birthPlace } = {}) {
      const thread = worldReader.getThread(threadId, { required:false });
      if (thread === null) return Object.freeze({
        threadId,
        operationKey,
        exists:false,
        changed:false,
        eventId:null,
        changes:Object.freeze({}),
        identity:null,
        version:null,
      });

      if (sex !== undefined && thread.identity?.sex === undefined) {
        const evidence = genesisSexEvidence.resolve(threadId);
        if (evidence !== null) {
          throw new TypeError(`Thread ${threadId} has preserved Genesis sex evidence; use genesis_sex_v1 migration`);
        }
      }

      const result = identityUpdater.update(thread, { name, sex, birthDate, birthPlace, operationKey });
      const persisted = persistedIdentityUpdate(worldReader, threadId, result);
      await record(activity, {
        threadId,
        operationId:operationKey,
        stage:"thread.identity.update",
        status:"succeeded",
        attempt:1,
        evidence:{ eventId:result.eventId, changes:Object.keys(result.changes ?? {}), persistedVersion:persisted.version },
      });
      return Object.freeze({
        threadId,
        operationKey,
        exists:true,
        changed:result.changed === true,
        eventId:result.eventId,
        changes:Object.freeze({ ...result.changes }),
        identity:Object.freeze({
          name:persisted.identity?.name ?? null,
          sex:persisted.identity?.sex ?? null,
          birthDate:persisted.identity?.birthDate ?? null,
          birthPlace:persisted.identity?.birthPlace === undefined ? null : structuredClone(persisted.identity.birthPlace),
          languages:Object.freeze([...(persisted.identity?.languages ?? [])]),
        }),
        version:persisted.version,
      });
    },
  });
}
