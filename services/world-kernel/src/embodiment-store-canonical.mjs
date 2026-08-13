import { DatabaseSync } from "node:sqlite";
import { normalizeDatabasePath } from "./persistence-sqlite.mjs";
import {
  EmbodimentConflictError,
  EmbodimentNotFoundError,
  EmbodimentStore as GroundedEmbodimentStore,
} from "./embodiment-store-personhood-v2.mjs";

export { EmbodimentConflictError, EmbodimentNotFoundError };

function threadOriginEvent(databasePath, threadId) {
  const database = new DatabaseSync(normalizeDatabasePath(databasePath), {
    readOnly: true,
    enableForeignKeyConstraints: true,
  });
  try {
    const row = database.prepare(`
      SELECT event_id
      FROM thread_events
      WHERE thread_id=?
      ORDER BY sequence ASC
      LIMIT 1
    `).get(threadId);
    if (!row) throw new EmbodimentNotFoundError(`Thread ${threadId} has no durable origin event`);
    return row.event_id;
  } finally {
    database.close();
  }
}

export class EmbodimentStore {
  #databasePath;
  #inner;

  constructor(databasePath, options = {}) {
    this.#databasePath = databasePath;
    this.#inner = new GroundedEmbodimentStore(databasePath, options);
  }

  close() { return this.#inner.close(); }
  queryOnly() { return this.#inner.queryOnly(); }
  history(...args) { return this.#inner.history(...args); }
  listCurrent(...args) { return this.#inner.listCurrent(...args); }
  inspectThread(...args) { return this.#inner.inspectThread(...args); }
  recordRightsAuthority(...args) { return this.#inner.recordRightsAuthority(...args); }

  record(candidate) {
    if (candidate?.representationKind !== "synthetic_generation") {
      return this.#inner.record(candidate);
    }

    // De-novo synthetic embodiment has no historical source image/voice by definition.
    // Fibre binds it to the Thread's durable origin while the canonical specification
    // remains the truth authority for what is rendered. Caller-provided source labels
    // therefore cannot masquerade as captured evidence.
    return this.#inner.record({
      ...candidate,
      sourceReferences: [threadOriginEvent(this.#databasePath, candidate.threadId)],
    });
  }
}

export function openEmbodimentStore(databasePath) {
  return new EmbodimentStore(databasePath);
}

export function openEmbodimentInspectionStore(databasePath) {
  return new EmbodimentStore(databasePath, { readOnly: true });
}
