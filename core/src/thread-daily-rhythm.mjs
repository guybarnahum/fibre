const CIRCADIAN_MINUTES = Object.freeze([-120, 120]);
const SLEEP_NEED_MINUTES = Object.freeze([420, 540]);
const REST_SENSITIVITY = Object.freeze([0.85, 1.15]);
const BASE_WAKE_MINUTE = (7 * 60) + 30;
const RHYTHM_STEP_MINUTES = 15;

function hash32(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function unit(seed, label) {
  return hash32(`${seed}:${label}`) / 0xffffffff;
}

function quantizedBetween(seed, label, minimum, maximum, step) {
  const steps = Math.round((maximum - minimum) / step);
  return minimum + (Math.floor(unit(seed, label) * (steps + 1)) * step);
}

function roundedBetween(seed, label, minimum, maximum, decimals = 2) {
  const scale = 10 ** decimals;
  return Math.round((minimum + ((maximum - minimum) * unit(seed, label))) * scale) / scale;
}

function minuteOfDay(value) {
  return ((Math.round(value) % 1440) + 1440) % 1440;
}

function hhmm(value) {
  const minute = minuteOfDay(value);
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function finiteWithin(name, value, [minimum, maximum]) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TypeError(`${name} must be within ${minimum}..${maximum}`);
  }
  return value;
}

export function genesisDailyRhythmBaselines(threadId) {
  if (typeof threadId !== "string" || threadId.trim() === "") {
    throw new TypeError("Thread ID is required for daily rhythm");
  }
  return Object.freeze({
    circadianPhaseOffsetMinutes:quantizedBetween(
      threadId,
      "circadian-phase",
      CIRCADIAN_MINUTES[0],
      CIRCADIAN_MINUTES[1],
      RHYTHM_STEP_MINUTES,
    ),
    sleepNeedMinutes:quantizedBetween(
      threadId,
      "sleep-need",
      SLEEP_NEED_MINUTES[0],
      SLEEP_NEED_MINUTES[1],
      RHYTHM_STEP_MINUTES,
    ),
    regulatorRestSensitivity:roundedBetween(
      threadId,
      "rest-sensitivity",
      REST_SENSITIVITY[0],
      REST_SENSITIVITY[1],
    ),
  });
}

export function dailyRhythmCue({ threadId, runtimeBaselines = {} } = {}) {
  const fallback = genesisDailyRhythmBaselines(threadId);
  const phase = finiteWithin(
    "circadianPhaseOffsetMinutes",
    runtimeBaselines.circadianPhaseOffsetMinutes ?? fallback.circadianPhaseOffsetMinutes,
    CIRCADIAN_MINUTES,
  );
  const sleepNeed = finiteWithin(
    "sleepNeedMinutes",
    runtimeBaselines.sleepNeedMinutes ?? fallback.sleepNeedMinutes,
    SLEEP_NEED_MINUTES,
  );
  finiteWithin(
    "regulatorRestSensitivity",
    runtimeBaselines.regulatorRestSensitivity ?? fallback.regulatorRestSensitivity,
    REST_SENSITIVITY,
  );

  const wakeCenter = BASE_WAKE_MINUTE + phase;
  const sleepCenter = wakeCenter - sleepNeed;
  return Object.freeze({
    kind:"organismic_daily_rhythm",
    preferredWakeAround:hhmm(wakeCenter),
    preferredSleepAround:hhmm(sleepCenter),
    sleepNeedHours:Math.round((sleepNeed / 60) * 10) / 10,
    flexibility:"soft",
  });
}

export const THREAD_DAILY_RHYTHM_ENVELOPES = Object.freeze({
  circadianPhaseOffsetMinutes:CIRCADIAN_MINUTES,
  sleepNeedMinutes:SLEEP_NEED_MINUTES,
  regulatorRestSensitivity:REST_SENSITIVITY,
});
