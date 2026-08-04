#!/usr/bin/env node

import {
  loadContextManifest,
  writeContextPacks,
} from "./context-pack-lib.mjs";

try {
  const manifest = loadContextManifest();
  const outputs = writeContextPacks(manifest);
  for (const output of outputs) console.log(`Wrote ${output}`);
} catch (error) {
  console.error(`Context pack generation failed: ${error.message}`);
  process.exitCode = 1;
}
