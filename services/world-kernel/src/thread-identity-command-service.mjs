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
    async update(threadId, { operationKey, name, sex, birthDate, languages } = {}) {
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

      const result = identityUpdater.update(thread, { name, sex, birthDate, languages, operationKey });
      await record(activity, {
        threadId,
        operationId:operationKey,
        stage:"thread.identity.update",
        status:"succeeded",
        attempt:1,
        evidence:{ eventId:result.eventId, changes:Object.keys(result.changes ?? {}) },
      });
      return Object.freeze({
        threadId,
        operationKey,
        exists:true,
        changed:result.changed === true,
        eventId:result.eventId,
        changes:Object.freeze({ ...result.changes }),
        identity:Object.freeze({
          name:result.thread.identity?.name ?? null,
          sex:result.thread.identity?.sex ?? null,
          birthDate:result.thread.identity?.birthDate ?? null,
          languages:Object.freeze([...(result.thread.identity?.languages ?? [])]),
        }),
        version:result.thread.version,
      });
    },
  });
}
