import { characterizeGenesisMemoryMeaning } from "../services/world-kernel/src/genesis-memory-meaning-characterization.mjs";

export function characterizeN2MemoryMeaning(artifact) {
  if (artifact === null || typeof artifact !== "object" || Array.isArray(artifact)) throw new TypeError("N2 characterization artifact must be an object");
  if (artifact.evidenceVersion !== "pr39-slice-e2-n2-v1" || artifact.protocolVersion !== "pr39-slice-e2-n2-memory-formation-v1") {
    throw new TypeError("N2 characterization artifact version mismatch");
  }
  if (artifact.status !== "complete") throw new TypeError("N2 characterization requires complete evidence");
  if (!Array.isArray(artifact.completedTrials)) throw new TypeError("N2 characterization artifact lacks completedTrials");

  return characterizeGenesisMemoryMeaning({
    records: artifact.completedTrials.map((trial) => ({
      formationRef: `n2_trial_${String(trial.trialOrdinal).padStart(3, "0")}`,
      visibleEpisodeCount: trial.horizon,
      memoryOutcome: trial.passB?.output?.outcome,
      citedEpisodeRefs: trial.passB?.output?.episodeRefs ?? [],
      meaningOutcome: trial.passC?.output?.outcome ?? null,
    })),
  });
}
