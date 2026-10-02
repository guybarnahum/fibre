const watchers = new Map();

function stateFor(key) {
  let entries = watchers.get(key);
  if (!entries) {
    entries = new Set();
    watchers.set(key, entries);
  }
  return entries;
}

async function run(entry) {
  if (entry.running) return;
  entry.running = true;
  try {
    while (entry.pending !== null) {
      const detail = entry.pending;
      entry.pending = null;
      await entry.callback(detail);
    }
  } finally {
    entry.running = false;
  }
}

export function watchViewInvalidation(key, callback) {
  if (typeof key !== "string" || key === "") throw new TypeError("view invalidation key is required");
  if (typeof callback !== "function") throw new TypeError("view invalidation callback is required");

  const entry = { callback, running:false, pending:null };
  stateFor(key).add(entry);
  return () => {
    const entries = watchers.get(key);
    if (!entries) return;
    entries.delete(entry);
    if (entries.size === 0) watchers.delete(key);
  };
}

export function invalidateView(key, detail = {}) {
  const entries = watchers.get(key);
  if (!entries) return;
  for (const entry of entries) {
    entry.pending = detail;
    void run(entry);
  }
}

export function threadViewKey(threadId, aspect) {
  if (typeof threadId !== "string" || threadId === "") throw new TypeError("threadId is required");
  if (typeof aspect !== "string" || aspect === "") throw new TypeError("view aspect is required");
  return `thread:${threadId}:${aspect}`;
}

export function threadPopulationViewKey() {
  return "threads:population";
}

export function threadObservatoryViewKey(threadId) {
  if (typeof threadId !== "string" || threadId === "") throw new TypeError("threadId is required");
  return `thread:${threadId}:observatory`;
}

export function appearanceExperimentsViewKey() {
  return "appearance:experiments";
}
