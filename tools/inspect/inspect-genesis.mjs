#!/usr/bin/env node

import { GenesisStore } from "#services/world-kernel/src/genesis-store.mjs";
import { localWorldStateStorage } from "#tools/shared/local-world-state.mjs";

const [databasePath, genesisId] = process.argv.slice(2);
if (!databasePath || !genesisId) {
  console.error("usage: node tools/inspect-genesis.mjs <world.sqlite> <genesisId>");
  process.exitCode = 2;
} else {
  const store = new GenesisStore(localWorldStateStorage(databasePath), { readOnly: true });
  try {
    console.log(JSON.stringify(store.inspectGenesis(genesisId), null, 2));
  } finally {
    store.close();
  }
}
