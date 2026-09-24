import { publicInsideFibreAvailability } from "./inside-fibre-public-availability.mjs";

export const INSIDE_FIBRE_LIVED_SCENE_VERSION = "inside-fibre-lived-scene-v0.1";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function iso(name, value) {
  nonEmpty(name, value);
  if (Number.isNaN(Date.parse(value))) throw new TypeError(`${name} must be an ISO time`);
  return value;
}

function participants(value) {
  if (!Array.isArray(value)) throw new TypeError("Inside Fibre lived scene participants must be an array");
  const result = value.map((name, index) => nonEmpty(
    `Inside Fibre lived scene participants[${index}]`,
    name,
  ));
  return Object.freeze(result);
}

export function projectInsideFibreLivedScene({ present, availability }) {
  if (availability === null || availability === undefined) return null;
  if (!present || typeof present !== "object" || Array.isArray(present)) {
    throw new TypeError("Inside Fibre lived scene requires a public present");
  }

  const publicAvailability = publicInsideFibreAvailability(availability);
  const situationId = nonEmpty("Inside Fibre lived scene situationId", present.situationId);
  const establishedAt = iso("Inside Fibre lived scene establishedAt", present.establishedAt);
  if (!["at_place", "in_transit"].includes(present.phase)) {
    throw new TypeError("Inside Fibre lived scene phase is invalid");
  }
  if (!present.location || typeof present.location !== "object" || Array.isArray(present.location)) {
    throw new TypeError("Inside Fibre lived scene location is required");
  }
  const activity = nonEmpty("Inside Fibre lived scene activity", present.activity);
  const depictionMediaId = nonEmpty(
    "Inside Fibre lived scene depictionMediaId",
    present.depictionMediaId,
  );

  if (availability.situationId !== undefined && availability.situationId !== situationId) {
    throw new TypeError("Inside Fibre lived scene availability belongs to another situation");
  }
  const establishedMs = Date.parse(establishedAt);
  if (
    establishedMs < Date.parse(publicAvailability.startAt)
    || establishedMs >= Date.parse(publicAvailability.endAt)
  ) {
    throw new TypeError("Inside Fibre lived scene is outside the admitted visitor window");
  }

  return Object.freeze({
    sceneVersion: INSIDE_FIBRE_LIVED_SCENE_VERSION,
    situationId,
    establishedAt,
    phase: present.phase,
    location: structuredClone(present.location),
    activity,
    participants: participants(present.participants ?? []),
    depictionMediaId,
    encounterAvailability: Object.freeze({
      kind: "inside_fibre_visitor_availability",
      startAt: publicAvailability.startAt,
      endAt: publicAvailability.endAt,
    }),
  });
}
