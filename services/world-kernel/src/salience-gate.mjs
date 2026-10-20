import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";

function observedEventInvolves(event, subjectRefs) {
  if (typeof event?.counterpartyThreadId === "string") {
    return subjectRefs.has(event.counterpartyThreadId);
  }
  if (Array.isArray(event?.counterpartyThreadIds)) {
    return event.counterpartyThreadIds.some((threadId) => subjectRefs.has(threadId));
  }
  return false;
}

export function evaluateSalience({ opportunity, situatedPercept, regulationFrame = null }) {
  assertPlainObject("salience opportunity", opportunity);
  assertNonEmpty("salience opportunity.kind", opportunity.kind);
  if (!Array.isArray(opportunity.subjectRefs) || opportunity.subjectRefs.length === 0) {
    throw new TypeError("salience opportunity.subjectRefs must not be empty");
  }
  const subjectRefs = new Set();
  for (const ref of opportunity.subjectRefs) {
    assertId("salience opportunity.subjectRef", ref);
    subjectRefs.add(ref);
  }
  if (subjectRefs.size !== opportunity.subjectRefs.length) {
    throw new TypeError("salience opportunity.subjectRefs must be unique");
  }

  assertPlainObject("salience Situated Percept", situatedPercept);
  assertId("salience Situated Percept.observerThreadId", situatedPercept.observerThreadId);
  assertPlainObject("salience Situated Percept.setting", situatedPercept.setting);
  if (regulationFrame !== null) {
    assertPlainObject("salience RegulationFrame", regulationFrame);
    if (!Array.isArray(regulationFrame.drives)) {
      throw new TypeError("salience RegulationFrame.drives must be an array");
    }
  }

  const anchors = [];
  const observableCues = opportunity.observableCues ?? [];
  if (!Array.isArray(observableCues)) {
    throw new TypeError("salience opportunity.observableCues must be an array");
  }
  for (const cue of observableCues) {
    if (cue !== "unexpected_observable") {
      throw new TypeError("salience opportunity.observableCues contains an unsupported cue");
    }
  }
  if (observableCues.includes("unexpected_observable")) {
    anchors.push("unexpected_observable");
  }

  if (situatedPercept.setting.mode === "mediated") {
    anchors.push("mediated_shared_context");
  }

  const participantRefs = new Set(situatedPercept.setting.participantRefs ?? []);
  if ([...subjectRefs].some((ref) => participantRefs.has(ref))) {
    anchors.push("planned_presence");
  }

  if ((situatedPercept.recentEvents ?? []).some((event) =>
    observedEventInvolves(event, subjectRefs))) {
    anchors.push("recent_observable_history");
  }

  const exploration = regulationFrame?.drives.find((drive) =>
    drive.family === "exploration" && drive.pressure > 0);
  if (exploration !== undefined) {
    anchors.push("exploration_pressure");
  }
  // Ordinary weak pressure is background, not a reason to spend social cognition.
  // Material Body interest earns consideration, never an obligation to approach.
  const socialContact = regulationFrame?.drives.find((drive) =>
    drive.family === "social_contact" && drive.orientation === "approach"
      && drive.pressure >= 0.4);
  if (socialContact !== undefined) {
    anchors.push("social_contact_pressure");
  }

  const regulationRefs = [
    ...(exploration?.evidenceRefs ?? []),
    ...(socialContact?.evidenceRefs ?? []),
  ];
  // Preserve the actual mechanical inputs even when cognition was skipped.
  // Null means unavailable; an empty drive list means no relevant drive was present.
  const bodyAtGate=regulationFrame===null?null:Object.freeze({
    asOf:regulationFrame.asOf??null,
    drives:Object.freeze(regulationFrame.drives
      .filter(drive=>["social_contact","exploration"].includes(drive.family))
      .map(drive=>Object.freeze({
        family:drive.family,orientation:drive.orientation,
        pressure:drive.pressure,
        evidenceRefs:Object.freeze([...(drive.evidenceRefs??[])]),
      }))),
  });
  return Object.freeze({
    outcome:anchors.length === 0 ? "background" : "salient",
    opportunityKind:opportunity.kind,
    subjectRefs:Object.freeze([...subjectRefs]),
    anchors:Object.freeze(anchors),
    bodyAtGate,
    sourceReferences:Object.freeze([
      ...new Set([...(situatedPercept.sourceReferences ?? []), ...regulationRefs]),
    ]),
  });
}
