const ORIENTATIONS = new Set(["approach", "avoid", "maintain"]);
const PRESENCE_RELATIONS = new Set([
  "at",
  "with",
  "near",
  "away_from",
  "connected_to",
  "available_for",
]);

const DEFAULT_SENSITIVITY = Object.freeze({
  thermal: 1,
  energy: 1,
  rest: 1,
  sensory: 1,
  presence: 1,
});

export const THREAD_SPECIES_PROFILE = Object.freeze({
  species: "thread",
  thermalComfortC: Object.freeze([18, 27]),
  thermalShoulderC: 10,
  energyFloor: 0.45,
  fatigueThreshold: 0.65,
  sensoryComfort: Object.freeze({
    soundLoad: 0.65,
    crowding: 0.75,
    lightMin: 0.08,
    lightMax: 0.95,
    opennessMin: 0.08,
  }),
  sensitivityEnvelope: Object.freeze([0.85, 1.15]),
});

const BASELINE_KEYS = Object.freeze({
  regulatorThermalSensitivity: "thermal",
  regulatorEnergySensitivity: "energy",
  regulatorRestSensitivity: "rest",
  regulatorSensorySensitivity: "sensory",
  regulatorPresenceSensitivity: "presence",
});

function plainObject(name, value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function finite(name, value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}

function unit(name, value) {
  finite(name, value);
  if (value < 0 || value > 1) throw new TypeError(`${name} must be between 0 and 1`);
  return value;
}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function isoTimestamp(name, value) {
  nonEmpty(name, value);
  if (Number.isNaN(Date.parse(value))) throw new TypeError(`${name} must be an ISO timestamp`);
  return value;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function round(value) {
  return Math.round(clamp01(value) * 1_000_000) / 1_000_000;
}

function excess(value, comfort) {
  if (value <= comfort) return 0;
  return (value - comfort) / Math.max(0.000001, 1 - comfort);
}

function outsideBand(value, low, high, shoulder) {
  if (value < low) return clamp01((low - value) / shoulder);
  if (value > high) return clamp01((value - high) / shoulder);
  return 0;
}

function normalizeEnvironment(value) {
  plainObject("perceptFrame.environment", value);
  const temperatureC = finite("perceptFrame.environment.temperatureC", value.temperatureC);
  const lightLevel = unit("perceptFrame.environment.lightLevel", value.lightLevel);
  const soundLoad = unit("perceptFrame.environment.soundLoad", value.soundLoad);
  const crowding = unit("perceptFrame.environment.crowding", value.crowding);
  const openness = unit("perceptFrame.environment.openness", value.openness);
  return { temperatureC, lightLevel, soundLoad, crowding, openness };
}

function normalizeInternal(value) {
  plainObject("perceptFrame.internal", value);
  return {
    energy: unit("perceptFrame.internal.energy", value.energy),
    fatigue: unit("perceptFrame.internal.fatigue", value.fatigue),
  };
}

export function normalizePerceptFrame(value) {
  plainObject("perceptFrame", value);
  return {
    asOf: isoTimestamp("perceptFrame.asOf", value.asOf),
    internal: normalizeInternal(value.internal),
    environment: normalizeEnvironment(value.environment),
    evidenceRefs: normalizeRefs("perceptFrame.evidenceRefs", value.evidenceRefs),
  };
}

function normalizeRefs(name, value) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  const refs = value.map((item, index) => nonEmpty(`${name}[${index}]`, item));
  if (new Set(refs).size !== refs.length) throw new TypeError(`${name} must contain unique values`);
  return refs;
}

export function threadRegulatorProfile(runtimeBaselines = {}) {
  plainObject("runtimeBaselines", runtimeBaselines);
  const sensitivity = { ...DEFAULT_SENSITIVITY };
  const [minimum, maximum] = THREAD_SPECIES_PROFILE.sensitivityEnvelope;

  for (const [baselineKey, regulatorKey] of Object.entries(BASELINE_KEYS)) {
    if (!(baselineKey in runtimeBaselines)) continue;
    const value = finite(`runtimeBaselines.${baselineKey}`, runtimeBaselines[baselineKey]);
    if (value < minimum || value > maximum) {
      throw new TypeError(
        `runtimeBaselines.${baselineKey} must remain within the Thread species envelope ${minimum}-${maximum}`,
      );
    }
    sensitivity[regulatorKey] = value;
  }

  return {
    species: THREAD_SPECIES_PROFILE.species,
    sensitivity,
  };
}

function normalizeTarget(value, index) {
  const name = `targets[${index}]`;
  plainObject(name, value);
  const orientation = nonEmpty(`${name}.orientation`, value.orientation);
  if (!ORIENTATIONS.has(orientation)) throw new TypeError(`${name}.orientation is invalid`);
  const relation = nonEmpty(`${name}.relation`, value.relation);
  if (!PRESENCE_RELATIONS.has(relation)) throw new TypeError(`${name}.relation is invalid`);

  return {
    targetId: nonEmpty(`${name}.targetId`, value.targetId),
    family: "presence",
    targetRef: nonEmpty(`${name}.targetRef`, value.targetRef),
    relation,
    orientation,
    actualSatisfaction: unit(`${name}.actualSatisfaction`, value.actualSatisfaction),
    expectedSatisfaction: unit(`${name}.expectedSatisfaction`, value.expectedSatisfaction),
    predictedSatisfaction: unit(`${name}.predictedSatisfaction`, value.predictedSatisfaction),
    urgency: unit(`${name}.urgency`, value.urgency),
    evidenceRefs: normalizeRefs(`${name}.evidenceRefs`, value.evidenceRefs),
  };
}

function drive({ family, targetRef, orientation, pressure, urgency, progressError = 0, predictionError = 0, attained = false, evidenceRefs }) {
  return {
    family,
    targetRef,
    orientation,
    pressure: round(pressure),
    urgency: round(urgency),
    progressError: Math.round(Math.max(-1, Math.min(1, progressError)) * 1_000_000) / 1_000_000,
    predictionError: Math.round(Math.max(-1, Math.min(1, predictionError)) * 1_000_000) / 1_000_000,
    attained,
    evidenceRefs: [...evidenceRefs],
  };
}

function basalDrives(percept, profile) {
  const species = THREAD_SPECIES_PROFILE;
  const { environment, internal, evidenceRefs } = percept;

  const thermalPressure = outsideBand(
    environment.temperatureC,
    species.thermalComfortC[0],
    species.thermalComfortC[1],
    species.thermalShoulderC,
  ) * profile.sensitivity.thermal;

  const energyPressure = internal.energy >= species.energyFloor
    ? 0
    : ((species.energyFloor - internal.energy) / species.energyFloor) * profile.sensitivity.energy;

  const restPressure = internal.fatigue <= species.fatigueThreshold
    ? 0
    : ((internal.fatigue - species.fatigueThreshold) / (1 - species.fatigueThreshold)) * profile.sensitivity.rest;

  const comfort = species.sensoryComfort;
  const lightPressure = environment.lightLevel < comfort.lightMin
    ? (comfort.lightMin - environment.lightLevel) / comfort.lightMin
    : environment.lightLevel > comfort.lightMax
      ? (environment.lightLevel - comfort.lightMax) / (1 - comfort.lightMax)
      : 0;
  const enclosurePressure = environment.openness < comfort.opennessMin
    ? (comfort.opennessMin - environment.openness) / comfort.opennessMin
    : 0;
  const sensoryPressure = Math.max(
    excess(environment.soundLoad, comfort.soundLoad),
    excess(environment.crowding, comfort.crowding),
    clamp01(lightPressure),
    clamp01(enclosurePressure),
  ) * profile.sensitivity.sensory;

  return [
    drive({
      family: "thermal_comfort",
      targetRef: "self:thermal-comfort",
      orientation: "maintain",
      pressure: thermalPressure,
      urgency: thermalPressure,
      evidenceRefs,
    }),
    drive({
      family: "energy",
      targetRef: "self:energy",
      orientation: "maintain",
      pressure: energyPressure,
      urgency: energyPressure,
      evidenceRefs,
    }),
    drive({
      family: "rest",
      targetRef: "self:recovery",
      orientation: "maintain",
      pressure: restPressure,
      urgency: restPressure,
      evidenceRefs,
    }),
    drive({
      family: "sensory_load",
      targetRef: "environment:sensory-load",
      orientation: "avoid",
      pressure: sensoryPressure,
      urgency: sensoryPressure,
      evidenceRefs,
    }),
  ];
}

function presenceDrive(target, profile) {
  const currentGap = 1 - target.actualSatisfaction;
  const futureGap = 1 - target.predictedSatisfaction;
  const progressError = target.actualSatisfaction - target.expectedSatisfaction;
  const predictionError = target.predictedSatisfaction - 1;
  const behindPenalty = Math.max(0, -progressError);
  const urgencyWeight = 0.5 + (0.5 * target.urgency);
  const pressure = (
    (0.4 * currentGap) +
    (0.4 * futureGap) +
    (0.2 * behindPenalty)
  ) * urgencyWeight * profile.sensitivity.presence;

  return drive({
    family: target.family,
    targetRef: target.targetRef,
    orientation: target.orientation,
    pressure,
    urgency: target.urgency,
    progressError,
    predictionError,
    attained: target.actualSatisfaction >= 0.95,
    evidenceRefs: target.evidenceRefs,
  });
}

export function evaluateIntrinsicRegulation({ perceptFrame, targets = [], runtimeBaselines = {} }) {
  const percept = normalizePerceptFrame(perceptFrame);
  if (!Array.isArray(targets)) throw new TypeError("targets must be an array");
  const normalizedTargets = targets.map(normalizeTarget);
  if (new Set(normalizedTargets.map((target) => target.targetId)).size !== normalizedTargets.length) {
    throw new TypeError("targets must have unique targetId values");
  }

  const profile = threadRegulatorProfile(runtimeBaselines);
  const drives = [
    ...basalDrives(percept, profile),
    ...normalizedTargets.map((target) => presenceDrive(target, profile)),
  ];

  const active = drives.filter((item) => item.pressure > 0);
  const maxPressure = active.reduce((maximum, item) => Math.max(maximum, item.pressure), 0);
  const approachPull = drives
    .filter((item) => item.orientation === "approach")
    .reduce((maximum, item) => Math.max(maximum, item.pressure), 0);
  const avoidancePush = drives
    .filter((item) => item.orientation === "avoid")
    .reduce((maximum, item) => Math.max(maximum, item.pressure), 0);
  const attainment = drives.some((item) => item.attained) ? 1 : 0;
  const sensoryLoad = drives.find((item) => item.family === "sensory_load")?.pressure ?? 0;

  return {
    asOf: percept.asOf,
    species: profile.species,
    drives,
    intrinsicAffect: {
      activation: round(maxPressure),
      sensoryLoad: round(sensoryLoad),
      approachPull: round(approachPull),
      avoidancePush: round(avoidancePush),
      attainment,
    },
  };
}
