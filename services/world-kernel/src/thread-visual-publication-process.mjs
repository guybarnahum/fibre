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

/**
 * Restart-safe World process that repeatedly converges durable Threads through
 * canonical visual publication. It owns scheduling only; semantic progress is
 * derived by the reconciler from authoritative World and downstream state.
 */
export function createThreadVisualPublicationProcess({
  threadSource,
  reconciler,
  onResult = null,
  onError = null,
} = {}) {
  requireMethod("threadSource", threadSource, "listThreadIds");
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
      if (running) return Object.freeze({ skipped: true, reason: "already_running", results: [] });
      running = true;
      try {
        const threadIds = normalizeThreadIds(await threadSource.listThreadIds());
        const results = [];
        for (const threadId of threadIds) {
          try {
            const reconciliation = await reconciler.reconcileThread({ threadId });
            const entry = Object.freeze({ threadId, ok: true, reconciliation });
            results.push(entry);
            await onResult?.(entry);
          } catch (error) {
            const entry = Object.freeze({
              threadId,
              ok: false,
              errorName: error?.constructor?.name ?? "Error",
              message: error?.message ?? String(error),
            });
            results.push(entry);
            await onError?.(entry, error);
          }
        }
        return Object.freeze({ skipped: false, reason: null, results: Object.freeze(results) });
      } finally {
        running = false;
      }
    },
  });
}

export function startThreadVisualPublicationProcess({
  process,
  intervalMs = 5_000,
  runImmediately = true,
} = {}) {
  requireMethod("process", process, "runOnce");
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 100 || intervalMs > 3_600_000) {
    throw new TypeError("visual publication intervalMs must be an integer from 100 through 3600000");
  }
  let stopped = false;
  const run = () => {
    if (stopped) return;
    void process.runOnce();
  };
  if (runImmediately) run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return Object.freeze({
    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
    },
  });
}
