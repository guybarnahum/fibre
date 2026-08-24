// Current Genesis candidate surface. The implementation is temporarily delegated
// to the proven PR39 compiler while internal replacement-era module names are
// folded away after the currentization verification cycle.
export {
  generateReplacementThreadCandidate as generateGenesisLifeCandidate,
} from "./genesis-replacement-candidate.mjs";
