import {installWorldSchemas} from "../../src/world-schema-installation.mjs";
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

export function installedWorldStateStorage(databasePath,options={}){
  const storage=localWorldStateStorage(databasePath,options);
  installWorldSchemas(storage);
  return Object.freeze({...storage,schemaReady:true});
}
