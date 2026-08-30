import { DatabaseSync } from "node:sqlite";

import {
  FIBRE_WORLD_STATE_REQUIREMENTS,
  requireInfraCapabilities,
  requireTransactionalStateGuarantees,
} from "#infra";
import { assertNonEmpty } from "./persistence-common.mjs";
import { normalizeDatabasePath } from "./persistence-sqlite.mjs";

export function openWorldStateDatabase(storage, {
  readOnly = false,
  storeName = "World state store",
} = {}) {
  if (typeof storage === "string") {
    assertNonEmpty("databasePath", storage);
    const database = new DatabaseSync(normalizeDatabasePath(storage), {
      readOnly,
      enableForeignKeyConstraints: true,
    });
    if (readOnly) {
      database.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=5000;");
    } else {
      database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
    }
    return database;
  }

  if (storage === null || typeof storage !== "object" || Array.isArray(storage)) {
    throw new TypeError(`${storeName} storage must be a database path or Infra state binding`);
  }

  const { infraDriver, stateScopeId } = storage;
  const infra = requireInfraCapabilities(infraDriver, "state");
  requireTransactionalStateGuarantees(
    infra.state,
    stateScopeId,
    FIBRE_WORLD_STATE_REQUIREMENTS,
  );
  return infra.state.open(stateScopeId, { readOnly });
}
