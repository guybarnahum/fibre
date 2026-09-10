const PRESSURE_THRESHOLD = 0.6;
const ABRUPT_DELTA = 0.25;

function driveKey(drive) {
  return `${drive.family}|${drive.targetRef}|${drive.orientation}`;
}

function previousDriveMap(frame) {
  return new Map((frame?.drives ?? []).map((drive) => [driveKey(drive), drive]));
}

export function selectRegulationAttention(previousFrame, currentFrame) {
  if (!currentFrame || !Array.isArray(currentFrame.drives)) {
    throw new TypeError("current RegulationFrame with drives is required");
  }

  const previous = previousDriveMap(previousFrame);
  const candidates = [];

  for (const drive of currentFrame.drives) {
    const before = previous.get(driveKey(drive));
    const previousPressure = before?.pressure ?? 0;
    const delta = drive.pressure - previousPressure;
    let reason = null;

    if (drive.attained && !before?.attained) reason = "attainment";
    else if (drive.pressure >= PRESSURE_THRESHOLD && previousPressure < PRESSURE_THRESHOLD) reason = "threshold";
    else if (delta >= ABRUPT_DELTA && drive.pressure >= 0.4) reason = "abrupt_change";

    if (reason === null) continue;
    candidates.push({
      reason,
      asOf: currentFrame.asOf,
      family: drive.family,
      targetRef: drive.targetRef,
      orientation: drive.orientation,
      previousPressure,
      pressure: drive.pressure,
      delta: Math.round(delta * 1_000_000) / 1_000_000,
      urgency: drive.urgency,
      evidenceRefs: [...(drive.evidenceRefs ?? [])],
    });
  }

  candidates.sort((left, right) => {
    const priority = { attainment: 3, threshold: 2, abrupt_change: 1 };
    return priority[right.reason] - priority[left.reason] ||
      right.pressure - left.pressure ||
      right.delta - left.delta;
  });

  return candidates[0] ?? null;
}
