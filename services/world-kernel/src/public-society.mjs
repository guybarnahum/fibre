// What World adds to the public view of its society (K1, November 22, 2026):
// which of the publicly presented Threads are resting; for each living one,
// its public present as of now (what anyone there could see, projected the
// same way a viewer's visit publishes it, so it is never only as fresh as the
// last visit); and who met whom at a real public venue lately. No model call,
// no words said, nothing private: a meeting is who, where and when.
import { openWorldStateDatabase, worldTableExists } from "./world-state-storage.mjs";
import { openLivedNowInspectionStore, LivedNowNotFoundError } from "./lived-now-store.mjs";
import { openSituatedLifeInspectionStore } from "./situated-life-store.mjs";
import { projectLivedPresent } from "./lived-now-publication-service.mjs";
import { publicVenueOf } from "./live-world-geography.mjs";
import { assertId } from "./persistence-common.mjs";

const MAX_THREADS = 500;
const STORY_SCAN = 200;
const MEETINGS = 24;

// A meeting is an Encounter Story in which at least two of the public Threads
// themselves spoke or acted (a happening several merely witnessed is not one).
// It is shown at a venue only when every party was there by World's account.
export function projectPublicSociety({ rows, resting, threadIds, venueOf, presentOf = () => null, now }) {
  const shown = new Set(threadIds);
  const restingShown = resting.filter((id) => shown.has(id));
  const restingSet = new Set(restingShown);
  const meetings = new Map();
  for (const row of rows) {
    if (!meetings.has(row.encounter_id)) {
      const story = JSON.parse(row.story_json ?? "null");
      meetings.set(row.encounter_id, { encounterStoryId: row.encounter_id, occurredAt: row.occurred_at, threadIds: [], place: undefined,
        actors: new Set((story?.beats ?? []).map((beat) => beat.actorThreadId).filter(Boolean)) });
    }
    const meeting = meetings.get(row.encounter_id);
    meeting.threadIds.push(row.thread_id);
    const location = row.situation_json ? JSON.parse(row.situation_json).location : null;
    const venue = location?.kind === "place" ? venueOf(row.thread_id, location.placeRef) : null;
    meeting.place = meeting.place === undefined ? venue
      : meeting.place?.displayName === venue?.displayName ? meeting.place : null;
  }
  return Object.freeze({
    asOf: now,
    resting: Object.freeze(restingShown),
    presents: Object.freeze(threadIds.filter((id) => !restingSet.has(id))
      .map((threadId) => ({ threadId, present: presentOf(threadId) }))
      .filter((item) => item.present !== null).map(Object.freeze)),
    meetings: Object.freeze([...meetings.values()]
      .filter((meeting) => meeting.threadIds.every((id) => shown.has(id))
        && meeting.threadIds.filter((id) => meeting.actors.has(id)).length >= 2)
      .slice(0, MEETINGS)
      .map((meeting) => Object.freeze({ encounterStoryId: meeting.encounterStoryId, occurredAt: meeting.occurredAt,
        threadIds: Object.freeze(meeting.threadIds), place: meeting.place ?? null }))),
  });
}

export function readPublicSociety(storage, { threadIds, hours = 24, now = new Date().toISOString() } = {}) {
  if (!Array.isArray(threadIds) || threadIds.length > MAX_THREADS) throw new TypeError(`public society needs at most ${MAX_THREADS} Threads`);
  for (const threadId of threadIds) assertId("public society Thread", threadId);
  if (!Number.isSafeInteger(hours) || hours < 1 || hours > 72) throw new TypeError("public society window must be 1–72 hours");
  const db = openWorldStateDatabase(storage, { readOnly: true, storeName: "PublicSociety" });
  const livedNowStore = openLivedNowInspectionStore(storage);
  const situatedLifeStore = openSituatedLifeInspectionStore(storage);
  const presentOf = (threadId) => {
    let situation;
    try { situation = livedNowStore.getCurrentSituation(threadId); }
    catch (error) { if (error instanceof LivedNowNotFoundError) return null; throw error; }
    return situation === null ? null : projectLivedPresent({ livedNowStore, situatedLifeStore, situation });
  };
  try {
    const resting = worldTableExists(db, "thread_life_rest")
      ? db.prepare("SELECT thread_id FROM thread_life_rest").all().map((row) => row.thread_id) : [];
    const since = new Date(Date.parse(now) - hours * 3_600_000).toISOString();
    const rows = db.prepare(`
      SELECT e.encounter_id,e.occurred_at,e.story_json,p.thread_id,s.record_json AS situation_json
      FROM (SELECT encounter_id,occurred_at,story_json FROM encounter_story_records WHERE occurred_at>=? AND occurred_at<=?
        ORDER BY occurred_at DESC,encounter_id DESC LIMIT ?) e
      JOIN encounter_story_thread_presence p ON p.encounter_ref=e.encounter_id
      LEFT JOIN current_situation_records s ON s.situation_id=p.situation_id
      ORDER BY e.occurred_at DESC,e.encounter_id,p.thread_id`).all(since, now, STORY_SCAN);
    return projectPublicSociety({ rows, resting, threadIds, now, presentOf,
      venueOf: (threadId, placeRef) => publicVenueOf(db, threadId, placeRef) });
  } finally {
    db.close();
    livedNowStore.close();
    situatedLifeStore.close();
  }
}
