import {URGE_FAMILY_BY_NAME,SPECIES_STANDARD_ORIENTATION} from "./inherited-urges.mjs";
import {normalizeOrganismPolicy,organismPolicyDigest,legacySensitivity} from "./organism-policy.mjs";
const ORIENTATIONS = new Set(["approach", "avoid", "maintain"]);
const TARGET_KINDS = new Set(["place", "entity", "mediated", "activity", "obligation"]);
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
  social: 1,
  exploration: 1,
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
  explorationNoveltyFloor: 0.35,
  sensitivityEnvelope: Object.freeze([0.85, 1.15]),
});

const BASELINE_KEYS = Object.freeze({
  regulatorThermalSensitivity: "thermal",
  regulatorEnergySensitivity: "energy",
  regulatorRestSensitivity: "rest",
  regulatorSensorySensitivity: "sensory",
  regulatorPresenceSensitivity: "presence",
  regulatorSocialSensitivity: "social",
  regulatorExplorationSensitivity: "exploration",
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

function roundSigned(value) {
  return Math.round(Math.max(-1, Math.min(1, value)) * 1_000_000) / 1_000_000;
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

function normalizeRefs(name, value) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  const refs = value.map((item, index) => nonEmpty(`${name}[${index}]`, item));
  if (new Set(refs).size !== refs.length) throw new TypeError(`${name} must contain unique values`);
  return refs;
}

function optionalFinite(name, value) {
  return value === undefined ? undefined : finite(name, value);
}

function optionalUnit(name, value) {
  return value === undefined ? undefined : unit(name, value);
}

function normalizeEnvironment(value = {}) {
  plainObject("perceptFrame.environment", value);
  return {
    temperatureC: optionalFinite("perceptFrame.environment.temperatureC", value.temperatureC),
    lightLevel: optionalUnit("perceptFrame.environment.lightLevel", value.lightLevel),
    soundLoad: optionalUnit("perceptFrame.environment.soundLoad", value.soundLoad),
    crowding: optionalUnit("perceptFrame.environment.crowding", value.crowding),
    openness: optionalUnit("perceptFrame.environment.openness", value.openness),
  };
}

function normalizeInternal(value = {}) {
  plainObject("perceptFrame.internal", value);
  return {
    energy: optionalUnit("perceptFrame.internal.energy", value.energy),
    fatigue: optionalUnit("perceptFrame.internal.fatigue", value.fatigue),
  };
}

function normalizeExploration(value = {}) {
  plainObject("perceptFrame.exploration", value);
  return {
    novelty: optionalUnit("perceptFrame.exploration.novelty", value.novelty),
  };
}


function normalizeUrgeAvailability(value={}){
  plainObject("perceptFrame.urgeAvailability",value);
  for(const [family,orientations] of Object.entries(value)){
    if(!URGE_FAMILY_BY_NAME.has(family))throw new TypeError("unknown urge availability family");
    plainObject("urge availability family",orientations);
    for(const [orientation,item] of Object.entries(orientations)){
      if(!URGE_FAMILY_BY_NAME.get(family).orientations.includes(orientation)
        ||!item||!["available","absent","unknown"].includes(item.state))
        throw new TypeError("urge availability evidence is invalid");
      normalizeRefs("urge availability evidenceRefs",item.evidenceRefs??[]);
      if(item.state!=="unknown"&&(!item.evidenceRefs||item.evidenceRefs.length===0))
        throw new TypeError("known availability needs evidence");
    }
  }
  return value;
}

function normalizeUrgeTriggers(value=[]){
  if(!Array.isArray(value))throw new TypeError("urge triggers must be an array");
  return value.map(item=>{
    const family=URGE_FAMILY_BY_NAME.get(item?.family);
    if(family?.kind!=="triggered"||!family.orientations.includes(item.kind))
      throw new TypeError("urge trigger family/kind invalid");
    const pressure=unit("urge trigger pressure",item.pressure);
    const evidenceRefs=normalizeRefs("urge trigger evidenceRefs",item.evidenceRefs);
    if(evidenceRefs.length===0)throw new TypeError("urge trigger must cite admitted evidence");
    return {family:item.family,kind:item.kind,pressure,evidenceRefs};
  });
}

function feltUrges({drives,policy,urgeProjection,previousUrges=[],asOf}){
  const projection=new Map((urgeProjection??[]).map(item=>[item.family,item]));
  const elapsed=(at,since)=>Math.max(0,(Date.parse(at)-Date.parse(since))/1000);
  return drives.map(item=>{
    if(!URGE_FAMILY_BY_NAME.has(item.family))return item;
    const family=URGE_FAMILY_BY_NAME.get(item.family);
    const gene=projection.get(item.family)??null;
    const inherited=gene!==null&&policy.inheritedSpread!==0;
    const triggerKind=item.triggerKind??null;
    const matched=inherited&&(family.kind==="directional"||gene.orientation===triggerKind);
    const position=matched?gene.positions:null;
    const gain=position===null?1:2**(position.gain*policy.inheritedSpread);
    const threshold=Math.min(.85,Math.max(.10,.35-(position?.feltThreshold??0)*.15*policy.inheritedSpread));
    const halfLife=3600*(2**((position?.persistence??0)*policy.inheritedSpread));
    const previous=previousUrges.find(w=>w.family===item.family
      &&(w.triggerKind??null)===triggerKind
      &&w.targetRef===item.targetRef
      &&w.asOf&&Date.parse(w.asOf)<=Date.parse(asOf)
      &&w.partiallySatisfied===true
      &&Number.isFinite(w.pressure)
      &&Array.isArray(w.evidenceRefs)&&w.evidenceRefs.length>0)??null;
    const residual=previous===null?0:previous.pressure*2**(-elapsed(asOf,previous.asOf)/halfLife);
    const pressure=round(Math.max(item.pressure*gain,residual));
    const direction=family.kind==="triggered"?(matched?gene.orientation:"all"):
      inherited?gene.orientation:SPECIES_STANDARD_ORIENTATION[item.family];
    return {...item,pressure,urgency:Math.max(item.urgency,pressure),
      inheritedDirection:direction,
      targetAvailability:family.kind==="directional"?"unknown":"available",
      felt:pressure>=threshold,
    };
  });
}

function normalizeContact(value) {
  if (value === undefined) return null; // Unknown is not social deprivation.
  plainObject("perceptFrame.contact", value);
  const hours=finite("perceptFrame.contact.observedUnmetHours", value.observedUnmetHours);
  if(hours<0||hours>96)throw new TypeError("contact observedUnmetHours must be 0-96");
  return {
    observedUnmetHours:hours,
    evidenceRefs:normalizeRefs("perceptFrame.contact.evidenceRefs",value.evidenceRefs),
  };
}

function normalizeSocialCue(value, index) {
  const name = `perceptFrame.social[${index}]`;
  plainObject(name, value);
  return {
    entityRef: nonEmpty(`${name}.entityRef`, value.entityRef),
    proximity: unit(`${name}.proximity`, value.proximity),
    familiarity: unit(`${name}.familiarity`, value.familiarity),
    laughter: unit(`${name}.laughter`, value.laughter ?? 0),
    crying: unit(`${name}.crying`, value.crying ?? 0),
    agitation: unit(`${name}.agitation`, value.agitation ?? 0),
    calm: unit(`${name}.calm`, value.calm ?? 0),
    contact: unit(`${name}.contact`, value.contact ?? 0),
    evidenceRefs: normalizeRefs(`${name}.evidenceRefs`, value.evidenceRefs ?? []),
  };
}

export function normalizePerceptFrame(value) {
  plainObject("perceptFrame", value);
  const social = value.social ?? [];
  if (!Array.isArray(social)) throw new TypeError("perceptFrame.social must be an array");
  return {
    asOf: isoTimestamp("perceptFrame.asOf", value.asOf),
    internal: normalizeInternal(value.internal ?? {}),
    environment: normalizeEnvironment(value.environment ?? {}),
    exploration: normalizeExploration(value.exploration ?? {}),
    contact: normalizeContact(value.contact),
    urgeAvailability:normalizeUrgeAvailability(value.urgeAvailability??{}),
    urgeTriggers:normalizeUrgeTriggers(value.urgeTriggers??[]),
    social: social.map(normalizeSocialCue),
    evidenceRefs: normalizeRefs("perceptFrame.evidenceRefs", value.evidenceRefs),
  };
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

  return { species: THREAD_SPECIES_PROFILE.species, sensitivity };
}

function normalizeTarget(value, index) {
  const name = `targets[${index}]`;
  plainObject(name, value);
  const targetKind = nonEmpty(`${name}.targetKind`, value.targetKind);
  if (!TARGET_KINDS.has(targetKind)) throw new TypeError(`${name}.targetKind is invalid`);
  const orientation = nonEmpty(`${name}.orientation`, value.orientation);
  if (!ORIENTATIONS.has(orientation)) throw new TypeError(`${name}.orientation is invalid`);
  const relation = nonEmpty(`${name}.relation`, value.relation);
  if (!PRESENCE_RELATIONS.has(relation)) throw new TypeError(`${name}.relation is invalid`);

  const actualSatisfaction = value.actualSatisfaction === undefined || value.actualSatisfaction === null
    ? null
    : unit(`${name}.actualSatisfaction`, value.actualSatisfaction);
  if (actualSatisfaction === null && targetKind !== "entity") {
    throw new TypeError(`${name}.actualSatisfaction is required unless presence is sensed from an entity`);
  }
  const predictedSatisfaction = value.predictedSatisfaction === undefined || value.predictedSatisfaction === null
    ? null
    : unit(`${name}.predictedSatisfaction`, value.predictedSatisfaction);

  return {
    targetId: nonEmpty(`${name}.targetId`, value.targetId),
    family: "presence",
    targetKind,
    targetRef: nonEmpty(`${name}.targetRef`, value.targetRef),
    relation,
    orientation,
    actualSatisfaction,
    expectedSatisfaction: unit(`${name}.expectedSatisfaction`, value.expectedSatisfaction),
    predictedSatisfaction,
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
    progressError: roundSigned(progressError),
    predictionError: roundSigned(predictionError),
    attained,
    evidenceRefs: [...evidenceRefs],
  };
}

function basalDrives(percept, profile) {
  const species = THREAD_SPECIES_PROFILE;
  const { environment, internal, exploration, evidenceRefs } = percept;
  const drives = [];

  if (environment.temperatureC !== undefined) {
    const thermalPressure = outsideBand(
      environment.temperatureC,
      species.thermalComfortC[0],
      species.thermalComfortC[1],
      species.thermalShoulderC,
    ) * profile.sensitivity.thermal;
    drives.push(drive({
      family:"thermal_comfort",
      targetRef:"self:thermal-comfort",
      orientation:"maintain",
      pressure:thermalPressure,
      urgency:thermalPressure,
      evidenceRefs,
    }));
  }

  if (internal.energy !== undefined) {
    const energyPressure = internal.energy >= species.energyFloor
      ? 0
      : ((species.energyFloor - internal.energy) / species.energyFloor) * profile.sensitivity.energy;
    drives.push(drive({
      family:"energy",
      targetRef:"self:energy",
      orientation:"maintain",
      pressure:energyPressure,
      urgency:energyPressure,
      evidenceRefs,
    }));
  }

  if (internal.fatigue !== undefined) {
    const restPressure = internal.fatigue <= species.fatigueThreshold
      ? 0
      : ((internal.fatigue - species.fatigueThreshold) / (1 - species.fatigueThreshold)) * profile.sensitivity.rest;
    drives.push(drive({
      family:"rest",
      targetRef:"self:recovery",
      orientation:"maintain",
      pressure:restPressure,
      urgency:restPressure,
      evidenceRefs,
    }));
  }

  const comfort = species.sensoryComfort;
  const sensorySignals = [];
  if (environment.soundLoad !== undefined) sensorySignals.push(excess(environment.soundLoad, comfort.soundLoad));
  if (environment.crowding !== undefined) sensorySignals.push(excess(environment.crowding, comfort.crowding));
  if (environment.lightLevel !== undefined) {
    sensorySignals.push(clamp01(
      environment.lightLevel < comfort.lightMin
        ? (comfort.lightMin - environment.lightLevel) / comfort.lightMin
        : environment.lightLevel > comfort.lightMax
          ? (environment.lightLevel - comfort.lightMax) / (1 - comfort.lightMax)
          : 0,
    ));
  }
  if (environment.openness !== undefined) {
    sensorySignals.push(clamp01(
      environment.openness < comfort.opennessMin
        ? (comfort.opennessMin - environment.openness) / comfort.opennessMin
        : 0,
    ));
  }
  if (sensorySignals.length > 0) {
    const sensoryPressure = Math.max(...sensorySignals) * profile.sensitivity.sensory;
    drives.push(drive({
      family:"sensory_load",
      targetRef:"environment:sensory-load",
      orientation:"avoid",
      pressure:sensoryPressure,
      urgency:sensoryPressure,
      evidenceRefs,
    }));
  }

  if (exploration.novelty !== undefined) {
    const floor = species.explorationNoveltyFloor;
    const explorationPressure = exploration.novelty >= floor
      ? 0
      : 0.5 * ((floor - exploration.novelty) / floor) * profile.sensitivity.exploration;
    drives.push(drive({
      family:"exploration",
      targetRef:"world:novelty",
      orientation:"approach",
      pressure:explorationPressure,
      urgency:explorationPressure,
      evidenceRefs,
    }));
  }

  // Time-supported lack of observed reciprocal contact is a Body signal,
  // never itself a feeling, semantic loneliness, or a consent decision.
  if (percept.contact !== null) {
    const contactPressure = Math.min(1, percept.contact.observedUnmetHours / 24)
      * 0.8 * profile.sensitivity.social;
    drives.push(drive({
      family:"social_contact",
      targetRef:"self:connection",
      orientation:"approach",
      pressure:contactPressure,
      urgency:contactPressure,
      evidenceRefs:[...new Set([...evidenceRefs,...percept.contact.evidenceRefs])],
    }));
  }

  return drives;
}

function sensedEntityPresence(target, percept) {
  const cue = percept.social.find((item) => item.entityRef === target.targetRef);
  if (cue === undefined) {
    return {
      satisfaction: target.relation === "away_from" ? 1 : 0,
      evidenceRefs: [],
    };
  }
  let satisfaction;
  if (target.relation === "away_from") satisfaction = 1 - cue.proximity;
  else if (target.relation === "with") satisfaction = Math.max(cue.proximity, cue.contact);
  else satisfaction = cue.proximity;
  return { satisfaction, evidenceRefs: cue.evidenceRefs };
}

function presenceDrive(target, percept, profile) {
  const sensed = target.targetKind === "entity" ? sensedEntityPresence(target, percept) : null;
  const actualSatisfaction = target.actualSatisfaction ?? sensed?.satisfaction;
  const predictedSatisfaction = target.predictedSatisfaction ?? actualSatisfaction;
  const currentGap = 1 - actualSatisfaction;
  const futureGap = 1 - predictedSatisfaction;
  const progressError = actualSatisfaction - target.expectedSatisfaction;
  const predictionError = predictedSatisfaction - 1;
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
    attained: actualSatisfaction >= 0.95,
    evidenceRefs: [...new Set([...target.evidenceRefs, ...(sensed?.evidenceRefs ?? [])])],
  });
}

