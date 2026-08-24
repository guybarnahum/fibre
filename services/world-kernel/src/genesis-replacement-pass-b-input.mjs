// Compatibility import surface for the PR39 development branch.
// Current Genesis behavior lives in genesis-life-pass-b-input.mjs.
export {
  GENESIS_LIFE_GENOME_EXPOSURE_POLICY as GENESIS_REPLACEMENT_GENOME_EXPOSURE_POLICY,
  buildGenesisPassBInput as buildReplacementPassBInput,
} from "./genesis-life-pass-b-input.mjs";
