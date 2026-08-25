#!/usr/bin/env node

import { SymbolicGenomeStore } from "#services/world-kernel/src/symbolic-genome-store.mjs";

const [databasePath, genomeId] = process.argv.slice(2);
if (!databasePath || !genomeId) {
  console.error("usage: node tools/inspect-symbolic-genome.mjs <world.sqlite> <genomeId>");
  process.exitCode = 2;
} else {
  const store = new SymbolicGenomeStore(databasePath, { readOnly: true });
  try {
    console.log(JSON.stringify(store.inspectGenome(genomeId), null, 2));
  } finally {
    store.close();
  }
}
