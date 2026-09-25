import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createThreadHealthProjectionService,
  THREAD_HEALTH_PROJECTION_VERSION,
} from "../src/thread-health-projection-service.mjs";
import { ThreadHealthProjectionStore } from "../src/thread-health-projection-store.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

test("Thread health reuses unchanged authority and invalidates only on diagnosis inputs", async () => {
  const threadId = "thr_health_projection_001";
  let worldVersion = 7;
  let presentationDigest = "sha256:presentation-a";
  let reconciliationState = "complete";
  let symbolicGenomeDigest = "sha256:genome-a";
  let raisedLanguages = ["Georgian", "English"];
  let deepDiagnoses = 0;
  let cached = {
    witness:JSON.stringify({
      projectionVersion:"thread-health-v0.1",
      world:{
        thread:{ version:worldVersion, stateHash:`sha256:world-${worldVersion}`, updatedAt:"2026-09-18T00:00:00Z" },
        civilRegistrationDigest:"sha256:civil",
        embodimentHeads:[],
        genesisPublication:null,
        raisedLanguages,
        symbolicGenomes:[{ genomeId:"genome_1", genomeDigest:symbolicGenomeDigest }],
      },
      presentationSnapshotDigest:presentationDigest,
    }),
    diagnosis:{ threadId, exists:true, health:"repairable", findings:[{ code:"STALE_DIAGNOSIS" }] },
  };

  const projectionStore = {
    worldWitness(id) {
      assert.equal(id, threadId);
      return {
        diagnosis:{
          thread:{ version:worldVersion, stateHash:`sha256:world-${worldVersion}`, updatedAt:"2026-09-18T00:00:00Z" },
          civilRegistrationDigest:"sha256:civil",
          embodimentHeads:[],
          genesisPublication:null,
        raisedLanguages,
        symbolicGenomes:[{ genomeId:"genome_1", genomeDigest:symbolicGenomeDigest }],
        },
        reconciliation:{ state:reconciliationState, lastError:null, updatedAt:"2026-09-18T00:00:00Z" },
      };
    },
    get(id, witness) {
      assert.equal(id, threadId);
      return cached?.witness === JSON.stringify(witness) ? cached.diagnosis : null;
    },
    put(id, witness, diagnosis) {
      assert.equal(id, threadId);
      cached = { witness:JSON.stringify(witness), diagnosis };
    },
  };
  const service = createThreadHealthProjectionService({
    projectionStore,
    presentationWitnessReader:{
      async getSnapshotDigest(id) {
        assert.equal(id, threadId);
        return presentationDigest;
      },
    },
    async diagnose(id) {
      assert.equal(id, threadId);
      deepDiagnoses += 1;
      return { threadId, exists:true, health:"healthy", findings:[] };
    },
  });

  assert.equal(THREAD_HEALTH_PROJECTION_VERSION, "thread-health-v0.3");
  const refreshed = await service.inspect(threadId);
  assert.equal(refreshed.cacheHit, false, "older diagnostic semantics were reused");
  assert.equal(refreshed.diagnosis.health, "healthy", "stale cached health survived semantic revision");
  assert.equal(deepDiagnoses, 1);

  assert.equal((await service.inspect(threadId)).cacheHit, true);
  assert.equal(deepDiagnoses, 1, "unchanged health must not re-run deep diagnosis");

  reconciliationState = "pending";
  assert.equal((await service.inspect(threadId)).cacheHit, true);
  assert.equal(deepDiagnoses, 1, "reconciliation-only changes must not invalidate diagnosis");

  presentationDigest = "sha256:presentation-b";
  assert.equal((await service.inspect(threadId)).cacheHit, false);
  assert.equal(deepDiagnoses, 2, "Presentation changes must invalidate cached health");

  symbolicGenomeDigest = "sha256:genome-b";
  assert.equal((await service.inspect(threadId)).cacheHit, false);
  assert.equal(deepDiagnoses, 3, "symbolic genome migration must invalidate cached health");

  raisedLanguages = ["Georgian"];
  assert.equal((await service.inspect(threadId)).cacheHit, false);
  assert.equal(deepDiagnoses, 4, "Raised-language correction must invalidate cached health");

  worldVersion = 8;
  assert.equal((await service.inspect(threadId)).cacheHit, false);
  assert.equal(deepDiagnoses, 5, "World authority changes must invalidate cached health");
});


test("Thread health witness includes symbolic genome and corrected Raised-language authority", () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-thread-health-witness-"));
  const databasePath = join(directory, "world.sqlite");
  const storage = localWorldStateStorage(databasePath);
  const world = openWorldStore(storage);
  const thread = world.seedThread(structuredClone(fixture)).thread;
  world.close();

  const raw = new DatabaseSync(databasePath);
  raw.exec(`
    CREATE TABLE symbolic_genomes (
      genome_id TEXT PRIMARY KEY,
      owner_kind TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      genome_digest TEXT NOT NULL,
      created_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE genesis_raised_language_corrections (
      correction_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      languages_json TEXT NOT NULL CHECK (json_valid(languages_json)),
      recorded_at TEXT NOT NULL
    ) STRICT;
  `);
  raw.prepare(`
    INSERT INTO symbolic_genomes(genome_id,owner_kind,owner_id,genome_digest,created_at)
    VALUES (?,?,?,?,?)
  `).run("genome_health_1", "thread", thread.threadId, "sha256:genome-a", "2026-09-18T00:00:00Z");
  raw.prepare(`
    INSERT INTO genesis_raised_language_corrections(correction_id,thread_id,languages_json,recorded_at)
    VALUES (?,?,?,?)
  `).run("grc_health_1", thread.threadId, JSON.stringify(["Georgian","English"]), "2026-09-18T00:00:00Z");
  raw.close();

  const health = new ThreadHealthProjectionStore(storage);
  try {
    const first = health.worldWitness(thread.threadId).diagnosis;
    assert.deepEqual(first.symbolicGenomes, [{
      genomeId:"genome_health_1",
      genomeDigest:"sha256:genome-a",
    }], "health witness omitted symbolic genome authority");
    assert.deepEqual(first.raisedLanguages, ["Georgian","English"],
      "health witness omitted corrected Raised languages");

    const update = new DatabaseSync(databasePath);
    update.prepare("UPDATE symbolic_genomes SET genome_digest=? WHERE genome_id=?")
      .run("sha256:genome-b", "genome_health_1");
    update.prepare(`
      INSERT INTO genesis_raised_language_corrections(correction_id,thread_id,languages_json,recorded_at)
      VALUES (?,?,?,?)
    `).run("grc_health_2", thread.threadId, JSON.stringify(["Georgian"]), "2026-09-19T00:00:00Z");
    update.close();

    const second = health.worldWitness(thread.threadId).diagnosis;
    assert.equal(second.symbolicGenomes[0].genomeDigest, "sha256:genome-b",
      "genome authority change did not reach health witness");
    assert.deepEqual(second.raisedLanguages, ["Georgian"],
      "Raised-language authority change did not reach health witness");
  } finally {
    health.close();
    rmSync(directory, { recursive:true, force:true });
  }
});
