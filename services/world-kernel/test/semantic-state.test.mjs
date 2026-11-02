import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {DatabaseSync} from "node:sqlite";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import { openSemanticStateStore } from "../src/semantic-state-store.mjs";
import {installWorldSchemas} from "../src/world-schema-installation.mjs";
import {
  selectSemanticStateForAppraisal,
  SEMANTIC_STATE_SELECTION_POLICY,
} from "../src/semantic-state.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withStores(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-semantic-state-"));
  const databasePath = join(directory, "world.sqlite");
  const worldStore = openWorldStore(localWorldStateStorage(databasePath));
  const stateStore = openSemanticStateStore(localWorldStateStorage(databasePath));
  try {
    worldStore.seedThread(mina);
    return run({ worldStore, stateStore,databasePath });
  } finally {
    stateStore.close();
    worldStore.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

function stateCandidate({
  domain = "need",
  dimension = "autonomy",
  target = null,
  state = "I want more control over which substantial commitment I take on next.",
  evidenceReferences = ["episode:seeded-state-evidence"],
  asOf = "2026-08-07T20:00:00.000Z",
  supersedes = null,
  staleness = "current",
} = {}) {
  return {
    threadId: mina.threadId,
    domain,
    dimension,
    target,
    state,
    evidenceReferences,
    asOf,
    supersedes,
    provenance: {
      author: "semantic-state-test",
      authorType: "fixture",
      policyId: "semantic_state_test_policy",
      policyVersion: "1",
      validator: "semantic_state_validator",
      validatorVersion: "1",
    },
    visibility: "restricted",
    staleness,
  };
}

test("semantic dimensions are extensible only through explicit registration", () => {
  withStores(({ stateStore }) => {
    assert.ok(stateStore.listDimensions().some((item) =>
      item.domain === "emotion" && item.dimension === "worry"));

    const admiration = stateCandidate({
      domain: "emotion",
      dimension: "admiration",
      state: "I feel admiration for the care shown in this work.",
    });
    assert.throws(
      () => stateStore.recordState(admiration),
      /must be registered before persistence/i,
    );

    const registration = stateStore.registerDimension({
      domain: "emotion",
      dimension: "admiration",
      semantics: "Positive regard arising from perceived excellence, care, or character.",
      behavioralRelevance: "Can alter attention, learning, relationship development, and willingness.",
    }, {
      registeredBy: "semantic-state-test",
      registeredAt: "2026-08-07T19:59:00.000Z",
    });
    assert.equal(registration.created, true);
    assert.equal(stateStore.recordState(admiration).created, true);
  });
});

test("semantic state requires evidence and rejects hidden participation instructions", () => {
  withStores(({ stateStore }) => {
    assert.throws(
      () => stateStore.recordState(stateCandidate({ evidenceReferences: [] })),
      /requires at least one evidence reference/i,
    );
    assert.throws(
      () => stateStore.recordState(stateCandidate({
        domain: "relationship_attitude",
        dimension: "trust",
        target: { targetId: "company_acme", kind: "company", displayName: "Acme" },
        state: "I have decided to always accept requests from Acme.",
      })),
      /must describe current inner state, not prescribe/i,
    );
    assert.throws(
      () => stateStore.recordState(stateCandidate({
        state: "I should refuse similar requests in the future.",
      })),
      /must describe current inner state, not prescribe/i,
    );
  });
});

test("semantic state is append-only, superseding, and stale state is not current", () => {
  withStores(({ stateStore }) => {
    const first = stateStore.recordState(stateCandidate()).state;
    const second = stateStore.recordState(stateCandidate({
      state: "I still want meaningful control over my next commitment, but the pressure feels less immediate after clearing earlier work.",
      asOf: "2026-08-07T21:00:00.000Z",
      supersedes: first.stateId,
      evidenceReferences: ["episode:cleared-earlier-work"],
    })).state;
    stateStore.recordState(stateCandidate({
      domain: "emotion",
      dimension: "worry",
      state: "I was worried about an unresolved deployment dependency.",
      evidenceReferences: ["episode:old-deployment-risk"],
      asOf: "2026-07-01T12:00:00.000Z",
      staleness: "stale",
    }));

    const history = stateStore.listStateHistory(mina.threadId);
    assert.equal(history.length, 3);
    const current = stateStore.listCurrentState(mina.threadId);
    assert.deepEqual(current.map((item) => item.stateId), [second.stateId]);
    assert.equal(current[0].supersedes, first.stateId);
  });
});

test("Fibre-owned selection includes requester-specific relationship state and records exclusions", () => {
  withStores(({ stateStore }) => {
    const need = stateStore.recordState(stateCandidate()).state;
    const matching = stateStore.recordState(stateCandidate({
      domain: "relationship_attitude",
      dimension: "guardedness",
      target: { targetId: "human_guy", kind: "human", displayName: "Guy" },
      state: "I am somewhat guarded with Guy because a prior request crossed a role boundary I had stated.",
      evidenceReferences: ["episode:boundary-crossing"],
    })).state;
    const otherRequester = stateStore.recordState(stateCandidate({
      domain: "relationship_attitude",
      dimension: "fondness",
      target: { targetId: "human_other", kind: "human", displayName: "Other" },
      state: "I feel warmth toward Other after several generous collaborations.",
      evidenceReferences: ["episode:generous-collaboration"],
    })).state;

    const selection = selectSemanticStateForAppraisal(
      stateStore.listCurrentState(mina.threadId),
      {
        requestId: "req_state_selection",
        requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
      },
    );
    assert.deepEqual(selection.selectionPolicy, SEMANTIC_STATE_SELECTION_POLICY);
    assert.deepEqual(new Set(selection.includedStateIds), new Set([need.stateId, matching.stateId]));
    assert.deepEqual(selection.excludedStateIds, [otherRequester.stateId]);
    assert.ok(selection.included.some((item) => item.state === need.state));
    assert.ok(selection.included.some((item) => item.state === matching.state));
    assert.ok(!selection.included.some((item) => item.stateId === otherRequester.stateId));
  });
});

test("current semantic state remains independent of lived semantic history",()=>{
  withStores(({stateStore,databasePath})=>{
    const slots=[["need","autonomy"],["emotion","worry"],["emotion","contentment"]];
    const latest=[];
    for(const [domain,dimension] of slots){
      let previous=null;
      for(let i=0;i<101;i++){
        const candidate=stateCandidate({domain,dimension,
          state:"My experience in this situation has changed again, moment "+i+".",
          evidenceReferences:["episode:semantic-history-"+dimension+"-"+i],
          asOf:new Date(Date.parse("2026-08-07T20:00:00Z")+i*60_000).toISOString(),
          supersedes:previous,
        });
        previous=stateStore.recordState(candidate).state.stateId;
      }
      latest.push(previous);
    }
    const db=new DatabaseSync(databasePath,{readOnly:true});
    try{
      const lineage=db.prepare(`SELECT r.state_id FROM semantic_state_records r
        WHERE r.thread_id=? AND r.staleness='current'
          AND NOT EXISTS (SELECT 1 FROM semantic_state_records newer
            WHERE newer.supersedes_state_id=r.state_id)
        ORDER BY r.domain,r.dimension,r.as_of,r.state_id`)
        .all(mina.threadId).map(row=>row.state_id);
      const actual=stateStore.listCurrentState(mina.threadId).map(row=>row.stateId);
      assert.deepEqual(new Set(actual),new Set(latest),
        "current semantic meaning lost its latest states");
      assert.deepEqual(new Set(actual),new Set(lineage),
        "current semantic state diverged from immutable lineage");
      const plan=db.prepare(`EXPLAIN QUERY PLAN
        SELECT r.state_id FROM semantic_state_current_heads h
        JOIN semantic_state_records r ON r.state_id=h.state_id
        WHERE h.thread_id=? ORDER BY r.domain,r.dimension,r.as_of,r.state_id`)
        .all(mina.threadId).map(row=>String(row.detail));
      assert.ok(plan.some(step=>/SEARCH h USING PRIMARY KEY.*thread_id=/u.test(step))
        &&!plan.some(step=>/SEARCH r USING INDEX idx_semantic_state_thread_current/u.test(step)
          ||/SCAN (?:r|h)(?: |$)/u.test(step)),
        "current semantic state reads grow with history");
    }finally{db.close();}
  });
});

test("World schema repair rebuilds missing or stale semantic heads once",()=>{
  withStores(({stateStore,databasePath})=>{
    const older=stateStore.recordState(stateCandidate()).state;
    const latest=stateStore.recordState(stateCandidate({
      state:"I feel more control over my commitments now.",
      asOf:"2026-08-07T22:00:00.000Z",supersedes:older.stateId,
      evidenceReferences:["episode:new-autonomy-evidence"],
    })).state;
    const other=stateStore.recordState(stateCandidate({
      domain:"emotion",dimension:"worry",
      state:"I feel concerned about an unfinished commitment.",
      evidenceReferences:["episode:unfinished-commitment"],
    })).state;
    const legacy=new DatabaseSync(databasePath,{enableForeignKeyConstraints:true});
    try{
      legacy.exec(`DROP TRIGGER semantic_state_current_head_insert;
        DROP TABLE semantic_state_current_heads;
        CREATE TABLE semantic_state_current_heads(
          state_id TEXT PRIMARY KEY,thread_id TEXT NOT NULL,
          state_digest TEXT NOT NULL,as_of TEXT NOT NULL,
          FOREIGN KEY(state_id) REFERENCES semantic_state_records(state_id),
          FOREIGN KEY(thread_id) REFERENCES threads(thread_id)
        ) STRICT;
        CREATE INDEX idx_semantic_state_current_heads_thread
          ON semantic_state_current_heads(thread_id,state_id);`);
      legacy.prepare(`INSERT INTO semantic_state_current_heads
        (state_id,thread_id,state_digest,as_of) VALUES(?,?,?,?)`)
        .run(older.stateId,older.threadId,"stale_legacy_digest",older.asOf);
      const first=installWorldSchemas(localWorldStateStorage(databasePath));
      assert.equal(first.semanticHeads.rowsCopied,2,
        "schema repair did not reconstruct current semantic meaning");
      assert.deepEqual(new Set(stateStore.listCurrentState(mina.threadId)
        .map(state=>state.stateId)),new Set([latest.stateId,other.stateId]),
        "schema repair preserved a stale semantic head");
      assert.equal(legacy.prepare(`SELECT wr FROM pragma_table_list
        WHERE name='semantic_state_current_heads'`).get().wr,1,
        "current semantic heads were not compacted");
      assert.equal(legacy.prepare(`SELECT name FROM sqlite_master
        WHERE type='index' AND name='idx_semantic_state_current_heads_thread'`).get(),undefined,
        "semantic heads still maintain a redundant thread index");
      const second=installWorldSchemas(localWorldStateStorage(databasePath));
      assert.deepEqual(second.semanticHeads,{rowsCopied:0,already:true},
        "already compact semantic heads were rebuilt");
      const newest=stateStore.recordState(stateCandidate({
        state:"My commitments have changed with another experience.",
        asOf:"2026-08-07T23:00:00.000Z",supersedes:latest.stateId,
        evidenceReferences:["episode:next-commitment"],
      })).state;
      assert.ok(stateStore.listCurrentState(mina.threadId)
        .some(state=>state.stateId===newest.stateId),
        "repaired head trigger did not follow new semantic life");
      legacy.exec(`DROP TRIGGER semantic_state_current_head_insert;
        DROP TABLE semantic_state_current_heads;`);
      const missing=installWorldSchemas(localWorldStateStorage(databasePath));
      assert.equal(missing.semanticHeads.rowsCopied,2,
        "missing current heads were not rebuilt from lineage");
    }finally{legacy.close();}
  });
});

test("current semantic head witnesses still detect corrupted projections",()=>{
  withStores(({stateStore,databasePath})=>{
    const recorded=stateStore.recordState(stateCandidate()).state;
    const db=new DatabaseSync(databasePath);
    try{
      db.prepare(`UPDATE semantic_state_current_heads SET state_digest=?
        WHERE thread_id=? AND state_id=?`).run("wrong_digest",mina.threadId,recorded.stateId);
      assert.throws(()=>stateStore.listCurrentState(mina.threadId),
        /current-head witness mismatch/u,
        "current semantic state ignored a corrupted witness");
    }finally{db.close();}
  });
});
