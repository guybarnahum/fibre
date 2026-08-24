// Compatibility import surface for the PR39 development branch.
// Current Genesis behavior lives in genesis-life-pass-a.mjs.
export {
  GENESIS_LIFE_PASS_A_PROMPT as GENESIS_REPLACEMENT_PASS_A_PROMPT,
  GENESIS_LIFE_PASS_A_RETRY_PROMPT as GENESIS_REPLACEMENT_PASS_A_RETRY_PROMPT,
  GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT as GENESIS_REPLACEMENT_PASS_A_FORM_REPAIR_PROMPT,
  buildGenesisLifePassACognitionInput as buildReplacementPassACognitionInput,
  generateGenesisHistoricalEpisode as generateReplacementHistoricalEpisode,
} from "./genesis-life-pass-a.mjs";
