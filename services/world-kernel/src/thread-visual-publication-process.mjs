function requireMethod(name, value, method) {
  if (!value || typeof value[method] !== "function") {
    throw new TypeError(`${name} must expose ${method}()`);
  }
  return value;
}

function normalizeThreadIds(value) {
  if (!Array.isArray(value)) throw new TypeError("visual publication Thread source must return an array");
  const ids = [...new Set(value)];
  for (const id of ids) {
    if (typeof id !== "string" || id.trim() === "") {
      throw new TypeError("visual publication Thread source returned an invalid Thread ID");
    }
  }
  ids.sort((left, right) => left.localeCompare(right));
  return ids;
}

function optionalWorkset(value) {
  if (value === null || value === undefined) return null;
  for (const method of ["listThreadIds", "complete", "retry", "deadLetter", "hasPending"]) {
    requireMethod("visual publication workset", value, method);
  }
  return value;
}

/**
 * Restart-safe World process that converges only Threads with active visual
 * publication work. Cloud runtime supplies a durable workset; local/legacy
 * composition may still supply a Thread source for compatibility.
 */
export function createThreadVisualPublicationProcess({
  workset = null,
  threadSource = null,
  reconciler,
  onResult = null,
  onError = null,
} = {}) {
  const queue = optionalWorkset(workset);
  const source = queue ?? requireMethod("threadSource", threadSource, "listThreadIds");
  requireMethod("reconciler", reconciler, "reconcileThread");
  if (onResult !== null && typeof onResult !== "function") {
    throw new TypeError("visual publication onResult must be a function or null");
  }
  if (onError !== null && typeof onError !== "function") {
    throw new TypeError("visual publication onError must be a function or null");
  }

  let running = false;
  return Object.freeze({
    get running() { return running; },

    async runOnce() {
      if (running) return Object.freeze({ skipped: true, reason: "already_running", results: [], hasPending:true });
      running = true;
      try {
        const threadIds = normalizeThreadIds(await source.listThreadIds());
        const results = [];
        for (const threadId of threadIds) {
          try {
            const reconciliation = await reconciler.reconcileThread({ threadId });
            const complete = reconciliation?.complete === true;
            if (queue !== null && complete) await queue.complete(threadId);
            const entry = Object.freeze({
              threadId,
              ok: true,
              reconciliation,
              disposition:complete ? "complete" : "retry",
            });
            results.push(entry);
            await onResult?.(entry);
          } catch (error) {
            const retryable = error?.retryable !== false;
            const entry = Object.freeze({
              threadId,
              ok: false,
              errorName: error?.constructor?.name ?? "Error",
              code: typeof error?.code === "string" && error.code !== ""
                ? error.code
                : "THREAD_VISUAL_PUBLICATION_FAILED",
              retryable,
              message: error?.message ?? String(error),
              disposition:retryable ? "retry" : "dead_letter",
            });
            if (queue !== null) {
              if (retryable) await queue.retry(threadId, entry);
              else await queue.deadLetter(threadId, entry);
            }
            results.push(entry);
            await onError?.(entry, error);
          }
        }
        const hasPending = queue === null ? false : await queue.hasPending();
        return Object.freeze({
          skipped: false,
          reason: null,
          results: Object.freeze(results),
          hasPending,
        });
      } finally {
        running = false;
      }
    },
  });
}
