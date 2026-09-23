import { normalizeSymbolicRuntimeBaselines } from "./symbolic-genome-domain.mjs";

export const DAILY_RHYTHM_PROJECTION = Object.freeze({
  id:"daily_rhythm_projection",
  version:"1",
});

const BASE_WAKE_MINUTE = (7 * 60) + 30;

function hhmm(value) {
  const minute = ((Math.round(value) % 1440) + 1440) % 1440;
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

export function projectDailyRhythm(runtimeBaselines = {}) {
  const required = [
    "circadianPhaseOffsetMinutes",
    "sleepNeedMinutes",
    "regulatorRestSensitivity",
  ];
  if (!required.every((key) => Object.hasOwn(runtimeBaselines, key))) return null;

  const baselines = normalizeSymbolicRuntimeBaselines(runtimeBaselines);
  const wakeCenter = BASE_WAKE_MINUTE + baselines.circadianPhaseOffsetMinutes;
  return Object.freeze({
    projection:DAILY_RHYTHM_PROJECTION,
    preferredWakeAround:hhmm(wakeCenter),
    preferredSleepAround:hhmm(wakeCenter - baselines.sleepNeedMinutes),
    sleepNeedHours:Math.round((baselines.sleepNeedMinutes / 60) * 10) / 10,
    flexibility:"soft",
  });
}
