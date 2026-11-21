import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installedWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { encodeMeaning } from "../src/meaning-vectors.mjs";

const seed = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));

test("a World read before what-was-new keeps its readings, admits the new ones with the Thread's phrase, and keeps meanings a week", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const directory = mkdtempSync(join(tmpdir(), "fibre-meaning-"));
  const path = join(directory, "world.sqlite");
  try {
    const world = openWorldStore(installedWorldStateStorage(path));
    world.seedThread({ ...seed, threadId:"thr_a" });
    world.close();
    const before = new DatabaseSync(path);
    before.exec(`PRAGMA foreign_keys=OFF; DROP TABLE thread_engagement_readings;
      CREATE TABLE thread_engagement_readings (reading_id TEXT PRIMARY KEY, thread_id TEXT NOT NULL,
        reading TEXT NOT NULL CHECK (reading IN ('absorbed','engaged','going_through_motions','weary')),
        source_kind TEXT NOT NULL CHECK (source_kind IN ('turn','reflection')), source_ref TEXT NOT NULL, at TEXT NOT NULL,
        FOREIGN KEY (thread_id) REFERENCES threads(thread_id)) STRICT;
      INSERT INTO thread_engagement_readings VALUES ('eng_old','thr_a','absorbed','turn','live:1','2026-11-19T10:00:00.000Z');`);
    before.close();
    const store = openLivedExperienceStore(installedWorldStateStorage(path));
    store.recordEngagementReading({ threadId:"thr_a", reading:"nothing_new", sourceKind:"reflection",
      sourceRef:"consolidation_1", at:"2026-11-20T10:00:00.000Z", note:null });
    store.recordEngagementReading({ threadId:"thr_a", reading:"new", sourceKind:"reflection",
      sourceRef:"consolidation_2", at:"2026-11-20T11:00:00.000Z", note:"that tea is grown on the hills above the city" });
    const readings = store.listEngagementReadings("thr_a", { since:"2026-11-18T00:00:00.000Z", until:"2026-11-21T00:00:00.000Z" });
    assert.deepEqual(readings.map((item) => item.reading), ["new", "nothing_new", "absorbed"],
      "an earlier reading was lost, or what was new was refused");
    assert.equal(readings[0].note, "that tea is grown on the hills above the city", "the Thread's own phrase was lost");

    store.recordExchangeMeanings([{ ref:"enc_old", at:"2026-11-10T00:00:00.000Z", model:"m", vector:encodeMeaning([3, 4]) }]);
    store.recordExchangeMeanings([{ ref:"enc_new", at:"2026-11-20T00:00:00.000Z", model:"m", vector:encodeMeaning([3, 4]) }]);
    const meanings = store.exchangeMeanings(["enc_old", "enc_new"]);
    assert.equal(meanings.has("enc_old"), false, "a meaning older than a week was kept");
    const [x, y] = meanings.get("enc_new").vector;
    assert.ok(Math.abs(x - 0.6) < 0.01 && Math.abs(y - 0.8) < 0.01, "a stored meaning did not read back as its direction");
    store.close();
  } finally { rmSync(directory, { recursive:true, force:true }); }
});
