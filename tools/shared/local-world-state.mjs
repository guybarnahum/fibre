import { createSqliteStateInfraDriver } from "#infra/providers/local/sqlite-state";

export function localWorldStateStorage(databasePath, {
  stateScopeId = "world",
  driverId = "sqlite-world-tool",
} = {}) {
  const infraDriver = createSqliteStateInfraDriver({
    driverId,
    scopes: { [stateScopeId]: databasePath },
  });
  return Object.freeze({ infraDriver, stateScopeId });
}
