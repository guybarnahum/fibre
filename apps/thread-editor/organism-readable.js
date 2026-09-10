function dominantDrive(trace) {
  const drives = trace?.regulation?.drives ?? [];
  return [...drives].sort((left, right) => right.pressure - left.pressure)[0] ?? null;
}

function percent(value) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "—";
}

export function explainOrganismTrace(trace) {
  if (trace === null || trace === undefined) {
    return {
      eyebrow: "Organism causality",
      title: "No consequential regulation cycle projected",
      summary: "The Editor has no organism trace for this moment. Ordinary low-level regulation may still exist without having earned cognition.",
      facts: [],
      notes: [],
    };
  }

  const drive = dominantDrive(trace);
  const semantic = trace.semanticStates ?? [];
  const presence = trace.nextPresence;
  const attention = trace.attention;

  return {
    eyebrow: "Organism causality",
    title: attention
      ? `${attention.family} regulation reached attention`
      : "Regulation did not request attention",
    summary: semantic.length
      ? `Low-level regulation reached cognition; the Thread authored ${semantic.length} semantic state${semantic.length === 1 ? "" : "s"}${presence ? " and changed what presence it wanted next" : ""}.`
      : "Low-level regulation reached cognition without forcing a named semantic feeling or need.",
    facts: [
      { label: "Species", value: trace.species ?? "—" },
      { label: "Attention reason", value: attention?.reason ?? "—" },
      { label: "Strongest drive", value: drive?.family ?? "—" },
      { label: "Drive pressure", value: percent(drive?.pressure) },
      { label: "Semantic result", value: semantic.map((state) => `${state.domain}: ${state.dimension}`).join(", ") || "None" },
      { label: "Next presence", value: presence ? `${presence.relation} ${presence.targetRef}` : "None" },
    ],
    notes: [
      "Regulation is control state, not a named emotion.",
      "Semantic state is authored by Thread cognition after interoception.",
      "The next presence target is a desire, not proof that the World has enacted it.",
    ],
  };
}
