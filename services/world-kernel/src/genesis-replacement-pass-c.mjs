// Compatibility import surface for the PR39 development branch.
// Current Genesis behavior lives in genesis-life-pass-c.mjs.
export {
  generateGenesisInitialMeaning as generateReplacementInitialMeaning,
  generateGenesisReinterpretation as generateReplacementReinterpretation,
} from "./genesis-life-pass-c.mjs";