function socialResonance(percept, profile) {
  let activation = 0;
  let affiliative = 0;
  let distress = 0;
  const evidenceRefs = new Set();

  for (const cue of percept.social) {
    cue.evidenceRefs.forEach((ref) => evidenceRefs.add(ref));
    const closeness = 0.35 + (0.65 * cue.proximity);
    const familiarWeight = 0.6 + (0.4 * cue.familiarity);
    activation = Math.max(
      activation,
      Math.max(cue.agitation, cue.crying * 0.8, cue.laughter * 0.45) * closeness,
    );
    affiliative = Math.max(
      affiliative,
      Math.max(cue.laughter, cue.calm * 0.6, cue.contact) * closeness * familiarWeight,
    );
    distress = Math.max(
      distress,
      Math.max(cue.crying, cue.agitation) * closeness,
    );
  }

  return {
    activation: round(activation * profile.sensitivity.social),
    affiliative: round(affiliative * profile.sensitivity.social),
    distress: round(distress * profile.sensitivity.social),
    evidenceRefs: [...evidenceRefs],
  };
}

export function evaluateIntrinsicRegulation({
  perceptFrame,targets=[],runtimeBaselines={},urgeProjection=null,
  organismPolicy=null,previousUrges=[],
}) {
  const percept = normalizePerceptFrame(perceptFrame);
  if (!Array.isArray(targets)) throw new TypeError("targets must be an array");
  const normalizedTargets = targets.map(normalizeTarget);
  if (new Set(normalizedTargets.map((target) => target.targetId)).size !== normalizedTargets.length) {
    throw new TypeError("targets must have unique targetId values");
  }

  const policy=organismPolicy===null?null:normalizeOrganismPolicy(organismPolicy);
  const v2=Array.isArray(urgeProjection)&&urgeProjection.length>0;
  const baselines=policy===null?runtimeBaselines:Object.fromEntries(
    Object.entries(runtimeBaselines).map(([key,value])=>[
      key,key.startsWith("regulator")
        ?v2?1:legacySensitivity(value,policy.inheritedSpread)
        :value,
    ]),
  );
  const profile=threadRegulatorProfile(baselines);
  const basal=[
    ...basalDrives(percept, profile),
    ...normalizedTargets.map((target) => presenceDrive(target, percept, profile)),
  ];
  const triggered=policy===null?[]:percept.urgeTriggers.map(event=>drive({
    family:event.family,targetRef:`self:urge:${event.family}:${event.kind}`,
    orientation:"maintain",pressure:event.pressure,urgency:event.pressure,
    evidenceRefs:event.evidenceRefs,
  })).map((item,index)=>({...item,triggerKind:percept.urgeTriggers[index].kind}));
  const rememberedTriggers=policy===null?[]:previousUrges
    .filter(previous=>{
      const family=URGE_FAMILY_BY_NAME.get(previous?.family);
      return family?.kind==="triggered"
        &&family.orientations.includes(previous.triggerKind)
        &&previous.partiallySatisfied===true
        &&Number.isFinite(previous.pressure)
        &&previous.pressure>0
        &&Array.isArray(previous.evidenceRefs)
        &&previous.evidenceRefs.length>0
        &&typeof previous.asOf==="string"
        &&Number.isFinite(Date.parse(previous.asOf))
        &&Date.parse(previous.asOf)<=Date.parse(percept.asOf)
        &&!percept.urgeTriggers.some(event=>event.family===previous.family&&event.kind===previous.triggerKind);
    }).map(previous=>({
      ...drive({family:previous.family,targetRef:previous.targetRef,
        orientation:"maintain",pressure:0,urgency:0,
        evidenceRefs:previous.evidenceRefs}),
      triggerKind:previous.triggerKind,
    }));
  const enabled=policy===null?basal:basal.concat(triggered,rememberedTriggers)
    .filter(item=>policy.enabledFamilies.includes(item.family));
  const drives=policy===null?enabled:feltUrges({
    drives:enabled,policy,urgeProjection,previousUrges,asOf:percept.asOf,
  }).map(item=>{
    const family=URGE_FAMILY_BY_NAME.get(item.family);
    if(family?.kind!=="directional")return item;
    const availability=percept.urgeAvailability[item.family]?.[item.inheritedDirection];
    return {...item,targetAvailability:availability?.state??"unknown"};
  });

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
  const resonance = socialResonance(percept, profile);

  return {
    asOf: percept.asOf,
    species: profile.species,
    ...(policy===null?{}:{organismPolicyVersion:policy.version,organismPolicyDigest:organismPolicyDigest(policy)}),
    drives,
    intrinsicAffect: {
      activation: round(Math.max(maxPressure, resonance.activation)),
      sensoryLoad: round(sensoryLoad),
      approachPull: round(approachPull),
      avoidancePush: round(avoidancePush),
      attainment,
      socialResonance: resonance,
    },
  };
}
