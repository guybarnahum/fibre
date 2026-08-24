// Compatibility import surface for the PR39 development branch.
// Current Genesis behavior lives in genesis-life-pass-b.mjs.
export {
  GENESIS_LIFE_SPARSE_HISTORY_NOTICE as GENESIS_REPLACEMENT_SPARSE_HISTORY_NOTICE,
  GENESIS_LIFE_PASS_B_HORIZONS as GENESIS_REPLACEMENT_PASS_B_HORIZONS,
  GENESIS_LIFE_PASS_B_FORMATION_MODES as GENESIS_REPLACEMENT_PASS_B_FORMATION_MODES,
  GENESIS_LIFE_PASS_B_PROMPT as GENESIS_REPLACEMENT_PASS_B_PROMPT,
  GENESIS_LIFE_PASS_B_GENOME_COPY_RETRY_PROMPT as GENESIS_REPLACEMENT_PASS_B_GENOME_COPY_RETRY_PROMPT,
  assertGenesisLifePassBSchedule as assertReplacementPassBSchedule,
  generateGenesisPassBMemory as generateReplacementPassBMemory,
} from "./genesis-life-pass-b.mjs";
