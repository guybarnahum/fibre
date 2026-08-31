import { createSqliteStateInfraDriver } from "../../../../infra/providers/local/sqlite-state.mjs";

export function localWorldStateStorage(databasePath, {
  stateScopeId = "world",
  driverId = "sqlite-world-test",
} = {}) {
  const infraDriver = createSqliteStateInfraDriver({
    driverId,
    scopes: { [stateScopeId]: databasePath },
  });
  return Object.freeze({ infraDriver, stateScopeId });
}
