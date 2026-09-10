function placeText(location) {
  if (!location) return "No current location";
  if (location.kind === "place") return location.placeRef;
  return `${location.fromPlaceRef} → ${location.toPlaceRef} (${Math.round(location.progress * 100)}%)`;
}

function nextStop(plan, asOf) {
  if (!plan || !asOf) return null;
  const instant = Date.parse(asOf);
  return plan.stops.find((stop) => Date.parse(stop.startAt) > instant) ?? null;
}

export function explainCurrentLife(currentLife) {
  if (!currentLife?.now) {
    return {
      eyebrow: "Lived now",
      title: "No current lived situation",
      summary: "World has not yet recorded a current situation for this Thread.",
      facts: [],
      notes: [],
    };
  }

  const now = currentLife.now;
  const personal = currentLife.planVsLived?.personal ?? null;
  const care = currentLife.planVsLived?.careRequirement ?? null;
  const next = nextStop(currentLife.flightPlan, currentLife.asOf);
  const semantic = currentLife.semanticStates ?? [];

  return {
    eyebrow: "Lived now",
    title: now.activity,
    summary: care
      ? `World-observed life is ${personal?.status ?? "unclassified"} relative to the Thread's own Flight Plan while a caregiver requirement is ${care.status}.`
      : `World-observed life is ${personal?.status ?? "unclassified"} relative to the Thread's own Flight Plan.`,
    facts: [
      { label: "Presence", value: placeText(now.location) },
      { label: "Mediated", value: now.mediatedContext ?? "No" },
      { label: "Why now", value: now.reason },
      { label: "Personal plan", value: personal?.status ?? "No active plan" },
      { label: "Care", value: care ? `${care.status} · ${care.authority.constraint}` : "No active care constraint" },
      { label: "Current semantic state", value: semantic.map((state) => `${state.dimension}: ${state.state}`).join(" · ") || "None" },
    ],
    notes: [
      ...(next ? [`Next intended presence: ${next.startAt} · ${next.activity}`] : []),
      ...(now.resolution.observedDivergence ? ["Observed life currently differs from the governing plan."] : []),
      ...(currentLife.organismTrace ? ["A causal organism trace is available for this moment."] : []),
    ],
  };
}
