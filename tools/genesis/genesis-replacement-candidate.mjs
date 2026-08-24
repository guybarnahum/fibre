// Compatibility import surface for the PR39 development branch.
// Current Genesis candidate compilation lives in genesis-life-candidate.mjs.
export {
  GENESIS_LIFE_CANDIDATE_VERSION as GENESIS_REPLACEMENT_CANDIDATE_VERSION,
  generateGenesisLifeCandidate as generateReplacementThreadCandidate,
} from "./genesis-life-candidate.mjs";
